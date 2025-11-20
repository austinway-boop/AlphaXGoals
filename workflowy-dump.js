// workflowy-dump.js
// Dump all text content from your Workflowy account using the official API v1.
// Based on the Reddit approach from r/Workflowy users

const fs = require("fs");

const API_KEY = process.env.WF_API_KEY || "c82f6e853144eb680f6470c44f2afaa17a843590";
if (!API_KEY) {
  console.error("Set WF_API_KEY env var to your Workflowy API key.");
  process.exit(1);
}

const BASE_URL = "https://workflowy.com/api/v1/nodes";

// Optimized fetch with better rate limit handling
async function fetchChildren(parentId = "None", attempt = 0) {
  const url = `${BASE_URL}?parent_id=${encodeURIComponent(parentId)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
    },
  });

  if (res.status === 429) {
    const retryAfter = (await res.json()).retry_after || (attempt + 1) * 10;
    console.warn(`⏳ Rate limited, waiting ${retryAfter} seconds...`);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return fetchChildren(parentId, attempt + 1);
  }

  if (res.status === 404) {
    // Normal for leaf nodes, just return empty
    return [];
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }

  const data = await res.json();
  return Array.isArray(data.nodes) ? data.nodes : [];
}

// Optimized tree walk - breadth-first with depth limit
async function walkTree(parentId, depth, visit) {
  if (depth > 20) {
    console.log(`🛑 Stopping at depth ${depth} to avoid rate limits`);
    return;
  }
  
  const nodes = await fetchChildren(parentId);
  
  if (nodes.length === 0) return;

  // Sort by priority so order matches Workflowy UI
  nodes.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  // Process current level first
  for (const node of nodes) {
    await visit(node, depth);
  }
  
  // Then process children with a small delay between batches
  for (let i = 0; i < nodes.length; i++) {
    if (i % 10 === 0 && i > 0) {
      console.log(`⏳ Processed ${i} nodes at depth ${depth}, brief pause...`);
      await new Promise(r => setTimeout(r, 2000));
    }
    await walkTree(nodes[i].id, depth + 1, visit);
  }
}

// Split a big text blob into words
function textToWords(text) {
  const matches = text.match(/\b[\p{L}\p{N}'-]+\b/gu);
  return matches ?? [];
}

async function main() {
  console.log("🚀 Starting WorkFlowy dump using official API v1...");
  console.log("🔑 API Key:", API_KEY.substring(0, 10) + "..." + API_KEY.substring(API_KEY.length - 10));
  
  const pieces = [];
  let nodeCount = 0;
  const startTime = Date.now();

  // Start from root ("None") – this traverses your entire Workflowy world
  await walkTree("None", 0, async (node, depth) => {
    nodeCount++;
    const indent = "  ".repeat(depth);
    
    if (node.name) {
      pieces.push(node.name);
      console.log(`${indent}📝 [${depth}] ${node.name.substring(0, 60)}${node.name.length > 60 ? '...' : ''}`);
    }
    if (node.note) {
      pieces.push(node.note);
      console.log(`${indent}📄 [${depth}] Note: ${node.note.substring(0, 40)}${node.note.length > 40 ? '...' : ''}`);
    }
  });

  const fullText = pieces.join("\n");
  fs.writeFileSync("workflowy_dump.txt", fullText, "utf8");

  const words = textToWords(fullText);
  const processingTime = Date.now() - startTime;

  console.log("\n✅ WorkFlowy dump complete!");
  console.log("📁 Output file: workflowy_dump.txt");
  console.log("📊 Total nodes processed:", nodeCount);
  console.log("📝 Total characters:", fullText.length);
  console.log("🔤 Total words:", words.length);
  console.log("⏱️  Processing time:", processingTime + "ms");
  
  // Show sample of words found
  console.log("\n🔍 Sample words (first 20):");
  console.log(words.slice(0, 20).join(", "));

  // If you want to do something programmatic with the words:
  // console.log(words.slice(0, 50));
}

main().catch((err) => {
  console.error("💥 Error:", err);
  if (err.message.includes('401')) {
    console.error("🔑 Your API key seems to be invalid. Get a new one at:");
    console.error("   https://workflowy.com/api-key");
  } else if (err.message.includes('429')) {
    console.error("⚠️  You're being rate limited. Try again in a few minutes.");
  }
  process.exit(1);
});
