/**
 * Export immersion logs command
 * Allows users to export their immersion logs as a text file
 * @module commands/export
 */

const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const db = require("../firebase/firestore");
const fs = require("fs");
const path = require("path");

/**
 * Format timestamp as a readable date string
 * @param {Object|Date|number} timestamp - Timestamp to format
 * @returns {string} Formatted date string
 */
function formatDate(timestamp) {
  let logDate;
  
  // Handle Firestore Timestamp object
  if (timestamp && typeof timestamp.toDate === 'function') {
    logDate = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    logDate = timestamp;
  } else {
    logDate = new Date(timestamp);
  }
  
  return logDate.toLocaleDateString('en-GB', { 
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) + " at " + logDate.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

/**
 * Get user immersion logs from database
 * @param {string} userId - Discord user ID
 * @param {string} timeframe - Timeframe filter
 * @param {string|null} mediaType - Media type filter
 * @returns {Promise<Array>} Array of log objects
 */
async function getUserLogs(userId, timeframe, mediaType = null) {
  const now = new Date();
  let startDate;
  
  // Calculate start date based on timeframe
  switch(timeframe) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case 'year':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      startDate = new Date(0); // All time
  }
  
  let query = db.collection("users")
    .doc(userId)
    .collection("immersion_logs")
    .where("timestamps.created", ">=", startDate);
  
  // Add media type filter if specified and not null/undefined
  if (mediaType && mediaType !== 'all') {
    query = query.where("activity.type", "==", mediaType);
  }
  
  const snapshot = await query.orderBy("timestamps.created", "desc").get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Generate export content for text file
 * @param {Array} logs - Array of log objects
 * @param {string} timeframe - Timeframe filter
 * @param {string} mediaType - Media type filter
 * @param {string} username - Discord username
 * @returns {string} Formatted export content
 */
function generateExportContent(logs, timeframe, mediaType, username) {
  const mediaTypeLabel = mediaType && mediaType !== 'all' ? getMediaTypeLabel(mediaType) : 'All Media Types';
  const timeframeLabel = getTimeframeLabel(timeframe);
  
  let content = `Immersion Logs Export
====================

`;
  content += `User: ${username}
`;
  content += `Timeframe: ${timeframeLabel}
`;
  content += `Media Type: ${mediaTypeLabel}
`;
  content += `Total Logs: ${logs.length}
`;
  content += `Export Date: ${new Date().toLocaleString('en-GB')}

`;
  
  if (logs.length === 0) {
    content += `No immersion logs found for the selected timeframe and media type.
`;
    return content;
  }
  
  // Summary statistics
  const stats = {};
  let totalActivities = 0;
  
  logs.forEach(log => {
    const type = log.activity.type;
    const amount = log.activity.amount;
    
    if (!stats[type]) {
      stats[type] = { count: 0, total: 0 };
    }
    
    stats[type].count++;
    stats[type].total += amount;
    totalActivities++;
  });
  
  content += `Summary Statistics:
------------------
`;
  for (const [type, data] of Object.entries(stats)) {
    const label = getMediaTypeLabel(type);
    content += `${label}: ${data.count} sessions, ${data.total} total ${getUnitForType(type)}
`;
  }
  content += `

`;

  // Detailed logs
  content += `Detailed Logs:
-------------
`;
  
  logs.forEach((log, index) => {
    const activity = log.activity;
    const time = formatDate(log.timestamps.created);
    
    content += `${index + 1}. ${activity.amount} ${activity.unit} of ${activity.typeLabel}
`;
    
    if (activity.title && activity.title !== "-") {
      content += `   Title: ${activity.title}
`;
    }
    
    content += `   Date: ${time}
`;
    
    if (log.note) {
      content += `   Note: ${log.note}
`;
    }
    
    content += `

`;
  });
  
  return content;
}

/**
 * Get media type label for display
 * @param {string} mediaType - Media type
 * @returns {string} Media type label
 */
function getMediaTypeLabel(mediaType) {
  const labelMap = {
    visual_novel: "Visual Novel",
    manga: "Manga",
    anime: "Anime", 
    book: "Book",
    reading_time: "Reading Time",
    listening: "Listening",
    reading: "Reading",
  };
  return labelMap[mediaType] || mediaType;
}

/**
 * Get unit for media type
 * @param {string} type - Media type
 * @returns {string} Unit
 */
function getUnitForType(type) {
  const unitMap = {
    visual_novel: "characters",
    manga: "pages",
    anime: "episodes", 
    book: "pages",
    reading_time: "minutes",
    listening: "minutes",
    reading: "characters",
  };
  return unitMap[type] || "units";
}

/**
 * Get timeframe label for display
 * @param {string} timeframe - Timeframe
 * @returns {string} Timeframe label
 */
function getTimeframeLabel(timeframe) {
  const labelMap = {
    day: "Last 24 Hours",
    week: "Last 7 Days",
    month: "Last 30 Days",
    year: "Last 365 Days",
    all: "All Time"
  };
  return labelMap[timeframe] || timeframe;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("export")
    .setDescription("Export your immersion logs as a text file")
    .addStringOption(option =>
      option
        .setName("timeframe")
        .setDescription("Choose timeframe to export logs")
        .setRequired(true)
        .addChoices(
          { name: "Last 24 Hours", value: "day" },
          { name: "Last 7 Days", value: "week" },
          { name: "Last 30 Days", value: "month" },
          { name: "Last 365 Days", value: "year" },
          { name: "All Time", value: "all" }
        )
    )
    .addStringOption(option =>
      option
        .setName("mediatype")
        .setDescription("Choose media type to export")
        .setRequired(false)
        .addChoices(
          { name: "All Types", value: "all" },
          { name: "Visual Novel", value: "visual_novel" },
          { name: "Book", value: "book" },
          { name: "Reading", value: "reading" },
          { name: "Reading Time", value: "reading_time" },
          { name: "Manga", value: "manga" },
          { name: "Anime", value: "anime" },
          { name: "Listening", value: "listening" }
        )
    ),

  /**
   * Execute the export command
   * @param {Object} interaction - Discord interaction object
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    const user = interaction.user;
    const timeframe = interaction.options.getString("timeframe");
    const mediaType = interaction.options.getString("mediatype") || "all";
    
    // Always make exports public
    await interaction.deferReply({ ephemeral: false });
    
    try {
      // Fetch user logs
      const logs = await getUserLogs(user.id, timeframe, mediaType);
      
      // Generate content
      const content = generateExportContent(logs, timeframe, mediaType, user.username);
      
      // Create file name
      const timeframeLabel = timeframe;
      const mediaTypeLabel = mediaType === 'all' ? 'all' : mediaType;
      const fileName = `immersion_logs_${user.username}_${timeframeLabel}_${mediaTypeLabel}.txt`;
      
      // Create attachment
      const fileBuffer = Buffer.from(content, 'utf-8');
      const attachment = new AttachmentBuilder(fileBuffer, { name: fileName });
      
      // Send file publicly
      await interaction.editReply({ 
        content: `${user.username}'s immersion log export for ${getTimeframeLabel(timeframe)}${mediaType !== 'all' ? ` (${getMediaTypeLabel(mediaType)})` : ''}:`,
        files: [attachment]
      });
      
    } catch (error) {
      console.error("Error exporting logs:", error);
      await interaction.editReply({ 
        content: "Failed to export logs. Please try again later." 
      });
    }
  }
};