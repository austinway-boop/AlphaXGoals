// Simple test server for debugging BrainLift word count extraction
import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

const app = express();
const PORT = 4567;

app.use(express.json());

// Serve ONLY the test HTML page - no other static files to avoid conflicts
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'test-word-extraction.html'));
});

// Test word extraction endpoint
app.post('/test-word-extraction', async (req, res) => {
    const { link } = req.body;
    
    console.log('Testing word extraction for:', link);
    
    if (!link) {
        return res.status(400).json({ success: false, error: 'Link is required' });
    }
    
    let url;
    try {
        url = new URL(link);
    } catch (e) {
        return res.status(400).json({ success: false, error: 'Invalid URL format' });
    }
    
    try {
        let documentContent = '';
        let extractionMethod = 'unknown';
        
        console.log('URL details:', { hostname: url.hostname, pathname: url.pathname });
        
        // Handle WorkFlowy with multiple extraction methods
        if (url.hostname === 'workflowy.com' || url.hostname === 'www.workflowy.com') {
            console.log('Processing WorkFlowy document...');
            
            const response = await axios.get(link, { 
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            
            const htmlContent = response.data;
            console.log('Raw HTML length:', htmlContent.length);
            console.log('HTML preview:', htmlContent.substring(0, 500));
            
            // Method 1: JSDOM approach (your suggested method)
            const dom = new JSDOM(htmlContent);
            const doc = dom.window.document;
            
            // Remove scripts and styles first
            doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());
            
            let text = doc.body.textContent || "";
            text = text.replace(/\s+/g, " ").trim();
            
            if (text && text.length > 10) {
                documentContent = text;
                extractionMethod = 'jsdom_body_text';
                console.log('JSDOM extraction successful, length:', text.length);
            } else {
                console.log('JSDOM extraction failed, trying alternative methods...');
                
                // Method 2: Look for WorkFlowy data in script tags
                const scriptTags = htmlContent.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
                let dataFound = '';
                
                if (scriptTags) {
                    for (const script of scriptTags) {
                        // Look for WorkFlowy tree data
                        const treeDataMatch = script.match(/PROJECT_TREE_DATA\s*=\s*({[\s\S]*?});/);
                        const initDataMatch = script.match(/INIT_DATA\s*=\s*({[\s\S]*?});/);
                        const pageDataMatch = script.match(/pageData\s*=\s*({[\s\S]*?});/);
                        
                        if (treeDataMatch || initDataMatch || pageDataMatch) {
                            try {
                                const dataStr = treeDataMatch?.[1] || initDataMatch?.[1] || pageDataMatch?.[1];
                                const data = JSON.parse(dataStr);
                                console.log('Found WorkFlowy data structure:', Object.keys(data));
                                
                                // Extract text from nested data structure
                                const extractTextFromData = (obj) => {
                                    let texts = [];
                                    
                                    if (typeof obj === 'string') {
                                        return obj.trim();
                                    }
                                    
                                    if (Array.isArray(obj)) {
                                        for (const item of obj) {
                                            const text = extractTextFromData(item);
                                            if (text) texts.push(text);
                                        }
                                    } else if (obj && typeof obj === 'object') {
                                        // Look for common WorkFlowy text fields
                                        if (obj.name || obj.nm) texts.push(obj.name || obj.nm);
                                        if (obj.content || obj.ct) texts.push(obj.content || obj.ct);
                                        if (obj.note || obj.no) texts.push(obj.note || obj.no);
                                        if (obj.text) texts.push(obj.text);
                                        
                                        // Recursively search nested objects
                                        for (const [key, value] of Object.entries(obj)) {
                                            if (key !== 'name' && key !== 'content' && key !== 'note' && key !== 'text') {
                                                const text = extractTextFromData(value);
                                                if (text) texts.push(text);
                                            }
                                        }
                                    }
                                    
                                    return texts.filter(t => t && t.length > 0).join(' ');
                                };
                                
                                dataFound = extractTextFromData(data);
                                console.log('Extracted from data structure, length:', dataFound.length);
                                
                            } catch (parseError) {
                                console.log('Could not parse WorkFlowy data as JSON');
                            }
                        }
                    }
                }
                
                if (dataFound && dataFound.length > 10) {
                    documentContent = dataFound;
                    extractionMethod = 'workflowy_data_extraction';
                } else {
                    // Method 3: Pattern-based extraction as fallback
                    const patterns = [
                        /"name":"([^"]+)"/g,
                        /"content":"([^"]+)"/g,
                        /"nm":"([^"]+)"/g,
                        /"ct":"([^"]+)"/g,
                        /data-name="([^"]+)"/g,
                        /class="name">([^<]+)</g,
                        /class="content">([^<]+)</g
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
                    
                    documentContent = extractedTexts.join(' ');
                    extractionMethod = 'workflowy_pattern_fallback';
                    console.log('Pattern extraction found:', extractedTexts.length, 'text pieces');
                }
            }
        }
        // Handle Google Docs
        else if (url.hostname === 'docs.google.com' && link.includes('/document/d/')) {
            console.log('Processing Google Doc...');
            
            const docId = link.match(/\/document\/d\/([a-zA-Z0-9-_]+)/)?.[1];
            if (!docId) {
                throw new Error('Could not extract Google Doc ID');
            }
            
            // Try plain text export first
            const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
            console.log('Trying export URL:', exportUrl);
            
            try {
                const docResponse = await axios.get(exportUrl, { 
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                    }
                });
                documentContent = docResponse.data;
                extractionMethod = 'google_docs_export';
                console.log('Google Docs export successful, length:', documentContent.length);
            } catch (exportError) {
                console.log('Export failed, trying HTML access...');
                
                const htmlUrls = [
                    `https://docs.google.com/document/d/${docId}/pub`,
                    `https://docs.google.com/document/d/${docId}/edit?usp=sharing`,
                    link
                ];
                
                let htmlResponse = null;
                for (const testUrl of htmlUrls) {
                    try {
                        htmlResponse = await axios.get(testUrl, { 
                            timeout: 10000,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                            }
                        });
                        console.log(`Successfully accessed: ${testUrl}`);
                        break;
                    } catch (urlError) {
                        console.log(`Failed ${testUrl}:`, urlError.response?.status);
                    }
                }
                
                if (!htmlResponse) {
                    throw new Error('Could not access Google Doc via any method');
                }
                
                let htmlContent = htmlResponse.data;
                htmlContent = htmlContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                htmlContent = htmlContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
                
                documentContent = htmlContent.replace(/<[^>]*>/g, ' ')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"');
                
                extractionMethod = 'google_docs_html';
            }
        }
        // Generic HTML document
        else {
            console.log('Processing generic document...');
            
            const response = await axios.get(link, { 
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            
            let htmlContent = response.data;
            htmlContent = htmlContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
            htmlContent = htmlContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            
            documentContent = htmlContent.replace(/<[^>]*>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"');
                
            extractionMethod = 'html_scraping';
        }
        
        // Clean and count words
        console.log('Raw content length:', documentContent.length);
        
        if (!documentContent || documentContent.trim().length === 0) {
            throw new Error('No content could be extracted from document');
        }
        
        // Use your suggested word extraction method with Unicode support
        const cleanText = documentContent.replace(/\s+/g, ' ').trim();
        
        // \p{L} = letters, \p{N} = numbers, keep ' and - inside words (your approach)
        const matches = cleanText.match(/\b[\p{L}\p{N}'-]+\b/gu);
        const words = matches || [];
        const wordCount = words.length;
        
        const contentPreview = documentContent.trim().substring(0, 500) + (documentContent.length > 500 ? '...' : '');
        
        console.log('Word count extraction successful:', wordCount, 'words');
        console.log('=== EXTRACTED TEXT PREVIEW ===');
        console.log(documentContent.substring(0, 1000));
        console.log('=== END PREVIEW ===');
        
        res.json({
            success: true,
            wordCount: wordCount,
            extractionMethod: extractionMethod,
            contentLength: documentContent.length,
            contentPreview: contentPreview,
            fullContent: documentContent, // Show ALL extracted text
            cleanText: cleanText, // Also show the cleaned version used for word counting
            rawWords: words, // Show the actual word array
            documentUrl: link,
            extractedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Extraction error:', error);
        res.status(400).json({
            success: false,
            error: error.message,
            details: error.stack
        });
    }
});

// Test all methods endpoint
app.post('/test-all-methods', async (req, res) => {
    const { link } = req.body;
    const results = {};
    
    if (!link) {
        return res.status(400).json({ success: false, error: 'Link is required' });
    }
    
    let url;
    try {
        url = new URL(link);
    } catch (e) {
        return res.status(400).json({ success: false, error: 'Invalid URL' });
    }
    
    // Method 1: Direct access
    try {
        console.log('Testing direct access...');
        const response = await axios.get(link, { 
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });
        
        let content = response.data.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
            
        const words = content.split(/\s+/).filter(w => w.length > 0);
        
        results.direct = {
            success: true,
            wordCount: words.length,
            contentLength: content.length,
            contentPreview: content.substring(0, 300)
        };
    } catch (error) {
        results.direct = { success: false, error: error.message };
    }
    
    // Method 2: Google Docs export (if applicable)
    if (url.hostname === 'docs.google.com' && link.includes('/document/d/')) {
        const docId = link.match(/\/document\/d\/([a-zA-Z0-9-_]+)/)?.[1];
        if (docId) {
            try {
                console.log('Testing Google Docs export...');
                const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
                const response = await axios.get(exportUrl, { 
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                    }
                });
                
                const content = response.data.trim();
                const words = content.split(/\s+/).filter(w => w.length > 0);
                
                results.google_export = {
                    success: true,
                    wordCount: words.length,
                    contentLength: content.length,
                    contentPreview: content.substring(0, 300)
                };
            } catch (error) {
                results.google_export = { success: false, error: error.message };
            }
        }
    }
    
    // Method 3: JSDOM approach (your suggested method)
    try {
        console.log('Testing JSDOM body text extraction...');
        const response = await axios.get(link, { 
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });
        
        const dom = new JSDOM(response.data);
        const doc = dom.window.document;
        
        // Remove scripts and styles
        doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());
        
        let text = doc.body.textContent || "";
        text = text.replace(/\s+/g, " ").trim();
        
        // Use your word extraction approach
        const matches = text.match(/\b[\p{L}\p{N}'-]+\b/gu);
        const words = matches || [];
        
        results.jsdom_approach = {
            success: true,
            wordCount: words.length,
            contentLength: text.length,
            contentPreview: text.substring(0, 500),
            extractionNote: "Using your suggested JSDOM + Unicode word matching approach"
        };
    } catch (error) {
        results.jsdom_approach = { success: false, error: error.message };
    }
    
    // Method 4: WorkFlowy data structure extraction
    if (url.hostname.includes('workflowy.com')) {
        try {
            console.log('Testing WorkFlowy data structure extraction...');
            const response = await axios.get(link, { 
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            
            const htmlContent = response.data;
            
            // Look for WorkFlowy data in script tags
            const scriptTags = htmlContent.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
            let dataFound = '';
            let dataStructure = null;
            
            if (scriptTags) {
                for (const script of scriptTags) {
                    const treeDataMatch = script.match(/PROJECT_TREE_DATA\s*=\s*({[\s\S]*?});/);
                    const initDataMatch = script.match(/INIT_DATA\s*=\s*({[\s\S]*?});/);
                    const pageDataMatch = script.match(/pageData\s*=\s*({[\s\S]*?});/);
                    
                    if (treeDataMatch || initDataMatch || pageDataMatch) {
                        try {
                            const dataStr = treeDataMatch?.[1] || initDataMatch?.[1] || pageDataMatch?.[1];
                            dataStructure = JSON.parse(dataStr);
                            console.log('Found WorkFlowy data structure:', Object.keys(dataStructure));
                            
                            // Extract text from nested data structure
                            const extractTextFromData = (obj) => {
                                let texts = [];
                                
                                if (typeof obj === 'string') {
                                    return obj.trim();
                                }
                                
                                if (Array.isArray(obj)) {
                                    for (const item of obj) {
                                        const text = extractTextFromData(item);
                                        if (text) texts.push(text);
                                    }
                                } else if (obj && typeof obj === 'object') {
                                    // Look for common WorkFlowy text fields
                                    if (obj.name || obj.nm) texts.push(obj.name || obj.nm);
                                    if (obj.content || obj.ct) texts.push(obj.content || obj.ct);
                                    if (obj.note || obj.no) texts.push(obj.note || obj.no);
                                    if (obj.text) texts.push(obj.text);
                                    
                                    // Recursively search nested objects
                                    for (const [key, value] of Object.entries(obj)) {
                                        if (!['name', 'content', 'note', 'text', 'nm', 'ct', 'no'].includes(key)) {
                                            const text = extractTextFromData(value);
                                            if (text) texts.push(text);
                                        }
                                    }
                                }
                                
                                return texts.filter(t => t && t.length > 0).join(' ');
                            };
                            
                            dataFound = extractTextFromData(dataStructure);
                            break;
                            
                        } catch (parseError) {
                            console.log('Could not parse WorkFlowy data as JSON:', parseError.message);
                        }
                    }
                }
            }
            
            if (dataFound && dataFound.length > 10) {
                const matches = dataFound.match(/\b[\p{L}\p{N}'-]+\b/gu);
                const words = matches || [];
                
                results.workflowy_data_structure = {
                    success: true,
                    wordCount: words.length,
                    contentLength: dataFound.length,
                    contentPreview: dataFound.substring(0, 500),
                    dataStructureKeys: dataStructure ? Object.keys(dataStructure) : [],
                    extractionNote: "Extracted from WorkFlowy internal data structure"
                };
            } else {
                results.workflowy_data_structure = { 
                    success: false, 
                    error: 'No WorkFlowy data structure found or empty content',
                    dataStructureKeys: dataStructure ? Object.keys(dataStructure) : []
                };
            }
        } catch (error) {
            results.workflowy_data_structure = { success: false, error: error.message };
        }
    }
    
    // Method 5: Pattern-based extraction
    if (url.hostname.includes('workflowy.com')) {
        try {
            console.log('Testing pattern-based extraction...');
            const response = await axios.get(link, { 
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            
            let htmlContent = response.data;
            
            // More comprehensive WorkFlowy patterns
            const patterns = [
                /"name":"([^"]+)"/g,
                /"content":"([^"]+)"/g,
                /"nm":"([^"]+)"/g,
                /"ct":"([^"]+)"/g,
                /"note":"([^"]+)"/g,
                /"no":"([^"]+)"/g,
                /data-name="([^"]+)"/g,
                /class="name">([^<]+)</g,
                /class="content">([^<]+)</g,
                /title="([^"]+)"/g
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
            
            const content = extractedTexts.join(' ').replace(/\s+/g, ' ').trim();
            const matches = content.match(/\b[\p{L}\p{N}'-]+\b/gu);
            const words = matches || [];
            
            results.workflowy_patterns = {
                success: true,
                wordCount: words.length,
                contentLength: content.length,
                contentPreview: content.substring(0, 500),
                patternsFound: extractedTexts.length,
                extractionNote: "Pattern-based extraction from HTML attributes and content"
            };
        } catch (error) {
            results.workflowy_patterns = { success: false, error: error.message };
        }
    }
    
    res.json({ success: true, results });
});

app.listen(PORT, () => {
    console.log(`🧪 BrainLift Word Count Test Server running at http://localhost:${PORT}`);
    console.log(`📊 Open your browser to test word count extraction from WorkFlowy/Google Docs`);
    console.log(`🔗 You can test your BrainLift link to see exactly what text is being extracted`);
});
