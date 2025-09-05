/**
 * Environment configuration module
 * Loads environment variables from .env file
 * @module environment
 */

require("dotenv").config();

/**
 * Discord bot token for authentication
 * @type {string|undefined}
 */
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

/**
 * Discord application client ID
 * @type {string|undefined}
 */
const CLIENT_ID = process.env.CLIENT_ID;

/**
 * Gemini API key for AI features
 * @type {string|undefined}
 */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Firebase service account key (base64 encoded)
 * @type {string|undefined}
 */
const FIREBASE_SERVICE_ACCOUNT_BASE64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

module.exports = {
  DISCORD_TOKEN,
  CLIENT_ID,
  GEMINI_API_KEY,
  FIREBASE_SERVICE_ACCOUNT_BASE64
};
