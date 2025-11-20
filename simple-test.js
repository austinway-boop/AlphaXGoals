// Simple WorkFlowy test server
import express from 'express';
import axios from 'axios';
import { JSDOM } from 'jsdom';

const app = express();
const PORT = 4567;

app.use(express.json());

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>WorkFlowy Text Extractor</title>
    <style>
        body { font-family: Arial; max-width: 800px; margin: 20px auto; padding: 20px; }
        input { width: 100%; padding: 10px; margin: 10px 0; font-size: 16px; }
        button { padding: 10px 20px; margin: 5px; background: #2196f3; color: white; border: none; border-radius: 5px; cursor: pointer; }
        .result { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        pre { background: #f5f5f5; padding: 10px; overflow: auto; max-height: 400px; }
    </style>
</head>
<body>
    <h1>🧪 WorkFlowy Text Extractor</h1>
    <input type="url" id="link" placeholder="https://workflowy.com/s/your-share-link" />
    <button onclick="extractText()">Extract Text</button>
    <button onclick="debugExtraction()">Debug</button>
    <div id="results"></div>
    
    <script>
        async function extractText() {
            const link = document.getElementById('link').value;
            if (!link) return alert('Enter link first');
            
            document.getElementById('results').innerHTML = 'Extracting...';
            
            try {
                const response = await fetch('/extract', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({link})
                });
                const data = await response.json();
                
                document.getElementById('results').innerHTML = 
                    '<div class="result"><h3>Results</h3>' +
                    '<p>Words: ' + data.wordCount + '</p>' +
                    '<p>Method: ' + data.method + '</p>' +
                    '<h4>Extracted Text:</h4>' +
                    '<pre>' + data.text + '</pre></div>';
            } catch (e) {
                document.getElementById('results').innerHTML = '<div class="result">Error: ' + e.message + '</div>';
            }
        }
        
        async function debugExtraction() {
            const link = document.getElementById('link').value;
            if (!link) return alert('Enter link first');
            
            document.getElementById('results').innerHTML = 'Debugging...';
            
            try {
                const response = await fetch('/debug', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({link})
                });
                const data = await response.json();
                
                let html = '<div class="result"><h3>Debug Results</h3>';
                html += '<p>Share ID: ' + (data.shareId || 'None') + '</p>';
                html += '<p>HTML Length: ' + data.htmlLength + '</p>';
                
                html += '<h4>API Test Results:</h4>';
                for (const result of data.apiTests) {
                    html += '<p>' + (result.success ? '✅' : '❌') + ' ' + result.url + ' - ' + (result.error || 'Success') + '</p>';
                }
                
                html += '<h4>Raw HTML Preview:</h4>';
                html += '<pre>' + data.htmlPreview + '</pre>';
                html += '</div>';
                
                document.getElementById('results').innerHTML = html;
            } catch (e) {
                document.getElementById('results').innerHTML = '<div class="result">Debug Error: ' + e.message + '</div>';
            }
        }
    </script>
</body>
</html>
    `);
});

app.post('/extract', async (req, res) => {
    const { link } = req.body;
    console.log('Testing extraction for:', link);
    
    try {
        // Get the WorkFlowy page
        const response = await axios.get(link, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });
        
        const html = response.data;
        console.log('HTML length:', html.length);
        
        // Extract share_id
        const shareMatch = html.match(/PROJECT_TREE_DATA_URL_PARAMS\\s*=\\s*{\\s*"share_id"\\s*:\\s*"([^"]+)"/);
        const shareId = shareMatch ? shareMatch[1] : null;
        console.log('Share ID:', shareId);
        
        let extractedText = '';
        let method = 'none';
        
        // Try WorkFlowy API if we have share_id
        if (shareId) {
            const apiUrls = [
                'https://workflowy.com/get_initialization_data?share_id=' + shareId,
                'https://workflowy.com/get_project_tree?share_id=' + shareId
            ];
            
            for (const apiUrl of apiUrls) {
                try {
                    console.log('Trying API:', apiUrl);
                    const apiResponse = await axios.get(apiUrl, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                            'Referer': link
                        }
                    });
                    
                    if (apiResponse.data) {
                        console.log('API response type:', typeof apiResponse.data);
                        console.log('API response keys:', Object.keys(apiResponse.data));
                        
                        // Extract text from API data
                        extractedText = extractFromData(apiResponse.data);
                        if (extractedText && extractedText.length > 10) {
                            method = 'workflowy_api';
                            console.log('API extraction successful, length:', extractedText.length);
                            break;
                        }
                    }
                } catch (apiError) {
                    console.log('API failed:', apiError.response?.status || apiError.message);
                }
            }
        }
        
        // Fallback to HTML extraction
        if (!extractedText || extractedText.length < 10) {
            console.log('Falling back to HTML extraction');
            const dom = new JSDOM(html);
            const doc = dom.window.document;
            
            // Remove scripts and styles
            doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());
            
            extractedText = (doc.body.textContent || "").replace(/\\s+/g, " ").trim();
            method = 'html_extraction';
            console.log('HTML extraction result length:', extractedText.length);
        }
        
        // Count words using your approach
        const wordMatches = extractedText.match(/\\b[\\p{L}\\p{N}'-]+\\b/gu);
        const wordCount = wordMatches ? wordMatches.length : 0;
        
        console.log('Final word count:', wordCount);
        
        res.json({
            success: true,
            wordCount: wordCount,
            method: method,
            text: extractedText,
            shareId: shareId
        });
        
    } catch (error) {
        console.error('Extraction error:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

app.post('/debug', async (req, res) => {
    const { link } = req.body;
    
    try {
        const response = await axios.get(link);
        const html = response.data;
        
        const shareMatch = html.match(/PROJECT_TREE_DATA_URL_PARAMS\\s*=\\s*{\\s*"share_id"\\s*:\\s*"([^"]+)"/);
        const shareId = shareMatch ? shareMatch[1] : null;
        
        // Test API endpoints
        const apiTests = [];
        if (shareId) {
            const endpoints = [
                'https://workflowy.com/get_initialization_data?share_id=' + shareId,
                'https://workflowy.com/get_project_tree?share_id=' + shareId,
                'https://workflowy.com/ajax_request'
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const apiResponse = await axios.get(endpoint, {
                        timeout: 5000,
                        headers: { 'Referer': link }
                    });
                    apiTests.push({ success: true, url: endpoint, status: apiResponse.status });
                } catch (e) {
                    apiTests.push({ success: false, url: endpoint, error: e.response?.status || e.message });
                }
            }
        }
        
        res.json({
            shareId: shareId,
            htmlLength: html.length,
            apiTests: apiTests,
            htmlPreview: html.substring(0, 1000)
        });
        
    } catch (error) {
        res.json({ error: error.message });
    }
});

function extractFromData(data, depth = 0) {
    if (depth > 10) return '';
    
    let texts = [];
    
    if (typeof data === 'string' && data.trim()) {
        return data.trim();
    }
    
    if (Array.isArray(data)) {
        for (const item of data) {
            const text = extractFromData(item, depth + 1);
            if (text) texts.push(text);
        }
    } else if (data && typeof data === 'object') {
        const fields = ['name', 'nm', 'content', 'ct', 'note', 'no', 'text'];
        
        for (const field of fields) {
            if (data[field] && typeof data[field] === 'string' && data[field].trim()) {
                texts.push(data[field].trim());
            }
        }
        
        // Recursively search nested objects
        for (const [key, value] of Object.entries(data)) {
            if (!fields.includes(key)) {
                const text = extractFromData(value, depth + 1);
                if (text) texts.push(text);
            }
        }
    }
    
    return texts.join(' ');
}

app.listen(PORT, () => {
    console.log('WorkFlowy Test Server running at http://localhost:' + PORT);
});
