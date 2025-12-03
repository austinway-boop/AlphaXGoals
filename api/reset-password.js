// Vercel serverless function for password reset (simple, not secure)
import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, newPassword, action } = req.body;

  try {
    if (action === 'check') {
      // Check if email exists
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
      }

      // Get all users and find by email
      const userKeys = await kv.keys('user:*');
      let foundUser = null;

      for (const key of userKeys) {
        if (key.includes(':goals') || key.includes(':context')) continue;
        const user = await kv.get(key);
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
      // Reset the password
      if (!email || !newPassword) {
        return res.status(400).json({ success: false, error: 'Email and new password are required' });
      }

      if (newPassword.length < 4) {
        return res.status(400).json({ success: false, error: 'Password must be at least 4 characters' });
      }

      // Find user by email
      const userKeys = await kv.keys('user:*');
      let foundUser = null;
      let userKey = null;

      for (const key of userKeys) {
        if (key.includes(':goals') || key.includes(':context')) continue;
        const user = await kv.get(key);
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
      await kv.set(userKey, foundUser);

      return res.json({ success: true, message: 'Password reset successfully' });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });

  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
}

