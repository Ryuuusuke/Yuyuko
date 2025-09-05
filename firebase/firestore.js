/**
 * Firebase Firestore configuration and initialization
 * Sets up Firestore database connection for the application
 * @module firebase/firestore
 */

const admin = require("firebase-admin");
const path = require("path");
const { FIREBASE_SERVICE_ACCOUNT_BASE64 } = require("../environment");

let serviceAccount;

if (FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
        const decodedServiceAccount = Buffer.from(FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
        serviceAccount = JSON.parse(decodedServiceAccount);
        console.log("Firebase credentials loaded from environment variable.");
    } catch (error) {
        console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_BASE64:", error.message);
        console.log("Falling back to firebase-key.json...");
    }
}

if (!serviceAccount) {
    const keyFilePath = path.join(__dirname, "..", "firebase-key.json");
    console.log(`Attempting to load Firebase credentials from: ${keyFilePath}`);
    try {
        serviceAccount = require(keyFilePath);
    } catch (error) {
        console.error(`Error loading firebase-key.json: ${error.message}`);
        console.error("Please make sure you have a valid firebase-key.json file in the root directory or set the FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable.");
        process.exit(1);
    }
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

/**
 * Firestore database instance
 * @type {Object}
 */
const db = admin.firestore();

module.exports = db;
