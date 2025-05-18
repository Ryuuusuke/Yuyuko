const db = require("./firestore");

async function getTotalByType(userId, mediaType) {
  const snapshot = await db.collection("immersion_logs")
    .where("userId", "==", userId)
    .where("media_type", "==", mediaType)
    .get();

  let total = 0;
  snapshot.forEach(doc => {
    total += doc.data().amount || 0;
  });

  return total;
}

module.exports = getTotalByType;
