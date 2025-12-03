// Vercel serverless function for testing enhanced BrainLift scraping
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

  if (req.method === 'GET') {
    // Return test interface HTML
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced BrainLift Scraping Test</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        h1 {
            color: #4a5568;
            margin-bottom: 20px;
            text-align: center;
            font-size: 2.5em;
        }
        .subtitle {
            text-align: center;
            color: #718096;
            font-size: 1.2em;
            margin-bottom: 40px;
        }
        .test-section {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 12px;
            margin: 25px 0;
            border-left: 5px solid #667eea;
        }
        .url-input {
            width: 100%;
            padding: 15px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            font-size: 16px;
            margin: 10px 0;
            box-sizing: border-box;
        }
        .url-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .test-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            margin: 10px;
            transition: all 0.3s ease;
        }
        .test-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }
        .test-btn:disabled {
            background: #cbd5e0;
            cursor: not-allowed;
            transform: none;
        }
        .results {
            background: #f0fff4;
            border: 1px solid #48bb78;
            border-left: 5px solid #48bb78;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
        }
        .error {
            background: #fed7d7;
            border-color: #f56565;
        }
        .loading {
            background: #e6fffa;
            border-color: #38b2ac;
            text-align: center;
        }
        .spinner {
            border: 4px solid #e2e8f0;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .word-count {
            font-size: 3em;
            font-weight: bold;
            color: #667eea;
            text-align: center;
            margin: 20px 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 25px 0;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            color: #718096;
            font-size: 0.9em;
            margin-top: 5px;
        }
        .method-badge {
            background: #667eea;
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 600;
            display: inline-block;
        }
        details {
            margin: 20px 0;
        }
        summary {
            font-weight: 600;
            cursor: pointer;
            padding: 10px;
            background: #f7fafc;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        pre {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 6px;
            white-space: pre-wrap;
            max-height: 400px;
            overflow-y: auto;
            font-size: 0.9em;
            line-height: 1.4;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧠 Enhanced BrainLift Scraping Test</h1>
        <div class="subtitle">Test your enhanced web scraping without API keys</div>
        
        <div class="test-section">
            <h3>🔬 Test Enhanced Scraping</h3>
            <input 
                type="url" 
                id="testUrl" 
                class="url-input"
                placeholder="Enter BrainLift document URL..." 
                value="https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe"
            />
            <div>
                <button class="test-btn" onclick="testEnhanced()">🚀 Test Enhanced Scraping</button>
                <button class="test-btn" onclick="testQuick()">⚡ Quick Test</button>
                <button class="test-btn" onclick="clearResults()">🗑️ Clear Results</button>
            </div>
        </div>
        
        <div id="results" style="display: none;"></div>
    </div>

    <script>
        async function testEnhanced() {
            await runTest('enhanced');
        }
        
        async function testQuick() {
            await runTest('quick');
        }
        
        async function runTest(mode) {
            const url = document.getElementById('testUrl').value.trim();
            if (!url) {
                alert('Please enter a BrainLift URL to test');
                return;
            }
            
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.className = 'results loading';
            results.innerHTML = \`
                <div class="spinner"></div>
                <h3>🧪 Testing enhanced scraping...</h3>
                <p>This may take 10-30 seconds depending on the document size and complexity.</p>
                <p><strong>Mode:</strong> \${mode === 'enhanced' ? 'Full Enhanced Extraction' : 'Quick Test'}</p>
            \`;
            
            document.querySelectorAll('.test-btn').forEach(btn => btn.disabled = true);
            
            try {
                const startTime = Date.now();
                
                // Call the enhanced extract-word-count API
                const response = await fetch('/api/extract-word-count', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        brainliftLink: url,
                        isAdmin: true  // Use admin mode to bypass auth for testing
                    })
                });
                
                const data = await response.json();
                const processingTime = Date.now() - startTime;
                
                if (data.success) {
                    results.className = 'results';
                    results.innerHTML = \`
                        <h2>✅ Enhanced Scraping Successful!</h2>
                        
                        <div class="word-count">\${data.wordCount.toLocaleString()} words</div>
                        
                        <div style="text-align: center; margin: 20px 0;">
                            <span class="method-badge">\${data.extractionMethod || 'Enhanced Scraping'}</span>
                        </div>
                        
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-value">\${(data.contentLength || 0).toLocaleString()}</div>
                                <div class="stat-label">Characters</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">\${Math.round(processingTime/1000)}s</div>
                                <div class="stat-label">Processing Time</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">\${data.extractedAt ? '✅' : '❓'}</div>
                                <div class="stat-label">Extraction Status</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">\${mode === 'enhanced' ? 'Full' : 'Quick'}</div>
                                <div class="stat-label">Test Mode</div>
                            </div>
                        </div>
                        
                        \${data.contentPreview ? \`
                            <details>
                                <summary>📝 Content Preview</summary>
                                <pre>\${data.contentPreview}</pre>
                            </details>
                        \` : ''}
                        
                        <details>
                            <summary>🔧 Technical Details</summary>
                            <pre>URL: \${url}
Method: \${data.extractionMethod || 'Enhanced'}
Word Count: \${data.wordCount}
Characters: \${data.contentLength || 'N/A'}
Processing Time: \${processingTime}ms
Extracted At: \${data.extractedAt || new Date().toISOString()}
Success: true</pre>
                        </details>
                    \`;
                } else {
                    results.className = 'results error';
                    results.innerHTML = \`
                        <h2>❌ Enhanced Scraping Failed</h2>
                        <p><strong>Error:</strong> \${data.error}</p>
                        <p><strong>Processing Time:</strong> \${Math.round(processingTime/1000)}s</p>
                        
                        <details>
                            <summary>🔧 Debug Information</summary>
                            <pre>URL: \${url}
Error: \${data.error}
Details: \${data.details || 'No additional details'}
Processing Time: \${processingTime}ms
Timestamp: \${new Date().toISOString()}</pre>
                        </details>
                        
                        <h3>💡 Suggestions:</h3>
                        <ul>
                            <li>Verify the document is publicly accessible</li>
                            <li>Check if the URL is correct and complete</li>
                            <li>For WorkFlowy: Ensure link is set to "Anyone with link can view"</li>
                            <li>For Google Docs: Make sure sharing is set to public</li>
                        </ul>
                    \`;
                }
                
            } catch (error) {
                results.className = 'results error';
                results.innerHTML = \`
                    <h2>❌ Test Failed</h2>
                    <p><strong>Network Error:</strong> \${error.message}</p>
                    <p>This could indicate a connection problem or server issue.</p>
                    
                    <details>
                        <summary>🔧 Error Details</summary>
                        <pre>Error: \${error.message}
URL: \${url}
Timestamp: \${new Date().toISOString()}
Stack: \${error.stack || 'Not available'}</pre>
                    </details>
                \`;
            } finally {
                document.querySelectorAll('.test-btn').forEach(btn => btn.disabled = false);
            }
        }
        
        function clearResults() {
            document.getElementById('results').style.display = 'none';
        }
        
        // Auto-focus URL input
        document.getElementById('testUrl').focus();
    </script>
</body>
</html>
    `);
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // POST request - run actual tests
  const { testType, url } = req.body;
  
  console.log(`🧪 Running enhanced scraping test: ${testType} for ${url}`);
  
  try {
    const startTime = Date.now();
    
    // Test the enhanced extract-word-count API
    const testResponse = await axios.post(`${req.headers.origin || 'http://localhost:3000'}/api/extract-word-count`, {
      brainliftLink: url,
      isAdmin: true
    }, {
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const processingTime = Date.now() - startTime;
    
    if (testResponse.data.success) {
      res.json({
        success: true,
        testType: testType,
        wordCount: testResponse.data.wordCount,
        contentLength: testResponse.data.extractedText ? testResponse.data.extractedText.length : 0,
        extractionMethod: testResponse.data.extractionMethod,
        processingTime: processingTime,
        extractedText: testResponse.data.extractedText ? testResponse.data.extractedText.substring(0, 2000) : null,
        debugInfo: `Test successful
URL: ${url}
Method: ${testResponse.data.extractionMethod}
Word Count: ${testResponse.data.wordCount}
Processing Time: ${processingTime}ms`
      });
    } else {
      res.json({
        success: false,
        error: testResponse.data.error,
        details: testResponse.data.details,
        processingTime: processingTime,
        debugInfo: `Test failed
URL: ${url}
Error: ${testResponse.data.error}
Processing Time: ${processingTime}ms`
      });
    }
    
  } catch (error) {
    console.error('Enhanced scraping test failed:', error);
    
    res.json({
      success: false,
      error: error.message,
      details: 'Test request failed',
      debugInfo: `Test error
URL: ${url}
Error: ${error.message}
Timestamp: ${new Date().toISOString()}`
    });
  }
}



