// Vercel serverless function for admin goal creation with AI validation and auto-answering
import { getRedisClient, createGoal } from './redis.js';
import axios from 'axios';

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

  const { userId, goal, alphaXProject, adminName } = req.body;
  
  // Check admin authentication
  const adminCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('admin_session='));
  if (!adminCookie) {
    return res.status(401).json({ success: false, error: 'Admin authentication required' });
  }

  let adminSession;
  try {
    adminSession = JSON.parse(adminCookie.split('=')[1]);
    if (!adminSession.isAdmin) {
      return res.status(401).json({ success: false, error: 'Admin privileges required' });
    }
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Invalid admin session' });
  }

  if (!userId || !goal || !alphaXProject || !adminName) {
    return res.status(400).json({ 
      success: false, 
      error: 'User ID, goal, Alpha X project, and admin name are required' 
    });
  }

  try {
    const client = await getRedisClient();
    
    console.log(`Admin ${adminName} creating goal for userId: ${userId}, goal: ${goal}, project: ${alphaXProject}`);
    
    // Check if user exists
    const user = await client.hGetAll(userId);
    if (!user || Object.keys(user).length === 0) {
      console.error('User not found:', userId);
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    console.log('Creating goal for user:', user.email);

    // Get API key for AI validation
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    
    if (!CLAUDE_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'AI validation service not available' 
      });
    }

    // AI validation prompt (same as validate-goal.js)
    const validationPrompt = `You are a STRICT goal validation assistant for Alpha X students. Be highly critical and maintain rigorous standards. Analyze the following goal and respond with JSON only.

Goal: "${goal}"
Alpha X Project: "${alphaXProject}"

Context: A brain lift is a repository for all of the students' expertise in research about their topic. Ephor is a tool that is used to score brain lifts. 

IMPORTANT BRAINLIFT RULES:
- BrainLift goals MUST include additional tasks beyond just adding words
- Even with 500+ words, students must do OTHER activities too (research, analysis, posting, sharing, etc.)
- Examples of GOOD BrainLift goals: "Add 500 words to BrainLift AND post 4 times on X about findings"
- Examples of BAD BrainLift goals: "Add 500 words to BrainLift" (missing additional tasks)
- BrainLift + other activities = good goal. BrainLift alone = insufficient.

CRITICAL EVALUATION REQUIREMENTS:

TIME ESTIMATION - BE REALISTIC:
- Don't trust student time estimates - calculate realistic time yourself
- 3 emails = 30 minutes max (NOT ambitious enough)
- 5-10 emails = 1-2 hours (borderline) 
- 15+ personalized emails = 3+ hours (acceptable)
- Writing 500 words = 2-3 hours of research + writing
- Writing 1000 words = 3.5 hours of research + writing + editing (GOOD GOAL)
- Simple tasks are NOT ambitious regardless of claimed time

AMBITION STANDARDS (4/5 required):
- If you estimate the goal will take 3.5+ hours, automatically give it 4/5 or 5/5
- Goals requiring 3+ hours of focused work should get 4/5 minimum
- Goals requiring 4+ hours of work should get 5/5

SPECIAL BRAINLIFT SCORING:
- BrainLift goals with ONLY word addition = 2/5 or 3/5 (insufficient ambition)
- BrainLift + additional tasks = 4/5 or 5/5 (good ambition)
- Examples: "Add 300 words to BrainLift AND post 4 times on X" = 4/5+
- Examples: "Add 500 words to BrainLift" (alone) = 3/5 (needs more tasks)

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
  "hasQuestions": boolean,
  "questions": ["array of clarifying questions if needed"],
  "ambitionScore": number (1-5),
  "measurableScore": number (1-10),
  "relevanceScore": number (1-10),
  "timeEstimateHours": number,
  "feedback": "string explaining the evaluation",
  "suggestions": ["array of improvement suggestions if not valid"]
}`;

    console.log('Validating goal with AI...');

    // AI validation request
    const validationResponse = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      temperature: 0,
      messages: [{
        role: 'user',
        content: validationPrompt
      }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    });

    let validationResult;
    try {
      const rawValidation = validationResponse.data.content[0].text.trim();
      console.log('Raw validation response:', rawValidation);
      validationResult = JSON.parse(rawValidation);
    } catch (parseError) {
      console.error('Error parsing AI validation response:', parseError);
      return res.status(500).json({ 
        success: false, 
        error: 'AI validation service error' 
      });
    }

    console.log('AI validation result:', validationResult);

    // Check if goal passes validation
    const passes = validationResult.isValid && 
                  validationResult.ambitionScore >= 4 && 
                  validationResult.measurableScore >= 8 && 
                  validationResult.relevanceScore >= 8;

    if (!passes) {
      console.log('Goal failed AI validation:', validationResult);
      return res.json({
        success: false,
        validation: {
          isValid: false,
          ...validationResult
        }
      });
    }

    console.log('Goal passed AI validation, generating questions...');

    // Generate AI questions for the goal
    const questionsPrompt = `You are an AI assistant helping Alpha X students with their goals. Based on the following goal and project, generate exactly 3 specific, helpful questions that would help the student think through and plan their goal better.

Goal: "${goal}"
Alpha X Project: "${alphaXProject}"

Generate questions that are:
1. Specific to their project and goal
2. Help them think about implementation details
3. Encourage deeper consideration of their approach
4. Are answerable with short, practical responses

Respond with a JSON array of exactly 3 questions:
["Question 1", "Question 2", "Question 3"]`;

    const questionsResponse = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 500,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: questionsPrompt
      }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    });

    let aiQuestions = [];
    try {
      const rawQuestions = questionsResponse.data.content[0].text.trim();
      console.log('Raw questions response:', rawQuestions);
      aiQuestions = JSON.parse(rawQuestions);
    } catch (parseError) {
      console.error('Error parsing AI questions response:', parseError);
      // Continue without questions if there's an error
      aiQuestions = [
        "What specific steps will you take to accomplish this goal?",
        "How will you measure your progress along the way?",
        "What challenges do you anticipate and how will you overcome them?"
      ];
    }

    console.log('Generated AI questions:', aiQuestions);

    // Generate automatic answers for the questions
    const answersPrompt = `You are answering questions on behalf of a student working on their Alpha X project. Provide thoughtful, realistic answers that a motivated student would give.

Goal: "${goal}"
Alpha X Project: "${alphaXProject}"
Questions: ${JSON.stringify(aiQuestions)}

Provide brief but thoughtful answers (1-2 sentences each) that show planning and consideration. The answers should be realistic and specific to their goal and project.

Respond with a JSON array of exactly ${aiQuestions.length} answers corresponding to the questions:
["Answer 1", "Answer 2", "Answer 3"]`;

    const answersResponse = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 600,
      temperature: 0.4,
      messages: [{
        role: 'user',
        content: answersPrompt
      }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    });

    let aiAnswers = [];
    try {
      const rawAnswers = answersResponse.data.content[0].text.trim();
      console.log('Raw answers response:', rawAnswers);
      aiAnswers = JSON.parse(rawAnswers);
    } catch (parseError) {
      console.error('Error parsing AI answers response:', parseError);
      // Provide default answers if there's an error
      aiAnswers = [
        "I will break this down into specific daily tasks and track my progress systematically.",
        "I will use measurable milestones and document my work as I complete each step.",
        "I will research potential obstacles beforehand and have backup plans ready."
      ];
    }

    console.log('Generated AI answers:', aiAnswers);

    // Create the goal in the database
    const goalData = {
      userId,
      goal,
      alphaXProject,
      status: 'active',
      createdAt: new Date().toISOString(),
      completedAt: null,
      // Store AI questions and answers
      aiQuestions: aiQuestions || null,
      aiAnswers: aiAnswers || null,
      // Store validation data from AI
      validationData: validationResult || null,
      // Add admin creation info
      createdByAdmin: adminName,
      adminCreated: true
    };
    
    const newGoal = await createGoal(goalData);
    console.log('Goal created successfully by admin:', newGoal.id);
    
    res.json({ 
      success: true, 
      goal: newGoal,
      validation: validationResult,
      aiQuestions: aiQuestions,
      aiAnswers: aiAnswers,
      message: 'Goal created successfully with AI validation and auto-answered questions'
    });
  } catch (error) {
    console.error('Error creating goal:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create goal. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
