/**
 * Novel search and download command
 * Allows users to search for and download light novels
 * @module commands/downNovel
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");
const path = require("path");

const novelDataPath = path.join(__dirname, "../utils/novelList.json");
const novels = JSON.parse(fs.readFileSync(novelDataPath, "utf8"));

module.exports = {
  data: new SlashCommandBuilder()
    .setName("novel")
    .setDescription("Search and download light novels by title")
    .addStringOption(option =>
      option
        .setName("title")
        .setDescription("Enter light novel title (in kanji/kana/romaji)")
        .setRequired(true)
    ),

  /**
   * Execute the novel search command
   * @param {Object} interaction - Discord interaction object
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    const query = interaction.options.getString("title").toLowerCase();
    await interaction.deferReply();

    const results = novels.filter(novel =>
      novel.title.toLowerCase().includes(query)
    );

    if (results.length === 0) {
      return await interaction.editReply("No novels found with that title.");
    }

    const PAGE_SIZE = 10;
    let page = 0;

    /**
     * Generate embed for current page of results
     * @param {number} page - Page number
     * @returns {EmbedBuilder} Discord embed
     */
    const generateEmbed = (page) => {
      const start = page * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      const currentResults = results.slice(start, end);
      return new EmbedBuilder()
        .setColor(0x00ADEF)
        .setTitle("Light Novel Search Results")
        .setDescription(currentResults.map((novel, i) =>
          `**${start + i + 1}.** [${novel.title}](${novel.url})
Size: ${novel.size} • Format: ${novel.format}`
        ).join("\n\n"))
        .setFooter({ text: `Showing ${start + 1}-${Math.min(end, results.length)} of ${results.length}` })
        .setTimestamp();
    };

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("⬅️ Prev")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next ➡️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(results.length <= PAGE_SIZE)
      );

    const message = await interaction.editReply({
      embeds: [generateEmbed(page)],
      components: [row],
      fetchReply: true
    });

    const collector = message.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 60_000
    });

    collector.on("collect", async i => {
      if (i.customId === "prev") page--;
      else if (i.customId === "next") page++;

      const isFirstPage = page === 0;
      const isLastPage = (page + 1) * pageSize >= results.length;

      const updatedRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("⬅️ Prev")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(isFirstPage),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("Next ➡️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(isLastPage)
        );

      await i.update({
        embeds: [generateEmbed(page)],
        components: [updatedRow]
      });
    });

    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder().setCustomId("prev").setLabel("⬅Prev").setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId("next").setLabel("Next").setStyle(ButtonStyle.Primary).setDisabled(true)
        );
      await message.edit({ components: [disabledRow] });
    });
  }
};