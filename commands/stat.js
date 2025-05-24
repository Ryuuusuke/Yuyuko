const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../firebase/firestore");

module.exports = {
  name: "stat",
  data: new SlashCommandBuilder()
    .setName("stat")
    .setDescription("Lihat total immersion kamu dari semua jenis media"),

  async execute(interaction) {
    await interaction.deferReply(); // kasih waktu bot proses

    const user = interaction.user;

    // Ambil data dari user_stats
    const statDoc = await db.collection("user_stats").doc(user.id).get();

    if (!statDoc.exists) {
      return await interaction.editReply("🚫 Belum ada data immersion kamu.");
    }

    const stats = statDoc.data();

    const labelMap = {
      visual_novel: "Visual Novel",
      manga: "Manga",
      anime: "Anime",
      book: "Book",
      reading_time: "Reading Time",
      listening_time: "Listening Time",
      reading: "Reading",
    };

    const unitMap = {
      visual_novel: "characters",
      manga: "pages",
      anime: "episodes",
      book: "pages",
      reading_time: "minutes",
      listening_time: "minutes",
      reading: "characters",
    };

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`Immersion Stats – ${stats.username || user.username}`)
      .setTimestamp();

    let hasData = false;

    for (const type in labelMap) {
      if (stats[type]) {
        hasData = true;
        embed.addFields({
          name: labelMap[type],
          value: `${stats[type]} ${unitMap[type]}`,
          inline: true,
        });
      }
    }

    if (!hasData) {
      embed.setDescription("Belum ada aktivitas yang tercatat.");
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
