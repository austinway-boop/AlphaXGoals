// Vercel serverless function for checking user session
import { getRedisClient } from './redis.js';

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

  const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
  
  if (sessionCookie) {
    try {
      const sessionData = JSON.parse(sessionCookie.split('=')[1]);
      
      // Fetch full user data from Redis
      const client = await getRedisClient();
      const userData = await client.hGetAll(sessionData.userId);
      
      if (userData && userData.username) {
        const { password: _, ...userWithoutPassword } = userData;
        res.json({ 
          success: true, 
          user: { 
            id: sessionData.userId, 
            ...userWithoutPassword
          } 
        });
      } else {
        res.json({ success: false, error: 'User not found' });
      }
    } catch (e) {
      console.error('Session validation error:', e);
      res.json({ success: false, error: 'Invalid session' });
    }
  } else {
    res.json({ success: false, error: 'No active session' });
  }
}
