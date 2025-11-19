// Vercel serverless function for updating user preferences
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

  const { lastBrainliftLink, alphaXProject } = req.body;
  
  if (!lastBrainliftLink && !alphaXProject) {
    return res.status(400).json({ 
      success: false, 
      error: 'At least one preference field is required' 
    });
  }

  try {
    const updateData = {};
    
    if (lastBrainliftLink) {
      // Validate BrainLift link
      try {
        new URL(lastBrainliftLink);
        updateData.lastBrainliftLink = lastBrainliftLink;
      } catch (e) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid BrainLift URL' 
        });
      }
    }
    
    if (alphaXProject) {
      updateData.alphaXProject = alphaXProject;
    }

    // Update user preferences in Redis
    await updateUser(userId, updateData);
    
    res.json({ success: true, message: 'User preferences updated successfully' });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update user preferences. Please try again.' 
    });
  }
}
