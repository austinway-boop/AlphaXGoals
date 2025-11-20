// Simple WorkFlowy test server to isolate the issue
import express from 'express';
import axios from 'axios';
import { JSDOM } from 'jsdom';

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
    <title>Simple WorkFlowy Test</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
        .container { background: white; padding: 30px; border-radius: 10px; }
        input[type="url"] { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; }
        button { background: #2196f3; color: white; padding: 12px 24px; border: none; border-radius: 6px; margin: 10px 5px; }
        .results { margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Simple WorkFlowy Test</h1>
        <p>Testing WorkFlowy API key: c82f6e853144eb680f6470c44f2afaa17a843590</p>
        
        <input type="url" id="workflowyLink" placeholder="https://workflowy.com/s/your-share-link" />
        <button onclick="testOfficialAPI()">🚀 Test Official WorkFlowy API</button>
        <button onclick="clearResults()">🗑️ Clear</button>
        
        <div id="results" class="results" style="display: none;"></div>
    </div>

    <script>
        async function testOfficialAPI() {
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = '<div style="text-align: center; padding: 20px;">🚀 Testing WorkFlowy API...</div>';
            
            try {
                const response = await fetch('/test-official-api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                
                const data = await response.json();
                displayResults(data);
            } catch (error) {
                results.innerHTML = '<div style="color: red;"><h3>❌ Error</h3><p>' + error.message + '</p></div>';
            }
        }
        
        function displayResults(data) {
            const results = document.getElementById('results');
            if (data.success) {
                results.innerHTML = \`
                    <div style="border-left: 4px solid #4caf50; padding: 15px; background: white;">
                        <h2>🚀 WorkFlowy API Success!</h2>
                        <div style="font-size: 18px; font-weight: bold; color: #2196f3; margin: 10px 0;">
                            📊 Total Words: \${data.wordCount}
                        </div>
                        <p><strong>Nodes Processed:</strong> \${data.nodeCount}</p>
                        <p><strong>Processing Time:</strong> \${data.processingTime}ms</p>
                        <p><strong>Content Length:</strong> \${data.contentLength} characters</p>
                        <h4>📝 Content Sample (first 500 chars):</h4>
                        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; white-space: pre-wrap; max-height: 300px; overflow-y: auto;">\${data.extractedText.substring(0, 500)}...</pre>
                    </div>
                \`;
            } else {
                results.innerHTML = \`
                    <div style="border-left: 4px solid #f44336; padding: 15px; background: #ffebee;">
                        <h3>❌ API Test Failed</h3>
                        <p><strong>Error:</strong> \${data.error}</p>
                        <p><strong>API Key Status:</strong> \${data.apiKeyProvided ? '✅ Provided' : '❌ Missing'}</p>
                        \${data.details ? \`<p><strong>Details:</strong> \${data.details}</p>\` : ''}
                        \${data.httpStatus ? \`<p><strong>HTTP Status:</strong> \${data.httpStatus}</p>\` : ''}
                    </div>
                \`;
            }
        }
        
        function clearResults() {
            document.getElementById('results').style.display = 'none';
        }
    </script>
</body>
</html>
    `);
});

// Test official WorkFlowy API endpoint
app.post('/test-official-api', async (req, res) => {
    const API_KEY = "c82f6e853144eb680f6470c44f2afaa17a843590";
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
                apiKeyProvided: false
            });
        }
        
        // Function to fetch children from WorkFlowy API
        async function fetchChildren(parentId = "None") {
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
            
            const data = response.data;
            return Array.isArray(data.nodes) ? data.nodes : [];
        }
        
        // Recursively collect all text
        async function collectAllText(parentId, depth = 0) {
            if (depth > 30) return;
            
            const nodes = await fetchChildren(parentId);
            nodes.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
            
            for (const node of nodes) {
                nodeCount++;
                
                if (node.name) {
                    allTextPieces.push(node.name);
                    console.log(`📝 Name: "${node.name.substring(0, 50)}..."`);
                }
                if (node.note) {
                    allTextPieces.push(node.note);
                    console.log(`📄 Note: "${node.note.substring(0, 50)}..."`);
                }
                
                await collectAllText(node.id, depth + 1);
            }
        }
        
        console.log('🌳 Starting tree walk from root...');
        await collectAllText("None");
        
        const fullText = allTextPieces.join(' ');
        const words = fullText.match(/\\b[\\p{L}\\p{N}'-]+\\b/gu) || [];
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
            apiKeyProvided: true
        });
        
    } catch (error) {
        console.error('💥 WorkFlowy API error:', error);
        
        const errorResponse = {
            success: false,
            error: error.message,
            apiKeyProvided: !!API_KEY
        };
        
        if (error.response?.status) {
            errorResponse.httpStatus = error.response.status;
        }
        
        if (error.response?.status === 401) {
            errorResponse.details = 'Invalid API key. Check your WorkFlowy API key at https://workflowy.com/api-key';
        }
        
        res.status(400).json(errorResponse);
    }
});

app.listen(PORT, () => {
    console.log(`🧪 Simple WorkFlowy Test Server running at http://localhost:${PORT}`);
    console.log('📝 This server tests WorkFlowy API extraction with your API key');
});
