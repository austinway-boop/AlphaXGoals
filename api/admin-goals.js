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
      console.log('Admin goals API called');
      const [allGoals, allUsers] = await Promise.all([getAllGoals(), getAllUsers()]);
      console.log('Retrieved:', allGoals.length, 'goals and', allUsers.length, 'users');
      
      // Create a map of userId to user info for faster lookup
      const userMap = {};
      allUsers.forEach(user => {
        userMap[user.id] = {
          username: user.username || 'Unknown',
          email: user.email || 'Unknown',
          house: user.house || null
        };
      });
      
      // Enrich goals with user information
      const enrichedGoals = allGoals.map(goal => ({
        ...goal,
        user: userMap[goal.userId] || { username: 'Unknown', email: 'Unknown' }
      }));
      
      // Helper function for CST date filtering
      function getCSTDateString(date = new Date()) {
        const cstDate = new Date(date.toLocaleString("en-US", {timeZone: "America/Chicago"}));
        return cstDate.toISOString().split('T')[0];
      }
      
      // Filter goals based on query parameters
      const { date, house, username, email } = req.query || {};
      let filteredGoals = enrichedGoals;
      
      // Date filtering with CST timezone
      if (date === 'today') {
        const todayCST = getCSTDateString();
        filteredGoals = filteredGoals.filter(goal => {
          if (!goal.createdAt) return false;
          const goalDateCST = getCSTDateString(new Date(goal.createdAt));
          return goalDateCST === todayCST;
        });
      } else if (date === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayCST = getCSTDateString(yesterday);
        filteredGoals = filteredGoals.filter(goal => {
          if (!goal.createdAt) return false;
          const goalDateCST = getCSTDateString(new Date(goal.createdAt));
          return goalDateCST === yesterdayCST;
        });
      } else if (date === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filteredGoals = filteredGoals.filter(goal => 
          goal.createdAt && new Date(goal.createdAt) >= weekAgo
        );
      } else if (date === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filteredGoals = filteredGoals.filter(goal => 
          goal.createdAt && new Date(goal.createdAt) >= monthAgo
        );
      }
      
      // House filtering
      if (house && house !== 'all') {
        filteredGoals = filteredGoals.filter(goal => {
          if (house === 'none') {
            return !goal.user.house;
          }
          return goal.user.house === house;
        });
      }
      
      // Username filtering
      if (username) {
        filteredGoals = filteredGoals.filter(goal => 
          goal.user.username.toLowerCase().includes(username.toLowerCase())
        );
      }
      
      // Email filtering
      if (email) {
        filteredGoals = filteredGoals.filter(goal => 
          goal.user.email.toLowerCase().includes(email.toLowerCase())
        );
      }
      
      console.log('Returning filtered goals:', filteredGoals.length);
      res.json({ success: true, goals: filteredGoals, totalUsers: allUsers.length });
    } catch (error) {
      console.error('Error fetching admin goals:', error);
      res.status(500).json({ 
        success: false, 
        error: `Failed to fetch goals: ${error.message}` 
      });
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
