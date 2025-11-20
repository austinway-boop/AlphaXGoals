# 🔧 Environment Setup Guide

## The 500 Error is caused by missing environment variables!

Your `/api/validate-goal` endpoint is failing because the **CLAUDE_API_KEY** (or ANTHROPIC_API_KEY) environment variable is not set.

## 🚨 URGENT: Set Environment Variables in Vercel

Go to your Vercel dashboard and add these environment variables:

### Required Environment Variables:

1. **CLAUDE_API_KEY** or **ANTHROPIC_API_KEY**
   - Get your API key from: https://console.anthropic.com/account/keys
   - It should start with: `sk-ant-api03-...`
   - Value: `your-actual-anthropic-api-key`

2. **REDIS_URL**
   - Value: `redis://default:tHWIuD0crPdmJOvADACb10xca5ScQrCb@redis-10172.c11.us-east-1-3.ec2.cloud.redislabs.com:10172`

3. **SESSION_SECRET** (optional but recommended)
   - Value: Any random string for session security
   - Example: `alphax-goals-super-secret-session-key-2024`

4. **NODE_ENV**
   - Value: `production`

## 📋 Steps to Fix:

### Option 1: Via Vercel Dashboard (Recommended)
1. Go to https://vercel.com/dashboard
2. Select your AlphaXGoals project
3. Go to **Settings** → **Environment Variables**
4. Add each variable listed above
5. Click **Save**
6. Redeploy your project (or it will auto-redeploy)

### Option 2: Via Vercel CLI
```bash
vercel env add CLAUDE_API_KEY
# Paste your API key when prompted

vercel env add REDIS_URL
# Paste the Redis URL when prompted

vercel env add SESSION_SECRET
# Type a random secret when prompted
```

## 🧪 Testing Locally (Optional)

If you want to test locally:

1. Create a `.env` file in the project root:
```env
CLAUDE_API_KEY=your-anthropic-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
REDIS_URL=redis://default:tHWIuD0crPdmJOvADACb10xca5ScQrCb@redis-10172.c11.us-east-1-3.ec2.cloud.redislabs.com:10172
SESSION_SECRET=your-random-session-secret
NODE_ENV=development
PORT=3000
```

2. Run: `npm install`
3. Run: `vercel dev` (to test locally with Vercel environment)

## ✅ How to Verify It's Working

After setting environment variables and redeploying:
1. Go to your live site
2. Try to validate a goal
3. If it works, you should see AI validation results
4. If it still fails, check Vercel logs for errors

## 🔍 Current Issue Details

The error occurs in `api/validate-goal.js` at line 67-70:
```javascript
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;

if (!CLAUDE_API_KEY) {
  // Falls back to basic validation (no AI)
}
```

Without the API key, the endpoint should use fallback validation, but there might be another issue causing the 500 error.

## 🛠 Debugging Steps

1. Check Vercel deployment logs
2. Verify environment variables are set correctly
3. Make sure the API key is valid and has credits
4. Check Redis connection is working

---

**Created:** November 20, 2024
**Last Updated:** November 20, 2024

