const { Client, Collection, GatewayIntentBits, REST, Routes } = require("discord.js");
const { DISCORD_TOKEN, CLIENT_ID } = require("./environment");
const fs = require("fs");
const path = require("path");
const logCommand = require('./commands/log.js');
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

// Load commands - menggunakan path yang lebih robust
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}


// ✅ Auto-deploy command ke semua guild saat bot online
async function deployCommandsToAllGuilds() {
    const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
    const commands = [];

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        commands.push(command.data.toJSON());
    }

    const guilds = client.guilds.cache;

    console.log(`🔁 Deploy ulang command ke ${guilds.size} server...`);
    for (const [guildId, guild] of guilds) {
        try {
            await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, guildId),
                { body: commands }
            );
            console.log(`✅ ${guild.name} (${guildId}) -> OK`);
        } catch (err) {
            console.error(`❌ ${guild.name} (${guildId}) -> ERROR`, err);
        }
    }
}

client.once("ready", async () => {
    console.log(`${client.user.tag} is now Active!`);
    await deployCommandsToAllGuilds();
});

client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        await logCommand.handleButton(interaction);
    }
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

// Handle slash command interactions (gabungan dari kedua versi)
client.on('interactionCreate', async interaction => {
    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }
        
        try {
            if (command.autocomplete) {
                await command.autocomplete(interaction);
            } else if (command.execute) {
                // Some commands handle autocomplete in their execute method
                await command.execute(interaction);
            }
        } catch (error) {
            console.error('Error handling autocomplete:', error);
        }
        return;
    }

    // Handle regular slash command interactions
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('Error executing command:', error);
            
            const errorMessage = { 
                content: '❌ Terjadi error saat eksekusi command!', 
                ephemeral: true 
            };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
});

// Login ke Discord
client.login(DISCORD_TOKEN);