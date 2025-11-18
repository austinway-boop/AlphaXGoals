// Vercel serverless function for admin authentication
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

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ success: false, error: 'Password is required' });
  }

  // Check admin password
  const ADMIN_PASSWORD = 'FutureOfEducation';
  
  if (password === ADMIN_PASSWORD) {
    // Create admin session
    const adminSession = {
      isAdmin: true,
      email: 'Admin@alpha.school',
      loginTime: new Date().toISOString()
    };
    
    // Set session cookie
    const sessionCookie = `admin_session=${JSON.stringify(adminSession)}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`;
    res.setHeader('Set-Cookie', sessionCookie);
    
    res.json({ 
      success: true, 
      admin: { 
        email: 'Admin@alpha.school',
        isAdmin: true
      } 
    });
  } else {
    res.status(401).json({ success: false, error: 'Invalid admin password' });
  }
}
