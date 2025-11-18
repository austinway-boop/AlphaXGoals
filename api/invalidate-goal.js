// Vercel serverless function for invalidating goals
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

  let adminEmail;
  try {
    const adminSession = JSON.parse(adminCookie.split('=')[1]);
    if (!adminSession.isAdmin) {
      return res.status(401).json({ success: false, error: 'Admin privileges required' });
    }
    adminEmail = adminSession.email;
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Invalid admin session' });
  }

  const { goalId, reason } = req.body;
  
  if (!goalId || !reason) {
    return res.status(400).json({ 
      success: false, 
      error: 'Goal ID and invalidation reason are required' 
    });
  }

  try {
    const client = await getRedisClient();
    
    // Check if goal exists
    const goal = await client.hGetAll(goalId);
    if (!goal || !goal.userId) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    // Update goal with invalidation details
    const invalidationData = {
      status: 'invalidated',
      invalidatedAt: new Date().toISOString(),
      invalidatedBy: adminEmail,
      invalidationReason: reason
    };

    // Update all fields
    for (const [key, value] of Object.entries(invalidationData)) {
      await client.hSet(goalId, key, value);
    }

    res.json({ 
      success: true, 
      message: 'Goal invalidated successfully',
      invalidationReason: reason
    });
  } catch (error) {
    console.error('Error invalidating goal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to invalidate goal' 
    });
  }
}
