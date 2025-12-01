// Exhaustive WorkFlowy timestamp checker
// Checks EVERY SINGLE NODE to find recently modified content
// No optimizations, no skipping - just brute force check everything

import express from 'express';
import axios from 'axios';

const app = express();
const PORT = 4588;

app.use(express.json());

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Exhaustive Timestamp Check</title>
    <style>
        body { font-family: Arial; max-width: 1000px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        button { padding: 15px 30px; font-size: 16px; background: #2196F3; color: white; border: none; cursor: pointer; margin: 10px; }
        .results { margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 5px; }
        pre { background: white; padding: 15px; border-radius: 5px; overflow-x: auto; max-height: 600px; overflow-y: auto; }
    </style>
</head>
<body>
    <h1>🔍 Exhaustive WorkFlowy Check</h1>
    <p><strong>Strategy: Check EVERY node, no skipping, find ALL recent modifications</strong></p>
    <button onclick="checkExhaustive()">🚀 Run Exhaustive Check (may take 2-5 minutes)</button>
    <div id="results" class="results" style="display:none;"></div>
    
    <script>
        async function checkExhaustive() {
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = '<h3>⏳ Running exhaustive check... this may take several minutes...</h3>';
            
            const response = await fetch('/exhaustive-check', { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
                results.innerHTML = '<h2>✅ Exhaustive Check Complete</h2>' +
                    '<p><strong>Total Nodes Checked:</strong> ' + data.totalNodesChecked + '</p>' +
                    '<p><strong>Nodes with Recent Timestamps:</strong> ' + (data.recentNodes || []).length + '</p>' +
                    '<p><strong>Processing Time:</strong> ' + Math.round(data.processingTime/1000) + 's</p>' +
                    '<h3>Recent Modifications Found:</h3>' +
                    '<pre>' + JSON.stringify(data.recentNodes, null, 2) + '</pre>' +
                    '<h3>Debug Log:</h3>' +
                    '<pre>' + data.debugInfo + '</pre>';
            } else {
                results.innerHTML = '<h2>❌ Error</h2><p>' + data.error + '</p>';
            }
        }
    </script>
</body>
</html>
    `);
});

app.post('/exhaustive-check', async (req, res) => {
    const API_KEY = process.env.WF_API_KEY || "c82f6e853144eb680f6470c44f2afaa17a843590";
    const BASE_URL = "https://workflowy.com/api/v1/nodes";
    const startTime = Date.now();
    
    // Check for modifications in last 7 days
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    let debugInfo = `Exhaustive Timestamp Check\n`;
    debugInfo += `=========================\n`;
    debugInfo += `Looking for nodes modified since: ${new Date(sevenDaysAgo).toISOString()}\n\n`;
    
    console.log('🔍 Starting exhaustive timestamp check...');
    
    let totalNodesChecked = 0;
    const recentNodes = [];
    
    // Recursive check with retry on rate limits
    async function checkAllNodes(parentId, depth = 0) {
        if (depth > 25) return;
        
        let retries = 0;
        while (retries < 10) {
            try {
                const response = await axios.get(`${BASE_URL}?parent_id=${encodeURIComponent(parentId)}`, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Accept': 'application/json'
                    },
                    timeout: 30000
                });
                
                if (!response.data || !response.data.nodes) return;
                
                const nodes = response.data.nodes;
                
                for (const node of nodes) {
                    totalNodesChecked++;
                    
                    // Convert timestamps from seconds to milliseconds
                    const createdMs = (node.createdAt || 0) * 1000;
                    const modifiedMs = (node.modifiedAt || 0) * 1000;
                    
                    // Check if modified in last 7 days
                    if (modifiedMs > sevenDaysAgo || createdMs > sevenDaysAgo) {
                        const nodeInfo = {
                            name: node.name || '(no name)',
                            createdAt: new Date(createdMs).toISOString(),
                            modifiedAt: new Date(modifiedMs).toISOString(),
                            depth: depth,
                            id: node.id
                        };
                        
                        recentNodes.push(nodeInfo);
                        debugInfo += `  ✅ RECENT: "${nodeInfo.name}" modified ${nodeInfo.modifiedAt}\n`;
                        console.log(`  ✅ Recent node found: "${nodeInfo.name}"`);
                    }
                    
                    // Check ALL children regardless (no optimization)
                    await checkAllNodes(node.id, depth + 1);
                    
                    // Delay for rate limits
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
                break; // Success, exit retry loop
                
            } catch (error) {
                if (error.response?.status === 429) {
                    retries++;
                    const waitTime = Math.min(10000 * retries, 120000);
                    debugInfo += `  ⚠️ Rate limited, waiting ${waitTime/1000}s (retry ${retries}/10)...\n`;
                    console.log(`⚠️ Rate limited, waiting ${waitTime/1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                
                debugInfo += `  ❌ Error: ${error.message}\n`;
                break;
            }
        }
    }
    
    try {
        // Start from root
        await checkAllNodes("None", 0);
        
        const processingTime = Date.now() - startTime;
        
        debugInfo += `\n📊 FINAL RESULTS:\n`;
        debugInfo += `Total nodes checked: ${totalNodesChecked}\n`;
        debugInfo += `Recent nodes found: ${recentNodes.length}\n`;
        debugInfo += `Processing time: ${processingTime}ms\n`;
        
        console.log(`✅ Exhaustive check complete: ${totalNodesChecked} nodes, ${recentNodes.length} recent`);
        
        res.json({
            success: true,
            totalNodesChecked,
            recentNodes,
            processingTime,
            debugInfo
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.json({
            success: false,
            error: error.message,
            debugInfo
        });
    }
});

app.listen(PORT, () => {
    console.log(`\n🔍 Exhaustive WorkFlowy Timestamp Checker\n`);
    console.log(`🌐 Server: http://localhost:${PORT}`);
    console.log(`📊 Checks EVERY node to find recent modifications\n`);
});


