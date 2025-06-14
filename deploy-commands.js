const { REST, Routes } = require("discord.js");
const { CLIENT_ID } = require("./environment");

// Auto deploy command saat masuk guild baru
client.on("guildCreate", async (guild) => {
  console.log(`🆕 Bot ditambahkan ke server: ${guild.name} (${guild.id})`);

  const commands = [];
  const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
  }

  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, guild.id),
      { body: commands }
    );
    console.log(`✅ Slash command berhasil di-sync ke server ${guild.name} (${guild.id})`);
  } catch (err) {
    console.error(`❌ Gagal sync command ke ${guild.name}:`, err);
  }
});
