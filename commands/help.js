const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Lihat panduan penggunaan bot immersion tracker"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x00bfff)
      .setTitle("📘 Panduan Penggunaan Yuyuko Bot")
      .setDescription("Berikut beberapa command dan fungsinya:")
      .addFields(
        {
          name: "/immersion",
          value: "Catat aktivitas immersion kamu seperti nonton anime, baca manga, VN, buku, dll.",
        },
        {
          name: "/stat",
          value: "Lihat statistik immersion kamu dalam bentuk teks atau grafik bar/heatmap.",
        },
        {
          name: "/log",
          value: "Lihat dan kelola log aktivitas immersion kamu dalam 24 jam atau 7 hari terakhir. Bisa filter berdasarkan media dan hapus log langsung via tombol.",
        },
        {
          name: "/subs",
          value: "Cari dan download subtitle anime dari **Jimaku.cc** berdasarkan judul dan episode. Subtitle dikirim ke DM kamu jika tersedia.",
        },
        {
          name: "Tips",
          value:
            "- Gunakan autocomplete untuk memilih judul anime/manga/VN.\n" +
            "- Kamu bisa **hapus log** dengan klik tombol `Delete xx` di /log.\n" +
            "- Jika subtitle Jimaku tidak bisa dikirim via DM, pastikan kamu mengaktifkan DM jangan private.",
        }
      )
      .setFooter({
        text: "Yuyuko • Immersion Tracker",
        iconURL: interaction.client.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
