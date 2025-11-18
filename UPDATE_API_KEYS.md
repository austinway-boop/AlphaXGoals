# 🔑 How to Fix API Key Authentication Errors

## Current Issue
You're getting authentication errors because the API key in your `.env` file is not valid for Anthropic's Claude API.

## The Problem
- Your current key: `sk-proj-...` is an **OpenAI** API key format
- You need an **Anthropic** API key that starts with: `sk-ant-api03-...`

## Step-by-Step Solution

### 1. Get an Anthropic API Key
1. Go to: https://console.anthropic.com/account/keys
2. Sign up for an account (if you don't have one)
3. Create a new API key
4. Copy the key (it will look like: `sk-ant-api03-xxxxxxxxxx...`)

### 2. Get a Perplexity API Key (if needed)
1. Go to: https://www.perplexity.ai/settings/api
2. Sign up/log in
3. Generate an API key
4. Copy the key (it will look like: `pplx-xxxxxxxxxx...`)

### 3. Update Your .env File
Open the `.env` file in this directory and update it:

```env
CLAUDE_API_KEY=sk-ant-api03-YOUR_ACTUAL_KEY_HERE
PERPLEXITY_API_KEY=pplx-YOUR_ACTUAL_KEY_HERE
PORT=3000
```

### 4. Restart the Server
Run this command:
```bash
python manage.py restart
```

## Alternative: Use OpenAI Instead (Optional)
If you have an OpenAI API key but not an Anthropic one, let me know and I can modify the code to use OpenAI's GPT-4 instead of Claude.

## Need Help?
- Anthropic offers $5 free credits when you sign up
- Perplexity offers some free API calls per month
- Both services have free tiers suitable for testing

## Quick Commands
```bash
# Check server status
python manage.py status

# Stop server
python manage.py stop

# Start server
python manage.py start

# Restart server
python manage.py restart
```



