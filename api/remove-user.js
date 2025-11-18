// Vercel serverless function for removing users
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

  const { userId, adminName } = req.body;
  
  if (!userId) {
    return res.status(400).json({ 
      success: false, 
      error: 'User ID is required' 
    });
  }
  
  if (!adminName) {
    return res.status(400).json({ 
      success: false, 
      error: 'Admin name is required for user removal' 
    });
  }

  try {
    const client = await getRedisClient();
    
    // Check if user exists
    const user = await client.hGetAll(userId);
    if (!user || !user.email) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if user is already deleted
    if (user.deleted === 'true') {
      return res.status(400).json({ success: false, error: 'User is already deleted' });
    }

    // Mark user as deleted instead of actually deleting
    // This preserves data integrity for historical goals
    const deletionData = {
      deleted: 'true',
      deletedAt: new Date().toISOString(),
      deletedBy: adminSession.email,
      deletedByAdmin: adminName
    };

    // Update user with deletion info
    for (const [key, value] of Object.entries(deletionData)) {
      await client.hSet(userId, key, value);
    }

    // Note: We keep the user in the 'users' set for historical purposes
    // Goals remain linked to the user for audit trails

    res.json({ 
      success: true, 
      message: 'User removed successfully',
      userId: userId,
      deletedBy: adminName
    });
  } catch (error) {
    console.error('Error removing user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to remove user' 
    });
  }
}
