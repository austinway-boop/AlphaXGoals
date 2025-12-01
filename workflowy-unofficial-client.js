// WorkFlowy extractor using unofficial client (no rate limits)
import express from 'express';
import { WorkFlowy } from 'workflowy';

const app = express();
const PORT = 4568;  // Different port

app.use(express.json());

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>WorkFlowy Unofficial Client</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        button { padding: 20px 40px; font-size: 20px; background: #9c27b0; color: white; border: none; cursor: pointer; margin: 10px; }
        button:hover { background: #7b1fa2; }
        input { width: 300px; padding: 12px; margin: 10px; border: 2px solid #ddd; border-radius: 6px; }
        #results { margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; }
        .success { background: #e8f5e8; border-left: 4px solid #4caf50; }
        .error { background: #ffebee; border-left: 4px solid #f44336; }
        .huge-count { font-size: 48px; font-weight: bold; color: #4caf50; text-align: center; margin: 20px 0; }
        .content-display { white-space: pre-line; line-height: 1.6; max-height: 600px; overflow-y: auto; background: white; padding: 20px; border: 1px solid #ddd; border-radius: 6px; }
    </style>
</head>
<body>
    <h1>🔐 WorkFlowy Unofficial Client Extractor</h1>
    <p><strong>This uses the unofficial WorkFlowy client - NO RATE LIMITS!</strong></p>
    <p><strong>Requires:</strong> Your WorkFlowy email and password</p>
    
    <div>
        <label>Email:</label><br>
        <input type="email" id="email" placeholder="your@email.com" />
    </div>
    <div>
        <label>Password:</label><br>
        <input type="password" id="password" placeholder="your password" />
    </div>
    
    <button onclick="extractWithClient()">🚀 EXTRACT ALL CONTENT (UNOFFICIAL CLIENT)</button>
    
    <div id="results" style="display: none;"></div>

    <script>
        async function extractWithClient() {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            
            if (!email || !password) {
                alert('Please enter both email and password');
                return;
            }
            
            const results = document.getElementById('results');
            results.style.display = 'block';
            results.innerHTML = 
                '<h2>🔐 Logging into WorkFlowy...</h2>' +
                '<p>⏳ This may take 30-60 seconds...</p>';
            
            try {
                const response = await fetch('/extract-unofficial', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    results.className = 'success';
                    results.innerHTML = 
                        '<h2>🎉 UNOFFICIAL CLIENT SUCCESS!</h2>' +
                        '<div class="huge-count">' + data.wordCount.toLocaleString() + ' WORDS EXTRACTED</div>' +
                        '<p><strong>🎯 Target Status:</strong> ' + (data.wordCount >= 8000 ? '✅ ACHIEVED!' : '⚠️ Need more content') + '</p>' +
                        '<p><strong>📊 Content Pieces:</strong> ' + data.contentPieces + '</p>' +
                        '<p><strong>⏱️ Processing Time:</strong> ' + Math.round(data.processingTime/1000) + ' seconds</p>' +
                        '<h3>📋 Complete WorkFlowy Content:</h3>' +
                        '<div class="content-display">' + data.extractedText + '</div>';
                } else {
                    results.className = 'error';
                    results.innerHTML = 
                        '<h2>❌ UNOFFICIAL CLIENT FAILED</h2>' +
                        '<p><strong>Error:</strong> ' + data.error + '</p>' +
                        '<p><strong>Details:</strong> ' + (data.details || '') + '</p>';
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

app.post('/extract-unofficial', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.json({ success: false, error: 'Email and password required' });
    }
    
    console.log('🔐 Starting unofficial client extraction for:', email);
    const startTime = Date.now();
    
    try {
        console.log('🔗 Connecting to WorkFlowy...');
        const wf = new WorkFlowy(email, password);
        
        console.log('📋 Getting document tree...');
        const document = await wf.getDocument();
        
        if (!document || !document.root) {
            throw new Error('Could not access WorkFlowy document or document is empty');
        }
        
        console.log('✅ Document access successful!');
        console.log('🌳 Extracting all content from tree...');
        
        const allTextPieces = [];
        let nodeCount = 0;
        
        // Recursive function to collect ALL text
        function collectAllText(node, depth = 0) {
            if (depth > 50) return; // Safety limit
            
            const indent = "  ".repeat(depth);
            
            if (node.name && node.name.trim()) {
                allTextPieces.push(`${indent}• ${node.name.trim()}`);
                nodeCount++;
                console.log(`📝 [${nodeCount}] ${node.name.substring(0, 60)}...`);
            }
            
            if (node.note && node.note.trim()) {
                allTextPieces.push(`${indent}  📝 ${node.note.trim()}`);
                console.log(`📄 [${nodeCount}] Note: ${node.note.substring(0, 60)}...`);
            }
            
            // Process children if they exist
            if (node.items && Array.isArray(node.items)) {
                for (const child of node.items) {
                    collectAllText(child, depth + 1);
                }
            }
            
            // Also check for children property
            if (node.children && Array.isArray(node.children)) {
                for (const child of node.children) {
                    collectAllText(child, depth + 1);
                }
            }
        }
        
        // Start the collection
        collectAllText(document.root);
        
        // Also try to get additional content from the main document structure
        if (document.items && Array.isArray(document.items)) {
            for (const item of document.items) {
                collectAllText(item, 0);
            }
        }
        
        const fullText = allTextPieces.join('\n');
        const words = fullText.match(/\b[\p{L}\p{N}'-]+\b/gu) || [];
        const processingTime = Date.now() - startTime;
        
        console.log('🎉 UNOFFICIAL CLIENT EXTRACTION COMPLETE!');
        console.log(`📊 Stats: ${nodeCount} nodes, ${allTextPieces.length} text pieces, ${words.length} words`);
        
        res.json({
            success: true,
            wordCount: words.length,
            contentPieces: allTextPieces.length,
            nodeCount: nodeCount,
            contentLength: fullText.length,
            processingTime: processingTime,
            extractedText: fullText,
            targetAchieved: words.length >= 8000
        });
        
    } catch (error) {
        console.error('💥 Unofficial client error:', error);
        
        let details = 'Unknown error';
        if (error.message.includes('login') || error.message.includes('auth')) {
            details = 'Login failed - check email/password. Note: 2FA is not supported.';
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
            details = 'Network error - check internet connection.';
        }
        
        res.json({
            success: false,
            error: error.message,
            details: details
        });
    }
});

app.listen(PORT, () => {
    console.log(`🔐 Unofficial WorkFlowy client running at http://localhost:${PORT}`);
    console.log('💪 No rate limits with this approach!');
});


