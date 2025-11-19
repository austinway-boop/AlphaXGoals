// Vercel serverless function for user registration
import { createUser, findUser } from './redis.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', 'https://alpha-x-goals.vercel.app');
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

  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Username, email, and password are required' 
    });
  }

  try {
    // Check if user already exists
    const existingUser = await findUser(username, email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User already exists with this email or username' 
      });
    }
    
    // Create new user in Redis (password will be hashed automatically)
    const newUser = await createUser({
      username,
      email,
      password,
      createdAt: new Date().toISOString()
    });
    
    // Set session cookie
    res.setHeader('Set-Cookie', `session=${JSON.stringify({ userId: newUser.id, username: newUser.username })}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    
    res.json({
      success: true,
      user: { id: newUser.id, username: newUser.username, email: newUser.email } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Registration failed. Please try again.' 
    });
  }
}
