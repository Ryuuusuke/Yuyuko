const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");
const path = require("path");

const novelDataPath = path.join(__dirname, "../utils/novelList.json");
const novels = JSON.parse(fs.readFileSync(novelDataPath, "utf8"));

module.exports = {
  data: new SlashCommandBuilder()
    .setName("novel")
    .setDescription("Cari dan unduh light novel berdasarkan judul.")
    .addStringOption(option =>
      option
        .setName("title")
        .setDescription("Masukkan judul light novel (dalam kanji/kana/romaji)")
        .setRequired(true)
    ),

  async execute(interaction) {
    const query = interaction.options.getString("title").toLowerCase();
    await interaction.deferReply();

    const results = novels.filter(novel =>
      novel.title.toLowerCase().includes(query)
    );

    if (results.length === 0) {
      return await interaction.editReply("Tidak ditemukan novel dengan judul tersebut.");
    }

    const pageSize = 10;
    let page = 0;

    const generateEmbed = (page) => {
      const start = page * pageSize;
      const end = start + pageSize;
      const currentResults = results.slice(start, end);
      return new EmbedBuilder()
        .setColor(0x00ADEF)
        .setTitle("Hasil Pencarian Light Novel")
        .setDescription(currentResults.map((novel, i) =>
          `**${start + i + 1}.** [${novel.title}](${novel.url})\nSize: ${novel.size} • Format: ${novel.format}`
        ).join("\n\n"))
        .setFooter({ text: `Menampilkan ${start + 1}-${Math.min(end, results.length)} dari ${results.length}` })
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
          .setDisabled(results.length <= pageSize)
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
