// Vercel serverless function for getting streak leaderboard
import { getAllUsers, getAllGoals } from './redis.js';

// Calculate streak from goals - consecutive completed goals
// Active goals don't break streak (still in progress), only invalidated goals break it
function calculateStreakFromGoals(goals) {
  if (!goals || goals.length === 0) return 0;
  
  // Sort goals by creation date (newest first)
  const sortedGoals = [...goals].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB - dateA;
  });
  
  let streak = 0;
  
  // Count consecutive completed goals
  // Skip active goals (they're still in progress, don't break streak)
  // Only invalidated goals break the streak
  for (const goal of sortedGoals) {
    const isCompleted = goal.status === 'completed';
    const isActive = goal.status === 'active';
    const isInvalidated = goal.status === 'invalidated' || goal.status === 'invalid';
    
    if (isCompleted) {
      streak++;
    } else if (isActive) {
      // Active goals don't break the streak - they're still in progress
      continue;
    } else if (isInvalidated) {
      // Invalidated goals break the streak
      break;
    } else {
      // Unknown status - skip it
      continue;
    }
  }
  
  return streak;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
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

  // Check authentication to identify current user
  const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
  let currentUserId = null;
  
  if (sessionCookie) {
    try {
      const sessionValue = sessionCookie.split('=')[1];
      const decodedValue = decodeURIComponent(sessionValue);
      const sessionData = JSON.parse(decodedValue);
      currentUserId = sessionData.userId;
    } catch (e) {
      // Session parsing failed, continue without current user
    }
  }

  try {
    // Get all users and all goals
    const [users, allGoals] = await Promise.all([
      getAllUsers(),
      getAllGoals()
    ]);
    
    // Group goals by userId
    const goalsByUser = {};
    for (const goal of allGoals) {
      if (!goalsByUser[goal.userId]) {
        goalsByUser[goal.userId] = [];
      }
      goalsByUser[goal.userId].push(goal);
    }
    
    // Calculate streak for each user and build leaderboard
    const leaderboardData = users
      .filter(user => !user.deleted)
      .map(user => {
        const userGoals = goalsByUser[user.id] || [];
        const streak = calculateStreakFromGoals(userGoals);
        const totalGoals = userGoals.length;
        const completedGoals = userGoals.filter(g => g.status === 'completed').length;
        
        return {
          id: user.id,
          username: user.username || 'Anonymous',
          house: user.house || null,
          streak: streak,
          totalGoals: totalGoals,
          completedGoals: completedGoals,
          isCurrentUser: user.id === currentUserId
        };
      })
      .sort((a, b) => {
        // Sort by streak descending, then by completed goals, then by username
        if (b.streak !== a.streak) return b.streak - a.streak;
        if (b.completedGoals !== a.completedGoals) return b.completedGoals - a.completedGoals;
        return a.username.localeCompare(b.username);
      });

    res.json({ 
      success: true, 
      leaderboard: leaderboardData,
      currentUserId: currentUserId
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch leaderboard' 
    });
  }
}
