// Vercel serverless function for updating user house assignments
import { updateUser } from './redis.js';

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

  try {
    const adminSession = JSON.parse(adminCookie.split('=')[1]);
    if (!adminSession.isAdmin) {
      return res.status(401).json({ success: false, error: 'Admin privileges required' });
    }
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Invalid admin session' });
  }

  const { userId, house } = req.body;
  
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  const validHouses = ['sparta', 'athens', 'corinth', 'olympia', 'delfi', ''];
  if (house && !validHouses.includes(house)) {
    return res.status(400).json({ success: false, error: 'Invalid house selection' });
  }

  try {
    await updateUser(userId, { house: house || null });
    
    res.json({ 
      success: true, 
      message: `User house updated to ${house || 'no house'}` 
    });
  } catch (error) {
    console.error('Error updating user house:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update user house' 
    });
  }
}
