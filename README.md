## 📘 Yuyuko Discord Bot (WIP)

**Yuyuko** is a Discord bot tailored for language learners using Kotoba Bot quizzes. It features automatic role assignment based on quiz results, immersion tracking (anime, manga, novels, etc.).

> **Status**: 🚧 Work In Progress

---

### ✨ Features

- 🎮 Detects when a user starts a Kotoba quiz (e.g., `k!quiz`)
- 🧠 Listens for Kotoba Bot's embed messages containing quiz results
- 🏅 Automatically assigns roles based on quiz completion
- 📢 Sends congratulatory messages in the channel
- 📚 Tracks immersion activities (anime, manga, novels, games)
- ☁️ Uses **Firebase** as backend for storing user immersion logs

---

### 🛠 Tech Stack

- **Node.js**
- **discord.js v14**
- **Firebase (Cloud Firestore)**
- Slash Command Support
- Persistent data with real-time sync

---

### 🚀 Getting Started

#### 1. Clone the repository

```bash
git clone https://github.com/yourusername/yuyuko-bot.git
cd yuyuko-bot
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Configure your environment

You can create a `environment.js` file or use `.env`. Here's an example using `environment.js`:

```js
// environment.js
module.exports = {
    DISCORD_TOKEN: "your-discord-bot-token",
    CLIENT_ID: "your-discord-client-id",
};
```

> 🔐 Keep this file private and never upload it to public repos.

#### 4. Run the bot

```bash
npm run dev
```

---

### 🧪 Example Behavior

- A user sends: `k!quiz testlevel1 hardcore mmq=3`
- The bot tracks the quiz session
- When **Kotoba Bot** sends a result embed (containing “Congratulations!”), Yuyuko:

    - Adds the “Level 1” role to the user
    - Sends a message:

        > 🎉 Congrats <@user>! You've completed the quiz and advanced to **Level 1**!

---

### 🔖 Immersion Log System

Users can log their daily immersion activities using commands (e.g., `/log anime`, `/log novel`, etc.).

#### Stored data includes:

- Content type (anime, manga, novel, game)
- Title
- Duration or chapter/episode count
- Timestamp

Firebase is used to store and sync these logs per user, enabling future features like:

- Leaderboards
- Daily streaks
- Progress reports

---

### 📌 Required Permissions

To work properly, Yuyuko needs the following permissions:

- `Manage Roles`
- `Send Messages`
- `Read Message History`
- `Embed Links`

Also make sure:

- The bot's **role is positioned _above_** the roles it will assign
- It has access to the relevant channels

---

### 📋 Todo

- [x] Auto role assignment after Kotoba quiz
- [x] Send congrats message on success
- [x] Firebase integration
- [x] Track anime/manga/novel immersion
- [x] Slash commands for logging and reviewing immersion
- [ ] Daily streak notifications
- [ ] Immersion leaderboard
- [ ] Web dashboard (React or Next.js)
