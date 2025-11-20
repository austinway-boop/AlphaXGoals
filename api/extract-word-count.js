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

    // Handle WorkFlowy documents with enhanced scraping
    if (url.hostname === 'workflowy.com' || url.hostname === 'www.workflowy.com') {
      console.log('Processing WorkFlowy document with enhanced scraping...');
      
      // Priority 1: Enhanced shared link scraping (no API key needed)
      try {
        console.log('🌐 Attempting enhanced shared link scraping...');
        const workflowyResult = await enhancedWorkFlowyExtraction(brainliftLink);
        
        if (workflowyResult && workflowyResult.content && workflowyResult.content.length > 100) {
          documentContent = workflowyResult.content;
          extractionMethod = 'enhanced_workflowy_scraping';
          console.log('✅ Enhanced WorkFlowy scraping successful, length:', documentContent.length);
        }
      } catch (enhancedError) {
        console.log('❌ Enhanced scraping failed, falling back to legacy methods:', enhancedError.message);
      }
      
      // Priority 2: API approach (if enhanced scraping didn't work)
      if (!documentContent || documentContent.length < 100) {
        const WF_API_KEY = process.env.WF_API_KEY || "c82f6e853144eb680f6470c44f2afaa17a843590";
        
        if (WF_API_KEY) {
          console.log('⚡ Attempting WorkFlowy API extraction...');
          
          try {
            // Use proper WorkFlowy API workflow: Get main nodes → Fetch complete content
            const properApiResult = await properWorkFlowyAPIExtraction(brainliftLink);
            
            if (properApiResult && properApiResult.success && properApiResult.content.length > 0) {
              documentContent = properApiResult.content;
              extractionMethod = 'workflowy_proper_api';
              console.log('✅ WorkFlowy Proper API extraction successful, length:', documentContent.length);
            }
            
          } catch (apiError) {
            console.log('❌ WorkFlowy API v1 failed:', apiError.response?.status || apiError.message);
            
            if (apiError.response?.status === 401) {
              console.log('Invalid API key, falling back to shared link extraction...');
            } else if (apiError.response?.status === 429) {
              console.log('Rate limited, falling back to shared link extraction...');
            }
            // Continue to fallback methods below
          }
        }
      }
      
      // Fallback to shared link extraction methods if API failed or no key
      
      // If API extraction didn't work, fall back to shared link methods
      if (!documentContent || documentContent.length < 10) {
        console.log('Falling back to shared link extraction methods...');
        
        // Method 1: Try shared link HTML scraping (no auth required)
        try {
        const response = await axios.get(brainliftLink, { 
          timeout: 15000,
          headers: {
            'User-Agent': 'AlphaXGoals-WordCounter/1.0'
          }
        });
        
        const htmlContent = response.data;
        console.log('WorkFlowy HTML received, length:', htmlContent.length);
        
        // Extract share_id for potential API calls
        const shareIdMatch = htmlContent.match(/PROJECT_TREE_DATA_URL_PARAMS\s*=\s*{\s*"share_id"\s*:\s*"([^"]+)"/);
        const shareId = shareIdMatch ? shareIdMatch[1] : null;
        console.log('Share ID found:', shareId);
        
        // Try WorkFlowy API endpoints if we have a share_id
        if (shareId) {
          const apiEndpoints = [
            `https://workflowy.com/get_initialization_data?share_id=${shareId}`,
            `https://workflowy.com/get_project_tree?share_id=${shareId}`,
            `https://workflowy.com/api/outline?share_id=${shareId}`
          ];
          
          for (const apiUrl of apiEndpoints) {
            try {
              console.log('Trying WorkFlowy API:', apiUrl);
              const apiResponse = await axios.get(apiUrl, {
                timeout: 10000,
                headers: {
                  'User-Agent': 'AlphaXGoals-WordCounter/1.0',
                  'Accept': 'application/json, text/plain, */*',
                  'Referer': brainliftLink
                }
              });
              
              if (apiResponse.data) {
                console.log('WorkFlowy API success:', typeof apiResponse.data);
                const extractedText = extractTextFromWorkFlowyData(apiResponse.data);
                
                if (extractedText && extractedText.length > 10) {
                  console.log('Text extracted from WorkFlowy API, length:', extractedText.length);
                  documentContent = extractedText;
                  extractionMethod = `workflowy_api`;
                  break; // Success, use this data
                }
              }
            } catch (apiError) {
              console.log('WorkFlowy API failed:', apiUrl, apiError.response?.status || apiError.message);
            }
          }
        }
        
        // If API extraction didn't work, try HTML scraping methods
        if (!documentContent || documentContent.length < 10) {
          console.log('Falling back to HTML extraction methods...');
          
          // Method A: JSDOM approach
          const dom = new JSDOM(htmlContent);
          const doc = dom.window.document;
          
          // Remove scripts and styles
          doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());
          
          let text = doc.body.textContent || "";
          text = text.replace(/\s+/g, " ").trim();
          
          if (text && text.length > 50) { // Require substantial content
            documentContent = text;
            extractionMethod = 'workflowy_jsdom';
            console.log('JSDOM extraction successful, length:', text.length);
          } else {
            // Method B: Pattern-based extraction from HTML
            console.log('JSDOM failed, trying pattern extraction...');
            
            const patterns = [
              /"name"\s*:\s*"([^"]+)"/g,
              /"content"\s*:\s*"([^"]+)"/g,
              /"nm"\s*:\s*"([^"]+)"/g,
              /"ct"\s*:\s*"([^"]+)"/g,
              /"note"\s*:\s*"([^"]+)"/g,
              /"no"\s*:\s*"([^"]+)"/g
            ];
            
            let extractedTexts = [];
            for (const pattern of patterns) {
              let match;
              while ((match = pattern.exec(htmlContent)) !== null) {
                if (match[1] && match[1].trim().length > 0) {
                  extractedTexts.push(match[1].trim());
                }
              }
            }
            
            if (extractedTexts.length > 0) {
              documentContent = extractedTexts.join(' ');
              extractionMethod = 'workflowy_patterns';
              console.log('Pattern extraction found:', extractedTexts.length, 'text pieces');
            }
          }
        }
        
      } catch (workflowyError) {
        console.error('WorkFlowy extraction failed:', workflowyError);
        return res.status(400).json({
          success: false,
          error: 'Could not access WorkFlowy document. Please ensure the link is shared publicly (Anyone with link can view) and try again.'
        });
      }
      } // End of fallback condition
    } 
    // Handle Google Docs with enhanced extraction
    else if (url.hostname === 'docs.google.com' && brainliftLink.includes('/document/d/')) {
      console.log('Processing Google Doc with enhanced extraction...');
      
      try {
        const googleDocsResult = await enhancedGoogleDocsExtraction(brainliftLink);
        
        if (googleDocsResult && googleDocsResult.content && googleDocsResult.content.length > 10) {
          documentContent = googleDocsResult.content;
          extractionMethod = googleDocsResult.method || 'enhanced_google_docs';
          console.log('✅ Enhanced Google Docs extraction successful, length:', documentContent.length);
        }
      } catch (googleError) {
        console.error('Enhanced Google Docs extraction failed:', googleError.message);
        return res.status(400).json({
          success: false,
          error: 'Could not access Google Doc using enhanced methods. Please ensure the document is set to "Anyone with the link can view" and try again.',
          details: googleError.message
        });
      }
    } 
    // Handle other document types with enhanced generic scraping
    else {
      console.log('Processing generic document with enhanced scraping...');
      
      try {
        const genericResult = await enhancedGenericExtraction(brainliftLink);
        
        if (genericResult && genericResult.content && genericResult.content.length > 10) {
          documentContent = genericResult.content;
          extractionMethod = genericResult.method || 'enhanced_generic';
          console.log('✅ Enhanced generic extraction successful, length:', documentContent.length);
        }
      } catch (genericError) {
        console.error('Enhanced generic document extraction failed:', genericError);
        return res.status(400).json({
          success: false,
          error: 'Could not access the document using enhanced methods. Please ensure the link is publicly viewable and try again.',
          details: genericError.message
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

    // Clean and count words using Unicode-aware approach
    const cleanText = documentContent.replace(/\s+/g, ' ').trim();
    
    // Use Unicode word boundary matching (supports international characters)
    // \p{L} = letters, \p{N} = numbers, keep ' and - inside words
    const matches = cleanText.match(/\b[\p{L}\p{N}'-]+\b/gu);
    const words = matches || [];
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

// Enhanced WorkFlowy extraction function using improved scraping techniques
async function enhancedWorkFlowyExtraction(url) {
  console.log('🚀 Enhanced WorkFlowy extraction starting...');
  let debugInfo = 'Enhanced WorkFlowy Extraction Log:\n';
  
  try {
    // Step 1: Fetch page content with retry mechanism
    let htmlContent = '';
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        debugInfo += `Attempt ${attempt}: Fetching page content...\n`;
        
        const response = await axios.get(url, {
          timeout: 20000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none'
          }
        });
        
        htmlContent = response.data;
        debugInfo += `Success: Received ${htmlContent.length} characters\n`;
        break;
        
      } catch (fetchError) {
        debugInfo += `Attempt ${attempt} failed: ${fetchError.message}\n`;
        if (attempt === maxRetries) throw fetchError;
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
    
    // Step 2: Extract share_id and try API endpoints
    const shareIdMatch = htmlContent.match(/PROJECT_TREE_DATA_URL_PARAMS\s*=\s*{\s*"share_id"\s*:\s*"([^"]+)"/);
    const shareId = shareIdMatch ? shareIdMatch[1] : null;
    
    if (shareId) {
      debugInfo += `Found share_id: ${shareId}\n`;
      
      const apiEndpoints = [
        `https://workflowy.com/get_initialization_data?share_id=${shareId}`,
        `https://workflowy.com/get_project_tree?share_id=${shareId}`,
        `https://workflowy.com/api/outline?share_id=${shareId}`
      ];
      
      for (const apiUrl of apiEndpoints) {
        try {
          debugInfo += `Trying API: ${apiUrl}\n`;
          
          const apiResponse = await axios.get(apiUrl, {
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Accept': 'application/json, text/plain, */*',
              'Referer': url,
              'Origin': 'https://workflowy.com'
            }
          });
          
          if (apiResponse.data) {
            const extractedText = extractTextFromWorkFlowyData(apiResponse.data);
            if (extractedText && extractedText.length > 100) {
              debugInfo += `API extraction successful: ${extractedText.length} characters\n`;
              
              return {
                content: extractedText,
                method: 'enhanced_api',
                debugInfo
              };
            }
          }
        } catch (apiError) {
          debugInfo += `API ${apiUrl} failed: ${apiError.message}\n`;
        }
      }
    }
    
    // Step 3: Enhanced HTML parsing with multiple strategies
    debugInfo += 'Falling back to enhanced HTML parsing...\n';
    
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    
    // Remove unwanted elements
    document.querySelectorAll('script, style, noscript').forEach(el => el.remove());
    
    // Strategy 1: Look for structured data in scripts
    let structuredText = '';
    const scripts = document.querySelectorAll('script');
    
    scripts.forEach(script => {
      const content = script.textContent || '';
      
      // Enhanced pattern matching for WorkFlowy data
      const patterns = [
        /"name"\s*:\s*"([^"\\]*(\\.[^"\\]*)*)"/g,
        /"content"\s*:\s*"([^"\\]*(\\.[^"\\]*)*)"/g,
        /"nm"\s*:\s*"([^"\\]*(\\.[^"\\]*)*)"/g,
        /"ct"\s*:\s*"([^"\\]*(\\.[^"\\]*)*)"/g,
        /"note"\s*:\s*"([^"\\]*(\\.[^"\\]*)*)"/g,
        /"no"\s*:\s*"([^"\\]*(\\.[^"\\]*)*)"/g
      ];
      
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          if (match[1] && match[1].trim().length > 0) {
            // Decode escaped characters
            let text = match[1]
              .replace(/\\"/g, '"')
              .replace(/\\n/g, ' ')
              .replace(/\\t/g, ' ')
              .replace(/\\r/g, ' ')
              .replace(/\\\\/g, '\\');
            
            if (text.trim().length > 2) {
              structuredText += text.trim() + ' ';
            }
          }
        }
      });
    });
    
    if (structuredText.length > 100) {
      debugInfo += `Structured data extraction successful: ${structuredText.length} characters\n`;
      
      return {
        content: structuredText.trim(),
        method: 'enhanced_structured',
        debugInfo
      };
    }
    
    // Strategy 2: Enhanced DOM text extraction
    const textContent = document.body.textContent || document.body.innerText || '';
    const cleanText = textContent
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]+/g, ' ')
      .trim();
    
    if (cleanText.length > 50) {
      debugInfo += `DOM text extraction: ${cleanText.length} characters\n`;
      
      return {
        content: cleanText,
        method: 'enhanced_dom',
        debugInfo
      };
    }
    
    // Strategy 3: Pattern-based extraction from raw HTML
    const htmlPatterns = [
      /<[^>]*data-[^>]*>([^<]+)</gi,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([^<]+)</gi,
      /<span[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)</gi
    ];
    
    let patternText = '';
    htmlPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(htmlContent)) !== null) {
        if (match[1] && match[1].trim().length > 0) {
          patternText += match[1].trim() + ' ';
        }
      }
    });
    
    if (patternText.length > 50) {
      debugInfo += `Pattern extraction: ${patternText.length} characters\n`;
      
      return {
        content: patternText.trim(),
        method: 'enhanced_pattern',
        debugInfo
      };
    }
    
    throw new Error('No content could be extracted using enhanced methods');
    
  } catch (error) {
    debugInfo += `Enhanced extraction failed: ${error.message}\n`;
    throw new Error(`Enhanced WorkFlowy extraction failed: ${error.message}`);
  }
}

// Enhanced Google Docs extraction function
async function enhancedGoogleDocsExtraction(url) {
  console.log('📄 Enhanced Google Docs extraction starting...');
  let debugInfo = 'Enhanced Google Docs Extraction Log:\n';
  
  try {
    // Extract document ID
    const docId = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    if (!docId) {
      throw new Error('Could not extract Google Doc ID from URL');
    }
    
    debugInfo += `Document ID: ${docId}\n`;
    
    // Method 1: Plain text export (most reliable)
    try {
      debugInfo += 'Attempting plain text export...\n';
      const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
      
      const response = await axios.get(exportUrl, {
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/plain, text/*, */*',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      });
      
      const content = response.data.replace(/\s+/g, ' ').trim();
      
      if (content.length > 50) {
        debugInfo += `Plain text export successful: ${content.length} characters\n`;
        
        return {
          content,
          method: 'enhanced_google_docs_export',
          debugInfo
        };
      }
    } catch (exportError) {
      debugInfo += `Plain text export failed: ${exportError.message}\n`;
    }
    
    // Method 2: Public HTML version
    const publicUrls = [
      url.includes('/edit') ? url.replace('/edit', '/pub') : url + '/pub',
      `https://docs.google.com/document/d/${docId}/pub`,
      `https://docs.google.com/document/d/${docId}/preview`,
      url.includes('?') ? url + '&output=html' : url + '?output=html'
    ];
    
    for (const publicUrl of publicUrls) {
      try {
        debugInfo += `Trying HTML version: ${publicUrl}\n`;
        
        const htmlResponse = await axios.get(publicUrl, {
          timeout: 20000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
          }
        });
        
        // Enhanced HTML parsing
        let htmlContent = htmlResponse.data;
        
        // Remove unwanted elements
        htmlContent = htmlContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        htmlContent = htmlContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        htmlContent = htmlContent.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
        htmlContent = htmlContent.replace(/<!--[\s\S]*?-->/gi, '');
        
        // Extract text with better handling of HTML entities
        const content = htmlContent
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&apos;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();
        
        if (content.length > 100) {
          debugInfo += `HTML extraction successful: ${content.length} characters\n`;
          
          return {
            content,
            method: 'enhanced_google_docs_html',
            debugInfo
          };
        }
      } catch (htmlError) {
        debugInfo += `HTML version ${publicUrl} failed: ${htmlError.message}\n`;
      }
    }
    
    throw new Error('All Google Docs extraction methods failed');
    
  } catch (error) {
    debugInfo += `Enhanced Google Docs extraction failed: ${error.message}\n`;
    throw new Error(`Enhanced Google Docs extraction failed: ${error.message}`);
  }
}

// Enhanced generic document extraction function
async function enhancedGenericExtraction(url) {
  console.log('🌐 Enhanced generic extraction starting...');
  let debugInfo = 'Enhanced Generic Extraction Log:\n';
  
  try {
    const maxRetries = 3;
    let bestResult = null;
    
    // Try different user agents and headers
    const strategies = [
      {
        name: 'Desktop Chrome',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate'
        }
      },
      {
        name: 'Mobile Safari',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      },
      {
        name: 'Firefox',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      }
    ];
    
    for (const strategy of strategies) {
      try {
        debugInfo += `Trying ${strategy.name}...\n`;
        
        const response = await axios.get(url, {
          timeout: 25000,
          headers: strategy.headers,
          maxRedirects: 5
        });
        
        // Enhanced HTML processing
        const htmlContent = response.data;
        debugInfo += `${strategy.name} response: ${htmlContent.length} characters\n`;
        
        // Use JSDOM for better parsing
        const dom = new JSDOM(htmlContent);
        const document = dom.window.document;
        
        // Remove unwanted elements
        const unwantedSelectors = [
          'script', 'style', 'noscript', 'nav', 'footer', 'aside',
          '.advertisement', '.ad', '.sidebar', '.menu', '.header',
          '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]'
        ];
        
        unwantedSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => el.remove());
        });
        
        // Try to find main content areas
        const contentSelectors = [
          'main', '[role="main"]', '.main-content', '.content', '.post-content',
          'article', '.article', '.entry-content', '.page-content', 'section',
          '.document-content', '.text-content', 'body'
        ];
        
        let bestContent = '';
        
        for (const selector of contentSelectors) {
          try {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              const text = element.textContent || element.innerText || '';
              if (text.length > bestContent.length) {
                bestContent = text;
                debugInfo += `Best content found in: ${selector} (${text.length} chars)\n`;
              }
            }
          } catch (selectorError) {
            // Continue with next selector
          }
        }
        
        // Clean up the content
        const cleanContent = bestContent
          .replace(/\s+/g, ' ')
          .replace(/[\r\n\t]+/g, ' ')
          .trim();
        
        if (cleanContent.length > 100) {
          const result = {
            content: cleanContent,
            method: `enhanced_generic_${strategy.name.toLowerCase().replace(' ', '_')}`,
            debugInfo,
            contentLength: cleanContent.length
          };
          
          if (!bestResult || cleanContent.length > bestResult.contentLength) {
            bestResult = result;
            debugInfo += `New best result: ${cleanContent.length} characters\n`;
          }
        }
        
      } catch (strategyError) {
        debugInfo += `${strategy.name} failed: ${strategyError.message}\n`;
      }
    }
    
    if (bestResult) {
      return bestResult;
    }
    
    throw new Error('All generic extraction strategies failed');
    
  } catch (error) {
    debugInfo += `Enhanced generic extraction failed: ${error.message}\n`;
    throw new Error(`Enhanced generic extraction failed: ${error.message}`);
  }
}

// Enhanced error handling with retry logic
async function withRetry(operation, maxRetries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
}

// Helper function to extract text from WorkFlowy data structures
function extractTextFromWorkFlowyData(obj, depth = 0) {
  if (depth > 10) return ''; // Prevent infinite recursion
  
  let texts = [];
  
  if (typeof obj === 'string' && obj.trim().length > 0) {
    return obj.trim();
  }
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const text = extractTextFromWorkFlowyData(item, depth + 1);
      if (text) texts.push(text);
    }
  } else if (obj && typeof obj === 'object') {
    // Common WorkFlowy text fields
    const textFields = ['name', 'nm', 'content', 'ct', 'note', 'no', 'text', 'description', 'title'];
    
    for (const field of textFields) {
      if (obj[field] && typeof obj[field] === 'string' && obj[field].trim()) {
        texts.push(obj[field].trim());
      }
    }
    
    // Look for nested outline items
    const nestedFields = ['children', 'ch', 'items', 'outline', 'tree', 'nodes', 'projectTreeData'];
    for (const field of nestedFields) {
      if (obj[field]) {
        const nestedText = extractTextFromWorkFlowyData(obj[field], depth + 1);
        if (nestedText) texts.push(nestedText);
      }
    }
  }
  
  return texts.filter(t => t && t.length > 0).join(' ');
}

// REMOVED: Duplicate function - using the one below with BrainLift targeting

// Proper WorkFlowy API extraction using authenticated API v1 (the correct approach)
async function properWorkFlowyAPIExtraction(url) {
  console.log('🚀 Starting proper WorkFlowy API extraction...');
  const API_KEY = process.env.WF_API_KEY || "c82f6e853144eb680f6470c44f2afaa17a843590";
  const BASE_URL = "https://workflowy.com/api/v1/nodes";
  
  try {
    // Step 1: Get all main/root nodes from WorkFlowy account
    console.log('📋 Getting main nodes from WorkFlowy API...');
    
    const response = await axios.get(`${BASE_URL}?parent_id=None`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'User-Agent': 'AlphaXGoals-WordCounter/1.0'
      },
      timeout: 20000
    });
    
    if (!response.data || !response.data.nodes || !Array.isArray(response.data.nodes)) {
      return { success: false, error: 'Invalid response from WorkFlowy API' };
    }
    
    const mainNodes = response.data.nodes;
    console.log(`✅ Found ${mainNodes.length} main nodes`);
    
    // Find the BrainLift parent node (contains "brain", "brian", or "lift" in name)
    const brainLiftParent = mainNodes.find(node => {
      const nodeName = (node.name || '').toLowerCase();
      return nodeName.includes('brain') || nodeName.includes('brian') || nodeName.includes('lift');
    });
    
    if (!brainLiftParent) {
      return {
        success: false,
        error: 'Could not find BrainLift parent node. Looking for a main node containing "brain", "brian", or "lift"'
      };
    }
    
    console.log(`🎯 Found BrainLift parent: "${brainLiftParent.name}"`);
    
    // Get the CHILDREN of the BrainLift parent (these are the actual sections)
    const brainLiftChildrenResponse = await axios.get(`${BASE_URL}?parent_id=${encodeURIComponent(brainLiftParent.id)}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'User-Agent': 'AlphaXGoals-WordCounter/1.0'
      },
      timeout: 20000
    });
    
    if (!brainLiftChildrenResponse.data || !brainLiftChildrenResponse.data.nodes) {
      return {
        success: false,
        error: 'Could not get children of BrainLift parent node'
      };
    }
    
    const allSectionNodes = brainLiftChildrenResponse.data.nodes;
    console.log(`📋 Found ${allSectionNodes.length} section nodes under BrainLift parent`);
    
    // Extract from ALL sections under BrainLift (get everything, not just predefined sections)
    const targetNodes = allSectionNodes.filter(node => {
      return node.name && node.name.trim().length > 0;
    });
    
    console.log(`🎯 Extracting from ALL ${targetNodes.length} BrainLift sections:`);
    targetNodes.forEach((node, i) => {
      console.log(`  ✅ Section ${i + 1}: ${node.name}`);
    });
    
    if (targetNodes.length === 0) {
      return { 
        success: false, 
        error: `No sections found under "${brainLiftParent.name}". The BrainLift appears to be empty.` 
      };
    }
    
    // Step 2: Recursively collect all text from ONLY the BrainLift sections and their children
    const allTextPieces = [];
    
    async function collectAllText(parentId, depth = 0) {
      if (depth > 30) return; // Maximum depth to ensure we get EVERYTHING
      
      let retries = 0;
      const maxRetries = 10; // Keep trying!
      
      while (retries < maxRetries) {
        try {
          const childResponse = await axios.get(`${BASE_URL}?parent_id=${encodeURIComponent(parentId)}`, {
            headers: {
              'Authorization': `Bearer ${API_KEY}`,
              'Accept': 'application/json',
              'User-Agent': 'AlphaXGoals-WordCounter/1.0'
            },
            timeout: 20000
          });
          
          if (childResponse.data && childResponse.data.nodes) {
            const nodes = childResponse.data.nodes;
            
            for (const node of nodes) {
              // Add text from current node
              if (node.name) allTextPieces.push(node.name);
              if (node.note) allTextPieces.push(node.note);
              
              // Recursively get children
              await collectAllText(node.id, depth + 1);
              
              // Small delay between nodes
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          
          break; // Success, exit retry loop
          
        } catch (error) {
          if (error.response?.status === 429) {
            retries++;
            const waitTime = Math.min(5000 * Math.pow(2, retries), 60000); // Exponential backoff
            console.log(`⚠️ Rate limited at depth ${depth}, retry ${retries}/${maxRetries}, waiting ${waitTime/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue; // Retry
          } else if (error.response?.status === 404) {
            // Node has no children, that's OK
            return;
          } else {
            console.log(`Error at depth ${depth}: ${error.message}`);
            return; // Other errors, skip this branch
          }
        }
      }
      
      if (retries >= maxRetries) {
        console.log(`❌ Max retries reached at depth ${depth}, some content may be missing`);
      }
    }
    
    // Collect content from ONLY the BrainLift section nodes
    for (let i = 0; i < targetNodes.length; i++) {
      const node = targetNodes[i];
      console.log(`Collecting from section ${i + 1}/${targetNodes.length}: "${node.name}"`);
      
      // Add section node content
      if (node.name) allTextPieces.push(node.name);
      if (node.note) allTextPieces.push(node.note);
      
      // Get all children recursively (this includes all nested children automatically)
      await collectAllText(node.id, 1);
      
      console.log(`✅ Section ${i + 1} complete, total text pieces: ${allTextPieces.length}`);
    }
    
    const combinedContent = allTextPieces.join(' ').replace(/\s+/g, ' ').trim();
    
    console.log(`✅ WorkFlowy API extraction successful: ${combinedContent.length} characters`);
    
    return {
      success: true,
      content: combinedContent,
      method: 'workflowy_api_v1_proper'
    };
    
  } catch (error) {
    console.log('❌ WorkFlowy API extraction failed:', error.message);
    
    if (error.response?.status === 401) {
      return { success: false, error: 'Invalid WorkFlowy API key' };
    } else if (error.response?.status === 429) {
      return { success: false, error: 'WorkFlowy API rate limited - please try again in a moment' };
    } else {
      return { success: false, error: `WorkFlowy API failed: ${error.message}` };
    }
  }
}
