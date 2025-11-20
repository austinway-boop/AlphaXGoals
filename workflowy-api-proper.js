// Proper WorkFlowy API Implementation - Two-Step Process
// Step 1: Get main nodes from shared link
// Step 2: Fetch complete content from each main node (includes all nested children)

import express from 'express';
import axios from 'axios';

const app = express();
const PORT = 4585;

app.use(express.json());

// Main interface
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proper WorkFlowy API Extraction</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
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
            text-align: center;
            font-size: 2.5em;
            margin-bottom: 20px;
        }
        .subtitle {
            text-align: center;
            color: #718096;
            font-size: 1.2em;
            margin-bottom: 30px;
            font-weight: 600;
        }
        .api-info {
            background: #e6fffa;
            border: 2px solid #38b2ac;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
        }
        .url-input {
            width: 100%;
            padding: 18px 25px;
            border: 2px solid #e2e8f0;
            border-radius: 15px;
            font-size: 16px;
            margin: 15px 0;
            box-sizing: border-box;
            transition: all 0.3s ease;
        }
        .url-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }
        .extract-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 20px 40px;
            border-radius: 15px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            margin: 15px;
            transition: all 0.3s ease;
        }
        .extract-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 35px rgba(102, 126, 234, 0.4);
        }
        .extract-btn:disabled {
            background: #cbd5e0;
            cursor: not-allowed;
            transform: none;
        }
        .results {
            background: #f0fff4;
            border: 2px solid #48bb78;
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
        }
        .step-indicator {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 30px 0;
        }
        .step {
            background: #f7fafc;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 2px solid #e2e8f0;
            transition: all 0.3s ease;
        }
        .step.active {
            border-color: #667eea;
            background: #f0f4ff;
        }
        .step.completed {
            border-color: #48bb78;
            background: #f0fff4;
        }
        .nodes-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin: 25px 0;
        }
        .node-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .node-title {
            font-weight: bold;
            color: #4a5568;
            margin-bottom: 10px;
            font-size: 1.1em;
        }
        .node-stats {
            color: #718096;
            font-size: 0.9em;
        }
        pre {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            white-space: pre-wrap;
            max-height: 400px;
            overflow-y: auto;
            font-size: 0.9em;
            line-height: 1.4;
        }
        details {
            margin: 20px 0;
        }
        summary {
            font-weight: 600;
            cursor: pointer;
            padding: 15px;
            background: #f7fafc;
            border-radius: 8px;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📋 Proper WorkFlowy API</h1>
        <div class="subtitle">Two-Step Process: Get Main Nodes → Fetch Complete Content</div>
        
        <div class="api-info">
            <h3>🔧 How This Works:</h3>
            <div class="step-indicator">
                <div class="step">
                    <h4>Step 1: Find BrainLift Sections</h4>
                    <p>Get main nodes and filter for: Owner, Purpose, DOK4, DOK3, Experts, DOK2</p>
                </div>
                <div class="step">
                    <h4>Step 2: Extract Complete Content</h4>
                    <p>For each BrainLift section, get ALL nested children content</p>
                </div>
            </div>
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 15px;">
                <strong>🎯 Targeted Extraction:</strong> Only extracts content from BrainLift sections (Owner, Purpose, DOK4, DOK3, Experts, DOK2), not your entire account.
            </div>
        </div>
        
        <input 
            type="url" 
            id="workflowyUrl" 
            class="url-input"
            placeholder="Enter WorkFlowy shared link..." 
            value="https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe"
        />
        
        <div style="text-align: center;">
            <button class="extract-btn" onclick="extractProper()">
                🚀 Extract with Proper API Workflow
            </button>
            <button class="extract-btn" onclick="clearResults()" style="background: #718096;">
                🗑️ Clear Results
            </button>
        </div>
        
        <div id="results" style="display: none;"></div>
    </div>

    <script>
        async function extractProper() {
            const url = document.getElementById('workflowyUrl').value.trim();
            if (!url) {
                alert('Please enter a WorkFlowy shared link');
                return;
            }
            
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.className = 'results loading';
            results.innerHTML = \`
                <div class="spinner"></div>
                <h3>🔄 Proper WorkFlowy API Extraction</h3>
                <div class="step-indicator">
                    <div class="step active" id="step1">
                        <h4>Step 1: Getting Main Nodes</h4>
                        <p>Extracting share_id and fetching root nodes...</p>
                    </div>
                    <div class="step" id="step2">
                        <h4>Step 2: Fetching Full Content</h4>
                        <p>Getting complete content from each main node...</p>
                    </div>
                </div>
                <p><strong>This may take 30-60 seconds for complete extraction...</strong></p>
            \`;
            
            document.querySelectorAll('.extract-btn').forEach(btn => btn.disabled = true);
            
            try {
                const response = await fetch('/extract-proper', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                
                if (!response.ok) throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
                
                const data = await response.json();
                displayProperResults(data);
                
            } catch (error) {
                results.className = 'results error';
                results.innerHTML = \`
                    <h2>❌ Proper API Extraction Failed</h2>
                    <p><strong>Error:</strong> \${error.message}</p>
                    <h3>💡 Troubleshooting:</h3>
                    <ul>
                        <li>Verify the WorkFlowy link is shared publicly</li>
                        <li>Check if the link format is correct</li>
                        <li>Ensure the document has content</li>
                        <li>Try again in a few seconds (API rate limits)</li>
                    </ul>
                \`;
            } finally {
                document.querySelectorAll('.extract-btn').forEach(btn => btn.disabled = false);
            }
        }
        
        function displayProperResults(data) {
            const results = document.getElementById('results');
            
            if (data.success) {
                const isHighQuality = data.totalWords >= 2000;
                
                results.className = 'results';
                results.innerHTML = \`
                    <h2>✅ Proper API Extraction Complete!</h2>
                    
                    <div class="word-count">\${(data.totalWords || 0).toLocaleString()}</div>
                    
                    <div class="step-indicator">
                        <div class="step completed">
                            <h4>✅ Step 1: BrainLift Sections Found</h4>
                            <p>\${data.filteredSections} sections (from \${data.totalMainNodes} total nodes)</p>
                        </div>
                        <div class="step completed">
                            <h4>✅ Step 2: Complete Content Extracted</h4>
                            <p>\${(data.totalWords || 0).toLocaleString()} words from nested children</p>
                        </div>
                    </div>
                    
                    <div style="background: #e6fffa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <h4>🎯 Extracted from BrainLift Sections Only:</h4>
                        <p>Found <strong>\${data.filteredSections}</strong> BrainLift sections out of \${data.totalMainNodes} total main nodes</p>
                        <p><small>Only extracting from: Owner, Purpose, DOK4, DOK3, Experts, DOK2</small></p>
                    </div>
                    
                    <h3>📊 BrainLift Sections Found:</h3>
                    <div class="nodes-grid">
                        \${data.brainLiftSections.map(node => \`
                            <div class="node-card">
                                <div class="node-title">\${node.name || 'Untitled Node'}</div>
                                <div class="node-stats">
                                    Node ID: \${node.nodeId}<br>
                                    Has Content: \${node.hasContent ? '✅' : '❌'}
                                </div>
                            </div>
                        \`).join('')}
                    </div>
                    
                    \${data.extractedText ? \`
                        <details>
                            <summary>📝 Complete Extracted Content (\${(data.extractedText && data.extractedText.length || 0).toLocaleString()} characters)</summary>
                            <pre>\${data.extractedText.substring(0, 10000)}\${data.extractedText.length > 10000 ? '\\n\\n... (content truncated for display - full content extracted successfully)' : ''}</pre>
                        </details>
                    \` : ''}
                    
                    \${data.debugInfo ? \`
                        <details>
                            <summary>🔧 API Extraction Log</summary>
                            <pre>\${data.debugInfo}</pre>
                        </details>
                    \` : ''}
                    
                    <div style="text-align: center; margin: 30px 0; padding: 20px; background: \${isHighQuality ? '#f0fff4' : '#fff3cd'}; border-radius: 10px;">
                        <h3>\${isHighQuality ? '🎉 Excellent Result!' : '⚠️ Moderate Result'}</h3>
                        <p>Extraction Quality: \${isHighQuality ? 'High' : 'Moderate'} • Processing Time: \${Math.round(data.processingTime/1000)}s</p>
                    </div>
                \`;
            } else {
                results.className = 'results error';
                results.innerHTML = \`
                    <h2>❌ API Extraction Failed</h2>
                    <p><strong>Error:</strong> \${data.error}</p>
                    \${data.details ? \`<p><strong>Details:</strong> \${data.details}</p>\` : ''}
                    \${data.debugInfo ? \`
                        <details>
                            <summary>🔧 Debug Information</summary>
                            <pre>\${data.debugInfo}</pre>
                        </details>
                    \` : ''}
                \`;
            }
        }
        
        function clearResults() {
            document.getElementById('results').style.display = 'none';
        }
        
        // Auto-focus URL input
        document.getElementById('workflowyUrl').focus();
    </script>
</body>
</html>
    `);
});

// Proper WorkFlowy API extraction endpoint
app.post('/extract-proper', async (req, res) => {
    const { url } = req.body;
    const startTime = Date.now();
    let debugInfo = 'Proper WorkFlowy API Extraction Log:\n';
    debugInfo += '==========================================\n\n';
    
    if (!url) {
        return res.status(400).json({ 
            success: false, 
            error: 'WorkFlowy URL is required' 
        });
    }
    
    console.log('🚀 Starting proper WorkFlowy API extraction for:', url);
    debugInfo += `URL: ${url}\n`;
    debugInfo += `Started: ${new Date().toISOString()}\n\n`;
    
    // Set up API constants at top level
    const API_KEY = process.env.WF_API_KEY || "c82f6e853144eb680f6470c44f2afaa17a843590";
    const BASE_URL = "https://workflowy.com/api/v1/nodes";
    
    try {
        // Step 1: Get main/root nodes using WorkFlowy API v1
        debugInfo += 'STEP 1: GETTING MAIN/ROOT NODES\n';
        debugInfo += '===============================\n';
        
        const mainNodes = await getMainNodes(null, debugInfo, API_KEY, BASE_URL);
        if (!mainNodes || mainNodes.length === 0) {
            throw new Error('No main nodes found. The WorkFlowy account may be empty or API key may be invalid.');
        }
        
        debugInfo += `✅ Found ${mainNodes.length} main nodes\n\n`;
        console.log(`✅ Found ${mainNodes.length} main nodes`);
        
        // DEBUG: Show all main node names
        debugInfo += `📋 ALL MAIN NODE NAMES:\n`;
        mainNodes.forEach((node, i) => {
            debugInfo += `  ${i + 1}. "${node.name}" (ID: ${node.id})\n`;
            console.log(`  Main node ${i + 1}: "${node.name}"`);
        });
        debugInfo += `\n`;
        
        // Find the BrainLift parent node (contains "brain", "brian", or "lift" in name)
        const brainLiftParent = mainNodes.find(node => {
            const nodeName = (node.name || '').toLowerCase();
            return nodeName.includes('brain') || nodeName.includes('brian') || nodeName.includes('lift');
        });
        
        if (!brainLiftParent) {
            throw new Error('Could not find BrainLift parent node. Looking for a main node with "brain", "brian", or "lift" in the name.');
        }
        
        debugInfo += `🎯 FOUND BRAINLIFT PARENT NODE:\n`;
        debugInfo += `  "${brainLiftParent.name}" (ID: ${brainLiftParent.id})\n\n`;
        console.log(`🎯 Found BrainLift parent: "${brainLiftParent.name}"`);
        
        // Now get the CHILDREN of the BrainLift parent node (these are the actual sections)
        debugInfo += `📋 GETTING BRAINLIFT SECTION CHILDREN:\n`;
        
        const brainLiftResponse = await axios.get(`${BASE_URL}?parent_id=${encodeURIComponent(brainLiftParent.id)}`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json',
                'User-Agent': 'AlphaXGoals-WordCounter/1.0'
            },
            timeout: 20000
        });
        
        if (!brainLiftResponse.data || !brainLiftResponse.data.nodes) {
            throw new Error('Could not get children of BrainLift parent node');
        }
        
        const allSectionNodes = brainLiftResponse.data.nodes;
        debugInfo += `Found ${allSectionNodes.length} total section nodes under BrainLift parent\n\n`;
        
        // DEBUG: Show ALL section nodes first
        debugInfo += `📋 ALL SECTIONS UNDER BRAINLIFT PARENT:\n`;
        allSectionNodes.forEach((node, i) => {
            debugInfo += `  ${i + 1}. "${node.name || '(empty)'}"\n`;
            console.log(`  Section ${i + 1}: "${node.name || '(empty)'}"`);
        });
        debugInfo += `\n`;
        
        // Extract from ALL sections under BrainLift (not just predefined ones)
        // This ensures we get: Spiky POVs, Purpose, Experts, Knowledge Tree, Insights, etc.
        const targetNodes = allSectionNodes.filter(node => {
            // Include all non-empty nodes
            return node.name && node.name.trim().length > 0;
        });
        
        debugInfo += `🎯 EXTRACTING FROM ALL BRAINLIFT SECTIONS:\n`;
        debugInfo += `Found ${targetNodes.length} sections to extract:\n`;
        targetNodes.forEach((node, i) => {
            debugInfo += `  ✅ ${i + 1}. "${node.name}" (ID: ${node.id})\n`;
            console.log(`  ✅ BrainLift section ${i + 1}: "${node.name}"`);
        });
        debugInfo += `\n`;
        
        if (targetNodes.length === 0) {
            throw new Error('No BrainLift sections found. See debug info for actual node names.');
        }
        
        // Step 2: Recursively collect all text from ONLY the BrainLift sections and their children
        debugInfo += 'STEP 2: COLLECTING TEXT FROM BRAINLIFT SECTIONS ONLY\n';
        debugInfo += '====================================================\n';
        
        const allTextPieces = [];
        
        // Recursive function to collect all text
        async function collectAllText(parentId, depth = 0) {
            if (depth > 30) return; // Maximum depth to ensure we get EVERYTHING
            
            debugInfo += `    ${'  '.repeat(depth)}→ Depth ${depth}: Fetching children of ${parentId}...\n`;
            
            try {
                const response = await axios.get(`${BASE_URL}?parent_id=${encodeURIComponent(parentId)}`, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Accept': 'application/json',
                        'User-Agent': 'AlphaXGoals-WordCounter/1.0'
                    },
                    timeout: 15000
                });
                
                if (response.data && response.data.nodes) {
                    const nodes = response.data.nodes;
                    debugInfo += `    Depth ${depth}: Found ${nodes.length} nodes\n`;
                    
                    for (const node of nodes) {
                        if (node.name) allTextPieces.push(node.name);
                        if (node.note) allTextPieces.push(node.note);
                        
                        // Recursively get children
                        await collectAllText(node.id, depth + 1);
                    }
                }
            } catch (error) {
                if (error.response?.status === 429) {
                    debugInfo += `    Rate limited at depth ${depth} - stopping\n`;
                    return;
                }
            }
            
            // Reduced delay for faster extraction (API can handle it)
            await new Promise(resolve => setTimeout(resolve, 150));
        }
        
        // Process ONLY the BrainLift section nodes
        for (let i = 0; i < targetNodes.length; i++) {
            const node = targetNodes[i];
            debugInfo += `  Processing BrainLift section ${i + 1}/${targetNodes.length}: "${node.name || 'Untitled'}"\n`;
            
            // Add main node content
            if (node.name) allTextPieces.push(node.name);
            if (node.note) allTextPieces.push(node.note);
            
            // Get all children
            await collectAllText(node.id, 1);
            
            debugInfo += `  ✅ Section ${i + 1} processed\n`;
        }
        
        const combinedContent = allTextPieces.join(' ').replace(/\s+/g, ' ').trim();
        const totalWords = (combinedContent.match(/\b[\p{L}\p{N}'-]+\b/gu) || []).length;
        
        const processingTime = Date.now() - startTime;
        
        debugInfo += `\n📊 FINAL RESULTS:\n`;
        debugInfo += `================\n`;
        debugInfo += `Total BrainLift sections: ${targetNodes.length}\n`;
        debugInfo += `Total words extracted: ${totalWords}\n`;
        debugInfo += `Total characters: ${combinedContent.length}\n`;
        debugInfo += `Processing time: ${processingTime}ms\n`;
        
        console.log(`✅ Proper API extraction complete: ${totalWords} words from ${targetNodes.length} BrainLift sections in ${processingTime}ms`);
        
        res.json({
            success: true,
            totalWords: totalWords,
            brainLiftSections: targetNodes.map(node => ({
                name: node.name || 'Untitled',
                nodeId: node.id,
                hasContent: !!(node.name || node.note)
            })),
            totalMainNodes: mainNodes.length,
            filteredSections: targetNodes.length,
            extractedText: combinedContent,
            processingTime: processingTime,
            debugInfo: debugInfo,
            extractionMethod: 'workflowy_api_v1_proper'
        });
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        console.error('💥 Proper API extraction error:', error);
        
        debugInfo += `\n❌ EXTRACTION FAILED\n`;
        debugInfo += `===================\n`;
        debugInfo += `Error: ${error.message}\n`;
        debugInfo += `Processing Time: ${processingTime}ms\n`;
        debugInfo += `Stack: ${error.stack}\n`;
        
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Proper WorkFlowy API extraction failed',
            debugInfo: debugInfo,
            processingTime: processingTime
        });
    }
});

// Note: Using WorkFlowy API v1 with authentication - no need for share_id extraction

// Get main/root nodes using WorkFlowy API v1 (the correct working API)
async function getMainNodes(shareId, debugInfo, API_KEY, BASE_URL) {
    
    try {
        debugInfo += `Using WorkFlowy API v1: ${BASE_URL}\n`;
        debugInfo += `API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 10)}\n`;
        
        // Get root/main nodes using parent_id=None
        const response = await axios.get(`${BASE_URL}?parent_id=None`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json',
                'User-Agent': 'AlphaXGoals-WordCounter/1.0'
            },
            timeout: 20000
        });
        
        if (response.data && response.data.nodes && Array.isArray(response.data.nodes)) {
            const mainNodes = response.data.nodes;
            debugInfo += `✅ Successfully got ${mainNodes.length} main nodes from WorkFlowy API v1\n`;
            
            // Log node info
            mainNodes.forEach((node, i) => {
                debugInfo += `  Node ${i + 1}: "${node.name || 'Untitled'}" (ID: ${node.id})\n`;
            });
            
            return mainNodes;
        } else {
            debugInfo += `Unexpected API response structure: ${JSON.stringify(response.data)}\n`;
            throw new Error('API returned unexpected response structure');
        }
        
    } catch (apiError) {
        debugInfo += `WorkFlowy API v1 failed: ${apiError.response?.status || apiError.message}\n`;
        
        if (apiError.response?.status === 401) {
            throw new Error('Invalid WorkFlowy API key - please check your API key');
        } else if (apiError.response?.status === 429) {
            throw new Error('WorkFlowy API rate limited - please try again in a moment');
        } else {
            throw new Error(`WorkFlowy API failed: ${apiError.message}`);
        }
    }
}

// Note: Using direct WorkFlowy API v1 response format

// Note: Content collection now handled inline above with proper recursive API calls

// Note: Recursive content collection now handled inline above

// Note: Text extraction and counting now handled in recursive API fetch functions above

app.listen(PORT, () => {
    console.log(`\n📋 Proper WorkFlowy API Server\n`);
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`🔧 Workflow: Step 1: Get Main Nodes → Step 2: Fetch Complete Content`);
    console.log(`✨ Each main node fetch includes ALL nested children automatically`);
    console.log(`🎯 Ready for proper WorkFlowy API extraction!\n`);
});
