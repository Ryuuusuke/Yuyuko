/**
 * Immersion log viewing and management command
 * Allows users to view and manage their immersion logs with interactive pagination
 * @module commands/log
 */

const { SlashCommandBuilder } = require("discord.js");
const {
  handleMediaTypeSelection,
  handleBackToSelection,
  handleDeleteButtons,
  handlePagination
} = require("../services/logService");
const {
  asyncHandler
} = require("../utils/errorHandler");
const {
  createMediaTypeSelectionEmbed,
  createMediaTypeButtons,
  resetActivityTimer,
  activeMessages,
} = require("../utils/logUtils");

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
        .addChoices({
          name: "Last 24 Hours",
          value: "24h"
        }, {
          name: "Last 7 Days",
          value: "7d"
        })
      )
    ),

  execute: asyncHandler(async (interaction) => {
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.user;

    if (subcommand === 'time') {
      await interaction.deferReply({
        ephemeral: true
      });

      const timeframe = interaction.options.getString("timeframe");

      // Show media type selection first
      const embed = createMediaTypeSelectionEmbed(timeframe, user);
      const components = createMediaTypeButtons(timeframe);

      await interaction.editReply({
        embeds: [embed],
        components: components
      });

      // Store message data for tracking
      const messageId = interaction.id;
      activeMessages.set(messageId, {
        originalInteraction: interaction, // Save original interaction
        userId: user.id,
        timeframe: timeframe,
        type: 'selection',
        timer: null // For activity timer
      });

      // Schedule cleanup with activity timer
      resetActivityTimer(messageId);
    }
  }),

  // Handle button interactions
  handleButton: asyncHandler(async (interaction) => {
    const customId = interaction.customId;

    if (customId.startsWith('media_')) {
      return await handleMediaTypeSelection(interaction, activeMessages, resetActivityTimer);
    }

    if (customId.startsWith('back_to_selection_')) {
      return await handleBackToSelection(
        interaction,
        activeMessages,
        resetActivityTimer,
        createMediaTypeSelectionEmbed,
        createMediaTypeButtons
      );
    }

    if (customId.startsWith('delete_')) {
      return await handleDeleteButtons(interaction, activeMessages);
    }

    if (customId.startsWith('log_prev_') || customId.startsWith('log_next_')) {
      return await handlePagination(interaction, activeMessages, resetActivityTimer);
    }
  })
};