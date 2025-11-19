// Vercel serverless function for submitting goals
import { createGoal } from './redis.js';

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

  const { goal, alphaXProject, aiQuestions, aiAnswers, validationData, projectScreenshotDataArray } = req.body;
  
  if (!goal) {
    return res.status(400).json({ success: false, error: 'Goal is required' });
  }
  
  if (!alphaXProject) {
    return res.status(400).json({ success: false, error: 'Alpha X project is required' });
  }
  
  try {
    console.log('Attempting to create goal for user:', userId);
    console.log('Goal data:', { goal, alphaXProject });
    
    // Save goal to Redis
    const goalData = {
      userId,
      goal,
      alphaXProject,
      status: 'active',
      createdAt: new Date().toISOString(),
      completedAt: null,
      // Store AI questions and answers if they exist
      aiQuestions: aiQuestions || null,
      aiAnswers: aiAnswers || null,
      // Store validation data from AI
      validationData: validationData || null,
      // Store project screenshots if provided
      projectScreenshots: projectScreenshotDataArray || []
    };
    
    const newGoal = await createGoal(goalData);
    console.log('Goal created successfully:', newGoal.id);
    
    res.json({ success: true, goal: newGoal });
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
