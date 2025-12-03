// Vercel serverless function for completing goals with BrainLift word count extraction
import { updateGoal, getGoalById, saveBrainLiftEntry, getRedisClient } from './redis.js';

// Word count utility function
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  const cleanText = text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .trim();
  const words = cleanText.split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', 'https://alpha-x-goals.vercel.app');
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

  // Check authentication
  const sessionCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('session='));
  if (!sessionCookie) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  let userId;
  try {
    const sessionValue = sessionCookie.split('=')[1];
    const decodedValue = decodeURIComponent(sessionValue);
    const sessionData = JSON.parse(decodedValue);
    userId = sessionData.userId;
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Invalid session' });
  }

  const { goalId, screenshotDataArray, textProof, brainliftContent } = req.body;
  
  if (!goalId) {
    return res.status(400).json({ success: false, error: 'Goal ID is required' });
  }
  
  // Require text proof and Brain Lift content (screenshots are optional)
  if (!textProof || textProof.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Text description is required to complete a goal' });
  }
  
  if (!brainliftContent || typeof brainliftContent !== 'string' || brainliftContent.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Updated Brain Lift content is required to complete a goal. Please paste your current Brain Lift content.' });
  }

  try {
    // Check if it's after midnight CST - prevent goal completion
    const now = new Date();
    const cstNow = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    
    // Get the goal to check its creation date
    const goal = await getGoalById(goalId);
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }
    
    // Check if the goal belongs to the user
    if (goal.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // After school goals can only be completed by admins
    if (goal.isAfterSchool) {
      return res.status(403).json({ 
        success: false, 
        error: 'After school goals can only be marked as complete by an admin in the admin panel.' 
      });
    }
    
    // Check if goal was created today (CST)
    const goalCreatedDate = new Date(goal.createdAt);
    const goalCreatedCST = new Date(goalCreatedDate.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    
    // Get CST midnight for today
    const cstMidnight = new Date(cstNow);
    cstMidnight.setHours(0, 0, 0, 0);
    
    // Check if the goal was created today and if it's still the same day in CST
    const goalCreatedTodayCST = goalCreatedCST.toDateString() === cstNow.toDateString();
    
    if (!goalCreatedTodayCST) {
      return res.status(400).json({ 
        success: false, 
        error: 'Goals can only be completed on the same day they were created (CST timezone)' 
      });
    }
    
    // Check if it's after midnight CST for goals created today
    if (cstNow.getHours() >= 0 && cstNow < cstMidnight.setDate(cstMidnight.getDate() + 1)) {
      // It's still the same day, allow completion
    } else if (goalCreatedTodayCST && cstNow.getHours() >= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Goals cannot be completed after midnight CST. You can complete goals until 11:59 PM CST on the day they were created.' 
      });
    }

    // Calculate ending word count from uploaded Brain Lift content
    console.log('Calculating ending word count from Brain Lift content');
    // Calculate ending word count from Brain Lift content (content not stored)
    const endingWordCount = countWords(brainliftContent);
    
    if (endingWordCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Brain Lift content must contain at least one word'
      });
    }
    
    console.log(`Ending word count: ${endingWordCount} words`);
    
    // Calculate word count difference
    const startingWordCount = parseInt(goal.startingWordCount) || 0;
    const wordCountDifference = endingWordCount - startingWordCount;
    
    console.log(`Word count difference: ${wordCountDifference} words (starting: ${startingWordCount}, ending: ${endingWordCount})`);
    
    // Determine if goal was met based on word count increase
    const goalMet = wordCountDifference >= 0;
    
    // Save ending Brain Lift entry for today (only word count, not content)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const endingBrainliftEntry = await saveBrainLiftEntry(userId, endingWordCount, today);
    console.log('Ending Brain Lift entry saved:', endingBrainliftEntry.id);

    // Update goal status to completed with proof
    // NOTE: Screenshots are optional and NOT stored in Redis to save storage space
    // We only store that screenshots were provided and the count
    const hasScreenshots = screenshotDataArray && Array.isArray(screenshotDataArray) && screenshotDataArray.length > 0;
    const updateData = {
      status: 'completed',
      completedAt: new Date().toISOString(),
      // screenshotDataArray: REMOVED - not storing base64 data to save storage
      textProof: textProof.trim(),
      hasScreenshots: hasScreenshots,
      hasTextProof: true,
      screenshotCount: hasScreenshots ? screenshotDataArray.length : 0,
      // Add ending Brain Lift data
      endingBrainLiftEntryId: endingBrainliftEntry.id,
      endingWordCount: endingWordCount,
      endingBrainLiftDate: today,
      wordCountDifference: wordCountDifference,
      wordCountIncreased: wordCountDifference > 0,
      goalMetByWordCount: goalMet,
      wordCountCalculatedAt: new Date().toISOString()
    };
    
    const updatedGoal = await updateGoal(goalId, updateData);
    
    // Update user streak
    let newStreak = 1;
    try {
      const client = await getRedisClient();
      const userData = await client.hGetAll(userId);
      
      if (userData) {
        const lastCompletedDate = userData.lastGoalCompletedDate;
        const currentStreak = parseInt(userData.streak) || 0;
        const todayStr = new Date().toISOString().split('T')[0];
        
        if (lastCompletedDate === todayStr) {
          // Already completed a goal today, streak unchanged
          newStreak = currentStreak;
        } else {
          // Check if last completion was yesterday
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          if (lastCompletedDate === yesterdayStr) {
            // Continue streak
            newStreak = currentStreak + 1;
          } else {
            // Streak broken, start fresh
            newStreak = 1;
          }
        }
        
        // Update user with new streak
        await client.hSet(userId, {
          streak: newStreak.toString(),
          lastGoalCompletedDate: todayStr
        });
      }
    } catch (streakError) {
      console.error('Error updating streak:', streakError);
      // Don't fail the request if streak update fails
    }
    
    res.json({ 
      success: true, 
      goal: updatedGoal,
      streak: newStreak,
      wordCountComparison: {
        starting: startingWordCount,
        ending: endingWordCount,
        difference: wordCountDifference,
        increased: wordCountDifference > 0,
        goalMet: goalMet
      }
    });
  } catch (error) {
    console.error('Error completing goal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to complete goal. Please try again.' 
    });
  }
}
