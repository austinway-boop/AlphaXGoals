// Vercel serverless function for password reset
import { findUser, updateUser, getRedisClient } from './redis.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  console.log('=== RESET PASSWORD API CALLED ===');
  console.log('Method:', req.method);
  
  // Enable CORS
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', true);
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

  const { email, newPassword, action } = req.body;
  console.log('Reset password request:', { email: email ? '[PROVIDED]' : '[MISSING]', action });

  if (!action) {
    return res.status(400).json({ success: false, error: 'Action is required' });
  }

  try {
    if (action === 'check') {
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
      }

      // Use findUser to check if email exists
      const user = await findUser(null, email);
      
      if (!user) {
        return res.status(404).json({ success: false, error: 'No account found with that email' });
      }

      console.log('Found user for email:', user.username);
      return res.json({ success: true, userId: user.id, username: user.username });
    }

    if (action === 'reset') {
      if (!email || !newPassword) {
        return res.status(400).json({ success: false, error: 'Email and new password are required' });
      }

      if (newPassword.length < 4) {
        return res.status(400).json({ success: false, error: 'Password must be at least 4 characters' });
      }

      // Find user by email
      const user = await findUser(null, email);
      
      if (!user) {
        return res.status(404).json({ success: false, error: 'No account found with that email' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user with new password
      await updateUser(user.id, { password: hashedPassword });

      console.log('Password reset successful for:', user.username);
      return res.json({ success: true, message: 'Password reset successfully' });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });

  } catch (error) {
    console.error('Password reset error:', error.message);
    return res.status(500).json({ success: false, error: 'Server error: ' + error.message });
  }
}
