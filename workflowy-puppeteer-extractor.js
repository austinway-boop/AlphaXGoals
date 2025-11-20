// WorkFlowy extractor using Puppeteer for dynamic content loading
import express from 'express';
import puppeteer from 'puppeteer';

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
    <title>WorkFlowy Puppeteer Extractor</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2196f3; margin-bottom: 20px; }
        input[type="url"] { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; margin: 10px 0; }
        button { background: #2196f3; color: white; padding: 12px 24px; border: none; border-radius: 6px; margin: 5px; cursor: pointer; }
        button:hover { background: #1976d2; }
        .results { margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 6px; }
        .success { border-left: 4px solid #4caf50; background: #e8f5e8; }
        .error { border-left: 4px solid #f44336; background: #ffebee; }
        .word-count { font-size: 28px; font-weight: bold; color: #2196f3; margin: 20px 0; text-align: center; }
        .target-status { font-size: 20px; font-weight: bold; text-align: center; padding: 15px; margin: 15px 0; border-radius: 8px; }
        .success-status { background: #e8f5e8; color: #2e7d32; border: 2px solid #4caf50; }
        .partial-status { background: #fff3e0; color: #f57c00; border: 2px solid #ff9800; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 4px; white-space: pre-wrap; max-height: 500px; overflow-y: auto; }
        .loading { text-align: center; padding: 30px; font-size: 18px; color: #666; }
        .progress { background: #e3f2fd; padding: 20px; border-radius: 6px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 WorkFlowy Puppeteer Extractor</h1>
        <p><strong>Dynamic Content Extraction</strong> - Uses browser automation to load JavaScript and extract all content</p>
        
        <input type="url" id="workflowyLink" placeholder="https://workflowy.com/s/your-link" value="https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe" />
        <br>
        <button onclick="extractWithPuppeteer()">🚀 Extract All Content (Puppeteer)</button>
        <button onclick="clearResults()">🗑️ Clear</button>
        
        <div id="results" class="results" style="display: none;"></div>
    </div>

    <script>
        async function extractWithPuppeteer() {
            const link = document.getElementById('workflowyLink').value.trim();
            if (!link) { alert('Please enter a WorkFlowy link'); return; }
            
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = \`
                <div class="loading">
                    <h3>🤖 Loading WorkFlowy with Browser Automation...</h3>
                    <div class="progress">
                        <p>• Launching browser...</p>
                        <p>• Loading WorkFlowy page...</p>
                        <p>• Waiting for content to load...</p>
                        <p>• Extracting all text...</p>
                        <p><strong>This may take 15-30 seconds...</strong></p>
                    </div>
                </div>
            \`;
            
            try {
                const response = await fetch('/extract-with-puppeteer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ link })
                });
                
                const data = await response.json();
                displayPuppeteerResults(data);
            } catch (error) {
                results.innerHTML = \`<div class="error"><h3>❌ Error</h3><p>\${error.message}</p></div>\`;
            }
        }
        
        function displayPuppeteerResults(data) {
            const results = document.getElementById('results');
            if (data.success) {
                const targetAchieved = data.wordCount >= 8000;
                const statusClass = targetAchieved ? 'success-status' : 'partial-status';
                const statusIcon = targetAchieved ? '🎯' : '⚠️';
                const statusText = targetAchieved ? 'Target Achieved!' : 'Partial Extraction';
                
                results.innerHTML = \\`
                    <div class="success">
                        <h2>🤖 Puppeteer Extraction Complete!</h2>
                        
                        <div class="word-count">📊 \\${data.wordCount.toLocaleString()} Words Extracted</div>
                        
                        <div class="target-status \\${statusClass}">
                            \\${statusIcon} \\${statusText}<br>
                            <small>Target: ~9,000 words | Extracted: \\${data.wordCount.toLocaleString()}</small>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 20px 0; text-align: center;">
                            <div style="background: #e3f2fd; padding: 15px; border-radius: 6px;">
                                <strong>Content Length</strong><br>
                                \\${data.contentLength.toLocaleString()} chars
                            </div>
                            <div style="background: #e3f2fd; padding: 15px; border-radius: 6px;">
                                <strong>Processing Time</strong><br>
                                \\${data.processingTime}ms
                            </div>
                            <div style="background: #e3f2fd; padding: 15px; border-radius: 6px;">
                                <strong>Method</strong><br>
                                Puppeteer Browser
                            </div>
                        </div>
                        
                        <details>
                            <summary><strong>📝 View Full Extracted Content</strong></summary>
                            <pre>\\${data.extractedText}</pre>
                        </details>
                        
                        \\${data.debugInfo ? \\`
                            <details>
                                <summary><strong>🔧 Debug Information</strong></summary>
                                <pre>\\${data.debugInfo}</pre>
                            </details>
                        \\` : ''}
                    </div>
                \\`;
            } else {
                results.innerHTML = \\`
                    <div class="error">
                        <h3>❌ Puppeteer Extraction Failed</h3>
                        <p><strong>Error:</strong> \\${data.error}</p>
                        \\${data.details ? \\`<p><strong>Details:</strong> \\${data.details}</p>\\` : ''}
                        \\${data.debugInfo ? \\`
                            <details>
                                <summary><strong>Debug Info</strong></summary>
                                <pre>\\${data.debugInfo}</pre>
                            </details>
                        \\` : ''}
                    </div>
                \\`;
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

// Puppeteer-based extraction endpoint
app.post('/extract-with-puppeteer', async (req, res) => {
    const { link } = req.body;
    const startTime = Date.now();
    let browser = null;
    let debugInfo = '';
    
    if (!link) {
        return res.status(400).json({ success: false, error: 'WorkFlowy link is required' });
    }
    
    console.log('🤖 Starting Puppeteer extraction for:', link);
        debugInfo += `Starting extraction for: ${link}\n`;
    
    try {
        // Launch browser
        console.log('🚀 Launching browser...');
        debugInfo += 'Launching Puppeteer browser...\n';
        
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        
        // Set realistic viewport and user agent
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('📄 Navigating to WorkFlowy page...');
        debugInfo += 'Navigating to page...\n';
        
        // Navigate to the WorkFlowy page
        await page.goto(link, { 
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        console.log('⏳ Waiting for WorkFlowy content to load...');
        debugInfo += 'Waiting for content to load...\n';
        
        // Wait for WorkFlowy content to load - try multiple selectors
        const contentSelectors = [
            '.content',
            '.name',
            '.project',
            '[data-id]',
            '.node',
            'div[contenteditable]'
        ];
        
        let contentLoaded = false;
        for (const selector of contentSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 10000 });
                debugInfo += \`Found content with selector: ${selector}\n\`;
                contentLoaded = true;
                break;
            } catch (e) {
                debugInfo += \`Selector ${selector} not found\n\`;
            }
        }
        
        // Additional wait for dynamic content
        console.log('⏱️ Waiting for dynamic content...');
        await page.waitForTimeout(5000);
        
        // Try to expand any collapsed items
        try {
            await page.evaluate(() => {
                // Look for expand buttons/controls and click them
                const expandButtons = document.querySelectorAll('[data-testid="expand"], .expand, .bullet-expand');
                expandButtons.forEach(button => button.click());
                
                // Try to expand any collapsed sections
                const collapsedItems = document.querySelectorAll('[data-collapsed="true"], .collapsed');
                collapsedItems.forEach(item => {
                    if (item.click) item.click();
                });
            });
            
            debugInfo += 'Attempted to expand collapsed items\n';
            await page.waitForTimeout(2000);
        } catch (expandError) {
            debugInfo += \`Expand attempt failed: ${expandError.message}\n\`;
        }
        
        console.log('📝 Extracting text content...');
        debugInfo += 'Extracting text content...\n';
        
        // Extract text using multiple methods
        const extractedText = await page.evaluate(() => {
            // Method 1: Try to get all text from WorkFlowy-specific elements
            let texts = [];
            
            // Common WorkFlowy selectors for content
            const selectors = [
                '.content',
                '.name', 
                '.note',
                '[data-id]',
                '.project',
                'div[contenteditable="true"]',
                '.node-content',
                '.bullet-content'
            ];
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    const text = el.innerText || el.textContent || '';
                    if (text.trim().length > 0) {
                        texts.push(text.trim());
                    }
                });
            }
            
            // Method 2: If no specific content found, get all visible text
            if (texts.length === 0) {
                const body = document.body;
                if (body) {
                    // Remove script and style content
                    const scripts = body.querySelectorAll('script, style, noscript');
                    scripts.forEach(el => el.remove());
                    
                    const bodyText = body.innerText || body.textContent || '';
                    if (bodyText.trim().length > 0) {
                        texts.push(bodyText.trim());
                    }
                }
            }
            
            // Method 3: Try to find WorkFlowy data in page
            try {
                const scripts = document.querySelectorAll('script');
                for (const script of scripts) {
                    const scriptContent = script.textContent || script.innerHTML || '';
                    
                    // Look for WorkFlowy data patterns
                    const patterns = [
                        /PROJECT_TREE_DATA\\s*=\\s*({[\\s\\S]*?});/,
                        /INIT_DATA\\s*=\\s*({[\\s\\S]*?});/,
                        /pageData\\s*=\\s*({[\\s\\S]*?});/
                    ];
                    
                    for (const pattern of patterns) {
                        const match = scriptContent.match(pattern);
                        if (match) {
                            try {
                                const data = JSON.parse(match[1]);
                                // Extract text from data structure recursively
                                const extractFromData = (obj) => {
                                    let dataTexts = [];
                                    if (typeof obj === 'string' && obj.trim()) {
                                        dataTexts.push(obj.trim());
                                    } else if (Array.isArray(obj)) {
                                        obj.forEach(item => {
                                            const text = extractFromData(item);
                                            if (text) dataTexts.push(text);
                                        });
                                    } else if (obj && typeof obj === 'object') {
                                        Object.values(obj).forEach(value => {
                                            const text = extractFromData(value);
                                            if (text) dataTexts.push(text);
                                        });
                                    }
                                    return dataTexts.join(' ');
                                };
                                
                                const dataText = extractFromData(data);
                                if (dataText.trim().length > 100) {
                                    texts.push(dataText);
                                }
                            } catch (parseError) {
                                // Continue if parsing fails
                            }
                        }
                    }
                }
            } catch (dataError) {
                // Continue if data extraction fails
            }
            
            // Combine and clean up all extracted text
            const allText = texts.join(' ')
                .replace(/\\s+/g, ' ')
                .replace(/[\\r\n]+/g, ' ')
                .trim();
                
            return {
                text: allText,
                methodsUsed: texts.length,
                preview: allText.substring(0, 200)
            };
        });
        
        await browser.close();
        browser = null;
        
        const finalText = extractedText.text || '';
        debugInfo += \`Text extraction complete. Methods used: ${extractedText.methodsUsed}\n\`;
        debugInfo += \`Preview: ${extractedText.preview}\n\`;
        
        if (!finalText || finalText.length < 50) {
            return res.json({
                success: false,
                error: 'Could not extract meaningful content from WorkFlowy page',
                details: 'The page may not have loaded properly or the content structure has changed',
                debugInfo: debugInfo
            });
        }
        
        // Count words using Unicode-aware approach
        const words = finalText.match(/\\b[\\p{L}\\p{N}'-]+\\b/gu) || [];
        const processingTime = Date.now() - startTime;
        
        console.log(\`✅ Puppeteer extraction complete: ${words.length} words, ${finalText.length} chars\`);
        debugInfo += \`Final result: ${words.length} words, ${finalText.length} characters\n\`;
        
        res.json({
            success: true,
            wordCount: words.length,
            contentLength: finalText.length,
            extractedText: finalText,
            method: 'puppeteer_browser_automation',
            processingTime: processingTime,
            debugInfo: debugInfo,
            targetAchieved: words.length >= 8000
        });
        
    } catch (error) {
        console.error('💥 Puppeteer extraction error:', error);
        
        if (browser) {
            await browser.close();
        }
        
        debugInfo += \`Error: ${error.message}\n\`;
        debugInfo += \`Stack: ${error.stack}\n\`;
        
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Browser automation failed',
            debugInfo: debugInfo
        });
    }
});

app.listen(PORT, () => {
    console.log(\`🤖 WorkFlowy Puppeteer Extractor running at http://localhost:${PORT}\`);
    console.log('🎯 Target: Extract ~9,000 words using browser automation');
    console.log('📋 Ready to extract from: https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe');
});
