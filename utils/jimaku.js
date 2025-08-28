const axios = require('axios');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { JIMAKU_API_KEY } = require("../environment");

const JIMAKU_API_BASE = 'https://jimaku.cc/api';

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

async function getAnimeImage(anilistId) {
    if (!anilistId) return null;

    try {
        const query = `
            query ($id: Int) {
                Media(id: $id, type: ANIME) {
                    coverImage {
                        large
                    }
                }
            }
        `;

        const variables = { id: parseInt(anilistId) };

        const res = await axios.post("https://graphql.anilist.co", {
            query,
            variables
        }, {
            headers: { "Content-Type": "application/json" }
        });

        return res.data?.data?.Media?.coverImage?.large || null;
    } catch (err) {
        console.error("Failed to fetch anime image:", err);
        return null;
    }
}

async function handleDownload(interaction, entryId, episode) {
    // Get entry info first
    const entryResponse = await axios.get(`${JIMAKU_API_BASE}/entries/${entryId}`, {
        headers: {
            'Authorization': JIMAKU_API_KEY
        }
    });

    const entry = entryResponse.data;

    // Get anime image
    let imageUrl = null;
    if (entry.anilist_id) {
        imageUrl = await getAnimeImage(entry.anilist_id);
    }

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

    // Create title with episode number if specified
    const title = episode ? `${entry.name} ep ${episode}` : entry.name;

    // Create main info embed for channel
    const channelEmbed = new EmbedBuilder()
        .setTitle(title)
        .setColor('#00ff00')
        .setTimestamp()
        .setFooter({ text: 'Jimaku API' });

    // Add anime image if available
    if (imageUrl) {
        channelEmbed.setThumbnail(imageUrl);
    }

    // Basic info
    if (entry.english_name) {
        channelEmbed.addFields({ name: 'English Name', value: entry.english_name, inline: true });
    }
    if (entry.japanese_name) {
        channelEmbed.addFields({ name: 'Japanese Name', value: entry.japanese_name, inline: true });
    }

    // Display info embed in channel first
    await interaction.editReply({ embeds: [channelEmbed] });

    // Create embed for DM with file list
    const dmEmbed = new EmbedBuilder()
        .setTitle(`Subtitle: ${entry.name}`)
        .setColor('#0099ff')
        .setTimestamp();

    // Add anime image if available
    if (imageUrl) {
        dmEmbed.setThumbnail(imageUrl);
    }

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

    const limitedFiles = files.slice(0, 4);

    for (const file of limitedFiles) {
        const fileSize = (file.size / 1024).toFixed(2);
        fileList += `**${file.name}**
`;
        fileList += `Size: ${fileSize} KB
`;
        fileList += `Modified: ${new Date(file.last_modified).toLocaleDateString('en-US')}
`;

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
                fileList += `*Error downloading this file*
`;
            }
        } else {
            fileList += `*File too large for Discord upload*
`;
            fileList += `[Manual Download](${file.url})
`;
        }
    }

    dmEmbed.setDescription(fileList);

    if (files.length > 2) {
        dmEmbed.addFields({
            name: 'Info',
            value: `Showing 4 of ${files.length} files. Use Entry ID \`${entry.id}\` for specific downloads or use episode parameter.`
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
        
        // If DM fails, send a follow-up message in channel
        await interaction.followUp({
            content: `Cannot send DM. Please check your privacy settings and try again.`, 
            ephemeral: true
        });
    }
}

module.exports = {
    searchAnime,
    handleDownload
}
