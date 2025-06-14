const db = require("../firebase/firestore");
const { Timestamp } = require("firebase-admin/firestore");

// Convert ke YYYY-MM-DD agar mudah dibandingkan
function toDateString(date) {
  // Pastikan timezone konsisten dengan menggunakan local timezone
  const d = new Date(date);
  return d.getFullYear() + '-' + 
         String(d.getMonth() + 1).padStart(2, '0') + '-' + 
         String(d.getDate()).padStart(2, '0');
}

async function getUserImmersionDates(userId) {
  const snapshot = await db.collection("users").doc(userId).collection("immersion_logs").get();

  const dateSet = new Set();

  snapshot.forEach(doc => {
    const data = doc.data();
    
    // Prioritas: gunakan timestamps.date (format YYYY-MM-DD) jika ada,
    // jika tidak ada, gunakan timestamps.created dan convert ke date string
    let dateStr;
    
    if (data.timestamps?.date) {
      // Sudah dalam format YYYY-MM-DD
      dateStr = data.timestamps.date;
    } else if (data.timestamps?.created) {
      // Convert timestamp ke date string
      const dateObj = data.timestamps.created?.toDate?.() || data.timestamps.created;
      dateStr = toDateString(dateObj);
    } else {
      // Fallback ke timestamp lama jika ada
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

function calculateStreak(dates) {
  if (!dates || dates.length === 0) {
    return { streak: 0, longest: 0 };
  }

  let currentStreak = 0;
  let longestStreak = 0;

  const today = toDateString(new Date());
  const yesterday = toDateString(new Date(Date.now() - 86400000)); // 1 hari sebelum

  // Hitung current streak dari hari ini mundur
  let streakBroken = false;
  let expectedDate = today;

  // Mulai dari tanggal terakhir dan mundur
  for (let i = dates.length - 1; i >= 0; i--) {
    const currentDate = dates[i];
    
    if (currentDate === expectedDate) {
      currentStreak++;
      // Pindah ke hari sebelumnya
      const prevDay = new Date(expectedDate);
      prevDay.setDate(prevDay.getDate() - 1);
      expectedDate = toDateString(prevDay);
    } else if (currentDate < expectedDate) {
      // Ada gap dalam streak
      break;
    }
  }

  // Jika tidak ada aktivitas hari ini tapi ada kemarin, streak masih berlanjut
  if (currentStreak === 0 && dates.includes(yesterday)) {
    expectedDate = yesterday;
    for (let i = dates.length - 1; i >= 0; i--) {
      const currentDate = dates[i];
      
      if (currentDate === expectedDate) {
        currentStreak++;
        // Pindah ke hari sebelumnya
        const prevDay = new Date(expectedDate);
        prevDay.setDate(prevDay.getDate() - 1);
        expectedDate = toDateString(prevDay);
      } else if (currentDate < expectedDate) {
        // Ada gap dalam streak
        break;
      }
    }
  }

  // Hitung longest streak
  let tempStreak = 1;
  longestStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    prevDate.setDate(prevDate.getDate() + 1);
    const expectedNext = toDateString(prevDate);

    if (dates[i] === expectedNext) {
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

  // Jika hanya ada satu hari, longest streak adalah 1
  if (dates.length === 1) {
    longestStreak = 1;
  }

  // Jika current streak lebih besar dari longest, update longest
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  return { streak: currentStreak, longest: longestStreak };
}

// Fungsi tambahan untuk update streak di user stats (opsional)
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


async function getUserStreak(userId) {
  const dates = await getUserImmersionDates(userId);
  return calculateStreak(dates);
}

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
