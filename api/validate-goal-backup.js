// Vercel serverless function for goal validation with Claude AI
import axios from 'axios';
import { getUserContext, getSystemPrompt } from './redis.js';

export default async function handler(req, res) {
  // Set a timeout to prevent Vercel from hanging
  const timeout = setTimeout(() => {
    console.error('VERCEL TIMEOUT: Function exceeded 10 seconds');
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: 'Function timeout - execution exceeded 10 seconds',
        details: 'Vercel serverless function timeout'
      });
    }
  }, 10000);

  try {
    console.log('=== VALIDATE GOAL API CALLED ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('User-Agent:', req.headers['user-agent']);
    console.log('Content-Length:', req.headers['content-length']);
    console.log('Body keys:', Object.keys(req.body || {}));
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
      console.log('OPTIONS request - returning 200');
      res.status(200).end();
      return;
    }

    if (req.method !== 'POST') {
      console.log('Non-POST request - returning 405');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    console.log('Method validation passed');

    // Check authentication
    console.log('Checking authentication...');
    const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
    if (!sessionCookie) {
      console.log('No session cookie found');
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    let userId;
    try {
      const sessionData = JSON.parse(sessionCookie.split('=')[1]);
      userId = sessionData.userId;
      console.log('Authentication successful for user:', userId);
    } catch (e) {
      console.log('Session parsing failed:', e.message);
      return res.status(401).json({ success: false, error: 'Invalid session' });
    }

    const { goal, xpAmount, hasScreenshot } = req.body;
    console.log('Request data:', { goal: !!goal, xpAmount, hasScreenshot });
    
    if (!goal) {
      console.log('No goal provided');
      return res.status(400).json({ success: false, error: 'Goal is required' });
    }
    
    console.log('Basic validation passed, proceeding with goal validation...');

    // Start main validation logic
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    
    console.log('Environment variables check:', {
      CLAUDE_API_KEY: !!process.env.CLAUDE_API_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      finalKey: !!CLAUDE_API_KEY,
      keyPrefix: CLAUDE_API_KEY ? CLAUDE_API_KEY.substring(0, 10) + '...' : 'none'
    });
    
    if (!CLAUDE_API_KEY) {
      console.error('Claude API key not configured - no CLAUDE_API_KEY or ANTHROPIC_API_KEY found');
      return res.status(500).json({ 
        success: false, 
        error: 'Claude API key not configured' 
      });
    }

    console.log('Validating goal for user:', userId);
    console.log('Memory usage before Redis calls:', process.memoryUsage());

    // Get user's learned context from Redis with timeout
    let userContext = [];
    try {
      console.log('Fetching user context...');
      const contextPromise = getUserContext(userId);
      const contextTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('getUserContext timeout')), 5000)
      );
      userContext = await Promise.race([contextPromise, contextTimeout]);
      console.log('Retrieved user context:', userContext.length, 'items');
    } catch (contextError) {
      console.error('Error getting user context:', contextError.message);
      userContext = []; // Continue without context
    }
    const contextInfo = userContext.map(ctx => `- ${ctx.term}: ${ctx.explanation}`).join('\n');

    // Get system prompt (customizable by admin) with timeout
    let promptTemplate;
    try {
      console.log('Fetching system prompt...');
      const promptPromise = getSystemPrompt('validation');
      const promptTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('getSystemPrompt timeout')), 5000)
      );
      promptTemplate = await Promise.race([promptPromise, promptTimeout]);
      console.log('Retrieved validation prompt template, length:', promptTemplate.length);
    } catch (promptError) {
      console.error('Error getting system prompt, using fallback:', promptError.message);
      // Use a simple fallback prompt instead of crashing
      promptTemplate = `Analyze this goal and respond with JSON: {"isValid": true, "hasQuestions": false, "questions": [], "difficulty": "reasonable", "measurable": true, "feedback": "Goal looks good!", "estimatedHours": 2, "suggestions": []}. Goal: {goal}`;
    }
    
    const prompt = promptTemplate
      .replace('{contextInfo}', contextInfo || '(No previous context learned yet)')
      .replace('{goal}', goal)
      .replace('{xpInfo}', xpAmount ? `XP Amount: ${xpAmount} XP (equivalent to ${xpAmount * 1.5} minutes)` : '')
      .replace('{screenshotInfo}', hasScreenshot ? 'User has provided XP screenshot: Yes' : 'User has provided XP screenshot: No');

    console.log('Sending request to Claude API...');
    console.log('API Key present:', !!CLAUDE_API_KEY);
    console.log('Prompt length:', prompt.length);
    console.log('Memory usage before Claude call:', process.memoryUsage());
    
    const requestPayload = {
      model: 'claude-sonnet-4-5',
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    };
    
    const requestHeaders = {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    };
    
    console.log('Request payload:', JSON.stringify(requestPayload, null, 2));
    
    const response = await axios.post('https://api.anthropic.com/v1/messages', requestPayload, {
      headers: requestHeaders,
      timeout: 30000 // 30 second timeout
    });
    
    console.log('Received response from Claude API');
    console.log('Response status:', response.status);
    console.log('Response data structure:', Object.keys(response.data));

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
        feedback: "Unable to validate goal at this time. Please ensure your goal is specific, measurable, and requires at least 2 hours of work.",
        estimatedHours: 0,
        suggestions: ["Please rephrase your goal with more specific details and measurable outcomes."]
      };
    }

    console.log('SUCCESS: About to send response');
    clearTimeout(timeout);
    res.json({ success: true, validation });

  } catch (outerError) {
    clearTimeout(timeout);
    console.error('CRITICAL ERROR in validate-goal handler:', {
      message: outerError.message,
      stack: outerError.stack,
      name: outerError.name,
      type: typeof outerError,
      vercelInfo: {
        region: process.env.VERCEL_REGION,
        runtime: process.env.AWS_EXECUTION_ENV,
        memorySize: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE
      }
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to validate goal. Please try again.';
    if (outerError.response?.status === 401) {
      errorMessage = 'API authentication failed. Please check configuration.';
    } else if (outerError.response?.status === 429) {
      errorMessage = 'API rate limit exceeded. Please try again in a moment.';
    } else if (outerError.code === 'ENOTFOUND' || outerError.code === 'ECONNREFUSED') {
      errorMessage = 'Network connection error. Please check your internet connection.';
    }
    
    // Make sure we can still respond
    try {
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false, 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? outerError.message : undefined,
          errorType: outerError.name,
          timestamp: new Date().toISOString()
        });
      }
    } catch (responseError) {
      console.error('Could not send error response:', responseError);
    }
  }
}
