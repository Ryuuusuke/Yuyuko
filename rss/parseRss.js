const { EmbedBuilder } = require("discord.js");
const Parser = require('rss-parser');
const he = require("he");
const { asyncHandler } = require("../utils/errorHandler");

const parser = new Parser({
    customFields: {
        item: ['media:thumbnail', 'description']
    }
});

const sentLinks = new Set();

/**
 * Fetch and send MyAnimeList news to a Discord channel
 * @param {Object} client - Discord client instance
 * @returns {Promise<void>}
 */
async function malRss(client) {
    try {
        const feed = await parser.parseURL("https://myanimelist.net/rss/news.xml");
        const channel = await client.channels.fetch("1372825293475151872");

        // Maintain a rotating set of sent links (max 30)
        if (sentLinks.size > 30) {
            const first = sentLinks.values().next().value;
            sentLinks.delete(first);
        }

        for (const item of feed.items) {
            if (!sentLinks.has(item.link)) {
                const thumbnail = item['media:thumbnail'];
                const rawDescription = item['description'];
                const cleanDescription = he.decode(rawDescription).slice(0, 200) + "...";

                const embed = new EmbedBuilder()
                    .setTitle(item.title)
                    .setURL(item.link)
                    .setDescription(cleanDescription)
                    .setColor(0x2e51a2)
                    .setTimestamp(new Date(item.pubDate))
                    .setFooter({ text: 'MyAnimeList News' })
                    .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/7/7a/MyAnimeList_Logo.png');

                if (thumbnail) {
                    embed.setImage(thumbnail);
                }

                await channel.send({ embeds: [embed] });
                sentLinks.add(item.link);
                console.log(">> New news from MAL sent: ", item.link);
            }
        }
    } catch (error) {
        console.log('Error when fetching/sending news: ', error);
    }
}

module.exports = malRss;