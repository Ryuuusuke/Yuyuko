# Yuyuko Bot - Project Guide

This guide provides an overview of the Yuyuko Bot project structure, key components, and development patterns to help understand and work with the codebase.

## Project Overview

Yuyuko is a Discord bot designed for Japanese language learners to track their immersion activities. It features Ayumi, an AI assistant, along with comprehensive logging for various media types, automatic metadata fetching, rich statistics, and community features.

## Technology Stack

- **Node.js** with **discord.js v14**
- **Firebase Cloud Firestore** for data storage
- **YouTube Data API v3** for video metadata
- **VNDB API** for visual novel information
- **AniList API** for anime/manga data
- **Google Generative AI (Gemini)** for Ayumi AI functionality
- **Canvas** for image generation (charts, heatmaps)
- **Chart.js** for data visualization

## Project Structure

```
yuyuko-bot/
├── commands/           # Slash commands implementation
├── firebase/           # Firebase configuration and utilities
├── ranked/             # Role ranking system
├── role-rank/          # Role assignment logic
├── rss/                # RSS feed utilities
├── utils/              # Helper functions and API integrations
├── .env               # Environment variables
├── index.js           # Main bot entry point
└── package.json       # Dependencies and scripts
```

## Core Components

### 1. Main Bot Entry Point (index.js)
- Initializes the Discord client with required intents
- Loads commands from the commands directory
- Handles command execution and message interactions
- Manages bot login and error handling

### 2. Commands System
Commands are implemented as modules in the `commands/` directory, each exporting:
- `data`: Command definition using SlashCommandBuilder
- `execute`: Function to run when the command is called
- `autocomplete` (optional): Function for autocomplete interactions

Key commands include:
- `/immersion`: Log immersion activities
- `/stat`: View personal statistics with charts/heatmaps
- `/leaderboard`: View community rankings
- `/novel`: Search and download light novels
- `/subs`: Search and download anime subtitles
- `/react`: Add animated reactions to messages
- `/help`: View usage guide
- `a!ayumi`: Chat with the Ayumi AI

### 3. Firebase Integration (firebase/)
- `firestore.js`: Initializes Firebase Admin SDK
- Data is stored in user documents with immersion logs and statistics
- Each user has a collection of immersion logs and summary statistics

### 4. External API Integrations (utils/)
- `anilistAPI.js`: Anime/manga data from AniList GraphQL API
- `vndbAPI.js`: Visual novel data from VNDB API
- `youtube.js`: YouTube video metadata from YouTube Data API
- `jimaku.js`: Subtitle search and download from Jimaku API
- `streak.js`: Calculates user activity streaks
- `points.js`: Calculates immersion points based on media type and amount

### 5. Ayumi AI Assistant (commands/geminiReply.js)
- Uses Google's Gemini AI for conversations
- Features include:
  - Context-aware conversations
  - Image analysis capabilities
  - Image generation
  - Avatar analysis
  - Conversation history tracking

## Key Development Patterns

### 1. Command Structure
```javascript
module.exports = {
  data: new SlashCommandBuilder()
    .setName('command-name')
    .setDescription('Command description')
    // Options...
  
  async execute(interaction) {
    // Command logic
  }
};
```

### 2. Firebase Data Structure
- Users are stored in the `users` collection
- Each user document contains:
  - `profile`: User information
  - `stats`: Media-specific statistics
  - `summary`: Overall activity summary
- Immersion logs are stored in a subcollection for each user

### 3. External API Usage
Most external APIs follow this pattern:
```javascript
async function fetchExternalData(query) {
  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { /* headers */ },
      body: JSON.stringify({ /* query */ })
    });
    
    const data = await response.json();
    // Process data...
    return processedData;
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}
```

### 4. Error Handling
- Commands use try/catch blocks
- Errors are logged to console
- User-friendly error messages are sent via Discord
- Graceful fallbacks when external APIs fail

## Environment Variables (.env)
```
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_client_id
GEMINI_API_KEY=your_google_gemini_api_key
JIMAKU_API_KEY=your_jimaku_api_key
YOUTUBE_API_KEY=your_youtube_data_api_key
```

## Points System
Different media types have different point values:
- Reading/Visual Novel: 1 point per ~350 characters
- Manga/Book: 0.25-1 point per page
- Anime: 13 points per episode
- Listening/Reading Time: ~0.67 points per minute

## Required Permissions
The bot requires the following Discord permissions:
- `Manage Roles` - For automatic role assignment
- `Send Messages` - To respond to commands
- `Read Message History` - To detect quiz activities
- `Embed Links` - For rich embed responses
- `Attach Files` - For sending downloaded content
- `Add Reactions` - For interactive features
- `Use External Emojis` - For animated reactions

## Development Workflow
1. Make changes to the relevant files
2. Test locally with `npm run dev`
3. Commit changes to Git
4. Deploy to hosting platform (if applicable)

## Common Tasks

### Adding a New Command
1. Create a new file in `commands/`
2. Follow the command structure pattern
3. Export the command data and execute function
4. The bot will automatically load it on restart

### Modifying Points System
1. Edit `utils/points.js`
2. Adjust the multipliers for different media types
3. The changes will apply to new calculations

### Updating External API Keys
1. Update the values in `.env`
2. Restart the bot for changes to take effect

## Troubleshooting

### Bot Not Responding
- Check Discord token validity
- Verify bot has required permissions
- Check console logs for errors

### API Issues
- Verify API keys in environment variables
- Check external service status
- Review rate limiting

### Database Connection
- Verify Firebase credentials
- Check internet connectivity
- Ensure Firebase project is correctly configured