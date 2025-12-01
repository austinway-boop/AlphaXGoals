// WorkFlowy extractor with proper rate limiting
import express from 'express';
import axios from 'axios';

const app = express();
const PORT = 4567;

app.use(express.json());

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>WorkFlowy Rate-Limited Extractor</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        button { padding: 20px 40px; font-size: 20px; background: #ff5722; color: white; border: none; cursor: pointer; margin: 10px; }
        button:hover { background: #e64a19; }
        #results { margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; }
        .success { background: #e8f5e8; border-left: 4px solid #4caf50; }
        .error { background: #ffebee; border-left: 4px solid #f44336; }
        .progress { background: #e3f2fd; border-left: 4px solid #2196f3; margin: 10px 0; padding: 15px; }
        .huge-count { font-size: 48px; font-weight: bold; color: #4caf50; text-align: center; margin: 20px 0; }
        .content-display { white-space: pre-line; line-height: 1.6; max-height: 600px; overflow-y: auto; background: white; padding: 20px; border: 1px solid #ddd; border-radius: 6px; }
        #progressLog { background: #f9f9f9; padding: 15px; border-radius: 6px; max-height: 300px; overflow-y: auto; font-family: monospace; font-size: 14px; }
    </style>
</head>
<body>
    <h1>🔥 WorkFlowy Rate-Limited FULL Extractor</h1>
    <p><strong>This version handles rate limits properly and will extract ALL your content</strong></p>
    <p><strong>Expected time:</strong> 5-10 minutes to get all 9,000 words (due to rate limiting)</p>
    
    <button onclick="extractWithRateLimiting()">🔥 EXTRACT ALL CONTENT (SLOW & STEADY)</button>
    
    <div id="results" style="display: none;"></div>

    <script>
        let progressInterval;
        
        async function extractWithRateLimiting() {
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = 
                '<h2>🔥 Starting Full Extraction with Rate Limiting...</h2>' +
                '<div class="progress">' +
                '<p>⏳ <strong>This will take 5-10 minutes</strong> - WorkFlowy rate limits API calls</p>' +
                '<p>📊 Progress will be shown below in real-time...</p>' +
                '</div>' +
                '<div id="progressLog">Starting extraction...</div>';
            
            // Start progress monitoring
            progressInterval = setInterval(updateProgress, 2000);
            
            try {
                const response = await fetch('/extract-with-rate-limiting', { method: 'POST' });
                const data = await response.json();
                
                clearInterval(progressInterval);
                
                if (data.success) {
                    results.className = 'success';
                    results.innerHTML = 
                        '<h2>🎉 FULL EXTRACTION SUCCESS!</h2>' +
                        '<div class="huge-count">' + data.wordCount.toLocaleString() + ' WORDS EXTRACTED</div>' +
                        '<p><strong>🎯 Target Status:</strong> ' + (data.wordCount >= 8000 ? '✅ ACHIEVED!' : '⚠️ Still extracting...') + '</p>' +
                        '<p><strong>📊 Nodes Processed:</strong> ' + data.nodeCount.toLocaleString() + '</p>' +
                        '<p><strong>📏 Content Length:</strong> ' + data.contentLength.toLocaleString() + ' characters</p>' +
                        '<p><strong>⏱️ Total Time:</strong> ' + Math.round(data.processingTime/1000) + ' seconds</p>' +
                        '<h3>📋 Complete WorkFlowy Content:</h3>' +
                        '<div class="content-display">' + data.extractedText + '</div>';
                } else {
                    results.className = 'error';
                    results.innerHTML = 
                        '<h2>❌ EXTRACTION FAILED</h2>' +
                        '<p><strong>Error:</strong> ' + data.error + '</p>' +
                        '<p><strong>Details:</strong> ' + (data.details || '') + '</p>' +
                        '<p><strong>Nodes extracted before failure:</strong> ' + (data.nodeCount || 0) + '</p>';
                }
            } catch (error) {
                clearInterval(progressInterval);
                results.className = 'error';
                results.innerHTML = '<h2>❌ ERROR</h2><p>' + error.message + '</p>';
            }
        }
        
        async function updateProgress() {
            try {
                const response = await fetch('/progress', { method: 'GET' });
                const data = await response.json();
                
                const progressLog = document.getElementById('progressLog');
                if (progressLog) {
                    progressLog.innerHTML = 
                        '<strong>📊 Current Progress:</strong><br>' +
                        '• Nodes processed: ' + data.nodeCount + '<br>' +
                        '• Words so far: ' + data.wordCount + '<br>' +
                        '• Current depth: ' + data.currentDepth + '<br>' +
                        '• Last activity: ' + data.lastActivity + '<br>' +
                        '• Estimated completion: ' + data.estimatedCompletion;
                }
            } catch (e) {
                // Progress update failed, continue
            }
        }
    </script>
</body>
</html>
    `);
});

// Global progress tracking
let extractionProgress = {
    nodeCount: 0,
    wordCount: 0,
    currentDepth: 0,
    lastActivity: 'Starting...',
    estimatedCompletion: 'Calculating...',
    isRunning: false
};

app.get('/progress', (req, res) => {
    res.json(extractionProgress);
});

app.post('/extract-with-rate-limiting', async (req, res) => {
    const API_KEY = "c82f6e853144eb680f6470c44f2afaa17a843590";
    const BASE_URL = "https://workflowy.com/api/v1/nodes";
    
    console.log('🔥 Starting RATE-LIMITED full extraction...');
    const startTime = Date.now();
    
    extractionProgress.isRunning = true;
    extractionProgress.nodeCount = 0;
    extractionProgress.wordCount = 0;
    extractionProgress.lastActivity = 'Initializing...';
    
    let allContent = [];
    
    try {
        // Rate-limited fetch function
        async function fetchNodesWithRateLimit(parentId = "None", attempt = 0) {
            const url = `${BASE_URL}?parent_id=${encodeURIComponent(parentId)}`;
            
            try {
                const response = await axios.get(url, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Accept': 'application/json',
                        'User-Agent': 'AlphaXGoals-Rate-Limited/1.0'
                    },
                    timeout: 30000
                });
                
                return response.data.nodes || [];
                
            } catch (error) {
                if (error.response?.status === 429) {
                    const retryAfter = error.response.data?.retry_after || (attempt + 1) * 20;
                    console.log(`⏳ Rate limited! Waiting ${retryAfter} seconds...`);
                    extractionProgress.lastActivity = `Rate limited - waiting ${retryAfter}s`;
                    
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    
                    if (attempt < 5) {
                        return await fetchNodesWithRateLimit(parentId, attempt + 1);
                    } else {
                        throw new Error('Too many rate limit retries');
                    }
                } else if (error.response?.status === 404) {
                    // Normal for leaf nodes
                    return [];
                } else {
                    throw error;
                }
            }
        }
        
        // Recursive extraction with rate limiting
        async function extractContent(parentId = "None", depth = 0, indent = "") {
            if (depth > 100) return; // Safety limit
            
            extractionProgress.currentDepth = Math.max(extractionProgress.currentDepth, depth);
            extractionProgress.lastActivity = `Processing depth ${depth}`;
            
            const nodes = await fetchNodesWithRateLimit(parentId);
            
            if (nodes.length === 0) return;
            
            nodes.sort((a, b) => (a.priority || 0) - (b.priority || 0));
            
            for (const node of nodes) {
                extractionProgress.nodeCount++;
                
                if (node.name) {
                    const line = `${indent}• ${node.name}`;
                    allContent.push(line);
                    extractionProgress.wordCount = allContent.join(' ').match(/\b[\p{L}\p{N}'-]+\b/gu)?.length || 0;
                    
                    console.log(`📝 [${extractionProgress.nodeCount}] ${node.name.substring(0, 50)}...`);
                }
                
                if (node.note) {
                    const line = `${indent}  📝 ${node.note}`;
                    allContent.push(line);
                    extractionProgress.wordCount = allContent.join(' ').match(/\b[\p{L}\p{N}'-]+\b/gu)?.length || 0;
                    
                    console.log(`📄 [${extractionProgress.nodeCount}] Note: ${node.note.substring(0, 50)}...`);
                }
                
                // Process children recursively
                await extractContent(node.id, depth + 1, indent + "  ");
                
                // Update progress estimate
                extractionProgress.estimatedCompletion = `${Math.round((Date.now() - startTime) / 1000)}s elapsed`;
            }
        }
        
        console.log('🌳 Starting from root...');
        await extractContent("None");
        
        const fullText = allContent.join('\n');
        const words = fullText.match(/\b[\p{L}\p{N}'-]+\b/gu) || [];
        const processingTime = Date.now() - startTime;
        
        extractionProgress.isRunning = false;
        
        console.log('🎉 RATE-LIMITED EXTRACTION COMPLETE!');
        console.log(`📊 Final: ${extractionProgress.nodeCount} nodes, ${words.length} words`);
        
        res.json({
            success: true,
            wordCount: words.length,
            nodeCount: extractionProgress.nodeCount,
            contentLength: fullText.length,
            processingTime: processingTime,
            extractedText: fullText,
            targetAchieved: words.length >= 8000
        });
        
    } catch (error) {
        extractionProgress.isRunning = false;
        console.error('💥 Rate-limited extraction failed:', error);
        
        res.json({
            success: false,
            error: error.message,
            details: 'Rate limiting or API access issue',
            nodeCount: extractionProgress.nodeCount,
            httpStatus: error.response?.status
        });
    }
});

app.listen(PORT, () => {
    console.log(`🔥 Rate-limited WorkFlowy extractor running at http://localhost:${PORT}`);
    console.log('⏳ This will be slow but should get ALL your content');
});


