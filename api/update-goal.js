// Vercel serverless function for updating goals
import { getRedisClient, updateGoal } from './redis.js';

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

  const { goalId, newGoalText, adminName } = req.body;
  
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
      error: 'Admin name is required' 
    });
  }

  try {
    const client = await getRedisClient();
    
    console.log('Updating goal for goalId:', goalId, 'to:', newGoalText, 'by admin:', adminName);
    
    // Check if goal exists
    const goal = await client.hGetAll(goalId);
    console.log('Found goal:', goal ? 'exists' : 'not found', Object.keys(goal || {}));
    
    if (!goal || Object.keys(goal).length === 0) {
      console.error('Goal not found:', goalId);
      return res.status(404).json({ success: false, error: 'Goal not found' });
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

    // Update the goal with new text and admin tracking
    const updateData = {
      goal: newGoalText.trim(),
      lastEditedBy: adminName.trim(),
      lastEditedAt: new Date().toISOString()
    };
    
    const updatedGoal = await updateGoal(goalId, updateData);
    console.log('Successfully updated goal:', goalId);

    res.json({ 
      success: true, 
      message: 'Goal updated successfully',
      goal: updatedGoal,
      updatedBy: adminName
    });
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to update goal: ${error.message}` 
    });
  }
}
