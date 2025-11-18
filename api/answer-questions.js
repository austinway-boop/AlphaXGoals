// Vercel serverless function for answering AI questions about goals
import axios from 'axios';
import { getUserContext, saveUserContext, getSystemPrompt } from './redis.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
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
    const sessionData = JSON.parse(sessionCookie.split('=')[1]);
    userId = sessionData.userId;
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Invalid session' });
  }

  const { goal, alphaXProject, questions, answers } = req.body;
  
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
    const prompt = `You are a STRICT goal validation assistant for Alpha X students. Based on the clarifying answers provided, analyze the goal with rigorous standards and respond with JSON only.

Goal: "${goal}"
Alpha X Project: "${alphaXProject}"

Context: A brain lift is a repository for all of the students' expertise in research about their topic. Ephor is a tool that is used to score brain lifts. For brainlift goals, adding 500 words minimum is required as it should take at least 3 solid hours of work.

USER'S LEARNED CONTEXT:
${contextInfo || '(No previous context learned yet)'}

QUESTIONS AND ANSWERS:
${questions.map((q, i) => `Q: ${q}\nA: ${answers[i] || 'No answer provided'}`).join('\n\n')}

CRITICAL EVALUATION REQUIREMENTS:

TIME ESTIMATION - BE SKEPTICAL:
- Don't trust student time estimates - calculate realistic time yourself based on their answers
- 3 emails = 30 minutes max (NOT ambitious enough)
- 5-10 emails = 1-2 hours (borderline)
- 15+ personalized emails = 3+ hours (acceptable)
- Writing 500 words = 2-3 hours of research + writing
- Simple tasks are NOT ambitious regardless of claimed time

AMBITION STANDARDS (4/5 required):
- Should challenge the student and promote growth
- Involves meaningful learning or skill development
- Requires focused work, not just busy work
- Use their answers to assess true difficulty level

MEASURABILITY (8/10 required):
- If the goal has ANY specific, quantifiable outcomes, give it 8/10 or higher
- Clear success criteria that can be objectively verified = automatic 8/10+
- Examples of measurable: "write 500 words", "send 5 emails", "read 3 papers", "post 4 times"
- Only fail if completely vague like "get better" or "improve skills" with no specifics
- Be generous with measurability scoring - most goals with numbers should pass

RELEVANCE (8/10 required):
- Must directly advance their Alpha X project based on their answers
- Should build specific skills or knowledge needed for their project

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
- Ambition: How challenging and growth-oriented is this goal? (4/5 required to pass)
- Measurable: How clearly defined and measurable are the success criteria? (8/10 required to pass)
- Relevance: How relevant is this goal to their Alpha X project? (8/10 required to pass)

Goals must achieve 4/5 for ambition AND 8/10 for measurable AND 8/10 for relevance to be valid. Overall score should be 8/10 minimum.`;

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-5',
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }, {
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });

    const responseText = response.data.content[0].text;
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
      const meetsRequirements = validation.ambitionScore >= 4 && 
                               validation.measurableScore >= 8 && 
                               validation.relevanceScore >= 8 &&
                               validation.overallScore >= 8;
      validation.isValid = meetsRequirements && !validation.hasQuestions;
      
      if (!meetsRequirements && validation.isValid !== false) {
        validation.feedback = `Goal needs improvement to meet requirements. Scores: Ambition ${validation.ambitionScore}/5, Measurable ${validation.measurableScore}/10, Relevance ${validation.relevanceScore}/10, Overall ${validation.overallScore}/10. Requirements: Ambition 4/5+, Measurable 8/10+, Relevance 8/10+, Overall 8/10+.`;
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
