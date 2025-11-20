// Vercel serverless function for retrieving admin logs
import { getRedisClient } from './redis.js';

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

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Check admin authentication
  const adminSessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('admin_session='));
  if (!adminSessionCookie) {
    return res.status(401).json({ success: false, error: 'Admin authentication required' });
  }

  let adminSession;
  try {
    const sessionValue = adminSessionCookie.split('=')[1];
    const decodedValue = decodeURIComponent(sessionValue);
    adminSession = JSON.parse(decodedValue);
    if (!adminSession.isAdmin) {
      return res.status(401).json({ success: false, error: 'Admin privileges required' });
    }
  } catch (e) {
    console.error('Admin session parse error:', e);
    return res.status(401).json({ success: false, error: 'Invalid admin session' });
  }

  try {
    console.log('Admin logs API called');
    const client = await getRedisClient();
    
    // Get all log IDs
    const logIds = await client.sMembers('admin_logs');
    console.log('Found log IDs:', logIds.length);
    
    if (!logIds || logIds.length === 0) {
      return res.json({ success: true, logs: [] });
    }
    
    const logs = [];
    
    for (const logId of logIds) {
      try {
        const logData = await client.hGetAll(logId);
        if (Object.keys(logData).length > 0) {
          // Parse details if it exists
          if (logData.details) {
            try {
              logData.details = JSON.parse(logData.details);
            } catch (e) {
              // Keep as string if parsing fails
            }
          }
          
          logs.push({
            id: logId,
            ...logData
          });
        }
      } catch (logError) {
        console.warn(`Error reading log ${logId}:`, logError);
        continue;
      }
    }
    
    // Apply filters
    let filteredLogs = logs;
    const { type, date, export: exportFormat } = req.query;
    
    // Filter by type
    if (type && type !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.type === type);
    }
    
    // Filter by date
    if (date && date !== 'all') {
      const now = new Date();
      let filterDate;
      
      if (date === 'today') {
        filterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (date === 'week') {
        filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (date === 'month') {
        filterDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      if (filterDate) {
        filteredLogs = filteredLogs.filter(log => {
          const logDate = new Date(log.timestamp);
          return logDate >= filterDate;
        });
      }
    }
    
    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Handle export
    if (exportFormat === 'csv') {
      const csvHeaders = 'Timestamp,Type,Description,Admin Name,Admin Email,Details\n';
      const csvRows = filteredLogs.map(log => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const details = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '';
        return `"${timestamp}","${log.type}","${log.description}","${log.adminName || ''}","${log.adminEmail || ''}","${details}"`;
      }).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="admin-logs-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvHeaders + csvRows);
      return;
    }
    
    console.log('Returning filtered logs:', filteredLogs.length);
    res.json({ success: true, logs: filteredLogs });
  } catch (error) {
    console.error('Error fetching admin logs:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to fetch logs: ${error.message}` 
    });
  }
}
