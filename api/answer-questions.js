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
    
    // Updated prompt - REMOVED RELEVANCE SCORING
    const userTimeEstimate = userEstimatedHours || 3;
    const prompt = `You are a goal validation assistant for Alpha X students. Based on the clarifying answers provided, analyze the goal and respond with JSON only.

Goal: "${goal}"
Alpha X Project (their masterpiece): "${alphaXProject}"
Student's Time Estimate: ${userTimeEstimate} hours

Context: A brain lift is a repository for students' expertise/research. Ephor scores brain lifts from F-A. Moving up one grade takes ~1.5 hours.

BRAINLIFT WORD COUNT SCALING (for BrainLift-only goals):
- 0.5h: 150-200 words | 1h: 300-400 words | 1.5h: 500-600 words
- 2h: 700-800 words | 2.5h: 900-1000 words | 3+h: 1000+ words
- BrainLift + other tasks: word count flexible, judge total scope

USER'S LEARNED CONTEXT:
${contextInfo || '(No previous context)'}

QUESTIONS AND ANSWERS:
${questions.map((q, i) => `Q: ${q}\nA: ${answers[i] || 'No answer provided'}`).join('\n\n')}

TIME ESTIMATION:
Calculate realistic time based on actual work and their answers:
- 3 emails = 30 min | 15+ personalized emails = 3+ hours
- 500 words = 2-3 hours | 1000 words = 3.5 hours

AMBITION (4/5 required):
- Score if work scope matches or exceeds time estimate
- Work matches estimate = 4/5 | Work exceeds estimate = 5/5
- Work too small for estimate = 2/5 or 3/5
- NEVER penalize overambition

MEASURABILITY (8/10 required):
- ANY specific, quantifiable outcomes = 8/10+
- Vague like "get better" with no specifics = fail

MASTERPIECE RELEVANCE:
Based on their answer about how the goal relates to their masterpiece:
- If they provided ANY reasonable explanation of connection = consider it related
- Be generous - they went through the effort of explaining
- Only reject if explanation makes no sense at all

Respond with JSON:
{
  "isValid": boolean (true if ambitionScore >= 4 AND measurableScore >= 8),
  "hasQuestions": false,
  "questions": [],
  "ambitionScore": number (1-5),
  "measurableScore": number (1-10),
  "overallScore": number (1-10, for reference only),
  "feedback": "assessment incorporating their answers",
  "estimatedHours": number (your realistic estimate),
  "timeReasoning": "brief time calculation",
  "suggestions": ["improvements if needed"],
  "exampleGoal": "An example of a similar goal that would pass - tailored to their project: ${alphaXProject}"
}

CRITICAL: Goals pass if ambitionScore >= 4 AND measurableScore >= 8.`;

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
        overallScore: 5,
        feedback: "Unable to validate goal at this time. Please ensure your goal is specific and measurable.",
        estimatedHours: 0,
        suggestions: ["Please rephrase your goal with more specific details and measurable outcomes."],
        exampleGoal: `Write 1000 words of research for my ${alphaXProject} project`
      };
    }

    // Ensure isValid is correctly set based on scoring requirements
    // Only ambition and measurable matter now - no relevance score
    if (validation.ambitionScore && validation.measurableScore) {
      const meetsRequirements = validation.ambitionScore >= 4 && 
                               validation.measurableScore >= 8;
      validation.isValid = meetsRequirements && !validation.hasQuestions;
      
      if (!meetsRequirements && validation.isValid !== false) {
        validation.feedback = `Goal needs improvement. Scores: Ambition ${validation.ambitionScore}/5, Measurable ${validation.measurableScore}/10. Requirements: Ambition 4/5+, Measurable 8/10+.`;
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
