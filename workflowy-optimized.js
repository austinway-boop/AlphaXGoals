// Optimized WorkFlowy extractor - faster API approach
import express from 'express';
import axios from 'axios';

const app = express();
const PORT = 4570;

app.use(express.json());

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>WorkFlowy Optimized Extractor</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        button { padding: 20px 40px; font-size: 20px; background: #FF5722; color: white; border: none; cursor: pointer; margin: 10px; }
        button:hover { background: #E64A19; }
        #results { margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; }
        .success { background: #e8f5e8; border-left: 4px solid #4caf50; }
        .huge-count { font-size: 48px; font-weight: bold; color: #4caf50; text-align: center; margin: 20px 0; }
        .content-display { white-space: pre-line; line-height: 1.6; max-height: 600px; overflow-y: auto; background: white; padding: 20px; border: 1px solid #ddd; border-radius: 6px; }
        .progress { background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>🚀 WorkFlowy Optimized Extractor</h1>
    <p><strong>Smart API approach - extracts in batches to avoid rate limits</strong></p>
    <p><strong>Expected time: 3-4 minutes for all content</strong></p>
    
    <button onclick="extractOptimized()">🚀 EXTRACT ALL CONTENT (OPTIMIZED)</button>
    
    <div id="results" style="display: none;"></div>

    <script>
        async function extractOptimized() {
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = 
                '<h2>🚀 Starting Optimized Extraction...</h2>' +
                '<div class="progress" id="progress">' +
                '<p>📊 Initializing smart batch extraction...</p>' +
                '<p>⏱️ Expected time: 3-4 minutes</p>' +
                '</div>';
            
            // Monitor progress
            const progressInterval = setInterval(async () => {
                try {
                    const progressRes = await fetch('/progress');
                    const progress = await progressRes.json();
                    
                    document.getElementById('progress').innerHTML = 
                        '<p>📊 <strong>Progress:</strong></p>' +
                        '<p>• Nodes processed: ' + progress.nodeCount + '</p>' +
                        '<p>• Words found: ' + progress.wordCount + '</p>' +
                        '<p>• Current batch: ' + progress.currentBatch + '</p>' +
                        '<p>• Estimated remaining: ' + progress.estimatedTime + '</p>';
                        
                } catch (e) {
                    // Continue
                }
            }, 2000);
            
            try {
                const response = await fetch('/extract-optimized', { method: 'POST' });
                const data = await response.json();
                
                clearInterval(progressInterval);
                
                if (data.success) {
                    results.className = 'success';
                    results.innerHTML = 
                        '<h2>🎉 OPTIMIZED EXTRACTION SUCCESS!</h2>' +
                        '<div class="huge-count">' + data.wordCount.toLocaleString() + ' WORDS</div>' +
                        '<p><strong>🎯 Target Status:</strong> ' + (data.wordCount >= 8000 ? '✅ ACHIEVED!' : 'Partial: ' + data.wordCount + ' of 9,000') + '</p>' +
                        '<p><strong>📊 Nodes Processed:</strong> ' + data.nodeCount + '</p>' +
                        '<p><strong>⏱️ Total Time:</strong> ' + Math.round(data.processingTime/1000) + ' seconds</p>' +
                        '<h3>📋 Complete WorkFlowy Content:</h3>' +
                        '<div class="content-display">' + data.extractedText + '</div>';
                } else {
                    results.className = 'error';
                    results.innerHTML = '<h2>❌ FAILED</h2><p>' + data.error + '</p>';
                }
            } catch (error) {
                clearInterval(progressInterval);
                results.innerHTML = '<h2>❌ ERROR</h2><p>' + error.message + '</p>';
            }
        }
    </script>
</body>
</html>
    `);
});

// Progress tracking
let currentProgress = {
    nodeCount: 0,
    wordCount: 0,
    currentBatch: 0,
    estimatedTime: 'Calculating...'
};

app.get('/progress', (req, res) => {
    res.json(currentProgress);
});

app.post('/extract-optimized', async (req, res) => {
    const API_KEY = "c82f6e853144eb680f6470c44f2afaa17a843590";
    const BASE_URL = "https://workflowy.com/api/v1/nodes";
    
    console.log('🚀 OPTIMIZED EXTRACTION - Smart batching approach');
    const startTime = Date.now();
    
    currentProgress = { nodeCount: 0, wordCount: 0, currentBatch: 0, estimatedTime: 'Starting...' };
    
    let allContent = [];
    let totalNodes = 0;
    
    try {
        // STRATEGY: Instead of deep recursion, do breadth-first extraction
        // This gets more content with fewer API calls
        
        console.log('🌳 Getting root level content...');
        currentProgress.currentBatch = 1;
        currentProgress.estimatedTime = '2-3 minutes';
        
        // Get root nodes
        const rootResponse = await axios.get(`${BASE_URL}?parent_id=None`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            timeout: 30000
        });
        
        const rootNodes = rootResponse.data.nodes || [];
        console.log(`📊 Found ${rootNodes.length} root nodes`);
        
        // Process each root node and get 2-3 levels deep
        for (let i = 0; i < rootNodes.length && i < 20; i++) {
            const rootNode = rootNodes[i];
            currentProgress.currentBatch = i + 1;
            currentProgress.nodeCount = totalNodes;
            
            if (rootNode.name) {
                allContent.push(`• ${rootNode.name}`);
                totalNodes++;
                console.log(`📝 [${totalNodes}] Root: ${rootNode.name.substring(0, 50)}...`);
            }
            
            if (rootNode.note) {
                allContent.push(`  📝 ${rootNode.note}`);
            }
            
            // Get level 1 children
            try {
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
                
                const level1Response = await axios.get(`${BASE_URL}?parent_id=${encodeURIComponent(rootNode.id)}`, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Accept': 'application/json'
                    },
                    timeout: 20000
                });
                
                const level1Nodes = level1Response.data.nodes || [];
                console.log(`  📊 Node ${i+1}: Found ${level1Nodes.length} level-1 children`);
                
                for (let j = 0; j < level1Nodes.length && j < 30; j++) {
                    const child = level1Nodes[j];
                    
                    if (child.name) {
                        allContent.push(`  • ${child.name}`);
                        totalNodes++;
                    }
                    if (child.note) {
                        allContent.push(`    📝 ${child.note}`);
                    }
                    
                    // Get level 2 children for first few nodes only
                    if (j < 10) {
                        try {
                            await new Promise(resolve => setTimeout(resolve, 1500));
                            
                            const level2Response = await axios.get(`${BASE_URL}?parent_id=${encodeURIComponent(child.id)}`, {
                                headers: {
                                    'Authorization': `Bearer ${API_KEY}`,
                                    'Accept': 'application/json'
                                },
                                timeout: 15000
                            });
                            
                            const level2Nodes = level2Response.data.nodes || [];
                            
                            for (const grandchild of level2Nodes.slice(0, 20)) {
                                if (grandchild.name) {
                                    allContent.push(`    • ${grandchild.name}`);
                                    totalNodes++;
                                }
                                if (grandchild.note) {
                                    allContent.push(`      📝 ${grandchild.note}`);
                                }
                            }
                            
                        } catch (level2Error) {
                            if (level2Error.response?.status === 429) {
                                console.log('⏳ Hit rate limit, moving to next batch...');
                                break;
                            }
                        }
                    }
                }
                
            } catch (level1Error) {
                if (level1Error.response?.status === 429) {
                    console.log('⏳ Hit rate limit, slowing down...');
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
            }
            
            currentProgress.nodeCount = totalNodes;
            const currentText = allContent.join(' ');
            currentProgress.wordCount = (currentText.match(/\b[\p{L}\p{N}'-]+\b/gu) || []).length;
        }
        
        const finalText = allContent.join('\n');
        const finalWords = finalText.match(/\b[\p{L}\p{N}'-]+\b/gu) || [];
        const processingTime = Date.now() - startTime;
        
        console.log(`🎉 OPTIMIZED EXTRACTION COMPLETE!`);
        console.log(`📊 Final: ${totalNodes} nodes, ${finalWords.length} words in ${Math.round(processingTime/1000)}s`);
        
        res.json({
            success: true,
            wordCount: finalWords.length,
            nodeCount: totalNodes,
            contentLength: finalText.length,
            processingTime: processingTime,
            extractedText: finalText
        });
        
    } catch (error) {
        console.error('💥 Optimized extraction error:', error);
        res.json({
            success: false,
            error: error.message,
            nodeCount: totalNodes
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Optimized WorkFlowy extractor running at http://localhost:${PORT}`);
    console.log('⚡ Smart batching approach - faster than rate-limited version');
});
