// Vercel serverless function for extracting word count from BrainLift links
import axios from 'axios';
import { JSDOM } from 'jsdom';

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

  const { brainliftLink, isAdmin } = req.body;

  if (!isAdmin) {
    // Check user authentication
    const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
    if (!sessionCookie) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    try {
      const sessionData = JSON.parse(sessionCookie.split('=')[1]);
      // userId = sessionData.userId; // We have the user authenticated
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Invalid session' });
    }
  } else {
    // Check admin authentication
    const adminCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('admin_session='));
    if (!adminCookie) {
      return res.status(401).json({ success: false, error: 'Admin authentication required' });
    }

    try {
      const adminSession = JSON.parse(adminCookie.split('=')[1]);
      if (!adminSession.isAdmin) {
        return res.status(401).json({ success: false, error: 'Admin privileges required' });
      }
    } catch (e) {
      return res.status(401).json({ success: false, error: 'Invalid admin session' });
    }
  }

  if (!brainliftLink) {
    return res.status(400).json({ 
      success: false, 
      error: 'BrainLift link is required' 
    });
  }

  // Validate URL
  let url;
  try {
    url = new URL(brainliftLink);
  } catch (e) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid URL format' 
    });
  }

  try {
    console.log('Extracting word count from:', brainliftLink);

    let documentContent = '';
    let extractionMethod = 'unknown';

    // Handle Google Docs
    if (url.hostname === 'docs.google.com' && brainliftLink.includes('/document/d/')) {
      console.log('Processing Google Doc...');
      
      // Convert to plain text export format
      const docId = brainliftLink.match(/\/document\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      if (!docId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid Google Doc link - could not extract document ID' 
        });
      }
      
      // Try the plain text export URL
      const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
      
      try {
        const docResponse = await axios.get(exportUrl, { 
          timeout: 15000,
          headers: {
            'User-Agent': 'AlphaXGoals-WordCounter/1.0'
          }
        });
        documentContent = docResponse.data;
        extractionMethod = 'google_docs_export';
        console.log('Successfully extracted Google Doc as plain text');
      } catch (exportError) {
        console.log('Plain text export failed, trying HTML scraping...');
        
        // Fallback: Try to access the public HTML version
        const publicUrl = brainliftLink.includes('/edit') ? 
          brainliftLink.replace('/edit', '/pub') : 
          brainliftLink + (brainliftLink.includes('?') ? '&' : '?') + 'output=html';
        
        try {
          const htmlResponse = await axios.get(publicUrl, { 
            timeout: 15000,
            headers: {
              'User-Agent': 'AlphaXGoals-WordCounter/1.0'
            }
          });
          
          // Parse HTML and extract text
          const dom = new JSDOM(htmlResponse.data);
          const document = dom.window.document;
          
          // Remove script and style elements
          document.querySelectorAll('script, style, noscript').forEach(el => el.remove());
          
          // Get text content
          documentContent = document.body?.textContent || document.textContent || '';
          extractionMethod = 'google_docs_html';
          console.log('Successfully extracted Google Doc as HTML');
        } catch (htmlError) {
          console.error('Both Google Doc extraction methods failed:', exportError, htmlError);
          return res.status(400).json({
            success: false,
            error: 'Could not access Google Doc. Please ensure the document is set to "Anyone with the link can view" and try again.'
          });
        }
      }
    } 
    // Handle other document types (generic HTML scraping)
    else {
      console.log('Processing generic document...');
      
      try {
        const response = await axios.get(brainliftLink, { 
          timeout: 15000,
          headers: {
            'User-Agent': 'AlphaXGoals-WordCounter/1.0'
          }
        });
        
        // Parse HTML and extract text
        const dom = new JSDOM(response.data);
        const document = dom.window.document;
        
        // Remove script and style elements
        document.querySelectorAll('script, style, noscript').forEach(el => el.remove());
        
        // Get text content
        documentContent = document.body?.textContent || document.textContent || '';
        extractionMethod = 'html_scraping';
        console.log('Successfully extracted document as HTML');
      } catch (genericError) {
        console.error('Generic document extraction failed:', genericError);
        return res.status(400).json({
          success: false,
          error: 'Could not access the document. Please ensure the link is publicly viewable and try again.'
        });
      }
    }

    // Clean and count words
    if (!documentContent || documentContent.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Document appears to be empty or content could not be extracted'
      });
    }

    // Clean the text and count words
    const cleanText = documentContent
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .trim();
    
    const words = cleanText.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    
    // Get a preview of the content (first 200 characters)
    const contentPreview = documentContent.trim().substring(0, 200) + (documentContent.length > 200 ? '...' : '');
    
    console.log(`Word count extraction successful: ${wordCount} words from ${extractionMethod}`);
    
    res.json({
      success: true,
      wordCount: wordCount,
      extractionMethod: extractionMethod,
      contentPreview: contentPreview,
      extractedAt: new Date().toISOString(),
      documentUrl: brainliftLink
    });

  } catch (error) {
    console.error('Error extracting word count:', error);
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(400).json({
        success: false,
        error: 'Could not reach the document URL. Please check the link and try again.'
      });
    }
    
    if (error.code === 'ETIMEDOUT') {
      return res.status(504).json({
        success: false,
        error: 'Document loading timed out. Please try again or check if the document is accessible.'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to extract word count from document',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
