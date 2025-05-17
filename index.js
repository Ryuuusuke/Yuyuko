const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const level1 = "k!quiz testlevel1";

client.commands = new Collection();

client.once("ready", () => {
    console.log(`${client.user.tag} is now Active!`);
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.content == "k!quiz testlevel1") {
    }
});
