/**
 * Immersion Service Module
 * Handles business logic for the immersion tracker
 * @module services/immersionService
 */

const { EmbedBuilder } = require("discord.js");
const db = require("../firebase/firestore");
const getCoverImageByType = require("../utils/getCoverImage");
const { updateUserStreak } = require("../utils/streak");
const { getUserStreakByMedia, getUserStreak } = require("../utils/streak");
const { getMediaInfo, searchAniList, getAniListInfoById } = require("./anilistService");
const { getVNInfo, getVNInfoById, searchVNs } = require("./vndbService");
const { extractYouTubeVideoId, getYouTubeVideoInfo, normalizeYouTubeUrl } = require("./youtubeService");
const { asyncHandler } = require("../utils/errorHandler");

/**
 * Get media type configuration
 * @returns {Object} - Unit and label mappings for media types
 * @property {Object} unitMap - Mapping of media types to their units
 * @property {Object} labelMap - Mapping of media types to their labels
 */
function getMediaTypeConfig() {
  const unitMap = {
    visual_novel: "characters",
    manga: "pages", 
    anime: "episodes",
    book: "pages",
    reading_time: "minutes",
    listening: "minutes",
    reading: "characters",
  };

  const labelMap = {
    visual_novel: "Visual Novel",
    manga: "Manga",
    anime: "Anime", 
    book: "Book",
    reading_time: "Reading Time",
    listening: "Listening",
    reading: "Reading",
  };

  return { unitMap, labelMap };
}

/**
 * Format current date as YYYY-MM-DD string
 * @returns {Object} - Formatted date information
 * @property {string} dateStr - Date in YYYY-MM-DD format
 * @property {Date} localDate - Date object representing local date
 * @property {Date} now - Current date and time
 */
function getFormattedDate() {
  const now = new Date();
  const localDate = new Date(
    now.getFullYear(), now.getMonth(), now.getDate()
  );
  
  const dateStr = [
    localDate.getFullYear(),
    String(localDate.getMonth() + 1).padStart(2, '0'),
    String(localDate.getDate()).padStart(2, '0')
  ].join('-');
  
  return { dateStr, localDate, now };
}

/**
 * Process listening activity with YouTube API
 * @param {Object} interaction - Discord interaction object
 * @param {Object} user - Discord user object
 * @returns {Promise<Object>} - Processed listening data
 * @property {string|null} url - YouTube URL or null if not provided
 * @property {string} rawTitle - Raw title of the media
 * @property {number} amount - Amount of activity in minutes
 * @property {string|null} thumbnail - Thumbnail URL or null if not available
 */
async function processListeningActivity(interaction, user) {
  let url = null;
  let rawTitle = "-";
  let amount = interaction.options.getNumber("amount");
  let thumbnail = null;
  
  const urlEmbed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("📺 Listening Activity")
    .setDescription("Please reply with a **YouTube URL** for your listening media, or type **skip** to skip:")
    .addFields(
      { name: "Accepted formats:", value: "• `https://youtube.com/watch?v=...`\n • `https://youtu.be/...`\n• `video_id`\n• or type `skip`", inline: false }
    )
    .setFooter({ text: "Timeout in 60 seconds" });

  await interaction.editReply({ embeds: [urlEmbed] });

  const filter = (message) => message.author.id === user.id;
  
  try {
    const collected = await interaction.channel.awaitMessages({
      filter,
      max: 1,
      time: 60000,
      errors: ['time']
    });

    const response = collected.first();
    const userInput = response.content.trim().toLowerCase();
    
    if (userInput !== 'skip') {
      url = response.content.trim();
      
      try {
        // Extract video ID from URL or use the input directly if it's already an ID
        const videoId = extractYouTubeVideoId(url);
        
        // Get video info from YouTube API
        const videoInfo = await getYouTubeVideoInfo(videoId);
        
        if (videoInfo) {
          if (videoInfo.title) {
            rawTitle = videoInfo.title;
          }

          if (videoInfo.duration) {
            amount = Math.ceil(videoInfo.duration / 60); // Convert seconds to minutes
          }

          if (videoInfo.thumbnail) {
            thumbnail = videoInfo.thumbnail;
          }
          
          // Normalize the URL for storage
          url = `https://youtube.com/watch?v=${videoId}`;
        }
        
        try {
          await response.delete();
        } catch (err) {
          // Ignore delete errors
        }
        
      } catch (err) {
        console.error("❌ Failed to fetch info from YouTube API:", err);
        await interaction.followUp({
          content: "❌ Failed to fetch video data from YouTube API. Continuing without video info...",
          ephemeral: true
        });
        url = null;
      }
    } else {
      try {
        await response.delete();
      } catch (err) {
        // Ignore delete errors
      }
    }
    
  } catch (err) {
    await interaction.followUp({
      content: "⏰ Timeout! Continuing without YouTube URL...",
      ephemeral: true
    });
  }
  
  return { url, rawTitle, amount, thumbnail };
}

/**
 * Process VNDB information for visual novel media type
 * @param {string} title - Media title
 * @param {string} media_type - Media type
 * @returns {Promise<Object>} - Processed VNDB data
 * @property {string} rawTitle - Raw title of the media
 * @property {Object|null} vndbInfo - VNDB information or null if not found
 * @property {string|null} mediaUrl - Media URL or null if not available
 * @property {string|null} thumbnail - Thumbnail URL or null if not available
 */
async function processVNDBInfo(title, media_type) {
  let rawTitle = title;
  let vndbInfo = null;
  let mediaUrl = null;
  let thumbnail = null;
  
  if (title && title !== "-" && media_type === "visual_novel") {
    try {
      if (title.includes('|')) {
        const [vnTitle, vnId] = title.split('|');
        rawTitle = vnTitle;
        vndbInfo = await getVNInfoById(vnId);
      } else {
        vndbInfo = await getVNInfo(title);
      }
      
      if (vndbInfo) {
        rawTitle = vndbInfo.title;
        mediaUrl = vndbInfo.url;
        if (vndbInfo.image) {
          thumbnail = vndbInfo.image;
        }
      }
    } catch (err) {
      console.error("⚠️ Failed to fetch info from VNDB:", err);
    }
  }
  
  return { rawTitle, vndbInfo, mediaUrl, thumbnail };
}

/**
 * Process AniList information for anime/manga media types
 * @param {string} title - Media title
 * @param {string} media_type - Media type
 * @returns {Promise<Object>} - Processed AniList data
 * @property {string} rawTitle - Raw title of the media
 * @property {Object|null} anilistInfo - AniList information or null if not found
 * @property {string|null} mediaUrl - Media URL or null if not available
 * @property {string|null} thumbnail - Thumbnail URL or null if not available
 */
async function processAniListInfo(title, media_type) {
  let rawTitle = title;
  let anilistInfo = null;
  let mediaUrl = null;
  let thumbnail = null;
  
  if (title && title !== "-" && ['anime', 'manga'].includes(media_type)) {
    try {
      if (title.includes('|')) {
        const [aniTitle, aniId] = title.split('|');
        rawTitle = aniTitle;
        const anilistType = media_type === 'anime' ? 'ANIME' : 'MANGA';
        anilistInfo = await getAniListInfoById(aniId, anilistType);
      } else {
        anilistInfo = await getMediaInfo(title, media_type);
      }
      
      if (anilistInfo) {
        rawTitle = anilistInfo.title;
        mediaUrl = anilistInfo.url;
        if (anilistInfo.image) {
          thumbnail = anilistInfo.image;
        }
      }
    } catch (err) {
      console.error("⚠️ Failed to fetch info from AniList:", err);
    }
  }
  
  return { rawTitle, anilistInfo, mediaUrl, thumbnail };
}

/**
 * Create immersion log data object
 * @param {Object} params - Parameters for creating log data
 * @param {Object} params.user - Discord user object
 * @param {string} params.media_type - Media type
 * @param {string} params.label - Media type label
 * @param {number} params.amount - Amount of activity
 * @param {string} params.unit - Unit of measurement
 * @param {string} params.rawTitle - Raw title of the media
 * @param {string} params.comment - Comment or notes
 * @param {string} params.url - URL of the media
 * @param {Object} params.anilistInfo - AniList information
 * @param {Object} params.vndbInfo - VNDB information
 * @param {string} params.mediaUrl - Media URL
 * @param {string} params.thumbnail - Thumbnail URL
 * @param {Date} params.now - Current date and time
 * @param {string} params.dateStr - Date string in YYYY-MM-DD format
 * @param {Date} params.localDate - Local date object
 * @returns {Object} - Formatted log data
 * @property {Object} logData - Formatted log data object
 * @property {string|null} imageUrl - Image URL or null if not available
 */
function createLogData(params) {
  const { 
    user, 
    media_type, 
    label, 
    amount, 
    unit, 
    rawTitle, 
    comment, 
    url, 
    anilistInfo, 
    vndbInfo, 
    mediaUrl, 
    thumbnail,
    now,
    dateStr,
    localDate
  } = params;
  
  // Get image URL
 let imageUrl = null;
  if (media_type === "listening" && thumbnail) {
    imageUrl = thumbnail;
  } else if (media_type === "visual_novel" && vndbInfo?.image) {
    imageUrl = vndbInfo.image;
  } else if (thumbnail) {
    imageUrl = thumbnail;
  } else {
    imageUrl = getCoverImageByType(media_type, rawTitle);
  }
  
  // Create immersion log entry
  const logData = {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.displayAvatarURL({ size: 64 })
    },
    activity: {
      type: media_type,
      typeLabel: label,
      amount: amount,
      unit: unit,
      title: rawTitle,
      comment: comment !== "-" ? comment : null,
      url: media_type === "listening" && url ? normalizeYouTubeUrl(url) : null,
      anilistUrl: anilistInfo ? mediaUrl : null,
      vndbUrl: vndbInfo ? mediaUrl : null
    },
    metadata: {
      thumbnail: thumbnail || null,
      duration: media_type === "listening" ? amount : null,
      source: media_type === "listening" ? "youtube" : 
              vndbInfo ? "vndb" : 
              anilistInfo ? "anilist" : "manual",
      vndbInfo: vndbInfo ? {
        developer: vndbInfo.developer,
        released: vndbInfo.released,
        length: vndbInfo.length,
        description: vndbInfo.description
      } : null
    },
    timestamps: {
      created: now,
      date: dateStr,
      month: dateStr.slice(0, 7),
      year: localDate.getFullYear()
    }
  };
  
  return { logData, imageUrl };
}

/**
 * Update user statistics in Firestore
 * @param {string} userId - Discord user ID
 * @param {string} media_type - Media type
 * @param {string} unit - Unit of measurement
 * @param {string} label - Media type label
 * @param {number} amount - Amount to add
 * @param {Date} now - Current date/time
 * @returns {Promise<Object>} - Firestore user stats reference
 */
async function updateUserStats(userId, media_type, unit, label, amount, now) {
  const userStatsRef = db.collection("users").doc(userId);
  
  // Use transaction to ensure consistency
  await db.runTransaction(async (transaction) => {
    const userStatsDoc = await transaction.get(userStatsRef);
    
    let currentData = {};
    if (userStatsDoc.exists) {
      currentData = userStatsDoc.data() || {};
    }
    
    // Initialize stats object if it doesn't exist
    if (!currentData.stats) {
      currentData.stats = {};
    }
    
    // Initialize specific media type stats if it doesn't exist
    if (!currentData.stats[media_type]) {
      currentData.stats[media_type] = {
        total: 0,
        sessions: 0,
        lastActivity: null,
        bestStreak: 0,
        currentStreak: 0,
        unit: unit,
        label: label
      };
    }
    
    // Safely get current values with fallbacks
    const currentTotal = currentData.stats[media_type].total || 0;
    const currentSessions = currentData.stats[media_type].sessions || 0;
    
    // Calculate new values
    const newTotal = currentTotal + amount;
    const newSessions = currentSessions + 1;
    
    // Update the stats for this media type
    currentData.stats[media_type] = {
      ...currentData.stats[media_type],
      total: newTotal,
      sessions: newSessions,
      lastActivity: now,
      unit: unit,
      label: label
    };
    
    // Update profile info
    if (!currentData.profile) {
      currentData.profile = {};
    }
    
    const user = await interaction.client.users.fetch(userId);
    currentData.profile = {
      ...currentData.profile,
      id: userId,
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.displayAvatarURL({ size: 64 }),
      lastSeen: now
    };
    
    // Update summary
    if (!currentData.summary) {
      currentData.summary = {};
    }
    
    const totalSessions = Object.values(currentData.stats).reduce((sum, stat) => {
      return sum + (stat.sessions || 0);
    }, 0);
    
    currentData.summary = {
      ...currentData.summary,
      totalSessions: totalSessions,
      lastActivity: now,
      joinDate: currentData.summary?.joinDate || now,
      activeTypes: Object.keys(currentData.stats)
    };
    
    // Update timestamps
    currentData.timestamps = {
      updated: now,
      lastLog: now
    };
    
    // Write the updated data
    transaction.set(userStatsRef, currentData, { merge: true });
    
    // Store newTotal for display
    currentData._newTotal = newTotal;
  });
  
  return userStatsRef;
}

/**
 * Update user streak information
 * @param {string} userId - Discord user ID
 * @param {string} media_type - Media type
 * @param {Object} userStatsRef - Firestore user stats reference
 * @returns {Promise<Object>} - Streak information
 * @property {number} globalStreak - Global streak count
 * @property {number} mediaLongest - Longest streak for this media type
 * @property {number} updatedTotal - Updated total for this media type
 */
async function updateUserStreakInfo(userId, media_type, userStatsRef) {
  // Update streaks after successful database update
  await updateUserStreak(userId);
  const { streak: globalStreak } = await getUserStreak(userId);
  const { streak: mediaStreak, longest: mediaLongest } = await getUserStreakByMedia(userId, media_type);

  // Update streak info in database
  await userStatsRef.update({
    [`stats.${media_type}.currentStreak`]: mediaStreak || 0,
    [`stats.${media_type}.bestStreak`]: mediaLongest || 0
  });

  // Get the updated total for display
  const finalDoc = await userStatsRef.get();
  const finalData = finalDoc.data();
  const updatedTotal = finalData?.stats?.[media_type]?.total || amount;
  
  return { globalStreak, mediaLongest, updatedTotal };
}

/**
 * Create response embed for immersion logging
 * @param {Object} params - Parameters for creating embed
 * @param {string} params.label - Media type label
 * @param {string} params.media_type - Media type
 * @param {string} params.url - Media URL
 * @param {string} params.rawTitle - Raw title of the media
 * @param {number} params.amount - Amount of activity
 * @param {string} params.unit - Unit of measurement
 * @param {Object} params.vndbInfo - VNDB information
 * @param {Object} params.anilistInfo - AniList information
 * @param {string} params.mediaUrl - Media URL
 * @param {string} params.comment - Comment or notes
 * @param {number} params.globalStreak - Global streak count
 * @param {number} params.updatedTotal - Updated total for this media type
 * @param {Object} params.user - Discord user object
 * @param {string} params.imageUrl - Image URL
 * @returns {EmbedBuilder} - Discord embed
 */
function createResponseEmbed(params) {
  const { 
    label, 
    media_type, 
    url, 
    rawTitle, 
    amount, 
    unit, 
    vndbInfo, 
    anilistInfo, 
    mediaUrl, 
    comment, 
    globalStreak, 
    updatedTotal, 
    user, 
    imageUrl 
  } = params;
  
  let titleText = `${label} Logged`;
  let description = null;
  
  if (media_type === "listening" && url && rawTitle) {
    description = `[${rawTitle}](${normalizeYouTubeUrl(url)})`;
  } else if (media_type === "visual_novel" && vndbInfo && mediaUrl) {
    description = `[${rawTitle}](${mediaUrl})`;
    if (vndbInfo.developer) {
      description += `\n*by ${vndbInfo.developer}*`;
    }
  } else if (anilistInfo && mediaUrl) {
    description = `[${rawTitle}](${mediaUrl})`;
  } else if (rawTitle && rawTitle !== "-") {
    description = `**${rawTitle}**`;
  }
  
  const fields = [];
  
  fields.push(
    { name: `Progress`, value: `+${amount} ${unit}`, inline: true },
    { name: `Total`, value: `${updatedTotal.toLocaleString()} ${unit}`, inline: true },
    { name: `Streak`, value: `${globalStreak || 0} day${(globalStreak || 0) === 1 ? '' : 's'}`, inline: true }
  );

  // Add VN-specific info if available
  if (media_type === "visual_novel" && vndbInfo) {
    if (vndbInfo.length) {
      const lengthLabels = {
        1: "Very short (< 2 hours)",
        2: "Short (2-10 hours)",
        3: "Medium (10-30 hours)",
        4: "Long (30-50 hours)",
        5: "Very long (> 50 hours)"
      };
      fields.push({ 
        name: "Length", 
        value: lengthLabels[vndbInfo.length] || "Unknown", 
        inline: true 
      });
    }
    
    if (vndbInfo.released) {
      fields.push({ 
        name: "Released", 
        value: vndbInfo.released, 
        inline: true 
      });
    }
  }

  if (comment && comment !== "-") {
    fields.push({ name: "Comment", value: comment, inline: false });
  }

  const embed = new EmbedBuilder()
    .setColor(0x00d4aa)
    .setTitle(titleText)
    .setDescription(description)
    .addFields(...fields)
    .setTimestamp()
    .setFooter({ 
      text: `${user.username} • ${label}`, 
      iconURL: user.displayAvatarURL({ size: 32 }) 
    });

  if (imageUrl) {
    embed.setThumbnail(imageUrl);
  }
  
  return embed;
}

module.exports = {
  getMediaTypeConfig,
  getFormattedDate,
  processListeningActivity,
  processVNDBInfo,
  processAniListInfo,
  createLogData,
  updateUserStats,
  updateUserStreakInfo,
  createResponseEmbed
};