// Vercel serverless function for answering AI questions about goals
import Anthropic from '@anthropic-ai/sdk';
import { getUserContext, saveUserContext, getSystemPrompt } from './redis.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', 'https://alpha-x-goals.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Check authentication
  const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
  if (!sessionCookie) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  let userId;
  try {
    const sessionValue = sessionCookie.split('=')[1];
    const decodedValue = decodeURIComponent(sessionValue);
    const sessionData = JSON.parse(decodedValue);
    userId = sessionData.userId;
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Invalid session' });
  }

  const { goal, alphaXProject, questions, answers, userEstimatedHours } = req.body;
  
  if (!goal || !alphaXProject || !questions || !answers) {
    return res.status(400).json({ 
      success: false, 
      error: 'Goal, Alpha X project, questions, and answers are required' 
    });
  }

  try {
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    
    if (!CLAUDE_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'Claude API key not configured' 
      });
    }

    // Save learned context from user's answers to Redis
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const answer = answers[i];
      
      if (answer && answer.trim()) {
        // Extract the term being asked about (simple extraction)
        const termMatch = question.match(/What is ([^?]+)\?/i);
        if (termMatch) {
          const term = termMatch[1].trim();
          await saveUserContext(userId, term, answer.trim());
        }
      }
    }
    
    // Get updated user context for the validation
    const userContext = await getUserContext(userId);
    const contextInfo = userContext.map(ctx => `- ${ctx.term}: ${ctx.explanation}`).join('\n');
    
    // Use the same STRICT scoring prompt as validate-goal for consistency
    const userTimeEstimate = userEstimatedHours || 3;
    const prompt = `You are a STRICT goal validation assistant for Alpha X students. Based on the clarifying answers provided, analyze the goal with rigorous standards and respond with JSON only.

Goal: "${goal}"
Alpha X Project: "${alphaXProject}"
Student's Time Estimate: ${userTimeEstimate} hours

Context: A brain lift is a repository for all of the students' expertise in research about their topic. Ephor is a tool that is used to score brain lifts.

IMPORTANT BRAINLIFT RULES (SCALED BY TIME):
The BrainLift word count requirements SCALE based on the student's time estimate of ${userTimeEstimate} hours:

**Time-Scaled BrainLift Requirements for BrainLift-ONLY goals:**
- 0.5 hours (30 min): 150-200 words is sufficient for that time
- 1 hour: 300-400 words is sufficient
- 1.5 hours: 500-600 words is sufficient
- 2 hours: 700-800 words is sufficient
- 2.5 hours: 900-1000 words is sufficient
- 3+ hours: 1000+ words is the standard requirement

**For this goal with ${userTimeEstimate} hours:**
- If BrainLift ONLY: Expect approximately ${Math.round(userTimeEstimate * 300)} words minimum for sufficient ambition
- If BrainLift + other tasks: Any word count is acceptable as long as the TOTAL work matches the time estimate

**Key Rules:**
- BrainLift + additional tasks = any word count acceptable (judge based on total work scope)
- Shorter time estimates = proportionally less work expected
- Don't penalize students for realistic scoping to their available time

USER'S LEARNED CONTEXT:
${contextInfo || '(No previous context learned yet)'}

QUESTIONS AND ANSWERS:
${questions.map((q, i) => `Q: ${q}\nA: ${answers[i] || 'No answer provided'}`).join('\n\n')}

CRITICAL EVALUATION REQUIREMENTS:

TIME ESTIMATION - BE REALISTIC:
- Student claims ${userTimeEstimate} hours - verify if the work scope actually matches
- Don't trust student time estimates blindly - calculate realistic time yourself based on their answers
- Examples of time per task:
  * 3 emails = 30 minutes max
  * 5-10 emails = 1-2 hours
  * 15+ personalized emails = 3+ hours
  * Writing 300 words = 1-1.5 hours of research + writing
  * Writing 500 words = 2-3 hours of research + writing
  * Writing 1000 words = 3.5 hours of research + writing + editing

AMBITION STANDARDS (4/5 required) - SCALED BY TIME:
**For goals with ${userTimeEstimate} hours time estimate:**
- Score based on whether the ACTUAL work scope matches the TIME ESTIMATE
- If goal scope matches their time estimate: Give appropriate ambition score (4/5 or 5/5)
- If goal is too small for time estimate: Lower ambition score
- **CRITICAL: If goal is LARGER/MORE AMBITIOUS than time estimate: ALWAYS APPROVE IT!**
  * NEVER penalize overambition - being TOO ambitious is ALWAYS GOOD
  * Example: 1 hour claimed, 3 hours of work = APPROVE with 5/5!
  * Example: 30 min claimed, 1000 words = APPROVE with 5/5!
- Shorter goals (0.5-2 hours) CAN be valid - just ensure work matches time allocated
- Goals requiring 3+ hours of work = 4/5 minimum (if they claim 3+ hours)
- Don't penalize realistic scoping!
- **Being TOO ambitious = automatic 5/5 ambition score**

MEASURABILITY (8/10 required):
- If the goal has ANY specific, quantifiable outcomes, give it 8/10 or higher
- Clear success criteria that can be objectively verified = automatic 8/10+
- Examples of measurable: "write 500 words", "send 5 emails", "read 3 papers", "post 4 times"
- Only fail if completely vague like "get better" or "improve skills" with no specifics
- Be generous with measurability scoring - most goals with numbers should pass

RELEVANCE (8/10 required):
- If the goal is AT ALL related to their Alpha X project, give it 8/10 or higher
- Even loosely related goals should get 8/10+ (be very generous)
- Examples that should get 8/10+: writing, research, communication, technical skills, project planning
- Only fail (below 8/10) if completely irrelevant like "learn cooking" for a tech project
- When in doubt, score high - most educational/professional goals relate to Alpha X projects
- Be generous - if you can see ANY connection to their project, give 8/10+

Respond with a JSON object containing:
{
  "isValid": boolean,
  "hasQuestions": false,
  "questions": [],
  "ambitionScore": number (1-5),
  "measurableScore": number (1-10),
  "relevanceScore": number (1-10),
  "overallScore": number (1-10),
  "feedback": "honest, critical assessment incorporating their answers and explaining why scores were given",
  "estimatedHours": number (YOUR realistic estimate based on their answers, not their claim),
  "timeReasoning": "explain your time calculation based on their responses",
  "suggestions": ["specific ways to make goal more ambitious if needed"]
}

Score on these categories:
- Ambition: How challenging and growth-oriented is this goal? (4/5 required - BE STRICT HERE)
- Measurable: How clearly defined and measurable are the success criteria? (8/10 required - BE GENEROUS)
- Relevance: How relevant is this goal to their Alpha X project? (8/10 required - BE GENEROUS)

SCORING STRATEGY:
- AMBITION: If 3.5+ hours estimated, give 4/5+. If 4+ hours, give 5/5. Be generous for substantial goals.
- MEASURABLE: If it has numbers/specifics, automatically give 8/10+
- RELEVANCE: If it relates to education/skills/project in any way, automatically give 8/10+

Goals must achieve 4/5 for ambition AND 8/10 for measurable AND 8/10 for relevance to be valid. The overall score is just for reference - ONLY the three individual scores matter for pass/fail.`;

    const anthropic = new Anthropic({
      apiKey: CLAUDE_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const responseText = response.content[0].text;
    let validation;
    
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        validation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing validation response:', parseError);
      validation = {
        isValid: false,
        hasQuestions: false,
        questions: [],
        ambitionScore: 5,
        measurableScore: 5,
        relevanceScore: 5,
        overallScore: 5,
        feedback: "Unable to validate goal at this time. Please ensure your goal is specific, measurable, and requires at least 3 hours of work.",
        estimatedHours: 0,
        suggestions: ["Please rephrase your goal with more specific details and measurable outcomes."]
      };
    }

    // Ensure isValid is correctly set based on scoring requirements
    if (validation.ambitionScore && validation.measurableScore && validation.relevanceScore) {
      // ONLY the three category scores matter - overall score is just for reference
      const meetsRequirements = validation.ambitionScore >= 4 && 
                               validation.measurableScore >= 8 && 
                               validation.relevanceScore >= 8;
      validation.isValid = meetsRequirements && !validation.hasQuestions;
      
      if (!meetsRequirements && validation.isValid !== false) {
        validation.feedback = `Goal needs improvement to meet requirements. Scores: Ambition ${validation.ambitionScore}/5, Measurable ${validation.measurableScore}/10, Relevance ${validation.relevanceScore}/10. Requirements: Ambition 4/5+, Measurable 8/10+, Relevance 8/10+.`;
      }
    }

    res.json({ success: true, validation });
  } catch (error) {
    console.error('Error validating goal with answers:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to validate goal. Please try again.' 
    });
  }
}
