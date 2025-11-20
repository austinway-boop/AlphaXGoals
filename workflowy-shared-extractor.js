// Direct WorkFlowy shared link extractor
import express from 'express';
import axios from 'axios';
import { JSDOM } from 'jsdom';

const app = express();
const PORT = 4567;

app.use(express.json());

// Serve test page
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WorkFlowy Shared Link Extractor</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
        .container { background: white; padding: 30px; border-radius: 10px; }
        input[type="url"] { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; margin: 10px 0; }
        button { background: #2196f3; color: white; padding: 12px 24px; border: none; border-radius: 6px; margin: 5px; cursor: pointer; }
        button:hover { background: #1976d2; }
        .results { margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 6px; }
        .success { border-left: 4px solid #4caf50; background: #e8f5e8; }
        .error { border-left: 4px solid #f44336; background: #ffebee; }
        .word-count { font-size: 24px; font-weight: bold; color: #2196f3; margin: 15px 0; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 4px; white-space: pre-wrap; max-height: 400px; overflow-y: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 WorkFlowy Shared Link Word Extractor</h1>
        <p>Extract words from WorkFlowy shared documents</p>
        
        <input type="url" id="workflowyLink" placeholder="https://workflowy.com/s/your-link" value="https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe" />
        <br>
        <button onclick="extractFromSharedLink()">🚀 Extract from Shared Link</button>
        <button onclick="tryAllMethods()">🔧 Try All Extraction Methods</button>
        <button onclick="clearResults()">🗑️ Clear</button>
        
        <div id="results" class="results" style="display: none;"></div>
    </div>

    <script>
        async function extractFromSharedLink() {
            const link = document.getElementById('workflowyLink').value.trim();
            if (!link) { alert('Please enter a WorkFlowy link'); return; }
            
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = '<div style="text-align: center; padding: 20px;">🔍 Extracting from shared WorkFlowy link...</div>';
            
            try {
                const response = await fetch('/extract-shared-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ link })
                });
                
                const data = await response.json();
                displayResults(data);
            } catch (error) {
                results.innerHTML = '<div class="error"><h3>❌ Error</h3><p>' + error.message + '</p></div>';
            }
        }
        
        async function tryAllMethods() {
            const link = document.getElementById('workflowyLink').value.trim();
            if (!link) { alert('Please enter a WorkFlowy link'); return; }
            
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = '<div style="text-align: center; padding: 20px;">🔧 Trying all extraction methods...</div>';
            
            try {
                const response = await fetch('/extract-all-methods', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ link })
                });
                
                const data = await response.json();
                displayAllResults(data);
            } catch (error) {
                results.innerHTML = '<div class="error"><h3>❌ Error</h3><p>' + error.message + '</p></div>';
            }
        }
        
        function displayResults(data) {
            const results = document.getElementById('results');
            if (data.success) {
                results.innerHTML = \`
                    <div class="success">
                        <h2>✅ WorkFlowy Text Extraction Successful!</h2>
                        <div class="word-count">📊 Total Words: \${data.wordCount}</div>
                        <p><strong>Method Used:</strong> \${data.method}</p>
                        <p><strong>Content Length:</strong> \${data.contentLength} characters</p>
                        <p><strong>Processing Time:</strong> \${data.processingTime}ms</p>
                        
                        \${data.wordCount >= 8000 ? 
                            '<p><strong>✅ Success!</strong> Extracted ' + data.wordCount + ' words (target: ~9,000)</p>' :
                            '<p><strong>⚠️ Partial:</strong> Extracted ' + data.wordCount + ' words (expected ~9,000)</p>'
                        }
                        
                        <h4>📝 Full Extracted Content:</h4>
                        <pre>\${data.extractedText}</pre>
                        
                        \${data.debugInfo ? \`
                            <h4>🔧 Debug Information:</h4>
                            <pre>\${data.debugInfo}</pre>
                        \` : ''}
                    </div>
                \`;
            } else {
                results.innerHTML = \`
                    <div class="error">
                        <h3>❌ Extraction Failed</h3>
                        <p><strong>Error:</strong> \${data.error}</p>
                        \${data.details ? \`<p><strong>Details:</strong> \${data.details}</p>\` : ''}
                    </div>
                \`;
            }
        }
        
        function displayAllResults(data) {
            const results = document.getElementById('results');
            let html = '<h2>🔧 All Extraction Methods Results</h2>';
            
            for (const [method, result] of Object.entries(data)) {
                const cssClass = result.success ? 'success' : 'error';
                html += \`
                    <div class="\${cssClass}" style="margin: 15px 0;">
                        <h3>\${result.success ? '✅' : '❌'} \${method.toUpperCase().replace('_', ' ')}</h3>
                        \${result.success ? \`
                            <div class="word-count">Words: \${result.wordCount}</div>
                            <p>Content Length: \${result.contentLength} chars</p>
                            <p>Method: \${result.method || 'N/A'}</p>
                            \${result.wordCount >= 8000 ? '<p><strong>✅ Target Achieved!</strong></p>' : ''}
                            <details>
                                <summary>View Content Sample</summary>
                                <pre>\${(result.extractedText || '').substring(0, 1000)}...</pre>
                            </details>
                        \` : \`
                            <p><strong>Error:</strong> \${result.error}</p>
                        \`}
                    </div>
                \`;
            }
            
            results.innerHTML = html;
        }
        
        function clearResults() {
            document.getElementById('results').style.display = 'none';
        }
    </script>
</body>
</html>
    `);
});

// Extract from shared WorkFlowy link
app.post('/extract-shared-link', async (req, res) => {
    const { link } = req.body;
    const startTime = Date.now();
    
    if (!link) {
        return res.status(400).json({ success: false, error: 'WorkFlowy link is required' });
    }
    
    console.log('🔍 Extracting from WorkFlowy shared link:', link);
    
    try {
        // Step 1: Get the shared page HTML
        const response = await axios.get(link, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        
        const htmlContent = response.data;
        console.log('📄 HTML received, length:', htmlContent.length);
        
        let extractedText = '';
        let method = 'unknown';
        let debugInfo = '';
        
        // Method 1: Look for WorkFlowy data in script tags
        console.log('🔍 Method 1: Looking for WorkFlowy data structures...');
        const scriptMatches = htmlContent.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
        
        if (scriptMatches) {
            debugInfo += `Found ${scriptMatches.length} script tags\n`;
            
            for (const script of scriptMatches) {
                // Look for various WorkFlowy data patterns
                const patterns = [
                    /PROJECT_TREE_DATA\s*=\s*({[\s\S]*?});/,
                    /INIT_DATA\s*=\s*({[\s\S]*?});/,
                    /pageData\s*=\s*({[\s\S]*?});/,
                    /"projectTreeData"\s*:\s*({[\s\S]*?})/,
                    /"outline"\s*:\s*({[\s\S]*?})/
                ];
                
                for (const pattern of patterns) {
                    const match = script.match(pattern);
                    if (match) {
                        try {
                            const data = JSON.parse(match[1]);
                            console.log('✅ Found WorkFlowy data structure!');
                            debugInfo += `Found data structure: ${Object.keys(data).join(', ')}\n`;
                            
                            const texts = extractTextFromWorkFlowyData(data);
                            if (texts.length > extractedText.length) {
                                extractedText = texts;
                                method = 'data_structure_extraction';
                            }
                        } catch (parseError) {
                            debugInfo += `Failed to parse data structure: ${parseError.message}\n`;
                        }
                    }
                }
            }
        }
        
        // Method 2: Pattern-based extraction from HTML
        if (extractedText.length < 1000) {
            console.log('🔍 Method 2: Pattern-based extraction...');
            
            const textPatterns = [
                /"name"\s*:\s*"([^"]+)"/g,
                /"content"\s*:\s*"([^"]+)"/g,
                /"nm"\s*:\s*"([^"]+)"/g,
                /"ct"\s*:\s*"([^"]+)"/g,
                /"note"\s*:\s*"([^"]+)"/g,
                /"no"\s*:\s*"([^"]+)"/g,
                /data-name="([^"]+)"/g,
                /class="name">([^<]+)</g,
                /class="content">([^<]+)</g,
                /title="([^"]+)"/g
            ];
            
            let patternTexts = [];
            let totalMatches = 0;
            
            for (const pattern of textPatterns) {
                let match;
                while ((match = pattern.exec(htmlContent)) !== null) {
                    if (match[1] && match[1].trim().length > 1) {
                        patternTexts.push(match[1].trim());
                        totalMatches++;
                    }
                }
            }
            
            if (patternTexts.length > 0) {
                const patternText = patternTexts.join(' ');
                debugInfo += `Pattern extraction: ${totalMatches} matches, ${patternText.length} chars\n`;
                
                if (patternText.length > extractedText.length) {
                    extractedText = patternText;
                    method = 'pattern_extraction';
                }
            }
        }
        
        // Method 3: JSDOM body text extraction (fallback)
        if (extractedText.length < 500) {
            console.log('🔍 Method 3: JSDOM body text extraction...');
            
            try {
                const dom = new JSDOM(htmlContent);
                const doc = dom.window.document;
                
                // Remove script and style tags
                doc.querySelectorAll('script, style, noscript, meta, link').forEach(el => el.remove());
                
                let bodyText = doc.body.textContent || "";
                bodyText = bodyText.replace(/\\s+/g, " ").trim();
                
                debugInfo += `JSDOM extraction: ${bodyText.length} chars\n`;
                
                if (bodyText.length > extractedText.length) {
                    extractedText = bodyText;
                    method = 'jsdom_body_text';
                }
            } catch (jsdomError) {
                debugInfo += `JSDOM failed: ${jsdomError.message}\n`;
            }
        }
        
        // Method 4: Raw HTML text extraction
        if (extractedText.length < 100) {
            console.log('🔍 Method 4: Raw HTML text extraction...');
            
            let rawText = htmlContent
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]*>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/\\s+/g, ' ')
                .trim();
                
            debugInfo += `Raw text extraction: ${rawText.length} chars\n`;
            
            if (rawText.length > extractedText.length) {
                extractedText = rawText;
                method = 'raw_html_extraction';
            }
        }
        
        if (!extractedText || extractedText.length < 10) {
            return res.json({
                success: false,
                error: 'Could not extract any meaningful content from WorkFlowy shared link',
                details: 'The document may not be publicly shared, or the content structure has changed',
                debugInfo: debugInfo
            });
        }
        
        // Count words using Unicode-aware approach
        const words = extractedText.match(/\b[\p{L}\p{N}'-]+\b/gu) || [];
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ Extraction complete: ${words.length} words, ${extractedText.length} chars, method: ${method}`);
        
        res.json({
            success: true,
            wordCount: words.length,
            contentLength: extractedText.length,
            extractedText: extractedText,
            method: method,
            processingTime: processingTime,
            debugInfo: debugInfo,
            targetAchieved: words.length >= 8000
        });
        
    } catch (error) {
        console.error('💥 WorkFlowy extraction error:', error);
        res.status(400).json({
            success: false,
            error: error.message,
            details: error.response ? `HTTP ${error.response.status}: ${error.response.statusText}` : error.stack
        });
    }
});

// Try all methods endpoint
app.post('/extract-all-methods', async (req, res) => {
    const { link } = req.body;
    const results = {};
    
    // Method 1: Shared link extraction
    try {
        const sharedResponse = await axios.post('http://localhost:4567/extract-shared-link', { link });
        results.shared_link = sharedResponse.data;
    } catch (error) {
        results.shared_link = { success: false, error: error.message };
    }
    
    res.json(results);
});

// Helper function to extract text from WorkFlowy data structures
function extractTextFromWorkFlowyData(obj, depth = 0) {
    if (depth > 20) return ''; // Prevent infinite recursion
    
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
        const textFields = ['name', 'nm', 'content', 'ct', 'note', 'no', 'text', 'description', 'title', 'value'];
        
        for (const field of textFields) {
            if (obj[field] && typeof obj[field] === 'string' && obj[field].trim()) {
                texts.push(obj[field].trim());
            }
        }
        
        // Look for nested outline items
        const nestedFields = ['children', 'ch', 'items', 'outline', 'tree', 'nodes', 'projectTreeData', 'data'];
        for (const field of nestedFields) {
            if (obj[field]) {
                const nestedText = extractTextFromWorkFlowyData(obj[field], depth + 1);
                if (nestedText) texts.push(nestedText);
            }
        }
        
        // Try all object values if no text fields found
        if (texts.length === 0) {
            for (const [key, value] of Object.entries(obj)) {
                if (!textFields.includes(key) && !nestedFields.includes(key)) {
                    const nestedText = extractTextFromWorkFlowyData(value, depth + 1);
                    if (nestedText) texts.push(nestedText);
                }
            }
        }
    }
    
    return texts.filter(t => t && t.length > 0).join(' ');
}

app.listen(PORT, () => {
    console.log(`🔍 WorkFlowy Shared Link Extractor running at http://localhost:${PORT}`);
    console.log('🎯 Target: Extract ~9,000 words from austin-way WorkFlowy document');
    console.log('🔗 Ready to test: https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe');
});
