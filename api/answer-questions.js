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
    
    // Use the same scoring prompt as validate-goal for consistency
    const prompt = `You are a goal validation assistant for Alpha X students. Based on the clarifying answers provided, analyze the goal and respond with JSON only.

Goal: "${goal}"
Alpha X Project: "${alphaXProject}"

Context: A brain lift is a repository for all of the students' expertise in research about their topic. Ephor is a tool that is used to score brain lifts. For brainlift goals, adding 500 words minimum is required as it should take at least 3 solid hours of work.

USER'S LEARNED CONTEXT:
${contextInfo || '(No previous context learned yet)'}

QUESTIONS AND ANSWERS:
${questions.map((q, i) => `Q: ${q}\nA: ${answers[i] || 'No answer provided'}`).join('\n\n')}

Now that you have clarifying information, provide a final validation with the same scoring system:

Respond with a JSON object containing:
{
  "isValid": boolean,
  "hasQuestions": false,
  "questions": [],
  "ambitionScore": number (1-10),
  "measurableScore": number (1-10),
  "relevanceScore": number (1-10),
  "overallScore": number (1-10),
  "feedback": "positive and encouraging explanation incorporating the user's answers",
  "estimatedHours": number,
  "suggestions": ["helpful suggestions if needed"]
}

Score on these categories:
- Ambition: How challenging and growth-oriented is this goal? (9/10 required to pass)
- Measurable: How clearly defined and measurable are the success criteria? (9/10 required to pass)
- Relevance: How relevant is this goal to their Alpha X project? (9/10 required to pass)

Goals must achieve 9/10 in ALL categories to be valid. Goals should require at least 3 solid hours of work. Be encouraging but maintain high standards.`;

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
      const meetsRequirements = validation.ambitionScore >= 9 && 
                               validation.measurableScore >= 9 && 
                               validation.relevanceScore >= 9;
      validation.isValid = meetsRequirements && !validation.hasQuestions;
      
      if (!meetsRequirements && validation.isValid !== false) {
        validation.feedback = `Goal needs improvement to meet requirements. Scores: Ambition ${validation.ambitionScore}/10, Measurable ${validation.measurableScore}/10, Relevance ${validation.relevanceScore}/10. All categories must score 9/10 or higher.`;
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
