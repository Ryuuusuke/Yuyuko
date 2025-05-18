const admin = require("firebase-admin");
const serviceAccount = require("../firebase-key.json"); // Ganti sesuai nama file kamu

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = db;
