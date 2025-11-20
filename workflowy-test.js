// Dedicated WorkFlowy word count extraction test server
import express from 'express';
import axios from 'axios';
import { JSDOM } from 'jsdom';
// Import the WorkFlowy client for unofficial API access
import { WorkFlowy } from 'workflowy';

const app = express();
const PORT = 4567;

app.use(express.json());

// Serve simple test page
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WorkFlowy Word Count Extractor</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2196f3; margin-bottom: 20px; }
        input[type="url"] { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px; margin-bottom: 15px; }
        button { background: #2196f3; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; margin-right: 10px; margin-bottom: 10px; }
        button:hover { background: #1976d2; }
        .results { margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 6px; border: 1px solid #ddd; }
        .method-result { margin-bottom: 30px; padding: 15px; background: white; border-radius: 6px; border-left: 4px solid #2196f3; }
        .success { border-left-color: #4caf50; }
        .error { border-left-color: #f44336; background: #ffebee; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; font-size: 14px; max-height: 300px; overflow-y: auto; }
        .word-count { font-size: 18px; font-weight: bold; color: #2196f3; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 WorkFlowy Word Count Extractor</h1>
        <p>Enter your WorkFlowy BrainLift link to see exactly what text can be extracted:</p>
        
        <input type="url" id="workflowyLink" placeholder="https://workflowy.com/s/your-share-link" />
        <br>
        <button onclick="testWorkFlowy()">🔍 Extract WorkFlowy Text (Shared Link)</button>
        <button onclick="testOfficialAPI()">🚀 Test Official WorkFlowy API</button>
        <button onclick="testAllApproaches()">🔧 Try All Approaches</button>
        <button onclick="testUnofficialClient()">🔐 Test Unofficial Client</button>
        <button onclick="debugWorkFlowy()">🐛 Deep Debug</button>
        <button onclick="clearResults()">🗑️ Clear</button>
        
        <div id="results" style="display: none;"></div>
    </div>

    <script>
        async function testWorkFlowy() {
            const link = document.getElementById('workflowyLink').value.trim();
            if (!link) { alert('Please enter a WorkFlowy link'); return; }
            
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = '<div style="text-align: center; padding: 20px;">🤖 Extracting WorkFlowy content...</div>';
            
            try {
                const response = await fetch('/extract-workflowy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ link })
                });
                
                const data = await response.json();
                displayWorkFlowyResults(data);
            } catch (error) {
                results.innerHTML = '<div class="error"><h3>❌ Error</h3><p>' + error.message + '</p></div>';
            }
        }
        
        async function testOfficialAPI() {
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = '<div style="text-align: center; padding: 20px;">🚀 Testing WorkFlowy Official API v1...</div>';
            
            try {
                const response = await fetch('/test-official-api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                
                const data = await response.json();
                displayOfficialAPIResults(data);
            } catch (error) {
                results.innerHTML = '<div class="error"><h3>❌ Error</h3><p>' + error.message + '</p></div>';
            }
        }
        
        async function testAllApproaches() {
            const link = document.getElementById('workflowyLink').value.trim();
            if (!link) { alert('Please enter a WorkFlowy link'); return; }
            
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = '<div style="text-align: center; padding: 20px;">🔧 Testing all extraction approaches...</div>';
            
            try {
                const response = await fetch('/test-all-workflowy', {
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
        
        async function testUnofficialClient() {
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = '<div style="text-align: center; padding: 20px;">🔐 Testing unofficial WorkFlowy client...</div>';
            
            // Show credential input form
            results.innerHTML = `
                <div class="method-result">
                    <h3>🔐 WorkFlowy Unofficial Client Test</h3>
                    <p>This method uses the unofficial WorkFlowy API client with your email/password.</p>
                    <p><strong>Note:</strong> Your credentials are only used for this test and not stored.</p>
                    
                    <div style="margin: 20px 0;">
                        <label for="wfEmail">WorkFlowy Email:</label><br>
                        <input type="email" id="wfEmail" style="width: 300px; padding: 8px; margin: 5px 0;" placeholder="your@email.com">
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <label for="wfPassword">WorkFlowy Password:</label><br>
                        <input type="password" id="wfPassword" style="width: 300px; padding: 8px; margin: 5px 0;" placeholder="your password">
                    </div>
                    
                    <button onclick="runUnofficialClientTest()" style="background: #4caf50; padding: 10px 20px;">🚀 Test Client Access</button>
                    <button onclick="clearResults()" style="background: #666; padding: 10px 20px;">❌ Cancel</button>
                </div>
            `;
        }
        
        async function runUnofficialClientTest() {
            const email = document.getElementById('wfEmail').value.trim();
            const password = document.getElementById('wfPassword').value.trim();
            
            if (!email || !password) {
                alert('Please enter both email and password');
                return;
            }
            
            const results = document.getElementById('results');
            results.innerHTML = '<div style="text-align: center; padding: 20px;">🤖 Logging into WorkFlowy and extracting content...</div>';
            
            try {
                const response = await fetch('/test-unofficial-client', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                displayUnofficialClientResults(data);
            } catch (error) {
                results.innerHTML = '<div class="error"><h3>❌ Error</h3><p>' + error.message + '</p></div>';
            }
        }
        
        async function debugWorkFlowy() {
            const link = document.getElementById('workflowyLink').value.trim();
            if (!link) { alert('Please enter a WorkFlowy link'); return; }
            
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = '<div style="text-align: center; padding: 20px;">🐛 Deep debugging WorkFlowy...</div>';
            
            try {
                const response = await fetch('/debug-workflowy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ link })
                });
                
                const data = await response.json();
                displayDebugResults(data);
            } catch (error) {
                results.innerHTML = '<div class="error"><h3>❌ Error</h3><p>' + error.message + '</p></div>';
            }
        }
        
        function displayWorkFlowyResults(data) {
            const results = document.getElementById('results');
            if (data.success) {
                results.innerHTML = `
                    <div class="method-result success">
                        <div class="word-count">📊 Words Extracted: \${data.wordCount}</div>
                        <p><strong>Method:</strong> \${data.extractionMethod}</p>
                        <p><strong>Content Length:</strong> \${data.contentLength} characters</p>
                        <h4>📝 Extracted Text:</h4>
                        <pre>\${data.extractedText}</pre>
                    </div>
                `;
            } else {
                results.innerHTML = `
                    <div class="method-result error">
                        <h3>❌ Extraction Failed</h3>
                        <p>\${data.error}</p>
                    </div>
                `;
            }
        }
        
        function displayAllResults(data) {
            const results = document.getElementById('results');
            let html = '<h2>🔧 All Approach Results</h2>';
            
            for (const [method, result] of Object.entries(data)) {
                const cssClass = result.success ? 'success' : 'error';
                html += `
                    <div class="method-result \${cssClass}">
                        <h3>\${result.success ? '✅' : '❌'} \${method.replace('_', ' ').toUpperCase()}</h3>
                        ${result.success ? `
                            <div class="word-count">Words: \${result.wordCount}</div>
                            <p><strong>Content Length:</strong> \${result.contentLength} chars</p>
                            <h4>Preview:</h4>
                            <pre>\${result.contentPreview || result.extractedText || 'No content'}</pre>
                        ` : `
                            <p><strong>Error:</strong> \${result.error}</p>
                        `}
                    </div>
                `;
            }
            
            results.innerHTML = html;
        }
        
        function displayOfficialAPIResults(data) {
            const results = document.getElementById('results');
            if (data.success) {
                results.innerHTML = `
                    <div class="method-result success">
                        <h2>🚀 WorkFlowy Official API v1 Results</h2>
                        <div class="word-count">📊 Total Words: \${data.wordCount}</div>
                        <p><strong>Method:</strong> Official WorkFlowy API v1 with Bearer Token</p>
                        <p><strong>API Access:</strong> ✅ Success</p>
                        <p><strong>Nodes Processed:</strong> \${data.nodeCount} bulletpoints</p>
                        <p><strong>Content Length:</strong> \${data.contentLength} characters</p>
                        <p><strong>Processing Time:</strong> \${data.processingTime}ms</p>
                        <h4>📝 Complete Content Dump:</h4>
                        <pre style="max-height: 600px; overflow-y: auto; border: 2px solid #4caf50;">\${data.extractedText}</pre>
                        <h4>🔤 Sample Words (First 50):</h4>
                        <pre style="max-height: 200px; overflow: auto;">\${data.sampleWords}</pre>
                    </div>
                `;
            } else {
                results.innerHTML = `
                    <div class="method-result error">
                        <h3>❌ Official API Test Failed</h3>
                        <p><strong>Error:</strong> \${data.error}</p>
                        <p><strong>API Key Status:</strong> \${data.apiKeyProvided ? '✅ Provided' : '❌ Missing'}</p>
                        ${data.details ? `<p><strong>Details:</strong> ${data.details}</p>` : ''}
                        ${data.httpStatus ? `<p><strong>HTTP Status:</strong> ${data.httpStatus}</p>` : ''}
                    </div>
                `;
            }
        }
        
        function displayUnofficialClientResults(data) {
            const results = document.getElementById('results');
            if (data.success) {
                results.innerHTML = `
                    <div class="method-result success">
                        <h2>✅ WorkFlowy Unofficial Client Results</h2>
                        <div class="word-count">📊 Words Extracted: \${data.wordCount}</div>
                        <p><strong>Method:</strong> \${data.method}</p>
                        <p><strong>Login Status:</strong> \${data.loginSuccess ? '✅ Success' : '❌ Failed'}</p>
                        <p><strong>Document Access:</strong> \${data.documentAccess ? '✅ Success' : '❌ Failed'}</p>
                        <p><strong>Content Length:</strong> \${data.contentLength} characters</p>
                        <h4>📝 Extracted Content:</h4>
                        <pre style="max-height: 400px; overflow-y: auto;">\${data.extractedText}</pre>
                    </div>
                `;
            } else {
                results.innerHTML = `
                    <div class="method-result error">
                        <h3>❌ Unofficial Client Test Failed</h3>
                        <p><strong>Error:</strong> \${data.error}</p>
                        ${data.loginAttempted ? `<p><strong>Login Status:</strong> ${data.loginSuccess ? '✅ Success' : '❌ Failed'}</p>` : ''}
                        ${data.details ? `<p><strong>Details:</strong> ${data.details}</p>` : ''}
                    </div>
                `;
            }
        }
        
        function displayDebugResults(data) {
            const results = document.getElementById('results');
            results.innerHTML = `
                <div class="method-result">
                    <h2>🐛 WorkFlowy Debug Results</h2>
                    <p><strong>Share ID:</strong> \${data.shareId || 'Not found'}</p>
                    <p><strong>HTML Length:</strong> \${data.htmlLength} characters</p>
                    <p><strong>Script Tags Found:</strong> \${data.scriptTagsCount}</p>
                    <p><strong>Data Structures Found:</strong> \${data.dataStructuresFound.join(', ') || 'None'}</p>
                    
                    <h4>🔗 API Endpoints Tested:</h4>
                    ${data.apiResults.map(api => `
                        <div style="margin: 10px 0; padding: 10px; background: \${api.success ? '#e8f5e8' : '#ffebee'}; border-radius: 4px;">
                            <strong>\${api.success ? '✅' : '❌'} \${api.url}</strong><br>
                            ${api.success ? `Status: ${api.status}, Data Type: ${api.dataType}` : `Error: ${api.error}`}
                        </div>
                    `).join('')}
                    
                    <h4>📄 Raw HTML Preview:</h4>
                    <pre>\${data.htmlPreview}</pre>
                </div>
            `;
        }
        
        function clearResults() {
            document.getElementById('results').style.display = 'none';
        }
    </script>
</body>
</html>
    `);
});

// WorkFlowy extraction endpoint
app.post('/extract-workflowy', async (req, res) => {
    const { link } = req.body;
    
    if (!link) {
        return res.status(400).json({ success: false, error: 'WorkFlowy link is required' });
    }
    
    try {
        console.log('🔍 Testing WorkFlowy extraction for:', link);
        
        // Get the WorkFlowy page
        const response = await axios.get(link, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });
        
        const htmlContent = response.data;
        console.log('📄 HTML received, length:', htmlContent.length);
        
        // Extract share_id
        const shareIdMatch = htmlContent.match(/PROJECT_TREE_DATA_URL_PARAMS\s*=\s*{\s*"share_id"\s*:\s*"([^"]+)"/);
        const shareId = shareIdMatch ? shareIdMatch[1] : null;
        console.log('🆔 Share ID found:', shareId);
        
        // Try to get actual outline data via WorkFlowy API
        if (shareId) {
            console.log('🌐 Attempting WorkFlowy API calls...');
            
            const apiEndpoints = [
                `https://workflowy.com/get_initialization_data?share_id=${shareId}`,
                `https://workflowy.com/ajax_request`,
                `https://workflowy.com/get_project_tree?share_id=${shareId}`,
                `https://workflowy.com/api/outline?share_id=${shareId}`,
                `https://workflowy.com/s/${shareId}.json`
            ];
            
            for (const apiUrl of apiEndpoints) {
                try {
                    console.log('🔗 Trying:', apiUrl);
                    const apiResponse = await axios({
                        method: apiUrl.includes('ajax_request') ? 'POST' : 'GET',
                        url: apiUrl,
                        timeout: 10000,
                        data: apiUrl.includes('ajax_request') ? { 
                            share_id: shareId, 
                            client_id: 'web',
                            action: 'get_project_tree'
                        } : undefined,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                            'Accept': 'application/json, text/plain, */*',
                            'Referer': link,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (apiResponse.data) {
                        console.log('✅ API success:', apiUrl, 'Type:', typeof apiResponse.data);
                        
                        // Extract text from API response
                        const extractedText = extractTextFromWorkFlowyData(apiResponse.data);
                        
                        if (extractedText && extractedText.length > 10) {
                            console.log('📝 Text extracted from API, length:', extractedText.length);
                            
                            const words = extractedText.match(/\\b[\\p{L}\\p{N}'-]+\\b/gu) || [];
                            
                            return res.json({
                                success: true,
                                wordCount: words.length,
                                extractionMethod: `workflowy_api_${apiUrl.split('/').pop()}`,
                                contentLength: extractedText.length,
                                extractedText: extractedText,
                                shareId: shareId,
                                apiUrl: apiUrl
                            });
                        }
                    }
                } catch (apiError) {
                    console.log('❌ API failed:', apiUrl, apiError.response?.status || apiError.message);
                }
            }
        }
        
        // Fallback: Try JSDOM on the main page
        console.log('🔧 Falling back to HTML extraction...');
        const dom = new JSDOM(htmlContent);
        const doc = dom.window.document;
        
        // Remove scripts and styles
        doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());
        
        let text = doc.body.textContent || "";
        text = text.replace(/\\s+/g, " ").trim();
        
        const words = text.match(/\\b[\\p{L}\\p{N}'-]+\\b/gu) || [];
        
        res.json({
            success: true,
            wordCount: words.length,
            extractionMethod: 'jsdom_fallback',
            contentLength: text.length,
            extractedText: text,
            shareId: shareId,
            note: 'This may only be the page title/metadata, not your actual outline content'
        });
        
    } catch (error) {
        console.error('💥 WorkFlowy extraction error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Test all approaches
app.post('/test-all-workflowy', async (req, res) => {
    const { link } = req.body;
    const results = {};
    
    if (!link) {
        return res.status(400).json({ error: 'Link required' });
    }
    
    try {
        // Get the page
        const response = await axios.get(link, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });
        
        const htmlContent = response.data;
        const shareId = htmlContent.match(/PROJECT_TREE_DATA_URL_PARAMS\\s*=\\s*{\\s*"share_id"\\s*:\\s*"([^"]+)"/)?.[1];
        
        // Test 1: Direct HTML text extraction
        try {
            const dom = new JSDOM(htmlContent);
            const doc = dom.window.document;
            doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());
            const text = (doc.body.textContent || "").replace(/\\s+/g, " ").trim();
            const words = text.match(/\\b[\\p{L}\\p{N}'-]+\\b/gu) || [];
            
            results.jsdom_html = {
                success: true,
                wordCount: words.length,
                contentLength: text.length,
                extractedText: text.substring(0, 500)
            };
        } catch (e) {
            results.jsdom_html = { success: false, error: e.message };
        }
        
        // Test 2: Try WorkFlowy API endpoints
        if (shareId) {
            const apiEndpoints = [
                `https://workflowy.com/get_initialization_data?share_id=${shareId}`,
                `https://workflowy.com/get_project_tree?share_id=${shareId}`,
                `https://workflowy.com/api/outline?share_id=${shareId}`
            ];
            
            for (const [i, apiUrl] of apiEndpoints.entries()) {
                try {
                    const apiResponse = await axios.get(apiUrl, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                            'Accept': 'application/json, text/plain, */*',
                            'Referer': link
                        }
                    });
                    
                    const extractedText = extractTextFromWorkFlowyData(apiResponse.data);
                    const words = extractedText.match(/\\b[\\p{L}\\p{N}'-]+\\b/gu) || [];
                    
                    results[`api_method_${i + 1}`] = {
                        success: true,
                        wordCount: words.length,
                        contentLength: extractedText.length,
                        extractedText: extractedText.substring(0, 500),
                        apiUrl: apiUrl
                    };
                    
                } catch (e) {
                    results[`api_method_${i + 1}`] = { 
                        success: false, 
                        error: e.message,
                        apiUrl: apiUrl
                    };
                }
            }
        }
        
        // Test 3: Pattern-based extraction from HTML
        try {
            const patterns = [
                /"name"\\s*:\\s*"([^"]+)"/g,
                /"content"\\s*:\\s*"([^"]+)"/g,
                /"nm"\\s*:\\s*"([^"]+)"/g,
                /"ct"\\s*:\\s*"([^"]+)"/g
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
            
            const text = extractedTexts.join(' ');
            const words = text.match(/\\b[\\p{L}\\p{N}'-]+\\b/gu) || [];
            
            results.pattern_extraction = {
                success: true,
                wordCount: words.length,
                contentLength: text.length,
                extractedText: text.substring(0, 500),
                patternsFound: extractedTexts.length
            };
        } catch (e) {
            results.pattern_extraction = { success: false, error: e.message };
        }
        
        res.json(results);
        
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Debug endpoint
app.post('/debug-workflowy', async (req, res) => {
    const { link } = req.body;
    
    try {
        const response = await axios.get(link, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });
        
        const htmlContent = response.data;
        const shareIdMatch = htmlContent.match(/PROJECT_TREE_DATA_URL_PARAMS\\s*=\\s*{\\s*"share_id"\\s*:\\s*"([^"]+)"/);
        const shareId = shareIdMatch ? shareIdMatch[1] : null;
        
        const scriptTags = (htmlContent.match(/<script[^>]*>[\\s\\S]*?<\\/script>/gi) || []).length;
        
        // Look for data structures
        const dataStructures = [];
        if (htmlContent.includes('PROJECT_TREE_DATA')) dataStructures.push('PROJECT_TREE_DATA');
        if (htmlContent.includes('INIT_DATA')) dataStructures.push('INIT_DATA');
        if (htmlContent.includes('pageData')) dataStructures.push('pageData');
        if (htmlContent.includes('outline')) dataStructures.push('outline');
        
        // Test API endpoints
        const apiResults = [];
        if (shareId) {
            const endpoints = [
                `https://workflowy.com/get_initialization_data?share_id=${shareId}`,
                `https://workflowy.com/get_project_tree?share_id=${shareId}`,
                `https://workflowy.com/api/outline?share_id=${shareId}`,
                `https://workflowy.com/s/${shareId}.json`,
                `https://workflowy.com/ajax_request`
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const apiResponse = await axios({
                        method: endpoint.includes('ajax_request') ? 'POST' : 'GET',
                        url: endpoint,
                        timeout: 5000,
                        data: endpoint.includes('ajax_request') ? { share_id: shareId, action: 'get_project_tree' } : undefined,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                            'Accept': 'application/json, text/plain, */*',
                            'Referer': link,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    apiResults.push({
                        success: true,
                        url: endpoint,
                        status: apiResponse.status,
                        dataType: typeof apiResponse.data,
                        hasContent: apiResponse.data && Object.keys(apiResponse.data).length > 0
                    });
                } catch (apiError) {
                    apiResults.push({
                        success: false,
                        url: endpoint,
                        error: apiError.response?.status || apiError.message
                    });
                }
            }
        }
        
        res.json({
            shareId,
            htmlLength: htmlContent.length,
            scriptTagsCount: scriptTags,
            dataStructuresFound: dataStructures,
            apiResults,
            htmlPreview: htmlContent.substring(0, 1000)
        });
        
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Test official WorkFlowy API v1 endpoint
app.post('/test-official-api', async (req, res) => {
    const API_KEY = "c82f6e853144eb680f6470c44f2afaa17a843590"; // Your provided API key
    const BASE_URL = "https://workflowy.com/api/v1/nodes";
    
    console.log('🚀 Testing WorkFlowy Official API v1...');
    
    const startTime = Date.now();
    let nodeCount = 0;
    let allTextPieces = [];
    
    try {
        if (!API_KEY) {
            return res.json({
                success: false,
                error: 'WorkFlowy API key not provided',
                apiKeyProvided: false,
                details: 'Need to set WF_API_KEY environment variable or hardcode the key'
            });
        }
        
        // Function to fetch children from WorkFlowy API with rate limit handling
        async function fetchChildren(parentId = "None", attempt = 0) {
            const url = `${BASE_URL}?parent_id=${encodeURIComponent(parentId)}`;
            console.log(`📡 Fetching: ${url}`);
            
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Accept': 'application/json',
                    'User-Agent': 'AlphaXGoals-WorkFlowy-Test/1.0'
                },
                timeout: 15000
            });
            
            if (response.status === 429) {
                // Rate-limited; back off and retry
                const delayMs = 1000 * (attempt + 1);
                console.warn(`⚠️ Hit rate limit, retrying in ${delayMs}ms...`);
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                return fetchChildren(parentId, attempt + 1);
            }
            
            const data = response.data;
            return Array.isArray(data.nodes) ? data.nodes : [];
        }
        
        // Recursively walk the tree and collect all text
        async function walkTree(parentId, depth = 0) {
            if (depth > 50) { // Safety limit to prevent infinite recursion
                console.warn('⚠️ Maximum depth reached, stopping recursion');
                return;
            }
            
            const nodes = await fetchChildren(parentId);
            console.log(`📋 Found ${nodes.length} nodes at depth ${depth} under parent ${parentId}`);
            
            // Sort by priority to match WorkFlowy UI order
            nodes.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
            
            for (const node of nodes) {
                nodeCount++;
                
                // Collect text content
                if (node.name) {
                    allTextPieces.push(node.name);
                    console.log(`📝 Name: "${node.name.substring(0, 50)}..."`);
                }
                if (node.note) {
                    allTextPieces.push(node.note);
                    console.log(`📄 Note: "${node.note.substring(0, 50)}..."`);
                }
                
                // Recursively process children
                await walkTree(node.id, depth + 1);
            }
        }
        
        // Start the tree walk from root
        console.log('🌳 Starting tree walk from root...');
        await walkTree("None");
        
        // Combine all text
        const fullText = allTextPieces.join('\n');
        
        // Extract words using Unicode-aware regex
        const words = fullText.match(/\b[\p{L}\p{N}'-]+\b/gu) || [];
        
        const processingTime = Date.now() - startTime;
        
        console.log('✅ WorkFlowy API extraction complete!');
        console.log(`📊 Stats: ${nodeCount} nodes, ${words.length} words, ${fullText.length} characters`);
        
        res.json({
            success: true,
            wordCount: words.length,
            nodeCount: nodeCount,
            contentLength: fullText.length,
            processingTime: processingTime,
            extractedText: fullText,
            sampleWords: words.slice(0, 50).join(', '),
            apiKeyProvided: true,
            method: 'workflowy_api_v1_bearer_token'
        });
        
    } catch (error) {
        console.error('💥 WorkFlowy API error:', error);
        
        const errorResponse = {
            success: false,
            error: error.message,
            apiKeyProvided: !!API_KEY,
            details: error.response?.data ? JSON.stringify(error.response.data) : error.stack
        };
        
        if (error.response?.status) {
            errorResponse.httpStatus = error.response.status;
        }
        
        if (error.response?.status === 401) {
            errorResponse.details = 'Invalid API key. Please check your WorkFlowy API key at https://workflowy.com/api-key';
        } else if (error.response?.status === 403) {
            errorResponse.details = 'Access forbidden. Your API key might not have the required permissions.';
        } else if (error.response?.status === 429) {
            errorResponse.details = 'Rate limited. WorkFlowy is throttling API requests.';
        }
        
        res.status(400).json(errorResponse);
    }
});

// Test unofficial WorkFlowy client endpoint
app.post('/test-unofficial-client', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            error: 'Email and password are required for unofficial client test' 
        });
    }
    
    console.log('🔐 Testing WorkFlowy unofficial client for:', email);
    
    try {
        let loginSuccess = false;
        let documentAccess = false;
        let extractedText = '';
        
        // Method 1: Unofficial WorkFlowy client from your research
        try {
            console.log('📡 Attempting WorkFlowy client login...');
            const wf = new WorkFlowy(email, password);
            
            // Try to get the document tree
            const document = await wf.getDocument();
            loginSuccess = true;
            console.log('✅ WorkFlowy client login successful');
            
            if (document && document.root) {
                documentAccess = true;
                console.log('✅ Document access successful');
                
                // Extract text from the document tree
                const textPieces = [];
                
                // Function to recursively collect text from the document tree
                const collectText = (node, depth = 0) => {
                    if (depth > 20) return; // Prevent infinite recursion
                    
                    if (node.name) textPieces.push(node.name);
                    if (node.note) textPieces.push(node.note);
                    
                    if (Array.isArray(node.items)) {
                        for (const child of node.items) {
                            collectText(child, depth + 1);
                        }
                    }
                };
                
                collectText(document.root);
                extractedText = textPieces.join(' ');
                
                console.log('📝 Extracted text from WorkFlowy client, length:', extractedText.length);
                console.log('📊 Text pieces found:', textPieces.length);
                
            } else {
                console.log('❌ Document structure not found or empty');
                extractedText = 'No document content found - your WorkFlowy may be empty or inaccessible';
            }
            
        } catch (clientError) {
            console.error('❌ WorkFlowy client error:', clientError.message);
            
            return res.json({
                success: false,
                error: 'WorkFlowy client access failed: ' + clientError.message,
                loginAttempted: true,
                loginSuccess: false,
                documentAccess: false,
                details: 'The unofficial WorkFlowy client could not log in. This might be due to: 1) Incorrect credentials, 2) Two-factor authentication enabled (not supported), 3) WorkFlowy API changes, or 4) Network issues.'
            });
        }
        
        // Count words using the same approach as your research
        const words = extractedText.match(/\\b[\\p{L}\\p{N}'-]+\\b/gu) || [];
        
        res.json({
            success: true,
            wordCount: words.length,
            method: 'workflowy_unofficial_client',
            loginSuccess: loginSuccess,
            documentAccess: documentAccess,
            contentLength: extractedText.length,
            extractedText: extractedText,
            note: 'This method uses the unofficial WorkFlowy client to access your entire document tree'
        });
        
    } catch (error) {
        console.error('💥 Unofficial client test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            loginAttempted: true,
            loginSuccess: false,
            documentAccess: false
        });
    }
});

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

app.listen(PORT, () => {
    console.log(`🧪 WorkFlowy Test Server running at http://localhost:${PORT}`);
    console.log('📝 Test your WorkFlowy BrainLift link to see extracted text and word counts');
    console.log('🔍 This server will try multiple extraction methods including WorkFlowy APIs');
});
