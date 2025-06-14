const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../firebase/firestore");
const getCoverImageByType = require("../utils/getCoverImage");
const { updateUserStreak } = require("../utils/streak"); 
const { getUserStreakByMedia, getUserStreak } = require("../utils/streak"); 
const { getMediaInfo, searchAniList, getAniListInfoById } = require("../utils/anilistAPI"); // Updated import
const { getVNInfo, getVNInfoById, searchVNs } = require("../utils/vndbAPI");
const youtubedl = require("youtube-dl-exec");

// Function to normalize YouTube URL
function normalizeYouTubeUrl(inputUrl) {
  if (!inputUrl) return null;
  
  let normalizedUrl = inputUrl.trim();
  
  // If already has protocol, return as is
  if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
    return normalizedUrl;
  }
  
  // If starts with www., add https://
  if (normalizedUrl.startsWith('www.')) {
    return `https://${normalizedUrl}`;
  }
  
  // If starts with youtube.com, youtu.be, or m.youtube.com, add https://
  if (normalizedUrl.startsWith('youtube.com') || 
      normalizedUrl.startsWith('youtu.be') || 
      normalizedUrl.startsWith('m.youtube.com')) {
    return `https://${normalizedUrl}`;
  }
  
  // If it's just a video ID or unknown format, assume it's youtube.com
  return `https://youtube.com/watch?v=${normalizedUrl}`;
}

module.exports = {
  name: "immersion",
  data: new SlashCommandBuilder()
    .setName("immersion")
    .setDescription("Catat aktivitas immersion bahasa Jepang kamu")
    .addStringOption(option =>
      option
        .setName("media_type")
        .setDescription("Pilih jenis immersion yang ingin dicatat.")
        .setRequired(true)
        .addChoices(
          { name: "Visual Novel (in characters read)", value: "visual_novel" },
          { name: "Manga (in pages read)", value: "manga" },
          { name: "Anime (in episodes watched)", value: "anime" },
          { name: "Book (in pages read)", value: "book" },
          { name: "Reading Time (in minutes)", value: "reading_time" },
          { name: "Listening (in minutes)", value: "listening" },
          { name: "Reading (in characters read)", value: "reading" },
        )
    )
    .addNumberOption(option =>
      option
        .setName("amount")
        .setDescription("Jumlah aktivitas (misalnya: episode, halaman, menit, karakter, dll)")
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName("title")
        .setDescription("Judul media yang kamu konsumsi")
        .setRequired(false)
        .setAutocomplete(true)) // Enable autocomplete
    .addStringOption(option =>
      option
        .setName("comment")
        .setDescription("Komentar atau catatan tambahan")
        .setRequired(false)),

  async execute(interaction) {
    // Handle autocomplete
    if (interaction.isAutocomplete()) {
      return await this.autocomplete(interaction);
    }

    await interaction.deferReply();

    const media_type = interaction.options.getString("media_type");
    let amount = interaction.options.getNumber("amount");
    let title = interaction.options.getString("title") || "-";
    const comment = interaction.options.getString("comment") || "-";
    const user = interaction.user;
    let thumbnail = null;
    let rawTitle = title;
    let mediaUrl = null;
    let anilistInfo = null;
    let vndbInfo = null;
    let url = null;

    // Jika media_type adalah listening, minta URL secara terpisah
    if (media_type === "listening") {
      // Create follow-up message asking for URL
      const urlEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("📺 Listening Activity")
        .setDescription("Silakan reply dengan **URL YouTube** untuk media listening Anda, atau ketik **skip** untuk melewati:")
        .addFields(
          { name: "Format yang diterima:", value: "• `https://youtube.com/watch?v=...`\n • `https://youtu.be/...`\n• `video_id`\n• atau ketik `skip`", inline: false }
        )
        .setFooter({ text: "Timeout dalam 60 detik" });

      await interaction.editReply({ embeds: [urlEmbed] });

      // Wait for user response
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
            const normalizedUrl = normalizeYouTubeUrl(url);
            
            const info = await youtubedl(normalizedUrl, {
              dumpSingleJson: true,
              noWarnings: true,
              noCallHome: true,
              preferFreeFormats: true
            });

            if (info?.title) {
              rawTitle = info.title;
            }

            if (info?.duration) {
              amount = Math.ceil(info.duration / 60); // durasi dalam menit
            }

            if (info?.thumbnail) {
              thumbnail = info.thumbnail;
            }
            
            // Delete user's response message
            try {
              await response.delete();
            } catch (err) {
              // Ignore delete errors (missing permissions, etc.)
            }
            
          } catch (err) {
            console.error("❌ Gagal mengambil info dari YouTube:", err);
            await interaction.followUp({
              content: "❌ Gagal mengambil data video dari YouTube. Melanjutkan tanpa info video...",
              ephemeral: true
            });
            url = null;
          }
        } else {
          // Delete user's skip response
          try {
            await response.delete();
          } catch (err) {
            // Ignore delete errors
          }
        }
        
      } catch (err) {
        // Timeout or other error
        await interaction.followUp({
          content: "⏰ Timeout! Melanjutkan tanpa URL YouTube...",
          ephemeral: true
        });
      }
    }

    // Get VNDB info for visual novels
    if (title && title !== "-" && media_type === "visual_novel") {
      try {
        // Check if title contains our separator (from autocomplete selection)
        if (title.includes('|')) {
          const [vnTitle, vnId] = title.split('|');
          rawTitle = vnTitle;
          vndbInfo = await getVNInfoById(vnId);
        } else {
          // Fallback to search by title
          vndbInfo = await getVNInfo(title);
        }
        
        if (vndbInfo) {
          rawTitle = vndbInfo.title;
          mediaUrl = vndbInfo.url;
          if (vndbInfo.image && !thumbnail) {
            thumbnail = vndbInfo.image;
          }
        }
      } catch (err) {
        console.error("⚠️ Gagal mengambil info dari VNDB:", err);
        // Continue with original title if VNDB fails
      }
    }

    // Get AniList info for anime and manga (updated logic)
    if (title && title !== "-" && ['anime', 'manga'].includes(media_type)) {
      try {
        // Check if title contains our separator (from autocomplete selection)
        if (title.includes('|')) {
          const [aniTitle, aniId] = title.split('|');
          rawTitle = aniTitle;
          const anilistType = media_type === 'anime' ? 'ANIME' : 'MANGA';
          anilistInfo = await getAniListInfoById(aniId, anilistType);
        } else {
          // Fallback to search by title
          anilistInfo = await getMediaInfo(title, media_type);
        }
        
        if (anilistInfo) {
          rawTitle = anilistInfo.title;
          mediaUrl = anilistInfo.url;
          if (anilistInfo.image && !thumbnail) {
            thumbnail = anilistInfo.image;
          }
        }
      } catch (err) {
        console.error("⚠️ Gagal mengambil info dari AniList:", err);
        // Continue with original title if AniList fails
      }
    }

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

    const unit = unitMap[media_type];
    const label = labelMap[media_type];
    // Ambil waktu lokal dengan offset timezone
    const now = new Date();
    const localDate = new Date(
      now.getFullYear(), now.getMonth(), now.getDate()
    );
    
    const dateStr = [
      localDate.getFullYear(),
      String(localDate.getMonth() + 1).padStart(2, '0'),
      String(localDate.getDate()).padStart(2, '0')
    ].join('-'); // hasilnya: "2025-06-15"

    
    try {
      // Get image URL with priority: YouTube thumbnail > VNDB image > AniList image > fallback
      let imageUrl = null;
      if (media_type === "listening" && thumbnail) {
        imageUrl = thumbnail;
      } else if (media_type === "visual_novel" && vndbInfo?.image) {
        imageUrl = vndbInfo.image;
      } else if (thumbnail) {
        imageUrl = thumbnail;
      } else {
        imageUrl = await getCoverImageByType(media_type, rawTitle);
      }  
      // Create immersion log entry with better structure
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
          month: dateStr.slice(0, 7), // YYYY-MM
          year: localDate.getFullYear()
        }
      };

      // Add log to user's collection
      await db.collection("users").doc(user.id).collection("immersion_logs").add(logData);

      // Update user stats with better organization
      const userStatsRef = db.collection("users").doc(user.id);
      const userStatsDoc = await userStatsRef.get();
      
      let currentStats = {};
      if (userStatsDoc.exists) {
        currentStats = userStatsDoc.data().stats || {};
      }
      
      // Pastikan stats diinisialisasi dulu
      if (!currentStats[media_type]) {
        currentStats[media_type] = {
          total: 0,
          sessions: 0,
          lastActivity: null,
          bestStreak: 0,
          currentStreak: 0,
          unit: unit,
          label: label
        };
      }

      // Update nilai-nilai utama
      const newTotal = currentStats[media_type].total + amount;
      const newSessions = currentStats[media_type].sessions + 1;

      // Hitung streak terbaru dari semua aktivitas user
      await updateUserStreak(user.id); 
      // Global streak
      const { streak: globalStreak, longest: globalLongest } = await getUserStreak(user.id);
      // Per-media streak
      const { streak: mediaStreak, longest: mediaLongest } = await getUserStreakByMedia(user.id, media_type);
          
      // Assign dengan aman
      const safeStreak = typeof mediaStreak === 'number' ? mediaStreak : 0;
      const safeBest = typeof mediaLongest === 'number' ? mediaLongest : 0;
        
      // Masukkan kembali nilai yang diperbarui ke stats media ini
      currentStats[media_type] = {
        ...currentStats[media_type],
        total: newTotal,
        sessions: newSessions,
        lastActivity: new Date(),
        unit: unit,
        label: label,
        currentStreak: mediaStreak || 0,
        bestStreak: mediaLongest || 0
      };

      // Update user document with comprehensive data
      await userStatsRef.set({
        profile: {
          id: user.id,
          username: user.username,
          displayName: user.displayName || user.username,
          avatar: user.displayAvatarURL({ size: 64 }),
          lastSeen: new Date()
        },
        stats: currentStats,
        summary: {
          totalSessions: Object.values(currentStats).reduce((sum, stat) => sum + stat.sessions, 0),
          lastActivity: new Date(),
          joinDate: userStatsDoc.exists ? userStatsDoc.data().summary?.joinDate : new Date(),
          activeTypes: Object.keys(currentStats)
        },
        timestamps: {
          updated: new Date(),
          lastLog: new Date()
        }
      }, { merge: true });

      // Use the updated total for display
      const updatedTotal = newTotal;

      // Prepare title/description based on media type and available data
      let titleText = `${label} Logged`;
      let description = null;
      
      if (media_type === "listening" && url && rawTitle) {
        // For listening with YouTube URL
        description = `[${rawTitle}](${normalizeYouTubeUrl(url)})`;
      } else if (media_type === "visual_novel" && vndbInfo && mediaUrl) {
        // For visual novel with VNDB info
        description = `[${rawTitle}](${mediaUrl})`;
        if (vndbInfo.developer) {
          description += `\n*by ${vndbInfo.developer}*`;
        }
      } else if (anilistInfo && mediaUrl) {
        // For anime/manga with AniList info
        description = `[${rawTitle}](${mediaUrl})`;
      } else if (rawTitle && rawTitle !== "-") {
        // For other media types with title
        description = `**${rawTitle}**`;
      }
      // Create compact fields
      const fields = [];
      
      // Main stats in one row
      fields.push(
        { name: `Progress`, value: `+${amount} ${unit}`, inline: true },
        { name: `Total`, value: `${updatedTotal.toLocaleString()} ${unit}`, inline: true },
        { name: `Streak`, value: `${globalStreak} day${globalStreak === 1 ? '' : 's'}`, inline: true }
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

      // Add comment only if it's not empty or default
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

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: "❌ Gagal mencatat immersion." });
    }
  },


// Updated autocomplete handler with proper length validation
async autocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);
  const mediaType = interaction.options.getString("media_type");
  
  // Only provide autocomplete for title field
  if (focusedOption.name === 'title') {
    const searchTerm = focusedOption.value;
    
    if (!searchTerm || searchTerm.length < 2) {
      return await interaction.respond([]);
    }

    try {
      let results = [];

      if (mediaType === 'visual_novel') {
        // Use VNDB for visual novels
        results = await searchVNs(searchTerm, 25);
      } else if (mediaType === 'anime') {
        // Use AniList for anime
        results = await searchAniList(searchTerm, 'ANIME', 25);
      } else if (mediaType === 'manga') {
        // Use AniList for manga
        results = await searchAniList(searchTerm, 'MANGA', 25);
      }

      // Filter and truncate results to meet Discord's limits
      const validResults = results
        .map(item => {
          // Truncate name to max 100 chars (Discord's display limit)
          let truncatedName = item.name;
          if (truncatedName.length > 97) { // Leave room for "..."
            truncatedName = truncatedName.substring(0, 97) + "...";
          }
          
          // Truncate value to max 100 chars (Discord's value limit)
          let truncatedValue = item.value;
          if (truncatedValue.length > 100) {
            // If the value contains '|', try to preserve the ID part
            if (truncatedValue.includes('|')) {
              const [title, id] = truncatedValue.split('|');
              // Calculate max title length (100 - 1 for '|' - id.length)
              const maxTitleLength = 100 - 1 - id.length;
              if (maxTitleLength > 10) { // Ensure we have reasonable space for title
                truncatedValue = title.substring(0, maxTitleLength) + '|' + id;
              } else {
                // If ID is too long, just use first 100 chars
                truncatedValue = truncatedValue.substring(0, 100);
              }
            } else {
              truncatedValue = truncatedValue.substring(0, 100);
            }
          }
          
          return {
            name: truncatedName,
            value: truncatedValue
          };
        })
        .filter(item => {
          // Double-check that both name and value are within limits
          return item.name.length <= 100 && item.value.length <= 100;
        })
        .slice(0, 25); // Discord max is 25 choices

      await interaction.respond(validResults);
    } catch (error) {
      console.error('Autocomplete error:', error);
      await interaction.respond([]);
    }
  } else {
    // For other fields, return empty array
    await interaction.respond([]);
  }
}
};