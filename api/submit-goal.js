// Vercel serverless function for submitting goals with BrainLift word count tracking
import { createGoal, saveBrainLiftEntry } from './redis.js';

// Word count utility function
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  const cleanText = text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .trim();
  const words = cleanText.split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

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

  const { goal, brainliftContent, alphaXProject, aiQuestions, aiAnswers, validationData } = req.body;
  
  if (!goal) {
    return res.status(400).json({ success: false, error: 'Goal is required' });
  }
  
  if (!brainliftContent || typeof brainliftContent !== 'string' || brainliftContent.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Brain Lift content is required. Please paste your current Brain Lift content in the text area.' });
  }
  
  if (!alphaXProject) {
    return res.status(400).json({ success: false, error: 'Alpha X project is required' });
  }
  
  try {
    console.log('Attempting to create goal for user:', userId);
    console.log('Goal data:', { goal, alphaXProject, brainliftContentLength: brainliftContent.length });
    
    // Calculate starting word count from uploaded Brain Lift content
    console.log('Calculating starting word count from Brain Lift content');
    // Calculate starting word count from Brain Lift content (content not stored)
    const startingWordCount = countWords(brainliftContent);
    
    if (startingWordCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Brain Lift content must contain at least one word'
      });
    }
    
    // Get a preview of the content (first 200 characters)
    console.log(`Starting word count: ${startingWordCount} words (content not stored for privacy)`);
    
    // Save Brain Lift entry for today (only word count, not content)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const brainliftEntry = await saveBrainLiftEntry(userId, startingWordCount, today);
    console.log('Brain Lift entry saved:', brainliftEntry.id);
    
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
      // Store BrainLift tracking data
      brainliftEntryId: brainliftEntry.id,
      startingWordCount: startingWordCount,
      startingBrainLiftDate: today,
      endingWordCount: null,
      endingBrainLiftDate: null,
      contentPreview: contentPreview,
      wordCountCalculatedAt: new Date().toISOString()
    };
    
    const newGoal = await createGoal(goalData);
    console.log('Goal created successfully:', newGoal.id);
    
    res.json({ 
      success: true, 
      goal: newGoal,
      brainliftEntry: {
        id: brainliftEntry.id,
        wordCount: startingWordCount,
        date: today
      }
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
