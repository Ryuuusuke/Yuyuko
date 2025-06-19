const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const emojis = require('../utils/emojis');

const EMOJIS_PER_PAGE = 25;
const BUTTONS_PER_ROW = 5;

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

      const validEmojis = Array.isArray(emojis)
        ? emojis.filter(e =>
            e &&
            typeof e === 'object' &&
            typeof e.id === 'string' &&
            /^\d{17,19}$/.test(e.id) &&
            typeof e.name === 'string' &&
            e.name.length > 0)
        : [];

      if (validEmojis.length === 0) {
        return interaction.editReply({
          content: 'Emoji animasi tidak ditemukan atau tidak valid.',
          embeds: [],
          components: []
        });
      }

      let channel;
      try {
        channel = await interaction.client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) throw new Error('Not text-based');
      } catch {
        return interaction.editReply({
          content: 'Channel tidak ditemukan atau bot tidak memiliki akses.',
          embeds: [],
          components: []
        });
      }

      let message;
      try {
        message = await channel.messages.fetch(messageId);
        if (!message) throw new Error('Message not found');
      } catch {
        return interaction.editReply({
          content: `Pesan tidak ditemukan di <#${channelId}>.`,
          embeds: [],
          components: []
        });
      }

      const botMember = channel.guild?.members.cache.get(interaction.client.user.id);
      const channelPermissions = channel.permissionsFor(botMember);

      if (!channelPermissions?.has(['ViewChannel', 'AddReactions'])) {
        return interaction.editReply({
          content: `Bot tidak memiliki permission untuk mereact di <#${channelId}>.`,
          embeds: [],
          components: []
        });
      }

      if (Date.now() - message.createdTimestamp > 14 * 24 * 60 * 60 * 1000) {
        return interaction.editReply({
          content: 'Pesan terlalu lama (lebih dari 14 hari) untuk direact.',
          embeds: [],
          components: []
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('🎭 Pilih Emoji untuk React')
        .setDescription(
          message.url
            ? `Klik emoji di bawah untuk mereact pesan [ini](${message.url})`
            : `Klik emoji di bawah untuk mereact pesan.`
        )
        .setColor(0x00AE86)
        .setTimestamp();

      let currentPage = 0;

      const generateEmojiRows = (page) => {
        const start = page * EMOJIS_PER_PAGE;
        const pageEmojis = validEmojis.slice(start, start + EMOJIS_PER_PAGE);

        const rows = [];
        for (let i = 0; i < pageEmojis.length; i += BUTTONS_PER_ROW) {
          const row = new ActionRowBuilder();
          const slice = pageEmojis.slice(i, i + BUTTONS_PER_ROW);
          for (const emoji of slice) {
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`react_${emoji.id}_${channelId}_${messageId}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji({ id: emoji.id })
            );
          }
          rows.push(row);
        }

        const totalPages = Math.ceil(validEmojis.length / EMOJIS_PER_PAGE);
        if (totalPages > 1) {
          const navRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`prev_page_${page}_${channelId}_${messageId}`)
                .setLabel("Prev")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
              new ButtonBuilder()
                .setCustomId(`next_page_${page}_${channelId}_${messageId}`)
                .setLabel("Next")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages - 1)
            );
          rows.push(navRow);
        }

        return rows;
      };

      await interaction.editReply({
        content: null,
        embeds: [embed],
        components: generateEmojiRows(currentPage)
      });

      const collector = interaction.channel.createMessageComponentCollector({
        filter: i =>
          i.user.id === interaction.user.id &&
          (i.customId.startsWith('react_') || i.customId.startsWith('prev_page_') || i.customId.startsWith('next_page_')),
        time: 60000
      });

      collector.on('collect', async button => {
        try {
          if (button.customId.startsWith('react_')) {
            const [, emojiId] = button.customId.split('_');

            const selectedEmoji = validEmojis.find(e => e.id === emojiId);
            const emojiName = selectedEmoji?.name ?? 'emoji';

            await message.react(emojiId);

            const successEmbed = new EmbedBuilder()
              .setTitle('React Berhasil')
              .setDescription(`Pesan berhasil direact dengan emoji **${emojiName}**`)
              .setColor(0x00FF00)
              .setTimestamp()
              .setImage(`https://cdn.discordapp.com/emojis/${emojiId}.gif`)
              .setFooter({ text: `Emoji ID: ${emojiId}` });

            await button.update({
              content: null,
              embeds: [successEmbed],
              components: []
            });

            collector.stop('done');

          } else if (button.customId.startsWith('prev_page_') || button.customId.startsWith('next_page_')) {
            const [_, direction, oldPageStr] = button.customId.split('_');
            currentPage = direction === 'next' ? parseInt(oldPageStr) + 1 : parseInt(oldPageStr) - 1;

            await button.update({
              content: null,
              embeds: [embed],
              components: generateEmojiRows(currentPage)
            });
          }

        } catch (err) {
          console.error('Gagal handle tombol:', err);
          await button.reply({ content: 'Terjadi kesalahan saat memproses tombol.', ephemeral: true });
        }
      });

      collector.on('end', async (_, reason) => {
        if (reason !== 'done') {
          const timeoutEmbed = new EmbedBuilder()
            .setTitle('Waktu Habis')
            .setDescription('Tidak ada emoji yang dipilih dalam 60 detik.')
            .setColor(0xFF9900)
            .setTimestamp();

          await interaction.editReply({
            content: null,
            embeds: [timeoutEmbed],
            components: []
          });
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
