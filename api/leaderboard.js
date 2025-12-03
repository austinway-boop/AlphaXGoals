// Vercel serverless function for getting streak leaderboard
import { getAllUsers } from './redis.js';

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

  // Check authentication (optional - leaderboard can be public or require login)
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
    // Get all users
    const users = await getAllUsers();
    
    // Filter out deleted users and map to leaderboard format
    const leaderboardData = users
      .filter(user => !user.deleted)
      .map(user => ({
        id: user.id,
        username: user.username || 'Anonymous',
        house: user.house || null,
        streak: parseInt(user.streak) || 0,
        isCurrentUser: user.id === currentUserId
      }))
      .filter(user => user.streak > 0) // Only show users with active streaks
      .sort((a, b) => b.streak - a.streak) // Sort by streak descending
      .slice(0, 50); // Limit to top 50

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

