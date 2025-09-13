const { EmbedBuilder } = require("discord.js");
const afkCommand = require("../commands/afk.js");

module.exports = {
        name: "messageCreate",
        async execute(message) {
                if (message.author.bot) return;

                // remove afk if new message detected
                if (afkCommand.afkUsers?.has(message.author.id)) {
                        afkCommand.afkUsers.delete(message.author.id);

                        const backEmbed = new EmbedBuilder()
                                .setColor(0x2ecc71)
                                .setAuthor({
                                        name: message.author.username,
                                        iconURL: message.author.displayAvatarURL(),
                                })
                                .setTitle("Selamat Datang Kembali")
                                .setDescription("Status AFK kamu telah dihapus")
                                .setTimestamp();

                        await message.reply({ embeds: [backEmbed] });
                }

                // afk user mentioned
                if (message.mentions.users.size > 0) {
                        message.mentions.users.forEach((user) => {
                                if (afkCommand.afkUsers?.has(user.id)) {
                                        const afkData = afkCommand.afkUsers.get(
                                                user.id,
                                        );

                                        const afkEmbed = new EmbedBuilder()
                                                .setColor(0xe67e22)
                                                .setAuthor({
                                                        name: afkData.username,
                                                        iconURL: user.displayAvatarURL(),
                                                })
                                                .setTitle(
                                                        `${afkData.username} sedang AFK`,
                                                )
                                                .setDescription(
                                                        `**Alasan :** ${afkData.reason}\n` +
                                                                `**Sejak  :** <t:${Math.floor(afkData.timestamp / 1000)}:R>`,
                                                )
                                                .setTimestamp();
                                        message.reply({ embeds: [afkEmbed] });
                                }
                        });
                }
                // reply to user when afk
                if (message.reference?.messageId) {
                        try {
                                const repliedMsg =
                                        await message.channel.messages.fetch(
                                                message.reference.messageId,
                                        );
                                const repliedUser = repliedMsg.author;

                                if (afkCommand.afkUsers?.has(repliedUser.id)) {
                                        const afkData = afkCommand.afkUsers.get(
                                                repliedUser.id,
                                        );

                                        const afkEmbed = new EmbedBuilder()
                                                .setColor(0xe67e22)
                                                .setAuthor({
                                                        name: afkData.username,
                                                        iconURL: repliedUser.displayAvatarURL(),
                                                })
                                                .setTitle(
                                                        `${afkData.username} sedang AFK`,
                                                )
                                                .setDescription(
                                                        `**Alasan :** ${afkData.reason}\n` +
                                                                `**Sejak  :** <t:${Math.floor(afkData.timestamp / 1000)}:R>`,
                                                )
                                                .setTimestamp();
                                        message.reply({ embeds: [afkEmbed] });
                                }
                        } catch (err) {
                                console.error(
                                        "Gagal fetch pesan reply:",
                                        err.message,
                                );
                        }
                }
        },
};
