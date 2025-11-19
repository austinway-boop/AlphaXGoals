// Database restoration system
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

  try {
    const client = await getRedisClient();

    if (req.method === 'GET') {
      // List available backups
      const backupKeys = await client.keys('backup:*');
      const backups = [];
      
      for (const key of backupKeys.sort().reverse()) {
        try {
          const backupData = await client.get(key);
          const parsed = JSON.parse(backupData);
          backups.push({
            key,
            timestamp: parsed.timestamp,
            userCount: parsed.metadata.userCount,
            goalCount: parsed.metadata.goalCount
          });
        } catch (e) {
          console.warn('Failed to parse backup:', key);
        }
      }
      
      return res.json({
        success: true,
        availableBackups: backups
      });
    }

    if (req.method === 'POST') {
      // Restore from backup
      const { backupKey, confirmRestore } = req.body;
      
      if (!confirmRestore) {
        return res.status(400).json({
          success: false,
          error: 'Must confirm restore operation with confirmRestore: true'
        });
      }
      
      if (!backupKey) {
        return res.status(400).json({
          success: false,
          error: 'Backup key is required'
        });
      }
      
      console.log('🔄 Starting database restore from:', backupKey);
      
      const backupData = await client.get(backupKey);
      if (!backupData) {
        return res.status(404).json({
          success: false,
          error: 'Backup not found'
        });
      }
      
      const backup = JSON.parse(backupData);
      console.log('📊 Restoring backup:', {
        timestamp: backup.timestamp,
        users: backup.metadata.userCount,
        goals: backup.metadata.goalCount
      });
      
      // Restore users
      const userIds = [];
      for (const [userId, userData] of Object.entries(backup.users)) {
        await client.hSet(userId, userData);
        userIds.push(userId);
        console.log('✅ Restored user:', userId);
      }
      
      // Restore users set
      if (userIds.length > 0) {
        await client.sAdd('users', userIds);
      }
      
      // Restore goals
      let goalCount = 0;
      for (const [goalKey, goalData] of Object.entries(backup.goals)) {
        await client.hSet(goalKey, goalData);
        goalCount++;
        console.log('✅ Restored goal:', goalKey);
      }
      
      console.log('🎉 Database restore completed successfully');
      
      res.json({
        success: true,
        message: 'Database restored successfully',
        restored: {
          users: userIds.length,
          goals: goalCount,
          fromBackup: backup.timestamp
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Database restore failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Restore operation failed'
    });
  }
}
