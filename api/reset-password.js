// Vercel serverless function for password reset
import { getRedisClient } from './redis.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  // Enable CORS
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, newPassword, action } = req.body || {};

    if (!action) {
      return res.status(400).json({ success: false, error: 'Action is required' });
    }

    // Get Redis client
    const redis = await getRedisClient();

    if (action === 'check') {
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
      }

      // Get all user keys
      const userKeys = await redis.keys('user:*');
      let foundUser = null;

      for (const key of userKeys) {
        if (key.includes(':goals') || key.includes(':context')) continue;
        
        const userData = await redis.get(key);
        if (!userData) continue;
        
        const user = typeof userData === 'string' ? JSON.parse(userData) : userData;
        
        if (user && user.email && user.email.toLowerCase() === email.toLowerCase()) {
          foundUser = { id: user.id, username: user.username };
          break;
        }
      }

      if (!foundUser) {
        return res.status(404).json({ success: false, error: 'No account found with that email' });
      }

      return res.json({ success: true, userId: foundUser.id, username: foundUser.username });
    }

    if (action === 'reset') {
      if (!email || !newPassword) {
        return res.status(400).json({ success: false, error: 'Email and new password are required' });
      }

      if (newPassword.length < 4) {
        return res.status(400).json({ success: false, error: 'Password must be at least 4 characters' });
      }

      // Get all user keys
      const userKeys = await redis.keys('user:*');
      let foundUser = null;
      let userKey = null;

      for (const key of userKeys) {
        if (key.includes(':goals') || key.includes(':context')) continue;
        
        const userData = await redis.get(key);
        if (!userData) continue;
        
        const user = typeof userData === 'string' ? JSON.parse(userData) : userData;
        
        if (user && user.email && user.email.toLowerCase() === email.toLowerCase()) {
          foundUser = user;
          userKey = key;
          break;
        }
      }

      if (!foundUser) {
        return res.status(404).json({ success: false, error: 'No account found with that email' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user with new password
      foundUser.password = hashedPassword;
      await redis.set(userKey, JSON.stringify(foundUser));

      return res.json({ success: true, message: 'Password reset successfully' });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });

  } catch (error) {
    console.error('Password reset error:', error.message);
    return res.status(500).json({ success: false, error: 'Server error: ' + error.message });
  }
}
