// Vercel serverless function for admin AI prompt management
import { getSystemPrompts, updateSystemPrompt } from './redis.js';

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

  // Check admin authentication
  const adminSessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('admin_session='));
  if (!adminSessionCookie) {
    return res.status(401).json({ success: false, error: 'Admin authentication required' });
  }

  let adminSession;
  try {
    adminSession = JSON.parse(adminSessionCookie.split('=')[1]);
    if (!adminSession.isAdmin) {
      return res.status(401).json({ success: false, error: 'Admin privileges required' });
    }
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Invalid admin session' });
  }

  if (req.method === 'GET') {
    // Get current system prompts
    try {
      const prompts = await getSystemPrompts();
      res.json({ success: true, prompts });
    } catch (error) {
      console.error('Error fetching system prompts:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch system prompts' });
    }
  } else if (req.method === 'POST') {
    // Update system prompt
    const { promptType, content } = req.body;
    
    if (!promptType || !content) {
      return res.status(400).json({ success: false, error: 'Prompt type and content are required' });
    }
    
    try {
      await updateSystemPrompt(promptType, content, adminSession.email);
      res.json({ success: true, message: 'System prompt updated successfully' });
    } catch (error) {
      console.error('Error updating system prompt:', error);
      res.status(500).json({ success: false, error: 'Failed to update system prompt' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
