// WorkFlowy Timestamp-Based Word Counter
// Counts ONLY words added/modified during a specific time period
// Perfect for tracking BrainLift goal progress!

import express from 'express';
import axios from 'axios';

const app = express();
const PORT = 4586;

app.use(express.json());

// Main interface
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BrainLift Progress Tracker</title>
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
        }
        h1 {
            color: #4a5568;
            text-align: center;
            font-size: 2.5em;
            margin-bottom: 15px;
        }
        .subtitle {
            text-align: center;
            color: #718096;
            font-size: 1.2em;
            margin-bottom: 35px;
        }
        .info-banner {
            background: linear-gradient(135deg, #48bb78, #38a169);
            color: white;
            padding: 25px;
            border-radius: 15px;
            margin-bottom: 30px;
            text-align: center;
        }
        .time-section {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 12px;
            margin: 25px 0;
            border-left: 5px solid #667eea;
        }
        label {
            display: block;
            font-weight: 600;
            margin: 15px 0 8px;
            color: #4a5568;
        }
        input[type="datetime-local"],
        input[type="url"] {
            width: 100%;
            padding: 15px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            font-size: 16px;
            box-sizing: border-box;
            transition: all 0.3s ease;
        }
        input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 18px 35px;
            border-radius: 12px;
            font-size: 17px;
            font-weight: 600;
            cursor: pointer;
            margin: 15px 5px;
            transition: all 0.3s ease;
        }
        .btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 25px rgba(102, 126, 234, 0.3);
        }
        .btn:disabled {
            background: #cbd5e0;
            cursor: not-allowed;
            transform: none;
        }
        .btn.secondary {
            background: linear-gradient(135deg, #48bb78, #38a169);
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
            font-size: 4.5em;
            font-weight: bold;
            color: #667eea;
            text-align: center;
            margin: 30px 0;
            text-shadow: 0 3px 6px rgba(0,0,0,0.1);
        }
        .word-label {
            text-align: center;
            font-size: 1.3em;
            color: #718096;
            margin-top: -20px;
            margin-bottom: 30px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 6px 12px rgba(0,0,0,0.1);
            border: 2px solid #f7fafc;
        }
        .stat-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            color: #718096;
            font-size: 1em;
            margin-top: 8px;
        }
        .quick-times {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .quick-time {
            background: #e6fffa;
            border: 2px solid #38b2ac;
            padding: 20px;
            border-radius: 10px;
            cursor: pointer;
            text-align: center;
            transition: all 0.3s ease;
        }
        .quick-time:hover {
            background: #b2f5ea;
            transform: translateY(-2px);
        }
        pre {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            white-space: pre-wrap;
            max-height: 400px;
            overflow-y: auto;
            font-size: 0.9em;
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
        <h1>📊 BrainLift Progress Tracker</h1>
        <div class="subtitle">Count words added/modified during your goal period</div>
        
        <div class="info-banner">
            🎯 Tracks ONLY new or modified content during your specified time period!
        </div>
        
        <div class="time-section">
            <h3>⏰ Time Period</h3>
            <p>Specify when your goal started and ended to count words added during that time.</p>
            
            <label for="startTime">Goal Start Time:</label>
            <input type="datetime-local" id="startTime" />
            
            <label for="endTime">Goal End Time:</label>
            <input type="datetime-local" id="endTime" />
            
            <div class="quick-times">
                <div class="quick-time" onclick="setLast24Hours()">
                    📅 Last 24 Hours
                </div>
                <div class="quick-time" onclick="setToday()">
                    📅 Today
                </div>
                <div class="quick-time" onclick="setThisWeek()">
                    📅 This Week
                </div>
                <div class="quick-time" onclick="setCustom()">
                    📅 Custom Range
                </div>
            </div>
        </div>
        
        <div class="time-section">
            <h3>🔗 WorkFlowy Link</h3>
            <label for="workflowyUrl">Your BrainLift Link:</label>
            <input 
                type="url" 
                id="workflowyUrl" 
                placeholder="https://workflowy.com/s/..." 
                value="https://workflowy.com/s/austin-way/gPcTQ6FgP5HLknBe"
            />
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <button class="btn" onclick="countProgressWords()">
                📊 Count Words Added During Goal
            </button>
            <button class="btn secondary" onclick="setNowAsEnd()">
                ⏰ Use Now as End Time
            </button>
        </div>
        
        <div id="results" style="display: none;"></div>
    </div>

    <script>
        // Set default times (last 24 hours)
        setLast24Hours();
        
        function setLast24Hours() {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            
            document.getElementById('endTime').value = formatDateTime(now);
            document.getElementById('startTime').value = formatDateTime(yesterday);
        }
        
        function setToday() {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            document.getElementById('startTime').value = formatDateTime(startOfDay);
            document.getElementById('endTime').value = formatDateTime(now);
        }
        
        function setThisWeek() {
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            document.getElementById('startTime').value = formatDateTime(weekAgo);
            document.getElementById('endTime').value = formatDateTime(now);
        }
        
        function setCustom() {
            alert('Use the date/time pickers above to set your custom time range!');
            document.getElementById('startTime').focus();
        }
        
        function setNowAsEnd() {
            document.getElementById('endTime').value = formatDateTime(new Date());
        }
        
        function formatDateTime(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return \`\${year}-\${month}-\${day}T\${hours}:\${minutes}\`;
        }
        
        async function countProgressWords() {
            const startTime = document.getElementById('startTime').value;
            const endTime = document.getElementById('endTime').value;
            const url = document.getElementById('workflowyUrl').value.trim();
            
            if (!startTime || !endTime) {
                alert('Please select start and end times for your goal period');
                return;
            }
            
            if (!url) {
                alert('Please enter your BrainLift WorkFlowy link');
                return;
            }
            
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.className = 'results loading';
            results.innerHTML = \`
                <div class="spinner"></div>
                <h3>📊 Counting words added during goal period...</h3>
                <p><strong>Time Range:</strong></p>
                <p>Start: \${new Date(startTime).toLocaleString()}</p>
                <p>End: \${new Date(endTime).toLocaleString()}</p>
                <p><strong>This may take 30-120 seconds to check all nodes...</strong></p>
            \`;
            
            document.querySelectorAll('.btn').forEach(btn => btn.disabled = true);
            
            try {
                const response = await fetch('/count-progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url,
                        startTime: new Date(startTime).getTime(),
                        endTime: new Date(endTime).getTime()
                    })
                });
                
                if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
                
                const data = await response.json();
                displayProgressResults(data, startTime, endTime);
                
            } catch (error) {
                results.className = 'results error';
                results.innerHTML = \`
                    <h2>❌ Progress Counting Failed</h2>
                    <p><strong>Error:</strong> \${error.message}</p>
                \`;
            } finally {
                document.querySelectorAll('.btn').forEach(btn => btn.disabled = false);
            }
        }
        
        function displayProgressResults(data, startTime, endTime) {
            const results = document.getElementById('results');
            
            if (data.success) {
                const isGoodProgress = data.wordsAdded >= 1000;
                
                results.className = 'results';
                results.innerHTML = \`
                    <h2>✅ Progress Calculated!</h2>
                    
                    <div class="word-count">\${data.wordsAdded.toLocaleString()}</div>
                    <div class="word-label">Words Added During Goal Period</div>
                    
                    <div style="background: \${isGoodProgress ? '#f0fff4' : '#fff3cd'}; padding: 20px; border-radius: 10px; margin: 25px 0; text-align: center;">
                        <h3>\${isGoodProgress ? '🎉 Great Progress!' : '⚠️ Keep Going!'}</h3>
                        <p>\${isGoodProgress ? 'You exceeded the 1000-word goal!' : 'Target: 1000+ words for ambitious goal'}</p>
                    </div>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">\${data.wordsAdded.toLocaleString()}</div>
                            <div class="stat-label">Words Added</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">\${data.nodesModified || 0}</div>
                            <div class="stat-label">Nodes Modified</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">\${data.nodesCreated || 0}</div>
                            <div class="stat-label">Nodes Created</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">\${Math.round(data.processingTime/1000)}s</div>
                            <div class="stat-label">Processing Time</div>
                        </div>
                    </div>
                    
                    <div style="background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <h4>⏰ Time Period:</h4>
                        <p><strong>Start:</strong> \${new Date(startTime).toLocaleString()}</p>
                        <p><strong>End:</strong> \${new Date(endTime).toLocaleString()}</p>
                        <p><strong>Duration:</strong> \${Math.round((new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60))} hours</p>
                    </div>
                    
                    \${data.debugInfo ? \`
                        <details>
                            <summary>🔧 Extraction Details</summary>
                            <pre>\${data.debugInfo}</pre>
                        </details>
                    \` : ''}
                \`;
            } else {
                results.className = 'results error';
                results.innerHTML = \`
                    <h2>❌ Progress Counting Failed</h2>
                    <p><strong>Error:</strong> \${data.error}</p>
                    \${data.debugInfo ? \`
                        <details>
                            <summary>🔧 Debug Info</summary>
                            <pre>\${data.debugInfo}</pre>
                        </details>
                    \` : ''}
                \`;
            }
        }
    </script>
</body>
</html>
    `);
});

// Timestamp-based word count endpoint
app.post('/count-progress', async (req, res) => {
    const { url, startTime, endTime } = req.body;
    const processingStart = Date.now();
    let debugInfo = 'BrainLift Progress Tracking Log:\n';
    debugInfo += '================================\n\n';
    
    if (!url || !startTime || !endTime) {
        return res.status(400).json({
            success: false,
            error: 'URL, startTime, and endTime are required'
        });
    }
    
    console.log(`📊 Counting words added between ${new Date(startTime).toISOString()} and ${new Date(endTime).toISOString()}`);
    debugInfo += `Time Range: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}\n`;
    debugInfo += `URL: ${url}\n\n`;
    
    try {
        const API_KEY = process.env.WF_API_KEY || "c82f6e853144eb680f6470c44f2afaa17a843590";
        const BASE_URL = "https://workflowy.com/api/v1/nodes";
        
        // Get all main nodes
        const mainResponse = await axios.get(`${BASE_URL}?parent_id=None`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            timeout: 20000
        });
        
        const mainNodes = mainResponse.data.nodes || [];
        debugInfo += `Found ${mainNodes.length} main nodes\n`;
        
        // Find BrainLift parent
        const brainLiftParent = mainNodes.find(node => {
            const name = (node.name || '').toLowerCase();
            return name.includes('brain') || name.includes('brian') || name.includes('lift');
        });
        
        if (!brainLiftParent) {
            throw new Error('Could not find BrainLift parent node');
        }
        
        debugInfo += `Found BrainLift parent: "${brainLiftParent.name}"\n\n`;
        
        // Get BrainLift sections
        const sectionsResponse = await axios.get(`${BASE_URL}?parent_id=${encodeURIComponent(brainLiftParent.id)}`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            timeout: 20000
        });
        
        const brainLiftSections = (sectionsResponse.data.nodes || []).filter(n => n.name && n.name.trim());
        debugInfo += `Found ${brainLiftSections.length} BrainLift sections\n\n`;
        
        // Count words from nodes modified/created during time period
        let totalWordsAdded = 0;
        let nodesModified = 0;
        let nodesCreated = 0;
        let totalNodesChecked = 0;
        
        // Recursive function to check timestamps and count words with smart sub-checking
        async function countWordsInTimeRange(parentId, parentWasModified = true, depth = 0) {
            if (depth > 30) return 0;
            
            let retries = 0;
            const maxRetries = 5;
            
            while (retries < maxRetries) {
                try {
                    const response = await axios.get(`${BASE_URL}?parent_id=${encodeURIComponent(parentId)}`, {
                        headers: {
                            'Authorization': `Bearer ${API_KEY}`,
                            'Accept': 'application/json'
                        },
                        timeout: 20000
                    });
                    
                    if (!response.data || !response.data.nodes) return 0;
                    
                    const nodes = response.data.nodes;
                    let wordsFromThisLevel = 0;
                    
                    for (const node of nodes) {
                        totalNodesChecked++;
                        
                    // WorkFlowy returns timestamps in SECONDS, not milliseconds!
                    const nodeCreated = (node.created_at || node.createdAt || 0) * 1000; // Convert to ms
                    const nodeModified = (node.modified_at || node.modifiedAt || node.last_modified || 0) * 1000; // Convert to ms
                    
                    // Check if node was created or modified in time range
                    const wasCreatedInRange = nodeCreated >= startTime && nodeCreated <= endTime;
                    const wasModifiedInRange = nodeModified >= startTime && nodeModified <= endTime;
                    const nodeInRange = wasCreatedInRange || wasModifiedInRange;
                    
                    // Debug logging for first few nodes
                    if (totalNodesChecked <= 5) {
                        debugInfo += `  ${'  '.repeat(depth)}🔍 Node "${node.name || 'no name'}": created=${new Date(nodeCreated).toISOString()}, modified=${new Date(nodeModified).toISOString()}, inRange=${nodeInRange}\n`;
                    }
                        
                        if (nodeInRange) {
                            // Count words from this node's content
                            let nodeContent = '';
                            if (node.name) nodeContent += node.name + ' ';
                            if (node.note) nodeContent += node.note + ' ';
                            
                            const words = nodeContent.trim().split(/\s+/).filter(w => w.length > 0);
                            const wordCount = words.length;
                            
                            if (wordCount > 0) {
                                wordsFromThisLevel += wordCount;
                                
                                if (wasCreatedInRange) nodesCreated++;
                                if (wasModifiedInRange) nodesModified++;
                                
                                debugInfo += `  ${'  '.repeat(depth)}✅ "${node.name ? node.name.substring(0, 40) : 'no name'}" - ${wordCount} words (${wasCreatedInRange ? 'CREATED' : 'MODIFIED'})\n`;
                            }
                        }
                        
                        // SMART SUB-CHECKING: Only check children if node was modified in range
                        // OR if node was created recently (might have modified children)  
                        const shouldCheckChildren = nodeInRange || (nodeCreated >= startTime) || (nodeModified >= startTime);
                        
                        if (shouldCheckChildren) {
                            debugInfo += `  ${'  '.repeat(depth)}  ↳ Checking children (node was ${nodeInRange ? 'modified' : 'created recently'})\n`;
                            const childWords = await countWordsInTimeRange(node.id, nodeInRange, depth + 1);
                            wordsFromThisLevel += childWords;
                        } else {
                            debugInfo += `  ${'  '.repeat(depth)}  ⊗ Skipping children (node unchanged)\n`;
                        }
                        
                        // Small delay to respect rate limits
                        await new Promise(resolve => setTimeout(resolve, 150));
                    }
                    
                    return wordsFromThisLevel;
                    
                } catch (error) {
                    if (error.response?.status === 429) {
                        retries++;
                        const waitTime = Math.min(5000 * Math.pow(2, retries), 60000); // Exponential backoff, max 60s
                        debugInfo += `  ⚠️ Rate limited at depth ${depth}, retry ${retries}/${maxRetries}, waiting ${waitTime/1000}s...\n`;
                        console.log(`⚠️ Rate limited, waiting ${waitTime/1000}s before retry ${retries}/${maxRetries}...`);
                        
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue; // Retry the request
                    }
                    
                    debugInfo += `  ❌ Error at depth ${depth}: ${error.message}\n`;
                    return 0;
                }
            }
            
            debugInfo += `  ❌ Max retries reached at depth ${depth}, giving up on this branch\n`;
            return 0;
        }
        
        // Count words for each BrainLift section
        for (let i = 0; i < brainLiftSections.length; i++) {
            const section = brainLiftSections[i];
            debugInfo += `\nProcessing section ${i + 1}/${brainLiftSections.length}: "${section.name}"\n`;
            console.log(`Processing section: "${section.name}"`);
            
            // Check the section node itself (convert from seconds to milliseconds)
            const sectionCreated = (section.created_at || section.createdAt || 0) * 1000;
            const sectionModified = (section.modified_at || section.modifiedAt || section.last_modified || 0) * 1000;
            
            debugInfo += `  Section "${section.name}": created=${new Date(sectionCreated).toISOString()}, modified=${new Date(sectionModified).toISOString()}\n`;
            
            if ((sectionCreated >= startTime && sectionCreated <= endTime) ||
                (sectionModified >= startTime && sectionModified <= endTime)) {
                let sectionContent = '';
                if (section.name) sectionContent += section.name + ' ';
                if (section.note) sectionContent += section.note + ' ';
                
                const words = sectionContent.trim().split(/\s+/).filter(w => w.length > 0);
                totalWordsAdded += words.length;
                debugInfo += `  Section itself: ${words.length} words\n`;
            }
            
            // Count words from children
            const childWords = await countWordsInTimeRange(section.id, 1);
            totalWordsAdded += childWords;
        }
        
        const processingTime = Date.now() - processingStart;
        
        debugInfo += `\n📊 FINAL RESULTS:\n`;
        debugInfo += `=================\n`;
        debugInfo += `Total nodes checked: ${totalNodesChecked}\n`;
        debugInfo += `Nodes created in range: ${nodesCreated}\n`;
        debugInfo += `Nodes modified in range: ${nodesModified}\n`;
        debugInfo += `Total words added: ${totalWordsAdded}\n`;
        debugInfo += `Processing time: ${processingTime}ms\n`;
        
        console.log(`✅ Progress count complete: ${totalWordsAdded} words added`);
        
        res.json({
            success: true,
            wordsAdded: totalWordsAdded,
            nodesModified: nodesModified,
            nodesCreated: nodesCreated,
            totalNodesChecked: totalNodesChecked,
            timeRange: {
                start: new Date(startTime).toISOString(),
                end: new Date(endTime).toISOString()
            },
            processingTime: processingTime,
            debugInfo: debugInfo
        });
        
    } catch (error) {
        const processingTime = Date.now() - processingStart;
        
        console.error('💥 Progress counting error:', error);
        
        res.status(500).json({
            success: false,
            error: error.message,
            debugInfo: debugInfo,
            processingTime: processingTime
        });
    }
});

app.listen(PORT, () => {
    console.log(`\n📊 BrainLift Progress Tracker\n`);
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`⏰ Counts ONLY words added/modified during specified time period`);
    console.log(`🎯 Perfect for tracking BrainLift goal progress!\n`);
});
