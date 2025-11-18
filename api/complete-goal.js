// Vercel serverless function for completing goals
import { updateGoal, getGoalById } from './redis.js';

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

  const { goalId, screenshotData } = req.body;
  
  if (!goalId) {
    return res.status(400).json({ success: false, error: 'Goal ID is required' });
  }
  
  if (!screenshotData) {
    return res.status(400).json({ success: false, error: 'Screenshot proof is required to complete a goal' });
  }

  try {
    // Check if it's after midnight CST - prevent goal completion
    const now = new Date();
    const cstNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    
    // Get the goal to check its creation date
    const goal = await getGoalById(goalId);
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }
    
    // Check if the goal belongs to the user
    if (goal.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Check if goal was created today (CST)
    const goalCreatedDate = new Date(goal.createdAt);
    const goalCreatedCST = new Date(goalCreatedDate.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    
    // Get CST midnight for today
    const cstMidnight = new Date(cstNow);
    cstMidnight.setHours(0, 0, 0, 0);
    
    // Check if the goal was created today and if it's still the same day in CST
    const goalCreatedTodayCST = goalCreatedCST.toDateString() === cstNow.toDateString();
    
    if (!goalCreatedTodayCST) {
      return res.status(400).json({ 
        success: false, 
        error: 'Goals can only be completed on the same day they were created (CST timezone)' 
      });
    }
    
    // Check if it's after midnight CST for goals created today
    if (cstNow.getHours() >= 0 && cstNow < cstMidnight.setDate(cstMidnight.getDate() + 1)) {
      // It's still the same day, allow completion
    } else if (goalCreatedTodayCST && cstNow.getHours() >= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Goals cannot be completed after midnight CST. You can complete goals until 11:59 PM CST on the day they were created.' 
      });
    }

    // Update goal status to completed with screenshot
    const updatedGoal = await updateGoal(goalId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      screenshotData,
      hasScreenshot: true
    });
    
    res.json({ success: true, goal: updatedGoal });
  } catch (error) {
    console.error('Error completing goal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to complete goal. Please try again.' 
    });
  }
}
