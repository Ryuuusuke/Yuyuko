const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const afkUsers = new Map();

module.exports = {
        data: new SlashCommandBuilder()
                .setName("afk")
                .setDescription("Set status kamu jadi AFK")
                .addStringOption((option) =>
                        option
                                .setName("reason")
                                .setDescription("Alasan AFK")
                                .setRequired(false),
                ),

        async execute(interaction) {
                const reason = interaction.options.getString("reason") || "AFK";

                afkUsers.set(interaction.user.id, {
                        username: interaction.user.username,
                        reason: reason,
                        timestamp: Date.now(),
                });

                const afkEmbed = new EmbedBuilder()
                        .setColor(0x3498db)
                        .setAuthor({
                                name: interaction.user.username,
                                iconURL: interaction.user.displayAvatarURL(),
                        })
                        .setTitle("AFK")
                        .setDescription(
                                `User lain akan diberitahu kalau kamu sedang AFK. \n **Alasan:** ${reason}`,
                        )
                        .setFooter({
                                text: "Kirim pesan lagi untuk menghapus status AFK",
                        })
                        .setTimestamp();

                await interaction.reply({ embeds: [afkEmbed] });
        },
        afkUsers,
};
