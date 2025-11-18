// Vercel serverless function for goal validation with Claude AI
import axios from 'axios';

export default async function handler(req, res) {
  console.log('=== VALIDATE GOAL API CALLED ===');
  
  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
      console.log('OPTIONS request');
      res.status(200).end();
      return;
    }

    if (req.method !== 'POST') {
      console.log('Non-POST request');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    console.log('Method and CORS setup complete');

    // Check authentication
    const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
    if (!sessionCookie) {
      console.log('No session cookie');
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    let userId;
    try {
      const sessionData = JSON.parse(sessionCookie.split('=')[1]);
      userId = sessionData.userId;
      console.log('User authenticated:', userId);
    } catch (e) {
      console.log('Session parsing failed');
      return res.status(401).json({ success: false, error: 'Invalid session' });
    }

    const { goal, alphaXProject } = req.body;
    console.log('Request data:', { goal: !!goal, alphaXProject: !!alphaXProject });
    
    if (!goal) {
      console.log('No goal provided');
      return res.status(400).json({ success: false, error: 'Goal is required' });
    }
    
    if (!alphaXProject) {
      console.log('No Alpha X project provided');
      return res.status(400).json({ success: false, error: 'Alpha X project is required' });
    }

    // Get API key
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    
    if (!CLAUDE_API_KEY) {
      console.error('No Claude API key');
      return res.status(500).json({ 
        success: false, 
        error: 'Claude API key not configured' 
      });
    }

    console.log('API key present, sending to Claude...');

    // Critical validation prompt
    const prompt = `You are a STRICT goal validation assistant for Alpha X students. Be highly critical and maintain rigorous standards. Analyze the following goal and respond with JSON only.

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

TIME ESTIMATION - BE SKEPTICAL:
- Don't trust student time estimates - calculate realistic time yourself
- 3 emails = 30 minutes max (NOT ambitious enough)
- 5-10 emails = 1-2 hours (borderline)
- 15+ personalized emails = 3+ hours (acceptable)
- Writing 500 words = 2-3 hours of research + writing
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
  "overallScore": number (1-10),
  "feedback": "honest, critical assessment explaining why scores were given",
  "estimatedHours": number (YOUR realistic estimate, not student's claim),
  "timeReasoning": "explain your time calculation",
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

Goals must achieve 4/5 for ambition AND 8/10 for measurable AND 8/10 for relevance to be valid. Overall score should be 8/10 minimum.`;

    console.log('Calling Claude API...');

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
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
      },
      timeout: 25000
    });

    console.log('Claude API response received');

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
      console.error('Error parsing Claude response:', parseError);
      validation = {
        isValid: false,
        hasQuestions: false,
        questions: [],
        ambitionScore: 5,
        measurableScore: 5,
        relevanceScore: 5,
        overallScore: 5,
        feedback: "Goal needs review. Claude couldn't parse the response properly. Please try submitting again.",
        estimatedHours: 3,
        suggestions: ["Please resubmit your goal for proper validation"]
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

    console.log('Sending validation response');
    res.json({ success: true, validation });

  } catch (error) {
    console.error('Error in validate-goal:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    let errorMessage = 'Failed to validate goal. Please try again.';
    if (error.response?.status === 401) {
      errorMessage = 'Claude API authentication failed.';
    } else if (error.response?.status === 429) {
      errorMessage = 'Too many requests. Please try again in a moment.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Request timed out. Please try again.';
    }

    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
