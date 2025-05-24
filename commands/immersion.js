const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { FieldValue } = require("firebase-admin").firestore;
const db = require("../firebase/firestore");
const getAnimeCoverImage = require("../utils/getAnimeCoverImage");

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
          { name: "Listening Time (in minutes)", value: "listening_time" },
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
        .setRequired(false))
    .addStringOption(option =>
      option
        .setName("comment")
        .setDescription("Komentar atau catatan tambahan")
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();

    const media_type = interaction.options.getString("media_type");
    const amount = interaction.options.getNumber("amount");
    const title = interaction.options.getString("title") || "-";
    const comment = interaction.options.getString("comment") || "-";
    const user = interaction.user;

    const unitMap = {
      visual_novel: "characters",
      manga: "pages",
      anime: "episodes",
      book: "pages",
      reading_time: "minutes",
      listening_time: "minutes",
      reading: "characters",
    };

    const labelMap = {
      visual_novel: "Visual Novel",
      manga: "Manga",
      anime: "Anime",
      book: "Book",
      reading_time: "Reading Time",
      listening_time: "Listening Time",
      reading: "Reading",
    };

    const unit = unitMap[media_type];
    const label = labelMap[media_type];

    try {
      const imageUrl = await getAnimeCoverImage(title);

      const data = {
        userId: user.id,
        username: user.username,
        media_type,
        amount,
        title,
        comment,
        timestamp: new Date(),
      };

      // Simpan ke subcollection khusus user
      await db.collection("immersion_logs").doc(user.id).collection("logs").add(data);

      // Update ke user_stats
      await db.collection("user_stats").doc(user.id).set({
        username: user.username,
        [media_type]: FieldValue.increment(amount)
      }, { merge: true });

      // Ambil total terbaru dari user_stats (bukan hitung ulang)
      const statsDoc = await db.collection("user_stats").doc(user.id).get();
      const currentTotal = statsDoc.exists && statsDoc.data()[media_type] || 0;

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("Immersion Log")
        .addFields(
          { name: "Type", value: label, inline: true },
          { name: "Title", value: title, inline: true },
          { name: "Comment", value: comment || "-", inline: false },
          { name: "Amount", value: `${amount} ${unit}`, inline: true },
          { name: "Total", value: `${currentTotal} ${unit}`, inline: true },
          { name: "Logged by", value: user.username, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Logged on: ${new Date().toLocaleDateString("id-ID", {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })}` });

      if (imageUrl) {
        embed.setThumbnail(imageUrl);
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: "❌ Gagal mencatat immersion." });
    }
  }
};
