const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "help",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Lihat daftar command yang tersedia beserta penjelasannya."),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x00d4aa)
      .setTitle("📘 Yuyuko Immersion Tracker Help")
      .setDescription("Berikut adalah daftar command yang bisa kamu gunakan untuk mencatat dan melihat progres immersion kamu:")
      .addFields(
        {
          name: "`/immersion`",
          value:
            "Catat aktivitas immersion kamu untuk media seperti Anime, Manga, Visual Novel, Buku, Listening (via YouTube), dll.\n" +
            "- Bisa tambahkan `title`, `comment`, dan khusus untuk listening setelah enter akan diarahkan untuk input link youtube.\n" +
            "- Otomatis mencari gambar dan judul media dari AniList atau YouTube jika tersedia.",
        },
        {
          name: "`/stat`",
          value:
            "Lihat statistik immersion kamu.\n" +
            "- Bisa langsung tekan `Enter` tanpa memilih opsi apa pun untuk melihat statistik umum.\n" +
            "- Gunakan `visual_type:barchart` dan bisa pilih `days:7` atau `30` untuk melihat grafik batang.\n" +
            "- Gunakan `visual_type:heatmap` dan pilih `year:2025` (opsional) untuk melihat heatmap tahunan.\n" +
            "Contoh:\n" +
            "• `/stat`\n" +
            "• `/stat visual_type:barchart days:7`\n" +
            "• `/stat visual_type:heatmap year:2025`",
        },
        {
          name: "`/help`",
          value: "Menampilkan pesan bantuan ini.",
        }
      )
      .setFooter({
        text: "Yuyuko Immersion Bot • Stay consistent, stay immersed!",
        iconURL: interaction.client.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
