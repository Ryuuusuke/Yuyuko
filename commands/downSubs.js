const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

// Jimaku API Configuration
const JIMAKU_API_BASE = 'https://jimaku.cc/api';
const JIMAKU_API_KEY = process.env.JIMAKU_API_KEY; // Set in environment variables

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
            console.error('Autocomplete error:', error);
            await interaction.respond([]);
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

            if (interaction.deferred) {
                await interaction.editReply({ content: errorMessage });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
};

async function searchAnime(query) {
    const response = await axios.get(`${JIMAKU_API_BASE}/entries/search`, {
        headers: {
            'Authorization': JIMAKU_API_KEY
        },
        params: {
            query: query,
            anime: true
        }
    });

    return response.data;
}

async function handleDownload(interaction, entryId, episode) {
    // Get entry info first
    const entryResponse = await axios.get(`${JIMAKU_API_BASE}/entries/${entryId}`, {
        headers: {
            'Authorization': JIMAKU_API_KEY
        }
    });

    const entry = entryResponse.data;

    // Get files
    const filesResponse = await axios.get(`${JIMAKU_API_BASE}/entries/${entryId}/files`, {
        headers: {
            'Authorization': JIMAKU_API_KEY
        },
        params: episode ? { episode } : {}
    });

    const files = filesResponse.data;

    if (files.length === 0) {
        const episodeText = episode ? ` episode ${episode}` : '';
        return interaction.editReply({
            content: `No subtitle files found for **${entry.name}**${episodeText}`
        });
    }

    // Create main info embed for channel
    const channelEmbed = new EmbedBuilder()
        .setTitle(`${entry.name}`)
        .setColor('#00ff00')
        .setTimestamp()
        .setFooter({ text: 'Jimaku API' });

    // Basic info
    if (entry.english_name) {
        channelEmbed.addFields({ name: 'English Name', value: entry.english_name, inline: true });
    }
    if (entry.japanese_name) {
        channelEmbed.addFields({ name: 'Japanese Name', value: entry.japanese_name, inline: true });
    }

    // IDs
    let idInfo = `Entry ID: \`${entry.id}\`\n`;
    if (entry.anilist_id) {
        idInfo += `AniList ID: \`${entry.anilist_id}\`\n`;
    }
    if (entry.tmdb_id) {
        idInfo += `TMDB ID: \`${entry.tmdb_id}\`\n`;
    }
    channelEmbed.addFields({ name: 'IDs', value: idInfo });

    // Flags
    let flags = [];
    if (entry.flags.anime) flags.push('Anime');
    if (entry.flags.movie) flags.push('Movie');
    if (entry.flags.adult) flags.push('Adult');
    if (entry.flags.external) flags.push('External');
    if (entry.flags.unverified) flags.push('Unverified');
    
    if (flags.length > 0) {
        channelEmbed.addFields({ name: 'Tags', value: flags.join(' • '), inline: true });
    }

    channelEmbed.addFields({ 
        name: 'Last Modified', 
        value: new Date(entry.last_modified).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }), 
        inline: true 
    });

    channelEmbed.addFields({ 
        name: 'Files Available', 
        value: `${files.length} file(s)`, 
        inline: true 
    });

    if (entry.notes) {
        channelEmbed.addFields({ name: 'Notes', value: entry.notes });
    }

    // Display info embed in channel first
    await interaction.editReply({ embeds: [channelEmbed] });

    // Create embed for DM with file list
    const dmEmbed = new EmbedBuilder()
        .setTitle(`Subtitle: ${entry.name}`)
        .setColor('#0099ff')
        .setTimestamp();

    if (entry.english_name) {
        dmEmbed.addFields({ name: 'English', value: entry.english_name, inline: true });
    }
    if (entry.japanese_name) {
        dmEmbed.addFields({ name: 'Japanese', value: entry.japanese_name, inline: true });
    }

    // Add Entry ID for reference
    dmEmbed.addFields({ name: 'Entry ID', value: `\`${entry.id}\``, inline: true });

    let fileList = '';
    const attachments = [];

    // Limit to maximum 2 files to save API limits
    const limitedFiles = files.slice(0, 2);

    for (const file of limitedFiles) {
        const fileSize = (file.size / 1024).toFixed(2);
        fileList += `**${file.name}**\n`;
        fileList += `Size: ${fileSize} KB\n`;
        fileList += `Modified: ${new Date(file.last_modified).toLocaleDateString('en-US')}\n\n`;

        // Download file if not too large (max 8MB for Discord)
        if (file.size < 8 * 1024 * 1024) {
            try {
                const fileResponse = await axios.get(file.url, {
                    responseType: 'arraybuffer',
                    timeout: 10000 // 10 second timeout
                });

                const attachment = new AttachmentBuilder(
                    Buffer.from(fileResponse.data),
                    { name: file.name }
                );
                attachments.push(attachment);
            } catch (downloadError) {
                console.error(`Error downloading file ${file.name}:`, downloadError);
                fileList += `*Error downloading this file*\n\n`;
            }
        } else {
            fileList += `*File too large for Discord upload*\n`;
            fileList += `[Manual Download](${file.url})\n\n`;
        }
    }

    dmEmbed.setDescription(fileList);

    if (files.length > 2) {
        dmEmbed.addFields({
            name: 'Info',
            value: `Showing 2 of ${files.length} files (limit for API efficiency). Use Entry ID \`${entry.id}\` for specific downloads or use episode parameter.`
        });
    }

    // Send files to user's DM
    try {
        const dmOptions = { embeds: [dmEmbed] };
        if (attachments.length > 0) {
            dmOptions.files = attachments;
        }
        
        await interaction.user.send(dmOptions);
    } catch (dmError) {
        console.error('Error sending DM:', dmError);
        
        await interaction.followUp({
            content: `Cannot send DM. Please check your privacy settings and try again.`,
            ephemeral: true
        });
    }
}