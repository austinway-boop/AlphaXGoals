// Emergency endpoint to create a test user for debugging
import { createUser, findUser } from './redis.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
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

  try {
    console.log('=== CREATE TEST USER ===');
    
    // Create a test user with known credentials
    const testUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpassword123',
      createdAt: new Date().toISOString(),
      alphaXProject: 'Test Alpha X Project for debugging'
    };
    
    console.log('Checking if test user already exists...');
    const existingUser = await findUser(testUserData.username, testUserData.email);
    
    if (existingUser) {
      console.log('Test user already exists');
      return res.json({
        success: true,
        message: 'Test user already exists',
        testCredentials: {
          username: testUserData.username,
          password: testUserData.password,
          email: testUserData.email
        }
      });
    }
    
    console.log('Creating new test user...');
    const newUser = await createUser(testUserData);
    console.log('Test user created successfully:', newUser.id);
    
    res.json({
      success: true,
      message: 'Test user created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      },
      testCredentials: {
        username: testUserData.username,
        password: testUserData.password,
        email: testUserData.email
      }
    });
    
  } catch (error) {
    console.error('Create test user error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
}
