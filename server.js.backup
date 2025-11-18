const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const multer = require('multer');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Vercel serverless function compatibility
const isVercel = process.env.VERCEL === '1';

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'goal-tracker-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

// In-memory storage (replace with database in production)
let users = [];
let goals = [];
let userContexts = []; // Store learned context from answered questions

// Claude API key
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || 'your-claude-api-key-here';

// Authentication endpoints
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  // Check if user already exists
  const existingUser = users.find(u => u.email === email || u.username === username);
  if (existingUser) {
    return res.status(400).json({ 
      success: false, 
      error: 'User already exists with this email or username' 
    });
  }
  
  // Create new user
  const newUser = {
    id: users.length + 1,
    username,
    email,
    password, // In production, hash this password
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  
  // Set session
  req.session.userId = newUser.id;
  req.session.username = newUser.username;
    
    res.json({
      success: true,
    user: { id: newUser.id, username: newUser.username, email: newUser.email } 
  });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Find user
  const user = users.find(u => u.username === username || u.email === username);
  if (!user || user.password !== password) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid username or password' 
    });
  }
  
  // Set session
  req.session.userId = user.id;
  req.session.username = user.username;
  
  res.json({ 
    success: true, 
    user: { id: user.id, username: user.username, email: user.email } 
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Could not log out' });
    }
    res.json({ success: true });
  });
});

// Check authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
}

// Goal validation with Claude AI
app.post('/api/validate-goal', requireAuth, async (req, res) => {
  const { goal, xpAmount, hasScreenshot } = req.body;
  const userId = req.session.userId;
  
  // Get user's learned context from previous questions
  const userContext = userContexts.filter(ctx => ctx.userId === userId);
  const contextInfo = userContext.map(ctx => `- ${ctx.term}: ${ctx.explanation}`).join('\n');
  
  try {
    const prompt = `You are a goal validation assistant. Analyze the following goal and determine if it meets these criteria:

CONTEXT INFORMATION:
- XP Systems: Many platforms use XP (experience points) to gamify learning and progress tracking.

USER'S LEARNED CONTEXT (from previous questions):
${contextInfo || '(No previous context learned yet)'}

Use this learned context to better understand the user's goals. If you've learned about a term before, you don't need to ask about it again.

CRITICAL INSTRUCTION: You MUST ask clarifying questions about ANY unfamiliar term, platform, concept, or activity - even if it seems like you might know what it means. This includes:
- Any platform names (CodeSignal, HackerEarth, Brilliant, Hashnode, Grasshopper, etc.)
- Any specialized terms or activities (like "brainlift", "challenges", "problems", etc.)
- Any vague references ("the platform", "my project", "the course", etc.)
- Any measurements that aren't clearly defined

NEVER assume you know what something means. Always ask for clarification!

VALIDATION CRITERIA:
1. DIFFICULTY: The goal should require at least 3 hours of work (180 minutes). Goals can take longer than 3 hours - that's perfectly fine! If XP is mentioned, 1 XP = 1.5 minutes, minimum 120 XP.
2. MEASURABILITY: The goal must be specific and measurable with clear success criteria.
3. REASONABLENESS: The goal should be achievable but not trivial.

Goal: "${goal}"
${xpAmount ? `XP Amount: ${xpAmount} XP (equivalent to ${xpAmount * 1.5} minutes)` : ''}
${hasScreenshot ? 'User has provided XP screenshot: Yes' : 'User has provided XP screenshot: No'}

CRITICAL INSTRUCTION: You MUST ask clarifying questions if you encounter ANY unfamiliar terms, platforms, or concepts. Do NOT try to validate goals with unknown elements. Instead, ask specific questions about:
- Unknown platforms or websites (e.g., "What is CodeSignal?", "What is Brilliant?")
- Unfamiliar terminology or acronyms
- Unclear activities or tasks
- Vague measurements or metrics
- Any concept you're uncertain about

ALWAYS set "hasQuestions" to true and ask clarifying questions when you don't know something. Do not guess or make assumptions.

For XP-related goals:
- If the goal mentions XP, the user MUST provide a screenshot of their current XP dashboard
- Validate that the XP amount represents at least 3 hours of work (120 XP minimum)

Respond with a JSON object containing:
{
  "isValid": boolean,
  "hasQuestions": boolean,
  "questions": ["array of clarifying questions if needed"],
  "difficulty": "easy" | "reasonable" | "challenging" | "unclear",
  "measurable": boolean,
  "feedback": "detailed explanation of your assessment",
  "estimatedHours": number,
  "suggestions": ["list of suggestions to improve the goal if needed"]
}

CRITICAL: Before validating, check if the goal contains ANY unfamiliar terms, platforms, tools, or concepts. If it does, you MUST:
1. Set "hasQuestions" to true
2. Set "isValid" to false 
3. Add specific questions to the "questions" array
4. Set "difficulty" to "unclear"

Only validate goals where you understand ALL the terms and platforms mentioned.

Examples of good goals (with clearly defined terms):
- "Complete 150 XP in Python programming challenges on LeetCode" (with screenshot) 
- "Send 12 personalized cold emails to potential clients with follow-up tracking spreadsheet"
- "Complete 200 XP in JavaScript challenges on Codewars" (with screenshot)
- "Write a 5000-word research paper on machine learning" (longer than 3 hours is fine!)
- "Create a React web application with user authentication and database integration"

Examples of goals that REQUIRE clarifying questions (you must ask about ANY unfamiliar terms):
- "Add 500 words to brainlift" → MUST ask: "What is brainlift? What type of content are you adding? What are the quality standards?"
- "Complete 150 XP on CodeSignal" → MUST ask: "What is CodeSignal? What type of activities earn XP there?"
- "Get 200 points in Brilliant" → MUST ask: "What is Brilliant? How are points earned on this platform?"
- "Do 50 challenges on HackerEarth" → MUST ask: "What is HackerEarth? What type of challenges does it offer?"
- "Write 5 articles for Hashnode" → MUST ask: "What is Hashnode? What type of articles would you write there?"
- "Complete my project" → MUST ask: "What type of project? What does completion look like? What are the deliverables?"
- "Finish the course" → MUST ask: "What course? How many modules/lessons does it have? What does finishing mean?"

REMEMBER: Ask clarifying questions about EVERY unfamiliar term, even if you think you might know what it means. Set hasQuestions=true and ask specific questions.

Examples of bad goals:
- "Send 3 emails" (too easy, under 3 hours)
- "Do some coding" (not measurable)
- "Get better at programming" (not specific or measurable)`;

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-5-sonnet-20241022',
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
        difficulty: "unknown",
        measurable: false,
        feedback: "Unable to validate goal at this time. Please ensure your goal is specific, measurable, and requires at least 3 hours of work.",
        estimatedHours: 0,
        suggestions: ["Please rephrase your goal with more specific details and measurable outcomes."]
      };
    }

    res.json({ success: true, validation });
  } catch (error) {
    console.error('Error validating goal:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to validate goal. Please try again.' 
    });
  }
});

// Answer AI questions about goal
app.post('/api/answer-questions', requireAuth, async (req, res) => {
  const { goal, xpAmount, hasScreenshot, questions, answers } = req.body;
  const userId = req.session.userId;
  
  try {
    // Save learned context from user's answers
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const answer = answers[i];
      
      if (answer && answer.trim()) {
        // Extract the term being asked about (simple extraction)
        const termMatch = question.match(/What is ([^?]+)\?/i);
        if (termMatch) {
          const term = termMatch[1].trim();
          
          // Check if we already have context for this term for this user
          const existingContext = userContexts.find(ctx => 
            ctx.userId === userId && ctx.term.toLowerCase() === term.toLowerCase()
          );
          
          if (!existingContext) {
            userContexts.push({
              userId,
              term,
              explanation: answer.trim(),
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    }
    
    // Get updated user context for the validation
    const userContext = userContexts.filter(ctx => ctx.userId === userId);
    const contextInfo = userContext.map(ctx => `- ${ctx.term}: ${ctx.explanation}`).join('\n');
    const prompt = `You are a goal validation assistant. You previously asked clarifying questions about a goal. Now you have the answers and need to provide a final validation.

CONTEXT INFORMATION:
- XP Systems: Many platforms use XP (experience points) to gamify learning and progress tracking.

USER'S LEARNED CONTEXT (including current answers):
${contextInfo || '(No previous context learned yet)'}

ORIGINAL GOAL: "${goal}"
${xpAmount ? `XP Amount: ${xpAmount} XP (equivalent to ${xpAmount * 1.5} minutes)` : ''}
${hasScreenshot ? 'User has provided XP screenshot: Yes' : 'User has provided XP screenshot: No'}

QUESTIONS AND ANSWERS:
${questions.map((q, i) => `Q: ${q}\nA: ${answers[i] || 'No answer provided'}`).join('\n\n')}

IMPORTANT: Use the user's answers to understand any unfamiliar terms, platforms, or concepts they mentioned. Their explanations should help you assess the goal accurately.

VALIDATION CRITERIA:
1. DIFFICULTY: The goal should require at least 3 hours of work (180 minutes). Goals can take longer than 3 hours - that's perfectly fine! If XP is mentioned, 1 XP = 1.5 minutes, minimum 120 XP.
2. MEASURABILITY: The goal must be specific and measurable with clear success criteria.
3. REASONABLENESS: The goal should be achievable but not trivial.

Based on the original goal and the provided answers (which explain any unfamiliar concepts), respond with a JSON object containing:
{
  "isValid": boolean,
  "hasQuestions": false,
  "questions": [],
  "difficulty": "easy" | "reasonable" | "challenging",
  "measurable": boolean,
  "feedback": "detailed explanation of your assessment incorporating the new information and user explanations",
  "estimatedHours": number,
  "suggestions": ["list of suggestions to improve the goal if needed"]
}

If you still need more clarification after the user's answers, you can set "hasQuestions" to true and ask follow-up questions.`;

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-5-sonnet-20241022',
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
        difficulty: "unknown",
        measurable: false,
        feedback: "Unable to validate goal at this time. Please ensure your goal is specific, measurable, and requires at least 3 hours of work.",
        estimatedHours: 0,
        suggestions: ["Please rephrase your goal with more specific details and measurable outcomes."]
      };
    }

    res.json({ success: true, validation });
  } catch (error) {
    console.error('Error validating goal with answers:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to validate goal. Please try again.' 
    });
  }
});

// Submit goal
app.post('/api/submit-goal', requireAuth, upload.single('screenshot'), async (req, res) => {
  const { goal, xpAmount } = req.body;
  const userId = req.session.userId;
  const screenshotPath = req.file ? req.file.path : null;
  
  // Check if XP goal requires screenshot
  if (xpAmount && !screenshotPath) {
    return res.status(400).json({
      success: false,
      error: 'XP-related goals require a screenshot of your current XP dashboard'
    });
  }
  
  const newGoal = {
    id: goals.length + 1,
    userId,
    goal,
    xpAmount: xpAmount ? parseInt(xpAmount) : null,
    screenshotPath,
    status: 'active',
    createdAt: new Date().toISOString(),
    completedAt: null
  };
  
  goals.push(newGoal);
  
  res.json({ success: true, goal: newGoal });
});

// Get user's goals
app.get('/api/goals', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const userGoals = goals.filter(g => g.userId === userId);
  res.json({ success: true, goals: userGoals });
});

// Complete goal
app.post('/api/complete-goal/:goalId', requireAuth, (req, res) => {
  const { goalId } = req.params;
  const userId = req.session.userId;
  
  const goal = goals.find(g => g.id === parseInt(goalId) && g.userId === userId);
  if (!goal) {
    return res.status(404).json({ success: false, error: 'Goal not found' });
  }
  
  goal.status = 'completed';
  goal.completedAt = new Date().toISOString();
  
  res.json({ success: true, goal });
});

// Get current user session
app.get('/api/session', (req, res) => {
  if (req.session.userId) {
    const user = users.find(u => u.id === req.session.userId);
    res.json({ 
      success: true, 
      user: { id: user.id, username: user.username, email: user.email } 
    });
  } else {
    res.json({ success: false, error: 'No active session' });
  }
});

// Get user's learned context
app.get('/api/context', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const userContext = userContexts.filter(ctx => ctx.userId === userId);
  res.json({ success: true, context: userContext });
});

// Start server (only in development, Vercel handles this in production)
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`\n🎯 Goal Tracker App is running!`);
    console.log(`📍 Open your browser and navigate to: http://localhost:${PORT}`);
    console.log(`\n✨ Features:`);
    console.log(`   • User authentication (register/login)`);
    console.log(`   • AI-powered goal validation with Claude`);
    console.log(`   • XP tracking with screenshot verification`);
    console.log(`   • Goal difficulty and measurability assessment`);
    console.log(`   • Goal progress tracking\n`);
  });
}

// Export for Vercel
module.exports = app;