// Full WorkFlowy extractor using authenticated API 
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
    <title>WorkFlowy FULL Extractor</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        button { padding: 20px 40px; font-size: 20px; background: #4caf50; color: white; border: none; cursor: pointer; margin: 10px; }
        button:hover { background: #45a049; }
        #results { margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; }
        .success { background: #e8f5e8; border-left: 4px solid #4caf50; }
        .error { background: #ffebee; border-left: 4px solid #f44336; }
        .huge-count { font-size: 48px; font-weight: bold; color: #4caf50; text-align: center; margin: 20px 0; }
        .content-display { white-space: pre-line; line-height: 1.6; max-height: 600px; overflow-y: auto; background: white; padding: 20px; border: 1px solid #ddd; border-radius: 6px; }
    </style>
</head>
<body>
    <h1>🚀 WorkFlowy FULL Content Extractor</h1>
    <p><strong>Target:</strong> Extract ALL 9,000+ words from your WorkFlowy account</p>
    <p><strong>Method:</strong> Authenticated API with your key: c82f6e853144eb680f6470c44f2afaa17a843590</p>
    
    <button onclick="extractFullWorkFlowy()">🔥 EXTRACT ALL 9,000 WORDS</button>
    
    <div id="results" style="display: none;"></div>

    <script>
        async function extractFullWorkFlowy() {
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = '<h2>🔥 Extracting FULL WorkFlowy content...</h2><p>Using authenticated API to get EVERYTHING...</p>';
            
            try {
                const response = await fetch('/extract-full', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    results.className = 'success';
                    results.innerHTML = 
                        '<h2>🎉 FULL EXTRACTION SUCCESS!</h2>' +
                        '<div class="huge-count">' + data.wordCount.toLocaleString() + ' WORDS</div>' +
                        '<p><strong>Target Status:</strong> ' + (data.wordCount >= 8000 ? '✅ ACHIEVED!' : '⚠️ Still missing content') + '</p>' +
                        '<p><strong>Nodes Processed:</strong> ' + data.nodeCount + '</p>' +
                        '<p><strong>Content Length:</strong> ' + data.contentLength.toLocaleString() + ' characters</p>' +
                        '<p><strong>Processing Time:</strong> ' + data.processingTime + 'ms</p>' +
                        '<h3>📋 Complete WorkFlowy Content:</h3>' +
                        '<div class="content-display">' + data.extractedText + '</div>';
                } else {
                    results.className = 'error';
                    results.innerHTML = '<h2>❌ EXTRACTION FAILED</h2><p>' + data.error + '</p><p>' + (data.details || '') + '</p>';
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

app.post('/extract-full', async (req, res) => {
    const API_KEY = "c82f6e853144eb680f6470c44f2afaa17a843590";
    const BASE_URL = "https://workflowy.com/api/v1/nodes";
    
    console.log('🔥 STARTING FULL WORKFLOWY EXTRACTION...');
    console.log('🔑 Using API key:', API_KEY.substring(0, 10) + '...');
    
    const startTime = Date.now();
    let nodeCount = 0;
    let allContent = [];
    
    try {
        // Function to fetch nodes with better error handling
        async function fetchNodes(parentId = "None", depth = 0) {
            const url = `${BASE_URL}?parent_id=${encodeURIComponent(parentId)}`;
            console.log(`📡 [Depth ${depth}] Fetching: ${url}`);
            
            try {
                const response = await axios.get(url, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Accept': 'application/json',
                        'User-Agent': 'AlphaXGoals-Full-Extractor/1.0'
                    },
                    timeout: 30000
                });
                
                if (response.data && response.data.nodes) {
                    console.log(`✅ [Depth ${depth}] Found ${response.data.nodes.length} nodes`);
                    return response.data.nodes;
                } else {
                    console.log(`⚠️ [Depth ${depth}] No nodes in response`);
                    return [];
                }
                
            } catch (apiError) {
                if (apiError.response?.status === 404) {
                    console.log(`ℹ️ [Depth ${depth}] Node not found (likely leaf node): ${parentId}`);
                    return []; // This is normal for leaf nodes
                } else {
                    console.error(`❌ [Depth ${depth}] API error:`, apiError.response?.status, apiError.message);
                    throw apiError;
                }
            }
        }
        
        // Recursive function to get ALL content
        async function extractAllContent(parentId = "None", depth = 0, indent = "") {
            if (depth > 50) {
                console.log(`⚠️ Maximum depth reached at ${depth}`);
                return;
            }
            
            const nodes = await fetchNodes(parentId, depth);
            
            // Sort nodes by priority to maintain WorkFlowy order
            nodes.sort((a, b) => (a.priority || 0) - (b.priority || 0));
            
            for (const node of nodes) {
                nodeCount++;
                
                // Extract all text content from this node
                if (node.name) {
                    const formattedName = `${indent}• ${node.name}`;
                    allContent.push(formattedName);
                    console.log(`📝 [${nodeCount}] Name: ${node.name.substring(0, 60)}...`);
                }
                
                if (node.note) {
                    const formattedNote = `${indent}  📄 ${node.note}`;
                    allContent.push(formattedNote);
                    console.log(`📄 [${nodeCount}] Note: ${node.note.substring(0, 60)}...`);
                }
                
                // Add extra fields if they exist
                if (node.description) {
                    allContent.push(`${indent}  📋 ${node.description}`);
                }
                if (node.content && node.content !== node.name) {
                    allContent.push(`${indent}  💭 ${node.content}`);
                }
                
                // Recursively extract children with increased indentation
                await extractAllContent(node.id, depth + 1, indent + "  ");
            }
        }
        
        console.log('🌳 Starting complete tree extraction from root...');
        await extractAllContent("None");
        
        // If we didn't get much content, try a different approach
        if (nodeCount < 10) {
            console.log('⚠️ Low node count, trying alternative root nodes...');
            
            // Try to find actual root nodes by getting the user's main outline
            try {
                const rootResponse = await axios.get(`${BASE_URL}`, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Accept': 'application/json'
                    },
                    timeout: 30000
                });
                
                console.log('🔍 Root response:', rootResponse.data);
                
                if (rootResponse.data && rootResponse.data.nodes) {
                    console.log(`🌳 Found ${rootResponse.data.nodes.length} root nodes, extracting all...`);
                    
                    for (const rootNode of rootResponse.data.nodes) {
                        await extractAllContent(rootNode.id, 0, "");
                    }
                }
            } catch (rootError) {
                console.log('❌ Alternative root extraction failed:', rootError.message);
            }
        }
        
        // Combine all content
        const fullText = allContent.join('\n');
        
        // Count words using Unicode regex
        const words = fullText.match(/\b[\p{L}\p{N}'-]+\b/gu) || [];
        const processingTime = Date.now() - startTime;
        
        console.log('🎉 EXTRACTION COMPLETE!');
        console.log(`📊 Final stats: ${nodeCount} nodes, ${words.length} words, ${fullText.length} characters`);
        console.log(`⏱️ Processing time: ${processingTime}ms`);
        
        if (words.length < 1000) {
            console.log('⚠️ Word count seems low - API may not have access to full content');
            console.log('📋 Content preview:', fullText.substring(0, 500));
        }
        
        res.json({
            success: true,
            wordCount: words.length,
            nodeCount: nodeCount,
            contentLength: fullText.length,
            processingTime: processingTime,
            extractedText: fullText,
            targetAchieved: words.length >= 8000
        });
        
    } catch (error) {
        console.error('💥 Full extraction error:', error);
        
        let errorDetails = error.message;
        if (error.response?.status === 401) {
            errorDetails = 'API key invalid or expired. Get a new one at https://workflowy.com/api-key';
        } else if (error.response?.status === 403) {
            errorDetails = 'Access forbidden. Your API key may not have permission to access this content.';
        } else if (error.response?.status === 404) {
            errorDetails = 'Content not found. Your WorkFlowy account may be empty or the API structure has changed.';
        }
        
        res.json({
            success: false,
            error: error.message,
            details: errorDetails,
            nodeCount: nodeCount,
            httpStatus: error.response?.status
        });
    }
});

app.listen(PORT, () => {
    console.log(`🔥 WorkFlowy FULL extractor running at http://localhost:${PORT}`);
    console.log('🎯 Ready to extract ALL 9,000+ words using authenticated API');
});


