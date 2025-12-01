// Vercel serverless function for uploading Brain Lift content
import { saveBrainLiftEntry, getUserBrainLiftHistory } from './redis.js';

// Word count utility function
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  const cleanText = text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .trim();
  const words = cleanText.split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

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

  // Handle GET request - retrieve Brain Lift history
  if (req.method === 'GET') {
    try {
      const history = await getUserBrainLiftHistory(userId);
      res.json({ success: true, history });
    } catch (error) {
      console.error('Error fetching Brain Lift history:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve Brain Lift history' 
      });
    }
    return;
  }

  // Handle POST request - upload new Brain Lift word count
  if (req.method === 'POST') {
    const { wordCount, date } = req.body;
    
    if (!wordCount || typeof wordCount !== 'number' || wordCount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Brain Lift word count is required and must be a positive number' 
      });
    }

    try {

      // Save Brain Lift entry (only word count, not content)
      const entry = await saveBrainLiftEntry(userId, wordCount, date);
      
      console.log('Brain Lift word count saved:', {
        userId,
        entryId: entry.id,
        wordCount,
        date: entry.date
      });

      res.json({ 
        success: true, 
        entry: {
          id: entry.id,
          wordCount,
          date: entry.date,
          createdAt: entry.createdAt
        }
      });
    } catch (error) {
      console.error('Error saving Brain Lift entry:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to save Brain Lift word count' 
      });
    }
    return;
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}


