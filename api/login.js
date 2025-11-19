// Vercel serverless function for user login
import { authenticateUser } from './redis.js';

export default async function handler(req, res) {
  console.log('=== LOGIN API CALLED ===');
  console.log('Method:', req.method);
  console.log('Origin:', req.headers.origin);
  console.log('User-Agent:', req.headers['user-agent']);
  
  // Enable CORS - Allow both production and development domains
  const allowedOrigins = [
    'https://alpha-x-goals.vercel.app',
    'https://alphaxgoals.vercel.app', 
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000'
  ];
  
  const origin = req.headers.origin;
  console.log('Request origin:', origin);
  
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

  const { username, password } = req.body;
  console.log('Login attempt:', { username: username ? '[PROVIDED]' : '[MISSING]', password: password ? '[PROVIDED]' : '[MISSING]' });
  console.log('Request body keys:', Object.keys(req.body || {}));
  
  if (!username || !password) {
    console.log('Missing credentials:', { username: !!username, password: !!password });
    return res.status(400).json({ 
      success: false, 
      error: 'Username and password are required' 
    });
  }

  try {
    console.log('Calling authenticateUser...');
    // Authenticate user against Redis database
    const user = await authenticateUser(username, password);
    console.log('authenticateUser result:', user ? 'USER_FOUND' : 'NO_USER');
    
    if (!user) {
      console.log('Authentication failed for username:', username);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }
    
    console.log('Authentication successful, setting cookie...');
    // Set session cookie
    res.setHeader('Set-Cookie', `session=${JSON.stringify({ userId: user.id, username: user.username })}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    
    console.log('Login successful for user:', user.username);
    res.json({ 
      success: true, 
      user: { id: user.id, username: user.username, email: user.email } 
    });
  } catch (error) {
    console.error('Login error details:', {
      message: error.message,
      stack: error.stack,
      username: username
    });
    res.status(500).json({ 
      success: false, 
      error: 'Login failed. Please try again.' 
    });
  }
}
