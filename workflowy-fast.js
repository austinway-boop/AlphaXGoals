// FAST WorkFlowy extractor - shallow but comprehensive
import express from 'express';
import axios from 'axios';

const app = express();
const PORT = 4571;

app.use(express.json());

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>WorkFlowy FAST Extractor</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        button { padding: 20px 40px; font-size: 20px; background: #4CAF50; color: white; border: none; cursor: pointer; margin: 10px; }
        button:hover { background: #45a049; }
        #results { margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; }
        .success { background: #e8f5e8; border-left: 4px solid #4caf50; }
        .huge-count { font-size: 48px; font-weight: bold; color: #4caf50; text-align: center; margin: 20px 0; }
        .content-display { white-space: pre-line; line-height: 1.6; max-height: 600px; overflow-y: auto; background: white; padding: 20px; border: 1px solid #ddd; border-radius: 6px; }
    </style>
</head>
<body>
    <h1>⚡ WorkFlowy FAST Extractor</h1>
    <p><strong>Strategy: Get substantial content in under 2 minutes</strong></p>
    <p><strong>Approach: Shallow but comprehensive extraction</strong></p>
    
    <button onclick="extractFast()">⚡ EXTRACT FAST (2 minutes max)</button>
    
    <div id="results" style="display: none;"></div>

    <script>
        async function extractFast() {
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = '<h2>⚡ Fast extraction starting...</h2><p>⏱️ Target time: Under 2 minutes</p>';
            
            try {
                const response = await fetch('/extract-fast', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    results.className = 'success';
                    results.innerHTML = 
                        '<h2>⚡ FAST EXTRACTION SUCCESS!</h2>' +
                        '<div class="huge-count">' + data.wordCount.toLocaleString() + ' WORDS</div>' +
                        '<p><strong>🎯 Result:</strong> ' + (data.wordCount >= 2000 ? '✅ Substantial content extracted!' : 'Partial extraction') + '</p>' +
                        '<p><strong>📊 Nodes:</strong> ' + data.nodeCount + ' | <strong>⏱️ Time:</strong> ' + Math.round(data.processingTime/1000) + 's</p>' +
                        '<h3>📋 Extracted Content:</h3>' +
                        '<div class="content-display">' + data.extractedText + '</div>';
                } else {
                    results.innerHTML = '<h2>❌ FAILED</h2><p>' + data.error + '</p>';
                }
            } catch (error) {
                results.innerHTML = '<h2>❌ ERROR</h2><p>' + error.message + '</p>';
            }
        }
    </script>
</body>
</html>
    `);
});

app.post('/extract-fast', async (req, res) => {
    const API_KEY = "c82f6e853144eb680f6470c44f2afaa17a843590";
    const BASE_URL = "https://workflowy.com/api/v1/nodes";
    
    console.log('⚡ FAST EXTRACTION - shallow but comprehensive');
    const startTime = Date.now();
    
    try {
        const allContent = [];
        let nodeCount = 0;
        
        // Strategy: Get root + 1-2 levels only, no deep recursion
        console.log('🌳 Getting root nodes...');
        
        const rootResponse = await axios.get(`${BASE_URL}?parent_id=None`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            timeout: 30000
        });
        
        const rootNodes = rootResponse.data.nodes || [];
        console.log(`📊 Found ${rootNodes.length} root nodes`);
        
        // Process each root node + immediate children only
        for (let i = 0; i < Math.min(rootNodes.length, 10); i++) {
            const rootNode = rootNodes[i];
            
            if (rootNode.name) {
                allContent.push(`• ${rootNode.name}`);
                nodeCount++;
                console.log(`📝 Root [${i+1}]: ${rootNode.name.substring(0, 50)}...`);
            }
            
            if (rootNode.note) {
                allContent.push(`  📝 ${rootNode.note}`);
            }
            
            // Get immediate children only (no deep recursion)
            try {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
                
                const childResponse = await axios.get(`${BASE_URL}?parent_id=${encodeURIComponent(rootNode.id)}`, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Accept': 'application/json'
                    },
                    timeout: 15000
                });
                
                const children = childResponse.data.nodes || [];
                console.log(`  📊 Node ${i+1}: ${children.length} children`);
                
                // Take first 20 children to get substantial content quickly
                for (const child of children.slice(0, 20)) {
                    if (child.name) {
                        allContent.push(`  • ${child.name}`);
                        nodeCount++;
                    }
                    if (child.note) {
                        allContent.push(`    📝 ${child.note}`);
                    }
                }
                
            } catch (childError) {
                if (childError.response?.status === 429) {
                    console.log('⚠️ Hit rate limit at node', i+1, '- stopping to avoid delays');
                    break; // Stop if we hit rate limits
                }
            }
        }
        
        const finalText = allContent.join('\n');
        const words = finalText.match(/\b[\p{L}\p{N}'-]+\b/gu) || [];
        const processingTime = Date.now() - startTime;
        
        console.log(`⚡ FAST extraction complete: ${nodeCount} nodes, ${words.length} words in ${Math.round(processingTime/1000)}s`);
        
        res.json({
            success: true,
            wordCount: words.length,
            nodeCount: nodeCount,
            contentLength: finalText.length,
            processingTime: processingTime,
            extractedText: finalText
        });
        
    } catch (error) {
        console.error('💥 Fast extraction error:', error);
        res.json({
            success: false,
            error: error.message,
            details: 'Fast extraction failed - rate limits may be in effect'
        });
    }
});

app.listen(PORT, () => {
    console.log(`⚡ FAST WorkFlowy extractor running at http://localhost:${PORT}`);
    console.log('🎯 Strategy: Get substantial content quickly without deep recursion');
});


