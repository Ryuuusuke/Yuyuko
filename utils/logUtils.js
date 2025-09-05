/**
 * Log Utility Functions
 * Shared helper functions for log command and service
 * @module utils/logUtils
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const db = require("../firebase/firestore");
const { asyncHandler, logError } = require("../utils/errorHandler");

/**
 * A map to store active message interactions for features like pagination and auto-cleanup.
 * The key is the message ID, and the value is an object containing interaction data.
 * @type {Map<string, object>}
 */
const activeMessages = new Map();

/**
 * Formats a timestamp into a user-friendly string (e.g., "Today, 14:30", "Yesterday, 09:00", "Sunday, 23 Jul, 12:00").
 * @param {Date|object} timestamp - The timestamp to format. Can be a Date object or a Firestore Timestamp.
 * @returns {string} The formatted date string.
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
  
  const now = new Date();
  const diffTime = now - logDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Convert to 24-hour format
  const timeString = logDate.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  
  if (diffDays === 0) {
    return `Today, ${timeString}`;
  } else if (diffDays === 1) {
    return `Yesterday, ${timeString}`;
  } else {
    return logDate.toLocaleDateString('en-GB', { 
      weekday: 'long',
      day: 'numeric',
      month: 'short'
    }) + `, ${timeString}`;
  }
}

/**
 * Fetches immersion logs for a specific user from the database within a given timeframe and optionally filters by media type.
 * @param {string} userId - The Discord user ID.
 * @param {string} timeframe - The timeframe to fetch logs for ('24h' or '7d').
 * @param {string|null} [mediaType=null] - The media type to filter by (e.g., 'anime', 'manga'). If null, fetches all types.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of log objects.
 */
async function getUserLogs(userId, timeframe, mediaType = null) {
  const now = new Date();
  let startDate;
  
  if (timeframe === '24h') {
    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (timeframe === '7d') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
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
 * Creates a Discord embed for selecting a media type.
 * @param {string} timeframe - The selected timeframe ('24h' or '7d').
 * @param {object} user - The Discord user object.
 * @returns {EmbedBuilder} The created embed builder instance.
 */
function createMediaTypeSelectionEmbed(timeframe, user) {
  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`Select Media Type`)
    .setDescription(`**Timeframe:** ${timeframe === '24h' ? 'Last 24 Hours' : 'Last 7 Days'}\n\nChoose which type of immersion logs you want to view:`)
    .addFields([
      {
        name: "Available Media Types", 
        value: "**Visual Novel** - Characters read\n**Book** - Pages read\n**Reading** - Characters read\n**Reading Time** - Minutes spent\n**Manga** - Pages read\n**Anime** - Episodes watched\n**Listening** - Minutes spent\n**All Types** - Show everything", 
        inline: false 
      }
    ])
    .setFooter({
      text: `${user.username} • This message will disappear in 45 seconds`,
      iconURL: user.displayAvatarURL({ size: 32 })
    })
    .setTimestamp();

  return embed;
}

/**
 * Creates action rows with buttons for selecting a media type.
 * @param {string} timeframe - The selected timeframe ('24h' or '7d').
 * @returns {Array<ActionRowBuilder>} An array of action row builder instances.
 */
function createMediaTypeButtons(timeframe) {
  const row1 = new ActionRowBuilder();
  const row2 = new ActionRowBuilder();
  
  // First row
  row1.addComponents(
    new ButtonBuilder()
      .setCustomId(`media_visual_novel_${timeframe}`)
      .setLabel('Visual Novel')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`media_book_${timeframe}`)
      .setLabel('Book')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`media_reading_${timeframe}`)
      .setLabel('Reading')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`media_reading_time_${timeframe}`)
      .setLabel('Reading Time')
      .setStyle(ButtonStyle.Secondary)
  );
  
  // Second row
  row2.addComponents(
    new ButtonBuilder()
      .setCustomId(`media_manga_${timeframe}`)
      .setLabel('Manga')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`media_anime_${timeframe}`)
      .setLabel('Anime')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`media_listening_${timeframe}`)
      .setLabel('Listening')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`media_all_${timeframe}`)
      .setLabel('All Types')
      .setStyle(ButtonStyle.Primary)
  );
  
  return [row1, row2];
}

/**
 * Gets a user-friendly label for a given media type.
 * @param {string} mediaType - The media type key (e.g., 'visual_novel').
 * @returns {string} The display label for the media type.
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
  return labelMap[mediaType] || "Unknown";
}

/**
 * Creates a Discord embed to display a paginated list of immersion logs.
 * @param {Array<object>} logs - The array of log objects to display.
 * @param {number} page - The current page number (0-indexed).
 * @param {number} totalPages - The total number of pages.
 * @param {string} timeframe - The selected timeframe ('24h' or '7d').
 * @param {object} user - The Discord user object.
 * @param {string|null} [mediaType=null] - The selected media type.
 * @returns {EmbedBuilder} The created embed builder instance.
 */
function createLogEmbed(logs, page, totalPages, timeframe, user, mediaType = null) {
  const startIndex = page * 10;
  const endIndex = Math.min(startIndex + 10, logs.length);
  const currentLogs = logs.slice(startIndex, endIndex);

  const mediaTypeLabel = mediaType && mediaType !== 'all' ? getMediaTypeLabel(mediaType) : 'All Types';

  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(`📚 Immersion Logs - ${timeframe === '24h' ? 'Last 24 Hours' : 'Last 7 Days'}`)
    .setFooter({
      text: `Page ${page + 1}/${totalPages} • ${logs.length} total logs • ${user.username}`,
      iconURL: user.displayAvatarURL({ size: 32 })
    })
    .setTimestamp();

  if (currentLogs.length === 0) {
    embed.setDescription(`**${mediaTypeLabel}**\n\n_No immersion logs found for this timeframe._`);
    return embed;
  }

  let description = `**${mediaTypeLabel}**\n\n`;

  currentLogs.forEach((log, index) => {
    const logNumber = startIndex + index + 1;
    const activity = log.activity;
    const time = formatDate(log.timestamps.created);

    // Media title line (if available)
    let titleLine = "";
    if (activity.title && activity.title !== "-") {
      let title = activity.title.length > 50 ? `${activity.title.slice(0, 50)}...` : activity.title;
      titleLine = `*${title}*\n`;
    }

    // Combine log description
    description += `**${logNumber}.** ${activity.amount} ${activity.unit} of ${activity.typeLabel}\n`;
    description += titleLine;
    description += `${time}\n\n`;
  });

  embed.setDescription(description);
  return embed;
}

/**
 * Creates action rows with navigation and delete buttons for the log view.
 * @param {number} page - The current page number (0-indexed).
 * @param {number} totalPages - The total number of pages.
 * @param {string} timeframe - The selected timeframe ('24h' or '7d').
 * @param {string|null} mediaType - The selected media type.
 * @param {Array<object>} logs - The array of all log objects for the current view.
 * @returns {Array<ActionRowBuilder>} An array of action row builder instances.
 */
function createNavigationButtons(page, totalPages, timeframe, mediaType, logs) {
  const rows = [];
  
  // Navigation row
  const navRow = new ActionRowBuilder();
  
  // Previous button
  const prevButton = new ButtonBuilder()
    .setCustomId(`log_prev_${page}_${timeframe}_${mediaType || 'all'}`)
    .setLabel('Previous')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page === 0);
  
  // Next button  
  const nextButton = new ButtonBuilder()
    .setCustomId(`log_next_${page}_${timeframe}_${mediaType || 'all'}`)
    .setLabel('Next')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page >= totalPages - 1);
  
  // Page info button (disabled, just for display)
  const pageButton = new ButtonBuilder()
    .setCustomId('log_page_info')
    .setLabel(`${page + 1}/${totalPages}`)
    .setStyle(ButtonStyle.Primary)
    .setDisabled(true);
  
  // Back to selection button
  const backButton = new ButtonBuilder()
    .setCustomId(`back_to_selection_${timeframe}`)
    .setLabel('Back to Selection')
    .setStyle(ButtonStyle.Secondary);
  
  navRow.addComponents(prevButton, pageButton, nextButton, backButton);
  rows.push(navRow);
  
  // Delete buttons for current page logs
  const startIndex = page * 10;
  const endIndex = Math.min(startIndex + 10, logs.length);
  const currentLogs = logs.slice(startIndex, endIndex);
  
  if (currentLogs.length > 0) {
    // Create delete button rows (max 5 buttons per row)
    for (let i = 0; i < currentLogs.length; i += 5) {
      const deleteRow = new ActionRowBuilder();
      const rowLogs = currentLogs.slice(i, i + 5);
      
      rowLogs.forEach((log, index) => {
        const globalIndex = startIndex + i + index + 1;
        
        deleteRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`delete_${log.id}`)
            .setLabel(`Delete ${globalIndex}`)
            .setStyle(ButtonStyle.Danger)
        );
      });
      
      rows.push(deleteRow);
    }
  }
  
  return rows;
}

/**
 * Schedules the expiration of an interactive message, editing it to a "Session Expired" state.
 * @param {string} messageId - The ID of the message to schedule for deletion.
 * @param {number} [delay=45000] - The delay in milliseconds before the message expires.
 */
function scheduleMessageDeletion(messageId, delay = 45000) { // 45 seconds
  setTimeout(async () => {
    try {
      const messageData = activeMessages.get(messageId);
      if (messageData && messageData.originalInteraction) {
        // Create expired embed
        const expiredEmbed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("⏰ Session Expired")
          .setDescription("This immersion log session has expired due to inactivity.\n\nUse `/log time` to start a new session.")
          .setFooter({ text: "Session automatically closed after 45 seconds of inactivity" })
          .setTimestamp();

        // Update to expired message with no components
        await messageData.originalInteraction.editReply({
          embeds: [expiredEmbed],
          components: []
        });
        
        // Clean up from memory
        activeMessages.delete(messageId);
      }
    } catch (error) {
      logError(error, 'messageCleanup');
      activeMessages.delete(messageId);
    }
  }, delay);
}

/**
 * Resets the inactivity timer for an interactive message.
 * @param {string} messageId - The ID of the message to reset the timer for.
 */
function resetActivityTimer(messageId) {
  const messageData = activeMessages.get(messageId);
  if (messageData) {
    // Clear existing timer if any
    if (messageData.timer) {
      clearTimeout(messageData.timer);
    }
    
    // Set new timer
    messageData.timer = setTimeout(async () => {
      try {
        if (messageData.originalInteraction) {
          const expiredEmbed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("⏰ Session Expired")
            .setDescription("This immersion log session has expired due to inactivity.\n\nUse `/log time` to start a new session.")
            .setFooter({ text: "Session automatically closed after 45 seconds of inactivity" })
            .setTimestamp();

          await messageData.originalInteraction.editReply({
            embeds: [expiredEmbed],
            components: []
          });
          
          activeMessages.delete(messageId);
        }
      } catch (error) {
      logError(error, 'timerCleanup');
      activeMessages.delete(messageId);
    }
    }, 45000);
    
    // Update the stored message data
    activeMessages.set(messageId, messageData);
  }
}

/**
 * Refreshes the log view message with updated data, typically after a log deletion.
 * @param {object} originalInteraction - The original Discord interaction object that initiated the session.
 * @param {object} messageData - The stored data for the active message.
 * @returns {Promise<void>}
 */
async function refreshLogView(originalInteraction, messageData) {
  try {
    const { userId, timeframe, mediaType, currentPage } = messageData;
    
    const logs = await getUserLogs(userId, timeframe, mediaType);
    const totalPages = Math.ceil(logs.length / 10);
    
    // Adjust page if current page is now out of bounds
    let newPage = currentPage;
    if (newPage >= totalPages && totalPages > 0) {
      newPage = totalPages - 1;
    }
    if (newPage < 0) {
      newPage = 0;
    }
    
    const user = await originalInteraction.client.users.fetch(userId);
    const embed = createLogEmbed(logs, newPage, totalPages, timeframe, user, mediaType);
    const components = totalPages > 0 ? 
      createNavigationButtons(newPage, totalPages, timeframe, mediaType, logs) : 
      [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`back_to_selection_${timeframe}`)
          .setLabel('Back to Selection')
          .setStyle(ButtonStyle.Secondary)
      )];
    
    await originalInteraction.editReply({
      embeds: [embed],
      components: components
    });
    
    // Update stored message data
    messageData.currentPage = newPage;
    const messageId = originalInteraction.id;
    activeMessages.set(messageId, messageData);
    
  } catch (error) {
    logError(error, 'refreshLogView');
  }
}

module.exports = {
  createLogEmbed,
  createNavigationButtons,
  getUserLogs,
  refreshLogView,
  createMediaTypeSelectionEmbed,
  createMediaTypeButtons,
  getMediaTypeLabel,
  formatDate,
  activeMessages,
  resetActivityTimer
};
