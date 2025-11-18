// Vercel serverless function for checking database status
import { testConnection } from './redis.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
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

  try {
    // Test database connection
    const dbStatus = await testConnection();
    
    res.json({ 
      success: true, 
      database: {
        connected: dbStatus.connected,
        message: dbStatus.message,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Database status check failed:', error);
    res.status(500).json({ 
      success: false, 
      database: {
        connected: false,
        message: 'Database connection failed',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
}
