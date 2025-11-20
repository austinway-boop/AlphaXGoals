// Vercel serverless function for counting BrainLift progress by timestamp
// Counts ONLY words added/modified during goal period
import axios from 'axios';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { brainliftLink, startTime, endTime, goalId } = req.body;

  if (!brainliftLink || !startTime || !endTime) {
    return res.status(400).json({ 
      success: false, 
      error: 'BrainLift link, startTime, and endTime are required' 
    });
  }

  console.log(`📊 Counting BrainLift progress for goal ${goalId || 'unknown'}`);
  console.log(`Time range: ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);

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
    
    // Find BrainLift parent
    const brainLiftParent = mainNodes.find(node => {
      const name = (node.name || '').toLowerCase();
      return name.includes('brain') || name.includes('brian') || name.includes('lift');
    });
    
    if (!brainLiftParent) {
      return res.status(400).json({
        success: false,
        error: 'Could not find BrainLift parent node in WorkFlowy'
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
    
    const brainLiftSections = (sectionsResponse.data.nodes || []).filter(n => n.name && n.name.trim());
    
    // Count words from nodes modified/created during time period
    let totalWordsAdded = 0;
    let nodesModified = 0;
    let nodesCreated = 0;
    let totalNodesChecked = 0;
    
    // Recursive function with retry and smart sub-checking
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
                const nodeCreated = (node.created_at || node.createdAt || 0) * 1000;
                const nodeModified = (node.modified_at || node.modifiedAt || node.last_modified || 0) * 1000;
                
                // Check if node was created or modified in time range
                const wasCreatedInRange = nodeCreated >= startTime && nodeCreated <= endTime;
                const wasModifiedInRange = nodeModified >= startTime && nodeModified <= endTime;
                const nodeInRange = wasCreatedInRange || wasModifiedInRange;
            
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
              }
            }
            
                        // SMART SUB-CHECKING: Only check children if node was modified in range
                        const shouldCheckChildren = nodeInRange || (nodeCreated >= startTime) || (nodeModified >= startTime);
            
            if (shouldCheckChildren) {
              const childWords = await countWordsInTimeRange(node.id, nodeInRange, depth + 1);
              wordsFromThisLevel += childWords;
            }
            
            // Delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 150));
          }
          
          return wordsFromThisLevel;
          
        } catch (error) {
          if (error.response?.status === 429) {
            retries++;
            const waitTime = Math.min(5000 * Math.pow(2, retries), 60000);
            console.log(`⚠️ Rate limited, waiting ${waitTime/1000}s before retry ${retries}/${maxRetries}...`);
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue; // Retry
          }
          
          return 0;
        }
      }
      
      return 0; // Max retries reached
    }
    
    // Count words for each BrainLift section
    for (const section of brainLiftSections) {
      console.log(`Processing section: "${section.name}"`);
      
            // Check section itself (convert timestamps from seconds to milliseconds)
            const sectionCreated = (section.created_at || section.createdAt || 0) * 1000;
            const sectionModified = (section.modified_at || section.modifiedAt || section.last_modified || 0) * 1000;
            
            if ((sectionCreated >= startTime && sectionCreated <= endTime) ||
                (sectionModified >= startTime && sectionModified <= endTime)) {
        let sectionContent = '';
        if (section.name) sectionContent += section.name + ' ';
        if (section.note) sectionContent += section.note + ' ';
        
        const words = sectionContent.trim().split(/\s+/).filter(w => w.length > 0);
        totalWordsAdded += words.length;
      }
      
      // Count words from children (with smart sub-checking)
      const childWords = await countWordsInTimeRange(section.id, true, 1);
      totalWordsAdded += childWords;
    }
    
    const processingTime = Date.now() - processingStart;
    
    console.log(`✅ Progress count complete: ${totalWordsAdded} words added`);
    
    res.json({
      success: true,
      wordsAdded: totalWordsAdded,
      nodesModified: nodesModified,
      nodesCreated: nodesCreated,
      totalNodesChecked: totalNodesChecked,
      sectionsProcessed: brainLiftSections.length,
      timeRange: {
        start: new Date(startTime).toISOString(),
        end: new Date(endTime).toISOString()
      },
      processingTime: processingTime
    });
    
  } catch (error) {
    console.error('💥 Progress counting error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Failed to count BrainLift progress'
    });
  }
}
