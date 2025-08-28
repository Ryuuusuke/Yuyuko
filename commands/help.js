const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Lihat panduan penggunaan bot immersion tracker")
    .addStringOption(option =>
      option.setName("language")
        .setDescription("Pilih bahasa panduan (id/en)")
        .addChoices(
          { name: "Indonesia", value: "id" },
          { name: "English", value: "en" }
        )
        .setRequired(false)),

  async execute(interaction) {
    const language = interaction.options.getString("language") || "id";

    let embed;

    if (language === "en") {
      embed = new EmbedBuilder()
        .setColor(0x00bfff)
        .setTitle("Yuyuko Bot Usage Guide")
        .setDescription("Here are some commands and their functions:")
        .addFields(
          {
            name: "/immersion `[media] [amount] [title (optional)] [comment (optional)] [date (optional)]`",
            value:
              "Log your Japanese immersion activity with automatic support for YouTube, AniList, and VNDB data.\n" +
              "- `media`: Type of media like `anime`, `manga`, `visual_novel`, `book`, `reading`, `listening`, or `reading_time`.\n" +
              "- `amount`: The amount of immersion (in minutes/pages/episodes/characters).\n" +
              "- `title` (optional): Title of the media (with autocomplete and metadata fetching).\n" +
              "- `comment` (optional): Any notes or thoughts.\n" +
              "- `date` (optional): Date in YYYY-MM-DD format (e.g., 2024-01-15) to log for a past date.\n" +
              "For listening via YouTube, the bot auto-fetches title, duration, and thumbnail.",
          },
          {
            name: "/stat `[visual_type (optional)] [days (optional)] [year (optional)]`",
            value:
              "View your overall immersion statistics with various display options:\n" +
              "- `visual_type` (optional): Choose between `barchart` or `heatmap`.\n" +
              "- `days` (optional): Time range for bar chart, e.g., `7` or `30` days.\n" +
              "- `year` (optional): Year for heatmap (default: current year).\n" +
              "Shows points, sessions, streaks across all media types.",
          },
          {
            name: "/log time `[timeframe]`",
            value:
              "View and manage your immersion activity logs interactively.\n" +
              "- `timeframe`: Choose `24h` (last 24 hours) or `7d` (last 7 days).\n" +
              "You can select media type and use **Delete** buttons to manage your logs.",
          },
          {
            name: "/leaderboard `[timestamp] [media_type] [month (optional)] [year (optional)]`",
            value:
              "View the immersion leaderboard based on total points.\n" +
              "- `timestamp`: Time range (`weekly`, `monthly`, `yearly`, `all_time`).\n" +
              "- `media_type`: Filter by specific media (`anime`, `manga`, `book`, etc., or `all`).\n" +
              "- `month` & `year` (optional): To view specific monthly/yearly ranks.\n" +
              "Rankings are calculated in real-time from all user logs.",
          },
          {
            name: "/novel `[title]`",
            value:
              "Search and download light novels by title.\n" +
              "- `title`: The title of the light novel to search for (Japanese characters only).\n" +
              "Results are shown in pages with **Next/Prev** buttons for navigation.",
          },
          {
            name: "/subs `[name] [episode (optional)]`",
            value:
              "Search and download anime subtitles from **Jimaku** directly via bot.\n" +
              "- `name`: Anime name (with autocomplete).\n" +
              "- `episode` (optional): Specific episode number (e.g., `1`, `12`).\n" +
              "Subtitles will be sent to your DM (unless blocked).",
          },
          {
            name: "/react `[message]`",
            value:
              "React to a specific message with animated emojis using interactive buttons.\n" +
              "- `message`: Message ID or message link.\n" +
              "You'll be shown a list of available animated emojis to choose from.",
          },
          {
            name: "/help `[language (optional)]`",
            value: "View this bot's usage guide.\n" +
                   "- `language` (optional): Choose guide language (`id`/`en`). Default: `id`.",
          },
          {
            name: "@Bot (Direct Interaction)",
            value:
              "Mention the bot in any message to chat directly (e.g., `@Yuyuko Bot what should I do today?`).\n" +
              "Features:\n" +
              "- Answer general questions (weather, advice, etc.)\n" +
              "- Generate or analyze **images** (including avatar)\n" +
              "- Talk naturally, remember you, and understand your context\n" +
              "- **Remembers** your past interactions",
          },
          {
            name: "Tips",
            value:
              "- Use autocomplete to select anime/manga/VN titles.\n" +
              "- You can **delete logs** by clicking the `Delete xx` button in `/log`.\n" +
              "- If Jimaku subtitles cannot be sent via DM, make sure your DM privacy settings allow the bot to send messages.",
          }
        )
        .setFooter({
          text: "Yuyuko • Immersion Tracker",
          iconURL: interaction.client.user.displayAvatarURL({ size: 32 }),
        })
        .setTimestamp();

    } else {
      embed = new EmbedBuilder()
        .setColor(0x00bfff)
        .setTitle("Panduan Penggunaan Yuyuko Bot")
        .setDescription("Berikut beberapa command dan fungsinya:")
        .addFields(
          {
            name: "/immersion `[media] [amount] [title (opsional)] [comment (opsional)] [date (opsional)]`",
            value:
              "Catat aktivitas immersion bahasa Jepang kamu secara otomatis, termasuk pengambilan info dari YouTube, AniList, dan VNDB.\n" +
              "- `media`: Jenis media seperti `anime`, `manga`, `visual_novel`, `book`, `reading`, `listening`, `reading_time`.\n" +
              "- `amount`: Jumlah aktivitas (menit/halaman/episode/karakter).\n" +
              "- `title` (opsional): Judul media (mendukung autocomplete dan info otomatis).\n" +
              "- `comment` (opsional): Catatan atau komentar tambahan.\n" +
              "- `date` (opsional): Tanggal dalam format YYYY-MM-DD (contoh: 2024-01-15) untuk mencatat aktivitas di tanggal lalu.\n" +
              "Untuk listening via YouTube, bot akan otomatis mengambil judul, durasi, dan thumbnail.",
          },
          {
            name: "/stat `[visual_type (opsional)] [days (opsional)] [year (opsional)]`",
            value:
              "Lihat statistik immersion kamu secara total, dengan pilihan tampilan:\n" +
              "- `visual_type` (opsional): Pilih grafik `barchart` (grafik batang) atau `heatmap` (kalender aktivitas).\n" +
              "- `days` (opsional): Periode data untuk `barchart`, misalnya `7` atau `30` hari.\n" +
              "- `year` (opsional): Tahun untuk heatmap (default: tahun ini).\n" +
              "Mendukung tampilan poin, sesi, dan streak untuk semua media.",
          },
          {
            name: "/log time `[timeframe]`",
            value:
              "Lihat dan kelola log immersion kamu dengan sistem pagination interaktif.\n" +
              "- `timeframe`: Pilih `24h` (24 jam terakhir) atau `7d` (7 hari terakhir).\n" +
              "Setelah memilih, kamu bisa pilih jenis media dan menghapus log dengan tombol **Delete**.",
          },
          {
            name: "/leaderboard `[timestamp] [media_type] [month (opsional)] [year (opsional)]`",
            value:
              "Lihat papan peringkat immersion berdasarkan poin yang dikumpulkan.\n" +
              "- `timestamp`: Pilih periode waktu (`weekly`, `monthly`, `yearly`, `all_time`).\n" +
              "- `media_type`: Filter leaderboard berdasarkan media (`anime`, `manga`, `book`, dll, atau `all`).\n" +
              "- `month` & `year` (opsional): Untuk leaderboard bulanan/tahunan spesifik.\n" +
              "Data dihitung secara real-time dari log immersion semua user.",
          },
          {
            name: "/novel `[title]`",
            value:
              "Cari dan unduh light novel dengan cepat berdasarkan judul.\n" +
              "- `title`: Judul light novel dalam karakter Jepang (kanji/kana).\n" +
              "Bot akan menampilkan daftar hasil dengan tombol **Next/Prev** untuk navigasi.",
          },
          {
            name: "/subs `[name] [episode (opsional)]`",
            value:
              "Cari dan download subtitle anime dari situs **Jimaku** langsung via bot.\n" +
              "- `name`: Nama anime (dengan autocomplete).\n" +
              "- `episode` (opsional): Nomor episode spesifik (misal: `1`, `12`).\n" +
              "File akan dikirim ke DM kamu (jika tidak diblokir).",
          },
          {
            name: "/react `[message]`",
            value:
              "Tambahkan emoji animasi ke pesan tertentu secara interaktif.\n" +
              "- `message`: ID atau link pesan yang ingin diberi react.\n" +
              "Setelah itu kamu akan diberi pilihan emoji animasi yang tersedia.",
          },
          {
            name: "/help `[language (opsional)]`",
            value: "Lihat panduan penggunaan bot ini.\n" +
                   "- `language` (opsional): Pilih bahasa panduan (`id`/`en`). Default: `id`.",
          },
          {
            name: "@Bot (Interaksi Langsung)",
            value:
              "Tanya apa pun ke bot dengan me-mention dia, seperti: `@Yuyuko Bot hari ini ngapain ya?`\n" +
              "Fitur-fitur:\n" +
              "- Jawab pertanyaan umum (cuaca, saran, dll)\n" +
              "- Generate atau analisis **gambar** (termasuk foto profil)\n" +
              "- Bicara natural, ramah, dan mengenali kamu\n" +
              "- **Mengingat** interaksi sebelumnya",
          },
          {
            name: "Tips",
            value:
              "- Gunakan autocomplete untuk memilih judul anime/manga/VN.\n" +
              "- Kamu bisa **hapus log** dengan klik tombol `Delete xx` di `/log`.\n" +
              "- Jika subtitle Jimaku tidak bisa dikirim via DM, pastikan kamu mengaktifkan DM jangan private.",
          }
        )
        .setFooter({
          text: "Yuyuko • Immersion Tracker",
          iconURL: interaction.client.user.displayAvatarURL({ size: 32 }),
        })
        .setTimestamp();
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
