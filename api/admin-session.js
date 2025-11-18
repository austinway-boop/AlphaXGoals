// Vercel serverless function for checking admin session
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

  // Check admin session
  const adminSessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('admin_session='));
  
  if (!adminSessionCookie) {
    return res.status(401).json({ success: false, error: 'No admin session found' });
  }

  try {
    const sessionData = JSON.parse(adminSessionCookie.split('=')[1]);
    
    if (sessionData.isAdmin) {
      res.json({ 
        success: true, 
        admin: { 
          email: sessionData.email,
          isAdmin: true,
          loginTime: sessionData.loginTime
        } 
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid admin session' });
    }
  } catch (e) {
    res.status(401).json({ success: false, error: 'Invalid admin session data' });
  }
}
