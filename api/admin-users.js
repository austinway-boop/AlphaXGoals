// Vercel serverless function for admin user management
import { getAllUsers, getRedisClient } from './redis.js';

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

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
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

  try {
    console.log('Admin users API called');
    const allUsers = await getAllUsers();
    console.log('Retrieved users:', allUsers.length);

    // Get goal statistics for each user
    const client = await getRedisClient();
    const enrichedUsers = [];

    for (const user of allUsers) {
      try {
        // Get user's goals
        const goalIds = await client.sMembers(`user_goals:${user.id}`);
        let goalCount = 0;
        let activeGoals = 0;
        let completedGoals = 0;

        for (const goalId of goalIds) {
          try {
            const goal = await client.hGetAll(goalId);
            if (Object.keys(goal).length > 0) {
              goalCount++;
              if (goal.status === 'active') activeGoals++;
              if (goal.status === 'completed') completedGoals++;
            }
          } catch (goalError) {
            console.warn(`Error reading goal ${goalId}:`, goalError);
          }
        }

        enrichedUsers.push({
          ...user,
          goalCount,
          activeGoals,
          completedGoals,
          deleted: user.deleted === 'true'
        });
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        // Still include user but with zero stats
        enrichedUsers.push({
          ...user,
          goalCount: 0,
          activeGoals: 0,
          completedGoals: 0,
          deleted: user.deleted === 'true'
        });
      }
    }

    // Sort by creation date (newest first), putting deleted users at the end
    enrichedUsers.sort((a, b) => {
      if (a.deleted && !b.deleted) return 1;
      if (!a.deleted && b.deleted) return -1;
      
      const aDate = new Date(a.createdAt || 0);
      const bDate = new Date(b.createdAt || 0);
      return bDate - aDate;
    });

    console.log('Returning enriched users:', enrichedUsers.length);
    res.json({ success: true, users: enrichedUsers });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to fetch users: ${error.message}` 
    });
  }
}
