// Vercel serverless function for updating goals with AI validation
import { getRedisClient, updateGoal } from './redis.js';
import Anthropic from '@anthropic-ai/sdk';

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

  const { goalId, newGoalText, adminName, isUserEdit } = req.body;
  
  let isAdminEdit = false;
  let userId = null;
  
  if (isUserEdit) {
    // Check user authentication for self-edit
    const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
    if (!sessionCookie) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    try {
      const sessionValue = sessionCookie.split('=')[1];
      const decodedSession = decodeURIComponent(sessionValue);
      const sessionData = JSON.parse(decodedSession);
      userId = sessionData.userId;
    } catch (e) {
      console.error('Session parse error:', e);
      return res.status(401).json({ success: false, error: 'Invalid session' });
    }
  } else {
    // Check admin authentication
    const adminCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('admin_session='));
    if (!adminCookie) {
      return res.status(401).json({ success: false, error: 'Admin authentication required' });
    }

    let adminSession;
    try {
      const adminValue = adminCookie.split('=')[1];
      const decodedAdmin = decodeURIComponent(adminValue);
      adminSession = JSON.parse(decodedAdmin);
      if (!adminSession.isAdmin) {
        return res.status(401).json({ success: false, error: 'Admin privileges required' });
      }
      isAdminEdit = true;
    } catch (e) {
      console.error('Admin session parse error:', e);
      return res.status(401).json({ success: false, error: 'Invalid admin session' });
    }
  }
  
  if (!goalId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Goal ID is required' 
    });
  }
  
  if (!newGoalText || newGoalText.trim() === '') {
    return res.status(400).json({ 
      success: false, 
      error: 'Goal text is required and cannot be empty' 
    });
  }
  
  if (!adminName || adminName.trim() === '') {
    return res.status(400).json({ 
      success: false, 
      error: isUserEdit ? 'User name is required' : 'Admin name is required' 
    });
  }

  try {
    const client = await getRedisClient();
    
    // Ensure goalId has proper format
    const formattedGoalId = goalId.startsWith('goal:') ? goalId : `goal:${goalId}`;
    
    console.log(`Updating goal for goalId: ${formattedGoalId}, to: ${newGoalText}, by ${isUserEdit ? 'user' : 'admin'}: ${adminName}`);
    
    // Check if goal exists
    const goal = await client.hGetAll(formattedGoalId);
    console.log('Found goal:', goal ? 'exists' : 'not found', Object.keys(goal || {}));
    
    if (!goal || Object.keys(goal).length === 0) {
      console.error('Goal not found:', goalId);
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    // For user edits, verify the user owns this goal
    if (isUserEdit) {
      if (goal.userId !== userId) {
        return res.status(403).json({ 
          success: false, 
          error: 'You can only edit your own goals' 
        });
      }
    }

    // Check if goal can be edited (current day only in CST)
    const now = new Date();
    const goalCreatedAt = new Date(goal.createdAt);
    
    const nowCST = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    const goalDateCST = new Date(goalCreatedAt.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    
    if (nowCST.toDateString() !== goalDateCST.toDateString()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Goals can only be edited on the same day they were created (CST timezone)' 
      });
    }

    // Get Alpha X project for validation
    const alphaXProject = goal.alphaXProject;
    if (!alphaXProject) {
      return res.status(400).json({ 
        success: false, 
        error: 'Alpha X project not found for this goal' 
      });
    }

    console.log('Validating edited goal with AI...');

    // Get API key for AI validation
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    
    if (!CLAUDE_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'AI validation service not available' 
      });
    }

    // Critical validation prompt (same as validate-goal.js)
    const prompt = `You are a STRICT goal validation assistant for Alpha X students. Be highly critical and maintain rigorous standards. Analyze the following goal and respond with JSON only.

Goal: "${newGoalText}"
Alpha X Project: "${alphaXProject}"

Context: A brain lift is a repository for all of the students' expertise in research about their topic. Ephor is a tool that is used to score brain lifts. 

IMPORTANT BRAINLIFT RULES:
- If doing ONLY BrainLift words: minimum 1000 words required for sufficient ambition
- If doing BrainLift + other tasks: any amount of words is acceptable (even 80 words) as long as the combination is ambitious
- Examples of GOOD BrainLift goals: "Add 1000+ words to BrainLift" OR "Add 200 words to BrainLift AND post 5 times on X AND conduct 3 interviews"
- Examples of BAD BrainLift goals: "Add 500 words to BrainLift" (insufficient if alone, needs 1000+ or additional tasks)
- BrainLift alone needs 1000+ words. BrainLift + other activities = any word count acceptable.

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
- BrainLift ONLY with 1000+ words = 4/5 or 5/5 (sufficient ambition)
- BrainLift ONLY with less than 1000 words = 2/5 or 3/5 (insufficient ambition)
- BrainLift + additional tasks = 4/5 or 5/5 (good ambition regardless of word count)
- Examples: "Add 1200 words to BrainLift" = 4/5+ (sufficient alone)
- Examples: "Add 300 words to BrainLift AND post 4 times on X AND conduct interviews" = 4/5+
- Examples: "Add 500 words to BrainLift" (alone) = 3/5 (insufficient, needs 1000+ words or additional tasks)

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

The goal must pass all criteria to be valid. If it has clarifying questions, mark hasQuestions as true.`;

    try {
      console.log('Calling Claude API...');

      const anthropic = new Anthropic({
        apiKey: CLAUDE_API_KEY,
      });

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      console.log('Claude API response received');

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

      // Check if goal passes validation
      if (!validation.isValid) {
        console.log('Goal failed AI validation:', validation);
        return res.json({
          success: false,
          validation: validation
        });
      }

      // If valid, update the goal with new text, admin tracking, and validation data
      const updateData = {
        goal: newGoalText.trim(),
        lastEditedBy: adminName.trim(),
        lastEditedAt: new Date().toISOString(),
        // Update validation data with new validation results
        validationData: validation
      };
      
      const updatedGoal = await updateGoal(formattedGoalId, updateData);
      console.log('Successfully updated goal after validation:', formattedGoalId);

      res.json({ 
        success: true, 
        message: `Goal updated successfully and passed AI validation${isUserEdit ? ' by user' : ' by admin'}`,
        goal: updatedGoal,
        updatedBy: adminName,
        validation: validation,
        editType: isUserEdit ? 'user' : 'admin'
      });

    } catch (validationError) {
      console.error('Error in update-goal validation:', {
        message: validationError.message,
        status: validationError.response?.status,
        data: validationError.response?.data
      });
      
      let errorMessage = 'Failed to validate goal. Please try again.';
      if (validationError.response?.status === 401) {
        errorMessage = 'Claude API authentication failed.';
      } else if (validationError.response?.status === 429) {
        errorMessage = 'Too many requests. Please try again in a moment.';
      } else if (validationError.code === 'ETIMEDOUT') {
        errorMessage = 'Request timed out. Please try again.';
      }

      return res.status(500).json({ 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? validationError.message : undefined
      });
    }
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to update goal: ${error.message}` 
    });
  }
}
