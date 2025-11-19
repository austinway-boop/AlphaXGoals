// Vercel serverless function for completing goals with BrainLift word count extraction
import { updateGoal, getGoalById } from './redis.js';
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

  const { goalId, screenshotDataArray, textProof } = req.body;
  
  if (!goalId) {
    return res.status(400).json({ success: false, error: 'Goal ID is required' });
  }
  
  // Require both screenshots and text proof
  if (!screenshotDataArray || !Array.isArray(screenshotDataArray) || screenshotDataArray.length === 0) {
    return res.status(400).json({ success: false, error: 'Screenshots are required to complete a goal' });
  }
  
  if (!textProof || textProof.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Text description is required to complete a goal' });
  }

  try {
    // Check if it's after midnight CST - prevent goal completion
    const now = new Date();
    const cstNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    
    // Get the goal to check its creation date
    const goal = await getGoalById(goalId);
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }
    
    // Check if the goal belongs to the user
    if (goal.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Check if goal was created today (CST)
    const goalCreatedDate = new Date(goal.createdAt);
    const goalCreatedCST = new Date(goalCreatedDate.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    
    // Get CST midnight for today
    const cstMidnight = new Date(cstNow);
    cstMidnight.setHours(0, 0, 0, 0);
    
    // Check if the goal was created today and if it's still the same day in CST
    const goalCreatedTodayCST = goalCreatedCST.toDateString() === cstNow.toDateString();
    
    if (!goalCreatedTodayCST) {
      return res.status(400).json({ 
        success: false, 
        error: 'Goals can only be completed on the same day they were created (CST timezone)' 
      });
    }
    
    // Check if it's after midnight CST for goals created today
    if (cstNow.getHours() >= 0 && cstNow < cstMidnight.setDate(cstMidnight.getDate() + 1)) {
      // It's still the same day, allow completion
    } else if (goalCreatedTodayCST && cstNow.getHours() >= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Goals cannot be completed after midnight CST. You can complete goals until 11:59 PM CST on the day they were created.' 
      });
    }

    // Extract ending word count from BrainLift if goal has a BrainLift link
    let endingWordCount = null;
    let endingExtractionMethod = 'none';
    
    if (goal.brainliftLink) {
      console.log('Extracting ending word count from BrainLift...');
      
      try {
        let documentContent = '';
        const url = new URL(goal.brainliftLink);

        // Handle Google Docs
        if (url.hostname === 'docs.google.com' && goal.brainliftLink.includes('/document/d/')) {
          console.log('Processing Google Doc for ending word count...');
          
          const docId = goal.brainliftLink.match(/\/document\/d\/([a-zA-Z0-9-_]+)/)?.[1];
          if (docId) {
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
              endingExtractionMethod = 'google_docs_export';
              console.log('Successfully extracted Google Doc as plain text');
            } catch (exportError) {
              console.log('Plain text export failed, trying HTML scraping...');
              
              // Fallback: Try to access the public HTML version
              const publicUrl = goal.brainliftLink.includes('/edit') ? 
                goal.brainliftLink.replace('/edit', '/pub') : 
                goal.brainliftLink + (goal.brainliftLink.includes('?') ? '&' : '?') + 'output=html';
              
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
              endingExtractionMethod = 'google_docs_html';
              console.log('Successfully extracted Google Doc as HTML');
            }
          }
        } 
        // Handle other document types
        else {
          console.log('Processing generic document for ending word count...');
          
          const response = await axios.get(goal.brainliftLink, { 
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
          endingExtractionMethod = 'html_scraping';
          console.log('Successfully extracted document as HTML');
        }

        // Clean and count words
        if (documentContent && documentContent.trim().length > 0) {
          const cleanText = documentContent
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
            .trim();
          
          const words = cleanText.split(/\s+/).filter(word => word.length > 0);
          endingWordCount = words.length;
          
          console.log(`Extracted ending word count: ${endingWordCount} words using ${endingExtractionMethod}`);
        } else {
          console.warn('Document appears to be empty at completion');
          endingWordCount = 0;
        }
        
      } catch (extractionError) {
        console.error('Error extracting ending word count:', extractionError);
        // Don't fail goal completion if word count extraction fails
        endingWordCount = null;
        endingExtractionMethod = 'extraction_failed';
      }
    }

    // Update goal status to completed with proof
    const updateData = {
      status: 'completed',
      completedAt: new Date().toISOString(),
      screenshotDataArray: JSON.stringify(screenshotDataArray),
      textProof: textProof.trim(),
      hasScreenshots: true,
      hasTextProof: true,
      screenshotCount: screenshotDataArray.length,
      // Add ending word count data
      endingWordCount: endingWordCount,
      endingExtractionMethod: endingExtractionMethod,
      endingWordCountExtractedAt: endingWordCount !== null ? new Date().toISOString() : null
    };
    
    const updatedGoal = await updateGoal(goalId, updateData);
    
    res.json({ success: true, goal: updatedGoal });
  } catch (error) {
    console.error('Error completing goal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to complete goal. Please try again.' 
    });
  }
}
