// Vercel serverless function for revoking goal completion
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

  const { goalId, adminName } = req.body;
  
  if (!goalId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Goal ID is required' 
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
    
    console.log('Revoking completion for goalId:', goalId, 'by admin:', adminName);
    
    // Check if goal exists
    const goal = await client.hGetAll(goalId);
    console.log('Found goal:', goal ? 'exists' : 'not found', Object.keys(goal || {}));
    
    if (!goal || Object.keys(goal).length === 0) {
      console.error('Goal not found:', goalId);
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    // Check if goal is actually completed
    if (goal.status !== 'completed') {
      console.error('Goal is not completed:', goalId, 'current status:', goal.status);
      return res.status(400).json({ 
        success: false, 
        error: `Goal is not completed (current status: ${goal.status})` 
      });
    }

    // Update the goal to revoke completion
    const updateData = {
      status: 'active',
      completedAt: '', // Remove completion timestamp
      revokedBy: adminName.trim(),
      revokedAt: new Date().toISOString()
    };
    
    const updatedGoal = await updateGoal(goalId, updateData);
    console.log('Successfully revoked completion for goal:', goalId);

    res.json({ 
      success: true, 
      message: 'Goal completion revoked successfully',
      goal: updatedGoal,
      revokedBy: adminName
    });
  } catch (error) {
    console.error('Error revoking goal completion:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to revoke goal completion: ${error.message}` 
    });
  }
}
