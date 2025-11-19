// Vercel serverless function for updating user's Alpha X project
import { updateUser } from './redis.js';

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

  // Check authentication
  const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
  if (!sessionCookie) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  let userId;
  try {
    const sessionValue = sessionCookie.split('=')[1];
    const decodedValue = decodeURIComponent(sessionValue);
    const sessionData = JSON.parse(decodedValue);
    userId = sessionData.userId;
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Invalid session' });
  }

  const { alphaXProject } = req.body;
  
  if (!alphaXProject) {
    return res.status(400).json({ 
      success: false, 
      error: 'Alpha X project description is required' 
    });
  }

  if (alphaXProject.length < 20) {
    return res.status(400).json({ 
      success: false, 
      error: 'Please provide more details about your Alpha X project (minimum 20 characters)' 
    });
  }

  try {
    // Update user's Alpha X project in Redis
    await updateUser(userId, { alphaXProject });
    
    res.json({ success: true, message: 'Alpha X project updated successfully' });
  } catch (error) {
    console.error('Error updating Alpha X project:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update Alpha X project. Please try again.' 
    });
  }
}
