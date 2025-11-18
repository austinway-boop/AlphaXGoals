// Simple test endpoint to verify Claude API connectivity
import axios from 'axios';

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
    console.log('=== CLAUDE API TEST ===');
    
    // Use the provided API key as fallback
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    
    console.log('Environment check:', {
      CLAUDE_API_KEY: !!process.env.CLAUDE_API_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      finalKey: !!CLAUDE_API_KEY,
      keyLength: CLAUDE_API_KEY ? CLAUDE_API_KEY.length : 0,
      keyPrefix: CLAUDE_API_KEY ? CLAUDE_API_KEY.substring(0, 10) + '...' : 'none'
    });
    
    if (!CLAUDE_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'No Claude API key found in environment variables',
        details: 'Check CLAUDE_API_KEY or ANTHROPIC_API_KEY'
      });
    }

    // Simple test message to Claude
    const testPayload = {
      model: 'claude-sonnet-4-5',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: 'Hello, please respond with just "API test successful"'
        }
      ]
    };

    console.log('Sending test request to Claude API...');
    console.log('Request URL:', 'https://api.anthropic.com/v1/messages');
    console.log('Model:', testPayload.model);
    
    // Try the current API structure first
    let response;
    try {
      console.log('Trying v1/messages endpoint...');
      response = await axios.post('https://api.anthropic.com/v1/messages', testPayload, {
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 second timeout
      });
    } catch (messagesError) {
      console.log('v1/messages failed, trying v1/complete endpoint...', messagesError.response?.status);
      
      // Try the older complete endpoint structure
      const completePayload = {
        model: 'claude-sonnet-4-5',
        prompt: '\n\nHuman: Hello, please respond with just "API test successful"\n\nAssistant:',
        max_tokens_to_sample: 50
      };
      
      response = await axios.post('https://api.anthropic.com/v1/complete', completePayload, {
        headers: {
          'Authorization': `Bearer ${CLAUDE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
    }

    console.log('Claude API Response Status:', response.status);
    console.log('Claude API Response Data:', response.data);

    // Handle different response formats
    let responseText;
    if (response.data.content && response.data.content[0] && response.data.content[0].text) {
      // v1/messages format
      responseText = response.data.content[0].text;
    } else if (response.data.completion) {
      // v1/complete format
      responseText = response.data.completion;
    } else {
      responseText = JSON.stringify(response.data);
    }
    
    res.json({ 
      success: true, 
      message: 'Claude API is working!',
      claudeResponse: responseText,
      responseStatus: response.status,
      model: testPayload.model
    });

  } catch (error) {
    console.error('Claude API Test Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code,
      stack: error.stack
    });

    let errorMessage = 'Claude API test failed';
    let details = error.message;

    if (error.response?.status === 401) {
      errorMessage = 'Claude API authentication failed';
      details = 'Invalid API key or unauthorized access';
    } else if (error.response?.status === 429) {
      errorMessage = 'Claude API rate limit exceeded';
      details = 'Too many requests, try again later';
    } else if (error.response?.status === 400) {
      errorMessage = 'Bad request to Claude API';
      details = error.response?.data?.error?.message || 'Invalid request format';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Cannot reach Claude API servers';
      details = 'DNS resolution failed or network connectivity issue';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Claude API request timed out';
      details = 'Request took longer than 15 seconds';
    }

    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: details,
      httpStatus: error.response?.status,
      errorCode: error.code
    });
  }
}
