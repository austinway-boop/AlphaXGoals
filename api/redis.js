import { createClient } from 'redis';
import bcrypt from 'bcryptjs';

let redis = null;

export async function getRedisClient() {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || process.env.Afterschool_REDIS_URL;
    
    if (!redisUrl) {
      throw new Error('Redis URL not configured. Please set REDIS_URL or Afterschool_REDIS_URL environment variable.');
    }
    
    redis = createClient({ 
      url: redisUrl
    });
    
    redis.on('error', (err) => console.log('Redis Client Error', err));
    await redis.connect();
  }
  
  return redis;
}

// Helper functions for user management
export async function createUser(userData) {
  const client = await getRedisClient();
  const userId = `user:${Date.now()}`;
  
  // Hash password before storing
  const hashedPassword = await bcrypt.hash(userData.password, 12);
  const userDataWithHashedPassword = { ...userData, password: hashedPassword };
  
  await client.hSet(userId, userDataWithHashedPassword);
  await client.sAdd('users', userId);
  return { id: userId, ...userData }; // Return without password
}

export async function findUser(username, email) {
  const client = await getRedisClient();
  const userIds = await client.sMembers('users');
  
  for (const userId of userIds) {
    const user = await client.hGetAll(userId);
    if (user.username === username || user.email === email) {
      return { id: userId, ...user };
    }
  }
  return null;
}

export async function authenticateUser(username, password) {
  const client = await getRedisClient();
  const userIds = await client.sMembers('users');
  
  for (const userId of userIds) {
    const user = await client.hGetAll(userId);
    if ((user.username === username || user.email === username)) {
      // Use bcrypt to verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (isValidPassword) {
        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        return { id: userId, ...userWithoutPassword };
      }
    }
  }
  return null;
}

export async function updateUser(userId, updateData) {
  const client = await getRedisClient();
  
  // Convert all values to strings for Redis storage
  const redisData = {};
  for (const [key, value] of Object.entries(updateData)) {
    if (value !== null && value !== undefined) {
      redisData[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
  }
  
  // Update the user data in Redis
  await client.hSet(userId, redisData);
  
  // Return updated user data (without password)
  const updatedUser = await client.hGetAll(userId);
  const { password: _, ...userWithoutPassword } = updatedUser;
  return { id: userId, ...userWithoutPassword };
}

// Helper functions for goal management
export async function createGoal(goalData) {
  try {
    console.log('Creating goal with data:', goalData);
    const client = await getRedisClient();
    const goalId = `goal:${Date.now()}`;
    
    // Convert all values to strings for Redis storage
    const redisData = {};
    for (const [key, value] of Object.entries(goalData)) {
      if (value !== null && value !== undefined) {
        redisData[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    }
    
    console.log('Storing in Redis:', redisData);
    await client.hSet(goalId, redisData);
    await client.sAdd(`user_goals:${goalData.userId}`, goalId);
    
    console.log('Goal stored successfully with ID:', goalId);
    return { id: goalId, ...goalData };
  } catch (error) {
    console.error('Error in createGoal:', error);
    throw error;
  }
}

export async function getUserGoals(userId) {
  const client = await getRedisClient();
  const goalIds = await client.sMembers(`user_goals:${userId}`);
  
  const goals = [];
  for (const goalId of goalIds) {
    const goal = await client.hGetAll(goalId);
    if (Object.keys(goal).length > 0) {
      // Convert stored string values back to appropriate types
      const parsedGoal = { id: goalId };
      for (const [key, value] of Object.entries(goal)) {
        if (key === 'xpAmount') {
          parsedGoal[key] = value ? parseInt(value) : null;
        } else if (key === 'hasScreenshot') {
          parsedGoal[key] = value === 'true';
        } else if (key === 'aiQuestions' || key === 'aiAnswers') {
          // Parse JSON arrays for AI questions and answers
          parsedGoal[key] = value ? JSON.parse(value) : null;
        } else {
          parsedGoal[key] = value;
        }
      }
      goals.push(parsedGoal);
    }
  }
  return goals;
}

export async function updateGoal(goalId, updates) {
  try {
    console.log('Updating goal:', goalId, 'with updates:', updates);
    const client = await getRedisClient();
    
    // Convert all values to strings for Redis storage
    const redisUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== null && value !== undefined) {
        redisUpdates[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    }
    
    await client.hSet(goalId, redisUpdates);
    const goal = await client.hGetAll(goalId);
    
    // Convert stored string values back to appropriate types
    const parsedGoal = { id: goalId };
    for (const [key, value] of Object.entries(goal)) {
      if (key === 'xpAmount') {
        parsedGoal[key] = value ? parseInt(value) : null;
      } else if (key === 'hasScreenshot') {
        parsedGoal[key] = value === 'true';
      } else if (key === 'aiQuestions' || key === 'aiAnswers') {
        // Parse JSON arrays for AI questions and answers
        parsedGoal[key] = value ? JSON.parse(value) : null;
      } else {
        parsedGoal[key] = value;
      }
    }
    
    console.log('Goal updated successfully:', parsedGoal);
    return parsedGoal;
  } catch (error) {
    console.error('Error in updateGoal:', error);
    throw error;
  }
}

// Helper functions for user context (learned information)
export async function saveUserContext(userId, term, explanation) {
  const client = await getRedisClient();
  const contextKey = `context:${userId}:${term.toLowerCase()}`;
  await client.hSet(contextKey, {
    term,
    explanation,
    createdAt: new Date().toISOString()
  });
  await client.sAdd(`user_context:${userId}`, contextKey);
}

export async function getUserContext(userId) {
  const client = await getRedisClient();
  const contextKeys = await client.sMembers(`user_context:${userId}`);
  
  const contexts = [];
  for (const contextKey of contextKeys) {
    const context = await client.hGetAll(contextKey);
    if (Object.keys(context).length > 0) {
      contexts.push(context);
    }
  }
  return contexts;
}

// Helper function for testing database connection
export async function testConnection() {
  try {
    const client = await getRedisClient();
    await client.ping();
    return {
      connected: true,
      message: 'Database connection successful'
    };
  } catch (error) {
    return {
      connected: false,
      message: `Database connection failed: ${error.message}`
    };
  }
}

// Admin helper functions
export async function getAllUsers() {
  const client = await getRedisClient();
  const userIds = await client.sMembers('users');
  
  const users = [];
  for (const userId of userIds) {
    const user = await client.hGetAll(userId);
    if (Object.keys(user).length > 0) {
      // Don't include password in admin view
      const { password: _, ...userWithoutPassword } = user;
      users.push({ id: userId, ...userWithoutPassword });
    }
  }
  return users;
}

export async function getAllGoals() {
  const client = await getRedisClient();
  const allKeys = await client.keys('goal:*');
  
  const goals = [];
  for (const goalId of allKeys) {
    const goal = await client.hGetAll(goalId);
    if (Object.keys(goal).length > 0) {
      // Convert stored string values back to appropriate types
      const parsedGoal = { id: goalId };
      for (const [key, value] of Object.entries(goal)) {
        if (key === 'xpAmount') {
          parsedGoal[key] = value ? parseInt(value) : null;
        } else if (key === 'hasScreenshot') {
          parsedGoal[key] = value === 'true';
        } else if (key === 'aiQuestions' || key === 'aiAnswers') {
          // Parse JSON arrays for AI questions and answers
          parsedGoal[key] = value ? JSON.parse(value) : null;
        } else {
          parsedGoal[key] = value;
        }
      }
      goals.push(parsedGoal);
    }
  }
  
  // Sort by creation date (newest first)
  return goals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// System prompt management functions
export async function getSystemPrompts() {
  const client = await getRedisClient();
  const promptKeys = await client.keys('system_prompt:*');
  
  const prompts = {};
  for (const key of promptKeys) {
    const promptType = key.replace('system_prompt:', '');
    const promptData = await client.hGetAll(key);
    prompts[promptType] = promptData;
  }
  
  // If no prompts exist, return defaults
  if (Object.keys(prompts).length === 0) {
    return {
      validation: {
        content: getDefaultValidationPrompt(),
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      },
      answerQuestions: {
        content: getDefaultAnswerQuestionsPrompt(),
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      }
    };
  }
  
  return prompts;
}

export async function updateSystemPrompt(promptType, content, updatedBy) {
  const client = await getRedisClient();
  const key = `system_prompt:${promptType}`;
  
  await client.hSet(key, {
    content,
    lastUpdated: new Date().toISOString(),
    updatedBy
  });
}

export async function getSystemPrompt(promptType) {
  const client = await getRedisClient();
  const key = `system_prompt:${promptType}`;
  const promptData = await client.hGetAll(key);
  
  if (Object.keys(promptData).length === 0) {
    // Return default prompt if none exists
    if (promptType === 'validation') {
      return getDefaultValidationPrompt();
    } else if (promptType === 'answerQuestions') {
      return getDefaultAnswerQuestionsPrompt();
    }
    return null;
  }
  
  return promptData.content;
}

function getDefaultValidationPrompt() {
  return `You are a helpful goal validation assistant. Analyze the following goal and determine if it meets the basic criteria. Be supportive and encouraging while ensuring quality.

CONTEXT INFORMATION:
- XP Systems: Many platforms use XP (experience points) to gamify learning and progress tracking.
- Common platforms include: CodeSignal, HackerEarth, LeetCode, HackerRank, Brilliant, Coursera, edX, Khan Academy, Duolingo, etc.

USER'S LEARNED CONTEXT (from previous questions):
{contextInfo}

Use this learned context to better understand the user's goals. If you've learned about a term before, you don't need to ask about it again.

VALIDATION APPROACH:
- Be encouraging and supportive of user goals
- Only ask clarifying questions if the goal is genuinely unclear or vague
- Most common platforms and activities should be considered familiar
- Give users the benefit of the doubt when goals are reasonable

VALIDATION CRITERIA:
1. DIFFICULTY: The goal should require at least 2 hours of work (120 minutes). Goals can take longer - that's great! If XP is mentioned, 1 XP = 1.5 minutes. Goals can combine XP with other activities, so lower XP amounts are acceptable if the goal includes additional meaningful work.
2. MEASURABILITY: The goal should have some measurable outcome (completing X problems, earning Y XP, finishing Z lessons, etc.)
3. REASONABLENESS: The goal should be achievable and meaningful.

Goal: "{goal}"
{xpInfo}
{screenshotInfo}

WHEN TO ASK QUESTIONS:
Only ask clarifying questions if:
- The goal is extremely vague (e.g., "do some coding")
- You encounter truly unfamiliar or made-up terms
- The measurement is completely unclear
- The goal lacks any specific outcome

COMMON TERMS YOU SHOULD RECOGNIZE:
- Programming platforms: LeetCode, HackerRank, CodeSignal, HackerEarth, Codeforces, AtCoder
- Learning platforms: Coursera, edX, Udemy, Khan Academy, Brilliant, Duolingo, Codecademy
- Activities: coding problems, challenges, courses, tutorials, projects, exercises, lessons
- Measurements: XP, points, problems solved, lessons completed, hours spent

For XP-related goals:
- If the goal mentions XP, the user should provide a screenshot of their current XP dashboard
- Consider the XP amount along with other activities mentioned in the goal. Goals can combine XP earning with other valuable work, so don't require a strict 120 XP minimum if other activities are included.

Respond with a JSON object containing:
{
  "isValid": boolean,
  "hasQuestions": boolean,
  "questions": ["array of clarifying questions if needed"],
  "difficulty": "easy" | "reasonable" | "challenging",
  "measurable": boolean,
  "feedback": "positive and encouraging explanation of your assessment",
  "estimatedHours": number,
  "suggestions": ["helpful suggestions to improve the goal if needed"]
}

Be supportive and approve goals that meet the basic criteria. Only reject goals that are clearly inadequate.`;
}

function getDefaultAnswerQuestionsPrompt() {
  return `You are a supportive goal validation assistant. You previously asked clarifying questions about a goal, and now you have the user's helpful answers. Use this information to provide an encouraging final validation.

CONTEXT INFORMATION:
- XP Systems: Many platforms use XP (experience points) to gamify learning and progress tracking.

USER'S LEARNED CONTEXT (including current answers):
{contextInfo}

ORIGINAL GOAL: "{goal}"
{xpInfo}
{screenshotInfo}

QUESTIONS AND ANSWERS:
{questionsAndAnswers}

IMPORTANT: The user took time to provide clarifying answers. Use their explanations to understand the goal fully and be supportive of their learning journey.

VALIDATION CRITERIA:
1. DIFFICULTY: The goal should require at least 2 hours of work (120 minutes). Goals can take longer - that's great! If XP is mentioned, 1 XP = 1.5 minutes. Goals can combine XP with other activities, so lower XP amounts are acceptable if the goal includes additional meaningful work.
2. MEASURABILITY: The goal should have some measurable outcome based on the user's explanation.
3. REASONABLENESS: The goal should be achievable and meaningful for the user's learning.

VALIDATION APPROACH:
- Be encouraging and supportive
- The user provided clarifying information, so approve the goal if it meets basic criteria
- Focus on the positive aspects of their goal
- Only reject if the goal is clearly inadequate even after clarification

Based on the original goal and the provided answers, respond with a JSON object containing:
{
  "isValid": boolean (should be true if goal meets basic criteria after clarification),
  "hasQuestions": false,
  "questions": [],
  "difficulty": "easy" | "reasonable" | "challenging",
  "measurable": boolean,
  "feedback": "positive and encouraging explanation incorporating the user's helpful explanations",
  "estimatedHours": number,
  "suggestions": ["optional helpful suggestions to enhance the goal"]
}

Since the user provided clarifying answers, you should approve the goal unless it clearly fails to meet the basic criteria even after their explanation.`;
}
