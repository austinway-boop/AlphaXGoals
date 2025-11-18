// Vercel serverless function for updating user display names
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

  const { userId, displayName } = req.body;
  
  if (!userId || !displayName) {
    return res.status(400).json({ 
      success: false, 
      error: 'User ID and display name are required' 
    });
  }

  if (displayName.length > 50) {
    return res.status(400).json({ 
      success: false, 
      error: 'Display name must be 50 characters or less' 
    });
  }

  try {
    const client = await getRedisClient();
    
    // Check if user exists
    const user = await client.hGetAll(userId);
    if (!user || !user.email) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Update user's display name (which is stored as username in our system)
    await client.hSet(userId, 'username', displayName);

    res.json({ 
      success: true, 
      message: 'User display name updated successfully',
      displayName: displayName
    });
  } catch (error) {
    console.error('Error updating user display name:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update user display name' 
    });
  }
}
