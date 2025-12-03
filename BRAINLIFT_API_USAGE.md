# 🧠 Proper BrainLift Content Extraction

## Overview

The BrainLift extraction system now correctly extracts content from **ONLY the specific BrainLift sections**, not the entire WorkFlowy account.

## 🎯 Targeted Extraction

### **BrainLift Sections** (What Gets Extracted):
- **Owner** (and any text after "Owner")
- **Purpose** (and any text after "Purpose")  
- **DOK4** (and any text after "DOK4")
- **DOK3** (and any text after "DOK3")
- **Experts** (and any text after "Experts")
- **DOK2** (and any text after "DOK2")

### **Everything Else** (What Gets Ignored):
- Personal notes
- Other project folders
- Unrelated main nodes
- Any content outside these specific sections

## 🔧 How It Works

### **Step-by-Step Process:**

1. **Get All Main Nodes** from WorkFlowy account
   ```
   GET /api/v1/nodes?parent_id=None
   → Returns all root-level nodes
   ```

2. **Find BrainLift Parent Node**
   ```
   Look for main node containing: "brain", "brian", or "lift"
   Example: "Austin Way - Brian Lift"
   ```

3. **Get BrainLift Section Children**
   ```
   GET /api/v1/nodes?parent_id={brainLiftParentId}
   → Returns: Owner, Purpose, DOK4, DOK3, Experts, DOK2, etc.
   ```

4. **Filter to Target Sections**
   ```
   Keep only nodes starting with:
   - Owner
   - Purpose
   - DOK4
   - DOK3
   - Experts
   - DOK2
   ```

5. **Extract Complete Content**
   ```
   For each target section:
     → Get ALL nested children recursively
     → Combine all text content
     → Count words
   ```

## 📊 Example Extraction

### **Your WorkFlowy Structure:**
```
📁 Austin
📁 (empty)
📁 Welcome To Austin Way's Masterpiece!
📁 (empty)
📁 Austin Way - Brian Lift ← BrainLift Parent
   ├─ Owner ✅ (Extracted)
   ├─ Purpose ✅ (Extracted)
   ├─ DOK4 ✅ (Extracted)
   ├─ DOK3 ✅ (Extracted)  
   ├─ Experts ✅ (Extracted)
   ├─ DOK2 ✅ (Extracted)
   └─ Other sections ❌ (Ignored)
📁 (empty)
```

### **What Gets Extracted:**
✅ Content from Owner, Purpose, DOK4, DOK3, Experts, DOK2  
✅ ALL nested children under these sections  
❌ Nothing from other main nodes  
❌ Nothing from unrelated sections  

## 🚀 Testing

### **Local Test Server:**
```bash
node workflowy-api-proper.js
# Visit: http://localhost:4585
```

### **Test Results for Your BrainLift:**
- **Total Main Nodes**: 6
- **BrainLift Parent**: "Austin Way - Brian Lift"  
- **Sections Found**: 2 (Purpose, Experts)
- **Words Extracted**: 129

## ⚙️ Integration

### **Your Existing API:**
The `/api/extract-word-count` endpoint now uses this targeted extraction automatically!

### **When Students Submit Goals:**
1. They provide their BrainLift link
2. System finds their BrainLift parent node
3. Extracts ONLY from Owner, Purpose, DOK4, DOK3, Experts, DOK2 sections
4. Returns accurate word count from those sections only

## 💡 Key Benefits

✅ **Targeted Extraction** - Only extracts from BrainLift sections  
✅ **Ignores Personal Content** - Other WorkFlowy content is ignored  
✅ **Accurate Counts** - Only counts relevant research content  
✅ **Efficient** - Doesn't waste time on irrelevant nodes  
✅ **Flexible Names** - Works even if section names have text after them  

## 🔍 Debugging

If extraction fails, check:

1. **Is there a BrainLift parent node?**
   - Look for node containing "brain", "brian", or "lift"
   - Common names: "BrainLift", "Brain Lift", "Brian Lift"

2. **Do the sections exist?**
   - Must be CHILDREN of the BrainLift parent
   - Must start with: Owner, Purpose, DOK4, DOK3, Experts, DOK2

3. **API Rate Limiting?**
   - Wait 30-60 seconds between extractions
   - Normal WorkFlowy API behavior

## 📋 Next Steps

Your BrainLift extraction now:
- ✅ Works with proper WorkFlowy API v1  
- ✅ Targets ONLY BrainLift sections
- ✅ Extracts complete nested content
- ✅ Handles different BrainLift structures
- ✅ Integrated into your existing API

**Ready to use!** Students can now submit BrainLift goals and the system will correctly extract content from only the relevant sections!



