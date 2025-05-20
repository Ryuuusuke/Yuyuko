const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { DISCORD_TOKEN } = require("./environment");
const fs = require("fs");
const {
    checkRank,
    onUserCommand, // Mungkin tidak terpakai di sini dengan messageCreate langsung
    trackUserQuizStart,
} = require("./ranked/checkRank");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Inisialisasi koleksi command
client.commands = new Collection();

// Baca semua file dari folder commands dan daftarkan ke client.commands
const commandFiles = fs
    .readdirSync("./commands")
    .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command); // pakai data.name untuk slash command
}

// Ketika bot berhasil login
client.once("ready", () => {
    console.log(`${client.user.tag} is now Active!`);
});

// Log dan Cek Rank
client.on("messageCreate", async (message) => {
    // Hanya catat user yang memulai kuis
    if (message.content.startsWith("k!quiz")) {
        trackUserQuizStart(message);
    }

    // Periksa rank HANYA jika pesan berasal dari Kotoba Bot
    if (message.author.id == "251239170058616833") {
        await checkRank(message);
    }
});

// ✅ Support slash command
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: "❌ Terjadi error saat eksekusi.",
                ephemeral: true,
            });
        } else {
            await interaction.reply({
                content: "❌ Terjadi error saat eksekusi.",
                ephemeral: true,
            });
        }
    }
});

// Login ke Discord
client.login(DISCORD_TOKEN);
