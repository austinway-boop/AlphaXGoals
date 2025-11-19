// Database health monitoring and data loss prevention
import { getRedisClient, triggerAutomaticBackup } from './redis.js';

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

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Running database health check...');
    const client = await getRedisClient();
    
    // Check current data counts
    const userIds = await client.sMembers('users') || [];
    const goalKeys = await client.keys('goal:*') || [];
    const backupKeys = await client.keys('backup:*') || [];
    
    // Historical data tracking
    const healthKey = 'health:history';
    const currentHealth = {
      timestamp: new Date().toISOString(),
      users: userIds.length,
      goals: goalKeys.length,
      backups: backupKeys.length
    };
    
    // Store current health data
    await client.lPush(healthKey, JSON.stringify(currentHealth));
    
    // Keep only last 50 health checks
    await client.lTrim(healthKey, 0, 49);
    
    // Get recent health history
    const recentHealth = await client.lRange(healthKey, 0, 9);
    const healthHistory = recentHealth.map(h => JSON.parse(h)).reverse();
    
    // Detect potential data loss
    const alerts = [];
    if (healthHistory.length >= 2) {
      const previous = healthHistory[healthHistory.length - 2];
      const current = healthHistory[healthHistory.length - 1];
      
      // Alert if users decreased significantly
      if (previous.users > 0 && current.users === 0) {
        alerts.push({
          type: 'CRITICAL',
          message: 'ALL USERS LOST - Complete database wipe detected!',
          action: 'Immediate restore required'
        });
      } else if (previous.users > current.users + 3) {
        alerts.push({
          type: 'WARNING',
          message: `Significant user loss: ${previous.users} → ${current.users}`,
          action: 'Investigate potential data loss'
        });
      }
      
      // Alert if goals decreased significantly  
      if (previous.goals > current.goals + 10) {
        alerts.push({
          type: 'WARNING',
          message: `Significant goal loss: ${previous.goals} → ${current.goals}`,
          action: 'Check for data corruption'
        });
      }
    }
    
    // Trigger backup if data detected but no recent backups
    if (userIds.length > 0 && backupKeys.length === 0) {
      console.log('🚨 No backups exist but data found - creating emergency backup');
      await triggerAutomaticBackup('emergency_first_backup');
      alerts.push({
        type: 'INFO',
        message: 'Created first emergency backup',
        action: 'Backup system activated'
      });
    }
    
    // Calculate health score
    let healthScore = 100;
    if (userIds.length === 0) healthScore -= 50; // No users
    if (goalKeys.length === 0 && userIds.length > 0) healthScore -= 20; // Users but no goals
    if (backupKeys.length === 0) healthScore -= 20; // No backups
    if (alerts.some(a => a.type === 'CRITICAL')) healthScore = 0;
    
    const healthStatus = healthScore >= 80 ? 'HEALTHY' : 
                        healthScore >= 50 ? 'WARNING' : 'CRITICAL';
    
    console.log('📊 Health check completed:', {
      status: healthStatus,
      score: healthScore,
      alerts: alerts.length
    });
    
    res.json({
      success: true,
      health: {
        status: healthStatus,
        score: healthScore,
        timestamp: new Date().toISOString()
      },
      data: {
        users: userIds.length,
        goals: goalKeys.length,
        backups: backupKeys.length
      },
      alerts,
      history: healthHistory.slice(-5), // Last 5 health checks
      recommendations: generateHealthRecommendations(currentHealth, alerts)
    });
    
  } catch (error) {
    console.error('❌ Health monitor failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      health: {
        status: 'CRITICAL',
        score: 0
      }
    });
  }
}

function generateHealthRecommendations(health, alerts) {
  const recommendations = [];
  
  if (health.users === 0) {
    recommendations.push('🚨 URGENT: Database appears empty - check for data loss and restore from backup if needed');
  }
  
  if (health.backups < 3) {
    recommendations.push('🛡️ Create more backups - recommended minimum is 5 backups for safety');
  }
  
  if (alerts.length > 0) {
    recommendations.push('⚠️ Address active alerts to prevent further data loss');
  } else {
    recommendations.push('✅ System appears healthy - continue regular monitoring');
  }
  
  return recommendations;
}
