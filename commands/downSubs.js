const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { searchAnime, handleDownload } = require("../utils/jimaku");
const { JIMAKU_API_KEY } = require("../environment");

// Cache for search results to improve autocomplete performance
const searchCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

module.exports = {
    data: new SlashCommandBuilder()
        .setName('subs')
        .setDescription('Download anime subtitles from Jimaku')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Anime name to search for')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option.setName('episode')
                .setDescription('Episode number (optional)')
                .setRequired(false)
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        
        if (!focusedValue || focusedValue.length < 2) {
            return interaction.respond([]);
        }

        try {
            // Check cache first
            const cacheKey = focusedValue.toLowerCase();
            if (searchCache.has(cacheKey)) {
                const cached = searchCache.get(cacheKey);
                if (Date.now() - cached.timestamp < CACHE_DURATION) {
                    return interaction.respond(cached.results);
                }
            }

            // Search for anime
            const searchResults = await searchAnime(focusedValue);
            
            // Format results for autocomplete (max 25 choices)
            const choices = searchResults.slice(0, 25).map(anime => ({
                name: `${anime.name}${anime.english_name ? ` (${anime.english_name})` : ''}`.substring(0, 100),
                value: anime.id.toString()
            }));

            // Cache the results
            searchCache.set(cacheKey, {
                results: choices,
                timestamp: Date.now()
            });

            await interaction.respond(choices);
        } catch (error) {
            await interaction.respond([]);
            console.error('Autocomplete error:', error);
        }
    },

    async execute(interaction) {
        if (!JIMAKU_API_KEY) {
            return interaction.reply({
                content: 'Jimaku API Key not configured!',
                ephemeral: true
            });
        }

        const nameOrId = interaction.options.getString('name');
        const episode = interaction.options.getInteger('episode');

        try {
            await interaction.deferReply();

            let entryId;
            
            // Check if name is a numeric ID (from autocomplete) or search term
            if (/^\d+$/.test(nameOrId)) {
                entryId = parseInt(nameOrId);
            } else {
                // Search for the anime
                const searchResults = await searchAnime(nameOrId);
                
                if (searchResults.length === 0) {
                    return interaction.editReply({
                        content: `No anime found with keyword: **${nameOrId}**`
                    });
                }

                // Get the first (most relevant) result
                entryId = searchResults[0].id;
            }

            await handleDownload(interaction, entryId, episode);

        } catch (error) {
            console.error('Error in subs command:', error);
            
            const errorMessage = error.response?.status === 429 
                ? 'Rate limit exceeded! Please wait before trying again.'
                : error.response?.status === 401
                ? 'Invalid or expired API Key!'
                : error.response?.status === 404
                ? 'Anime not found!'
                : 'Error occurred while accessing Jimaku API!';

            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
};


