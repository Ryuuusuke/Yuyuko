const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { DISCORD_TOKEN } = require("./environment");
const fs = require("fs");

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
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command); // pakai data.name untuk slash command
}

// Ketika bot berhasil login
client.once("ready", () => {
    console.log(`${client.user.tag} is now Active!`);
});

// 🔁 Support legacy prefix command (opsional)
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const prefix = "k!";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
        await command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply("❌ Terjadi error saat menjalankan perintah.");
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
            await interaction.followUp({ content: "❌ Terjadi error saat eksekusi.", ephemeral: true });
        } else {
            await interaction.reply({ content: "❌ Terjadi error saat eksekusi.", ephemeral: true });
        }
    }
});

// Login ke Discord
client.login(DISCORD_TOKEN);
