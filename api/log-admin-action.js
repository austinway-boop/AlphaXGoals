// Vercel serverless function for logging admin actions
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

  const { type, description, adminName, details } = req.body;
  
  if (!type || !description) {
    return res.status(400).json({ 
      success: false, 
      error: 'Action type and description are required' 
    });
  }

  try {
    const client = await getRedisClient();
    
    // Create unique log entry ID
    const logId = `adminlog:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    
    const logData = {
      type,
      description,
      adminEmail: adminSession.email,
      adminName: adminName || 'Unknown',
      timestamp: new Date().toISOString(),
      details: details ? JSON.stringify(details) : ''
    };

    // Store log entry
    await client.hSet(logId, logData);
    
    // Add to admin logs set for easy retrieval
    await client.sAdd('admin_logs', logId);

    res.json({ 
      success: true, 
      message: 'Admin action logged successfully',
      logId
    });
  } catch (error) {
    console.error('Error logging admin action:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to log admin action' 
    });
  }
}
