// Vercel serverless function for admin goal management
import { getAllGoals, getAllUsers, updateGoal } from './redis.js';

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

  // Check admin authentication
  const adminSessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('admin_session='));
  if (!adminSessionCookie) {
    return res.status(401).json({ success: false, error: 'Admin authentication required' });
  }

  let adminSession;
  try {
    adminSession = JSON.parse(adminSessionCookie.split('=')[1]);
    if (!adminSession.isAdmin) {
      return res.status(401).json({ success: false, error: 'Admin privileges required' });
    }
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Invalid admin session' });
  }

  if (req.method === 'GET') {
    // Get all goals with user information
    try {
      const [allGoals, allUsers] = await Promise.all([getAllGoals(), getAllUsers()]);
      
      // Create a map of userId to user info for faster lookup
      const userMap = {};
      allUsers.forEach(user => {
        userMap[user.id] = {
          username: user.username,
          email: user.email
        };
      });
      
      // Enrich goals with user information
      const enrichedGoals = allGoals.map(goal => ({
        ...goal,
        user: userMap[goal.userId] || { username: 'Unknown', email: 'Unknown' }
      }));
      
      // Filter by date if requested (today's goals)
      const { date, username, email } = req.query || {};
      let filteredGoals = enrichedGoals;
      
      if (date === 'today') {
        const today = new Date().toISOString().split('T')[0];
        filteredGoals = filteredGoals.filter(goal => 
          goal.createdAt && goal.createdAt.startsWith(today)
        );
      }
      
      if (username) {
        filteredGoals = filteredGoals.filter(goal => 
          goal.user.username.toLowerCase().includes(username.toLowerCase())
        );
      }
      
      if (email) {
        filteredGoals = filteredGoals.filter(goal => 
          goal.user.email.toLowerCase().includes(email.toLowerCase())
        );
      }
      
      res.json({ success: true, goals: filteredGoals, totalUsers: allUsers.length });
    } catch (error) {
      console.error('Error fetching admin goals:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch goals' });
    }
  } else if (req.method === 'POST') {
    // Invalidate a goal
    const { goalId, action, reason } = req.body;
    
    if (!goalId || !action) {
      return res.status(400).json({ success: false, error: 'Goal ID and action are required' });
    }
    
    try {
      if (action === 'invalidate') {
        const updatedGoal = await updateGoal(goalId, {
          status: 'invalidated',
          invalidatedAt: new Date().toISOString(),
          invalidatedBy: adminSession.email,
          invalidationReason: reason || 'No reason provided'
        });
        
        res.json({ success: true, goal: updatedGoal });
      } else {
        res.status(400).json({ success: false, error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      res.status(500).json({ success: false, error: 'Failed to update goal' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
