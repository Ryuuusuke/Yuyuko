const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("View usage guide for immersion tracker bot")
    .addStringOption(option =>
      option.setName("language")
        .setDescription("Select guide language (id/en)")
        .addChoices(
          { name: "Indonesia", value: "id" },
          { name: "English", value: "en" }
        )
        .setRequired(false)),

  async execute(interaction) {
    const language = interaction.options.getString("language") || "id";

    let embed;

    if (language === "en") {
      embed = new EmbedBuilder()
        .setColor(0x00bfff)
        .setTitle("Yuyuko Bot Usage Guide")
        .setDescription("Here are some commands and their functions:")
        .addFields(
          {
            name: "/immersion `[media] [amount] [title (optional)] [comment (optional)]`",
            value:
              "Log your Japanese immersion activity with automatic support for YouTube, AniList, and VNDB data.\n" +
              "- `media`: Type of media like `anime`, `manga`, `visual_novel`, `book`, `reading`, `listening`, or `reading_time`.\n" +
              "- `amount`: The amount of immersion (in minutes/pages/episodes/characters).\n" +
              "- `title` (optional): Title of the media (with autocomplete and metadata fetching).\n" +
              "- `comment` (optional): Any notes or thoughts.\n" +
              "For listening via YouTube, the bot auto-fetches title, duration, and thumbnail.",
          },
          {
            name: "/stat `[visual_type (optional)] [days (optional)] [year (optional)]`",
            value:
              "View your overall immersion statistics with various display options:\n" +
              "- `visual_type` (optional): Choose between `barchart` or `heatmap`.\n" +
              "- `days` (optional): Time range for bar chart, e.g., `7` or `30` days.\n" +
              "- `year` (optional): Year for heatmap (default: current year).\n" +
              "Shows points, sessions, streaks across all media types.",
          },
          {
            name: "/log time `[timeframe]`",
            value:
              "View and manage your immersion activity logs interactively.\n" +
              "- `timeframe`: Choose `24h` (last 24 hours) or `7d` (last 7 days).\n" +
              "You can select media type and use **Delete** buttons to manage your logs.",
          },
          {
            name: "/leaderboard `[timestamp] [media_type] [month (optional)] [year (optional)]`",
            value:
              "View the immersion leaderboard based on total points.\n" +
              "- `timestamp`: Time range (`weekly`, `monthly`, `yearly`, `all_time`).\n" +
              "- `media_type`: Filter by specific media (`anime`, `manga`, `book`, etc., or `all`).\n" +
              "- `month` & `year` (optional): To view specific monthly/yearly ranks.\n" +
              "Rankings are calculated in real-time from all user logs.",
          },
          {
            name: "/novel `[title]`",
            value:
              "Search and download light novels by title.\n" +
              "- `title`: The title of the light novel to search for (Japanese characters only).\n" +
              "Results are shown in pages with **Next/Prev** buttons for navigation.",
          },
          {
            name: "/subs `[name] [episode (optional)]`",
            value:
              "Search and download anime subtitles from **Jimaku** directly via bot.\n" +
              "- `name`: Anime name (with autocomplete).\n" +
              "- `episode` (optional): Specific episode number (e.g., `1`, `12`).\n" +
              "Subtitles will be sent to your DM (unless blocked).",
          },
          {
            name: "/react `[message]`",
            value:
              "React to a specific message with animated emojis using interactive buttons.\n" +
              "- `message`: Message ID or message link.\n" +
              "You'll be shown a list of available animated emojis to choose from.",
          },
          {
            name: "/help `[language (optional)]`",
            value: "View this bot's usage guide.\n" +
                   "- `language` (optional): Choose guide language (`id`/`en`). Default: `id`.",
          },
          {
            name: "@Bot (Direct Interaction)",
            value:
              "Mention the bot in any message to chat directly (e.g., `@Yuyuko Bot what should I do today?`).\n" +
              "Features:\n" +
              "- Answer general questions (weather, advice, etc.)\n" +
              "- Generate or analyze **images** (including avatar)\n" +
              "- Talk naturally, remember you, and understand your context\n" +
              "- **Remembers** your past interactions",
          },
          {
            name: "Tips",
            value:
              "- Use autocomplete to select anime/manga/VN titles.\n" +
              "- You can **delete logs** by clicking the `Delete xx` button in `/log`.\n" +
              "- If Jimaku subtitles cannot be sent via DM, make sure your DM privacy settings allow the bot to send messages.",
          }
        )
        .setFooter({
          text: "Yuyuko • Immersion Tracker",
          iconURL: interaction.client.user.displayAvatarURL({ size: 32 }),
        })
        .setTimestamp();

    } else {
      embed = new EmbedBuilder()
        .setColor(0x00bfff)
        .setTitle("Yuyuko Bot Usage Guide")
        .setDescription("Here are some commands and their functions:")
        .addFields(
          {
            name: "/immersion `[media] [amount] [title (optional)] [comment (optional)]`",
            value:
              "Log your Japanese immersion activity automatically, including info fetching from YouTube, AniList, and VNDB.\n" +
              "- `media`: Media type like `anime`, `manga`, `visual_novel`, `book`, `reading`, `listening`, `reading_time`.\n" +
              "- `amount`: Amount of activity (minutes/pages/episodes/characters).\n" +
              "- `title` (optional): Media title (supports autocomplete and automatic info).\n" +
              "- `comment` (optional): Additional notes or comments.\n" +
              "For listening via YouTube, the bot will automatically fetch title, duration, and thumbnail.",
          },
          {
            name: "/stat `[visual_type (optional)] [days (optional)] [year (optional)]`",
            value:
              "View your total immersion statistics, with display options:\n" +
              "- `visual_type` (optional): Choose chart `barchart` (bar chart) or `heatmap` (activity calendar).\n" +
              "- `days` (optional): Data period for `barchart`, e.g. `7` or `30` days.\n" +
              "- `year` (optional): Year for heatmap (default: current year).\n" +
              "Supports points, sessions, and streak display for all media.",
          },
          {
            name: "/log time `[timeframe]`",
            value:
              "View and manage your immersion logs with interactive pagination system.\n" +
              "- `timeframe`: Choose `24h` (last 24 hours) or `7d` (last 7 days).\n" +
              "After selecting, you can choose media type and delete logs with the **Delete** button.",
          },
          {
            name: "/leaderboard `[timestamp] [media_type] [month (optional)] [year (optional)]`",
            value:
              "View immersion leaderboard based on collected points.\n" +
              "- `timestamp`: Choose time period (`weekly`, `monthly`, `yearly`, `all_time`).\n" +
              "- `media_type`: Filter leaderboard by media (`anime`, `manga`, `book`, etc, or `all`).\n" +
              "- `month` & `year` (optional): For specific monthly/yearly leaderboard.\n" +
              "Data is calculated in real-time from all users' immersion logs.",
          },
          {
            name: "/novel `[title]`",
            value:
              "Search and download light novels quickly based on title.\n" +
              "- `title`: Light novel title in Japanese characters (kanji/kana).\n" +
              "Bot will display results list with **Next/Prev** buttons for navigation.",
          },
          {
            name: "/subs `[name] [episode (optional)]`",
            value:
              "Search and download anime subtitles from **Jimaku** site directly via bot.\n" +
              "- `name`: Anime name (with autocomplete).\n" +
              "- `episode` (optional): Specific episode number (e.g.: `1`, `12`).\n" +
              "File will be sent to your DM (if not blocked).",
          },
          {
            name: "/react `[message]`",
            value:
              "Add animated emojis to specific messages interactively.\n" +
              "- `message`: ID or link of message to react to.\n" +
              "You will then be given available animated emoji options.",
          },
          {
            name: "/help `[language (optional)]`",
            value: "View this bot's usage guide.\n" +
                   "- `language` (optional): Choose guide language (`id`/`en`). Default: `id`.",
          },
          {
            name: "@Bot (Direct Interaction)",
            value:
              "Ask anything to the bot by mentioning it, like: `@Yuyuko Bot what should I do today?`\n" +
              "Features:\n" +
              "- Answer general questions (weather, advice, etc)\n" +
              "- Generate or analyze **images** (including profile picture)\n" +
              "- Speak naturally, friendly, and recognize you\n" +
              "- **Remember** previous interactions",
          },
          {
            name: "Tips",
            value:
              "- Use autocomplete to select anime/manga/VN titles.\n" +
              "- You can **delete logs** by clicking the `Delete xx` button in `/log`.\n" +
              "- If Jimaku subtitles can't be sent via DM, make sure you enable DM don't set to private.",
          }
        )
        .setFooter({
          text: "Yuyuko • Immersion Tracker",
          iconURL: interaction.client.user.displayAvatarURL({ size: 32 }),
        })
        .setTimestamp();
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
