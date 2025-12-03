// Comprehensive Test Suite for Enhanced BrainLift Scraping
// Run with: node test-enhanced-scraper.js
// Then visit: http://localhost:4590

import express from 'express';
import axios from 'axios';

const app = express();
const PORT = 4590;

app.use(express.json());

// Main test interface
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced BrainLift Scraping Test Suite</title>
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
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .subtitle {
            text-align: center;
            color: #718096;
            font-size: 1.3em;
            margin-bottom: 40px;
        }
        .test-banner {
            background: linear-gradient(135deg, #48bb78, #38a169);
            color: white;
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            margin-bottom: 35px;
            font-size: 1.2em;
            font-weight: 600;
        }
        .test-section {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 15px;
            margin: 30px 0;
            border-left: 6px solid #667eea;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }
        .url-input {
            width: 100%;
            padding: 18px 25px;
            border: 2px solid #e2e8f0;
            border-radius: 15px;
            font-size: 17px;
            margin: 15px 0;
            box-sizing: border-box;
            transition: all 0.3s ease;
        }
        .url-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
            transform: scale(1.01);
        }
        .test-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 18px 30px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            margin: 8px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        .test-btn:before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s;
        }
        .test-btn:hover:before {
            left: 100%;
        }
        .test-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 25px rgba(102, 126, 234, 0.3);
        }
        .test-btn:disabled {
            background: #cbd5e0;
            cursor: not-allowed;
            transform: none;
        }
        .test-btn.secondary {
            background: linear-gradient(135deg, #48bb78, #38a169);
        }
        .test-btn.warning {
            background: linear-gradient(135deg, #ed8936, #dd6b20);
        }
        .test-btn.info {
            background: linear-gradient(135deg, #4299e1, #3182ce);
        }
        .results {
            background: #f0fff4;
            border: 1px solid #48bb78;
            border-left: 6px solid #48bb78;
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
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
            border: 5px solid #e2e8f0;
            border-top: 5px solid #667eea;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            animation: spin 1s linear infinite;
            margin: 0 auto 25px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .comparison-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 25px;
            margin: 30px 0;
        }
        .comparison-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            border: 2px solid #f7fafc;
            transition: all 0.3s ease;
        }
        .comparison-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.15);
            border-color: #667eea;
        }
        .comparison-card.success {
            border-color: #48bb78;
        }
        .comparison-card.error {
            border-color: #f56565;
        }
        .word-count {
            font-size: 3.5em;
            font-weight: bold;
            color: #667eea;
            text-align: center;
            margin: 20px 0;
            text-shadow: 0 3px 6px rgba(0,0,0,0.1);
        }
        .method-badge {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 0.9em;
            font-weight: 600;
            display: inline-block;
            margin: 5px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .success-badge {
            background: linear-gradient(135deg, #48bb78, #38a169);
        }
        .error-badge {
            background: linear-gradient(135deg, #f56565, #e53e3e);
        }
        .performance-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin: 25px 0;
        }
        .stat {
            text-align: center;
            padding: 20px;
            background: #f7fafc;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            transition: all 0.3s ease;
        }
        .stat:hover {
            background: #edf2f7;
            transform: translateY(-2px);
        }
        .stat-value {
            font-size: 2.2em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 0.95em;
            color: #4a5568;
            font-weight: 600;
        }
        .quick-links {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .quick-link {
            background: #e6fffa;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            border: 2px solid #38b2ac;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 600;
        }
        .quick-link:hover {
            background: #b2f5ea;
            transform: translateY(-3px);
            box-shadow: 0 8px 16px rgba(56, 178, 172, 0.2);
        }
        details {
            margin: 25px 0;
        }
        summary {
            font-weight: 600;
            cursor: pointer;
            padding: 18px;
            background: #f7fafc;
            border-radius: 12px;
            margin-bottom: 15px;
            border: 1px solid #e2e8f0;
            transition: all 0.3s ease;
        }
        summary:hover {
            background: #edf2f7;
            border-color: #cbd5e0;
        }
        pre {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 10px;
            white-space: pre-wrap;
            max-height: 500px;
            overflow-y: auto;
            font-size: 0.9em;
            line-height: 1.5;
            border: 1px solid #e2e8f0;
        }
        .progress-indicator {
            background: #f0f8ff;
            border: 2px solid #4299e1;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }
        .test-info {
            background: #fffaf0;
            border: 2px solid #ed8936;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Enhanced Scraping Test Suite</h1>
        <div class="subtitle">Comprehensive testing for BrainLift content extraction</div>
        
        <div class="test-banner">
            🚀 Local Test Server Running on http://localhost:${PORT}
        </div>
        
        <div class="test-section">
            <h2>🔬 Single URL Testing</h2>
            <p>Test the enhanced scraping with any BrainLift document URL</p>
            <input type="url" class="url-input" id="customUrl" 
                   placeholder="Enter BrainLift document URL..." 
                   value="https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe" />
            <div>
                <button class="test-btn" onclick="testCustomUrl()">🚀 Test URL</button>
                <button class="test-btn secondary" onclick="testExistingAPI()">⚙️ Test Existing API</button>
            </div>
        </div>
        
        <div class="test-section">
            <h2>⚖️ Method Comparison</h2>
            <p>Compare different extraction methods side-by-side</p>
            <div>
                <button class="test-btn" onclick="compareAllMethods()">📊 Compare All Methods</button>
                <button class="test-btn info" onclick="compareTwoMethods()">⚖️ Compare Two Best</button>
            </div>
        </div>
        
        <div class="test-section">
            <h2>🏃‍♂️ Performance Testing</h2>
            <p>Test speed, reliability, and consistency</p>
            <div>
                <button class="test-btn" onclick="performanceTest()">🏃‍♂️ Performance Test</button>
                <button class="test-btn warning" onclick="stressTest()">⚡ Stress Test</button>
            </div>
        </div>
        
        <div class="quick-links">
            <div class="quick-link" onclick="setAndTest('https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe')">
                📋 Test WorkFlowy<br>
                <small>Default shared outline</small>
            </div>
            <div class="quick-link" onclick="setAndTest('https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit')">
                📄 Test Google Doc<br>
                <small>Public document</small>
            </div>
            <div class="quick-link" onclick="clearResults()">
                🗑️ Clear Results<br>
                <small>Reset interface</small>
            </div>
            <div class="quick-link" onclick="showTestInfo()">
                ℹ️ Test Info<br>
                <small>About this suite</small>
            </div>
        </div>
        
        <div id="results" style="display: none;"></div>
    </div>

    <script>
        async function testCustomUrl() {
            const url = document.getElementById('customUrl').value.trim();
            if (!url) {
                alert('Please enter a URL to test');
                return;
            }
            await runTest('single', { url });
        }
        
        async function testExistingAPI() {
            const url = document.getElementById('customUrl').value.trim() || 
                       'https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe';
            await runTest('api', { url });
        }
        
        async function compareAllMethods() {
            const url = document.getElementById('customUrl').value.trim() || 
                       'https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe';
            await runTest('comparison', { url });
        }
        
        async function compareTwoMethods() {
            const url = document.getElementById('customUrl').value.trim() || 
                       'https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe';
            await runTest('two_methods', { url });
        }
        
        async function performanceTest() {
            const url = document.getElementById('customUrl').value.trim() || 
                       'https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe';
            await runTest('performance', { url });
        }
        
        async function stressTest() {
            const url = document.getElementById('customUrl').value.trim() || 
                       'https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe';
            if (confirm('This will run multiple intensive tests. Continue?')) {
                await runTest('stress', { url });
            }
        }
        
        async function runTest(testType, params) {
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.className = 'results loading';
            
            const testNames = {
                'single': 'Single URL Test',
                'api': 'Existing API Test', 
                'comparison': 'Method Comparison',
                'two_methods': 'Two Method Comparison',
                'performance': 'Performance Test',
                'stress': 'Stress Test'
            };
            
            results.innerHTML = \`
                <div class="spinner"></div>
                <h3>🧪 Running \${testNames[testType]}...</h3>
                <div class="progress-indicator">
                    <p><strong>Test URL:</strong> \${params.url}</p>
                    <p><strong>Expected Duration:</strong> \${getExpectedDuration(testType)}</p>
                    <p>Please wait while we test the enhanced scraping capabilities...</p>
                </div>
            \`;
            
            document.querySelectorAll('.test-btn').forEach(btn => btn.disabled = true);
            
            try {
                const response = await fetch('/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ testType, ...params })
                });
                
                const data = await response.json();
                displayResults(data, testType);
                
            } catch (error) {
                results.className = 'results error';
                results.innerHTML = \`
                    <h2>❌ Test Failed</h2>
                    <p><strong>Network Error:</strong> \${error.message}</p>
                    <div class="test-info">
                        <h4>💡 Troubleshooting:</h4>
                        <ul>
                            <li>Make sure the enhanced scraper server is running</li>
                            <li>Check if the URL is accessible</li>
                            <li>Verify your internet connection</li>
                            <li>Try running the test again</li>
                        </ul>
                    </div>
                \`;
            } finally {
                document.querySelectorAll('.test-btn').forEach(btn => btn.disabled = false);
            }
        }
        
        function displayResults(data, testType) {
            const results = document.getElementById('results');
            
            if (testType === 'comparison' && data.results) {
                displayComparisonResults(data, results);
            } else if (testType === 'performance' && data.statistics) {
                displayPerformanceResults(data, results);
            } else if (testType === 'stress' && data.summary) {
                displayStressResults(data, results);
            } else if (data.success) {
                displaySingleResults(data, results, testType);
            } else {
                displayErrorResults(data, results, testType);
            }
        }
        
        function displaySingleResults(data, results, testType) {
            const isHighQuality = data.wordCount >= 1000;
            const qualityScore = getQualityScore(data.wordCount);
            
            results.className = 'results';
            results.innerHTML = \`
                <h2>✅ Test Successful!</h2>
                
                <div class="word-count">\${data.wordCount.toLocaleString()}</div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <span class="method-badge">\${data.extractionMethod || 'Enhanced'}</span>
                    <span class="method-badge \${isHighQuality ? 'success-badge' : 'error-badge'}">\${qualityScore}% Quality</span>
                </div>
                
                <div class="performance-stats">
                    <div class="stat">
                        <div class="stat-value">\${data.wordCount.toLocaleString()}</div>
                        <div class="stat-label">Words</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">\${(data.contentLength || 0).toLocaleString()}</div>
                        <div class="stat-label">Characters</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">\${Math.round((data.processingTime || 0) / 1000)}s</div>
                        <div class="stat-label">Time</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">\${data.methodsAttempted || 1}</div>
                        <div class="stat-label">Methods</div>
                    </div>
                </div>
                
                \${data.extractedText ? \`
                    <details>
                        <summary>📝 Extracted Content Preview</summary>
                        <pre>\${data.extractedText.substring(0, 5000)}\${data.extractedText.length > 5000 ? '\\n\\n... (truncated for display)' : ''}</pre>
                    </details>
                \` : ''}
                
                \${data.debugInfo ? \`
                    <details>
                        <summary>🔧 Debug Information</summary>
                        <pre>\${data.debugInfo}</pre>
                    </details>
                \` : ''}
            \`;
        }
        
        function displayComparisonResults(data, results) {
            results.className = 'results';
            results.innerHTML = \`
                <h2>📊 Method Comparison Results</h2>
                
                <div class="performance-stats">
                    <div class="stat">
                        <div class="stat-value">\${data.summary.totalMethods}</div>
                        <div class="stat-label">Methods Tested</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">\${data.summary.successfulMethods}</div>
                        <div class="stat-label">Successful</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">\${data.summary.bestWordCount.toLocaleString()}</div>
                        <div class="stat-label">Best Word Count</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">\${Math.round(data.summary.fastestTime / 1000)}s</div>
                        <div class="stat-label">Fastest Time</div>
                    </div>
                </div>
                
                <div class="comparison-grid">
                    \${data.results.map(result => \`
                        <div class="comparison-card \${result.success ? 'success' : 'error'}">
                            <h4>\${result.method}</h4>
                            <div class="word-count" style="font-size: 2.5em; margin: 15px 0;">
                                \${result.success ? result.wordCount.toLocaleString() : '❌'}
                            </div>
                            <div class="performance-stats" style="grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div class="stat" style="padding: 10px;">
                                    <div class="stat-value" style="font-size: 1.5em;">\${Math.round(result.processingTime / 1000)}s</div>
                                    <div class="stat-label">Time</div>
                                </div>
                                <div class="stat" style="padding: 10px;">
                                    <div class="stat-value" style="font-size: 1.5em;">\${result.success ? (result.contentLength || 0).toLocaleString() : '0'}</div>
                                    <div class="stat-label">Chars</div>
                                </div>
                            </div>
                            \${result.success ? 
                                '<span class="method-badge success-badge">✅ Success</span>' : 
                                \`<span class="method-badge error-badge">❌ Failed</span><br><small>\${result.error || 'Unknown error'}</small>\`
                            }
                        </div>
                    \`).join('')}
                </div>
                
                <details>
                    <summary>📊 Detailed Comparison Data</summary>
                    <pre>\${JSON.stringify(data, null, 2)}</pre>
                </details>
            \`;
        }
        
        function displayPerformanceResults(data, results) {
            results.className = 'results';
            results.innerHTML = \`
                <h2>🏃‍♂️ Performance Test Results</h2>
                
                <div class="performance-stats">
                    <div class="stat">
                        <div class="stat-value">\${data.statistics.successRate.toFixed(1)}%</div>
                        <div class="stat-label">Success Rate</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">\${Math.round(data.statistics.averageTime / 1000)}s</div>
                        <div class="stat-label">Avg Time</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">\${Math.round(data.statistics.minTime / 1000)}s</div>
                        <div class="stat-label">Best Time</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">\${Math.round(data.statistics.maxTime / 1000)}s</div>
                        <div class="stat-label">Worst Time</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">\${data.statistics.consistentWordCount ? '✅' : '❌'}</div>
                        <div class="stat-label">Consistent</div>
                    </div>
                </div>
                
                <h3>Individual Test Runs:</h3>
                <div class="comparison-grid">
                    \${data.results.map((result, i) => \`
                        <div class="comparison-card \${result.success ? 'success' : 'error'}">
                            <h4>Run #\${i + 1}</h4>
                            <div class="word-count" style="font-size: 2em; margin: 10px 0;">
                                \${result.success ? result.wordCount.toLocaleString() : '❌'}
                            </div>
                            <div class="performance-stats" style="grid-template-columns: 1fr; gap: 5px;">
                                <div class="stat" style="padding: 8px;">
                                    <div class="stat-value" style="font-size: 1.3em;">\${Math.round(result.processingTime / 1000)}s</div>
                                    <div class="stat-label">Time</div>
                                </div>
                            </div>
                            \${result.success ? 
                                \`<span class="method-badge success-badge">\${result.method || 'Enhanced'}</span>\` : 
                                \`<span class="method-badge error-badge">❌ Error</span>\`
                            }
                        </div>
                    \`).join('')}
                </div>
            \`;
        }
        
        function displayStressResults(data, results) {
            results.className = 'results';
            results.innerHTML = \`
                <h2>⚡ Stress Test Results</h2>
                
                <div class="performance-stats">
                    <div class="stat">
                        <div class="stat-value">\${data.summary.totalTests}</div>
                        <div class="stat-label">Total Tests</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">\${data.summary.successfulTests}</div>
                        <div class="stat-label">Successful</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">\${((data.summary.successfulTests / data.summary.totalTests) * 100).toFixed(1)}%</div>
                        <div class="stat-label">Success Rate</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">\${Math.round(data.summary.averageTime / 1000)}s</div>
                        <div class="stat-label">Avg Time</div>
                    </div>
                </div>
                
                <p><strong>Stress Test Summary:</strong> \${data.summary.description}</p>
                
                <details>
                    <summary>📊 Full Stress Test Data</summary>
                    <pre>\${JSON.stringify(data, null, 2)}</pre>
                </details>
            \`;
        }
        
        function displayErrorResults(data, results, testType) {
            results.className = 'results error';
            results.innerHTML = \`
                <h2>❌ Test Failed</h2>
                <p><strong>Error:</strong> \${data.error}</p>
                \${data.details ? \`<p><strong>Details:</strong> \${data.details}</p>\` : ''}
                
                \${data.suggestions ? \`
                    <h3>💡 Suggestions:</h3>
                    <ul>\${data.suggestions.map(s => \`<li>\${s}</li>\`).join('')}</ul>
                \` : ''}
                
                \${data.debugInfo ? \`
                    <details>
                        <summary>🔧 Debug Information</summary>
                        <pre>\${data.debugInfo}</pre>
                    </details>
                \` : ''}
            \`;
        }
        
        function getQualityScore(wordCount) {
            if (wordCount >= 5000) return 100;
            if (wordCount >= 2000) return 90;
            if (wordCount >= 1000) return 75;
            if (wordCount >= 500) return 60;
            return Math.max(25, Math.round(wordCount / 20));
        }
        
        function getExpectedDuration(testType) {
            const durations = {
                'single': '10-30 seconds',
                'api': '15-45 seconds',
                'comparison': '2-5 minutes',
                'two_methods': '30-90 seconds',
                'performance': '1-3 minutes',
                'stress': '3-10 minutes'
            };
            return durations[testType] || '10-60 seconds';
        }
        
        function setAndTest(url) {
            document.getElementById('customUrl').value = url;
            testCustomUrl();
        }
        
        function clearResults() {
            document.getElementById('results').style.display = 'none';
            document.getElementById('customUrl').focus();
        }
        
        function showTestInfo() {
            alert('🧪 Enhanced BrainLift Scraping Test Suite\\n\\n🎯 Purpose: Test and compare different scraping methods\\n✅ Features: Method comparison, performance testing, stress testing\\n🔧 Local server for safe testing before deployment\\n\\nThis suite helps verify that enhanced scraping works properly with your BrainLift documents!');
        }
        
        // Auto-focus URL input
        document.getElementById('customUrl').focus();
    </script>
</body>
</html>
    `);
});

// Test endpoint for all types of tests
app.post('/test', async (req, res) => {
    const { testType, url } = req.body;
    const startTime = Date.now();
    
    console.log(`🧪 Running test suite: ${testType} for URL: ${url}`);
    
    try {
        let result;
        
        switch (testType) {
            case 'single':
            case 'api':
                result = await testSingleExtraction(url);
                break;
                
            case 'comparison':
                result = await testMethodComparison(url);
                break;
                
            case 'two_methods':
                result = await testTwoMethods(url);
                break;
                
            case 'performance':
                result = await testPerformance(url);
                break;
                
            case 'stress':
                result = await testStressTest(url);
                break;
                
            default:
                throw new Error('Invalid test type specified');
        }
        
        const processingTime = Date.now() - startTime;
        result.processingTime = processingTime;
        
        console.log(`✅ Test completed: ${testType} in ${processingTime}ms`);
        res.json(result);
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        console.error('Test failed:', error);
        
        res.json({
            success: false,
            error: error.message,
            details: 'Test execution failed',
            processingTime: processingTime,
            suggestions: [
                'Check if the enhanced scraper server is running (port 4580)',
                'Verify the URL is accessible and public',
                'Ensure the document has content to extract',
                'Try running the test again'
            ]
        });
    }
});

// Test single extraction by calling the enhanced scraper
async function testSingleExtraction(url) {
    console.log(`Testing single extraction for: ${url}`);
    
    try {
        // Call the enhanced scraper server
        const response = await axios.post('http://localhost:4580/extract', {
            url: url,
            method: 'smart'
        }, {
            timeout: 60000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data.success) {
            return {
                success: true,
                wordCount: response.data.wordCount,
                contentLength: response.data.contentLength,
                extractionMethod: response.data.extractionMethod,
                extractedText: response.data.extractedText,
                debugInfo: response.data.debugInfo,
                methodsAttempted: response.data.methodsAttempted
            };
        } else {
            throw new Error(response.data.error || 'Enhanced scraper returned failure');
        }
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            debugInfo: `Single extraction test failed\\nURL: ${url}\\nError: ${error.message}`,
            suggestions: [
                'Make sure the enhanced scraper is running on port 4580',
                'Check if the URL is valid and accessible',
                'Verify the document has content'
            ]
        };
    }
}

// Test multiple methods for comparison
async function testMethodComparison(url) {
    console.log('Testing method comparison for:', url);
    
    const methods = ['smart', 'enhanced', 'fast', 'aggressive'];
    const results = [];
    
    for (const method of methods) {
        const startTime = Date.now();
        
        try {
            const response = await axios.post('http://localhost:4580/extract', {
                url: url,
                method: method
            }, {
                timeout: 90000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            results.push({
                method: method,
                success: response.data.success,
                wordCount: response.data.wordCount || 0,
                contentLength: response.data.contentLength || 0,
                processingTime: Date.now() - startTime,
                extractionMethod: response.data.extractionMethod,
                error: response.data.success ? null : response.data.error
            });
            
        } catch (error) {
            results.push({
                method: method,
                success: false,
                wordCount: 0,
                contentLength: 0,
                processingTime: Date.now() - startTime,
                error: error.message
            });
        }
        
        // Wait between tests to avoid overwhelming the server
        if (method !== methods[methods.length - 1]) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    const successfulResults = results.filter(r => r.success);
    
    return {
        success: true,
        testType: 'comparison',
        results: results,
        summary: {
            totalMethods: methods.length,
            successfulMethods: successfulResults.length,
            bestWordCount: successfulResults.length > 0 ? Math.max(...successfulResults.map(r => r.wordCount)) : 0,
            fastestTime: successfulResults.length > 0 ? Math.min(...successfulResults.map(r => r.processingTime)) : 0,
            averageWordCount: successfulResults.length > 0 ? 
                Math.round(successfulResults.reduce((sum, r) => sum + r.wordCount, 0) / successfulResults.length) : 0
        }
    };
}

// Test two best methods
async function testTwoMethods(url) {
    console.log('Testing two best methods for:', url);
    
    const methods = ['smart', 'enhanced'];
    const results = [];
    
    for (const method of methods) {
        const startTime = Date.now();
        
        try {
            const response = await axios.post('http://localhost:4580/extract', {
                url: url,
                method: method
            }, {
                timeout: 60000
            });
            
            results.push({
                method: method,
                success: response.data.success,
                wordCount: response.data.wordCount || 0,
                processingTime: Date.now() - startTime,
                extractionMethod: response.data.extractionMethod
            });
            
        } catch (error) {
            results.push({
                method: method,
                success: false,
                wordCount: 0,
                processingTime: Date.now() - startTime,
                error: error.message
            });
        }
    }
    
    return {
        success: true,
        testType: 'two_methods',
        results: results
    };
}

// Performance testing with multiple runs
async function testPerformance(url) {
    console.log('Running performance test for:', url);
    
    const runs = 5;
    const results = [];
    
    for (let i = 0; i < runs; i++) {
        const startTime = Date.now();
        
        try {
            const response = await axios.post('http://localhost:4580/extract', {
                url: url,
                method: 'smart'
            }, {
                timeout: 90000
            });
            
            results.push({
                run: i + 1,
                success: response.data.success,
                wordCount: response.data.wordCount || 0,
                processingTime: Date.now() - startTime,
                method: response.data.extractionMethod
            });
            
        } catch (error) {
            results.push({
                run: i + 1,
                success: false,
                wordCount: 0,
                processingTime: Date.now() - startTime,
                error: error.message
            });
        }
        
        // Wait between runs
        if (i < runs - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    const successfulRuns = results.filter(r => r.success);
    const avgTime = successfulRuns.length > 0 ? 
        successfulRuns.reduce((sum, r) => sum + r.processingTime, 0) / successfulRuns.length : 0;
    
    return {
        success: true,
        testType: 'performance',
        runs: runs,
        results: results,
        statistics: {
            successRate: (successfulRuns.length / runs) * 100,
            averageTime: Math.round(avgTime),
            minTime: successfulRuns.length > 0 ? Math.min(...successfulRuns.map(r => r.processingTime)) : 0,
            maxTime: successfulRuns.length > 0 ? Math.max(...successfulRuns.map(r => r.processingTime)) : 0,
            consistentWordCount: successfulRuns.length > 1 ? 
                new Set(successfulRuns.map(r => r.wordCount)).size === 1 : false,
            averageWordCount: successfulRuns.length > 0 ?
                Math.round(successfulRuns.reduce((sum, r) => sum + r.wordCount, 0) / successfulRuns.length) : 0
        }
    };
}

// Stress testing
async function testStressTest(url) {
    console.log('Running stress test for:', url);
    
    // Quick stress test - multiple rapid requests
    const rapidTests = 3;
    const results = [];
    
    console.log('Phase 1: Rapid fire tests...');
    for (let i = 0; i < rapidTests; i++) {
        const startTime = Date.now();
        
        try {
            const response = await axios.post('http://localhost:4580/extract', {
                url: url,
                method: 'fast'
            }, {
                timeout: 45000
            });
            
            results.push({
                phase: 'rapid',
                test: i + 1,
                success: response.data.success,
                wordCount: response.data.wordCount || 0,
                processingTime: Date.now() - startTime
            });
            
        } catch (error) {
            results.push({
                phase: 'rapid',
                test: i + 1,
                success: false,
                wordCount: 0,
                processingTime: Date.now() - startTime,
                error: error.message
            });
        }
        
        // Short delay between rapid tests
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('Phase 2: Heavy method tests...');
    // Heavy tests with aggressive method
    const heavyTests = 2;
    for (let i = 0; i < heavyTests; i++) {
        const startTime = Date.now();
        
        try {
            const response = await axios.post('http://localhost:4580/extract', {
                url: url,
                method: 'aggressive'
            }, {
                timeout: 120000
            });
            
            results.push({
                phase: 'heavy',
                test: i + 1,
                success: response.data.success,
                wordCount: response.data.wordCount || 0,
                processingTime: Date.now() - startTime
            });
            
        } catch (error) {
            results.push({
                phase: 'heavy',
                test: i + 1,
                success: false,
                wordCount: 0,
                processingTime: Date.now() - startTime,
                error: error.message
            });
        }
        
        // Longer delay between heavy tests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const successfulTests = results.filter(r => r.success);
    const totalTests = results.length;
    const averageTime = successfulTests.length > 0 ?
        successfulTests.reduce((sum, r) => sum + r.processingTime, 0) / successfulTests.length : 0;
    
    return {
        success: true,
        testType: 'stress',
        results: results,
        summary: {
            totalTests: totalTests,
            successfulTests: successfulTests.length,
            successRate: ((successfulTests.length / totalTests) * 100).toFixed(1),
            averageTime: averageTime,
            description: `Completed ${totalTests} stress tests: ${rapidTests} rapid-fire + ${heavyTests} heavy load tests`,
            phases: {
                rapid: results.filter(r => r.phase === 'rapid'),
                heavy: results.filter(r => r.phase === 'heavy')
            }
        }
    };
}

app.listen(PORT, () => {
    console.log(`\\n🧪 Enhanced BrainLift Scraping TEST SUITE\\n`);
    console.log(`🌐 Test server running at: http://localhost:${PORT}`);
    console.log(`🎯 Features: Method comparison, performance testing, stress testing`);
    console.log(`📊 Comprehensive test suite for enhanced scraping validation`);
    console.log(`🔗 Make sure enhanced scraper is running on port 4580`);
    console.log(`📋 Ready to test all enhanced scraping capabilities\\n`);
});



