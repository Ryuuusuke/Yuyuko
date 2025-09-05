/**
 * Immersion logging command
 * Allows users to log their Japanese immersion activities
 * @module commands/immersion
 */

const { SlashCommandBuilder } = require("discord.js");
const db = require("../firebase/firestore");
const {
  getMediaTypeConfig,
  getFormattedDate,
  processListeningActivity,
  processVNDBInfo,
  processAniListInfo,
  createLogData,
  updateUserStats,
  updateUserStreakInfo,
  createResponseEmbed
} = require("../services/immersionService");
const { asyncHandler } = require("../utils/errorHandler");

module.exports = {
  name: "immersion",
  data: new SlashCommandBuilder()
    .setName("immersion")
    .setDescription("Log your Japanese immersion activity")
    .addStringOption(option =>
      option
        .setName("media_type")
        .setDescription("Select the type of immersion to log.")
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
        .setDescription("Amount of activity (e.g.: episodes, pages, minutes, characters, etc.)")
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName("title")
        .setDescription("Title of the media you consumed")
        .setRequired(false)
        .setAutocomplete(true))
    .addStringOption(option =>
      option
        .setName("comment")
        .setDescription("Additional comments or notes")
        .setRequired(false)),

  execute: asyncHandler(async (interaction) => {
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
    
    // Process listening activity
    let listeningData = { url: null, rawTitle: title, amount, thumbnail: null };
    if (media_type === "listening") {
      listeningData = await processListeningActivity(interaction, user);
    }
    
    const { url, rawTitle, thumbnail } = listeningData;
    
    // Process VNDB info
    const { rawTitle: vnRawTitle, vndbInfo, mediaUrl: vnMediaUrl, thumbnail: vnThumbnail } =
      await processVNDBInfo(title, media_type);
    
    // Process AniList info
    const { rawTitle: aniRawTitle, anilistInfo, mediaUrl: aniMediaUrl, thumbnail: aniThumbnail } =
      await processAniListInfo(title, media_type);
    
    // Use the processed titles
    const finalRawTitle = vnRawTitle || aniRawTitle || rawTitle;
    const finalMediaUrl = vnMediaUrl || aniMediaUrl;
    const finalThumbnail = vnThumbnail || aniThumbnail || thumbnail;
    
    // Get media type configuration
    const { unitMap, labelMap } = getMediaTypeConfig();
    const unit = unitMap[media_type];
    const label = labelMap[media_type];
    
    // Get formatted date
    const { dateStr, localDate, now } = getFormattedDate();

    // Create log data
    const { logData, imageUrl } = createLogData({
      user,
      media_type,
      label,
      amount: listeningData.amount,
      unit,
      rawTitle: finalRawTitle,
      comment,
      url,
      anilistInfo,
      vndbInfo,
      mediaUrl: finalMediaUrl,
      thumbnail: finalThumbnail,
      now,
      dateStr,
      localDate
    });

    // Add log to user's collection
    await db.collection("users").doc(user.id).collection("immersion_logs").add(logData);

    // Update user stats
    const userStatsRef = await updateUserStats(user.id, media_type, unit, label, listeningData.amount, now);

    // Update user streak info
    const { globalStreak, mediaLongest, updatedTotal } = await updateUserStreakInfo(user.id, media_type, userStatsRef);

    // Create response embed
    const embed = createResponseEmbed({
      label,
      media_type,
      url,
      rawTitle: finalRawTitle,
      amount: listeningData.amount,
      unit,
      vndbInfo,
      anilistInfo,
      mediaUrl: finalMediaUrl,
      comment,
      globalStreak,
      updatedTotal,
      user,
      imageUrl
    });

    await interaction.editReply({ embeds: [embed] });
  }),

  autocomplete: asyncHandler(async (interaction) => {
    const focusedOption = interaction.options.getFocused(true);
    const mediaType = interaction.options.getString("media_type");
    
    if (focusedOption.name === 'title') {
      const searchTerm = focusedOption.value;
      
      if (!searchTerm || searchTerm.length < 2) {
        return await interaction.respond([]);
      }

      let results = [];

      if (mediaType === 'visual_novel') {
        results = await searchVNs(searchTerm, 25);
      } else if (mediaType === 'anime') {
        results = await searchAniList(searchTerm, 'ANIME', 25);
      } else if (mediaType === 'manga') {
        results = await searchAniList(searchTerm, 'MANGA', 25);
      }

      const validResults = results
        .map(item => {
          let truncatedName = item.name;
          if (truncatedName.length > 97) {
            truncatedName = truncatedName.substring(0, 97) + "...";
          }
          
          let truncatedValue = item.value;
          if (truncatedValue.length > 100) {
            if (truncatedValue.includes('|')) {
              const [title, id] = truncatedValue.split('|');
              const maxTitleLength = 100 - 1 - id.length;
              if (maxTitleLength > 10) {
                truncatedValue = title.substring(0, maxTitleLength) + '|' + id;
              } else {
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
          return item.name.length <= 100 && item.value.length <= 100;
        })
        .slice(0, 25);

      await interaction.respond(validResults);
    } else {
      await interaction.respond([]);
    }
  })
};