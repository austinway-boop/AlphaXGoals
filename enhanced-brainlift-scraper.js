// Enhanced BrainLift Web Scraper - Local Testing Server
// Run with: node enhanced-brainlift-scraper.js
// Then visit: http://localhost:4580

import express from 'express';
import axios from 'axios';
import { JSDOM } from 'jsdom';

const app = express();
const PORT = 4580;

app.use(express.json());
app.use(express.static('public'));

// Main scraper interface
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced BrainLift Scraper - Local Testing</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1400px;
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
            font-size: 2.8em;
        }
        .subtitle {
            text-align: center;
            color: #718096;
            font-size: 1.3em;
            margin-bottom: 40px;
        }
        .status-banner {
            background: linear-gradient(135deg, #48bb78, #38a169);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
            font-size: 1.1em;
            font-weight: 600;
        }
        .input-group {
            margin-bottom: 25px;
        }
        label {
            display: block;
            font-weight: 600;
            margin-bottom: 8px;
            color: #4a5568;
        }
        input[type="url"] {
            width: 100%;
            padding: 18px 25px;
            border: 2px solid #e2e8f0;
            border-radius: 15px;
            font-size: 16px;
            transition: all 0.3s ease;
            box-sizing: border-box;
        }
        input[type="url"]:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
            transform: scale(1.01);
        }
        .button-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 40px 0;
        }
        .extract-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 25px 30px;
            border-radius: 15px;
            font-size: 17px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .extract-btn:before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s;
        }
        .extract-btn:hover:before {
            left: 100%;
        }
        .extract-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 35px rgba(102, 126, 234, 0.4);
        }
        .extract-btn:active {
            transform: translateY(-1px);
        }
        .extract-btn:disabled {
            background: #cbd5e0;
            cursor: not-allowed;
            transform: none;
        }
        .method-desc {
            font-size: 0.9em;
            margin-top: 8px;
            opacity: 0.9;
            line-height: 1.4;
        }
        .results {
            background: #f7fafc;
            border-radius: 15px;
            padding: 30px;
            margin-top: 30px;
            border-left: 6px solid #48bb78;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .error {
            border-left-color: #f56565;
            background: #fed7d7;
        }
        .loading {
            text-align: center;
            padding: 50px;
            background: #e6fffa;
            border-left-color: #38b2ac;
        }
        .spinner {
            border: 5px solid #e2e8f0;
            border-top: 5px solid #667eea;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 25px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .word-count {
            font-size: 4em;
            font-weight: bold;
            color: #667eea;
            text-align: center;
            margin: 30px 0;
            text-shadow: 0 3px 6px rgba(0,0,0,0.1);
            text-decoration: underline;
            text-decoration-color: #48bb78;
        }
        .method-badge {
            display: inline-block;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 1em;
            font-weight: 600;
            margin: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 6px 12px rgba(0,0,0,0.1);
            border: 2px solid #f7fafc;
            transition: all 0.3s ease;
        }
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.15);
            border-color: #667eea;
        }
        .stat-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 8px;
        }
        .stat-label {
            color: #718096;
            font-size: 1em;
            font-weight: 600;
        }
        .content-preview {
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            padding: 25px;
            margin: 25px 0;
            max-height: 500px;
            overflow-y: auto;
            white-space: pre-line;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.95em;
            line-height: 1.6;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }
        details {
            margin: 25px 0;
        }
        summary {
            font-weight: 600;
            cursor: pointer;
            padding: 15px;
            background: #f7fafc;
            border-radius: 10px;
            margin-bottom: 15px;
            border: 1px solid #e2e8f0;
            transition: all 0.3s ease;
        }
        summary:hover {
            background: #edf2f7;
            border-color: #cbd5e0;
        }
        .quick-tests {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin: 30px 0;
        }
        .quick-test {
            background: #f0f8ff;
            border: 2px solid #4299e1;
            padding: 20px;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
        }
        .quick-test:hover {
            background: #bee3f8;
            transform: translateY(-3px);
        }
        .progress-steps {
            list-style: none;
            padding: 0;
            margin: 25px 0;
        }
        .progress-steps li {
            padding: 12px 0;
            border-left: 4px solid #e2e8f0;
            padding-left: 20px;
            margin-bottom: 8px;
            transition: all 0.3s ease;
            font-size: 1.1em;
        }
        .progress-steps li.active {
            border-left-color: #667eea;
            background: linear-gradient(90deg, #f0f4ff, transparent);
            border-radius: 0 10px 10px 0;
            font-weight: 600;
        }
        .progress-steps li.completed {
            border-left-color: #48bb78;
            color: #2d3748;
        }
        .progress-steps li.error {
            border-left-color: #f56565;
            color: #c53030;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧠 Enhanced BrainLift Scraper</h1>
        <div class="subtitle">Local Testing Server - No API Keys Required!</div>
        
        <div class="status-banner">
            🚀 Running on http://localhost:${PORT} - Ready for enhanced BrainLift scraping!
        </div>
        
        <div class="input-group">
            <label for="brainliftUrl">BrainLift Document URL:</label>
            <input 
                type="url" 
                id="brainliftUrl" 
                placeholder="https://workflowy.com/s/your-document or https://docs.google.com/document/..." 
                value="https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe"
            />
        </div>
        
        <div class="button-grid">
            <button class="extract-btn" onclick="extractWithMethod('smart')">
                🤖 Smart Extraction
                <div class="method-desc">Auto-detects document type and uses optimal scraping strategy</div>
            </button>
            <button class="extract-btn" onclick="extractWithMethod('enhanced')">
                🌟 Enhanced Scraping
                <div class="method-desc">Advanced multi-method extraction with intelligent fallbacks</div>
            </button>
            <button class="extract-btn" onclick="extractWithMethod('fast')">
                ⚡ Fast Extraction
                <div class="method-desc">Quick and efficient scraping for immediate results</div>
            </button>
            <button class="extract-btn" onclick="extractWithMethod('aggressive')">
                🚀 Aggressive Mode
                <div class="method-desc">Maximum effort extraction using all available techniques</div>
            </button>
        </div>
        
        <div class="quick-tests">
            <div class="quick-test" onclick="setUrlAndTest('https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe')">
                📋 Test WorkFlowy<br>
                <small>Default shared outline</small>
            </div>
            <div class="quick-test" onclick="setUrlAndTest('https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit')">
                📄 Test Google Doc<br>
                <small>Public document</small>
            </div>
            <div class="quick-test" onclick="clearResults()">
                🗑️ Clear Results<br>
                <small>Reset interface</small>
            </div>
            <div class="quick-test" onclick="showInfo()">
                ℹ️ Show Info<br>
                <small>About enhanced scraping</small>
            </div>
        </div>
        
        <div id="results" style="display: none;"></div>
    </div>

    <script>
        let currentExtraction = null;
        
        async function extractWithMethod(method) {
            const url = document.getElementById('brainliftUrl').value.trim();
            if (!url) {
                alert('Please enter a BrainLift document URL');
                return;
            }
            
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.className = 'results loading';
            
            const methodNames = {
                'smart': 'Smart Auto-Detection',
                'enhanced': 'Enhanced Multi-Method',
                'fast': 'Fast Extraction',
                'aggressive': 'Aggressive Maximum Effort'
            };
            
            results.innerHTML = \`
                <div class="spinner"></div>
                <h3>🧪 Extracting with \${methodNames[method]}...</h3>
                <ul class="progress-steps" id="progressSteps">
                    <li class="active">🔍 Analyzing document type</li>
                    <li>📥 Loading content</li>
                    <li>🔧 Processing data</li>
                    <li>📊 Counting words</li>
                    <li>✅ Complete</li>
                </ul>
                <p><strong>Note:</strong> This may take 10-45 seconds depending on document size and method.</p>
            \`;
            
            // Disable all buttons during extraction
            document.querySelectorAll('.extract-btn').forEach(btn => btn.disabled = true);
            
            // Simulate progress updates
            simulateProgress();
            
            try {
                const response = await fetch('/extract', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, method })
                });
                
                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                
                const data = await response.json();
                displayResults(data, method);
                
            } catch (error) {
                results.className = 'results error';
                results.innerHTML = \`
                    <h2>❌ Extraction Failed</h2>
                    <p><strong>Error:</strong> \${error.message}</p>
                    <p><strong>URL:</strong> \${url}</p>
                    <p><strong>Method:</strong> \${methodNames[method]}</p>
                    
                    <h3>💡 Troubleshooting:</h3>
                    <ul>
                        <li>Check if the URL is accessible and public</li>
                        <li>Ensure the document has content to extract</li>
                        <li>Try a different extraction method</li>
                        <li>For WorkFlowy: Make sure link sharing is enabled</li>
                        <li>For Google Docs: Verify public access is allowed</li>
                    </ul>
                \`;
            } finally {
                document.querySelectorAll('.extract-btn').forEach(btn => btn.disabled = false);
            }
        }
        
        function displayResults(data, method) {
            const results = document.getElementById('results');
            
            if (data.success) {
                const qualityScore = getQualityScore(data.wordCount);
                const isHighQuality = data.wordCount >= 1000;
                
                results.className = 'results';
                results.innerHTML = \`
                    <h2>🎉 Extraction Successful!</h2>
                    
                    <div class="word-count">\${data.wordCount.toLocaleString()}</div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <span class="method-badge">\${data.extractionMethod || method}</span>
                        <span class="method-badge" style="background: \${isHighQuality ? '#48bb78' : '#ed8936'}">\${qualityScore}% Quality</span>
                    </div>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">\${(data.contentLength || 0).toLocaleString()}</div>
                            <div class="stat-label">Characters</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">\${Math.round((data.processingTime || 0) / 1000)}s</div>
                            <div class="stat-label">Processing Time</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">\${data.methodsAttempted || 1}</div>
                            <div class="stat-label">Methods Used</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">\${isHighQuality ? '✅' : '⚠️'}</div>
                            <div class="stat-label">Content Quality</div>
                        </div>
                    </div>
                    
                    \${data.extractedText ? \`
                        <details>
                            <summary>📝 View Extracted Content (\${data.extractedText.length.toLocaleString()} chars)</summary>
                            <div class="content-preview">\${data.extractedText.substring(0, 8000)}\${data.extractedText.length > 8000 ? '\\n\\n... (content truncated for display - full content extracted successfully)' : ''}</div>
                        </details>
                    \` : ''}
                    
                    \${data.debugInfo ? \`
                        <details>
                            <summary>🔧 Technical Details & Debug Info</summary>
                            <div class="content-preview">\${data.debugInfo}</div>
                        </details>
                    \` : ''}
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <button class="extract-btn" onclick="extractWithMethod('\${method}')" style="padding: 15px 30px; font-size: 16px;">
                            🔄 Extract Again
                        </button>
                        <button class="extract-btn" onclick="clearResults()" style="padding: 15px 30px; font-size: 16px; background: #718096;">
                            🗑️ Clear Results
                        </button>
                    </div>
                \`;
            } else {
                results.className = 'results error';
                results.innerHTML = \`
                    <h2>❌ Extraction Failed</h2>
                    <p><strong>Error:</strong> \${data.error}</p>
                    \${data.details ? \`<p><strong>Details:</strong> \${data.details}</p>\` : ''}
                    \${data.suggestions ? \`
                        <h3>💡 Suggestions:</h3>
                        <ul>\${data.suggestions.map(s => \`<li>\${s}</li>\`).join('')}</ul>
                    \` : ''}
                    \${data.debugInfo ? \`
                        <details>
                            <summary>🔧 Debug Information</summary>
                            <div class="content-preview">\${data.debugInfo}</div>
                        </details>
                    \` : ''}
                \`;
            }
        }
        
        function getQualityScore(wordCount) {
            if (wordCount >= 5000) return 100;
            if (wordCount >= 2000) return 90;
            if (wordCount >= 1000) return 80;
            if (wordCount >= 500) return 65;
            if (wordCount >= 200) return 45;
            return Math.max(20, Math.round(wordCount / 10));
        }
        
        function setUrlAndTest(url) {
            document.getElementById('brainliftUrl').value = url;
            extractWithMethod('smart');
        }
        
        function clearResults() {
            document.getElementById('results').style.display = 'none';
            document.getElementById('brainliftUrl').focus();
        }
        
        function showInfo() {
            alert('🧠 Enhanced BrainLift Scraper\\n\\n✅ No API keys required\\n✅ Multiple extraction methods\\n✅ Smart fallback strategies\\n✅ Works with WorkFlowy, Google Docs, and more\\n\\nThis local server lets you test enhanced scraping before deploying to production!');
        }
        
        function simulateProgress() {
            let step = 0;
            const interval = setInterval(() => {
                const steps = document.querySelectorAll('#progressSteps li');
                if (steps.length === 0) {
                    clearInterval(interval);
                    return;
                }
                
                steps.forEach((s, i) => {
                    s.classList.remove('active', 'completed', 'error');
                    if (i < step) s.classList.add('completed');
                    else if (i === step) s.classList.add('active');
                });
                
                step++;
                if (step >= 5) clearInterval(interval);
            }, 2000);
        }
        
        // Auto-focus URL input
        document.getElementById('brainliftUrl').focus();
    </script>
</body>
</html>
    `);
});

// Enhanced extraction endpoint
app.post('/extract', async (req, res) => {
    const { url, method } = req.body;
    const startTime = Date.now();
    let debugInfo = '';
    
    if (!url) {
        return res.status(400).json({ 
            success: false, 
            error: 'Document URL is required',
            suggestions: ['Please provide a valid BrainLift document URL']
        });
    }
    
    console.log(`🧠 Enhanced BrainLift extraction starting: ${method} method for ${url}`);
    debugInfo += `Enhanced BrainLift Extraction\n`;
    debugInfo += `========================\n`;
    debugInfo += `Method: ${method}\n`;
    debugInfo += `URL: ${url}\n`;
    debugInfo += `Started: ${new Date().toISOString()}\n\n`;
    
    try {
        const urlObj = new URL(url);
        let result = null;
        
        // Determine extraction strategy based on method and URL
        switch (method) {
            case 'smart':
                result = await smartExtraction(url, urlObj, debugInfo);
                break;
            case 'enhanced':
                result = await enhancedExtraction(url, urlObj, debugInfo);
                break;
            case 'fast':
                result = await fastExtraction(url, urlObj, debugInfo);
                break;
            case 'aggressive':
                result = await aggressiveExtraction(url, urlObj, debugInfo);
                break;
            default:
                throw new Error('Invalid extraction method specified');
        }
        
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ Extraction successful: ${result.wordCount} words in ${processingTime}ms`);
        
        res.json({
            success: true,
            wordCount: result.wordCount,
            contentLength: result.content.length,
            extractedText: result.content,
            extractionMethod: result.method,
            processingTime,
            methodsAttempted: result.methodsAttempted || 1,
            debugInfo: debugInfo + (result.debugInfo || '')
        });
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        console.error('💥 Enhanced extraction error:', error);
        
        debugInfo += `\n❌ EXTRACTION FAILED\n`;
        debugInfo += `Error: ${error.message}\n`;
        debugInfo += `Processing Time: ${processingTime}ms\n`;
        debugInfo += `Stack: ${error.stack}\n`;
        
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Enhanced extraction failed - this could be due to network issues, document access restrictions, or server limitations',
            suggestions: [
                'Verify the document is publicly accessible',
                'Try a different extraction method',
                'Check if the URL is correct and complete',
                'Ensure the document has content to extract',
                'For WorkFlowy: Make sure link sharing is set to "Anyone with link can view"',
                'For Google Docs: Verify sharing permissions are set to public'
            ],
            debugInfo: debugInfo,
            processingTime
        });
    }
});

// Smart extraction - automatically chooses best method
async function smartExtraction(url, urlObj, debugInfo) {
    debugInfo += 'SMART EXTRACTION - Auto-detecting best approach\\n';
    
    // Analyze URL to determine optimal extraction method
    if (urlObj.hostname.includes('workflowy.com')) {
        debugInfo += 'Detected: WorkFlowy document - using enhanced WorkFlowy extraction\\n';
        return await enhancedWorkFlowyExtraction(url, debugInfo);
    } else if (urlObj.hostname.includes('docs.google.com')) {
        debugInfo += 'Detected: Google Docs - using document-specific extraction\\n';
        return await googleDocsExtraction(url, debugInfo);
    } else {
        debugInfo += 'Detected: Generic document - using universal extraction\\n';
        return await genericExtraction(url, debugInfo);
    }
}

// Enhanced extraction with multiple fallback methods
async function enhancedExtraction(url, urlObj, debugInfo) {
    debugInfo += 'ENHANCED EXTRACTION - Multi-method approach with intelligent fallbacks\\n';
    
    const methods = [];
    let bestResult = { content: '', wordCount: 0, method: 'none' };
    
    // Method 1: HTTP-based extraction
    try {
        debugInfo += '\\n1. Attempting HTTP-based extraction...\\n';
        const httpResult = await httpExtraction(url, debugInfo);
        methods.push(httpResult);
        if (httpResult.wordCount > bestResult.wordCount) {
            bestResult = httpResult;
            debugInfo += `   ✅ HTTP extraction successful: ${httpResult.wordCount} words\n`;
        }
    } catch (e) {
        debugInfo += `   ❌ HTTP extraction failed: ${e.message}\n`;
    }
    
    // Method 2: Document-specific extraction
    if (bestResult.wordCount < 500) {
        try {
            debugInfo += '\\n2. Attempting document-specific extraction...\\n';
            let specificResult;
            
            if (urlObj.hostname.includes('workflowy.com')) {
                specificResult = await enhancedWorkFlowyExtraction(url, debugInfo);
            } else if (urlObj.hostname.includes('docs.google.com')) {
                specificResult = await googleDocsExtraction(url, debugInfo);
            } else {
                specificResult = await genericExtraction(url, debugInfo);
            }
            
            methods.push(specificResult);
            if (specificResult.wordCount > bestResult.wordCount) {
                bestResult = specificResult;
                debugInfo += `   ✅ Specific extraction successful: ${specificResult.wordCount} words\n`;
            }
        } catch (e) {
            debugInfo += `   ❌ Specific extraction failed: ${e.message}\n`;
        }
    }
    
    bestResult.methodsAttempted = methods.length;
    bestResult.debugInfo = debugInfo + `\n🎯 BEST RESULT: ${bestResult.method} with ${bestResult.wordCount} words\n`;
    
    return bestResult;
}

// Fast extraction for quick results
async function fastExtraction(url, urlObj, debugInfo) {
    debugInfo += 'FAST EXTRACTION - Prioritizing speed over completeness\\n';
    
    // Quick HTTP extraction with shorter timeouts
    try {
        const response = await axios.get(url, {
            timeout: 10000, // Shorter timeout for speed
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });
        
        const dom = new JSDOM(response.data);
        const document = dom.window.document;
        
        // Quick cleanup
        document.querySelectorAll('script, style, noscript').forEach(el => el.remove());
        
        const content = (document.body.textContent || '').replace(/\\s+/g, ' ').trim();
        const wordCount = (content.match(/\\b[\\p{L}\\p{N}'-]+\\b/gu) || []).length;
        
        debugInfo += `Fast extraction completed: ${wordCount} words, ${content.length} characters\n`;
        
        return {
            content,
            wordCount,
            method: 'fast_extraction',
            debugInfo
        };
        
    } catch (error) {
        throw new Error(`Fast extraction failed: ${error.message}`);
    }
}

// Aggressive extraction with maximum effort
async function aggressiveExtraction(url, urlObj, debugInfo) {
    debugInfo += 'AGGRESSIVE EXTRACTION - Maximum effort with all available techniques\\n';
    
    const results = [];
    const userAgents = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
    ];
    
    // Try multiple user agents
    for (let i = 0; i < userAgents.length; i++) {
        try {
            debugInfo += `\n${i + 1}. Attempting extraction with user agent ${i + 1}...\n`;
            
            const response = await axios.get(url, {
                timeout: 30000,
                headers: {
                    'User-Agent': userAgents[i],
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });
            
            const content = extractTextFromHTML(response.data);
            const wordCount = (content.match(/\\b[\\p{L}\\p{N}'-]+\\b/gu) || []).length;
            
            if (wordCount > 50) {
                results.push({
                    content,
                    wordCount,
                    method: \`aggressive_ua\${i + 1}\`,
                    score: wordCount
                });
                debugInfo += `   ✅ User agent ${i + 1} successful: ${wordCount} words\n`;
                
                if (wordCount > 2000) break; // Good enough result
            }
        } catch (e) {
            debugInfo += `   ❌ User agent ${i + 1} failed: ${e.message}\n`;
        }
    }
    
    if (results.length === 0) {
        throw new Error('All aggressive extraction attempts failed');
    }
    
    // Return best result
    const bestResult = results.reduce((best, current) => 
        current.score > best.score ? current : best
    );
    
    bestResult.methodsAttempted = results.length;
    bestResult.debugInfo = debugInfo + `\n🎯 AGGRESSIVE RESULT: Best of ${results.length} attempts - ${bestResult.wordCount} words\n`;
    
    return bestResult;
}

// Enhanced WorkFlowy extraction
async function enhancedWorkFlowyExtraction(url, debugInfo) {
    debugInfo += 'ENHANCED WORKFLOWY EXTRACTION\\n';
    
    try {
        const response = await axios.get(url, {
            timeout: 25000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });
        
        const htmlContent = response.data;
        debugInfo += `WorkFlowy response received: ${htmlContent.length} characters\n`;
        
        // Extract share_id for API attempts
        const shareIdMatch = htmlContent.match(/PROJECT_TREE_DATA_URL_PARAMS\\s*=\\s*{\\s*"share_id"\\s*:\\s*"([^"]+)"/);
        const shareId = shareIdMatch ? shareIdMatch[1] : null;
        
        if (shareId) {
            debugInfo += `Found share_id: ${shareId} - attempting API endpoints...\n`;
            
            const apiEndpoints = [
                \`https://workflowy.com/get_initialization_data?share_id=\${shareId}\`,
                \`https://workflowy.com/get_project_tree?share_id=\${shareId}\`
            ];
            
            for (const apiUrl of apiEndpoints) {
                try {
                    const apiResponse = await axios.get(apiUrl, {
                        timeout: 15000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                            'Referer': url
                        }
                    });
                    
                    if (apiResponse.data) {
                        const extractedText = extractTextFromWorkFlowyData(apiResponse.data);
                        if (extractedText && extractedText.length > 100) {
                            const wordCount = (extractedText.match(/\\b[\\p{L}\\p{N}'-]+\\b/gu) || []).length;
                            debugInfo += `WorkFlowy API extraction successful: ${wordCount} words\n`;
                            
                            return {
                                content: extractedText,
                                wordCount,
                                method: 'enhanced_workflowy_api',
                                debugInfo
                            };
                        }
                    }
                } catch (apiError) {
                    debugInfo += `API endpoint failed: ${apiError.message}\n`;
                }
            }
        }
        
        // Fallback to HTML parsing
        debugInfo += 'API extraction failed, falling back to HTML parsing...\\n';
        const dom = new JSDOM(htmlContent);
        const document = dom.window.document;
        
        document.querySelectorAll('script, style, noscript').forEach(el => el.remove());
        
        const content = (document.body.textContent || '').replace(/\\s+/g, ' ').trim();
        const wordCount = (content.match(/\\b[\\p{L}\\p{N}'-]+\\b/gu) || []).length;
        
        debugInfo += `HTML parsing completed: ${wordCount} words\n`;
        
        return {
            content,
            wordCount,
            method: 'enhanced_workflowy_html',
            debugInfo
        };
        
    } catch (error) {
        throw new Error(`Enhanced WorkFlowy extraction failed: ${error.message}`);
    }
}

// Google Docs extraction
async function googleDocsExtraction(url, debugInfo) {
    debugInfo += 'GOOGLE DOCS EXTRACTION\\n';
    
    const docId = url.match(/\\/document\\/d\\/([a-zA-Z0-9-_]+)/)?.[1];
    if (!docId) {
        throw new Error('Could not extract Google Doc ID from URL');
    }
    
    debugInfo += `Document ID: ${docId}\n`;
    
    // Try plain text export first
    try {
        const exportUrl = \`https://docs.google.com/document/d/\${docId}/export?format=txt\`;
        debugInfo += 'Attempting plain text export...\\n';
        
        const response = await axios.get(exportUrl, {
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });
        
        const content = response.data.replace(/\\s+/g, ' ').trim();
        const wordCount = (content.match(/\\b[\\p{L}\\p{N}'-]+\\b/gu) || []).length;
        
        if (content.length > 50) {
            debugInfo += `Plain text export successful: ${wordCount} words\n`;
            
            return {
                content,
                wordCount,
                method: 'google_docs_export',
                debugInfo
            };
        }
    } catch (exportError) {
        debugInfo += `Plain text export failed: ${exportError.message}\n`;
    }
    
    // Fallback to HTML version
    const publicUrl = url.includes('/edit') ? url.replace('/edit', '/pub') : url + '/pub';
    debugInfo += `Attempting HTML version: ${publicUrl}\n`;
    
    const htmlResponse = await axios.get(publicUrl, {
        timeout: 20000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
    });
    
    const content = extractTextFromHTML(htmlResponse.data);
    const wordCount = (content.match(/\\b[\\p{L}\\p{N}'-]+\\b/gu) || []).length;
    
    debugInfo += `HTML extraction completed: ${wordCount} words\n`;
    
    return {
        content,
        wordCount,
        method: 'google_docs_html',
        debugInfo
    };
}

// Generic document extraction
async function genericExtraction(url, debugInfo) {
    debugInfo += 'GENERIC DOCUMENT EXTRACTION\\n';
    
    const response = await axios.get(url, {
        timeout: 25000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
    });
    
    const content = extractTextFromHTML(response.data);
    const wordCount = (content.match(/\\b[\\p{L}\\p{N}'-]+\\b/gu) || []).length;
    
    debugInfo += `Generic extraction completed: ${wordCount} words\n`;
    
    return {
        content,
        wordCount,
        method: 'generic_extraction',
        debugInfo
    };
}

// HTTP-based extraction
async function httpExtraction(url, debugInfo) {
    debugInfo += 'HTTP-BASED EXTRACTION\\n';
    
    const response = await axios.get(url, {
        timeout: 20000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
    });
    
    const content = extractTextFromHTML(response.data);
    const wordCount = (content.match(/\\b[\\p{L}\\p{N}'-]+\\b/gu) || []).length;
    
    debugInfo += `HTTP extraction completed: ${wordCount} words\n`;
    
    return {
        content,
        wordCount,
        method: 'http_extraction',
        debugInfo
    };
}

// Helper function to extract text from HTML
function extractTextFromHTML(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Remove unwanted elements
    document.querySelectorAll('script, style, noscript, nav, footer, aside').forEach(el => el.remove());
    
    // Get text content
    const content = document.body.textContent || document.body.innerText || '';
    return content.replace(/\\s+/g, ' ').trim();
}

// Helper function to extract text from WorkFlowy data structures
function extractTextFromWorkFlowyData(obj, depth = 0) {
    if (depth > 10) return '';
    
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
        const textFields = ['name', 'nm', 'content', 'ct', 'note', 'no', 'text', 'description', 'title'];
        
        for (const field of textFields) {
            if (obj[field] && typeof obj[field] === 'string' && obj[field].trim()) {
                texts.push(obj[field].trim());
            }
        }
        
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
    console.log(`\n🧠 Enhanced BrainLift Scraper LOCAL SERVER\n`);
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(\`✨ Features: Smart extraction, enhanced scraping, fast mode, aggressive mode\`);
    console.log(\`🎯 No API keys required - pure web scraping!\`);
    console.log(`📋 Ready to test enhanced BrainLift content extraction\n`);
});
