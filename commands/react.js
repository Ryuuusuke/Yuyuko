const {SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require('discord.js');
const emojis = require('../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('react')
    .setDescription('React ke pesan dengan emoji animasi')
    .addStringOption(option =>
      option
        .setName('pesan')
        .setDescription('ID atau link pesan yang ingin direact')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const input = interaction.options.getString('pesan');

      // Validasi input
      if (!input?.trim()) {
        return interaction.editReply({ 
          content: 'Input pesan tidak valid.',
          embeds: [],
          components: []
        });
      }

      const messageLinkRegex = /\/channels\/(\d+)\/(\d+)\/(\d+)/;
      let channelId, messageId;

      if (messageLinkRegex.test(input)) {
        const match = input.match(messageLinkRegex);
        [, , channelId, messageId] = match;
      } else {
        if (!/^\d{17,19}$/.test(input.trim())) {
          return interaction.editReply({
            content: 'ID pesan tidak valid. Gunakan ID 17–19 digit atau link pesan.',
            embeds: [],
            components: []
          });
        }
        messageId = input.trim();
        channelId = interaction.channelId;
      }

      // Validasi dan filter emoji yang lebih ketat
      const validEmojis = [];
      if (Array.isArray(emojis)) {
        for (const emoji of emojis) {
          if (emoji && 
              typeof emoji === 'object' && 
              typeof emoji.id === 'string' && 
              emoji.id.match(/^\d{17,19}$/) && // Validasi format ID emoji
              typeof emoji.name === 'string' &&
              emoji.name.length > 0) {
            validEmojis.push(emoji);
            if (validEmojis.length >= 20) break; // Maksimal 20 emoji
          }
        }
      }

      if (validEmojis.length === 0) {
        return interaction.editReply({ 
          content: 'Emoji animasi tidak ditemukan atau tidak valid.',
          embeds: [],
          components: []
        });
      }

      // Fetch channel dengan error handling yang lebih baik
      let channel;
      try {
        channel = await interaction.client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
          throw new Error('Channel bukan text channel');
        }
      } catch (error) {
        return interaction.editReply({
          content: 'Channel tidak ditemukan atau bot tidak memiliki akses.',
          embeds: [],
          components: []
        });
      }

      // Fetch message dengan error handling yang lebih baik
      let message;
      try {
        message = await channel.messages.fetch(messageId);
        if (!message) {
          throw new Error('Message not found');
        }
      } catch (error) {
        return interaction.editReply({
          content: `Pesan tidak ditemukan di <#${channelId}>.`,
          embeds: [],
          components: []
        });
      }

      // Cek permission bot di channel target
      const botMember = channel.guild?.members.cache.get(interaction.client.user.id);
      const channelPermissions = channel.permissionsFor(botMember);
      
      if (!channelPermissions?.has(['ViewChannel', 'AddReactions'])) {
        return interaction.editReply({
          content: `Bot tidak memiliki permission untuk mereact di <#${channelId}>. Pastikan bot memiliki permission **View Channel** dan **Add Reactions**.`,
          embeds: [],
          components: []
        });
      }

      // Cek apakah pesan bisa direact (tidak terlalu lama, dll)
      const messageAge = Date.now() - message.createdTimestamp;
      if (messageAge > 14 * 24 * 60 * 60 * 1000) { // 14 hari
        return interaction.editReply({
          content: 'Pesan terlalu lama (lebih dari 14 hari) untuk direact.',
          embeds: [],
          components: []
        });
      }

      // Buat Embed dengan validasi
      const embed = new EmbedBuilder()
        .setTitle('🎭 Pilih Emoji untuk React')
        .setDescription(
          message.url
            ? `Klik emoji di bawah untuk mereact pesan [ini](${message.url})`
            : `Klik emoji di bawah untuk mereact pesan.`
        )
        .setColor(0x00AE86)
        .setTimestamp();

      // Buat Button Rows dengan validasi yang lebih ketat
      const rows = [];
      const maxRows = 5;
      const maxButtonsPerRow = 5;

      for (let i = 0; i < validEmojis.length && rows.length < maxRows; i += maxButtonsPerRow) {
        const row = new ActionRowBuilder();
        const emojiSlice = validEmojis.slice(i, i + maxButtonsPerRow);
        
        for (let j = 0; j < emojiSlice.length; j++) {
          const emoji = emojiSlice[j];
          try {
            const button = new ButtonBuilder()
              .setCustomId(`react_${emoji.id}_${channelId}_${messageId}`)
              .setStyle(ButtonStyle.Secondary);

            // Validasi emoji sebelum set
            if (emoji.id && emoji.id.match(/^\d{17,19}$/)) {
              button.setEmoji({ id: emoji.id });
            } else {
              continue; // Skip emoji yang tidak valid
            }

            row.addComponents(button);
          } catch (buttonError) {
            console.error(`Error creating button for emoji ${emoji.id}:`, buttonError);
            continue; // Skip emoji yang bermasalah
          }
        }

        // Hanya tambahkan row jika ada button
        if (row.components.length > 0) {
          rows.push(row);
        }
      }

      if (rows.length === 0) {
        return interaction.editReply({
          content: 'Tidak ada emoji valid yang dapat ditampilkan.',
          embeds: [],
          components: []
        });
      }

      // Edit reply dengan error handling
      try {
        await interaction.editReply({
          content: null,
          embeds: [embed],
          components: rows
        });
      } catch (editError) {
        console.error('Error editing reply:', editError);
        return interaction.editReply({
          content: 'Terjadi kesalahan saat menampilkan emoji. Silakan coba lagi.',
          embeds: [],
          components: []
        });
      }

      // Collector dengan timeout yang lebih pendek - menggunakan interaction yang sama
      const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('react_');
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        max: 1,
        time: 30000
      });

      collector.on('collect', async button => {
        try {
          const customIdParts = button.customId.split('_');
          const emojiId = customIdParts[1];
          
          // Validasi emoji ID lagi sebelum react
          if (!emojiId || !emojiId.match(/^\d{17,19}$/)) {
            throw new Error('Invalid emoji ID');
          }

          // Cari emoji yang dipilih dari array
          const selectedEmoji = validEmojis.find(e => e.id === emojiId);
          const emojiName = selectedEmoji ? selectedEmoji.name : 'emoji';

          await message.react(emojiId);

          const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.gif`;
          const emojiUrlFallback = `https://cdn.discordapp.com/emojis/${emojiId}.png`;

          const successEmbed = new EmbedBuilder()
            .setTitle('✅ React Berhasil')
            .setDescription(`Pesan berhasil direact dengan emoji **${emojiName}**`)
            .setColor(0x00FF00)
            .setTimestamp()
            .setImage(emojiUrl)
            .setFooter({ text: `Emoji ID: ${emojiId}` });

          await button.update({
            content: null,
            embeds: [successEmbed],
            components: []
          });

        } catch (err) {
          console.error('Gagal react:', err);
          
          let errorMessage = 'Gagal mereact pesan.';
          
          if (err.code === 10014) {
            errorMessage = 'Emoji tidak ditemukan atau tidak valid.';
          } else if (err.code === 50013) {
            errorMessage = 'Bot tidak memiliki permission untuk mereact di channel ini.';
          } else if (err.code === 50035) {
            errorMessage = 'Format emoji tidak valid.';
          } else if (err.message?.includes('Missing Permissions')) {
            errorMessage = 'Bot tidak memiliki permission yang diperlukan.';
          } else if (err.message?.includes('Unknown Emoji')) {
            errorMessage = 'Emoji tidak dikenali atau tidak dapat diakses.';
          } else {
            errorMessage = 'Periksa izin bot, validitas emoji, atau status pesan.';
          }

          const failEmbed = new EmbedBuilder()
            .setTitle('❌ React Gagal')
            .setDescription(errorMessage)
            .setColor(0xFF0000)
            .setTimestamp();

          try {
            await button.update({
              content: null,
              embeds: [failEmbed],
              components: []
            });
          } catch (updateError) {
            console.error('Error updating button response:', updateError);
          }
        }
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          try {
            const timeoutEmbed = new EmbedBuilder()
              .setTitle('⌛ Waktu Habis')
              .setDescription('Tidak ada emoji yang dipilih dalam 30 detik.')
              .setColor(0xFF9900)
              .setTimestamp();

            await interaction.editReply({
              content: null,
              embeds: [timeoutEmbed],
              components: []
            });
          } catch (timeoutError) {
            console.error('Error handling timeout:', timeoutError);
          }
        }
      });

    } catch (error) {
      console.error('Error utama:', error);
      const fallback = 'Terjadi kesalahan internal. Silakan coba lagi.';

      try {
        if (interaction.deferred && !interaction.replied) {
          await interaction.editReply({ 
            content: fallback,
            embeds: [],
            components: []
          });
        } else if (!interaction.replied) {
          await interaction.reply({ 
            content: fallback,
            ephemeral: true
          });
        }
      } catch (fallbackError) {
        console.error('Error in fallback response:', fallbackError);
      }
    }
  }
};