// Debug endpoint to check user data in Redis
import { getRedisClient } from './redis.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
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

  try {
    console.log('=== DEBUG USERS ENDPOINT ===');
    
    const client = await getRedisClient();
    console.log('Redis connection established');
    
    // Get all user IDs
    const userIds = await client.sMembers('users');
    console.log('User IDs found:', userIds);
    
    const usersData = [];
    
    for (const userId of userIds) {
      const userData = await client.hGetAll(userId);
      // Don't expose actual passwords, but show if they exist
      const safeUserData = {
        id: userId,
        username: userData.username,
        email: userData.email,
        createdAt: userData.createdAt,
        hasPassword: !!userData.password,
        passwordLength: userData.password ? userData.password.length : 0,
        passwordStartsWith: userData.password ? userData.password.substring(0, 7) : 'NO_HASH'
      };
      usersData.push(safeUserData);
    }
    
    console.log('Users data collected:', usersData.length);
    
    res.json({
      success: true,
      totalUsers: userIds.length,
      users: usersData,
      debugInfo: {
        redisConnected: true,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Debug users error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      debugInfo: {
        redisConnected: false,
        timestamp: new Date().toISOString()
      }
    });
  }
}
