require("dotenv").config();

const {
  DISCORD_TOKEN,
  CLIENT_ID,
  GEMINI_API_KEY,
  JIMAKU_API_KEY,
  YOUTUBE_API_KEY
} = process.env;

module.exports = {
  DISCORD_TOKEN,
  CLIENT_ID,
  GEMINI_API_KEY,
  JIMAKU_API_KEY,
  YOUTUBE_API_KEY
};
