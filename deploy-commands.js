const { REST, Routes, Client, GatewayIntentBits } = require("discord.js");
const { DISCORD_TOKEN, CLIENT_ID } = require("./environment");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data) {
        commands.push(command.data.toJSON());
    }
}

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function clearGuildCommands() {
    await client.login(DISCORD_TOKEN);
    const guilds = await client.guilds.fetch();
    console.log("Clearing commands for all guilds...");

    for (const [guildId, guild] of guilds) {
        try {
            await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), { body: [] });
            console.log(`✅ Cleared commands for ${guild.name} (${guildId})`);
        } catch (err) {
            console.error(`❌ Failed to clear commands for ${guild.name} (${guildId}):`, err.message);
        }
    }
    console.log("Finished clearing guild commands.");
    client.destroy();
}

async function deployGlobalCommands() {
    try {
        console.log("Started refreshing application (/) commands.");
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );
        console.log("Successfully reloaded application (/) commands.");
    } catch (error) {
        console.error(error);
    }
}

async function main() {
    const arg = process.argv[2];
    if (arg === '--clear') {
        await clearGuildCommands();
    } else if (arg === '--deploy') {
        await deployGlobalCommands();
    } else if (arg === '--clear-and-deploy') {
        await clearGuildCommands();
        await deployGlobalCommands();
    } else {
        console.log("Usage: node deploy-commands.js [--clear | --deploy | --clear-and-deploy]");
    }
}

main();
