# 🌸 Yuyuko Bot - Japanese Immersion Tracker with Ayumi AI

Yuyuko is a Discord bot specifically designed for Japanese language learners to track their immersion activities. It features Ayumi, a friendly AI assistant, along with comprehensive logging for various media types with automatic metadata fetching, rich statistics, and community features.

## 🌟 Key Features

### 🤖 Ayumi AI Assistant
Yuyuko includes Ayumi, a friendly and intelligent AI assistant with a distinct personality:
- **Santai, ramah, dan sedikit jahil** - Conversational style that's relaxed and friendly with occasional playful teasing
- **Context-aware** - Remembers previous conversations and user preferences
- **Multilingual support** - Can communicate in both Indonesian and English with occasional Japanese phrases
- **Image capabilities** - Can analyze images, view user avatars, and generate new images
- **Personalized interactions** - Remembers user names and interaction history
- **Rich personality** - Uses expressive language with occasional emojis and Japanese expressions like "ganbatte", "daijoubu", and "sugoi~"

**Ayumi's Capabilities:**
- **General conversation** - Chat about any topic with a friendly and engaging tone
- **Image analysis** - Describe and analyze any images sent by users
- **Avatar viewing** - View and comment on user profile pictures
- **Image generation** - Create images based on user requests
- **Immersion tracking assistance** - Help with logging and tracking immersion activities
- **Learning support** - Provide assistance with Japanese language learning
- **Entertainment** - Engage in fun conversations and provide entertainment

**How to interact with Ayumi:**
- Mention the bot with `@Yuyuko Bot [your message]`
- Use the command `a!ayumi [your message]`
- Send images for analysis
- Request image generation with phrases like "buatkan gambar" or "generate gambar"

### 📚 Immersion Tracking
Track your Japanese learning progress across multiple media types:
- **Anime** - Episodes watched
- **Manga** - Pages read
- **Books** - Pages read
- **Visual Novels** - Characters read
- **Reading** - Characters read
- **Reading Time** - Minutes spent reading
- **Listening** - Minutes of audio content

### 🔍 Automatic Metadata Fetching
- **YouTube Integration** - Automatically fetches title, duration, and thumbnail for listening activities
- **VNDB Database** - Visual novel information including developer, release date, and length
- **AniList Integration** - Anime and manga details with cover images

### 📊 Rich Statistics & Visualization
- Personal progress tracking with detailed statistics
- Interactive bar charts for activity visualization
- Heatmap calendar showing daily activity patterns
- Streak tracking to maintain consistency
- Points system with different values per media type

### 🏆 Community Features
- Real-time leaderboards (daily, weekly, monthly, yearly, all-time)
- Media-specific rankings
- Interactive log management with delete functionality
- Points-based competition system

### 🎯 Additional Tools
- **Light Novel Search** - Find and download light novels in Japanese
- **Subtitle Search** - Search and download anime subtitles from Jimaku
- **Interactive Reactions** - Add animated reactions to messages
- **Ayumi AI Chat** - Chat with Ayumi using Google's Gemini AI (via `@Yuyuko Bot` or `a!ayumi`)

## 🛠 Technology Stack

- **Node.js** with **discord.js v14**
- **Firebase Cloud Firestore** for data storage
- **YouTube Data API v3** for video metadata
- **VNDB API** for visual novel information
- **AniList API** for anime/manga data
- **Google Generative AI (Gemini)** for Ayumi AI functionality
- **Canvas** for image generation (charts, heatmaps)
- **Chart.js** for data visualization

## 🚀 Setup & Installation

### Prerequisites
- Node.js v16 or higher
- Firebase project with Cloud Firestore
- Discord bot token
- API keys for YouTube, VNDB, AniList, and Google Gemini

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd yuyuko-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the project root:
   ```env
   DISCORD_TOKEN=your_discord_bot_token
   CLIENT_ID=your_discord_application_client_id
   GEMINI_API_KEY=your_google_gemini_api_key
   JIMAKU_API_KEY=your_jimaku_api_key
   YOUTUBE_API_KEY=your_youtube_data_api_key
   ```

4. **Set up Firebase**
   - Create a Firebase project at https://console.firebase.google.com/
   - Generate a service account key
   - Download the JSON file and place it as `firebase-key.json` in the project root

5. **Run the bot**
   ```bash
   npm run dev
   ```

## 📋 Available Commands

### Main Commands

- **`/immersion`** - Log immersion activities
  ```
  /immersion [media_type] [amount] [title] [comment] [date]
  ```
  - `media_type`: anime, manga, book, visual_novel, reading, reading_time, listening
  - `amount`: Number of episodes/pages/characters/minutes
  - `title`: Media title (supports autocomplete for VN/Anime)
  - `comment`: Optional notes
  - `date`: Optional custom date (YYYY-MM-DD format)

- **`/log time`** - View and manage your immersion logs
  ```
  /log time [timeframe]
  ```
  - `timeframe`: 24h or 7d
  - Interactive pagination with delete buttons

- **`/stat`** - View your immersion statistics
  ```
  /stat [visual_type] [days] [year]
  ```
  - `visual_type`: barchart or heatmap
  - `days`: Time range for bar chart (7, 30, etc.)
  - `year`: Year for heatmap

- **`/leaderboard`** - View community rankings
  ```
  /leaderboard [timestamp] [media_type] [month] [year]
  ```
  - `timestamp`: weekly, monthly, yearly, all_time
  - `media_type`: Specific media or all
  - `month`/`year`: For specific time periods

### Content Discovery

- **`/novel`** - Search and download light novels
  ```
  /novel [title]
  ```

- **`/subs`** - Search and download anime subtitles
  ```
  /subs [name] [episode]
  ```

### Utility Commands

- **`/react`** - Add animated reactions to messages
  ```
  /react [message]
  ```

- **`/help`** - View detailed usage guide
  ```
  /help [language]
  ```

### AI Integration

- **`@Yuyuko Bot`** - Chat with the bot using Gemini AI
  ```
  @Yuyuko Bot [your message]
  ```

- **`a!ayumi`** - Alternative way to chat with the bot
  ```
  a!ayumi [your message]
  ```

- **`a!ayumi`** - Alternative way to chat with the bot
  ```
  a!ayumi [your message]
  ```

## 🔧 Configuration

### Points System
Different media types have different point values:
- Reading/Visual Novel: 1 point per character
- Manga/Book: 0.5 points per page
- Anime: 10 points per episode
- Listening/Reading Time: 0.5 points per minute

### Role System
Automatic role assignment based on points:
- Level 1: 0-999 points
- Level 2: 1,000-4,999 points
- Level 3: 5,000-19,999 points
- Level 4: 20,000-99,999 points
- Level 5: 100,000+ points

## 🔐 Required Permissions

The bot requires the following Discord permissions:
- `Manage Roles` - For automatic role assignment
- `Send Messages` - To respond to commands
- `Read Message History` - To detect quiz activities
- `Embed Links` - For rich embed responses
- `Attach Files` - For sending downloaded content
- `Add Reactions` - For interactive features
- `Use External Emojis` - For animated reactions

## 📁 Project Structure

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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [discord.js](https://discord.js.org/) - Discord API library
- [Firebase](https://firebase.google.com/) - Backend infrastructure
- [YouTube Data API](https://developers.google.com/youtube/v3) - Video metadata
- [VNDB API](https://vndb.org/) - Visual novel database
- [AniList API](https://anilist.gitbook.io/anilist-apiv2-docs/) - Anime/manga database
- [Google Gemini API](https://ai.google.dev/) - AI chat functionality
- [Jimaku](https://jimaku.cc/) - Subtitle database