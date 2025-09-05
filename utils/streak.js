/**
 * Streak utility functions for calculating and updating user immersion streaks
 * @module utils/streak
 */

const db = require("../firebase/firestore");
const { Timestamp } = require("firebase-admin/firestore");
const { asyncHandler } = require("./errorHandler");

/**
 * Convert a date to YYYY-MM-DD string format for easy comparison
 * @param {Date} date - Date to convert
 * @returns {string} Date in YYYY-MM-DD format
 */
function toDateString(date) {
  // Ensure timezone consistency by using local timezone
  const dateObject = new Date(date);
  return dateObject.getFullYear() + '-' +
         String(dateObject.getMonth() + 1).padStart(2, '0') + '-' +
         String(dateObject.getDate()).padStart(2, '0');
}

/**
 * Get all dates when a user has logged immersion activities
 * @param {string} userId - Discord user ID
 * @returns {Promise<Array<string>>} Array of date strings in YYYY-MM-DD format
 */
async function getUserImmersionDates(userId) {
  const snapshot = await db.collection("users").doc(userId).collection("immersion_logs").get();

  const dateSet = new Set();

  snapshot.forEach(doc => {
    const data = doc.data();
    
    // Priority: use timestamps.date (format YYYY-MM-DD) if available,
    // if not available, use timestamps.created and convert to date string
    let dateStr;
    
    if (data.timestamps?.date) {
      // Already in YYYY-MM-DD format
      dateStr = data.timestamps.date;
    } else if (data.timestamps?.created) {
      // Convert timestamp to date string
      const dateObj = data.timestamps.created?.toDate?.() || data.timestamps.created;
      dateStr = toDateString(dateObj);
    } else {
      // Fallback to old timestamp if available
      const dateObj = data.timestamp?.toDate?.() || data.timestamp;
      if (dateObj) {
        dateStr = toDateString(dateObj);
      }
    }
    
    if (dateStr) {
      dateSet.add(dateStr);
    }
  });

  return Array.from(dateSet).sort(); // ascending
}

/**
 * Calculate current and longest streaks from sorted dates
 * @param {Array<string>} dates - Array of date strings in YYYY-MM-DD format, sorted ascending
 * @returns {Object} Streak information
 * @property {number} streak - Current streak count
 * @property {number} longest - Longest streak count
 */
function calculateStreak(dates) {
  if (!dates || dates.length === 0) {
    return { streak: 0, longest: 0 };
  }

  let currentStreak = 0;
  let longestStreak = 0;

  const today = toDateString(new Date());
  const yesterday = toDateString(new Date(Date.now() - 86400000)); // 1 day before

  // Calculate current streak from today backwards
  let streakBroken = false;
  let expectedDate = today;

  // Start from the last date and go backwards
  for (let dateIndex = dates.length - 1; dateIndex >= 0; dateIndex--) {
    const currentDate = dates[dateIndex];
    
    if (currentDate === expectedDate) {
      currentStreak++;
      // Move to the previous day
      const prevDay = new Date(expectedDate);
      prevDay.setDate(prevDay.getDate() - 1);
      expectedDate = toDateString(prevDay);
    } else if (currentDate < expectedDate) {
      // There's a gap in the streak
      break;
    }
  }

  // If there's no activity today but there was yesterday, the streak continues
  if (currentStreak === 0 && dates.includes(yesterday)) {
    expectedDate = yesterday;
    for (let dateIndex = dates.length - 1; dateIndex >= 0; dateIndex--) {
      const currentDate = dates[dateIndex];
      
      if (currentDate === expectedDate) {
        currentStreak++;
        // Move to the previous day
        const prevDay = new Date(expectedDate);
        prevDay.setDate(prevDay.getDate() - 1);
        expectedDate = toDateString(prevDay);
      } else if (currentDate < expectedDate) {
        // There's a gap in the streak
        break;
      }
    }
  }

  // Calculate longest streak
  let tempStreak = 1;
  longestStreak = 1;

  for (let dateIndex = 1; dateIndex < dates.length; dateIndex++) {
    const prevDate = new Date(dates[dateIndex - 1]);
    prevDate.setDate(prevDate.getDate() + 1);
    const expectedNext = toDateString(prevDate);

    if (dates[dateIndex] === expectedNext) {
      tempStreak++;
    } else {
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      tempStreak = 1;
    }
  }

  // Check final temp streak
  if (tempStreak > longestStreak) {
    longestStreak = tempStreak;
  }

  // If there's only one day, longest streak is 1
  if (dates.length === 1) {
    longestStreak = 1;
  }

  // If current streak is greater than longest, update longest
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  return { streak: currentStreak, longest: longestStreak };
}

/**
 * Update streak information in user stats for all media types
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object>} Updated streak information
 */
async function updateUserStreak(userId) {
  const snapshot = await db.collection("users").doc(userId).collection("immersion_logs").get();

  const mediaDateMap = new Map(); // key: media_type, value: Set of dateStr

  snapshot.forEach(doc => {
    const data = doc.data();
    const type = data.activity?.type;
    if (!type) return;

    let dateStr;
    if (data.timestamps?.date) {
      dateStr = data.timestamps.date;
    } else if (data.timestamps?.created) {
      const dateObj = data.timestamps.created?.toDate?.() || data.timestamps.created;
      dateStr = toDateString(dateObj);
    }

    if (dateStr) {
      if (!mediaDateMap.has(type)) {
        mediaDateMap.set(type, new Set());
      }
      mediaDateMap.get(type).add(dateStr);
    }
  });

  const updates = { streaks: {}, stats: {} };

  for (const [type, dateSet] of mediaDateMap.entries()) {
    const sortedDates = Array.from(dateSet).sort();
    const { streak, longest } = calculateStreak(sortedDates);

    // Update global streak (if needed, e.g. highest)
    if (!updates.streaks || streak > (updates.streaks.current || 0)) {
      updates.streaks = {
        current: streak,
        longest: longest,
        lastUpdated: new Date()
      };
    }

    // Store per media_type
    updates.stats[type] = {
      currentStreak: streak,
      bestStreak: longest,
      lastActivity: new Date()
    };
  }

  await db.collection("users").doc(userId).set(updates, { merge: true });

  return updates.streaks;
}

/**
 * Get user's overall immersion streak
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object>} Streak information
 * @property {number} streak - Current streak count
 * @property {number} longest - Longest streak count
 */
async function getUserStreak(userId) {
  const dates = await getUserImmersionDates(userId);
  return calculateStreak(dates);
}

/**
 * Get user's immersion streak for a specific media type
 * @param {string} userId - Discord user ID
 * @param {string} mediaType - Media type to get streak for
 * @returns {Promise<Object>} Streak information
 * @property {number} streak - Current streak count
 * @property {number} longest - Longest streak count
 */
async function getUserStreakByMedia(userId, mediaType) {
  const snapshot = await db.collection("users").doc(userId).collection("immersion_logs")
    .where("activity.type", "==", mediaType)
    .get();

  const dateSet = new Set();

  snapshot.forEach(doc => {
    const data = doc.data();
    let dateStr;

    if (data.timestamps?.date) {
      dateStr = data.timestamps.date;
    } else if (data.timestamps?.created) {
      const dateObj = data.timestamps.created?.toDate?.() || data.timestamps.created;
      dateStr = toDateString(dateObj);
    }

    if (dateStr) {
      dateSet.add(dateStr);
    }
  });

  const sortedDates = Array.from(dateSet).sort();
  return calculateStreak(sortedDates);
}

module.exports = { 
  getUserStreak,
  updateUserStreak,
  getUserStreakByMedia
};