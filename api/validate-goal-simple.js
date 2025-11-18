// Minimal validate-goal endpoint to test what's causing 500 errors
export default async function handler(req, res) {
  console.log('=== SIMPLE VALIDATE GOAL CALLED ===');
  
  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
      console.log('OPTIONS request');
      res.status(200).end();
      return;
    }

    if (req.method !== 'POST') {
      console.log('Non-POST request');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    console.log('Method check passed');

    // Simple response without any external calls
    const validation = {
      isValid: true,
      hasQuestions: false,
      questions: [],
      difficulty: "reasonable",
      measurable: true,
      feedback: "This is a test response - goal validation is working!",
      estimatedHours: 2,
      suggestions: []
    };

    console.log('About to send response');
    res.json({ success: true, validation });
    console.log('Response sent successfully');

  } catch (error) {
    console.error('Error in simple validate:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Simple validation failed',
      details: error.message
    });
  }
}
