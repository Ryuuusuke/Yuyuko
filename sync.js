const db = require("./firebase/firestore");

async function resyncUserStats(userId) {
  const userRef = db.collection("users").doc(userId);
  const logsSnapshot = await userRef.collection("immersion_logs").get();

  if (logsSnapshot.empty) {
    console.log("No logs found for this user.");
    return;
  }

  const statsMap = {};
  let totalSessions = 0;

  logsSnapshot.forEach(doc => {
    const data = doc.data();
    const type = data.activity?.type;
    const amount = data.activity?.amount || 0;

    if (!type) return;

    if (!statsMap[type]) {
      statsMap[type] = {
        total: 0,
        sessions: 0,
      };
    }

    statsMap[type].total += amount;
    statsMap[type].sessions += 1;
    totalSessions += 1;
  });

  // Ambil data lama user (untuk simpan info lain seperti unit, label, streak)
  const userDoc = await userRef.get();
  const oldStats = userDoc.data()?.stats || {};
  const oldSummary = userDoc.data()?.summary || {};

  const updatedStats = {};
  for (const [type, data] of Object.entries(statsMap)) {
    const unit = oldStats[type]?.unit || 'unit';
    const label = oldStats[type]?.label || type;
    const bestStreak = oldStats[type]?.bestStreak || 0;
    const currentStreak = oldStats[type]?.currentStreak || 0;

    updatedStats[type] = {
      total: data.total,
      sessions: data.sessions,
      lastActivity: oldStats[type]?.lastActivity || null,
      unit,
      label,
      bestStreak,
      currentStreak,
    };
  }

  await userRef.set({
    stats: updatedStats,
    summary: {
      ...oldSummary,
      totalSessions: totalSessions,
      lastActivity: oldSummary.lastActivity || null,
      joinDate: oldSummary.joinDate || null,
      activeTypes: Object.keys(updatedStats)
    },
    timestamps: {
      updated: new Date()
    }
  }, { merge: true });

  console.log(`Resynced stats for user ${userId}. Total sessions: ${totalSessions}`);
}
