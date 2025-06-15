const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const db = require("../firebase/firestore");

// Store active messages for auto-refresh
const activeMessages = new Map();

// Helper function to format date
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

// Helper function to get logs from database
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

// Helper function to create media type selection embed
// Helper function to create media type selection embed
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

// Helper function to create media type selection buttons
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

// Helper function to create log embed
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

    // Baris judul media (jika ada)
    let titleLine = "";
    if (activity.title && activity.title !== "-") {
      let title = activity.title.length > 50 ? `${activity.title.slice(0, 50)}...` : activity.title;
      titleLine = `*${title}*\n`;
    }

    // Gabungkan deskripsi log
    description += `**${logNumber}.** ${activity.amount} ${activity.unit} of ${activity.typeLabel}\n`;
    description += titleLine;
    description += `${time}\n\n`;
  });

  embed.setDescription(description);
  return embed;
}

// Helper function to get media type label
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

// Helper function to create navigation buttons with delete buttons
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
        const shortId = log.id.slice(-6);
        
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

// Helper function to schedule message deletion and auto-cleanup
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
      console.log("Message cleanup:", error.message);
      activeMessages.delete(messageId);
    }
  }, delay);
}

// Helper function to reset activity timer
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
        console.log("Timer cleanup:", error.message);
        activeMessages.delete(messageId);
      }
    }, 45000);
    
    // Update the stored message data
    activeMessages.set(messageId, messageData);
  }
}

// Helper function to refresh the current log view
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
    const components = totalPages > 1 || logs.length > 0 ? 
      createNavigationButtons(newPage, totalPages, timeframe, mediaType, logs) : 
      [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`back_to_selection_${timeframe}`)
          .setLabel('Back to Selection')
          .setStyle(ButtonStyle.Secondary)
      )];
    
    // PERBAIKAN: Gunakan originalInteraction.editReply untuk mengupdate message asli
    await originalInteraction.editReply({ 
      embeds: [embed], 
      components: components 
    });
    
    // Update stored message data
    messageData.currentPage = newPage;
    const messageId = originalInteraction.id;
    activeMessages.set(messageId, messageData);
    
  } catch (error) {
    console.error("Error refreshing log view:", error);
  }
}

module.exports = {
  name: "log",
  data: new SlashCommandBuilder()
    .setName("log")
    .setDescription("View your immersion logs")
    .addSubcommand(subcommand =>
      subcommand
        .setName("time")
        .setDescription("View immersion logs for a specific timeframe")
        .addStringOption(option =>
          option
            .setName("timeframe")
            .setDescription("Choose timeframe to view logs")
            .setRequired(true)
            .addChoices(
              { name: "Last 24 Hours", value: "24h" },
              { name: "Last 7 Days", value: "7d" }
            )
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.user;

    if (subcommand === 'time') {
      await interaction.deferReply({ ephemeral: true });
      
      const timeframe = interaction.options.getString("timeframe");
      
      try {
        // Show media type selection first
        const embed = createMediaTypeSelectionEmbed(timeframe, user);
        const components = createMediaTypeButtons(timeframe);
        
        const reply = await interaction.editReply({ 
          embeds: [embed], 
          components: components 
        });
        
        // Store message data for tracking
        const messageId = interaction.id;
        activeMessages.set(messageId, {
          originalInteraction: interaction, // PERBAIKAN: Simpan interaction asli
          userId: user.id,
          timeframe: timeframe,
          type: 'selection',
          timer: null // For activity timer
        });
        
        // Schedule cleanup with activity timer
        resetActivityTimer(messageId);
        
      } catch (error) {
        console.error("Error showing media selection:", error);
        await interaction.editReply({ 
          content: "Failed to load media selection. Please try again later." 
        });
      }
    }
  },

  // Handle button interactions
  async handleButton(interaction) {
    if (!interaction.customId.startsWith('log_') && 
        !interaction.customId.startsWith('media_') && 
        !interaction.customId.startsWith('delete_') &&
        !interaction.customId.startsWith('back_to_selection_')) {
      return;
    }
    
    // Handle media type selection
    if (interaction.customId.startsWith('media_')) {
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
      
      try {
        const logs = await getUserLogs(user.id, timeframe, mediaType);
        const totalPages = Math.ceil(logs.length / 10);
        const page = 0;
        
        const embed = createLogEmbed(logs, page, totalPages, timeframe, user, mediaType);
        const components = totalPages > 1 || logs.length > 0 ? 
          createNavigationButtons(page, totalPages, timeframe, mediaType, logs) : 
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
        
        // PERBAIKAN: Dapatkan originalInteraction dari activeMessages
        const messageId = interaction.message?.id || interaction.id;
        let storedData = activeMessages.get(messageId);
        
        // Jika tidak ada storedData, coba cari dengan interaction.id
        if (!storedData) {
          // Cari berdasarkan userId dan timeframe
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
        
      } catch (error) {
        console.error("Error fetching logs:", error);
        await interaction.followUp({ 
          content: "Failed to fetch logs. Please try again later.",
          ephemeral: true 
        });
      }
      return;
    }
    
    // Handle back to selection
    if (interaction.customId.startsWith('back_to_selection_')) {
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
      return;
    }
    
    // Handle delete buttons
    if (interaction.customId.startsWith('delete_')) {
      await interaction.deferReply({ ephemeral: true });
      
      const logId = interaction.customId.replace('delete_', '');
      const user = interaction.user;
      
      try {
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
        
        // PERBAIKAN: Auto-refresh dengan originalInteraction
        const messageId = interaction.message?.id;
        const messageData = activeMessages.get(messageId);
        if (messageData && messageData.type === 'logs' && messageData.originalInteraction) {
          await refreshLogView(messageData.originalInteraction, messageData);
        }
        
      } catch (error) {
        console.error("Error deleting log:", error);
        await interaction.editReply({ 
          content: "Failed to delete log. Please try again later." 
        });
      }
      return;
    }
    
    // Handle pagination
    const parts = interaction.customId.split('_');
    const action = parts[1];
    const currentPage = parseInt(parts[2]);
    const timeframe = parts[3];
    const mediaType = parts[4] === 'all' ? null : parts[4];
    
    if (action === 'prev' || action === 'next') {
      await interaction.deferUpdate();
      
      const user = interaction.user;
      const newPage = action === 'prev' ? currentPage - 1 : currentPage + 1;
      
      try {
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
        
      } catch (error) {
        console.error("Error handling pagination:", error);
        await interaction.followUp({ 
          content: "Failed to update logs. Please try again.", 
          ephemeral: true 
        });
      }
    }
  }
};