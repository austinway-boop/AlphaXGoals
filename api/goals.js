// Vercel serverless function for getting user goals
import { getUserGoals } from './redis.js';

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

  if (req.method !== 'GET') {
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

  try {
    console.log('Fetching goals for user:', userId);
    // Fetch user goals from Redis
    const userGoals = await getUserGoals(userId);
    console.log('Successfully fetched goals:', userGoals.length);
    res.json({ success: true, goals: userGoals || [] });
  } catch (error) {
    console.error('Error fetching goals for user', userId, ':', error);
    console.error('Error stack:', error.stack);
    
    // Return empty array instead of error if it's just no data
    if (error.message && error.message.includes('Redis')) {
      res.status(500).json({ 
        success: false, 
        error: 'Database connection error. Please check your Redis configuration.' 
      });
    } else {
      // For other errors, return empty goals array
      res.json({ 
        success: true, 
        goals: [],
        message: 'No goals found or error retrieving goals'
      });
    }
  }
}
