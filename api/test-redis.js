// Simple Redis connection test
import { getRedisClient } from './redis.js';

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

  try {
    console.log('Testing Redis connection...');
    const client = await getRedisClient();
    
    // Test basic operations
    await client.set('test_key', 'test_value');
    const testValue = await client.get('test_key');
    await client.del('test_key');
    
    console.log('Redis test successful');
    res.json({ 
      success: true, 
      message: 'Redis connection successful',
      testResult: testValue === 'test_value' ? 'PASS' : 'FAIL',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Redis test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: `Redis connection failed: ${error.message}`,
      details: {
        redisUrl: process.env.REDIS_URL ? 'SET' : 'NOT_SET',
        afterschoolRedisUrl: process.env.Afterschool_REDIS_URL ? 'SET' : 'NOT_SET',
        errorType: error.constructor.name,
        timestamp: new Date().toISOString()
      }
    });
  }
}
