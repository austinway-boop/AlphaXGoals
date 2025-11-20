// Debug script to see what timestamp fields WorkFlowy API actually returns
import express from 'express';
import axios from 'axios';

const app = express();
const PORT = 4587;

app.use(express.json());

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Debug WorkFlowy Timestamps</title>
    <style>
        body { font-family: Arial; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; }
        h1 { color: #333; }
        button { padding: 15px 30px; font-size: 16px; background: #4CAF50; color: white; border: none; cursor: pointer; border-radius: 5px; }
        button:hover { background: #45a049; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px; line-height: 1.4; }
        .node-card { background: #e8f5e9; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; border-radius: 5px; }
        .timestamp { background: #fff3cd; padding: 3px 8px; border-radius: 3px; font-family: monospace; margin: 2px; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 WorkFlowy Timestamp Debugger</h1>
        <p>This will show you EXACTLY what fields and timestamps WorkFlowy API returns for nodes.</p>
        <button onclick="debugTimestamps()">🔍 Debug Node Timestamps</button>
        <div id="results"></div>
    </div>
    
    <script>
        async function debugTimestamps() {
            const results = document.getElementById('results');
            results.innerHTML = '<h3>⏳ Fetching nodes and inspecting timestamps...</h3>';
            
            try {
                const response = await fetch('/debug-timestamps', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    let html = '<h2>✅ Node Timestamp Debug Results</h2>';
                    html += '<p><strong>Total nodes inspected:</strong> ' + data.nodesInspected + '</p>';
                    html += '<h3>Sample Nodes with ALL Fields:</h3>';
                    
                    data.sampleNodes.forEach((node, i) => {
                        html += '<div class="node-card">';
                        html += '<h4>Node ' + (i + 1) + ': "' + (node.name || '(no name)') + '"</h4>';
                        html += '<p><strong>All Fields Found:</strong></p>';
                        html += '<pre>' + JSON.stringify(node.allFields, null, 2) + '</pre>';
                        
                        if (node.timestampFields && node.timestampFields.length > 0) {
                            html += '<p><strong>🕒 Timestamp Fields Detected:</strong></p>';
                            node.timestampFields.forEach(field => {
                                const date = new Date(field.value);
                                html += '<span class="timestamp">' + field.name + ': ' + field.value + ' (' + date.toLocaleString() + ')</span> ';
                            });
                        } else {
                            html += '<p><strong>⚠️ NO TIMESTAMP FIELDS FOUND!</strong></p>';
                        }
                        
                        html += '</div>';
                    });
                    
                    html += '<h3>📋 Summary:</h3>';
                    html += '<p><strong>Timestamp field names found:</strong> ' + (data.allTimestampFields.join(', ') || 'NONE') + '</p>';
                    
                    results.innerHTML = html;
                } else {
                    results.innerHTML = '<h3>❌ Error: ' + data.error + '</h3>';
                }
            } catch (error) {
                results.innerHTML = '<h3>❌ Error: ' + error.message + '</h3>';
            }
        }
    </script>
</body>
</html>
    `);
});

app.post('/debug-timestamps', async (req, res) => {
    const API_KEY = process.env.WF_API_KEY || "c82f6e853144eb680f6470c44f2afaa17a843590";
    const BASE_URL = "https://workflowy.com/api/v1/nodes";
    
    console.log('🔍 Starting timestamp debug...');
    
    try {
        // Get main nodes
        const mainResponse = await axios.get(`${BASE_URL}?parent_id=None`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            timeout: 20000
        });
        
        const mainNodes = mainResponse.data.nodes || [];
        
        // Find BrainLift parent
        const brainLiftParent = mainNodes.find(node => {
            const name = (node.name || '').toLowerCase();
            return name.includes('brain') || name.includes('brian') || name.includes('lift');
        });
        
        if (!brainLiftParent) {
            return res.json({
                success: false,
                error: 'Could not find BrainLift parent node'
            });
        }
        
        // Get BrainLift sections
        const sectionsResponse = await axios.get(`${BASE_URL}?parent_id=${encodeURIComponent(brainLiftParent.id)}`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            timeout: 20000
        });
        
        const sections = sectionsResponse.data.nodes || [];
        
        // Collect sample nodes for inspection
        const sampleNodes = [];
        const allTimestampFieldsFound = new Set();
        let totalNodesInspected = sections.length;
        
        // Inspect section nodes
        for (const section of sections.slice(0, 5)) {
            const nodeInfo = {
                name: section.name,
                allFields: section,
                timestampFields: []
            };
            
            // Look for any field that might be a timestamp
            for (const [key, value] of Object.entries(section)) {
                // Check if it's a timestamp (number in reasonable range for Unix time)
                if (typeof value === 'number' && value > 1000000000 && value < 9999999999999) {
                    // WorkFlowy returns timestamps in SECONDS, not milliseconds
                    const timestampMs = value * 1000;
                    nodeInfo.timestampFields.push({
                        name: key,
                        value: value,
                        valueInMs: timestampMs,
                        readable: new Date(timestampMs).toISOString()
                    });
                    allTimestampFieldsFound.add(key);
                }
            }
            
            sampleNodes.push(nodeInfo);
        }
        
        // Also get some child nodes to inspect
        if (sections.length > 0) {
            const firstSection = sections[0];
            const childResponse = await axios.get(`${BASE_URL}?parent_id=${encodeURIComponent(firstSection.id)}`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Accept': 'application/json'
                },
                timeout: 20000
            });
            
            const children = childResponse.data.nodes || [];
            totalNodesInspected += children.length;
            
            for (const child of children.slice(0, 3)) {
                const nodeInfo = {
                    name: child.name,
                    allFields: child,
                    timestampFields: []
                };
                
                for (const [key, value] of Object.entries(child)) {
                    if (typeof value === 'number' && value > 1000000000 && value < 9999999999999) {
                        nodeInfo.timestampFields.push({
                            name: key,
                            value: value,
                            readable: new Date(value).toISOString()
                        });
                        allTimestampFieldsFound.add(key);
                    }
                }
                
                sampleNodes.push(nodeInfo);
            }
        }
        
        console.log('✅ Debug complete');
        console.log('Timestamp fields found:', Array.from(allTimestampFieldsFound));
        
        res.json({
            success: true,
            nodesInspected: totalNodesInspected,
            sampleNodes: sampleNodes,
            allTimestampFields: Array.from(allTimestampFieldsFound),
            note: 'These are the actual timestamp fields returned by WorkFlowy API'
        });
        
    } catch (error) {
        console.error('Debug error:', error);
        
        res.json({
            success: false,
            error: error.message,
            details: error.response?.data || 'No additional details'
        });
    }
});

app.listen(PORT, () => {
    console.log(`\n🔍 WorkFlowy Timestamp Debugger\n`);
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`📊 Debug what timestamp fields WorkFlowy API returns\n`);
});
