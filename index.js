/**
 * Main entry point for the Yuyuko Discord bot
 * Initializes the Discord client and sets up command handling
 * @module index
 */

const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { DISCORD_TOKEN } = require("./environment");
const fs = require("fs");
const path = require("path");
const handleAyumiCommand = require('./commands/geminiReply'); // Updated import name
const logCommand = require('./commands/log.js');
const { asyncHandler, logError } = require("./utils/errorHandler");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath, { recursive: true });

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        if (command?.data?.name && (command?.execute || command?.handleButton)) {
            client.commands.set(command.data.name, command);
        }
    } catch (error) {
        console.error(`Error loading command ${file}:`, error.message);
    }
}

client.once("ready", () => {
    console.log(`${client.user.tag} is now online`);
});

client.on("interactionCreate", asyncHandler(async interaction => {
    if (interaction.isButton()) {
        // Route button interactions to the respective command's handler
        const command = client.commands.get(interaction.message.interaction.commandName);
        if (command && command.handleButton) {
            return await command.handleButton(interaction);
        }
        // Fallback for older buttons that might not be linked to a command
        if (interaction.customId.startsWith('log_') || interaction.customId.startsWith('media_') || interaction.customId.startsWith('delete_') || interaction.customId.startsWith('back_to_selection_')) {
            return await logCommand.handleButton(interaction);
        }
        return;
    }

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    if (interaction.isAutocomplete() && command.autocomplete) {
        return await command.autocomplete(interaction);
    }

    if (interaction.isChatInputCommand() && command.execute) {
        await command.execute(interaction);
    }
}));

client.on("messageCreate", asyncHandler(async (message) => {
    // Check for a!ayumi command (case insensitive)
    if (message.content.toLowerCase().startsWith('a!ayumi')) {
        await handleAyumiCommand(message);
        return;
    }
    
    // Other existing handlers can be added here
}));

process.on('unhandledRejection', (reason, promise) => {
    logError(new Error(reason), 'unhandledRejection', { promise });
});

process.on('uncaughtException', (error) => {
    logError(error, 'uncaughtException');
    process.exit(1);
});

client.login(DISCORD_TOKEN).catch(error => {
    console.error('Login failed:', error.message);
    process.exit(1);
});
