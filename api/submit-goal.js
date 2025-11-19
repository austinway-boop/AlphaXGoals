// Vercel serverless function for submitting goals with BrainLift word count tracking
import { createGoal } from './redis.js';
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
    console.log('Extracting starting word count from BrainLift...');
    let startingWordCount = 0;
    let extractionMethod = 'unknown';
    let contentPreview = '';
    
    try {
      let documentContent = '';

      // Handle Google Docs
      if (url.hostname === 'docs.google.com' && brainliftLink.includes('/document/d/')) {
        console.log('Processing Google Doc for word count...');
        
        const docId = brainliftLink.match(/\/document\/d\/([a-zA-Z0-9-_]+)/)?.[1];
        if (!docId) {
          throw new Error('Could not extract Google Doc ID from link');
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
        }
      } 
      // Handle other document types
      else {
        console.log('Processing generic document for word count...');
        
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
      }

      // Clean and count words
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
      } else {
        // Empty document should also fail
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
