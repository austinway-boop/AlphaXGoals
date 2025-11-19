// Automatic database backup system
import { getRedisClient } from './redis.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('🛡️ Creating database backup...');
    const client = await getRedisClient();
    
    // Get all users
    const userIds = await client.sMembers('users') || [];
    console.log('📊 Backing up users:', userIds.length);
    
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      users: {},
      goals: {},
      metadata: {
        userCount: userIds.length,
        goalCount: 0
      }
    };
    
    // Backup all users
    for (const userId of userIds) {
      const userData = await client.hGetAll(userId);
      if (userData && Object.keys(userData).length > 0) {
        // Store user data (password hashes included for recovery)
        backup.users[userId] = userData;
      }
    }
    
    // Get all goals
    const goalKeys = await client.keys('goal:*') || [];
    backup.metadata.goalCount = goalKeys.length;
    console.log('📊 Backing up goals:', goalKeys.length);
    
    for (const goalKey of goalKeys) {
      const goalData = await client.hGetAll(goalKey);
      if (goalData && Object.keys(goalData).length > 0) {
        backup.goals[goalKey] = goalData;
      }
    }
    
    // Store backup in Redis with timestamp key
    const backupKey = `backup:${Date.now()}`;
    await client.set(backupKey, JSON.stringify(backup));
    
    // Keep only last 10 backups
    const existingBackups = await client.keys('backup:*');
    if (existingBackups.length > 10) {
      const sortedBackups = existingBackups.sort();
      for (let i = 0; i < existingBackups.length - 10; i++) {
        await client.del(sortedBackups[i]);
      }
    }
    
    console.log('✅ Database backup completed:', backupKey);
    
    res.json({
      success: true,
      message: 'Database backup completed successfully',
      backupInfo: {
        key: backupKey,
        timestamp: backup.timestamp,
        userCount: backup.metadata.userCount,
        goalCount: backup.metadata.goalCount,
        totalBackups: Math.min(existingBackups.length + 1, 10)
      }
    });
    
  } catch (error) {
    console.error('❌ Database backup failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Backup system failed - check Redis connection'
    });
  }
}

// Export backup function for other modules
export async function createAutomaticBackup() {
  try {
    console.log('🔄 Creating automatic backup...');
    // Call the backup logic (reuse the code above)
    const response = await fetch('/api/backup-database');
    const result = await response.json();
    console.log('✅ Automatic backup completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Automatic backup failed:', error);
    return null;
  }
}
