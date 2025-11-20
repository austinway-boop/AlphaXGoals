// Vercel serverless function for user registration
import { createUser, findUser } from './redis.js';

export default async function handler(req, res) {
  console.log('=== REGISTER API CALLED ===');
  console.log('Method:', req.method);
  console.log('Origin:', req.headers.origin);
  
  // Enable CORS - Allow both production and development domains
  const allowedOrigins = [
    'https://alpha-x-goals.vercel.app',
    'https://alphaxgoals.vercel.app', 
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000'
  ];
  
  const origin = req.headers.origin;
  console.log('Register request origin:', origin);
  
  // Temporarily allow all origins to fix CORS issues
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

  const { username, email, password } = req.body;
  console.log('Registration attempt:', { 
    username: username ? '[PROVIDED]' : '[MISSING]',
    email: email ? '[PROVIDED]' : '[MISSING]',
    password: password ? '[PROVIDED]' : '[MISSING]' 
  });
  
  if (!username || !email || !password) {
    console.log('Missing registration fields:', { username: !!username, email: !!email, password: !!password });
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
      user: { 
        id: newUser.id, 
        username: newUser.username, 
        email: newUser.email,
        alphaXProject: newUser.alphaXProject || ''
      } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Registration failed. Please try again.' 
    });
  }
}
