const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../firebase/firestore");

module.exports = {
  name: "stat",
  data: new SlashCommandBuilder()
    .setName("stat")
    .setDescription("Lihat total immersion kamu dalam semua jenis media"),

  async execute(interaction) {
    await interaction.deferReply();

    const user = interaction.user;

    const mediaTypes = {
      visual_novel: "Visual Novel 📘",
      manga: "Manga 📖",
      anime: "Anime 📺",
      book: "Book 📚",
      reading_time: "Reading Time ⏱",
      listening_time: "Listening Time 🎧",
      reading: "Reading 📄",
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

    try {
      const snapshot = await db
        .collection("immersion_logs")
        .doc(user.id)
        .collection("logs")
        .get();


      if (snapshot.empty) {
        return await interaction.editReply("🚫 Kamu belum mencatat aktivitas immersion apa pun.");
      }

      const totals = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        if (!totals[data.media_type]) totals[data.media_type] = 0;
        totals[data.media_type] += data.amount || 0;
      });

      const embed = new EmbedBuilder()
        .setColor(0x34d399)
        .setTitle(`📊 Statistik Immersion ${user.username}`)
        .setTimestamp();

      for (const type in mediaTypes) {
        if (totals[type]) {
          embed.addFields({
            name: mediaTypes[type],
            value: `${totals[type]} ${unitMap[type]}`,
            inline: true,
          });
        }
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ Gagal mengambil data statistik.");
    }
  }
};
