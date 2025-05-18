const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const { DISCORD_TOKEN, CLIENT_ID } = require("./environment");
const fs = require("fs");

const commands = [];
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

// Buat client Discord buat ambil guildId
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  const guild = client.guilds.cache.first(); // ambil guild pertama yang ditemukan
  if (!guild) {
    console.log("❌ Bot belum masuk ke server mana pun.");
    process.exit(1);
  }

  const guildId = guild.id;
  console.log(`🔍 Guild ID ditemukan: ${guildId}`);

  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

  try {
    console.log("⏳ Mendaftarkan slash command ke Discord...");
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, guildId),
      { body: commands }
    );
    console.log("✅ Slash command berhasil didaftarkan ke guild!");
  } catch (error) {
    console.error("❌ Gagal mendaftarkan command:", error);
  } finally {
    client.destroy(); // logout bot
  }
});

client.login(DISCORD_TOKEN);
