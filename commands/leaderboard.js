/**
 * Leaderboard command
 * Displays immersion leaderboard based on points
 * @module commands/leaderboard
 */

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../firebase/firestore");

// Points multipliers from stat.js
const pointsMultipliers = {
  visual_novel: 0.0028571428571429,
  manga: 0.25,
  anime: 13.0,
  book: 1.0,
  reading_time: 0.67,
  listening: 0.67,
  reading: 0.0028571428571429,
};

// Label map for media types (from stat.js + 'all')
const mediaTypeLabelMap = { // Renamed for clarity
  visual_novel: "Visual Novel",
  manga: "Manga",
  anime: "Anime",
  book: "Book",
  reading_time: "Reading Time",
  listening: "Listening",
  reading: "Reading",
  all: "All Media Types"
};

// New label map for timestamp periods
const timestampLabelMap = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
  all_time: "All-time"
};

// Unit map for media types (from stat.js)
const unitMap = {
  visual_novel: "characters",
  manga: "pages",
  anime: "episodes",
  book: "pages",
  reading_time: "minutes",
  listening: "minutes",
  reading: "characters",
};

/**
 * Get points multiplier for media type
 * @param {string} mediaType - Media type
 * @returns {number} Points multiplier
 */
function getPointsMultiplier(mediaType) {
  return pointsMultipliers[mediaType];
}

module.exports = {
  name: "leaderboard",
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the immersion leaderboard based on points.")
    .addStringOption(option =>
      option
        .setName("timestamp")
        .setDescription("Time period for the leaderboard.")
        .setRequired(true)
        .addChoices(
          { name: "Weekly", value: "weekly" },
          { name: "Monthly", value: "monthly" },
          { name: "Yearly", value: "yearly" },
          { name: "All-time", value: "all_time" }
        )
    )
    .addStringOption(option =>
      option
        .setName("media_type")
        .setDescription("Select media type for the leaderboard (or 'all' for all).")
        .setRequired(true)
        .addChoices(
          { name: "All Media", value: "all" },
          { name: "Visual Novel", value: "visual_novel" },
          { name: "Manga", value: "manga" },
          { name: "Anime", value: "anime" },
          { name: "Book", value: "book" },
          { name: "Reading Time", value: "reading_time" },
          { name: "Listening", value: "listening" },
          { name: "Reading", value: "reading" }
        )
    )
    // --- CHANGES START HERE ---
    .addIntegerOption(option => 
        option
            .setName("month")
            .setDescription("Select a specific month for the monthly leaderboard (optional).")
            .setRequired(false)
            .addChoices(
                { name: "January", value: 1 },
                { name: "February", value: 2 },
                { name: "March", value: 3 },
                { name: "April", value: 4 },
                { name: "May", value: 5 },
                { name: "June", value: 6 },
                { name: "July", value: 7 },
                { name: "August", value: 8 },
                { name: "September", value: 9 },
                { name: "October", value: 10 },
                { name: "November", value: 11 },
                { name: "December", value: 12 }
            )
    )
    .addIntegerOption(option =>
        option
            .setName("year")
            .setDescription("Select a specific year for the monthly/yearly leaderboard (optional).")
            .setRequired(false)
            .setMinValue(2020) // Set a reasonable minimum year
    ),
    // --- CHANGES END HERE ---

  /**
   * Execute the leaderboard command
   * @param {Object} interaction - Discord interaction object
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    await interaction.deferReply();

    const timestampFilter = interaction.options.getString("timestamp");
    const mediaTypeFilter = interaction.options.getString("media_type");
    // --- UPDATED CHANGES START HERE ---
    const specifiedMonth = interaction.options.getInteger("month"); // Can be null
    const specifiedYear = interaction.options.getInteger("year"); // Can be null
    // --- UPDATED CHANGES END HERE ---

    if (!timestampFilter || !mediaTypeFilter) {
        return await interaction.editReply("Please select both a time period and a media type for the leaderboard.");
    }
    
    // --- UPDATED DATE LOGIC ---
    let startDate = null;
    let endDate = null;
    const now = new Date();

    let titlePeriod = timestampLabelMap[timestampFilter]; // For dynamic embed title

    switch (timestampFilter) {
      case "weekly":
        endDate = new Date();
        endDate.setUTCHours(23, 59, 59, 999);
        startDate = new Date(endDate);
        startDate.setUTCDate(endDate.getUTCDate() - 7);
        startDate.setUTCHours(0, 0, 0, 0);
        break;
      
      case "monthly": {
        const year = specifiedYear || now.getUTCFullYear();
        // JS month is 0-indexed, so we subtract 1 if specifiedMonth exists.
        // If not, we use the current month which is already 0-indexed.
        const month = specifiedMonth ? specifiedMonth - 1 : now.getUTCMonth();

        // Start of the selected or current month
        startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
        // End of the selected or current month
        endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
        
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        titlePeriod += ` - ${monthNames[month]} ${year}`; // e.g., "Monthly - June 2025"
        break;
      }
        
      case "yearly": {
        const year = specifiedYear || now.getUTCFullYear();

        // Start of the selected or current year
        startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)); // January 1st
        // End of the selected or current year
        endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)); // December 31st

        titlePeriod += ` - ${year}`; // e.g., "Yearly - 2025"
        break;
      }

      case "all_time":
        // No start/end date needed, handled later
        break;
    }

    const leaderboard = {};

    try {
      const usersRef = db.collection("users");
      const userDocs = await usersRef.get();

      if (userDocs.empty) {
        return await interaction.editReply("🚫 No immersion data recorded yet.");
      }

      for (const userDoc of userDocs.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const profile = userData.profile;

        if (!profile) continue;

        let userTotalPoints = 0;
        let userTotalAmount = 0;
        
        const displayUnit = (mediaTypeFilter !== "all") ? unitMap[mediaTypeFilter] : null;

        if (timestampFilter === "all_time") {
          const stats = userData.stats || {};
          for (const mediaType in stats) {
            if (mediaTypeFilter === "all" || mediaTypeFilter === mediaType) {
              const totalAmount = stats[mediaType].total || 0;
              userTotalPoints += totalAmount * (getPointsMultiplier(mediaType) || 0);
              if (mediaTypeFilter === mediaType) {
                userTotalAmount += totalAmount;
              }
            }
          }
        } else {
          const logsRef = db.collection("users").doc(userId).collection("immersion_logs");
          let query = logsRef.orderBy("timestamps.created", "asc");

          if (startDate) {
            query = query.where("timestamps.created", ">=", startDate);
          }
          if (endDate) {
            query = query.where("timestamps.created", "<=", endDate);
          }
          
          const logsSnapshot = await query.get();

          logsSnapshot.forEach(logDoc => {
            const logData = logDoc.data();
            const logMediaType = logData.activity.type;
            const logAmount = logData.activity.amount;

            if (mediaTypeFilter === "all" || mediaTypeFilter === logMediaType) {
              userTotalPoints += logAmount * (getPointsMultiplier(logMediaType) || 0);
              if (mediaTypeFilter === logMediaType) {
                userTotalAmount += logAmount;
              }
            }
          });
        }
        
        if (userTotalPoints > 0) {
          leaderboard[userId] = {
            displayName: profile.displayName || profile.username,
            avatar: profile.avatar,
            points: userTotalPoints,
            amount: userTotalAmount,
            unit: displayUnit
          };
        }
      }

      const sortedLeaderboard = Object.values(leaderboard).sort((a, b) => b.points - a.points);

      if (sortedLeaderboard.length === 0) {
        return await interaction.editReply(`🚫 No immersion data found for the **${titlePeriod}** period and **${mediaTypeLabelMap[mediaTypeFilter]}** media type.`);
      }

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        // Updated title to be dynamic
        .setTitle(`🏆 Immersion Leaderboard - ${titlePeriod} (${mediaTypeLabelMap[mediaTypeFilter]})`) 
        .setDescription("Here's the list of top immersionists:")
        .setTimestamp()
        .setFooter({ text: `Generated by ${interaction.client.user.username}`, iconURL: interaction.client.user.displayAvatarURL() });

      let descriptionContent = "";
      const topCount = Math.min(sortedLeaderboard.length, 10);

      for (let entryIndex = 0; entryIndex < topCount; entryIndex++) {
        const entry = sortedLeaderboard[entryIndex];
        let amountString = "";
        if (entry.unit && mediaTypeFilter !== "all") {
          amountString = ` | **${entry.amount.toLocaleString()}** ${entry.unit}`;
        }
        descriptionContent += `**#${entryIndex + 1}.** **${entry.displayName}**: ${entry.points.toFixed(2)} Pts${amountString}
`;
      }
      embed.setDescription(descriptionContent);

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("Error generating leaderboard:", error);
      await interaction.editReply("❌ An error occurred while generating the leaderboard. Please try again later.");
    }
  },
};