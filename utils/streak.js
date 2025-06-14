const db = require("../firebase/firestore");
const { Timestamp } = require("firebase-admin/firestore");

// Convert ke YYYY-MM-DD agar mudah dibandingkan
function toDateString(date) {
  return new Date(date).toISOString().split("T")[0];
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
      dateStr = toDateString(data.timestamps.created?.toDate?.() || data.timestamps.created);
    } else {
      // Fallback ke timestamp lama jika ada
      dateStr = toDateString(data.timestamp?.toDate?.() || data.timestamp);
    }
    
    if (dateStr) {
      dateSet.add(dateStr);
    }
  });

  return Array.from(dateSet).sort(); // ascending
}

function calculateStreak(dates) {
  let streak = 0;
  let longest = 0;
  let prev = null;

  const today = toDateString(new Date());
  const yesterday = toDateString(Date.now() - 86400000); // 1 hari sebelum

  for (let i = dates.length - 1; i >= 0; i--) {
    const current = dates[i];

    if (!prev) {
      if (current === today || current === yesterday) {
        streak = 1;
        prev = current;
      } else break;
    } else {
      const prevDate = new Date(prev);
      prevDate.setDate(prevDate.getDate() - 1);
      const expected = toDateString(prevDate);

      if (current === expected) {
        streak++;
        prev = current;
      } else break;
    }
  }

  // Cari longest streak
  let temp = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    prev.setDate(prev.getDate() + 1);
    const expected = toDateString(prev);

    if (dates[i] === expected) {
      temp++;
    } else {
      if (temp > longest) longest = temp;
      temp = 1;
    }
  }
  if (temp > longest) longest = temp;

  return { streak, longest };
}

// Fungsi tambahan untuk update streak di user stats (opsional)
async function updateUserStreak(userId) {
  const { streak, longest } = await getUserStreak(userId);
  
  // Update streak info di user document
  await db.collection("users").doc(userId).set({
    streaks: {
      current: streak,
      longest: longest,
      lastUpdated: new Date()
    }
  }, { merge: true });
  
  return { streak, longest };
}

async function getUserStreak(userId) {
  const dates = await getUserImmersionDates(userId);
  return calculateStreak(dates);
}

module.exports = { 
  getUserStreak,
  updateUserStreak 
};