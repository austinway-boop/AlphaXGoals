// Simple WorkFlowy extractor - NO template literal conflicts
import express from 'express';
import puppeteer from 'puppeteer';

const app = express();
const PORT = 4567;

app.use(express.json());

// Simple HTML page with no template literals
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>WorkFlowy Extractor</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        button { padding: 15px 30px; font-size: 18px; background: #2196f3; color: white; border: none; cursor: pointer; }
        button:hover { background: #1976d2; }
        #results { margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; }
        .success { background: #e8f5e8; border-left: 4px solid #4caf50; }
        .error { background: #ffebee; border-left: 4px solid #f44336; }
    </style>
</head>
<body>
    <h1>🤖 WorkFlowy Word Extractor</h1>
    <p>Extract words from: https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe</p>
    
    <button onclick="extractWords()">🚀 EXTRACT ALL WORDS</button>
    
    <div id="results" style="display: none;"></div>

    <script>
        async function extractWords() {
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = '<h3>🤖 Extracting words... Please wait 15-30 seconds...</h3>';
            
            try {
                const response = await fetch('/extract', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    results.className = 'success';
                    results.innerHTML = 
                    '<h2>✅ SUCCESS!</h2>' +
                    '<h3>📊 Total Words: ' + data.wordCount + '</h3>' +
                    '<p><strong>Target achieved:</strong> ' + (data.wordCount >= 8000 ? 'YES! 🎯' : 'Partial ⚠️') + '</p>' +
                    '<p><strong>Content Length:</strong> ' + data.contentLength + ' characters</p>' +
                    '<p><strong>Processing Time:</strong> ' + data.processingTime + 'ms</p>' +
                    '<h4>📋 WorkFlowy Content Structure:</h4>' +
                    '<div style="white-space: pre-line; line-height: 1.6; max-height: 600px; overflow-y: auto; background: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #ddd;">' + 
                    data.extractedText + 
                    '</div>' +
                    '<p><strong>📊 Analysis:</strong> Found ' + (data.extractedText.split('\\n').length) + ' lines of content</p>';
                } else {
                    results.className = 'error';
                    results.innerHTML = '<h2>❌ FAILED</h2><p>' + data.error + '</p>';
                }
            } catch (error) {
                results.className = 'error';
                results.innerHTML = '<h2>❌ ERROR</h2><p>' + error.message + '</p>';
            }
        }
    </script>
</body>
</html>
    `);
});

// Extract endpoint using Puppeteer
app.post('/extract', async (req, res) => {
    console.log('🚀 Starting WorkFlowy extraction...');
    const startTime = Date.now();
    let browser = null;
    
    try {
        // Launch browser
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        
        console.log('📄 Loading WorkFlowy page...');
        await page.goto('https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe', { 
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        console.log('⏳ Waiting for content...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Initial wait
        
        console.log('🔍 First, let me inspect what content is actually available...');
        const initialInspection = await page.evaluate(() => {
            const info = {
                totalElements: document.querySelectorAll('*').length,
                bullets: document.querySelectorAll('.bullet').length,
                contentDivs: document.querySelectorAll('.content').length,
                nameElements: document.querySelectorAll('.name').length,
                noteElements: document.querySelectorAll('.note').length,
                dataIdElements: document.querySelectorAll('[data-id]').length,
                collapsedElements: document.querySelectorAll('[data-collapsed="true"]').length,
                bodyTextLength: (document.body.innerText || '').length
            };
            
            console.log('Page inspection:', JSON.stringify(info, null, 2));
            return info;
        });
        
        console.log('📊 Page content analysis:', initialInspection);
        
        console.log('🔓 SUPER AGGRESSIVE expansion strategy...');
        
        // Method 1: Use keyboard shortcuts (WorkFlowy's expand all)
        await page.evaluate(() => document.body.focus());
        
        // Try multiple WorkFlowy keyboard shortcuts
        const shortcuts = [
            ['Control', 'Shift', 'ArrowRight'], // Expand all
            ['Control', 'ArrowRight'], // Expand selected
            ['Tab'], // Try tab to expand
        ];
        
        for (const shortcut of shortcuts) {
            for (const key of shortcut) {
                await page.keyboard.down(key);
            }
            for (const key of [...shortcut].reverse()) {
                await page.keyboard.up(key);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Method 2: EXTREME manual expansion + content discovery
        await page.evaluate(async () => {
            const wait = ms => new Promise(r => setTimeout(r, ms));
            
            // First, let's see what we're working with
            const inspectPage = () => {
                const bullets = document.querySelectorAll('.bullet');
                const collapsed = document.querySelectorAll('[data-collapsed="true"]');
                const allDataId = document.querySelectorAll('[data-id]');
                
                console.log(`🔍 Current state: ${bullets.length} bullets, ${collapsed.length} collapsed, ${allDataId.length} data-id elements`);
                
                // Log some sample elements to understand structure
                if (bullets.length > 0) {
                    console.log('Sample bullet:', bullets[0].outerHTML.substring(0, 200));
                }
                if (allDataId.length > 0) {
                    console.log('Sample data-id element:', allDataId[0].outerHTML.substring(0, 200));
                }
            };
            
            inspectPage();
            
            // Extremely aggressive expansion
            const superExpandAll = () => {
                let expanded = 0;
                
                // Click EVERY bullet element
                document.querySelectorAll('.bullet').forEach(bullet => {
                    try {
                        bullet.click();
                        expanded++;
                    } catch (e) {}
                });
                
                // Click EVERY data-id element's bullet
                document.querySelectorAll('[data-id]').forEach(el => {
                    try {
                        const bullet = el.querySelector('.bullet');
                        if (bullet) {
                            bullet.click();
                            expanded++;
                        }
                    } catch (e) {}
                });
                
                // Try clicking containers that might have hidden content
                document.querySelectorAll('.node, .item, .content, .name').forEach(el => {
                    try {
                        el.click();
                        expanded++;
                    } catch (e) {}
                });
                
                // Look for any elements with expand-like symbols or text
                document.querySelectorAll('*').forEach(el => {
                    const text = el.textContent || '';
                    if (text.match(/[▶►+>›]/) && text.length < 10) {
                        try {
                            el.click();
                            expanded++;
                        } catch (e) {}
                    }
                });
                
                console.log(`Super expansion: clicked ${expanded} items`);
                return expanded;
            };
            
            // Do MANY expansion rounds
            let totalExpanded = 0;
            for (let round = 0; round < 15; round++) {
                console.log(`🔓 SUPER EXPANSION ROUND ${round + 1}`);
                
                const expanded = superExpandAll();
                totalExpanded += expanded;
                
                // Check current state
                const currentCollapsed = document.querySelectorAll('[data-collapsed="true"]').length;
                console.log(`Round ${round + 1}: expanded ${expanded}, still collapsed: ${currentCollapsed}`);
                
                if (expanded === 0 && currentCollapsed === 0) {
                    console.log('✅ No more content to expand!');
                    break;
                }
                
                await wait(2000); // More time between rounds
            }
            
            console.log(`🔓 TOTAL SUPER EXPANDED: ${totalExpanded} items`);
            inspectPage(); // See final state
        });
        
        console.log('⏱️ Waiting for ALL content to fully load...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('📜 Scrolling everywhere to trigger content loading...');
        await page.evaluate(async () => {
            const wait = ms => new Promise(r => setTimeout(r, ms));
            
            // Multiple scroll patterns to trigger any lazy loading
            const scrollHeight = document.body.scrollHeight;
            const scrollWidth = document.body.scrollWidth;
            
            // Vertical scrolling
            for (let i = 0; i <= 20; i++) {
                const position = (scrollHeight * i) / 20;
                window.scrollTo(0, position);
                await wait(200);
            }
            
            // Horizontal scrolling (in case content is wide)
            for (let i = 0; i <= 10; i++) {
                const position = (scrollWidth * i) / 10;
                window.scrollTo(position, 0);
                await wait(200);
            }
            
            // Back to top
            window.scrollTo(0, 0);
            await wait(1000);
            
            // Try clicking anywhere that might reveal more content
            const clickEverything = () => {
                let clicks = 0;
                document.querySelectorAll('div, span, li, ul').forEach(el => {
                    try {
                        if (el.getAttribute('data-id') || 
                            el.classList.contains('node') ||
                            el.classList.contains('item') ||
                            el.classList.contains('bullet')) {
                            el.click();
                            clicks++;
                        }
                    } catch (e) {}
                });
                return clicks;
            };
            
            const totalClicks = clickEverything();
            console.log(`📱 Clicked ${totalClicks} potentially expandable elements`);
            
            await wait(2000);
        });
        
        console.log('📝 Extracting WorkFlowy content with proper structure...');
        const extractedText = await page.evaluate(() => {
            console.log('🔍 Analyzing page structure...');
            
            // Remove scripts and styles but keep content structure
            document.querySelectorAll('script, style, noscript').forEach(el => el.remove());
            
            let hierarchicalText = [];
            
            // Method 1: Try to extract WorkFlowy hierarchy properly
            const extractWorkFlowyStructure = () => {
                // Look for WorkFlowy-specific content containers
                const workflowySelectors = [
                    '.content', '.name', '.note', '.project',
                    '[data-id]', '.node', '.item', '.bullet-content',
                    'div[contenteditable="true"]'
                ];
                
                let structuredContent = [];
                
                // Try each selector to find content
                workflowySelectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    console.log(`Selector "${selector}": found ${elements.length} elements`);
                    
                    elements.forEach((el, index) => {
                        let text = (el.innerText || el.textContent || '').trim();
                        if (text.length > 1) {
                            // Try to determine hierarchy level by checking parent classes/nesting
                            let level = 0;
                            let parent = el.parentElement;
                            while (parent && level < 10) {
                                if (parent.classList.contains('node') || 
                                    parent.classList.contains('item') ||
                                    parent.hasAttribute('data-id')) {
                                    level++;
                                }
                                parent = parent.parentElement;
                            }
                            
                            // Format with proper indentation
                            const indent = '  '.repeat(level);
                            const formattedText = `${indent}• ${text}`;
                            
                            structuredContent.push({
                                level: level,
                                text: text,
                                formatted: formattedText,
                                selector: selector
                            });
                        }
                    });
                });
                
                return structuredContent;
            };
            
            // Method 2: Extract EVERYTHING - even if we're not sure it's WorkFlowy content
            const getAllPossibleText = () => {
                const allTexts = [];
                const seenTexts = new Set();
                
                // Get EVERY text node in the document
                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );
                
                let textNode;
                while (textNode = walker.nextNode()) {
                    const text = textNode.textContent.trim();
                    if (text.length > 0 && 
                        !text.match(/^[\\s\\n\\r\\t]*$/) && // Not just whitespace
                        text.length < 2000 && // Not massive blocks
                        !seenTexts.has(text)) { // Not duplicate
                        
                        seenTexts.add(text);
                        allTexts.push(text);
                    }
                }
                
                console.log(`Text node extraction: ${allTexts.length} unique text pieces`);
                return allTexts;
            };
            
            // Method 3: Get ALL innerHTML content and parse it
            const extractFromInnerHTML = () => {
                const allHTML = document.body.innerHTML;
                const textPieces = [];
                
                // Extract text from various HTML patterns
                const patterns = [
                    />([^<]{3,})</g, // Text between tags
                    /data-name="([^"]+)"/g,
                    /title="([^"]+)"/g,
                    /placeholder="([^"]+)"/g,
                    /value="([^"]+)"/g
                ];
                
                patterns.forEach(pattern => {
                    let match;
                    while ((match = pattern.exec(allHTML)) !== null) {
                        const text = match[1].trim();
                        if (text.length > 2 && !text.includes('<')) {
                            textPieces.push(text);
                        }
                    }
                });
                
                console.log(`HTML pattern extraction: ${textPieces.length} pieces`);
                return textPieces;
            };
            
            // Try ALL three extraction methods
            const structuredContent = extractWorkFlowyStructure();
            const allTextNodes = getAllPossibleText();
            const htmlPatternTexts = extractFromInnerHTML();
            
            console.log(`Structured extraction: ${structuredContent.length} items`);
            console.log(`Text node extraction: ${allTextNodes.length} items`);
            console.log(`HTML pattern extraction: ${htmlPatternTexts.length} items`);
            
            // Combine ALL methods to get maximum content
            let allCombinedTexts = [];
            
            // Add structured content
            if (structuredContent.length > 0) {
                allCombinedTexts = allCombinedTexts.concat(structuredContent.map(item => item.text));
            }
            
            // Add all text nodes
            allCombinedTexts = allCombinedTexts.concat(allTextNodes);
            
            // Add HTML pattern matches
            allCombinedTexts = allCombinedTexts.concat(htmlPatternTexts);
            
            // Also try the complete body text method
            const bodyText = document.body.innerText || document.body.textContent || '';
            if (bodyText.trim().length > 0) {
                // Split body text into lines and add them too
                const bodyLines = bodyText.split('\\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);
                allCombinedTexts = allCombinedTexts.concat(bodyLines);
            }
            
            console.log(`Total text pieces before deduplication: ${allCombinedTexts.length}`);
            
            // Deduplicate and format
            const uniqueTexts = [];
            const seenTexts = new Set();
            
            allCombinedTexts.forEach(text => {
                const cleanText = text.replace(/\\s+/g, ' ').trim();
                if (cleanText.length > 1 && !seenTexts.has(cleanText.toLowerCase())) {
                    seenTexts.add(cleanText.toLowerCase());
                    uniqueTexts.push(cleanText);
                }
            });
            
            console.log(`After deduplication: ${uniqueTexts.length} unique pieces`);
            
            // Format as bullet points with proper line breaks
            let finalContent = uniqueTexts
                .filter(text => text.length > 2) // Filter out very short pieces
                .map(text => `• ${text}`)
                .join('\\n');
            
            // Remove common UI elements but preserve content structure
            const uiPatterns = [
                /^• (WorkFlowy|Sign in|Sign up|Log in|Log out|Home|Search|Settings|Help|About|Complete|Share|Export|Import)$/gmi,
                /^• \\s*$/gm // Empty bullets
            ];
            
            uiPatterns.forEach(pattern => {
                finalContent = finalContent.replace(pattern, '');
            });
            
            // Clean up extra newlines but preserve structure
            finalContent = finalContent.replace(/\\n\\n+/g, '\\n').trim();
            
            console.log(`Final formatted content length: ${finalContent.length} characters`);
            console.log(`Lines: ${finalContent.split('\\n').length}`);
            console.log(`Preview:\\n${finalContent.substring(0, 500)}...`);
            
            return finalContent;
        });
        
        await browser.close();
        
        // Count words
        const words = extractedText.match(/\b[\p{L}\p{N}'-]+\b/gu) || [];
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ Extracted ${words.length} words in ${processingTime}ms`);
        
        res.json({
            success: true,
            wordCount: words.length,
            contentLength: extractedText.length,
            extractedText: extractedText,
            processingTime: processingTime
        });
        
    } catch (error) {
        console.error('💥 Error:', error);
        
        if (browser) {
            await browser.close();
        }
        
        res.json({
            success: false,
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 WorkFlowy extractor running at http://localhost:${PORT}`);
    console.log('🎯 Ready to extract ~9,000 words from your WorkFlowy document!');
});
