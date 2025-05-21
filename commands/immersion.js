const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../firebase/firestore");
const getAnimeCoverImage = require("../utils/getAnimeCoverImage");

// Fungsi untuk menghitung total immersion per jenis untuk user
async function getTotalByType(userId, mediaType) {
  const snapshot = await db.collection("immersion_logs")
    .where("userId", "==", userId)
    .where("media_type", "==", mediaType)
    .get();

  let total = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    total += data.amount || 0;
  });

  return total;
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
    await interaction.deferReply(); // ⏳ Kasih waktu bot untuk proses async

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
      visual_novel: "Visual Novel 📘",
      manga: "Manga 📖",
      anime: "Anime 📺",
      book: "Book 📚",
      reading_time: "Reading Time ⏱",
      listening_time: "Listening Time 🎧",
      reading: "Reading 📄",
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

      // Simpan ke Firestore
      await db.collection("immersion_logs").doc(user.id).collection("logs").add(data);


      // Ambil total setelah disimpan
      const updatedTotal = await getTotalByType(user.id, media_type);

      const embed = new EmbedBuilder()
        .setColor(0x00b0f4)
        .setTitle(`✅ Logged ${amount} ${unit} of ${label}`)
        .setDescription(`**Title:** ${title}\n**Comment:** ${comment}`)
        .addFields(
          { name: "Type", value: label, inline: true },
          { name: "Amount", value: `${amount} ${unit}`, inline: true },
          { name: `Total ${label}`, value: `${updatedTotal} ${unit}`, inline: true },
          { name: "Logged by", value: user.username, inline: true }
        )
        .setTimestamp();

      if (imageUrl) {
        embed.setImage(imageUrl);
      } else {
        console.log(`📭 Tidak ada gambar untuk judul: "${title}"`);
      }

      // Final reply
      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: "❌ Gagal mencatat immersion." });
    }
  }
};
