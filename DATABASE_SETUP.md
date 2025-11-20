# 🗄️ Database Setup Instructions

## Required Environment Variables

To run AlphaXGoals, you need to configure the following environment variables:

### **1. CLAUDE_API_KEY** (Required)
- **Description**: Anthropic Claude API key for AI goal validation
- **Get it from**: https://console.anthropic.com/account/keys
- **Format**: `sk-ant-api03-...`
- **Example**: `CLAUDE_API_KEY=sk-ant-api03-your-actual-key-here`

### **2. REDIS_URL** (Required)
- **Description**: Redis database connection string for storing user data and goals
- **Format**: `redis://user:password@host:port` or `rediss://user:password@host:port` (for SSL)
- **Current Instance**: `redis-indigo-village`
- **Example**: `REDIS_URL=redis://default:tHWIuD0crPdmJOvADACb10xca5ScQrCb@redis-10172.c11.us-east-1-3.ec2.cloud.redislabs.com:10172`

#### **Redis Provider Options:**
- **Upstash** (Recommended): https://upstash.com/
  - Free tier available
  - Easy setup with serverless functions
- **Redis Cloud**: https://redis.com/try-free/
- **Railway**: https://railway.app/
- **Heroku Redis**: For Heroku deployments

### **3. SESSION_SECRET** (Optional but Recommended)
- **Description**: Secret key for session security
- **Format**: Any random string (32+ characters recommended)
- **Example**: `SESSION_SECRET=your-super-secret-random-string-here`

### **4. PORT** (Optional)
- **Description**: Port number for local development
- **Default**: 3000
- **Example**: `PORT=3000`

### **5. NODE_ENV** (Optional)
- **Description**: Environment mode
- **Options**: `development` or `production`
- **Example**: `NODE_ENV=development`

## Setup Steps

### 1. Create Environment File
Copy the example environment file and fill in your values:
```bash
cp env.example .env
```

### 2. Get Your API Keys

#### Anthropic Claude API:
1. Visit https://console.anthropic.com/account/keys
2. Sign up/log in to your account
3. Create a new API key
4. Copy the key (starts with `sk-ant-api03-`)

#### Redis Database:
1. Choose a Redis provider (Upstash recommended for beginners)
2. Create a new Redis database
3. Copy the connection URL
4. Make sure to use the SSL version (`rediss://`) if available

### 3. Configure Your .env File
```env
# REQUIRED
CLAUDE_API_KEY=sk-ant-api03-your-actual-key-here
REDIS_URL=redis://default:tHWIuD0crPdmJOvADACb10xca5ScQrCb@redis-10172.c11.us-east-1-3.ec2.cloud.redislabs.com:10172

# OPTIONAL
SESSION_SECRET=your-random-secret-here
PORT=3000
NODE_ENV=development
```

### 4. Test Your Setup
The application will automatically test your database connection on startup. Check the console for any connection errors.

## Troubleshooting

### "Redis URL not configured" Error
- Make sure you've set `REDIS_URL` in your environment (or the application will use the default redis-indigo-village instance)
- Verify the connection string format is correct
- Test your Redis connection using a Redis client

### "Claude API key not configured" Error
- Ensure your API key starts with `sk-ant-api03-`
- Verify you have credits available in your Anthropic account
- Check that the key hasn't expired

### Connection Issues
- For Redis: Ensure your IP is whitelisted (if using cloud providers)
- For Claude API: Check your rate limits and billing status
- Verify all environment variables are properly loaded

## Security Notes

- Never commit your `.env` file to version control
- Use strong, unique secrets for `SESSION_SECRET`
- Regularly rotate your API keys
- Use SSL connections (`rediss://`) for Redis in production

## Need Help?

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test each service (Redis, Claude API) individually
4. Ensure your hosting platform supports the required environment variables
