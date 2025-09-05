/**
 * Log Service Module
 * Handles business logic for the log command
 */

const db = require("../firebase/firestore");
const { asyncHandler } = require("../utils/errorHandler");
const {
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
} = require("../utils/logUtils");

/**
 * Handle media type selection
 * @param {Object} interaction - Discord interaction object
 * @param {Map} activeMessages - Active messages map
 * @param {Function} resetActivityTimer - Function to reset activity timer
 * @returns {Promise<void>}
 */
const handleMediaTypeSelection = asyncHandler(async (interaction, activeMessages, resetActivityTimer) => {
  await interaction.deferUpdate();
  
  const parts = interaction.customId.split('_');
  let mediaType;
  if (parts[1] === 'all') {
    mediaType = null;
  } else if (parts[1] === 'reading' && parts[2] === 'time') {
    mediaType = 'reading_time';
  } else if (parts[1] === 'visual' && parts[2] === 'novel') {
    mediaType = 'visual_novel';
  } else {
    mediaType = parts[1];
  }
  
  let timeframe;
 if (parts[1] === 'reading' && parts[2] === 'time') {
    timeframe = parts[3];
  } else if (parts[1] === 'visual' && parts[2] === 'novel') {
    timeframe = parts[3];
  } else {
    timeframe = parts[2];
  }
  
  const user = interaction.user;
  
  const logs = await getUserLogs(user.id, timeframe, mediaType);
  const totalPages = Math.ceil(logs.length / 10);
  const INITIAL_PAGE = 0;
  
  const embed = createLogEmbed(logs, INITIAL_PAGE, totalPages, timeframe, user, mediaType);
  const components = totalPages > 1 || logs.length > 0 ?
    createNavigationButtons(INITIAL_PAGE, totalPages, timeframe, mediaType, logs) :
    [new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`back_to_selection_${timeframe}`)
        .setLabel('Back to Selection')
        .setStyle(ButtonStyle.Secondary)
    )];
  
  await interaction.editReply({
    embeds: [embed],
    components: components
 });
  
  // FIX: Get originalInteraction from activeMessages
  const messageId = interaction.message?.id || interaction.id;
  let storedData = activeMessages.get(messageId);
  
  // If no storedData, try to find with interaction.id
  if (!storedData) {
    // Search by userId and timeframe
    for (const [key, value] of activeMessages.entries()) {
      if (value.userId === user.id && value.timeframe === timeframe) {
        storedData = value;
        break;
      }
    }
 }
  
  const originalInteraction = storedData?.originalInteraction || interaction;
  
  // Clear existing timer
  if (storedData?.timer) {
    clearTimeout(storedData.timer);
  }
  
  activeMessages.set(messageId, {
    originalInteraction: originalInteraction,
    userId: user.id,
    timeframe: timeframe,
    mediaType: mediaType,
    currentPage: page,
    type: 'logs',
    timer: null
  });
  
  // Reset activity timer
  resetActivityTimer(messageId);
});

/**
 * Handle back to selection
 * @param {Object} interaction - Discord interaction object
 * @param {Map} activeMessages - Active messages map
 * @param {Function} resetActivityTimer - Function to reset activity timer
 * @param {Function} createMediaTypeSelectionEmbed - Function to create media type selection embed
 * @param {Function} createMediaTypeButtons - Function to create media type buttons
 * @returns {Promise<void>}
 */
const handleBackToSelection = asyncHandler(async (
  interaction,
  activeMessages,
  resetActivityTimer,
  createMediaTypeSelectionEmbed,
  createMediaTypeButtons
) => {
  await interaction.deferUpdate();
  
  const timeframe = interaction.customId.split('_')[3];
  const user = interaction.user;
  
  const embed = createMediaTypeSelectionEmbed(timeframe, user);
  const components = createMediaTypeButtons(timeframe);
  
  await interaction.editReply({
    embeds: [embed],
    components: components
  });
  
  const messageId = interaction.message?.id || interaction.id;
  let storedData = activeMessages.get(messageId);
  
  if (!storedData) {
    for (const [key, value] of activeMessages.entries()) {
      if (value.userId === user.id && value.timeframe === timeframe) {
        storedData = value;
        break;
      }
    }
  }
  
  const originalInteraction = storedData?.originalInteraction || interaction;
  
  // Clear existing timer
  if (storedData?.timer) {
    clearTimeout(storedData.timer);
  }
  
  activeMessages.set(messageId, {
    originalInteraction: originalInteraction,
    userId: user.id,
    timeframe: timeframe,
    type: 'selection',
    timer: null
  });
  
  // Reset activity timer
  resetActivityTimer(messageId);
});

/**
 * Handle delete buttons
 * @param {Object} interaction - Discord interaction object
 * @param {Map} activeMessages - Active messages map
 * @returns {Promise<void>}
 */
const handleDeleteButtons = asyncHandler(async (interaction, activeMessages) => {
  await interaction.deferReply({ ephemeral: true });
  
  const logId = interaction.customId.replace('delete_', '');
  const user = interaction.user;
  
  // Get log details before deletion
  const logDoc = await db.collection("users")
    .doc(user.id)
    .collection("immersion_logs")
    .doc(logId)
    .get();
    
  if (!logDoc.exists) {
    await interaction.editReply({
      content: "Log not found. It may have been already deleted."
    });
    return;
  }
  
  const logData = logDoc.data();
  const activity = logData.activity;
  
  // Delete the log
  await db.collection("users")
    .doc(user.id)
    .collection("immersion_logs")
    .doc(logId)
    .delete();
  
  // Update user stats (subtract the deleted amounts)
  const userStatsRef = db.collection("users").doc(user.id);
  
  await db.runTransaction(async (transaction) => {
    const userStatsDoc = await transaction.get(userStatsRef);
    
    if (userStatsDoc.exists) {
      const currentData = userStatsDoc.data();
      
      if (currentData.stats && currentData.stats[activity.type]) {
        const currentTotal = currentData.stats[activity.type].total || 0;
        const currentSessions = currentData.stats[activity.type].sessions || 0;
        
        const newTotal = Math.max(0, currentTotal - activity.amount);
        const newSessions = Math.max(0, currentSessions - 1);
        
        currentData.stats[activity.type].total = newTotal;
        currentData.stats[activity.type].sessions = newSessions;
        
        const totalSessions = Object.values(currentData.stats).reduce((sum, stat) => {
          return sum + (stat.sessions || 0);
        }, 0);
        
        currentData.summary.totalSessions = totalSessions;
        currentData.timestamps.updated = new Date();
        
        transaction.set(userStatsRef, currentData, { merge: true });
      }
    }
  });
  
  await interaction.editReply({
    content: `Successfully deleted log: **${activity.amount} ${activity.unit} of ${activity.typeLabel}**${activity.title && activity.title !== "-" ? ` - ${activity.title}` : ''}`
  });
  
  // FIX: Auto-refresh with originalInteraction
  const messageId = interaction.message?.id;
  const messageData = activeMessages.get(messageId);
  if (messageData && messageData.type === 'logs' && messageData.originalInteraction) {
    await refreshLogView(messageData.originalInteraction, messageData);
  }
});

/**
 * Handle pagination
 * @param {Object} interaction - Discord interaction object
 * @param {Map} activeMessages - Active messages map
 * @param {Function} resetActivityTimer - Function to reset activity timer
 * @returns {Promise<void>}
 */
const handlePagination = asyncHandler(async (interaction, activeMessages, resetActivityTimer) => {
  await interaction.deferUpdate();
  
  const parts = interaction.customId.split('_');
  const action = parts[1];
  const currentPage = parseInt(parts[2]);
  const timeframe = parts[3];
  const mediaType = parts[4] === 'all' ? null : parts[4];
  
  const user = interaction.user;
 const newPage = action === 'prev' ? currentPage - 1 : currentPage + 1;
  
  const logs = await getUserLogs(user.id, timeframe, mediaType);
  const totalPages = Math.ceil(logs.length / 10);
  
  if (newPage < 0 || newPage >= totalPages) {
    return;
  }
  
  const embed = createLogEmbed(logs, newPage, totalPages, timeframe, user, mediaType);
  const components = createNavigationButtons(newPage, totalPages, timeframe, mediaType, logs);
  
  await interaction.editReply({
    embeds: [embed],
    components: components
  });
  
  const messageId = interaction.message?.id || interaction.id;
  const messageData = activeMessages.get(messageId);
  if (messageData) {
    // Clear existing timer
    if (messageData.timer) {
      clearTimeout(messageData.timer);
    }
    messageData.currentPage = newPage;
    activeMessages.set(messageId, messageData);
    
    // Reset activity timer
    resetActivityTimer(messageId);
  }
});

module.exports = {
  handleMediaTypeSelection,
  handleBackToSelection,
  handleDeleteButtons,
  handlePagination
};