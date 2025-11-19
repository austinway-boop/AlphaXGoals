// Vercel serverless function for submitting goals with BrainLift word count tracking
import { createGoal } from './redis.js';
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

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Check authentication
  const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
  if (!sessionCookie) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  let userId;
  try {
    const sessionData = JSON.parse(sessionCookie.split('=')[1]);
    userId = sessionData.userId;
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Invalid session' });
  }

  const { goal, brainliftLink, alphaXProject, aiQuestions, aiAnswers, validationData } = req.body;
  
  if (!goal) {
    return res.status(400).json({ success: false, error: 'Goal is required' });
  }
  
  if (!brainliftLink) {
    return res.status(400).json({ success: false, error: 'BrainLift document link is required' });
  }
  
  if (!alphaXProject) {
    return res.status(400).json({ success: false, error: 'Alpha X project is required' });
  }
  
  // Validate BrainLift URL
  let url;
  try {
    url = new URL(brainliftLink);
  } catch (e) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid BrainLift link format' 
    });
  }
  
  try {
    console.log('Attempting to create goal for user:', userId);
    console.log('Goal data:', { goal, brainliftLink, alphaXProject });
    
    // Extract starting word count from BrainLift document
    console.log('Extracting starting word count from BrainLift:', brainliftLink);
    let startingWordCount = 0;
    let extractionMethod = 'unknown';
    let contentPreview = '';
    
    try {
      let documentContent = '';
      console.log('URL parsed:', { hostname: url.hostname, pathname: url.pathname });

      // Handle Google Docs
      if (url.hostname === 'docs.google.com' && brainliftLink.includes('/document/d/')) {
        console.log('Processing Google Doc for word count...');
        
        const docId = brainliftLink.match(/\/document\/d\/([a-zA-Z0-9-_]+)/)?.[1];
        if (!docId) {
          throw new Error('Could not extract Google Doc ID from link');
        }
        
        // Try the plain text export URL
        const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
        console.log('Trying plain text export:', exportUrl);
        
        try {
          const docResponse = await axios.get(exportUrl, { 
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; AlphaXGoals/1.0)'
            }
          });
          documentContent = docResponse.data;
          extractionMethod = 'google_docs_export';
          console.log('Successfully extracted Google Doc as plain text, length:', documentContent.length);
        } catch (exportError) {
          console.log('Export error:', exportError.response?.status, exportError.message);
          console.log('Plain text export failed, trying published version...');
          
          // Try multiple Google Docs public access methods
          const baseUrl = `https://docs.google.com/document/d/${docId}`;
          const publishUrls = [
            `${baseUrl}/pub`,
            `${baseUrl}/edit?usp=sharing`,
            brainliftLink.includes('/edit') ? brainliftLink : `${baseUrl}/edit`
          ];
          
          let htmlResponse = null;
          for (const testUrl of publishUrls) {
            try {
              htmlResponse = await axios.get(testUrl, { 
                timeout: 10000,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; AlphaXGoals/1.0)'
                }
              });
              console.log(`Successfully accessed Google Doc via: ${testUrl}`);
              break;
            } catch (urlError) {
              console.log(`Failed to access ${testUrl}:`, urlError.response?.status);
              continue;
            }
          }
          
          if (!htmlResponse) {
            throw new Error('Could not access Google Doc via any method');
          }
          
          // Simple regex-based HTML text extraction (no JSDOM needed)
          let htmlContent = htmlResponse.data;
          
          // Remove script and style tags
          htmlContent = htmlContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
          htmlContent = htmlContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
          htmlContent = htmlContent.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
          
          // Extract text content by removing all HTML tags
          documentContent = htmlContent.replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"');
          
          extractionMethod = 'google_docs_html';
          console.log('Successfully extracted Google Doc as HTML');
        }
      } 
      // Handle other document types
      else {
        console.log('Processing generic document for word count...');
        
        const response = await axios.get(brainliftLink, { 
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AlphaXGoals/1.0)'
          }
        });
        
        // Simple regex-based HTML text extraction (no JSDOM needed)
        let htmlContent = response.data;
        
        // Remove script and style tags
        htmlContent = htmlContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        htmlContent = htmlContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        htmlContent = htmlContent.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
        
        // Extract text content by removing all HTML tags
        documentContent = htmlContent.replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"');
        
        extractionMethod = 'html_scraping';
        console.log('Successfully extracted document as HTML');
      }

      // Clean and count words
      console.log('Document content extracted, length:', documentContent.length);
      console.log('First 100 chars:', documentContent.substring(0, 100));
      
      if (documentContent && documentContent.trim().length > 0) {
        const cleanText = documentContent
          .replace(/\s+/g, ' ') // Normalize whitespace
          .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
          .trim();
        
        const words = cleanText.split(/\s+/).filter(word => word.length > 0);
        startingWordCount = words.length;
        
        // Get a preview of the content (first 200 characters)
        contentPreview = documentContent.trim().substring(0, 200) + (documentContent.length > 200 ? '...' : '');
        
        console.log(`Extracted starting word count: ${startingWordCount} words using ${extractionMethod}`);
        
        if (startingWordCount === 0) {
          throw new Error('Document contains no readable words');
        }
      } else {
        console.error('Document content is empty or null');
        throw new Error('Document appears to be empty - no content could be extracted');
      }
      
    } catch (extractionError) {
      console.error('Error extracting word count:', extractionError);
      
      // If word count extraction fails, fail the goal submission
      console.error('Word count extraction failed, failing goal submission:', extractionError.message);
      
      return res.status(400).json({
        success: false,
        error: 'The BrainLift link provided does not work. Please use a publicly viewable link and try again.'
      });
    }
    
    // Save goal to Redis
    const goalData = {
      userId,
      goal,
      alphaXProject,
      status: 'active',
      createdAt: new Date().toISOString(),
      completedAt: null,
      // Store AI questions and answers if they exist
      aiQuestions: aiQuestions || null,
      aiAnswers: aiAnswers || null,
      // Store validation data from AI
      validationData: validationData || null,
      // Store BrainLift tracking data
      brainliftLink: brainliftLink,
      startingWordCount: startingWordCount,
      endingWordCount: null,
      wordCountExtractionMethod: extractionMethod,
      contentPreview: contentPreview,
      wordCountExtractedAt: new Date().toISOString()
    };
    
    const newGoal = await createGoal(goalData);
    console.log('Goal created successfully:', newGoal.id);
    
    res.json({ success: true, goal: newGoal });
  } catch (error) {
    console.error('Error creating goal:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create goal. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
