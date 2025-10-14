const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Default Ayumi system prompt
const AYUMI_SYSTEM_PROMPT = `
Kamu adalah Ayumi, AI assistant di Discord yang profesional.
"GAYA PENULISANNYA JANGAN PAKAI EMOJI"

CIRI AYUMI:
- Peduli dengan progress user dalam belajar bahasa Jepang
- Pakai emot sederhana (kadang), tapi gak lebay
- Gunakan bahasa yang profesional dan tidak menggunakan kata-kata alay atau cringe seperti "sugoi", "daijobu", dll
- Bisa baca konteks percakapan sebelumnya dan riwayat chat
- Bisa melihat dan menganalisis gambar/foto profil
- Bisa generate gambar sesuai permintaan

FUNGSI AYUMI:
1. Immersion Tracker
2. Novel Finder
3. Belajar Bahasa Jepang
4. Asisten Umum
5. Name Memory
6. Context Awareness
7. Image Analysis & Generation

GAYA BICARA:
- Hindari sok imut atau lebay
- Fokus membantu dengan suasana santai
- Gunakan referensi percakapan sebelumnya
- Gunakan bahasa yang profesional dan hindari kata-kata alay atau cringe
`;

// Function to get user's custom prompt from local file
function getUserCustomPrompt(userId) {
    const customPromptPath = path.join(__dirname, 'customPrompt', `${userId}.json`);
    
    try {
        if (fs.existsSync(customPromptPath)) {
            const userData = JSON.parse(fs.readFileSync(customPromptPath, 'utf8'));
            return userData.prompt || AYUMI_SYSTEM_PROMPT;
        }
        return AYUMI_SYSTEM_PROMPT; // fallback to default prompt
    } catch (error) {
        console.error(`Error reading custom prompt for user ${userId}:`, error);
        return AYUMI_SYSTEM_PROMPT; // fallback to default prompt
    }
}

// Function to save user's custom prompt to local file
function saveUserCustomPrompt(userId, prompt) {
    const customPromptPath = path.join(__dirname, 'customPrompt', `${userId}.json`);
    
    try {
        const userData = {
            userId: userId,
            prompt: prompt,
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync(customPromptPath, JSON.stringify(userData, null, 2));
        return true;
    } catch (error) {
        console.error(`Error saving custom prompt for user ${userId}:`, error);
        return false;
    }
}

// Function to fetch prompt from Rentry URL
async function fetchPromptFromRentry(rentryUrl) {
    try {
        // Extract the Rentry code from the URL
        const rentryCode = extractRentryCode(rentryUrl);
        if (!rentryCode) {
            throw new Error('Invalid Rentry URL');
        }
        
        // Fetch the Rentry page
        const response = await fetch(`https://rentry.co/${rentryCode}/raw`);
        if (!response.ok) {
            throw new Error(`Failed to fetch Rentry content: ${response.status}`);
        }
        
        const content = await response.text();
        return content.trim();
    } catch (error) {
        console.error('Error fetching from Rentry:', error);
        throw error;
    }
}

// Helper function to extract Rentry code from URL
function extractRentryCode(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'rentry.co' || urlObj.hostname === 'www.rentry.co') {
            // Extract the path (the code part after the domain)
            const pathParts = urlObj.pathname.split('/');
            return pathParts[pathParts.length - 1];
        }
        return null;
    } catch (error) {
        console.error('Invalid URL format:', error);
        return null;
    }
}

// Slash command for setting user prompt
const command = {
    data: new SlashCommandBuilder()
        .setName('userprompt')
        .setDescription('Set your custom prompt for Ayumi AI')
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('Rentry URL containing your custom prompt')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        const promptUrl = interaction.options.getString('prompt');
        
        try {
            // Validate that the input is a Rentry URL
            if (!promptUrl.includes('rentry.co')) {
                return await interaction.reply({
                    content: 'Please provide a valid Rentry URL (https://rentry.co/...)',
                    ephemeral: true
                });
            }
            
            await interaction.deferReply({ ephemeral: true });
            
            // Fetch the prompt content from Rentry
            let customPrompt;
            try {
                customPrompt = await fetchPromptFromRentry(promptUrl);
            } catch (error) {
                return await interaction.editReply({
                    content: `Error fetching prompt from Rentry: ${error.message}`,
                    ephemeral: true
                });
            }
            
            // Check if the fetched content is empty
            if (!customPrompt || customPrompt.trim().length === 0) {
                return await interaction.editReply({
                    content: 'The Rentry URL provided is empty or contains no content.',
                    ephemeral: true
                });
            }
            
            // Save the custom prompt to local file
            const saveSuccess = saveUserCustomPrompt(interaction.user.id, customPrompt);
            if (!saveSuccess) {
                return await interaction.editReply({
                    content: 'Error saving your custom prompt. Please try again.',
                    ephemeral: true
                });
            }
            
            // Send success message
            const successEmbed = new EmbedBuilder()
                .setColor(0x00ADEF)
                .setTitle('Custom Prompt Set Successfully!')
                .setDescription(`Your custom prompt has been saved and will be used in future conversations with Ayumi.`)
                .addFields(
                    { name: 'User', value: interaction.user.username, inline: true },
                    { name: 'Status', value: 'Active', inline: true }
                )
                .setTimestamp();
                
            await interaction.editReply({ embeds: [successEmbed], ephemeral: true });
            
        } catch (error) {
            console.error('Error in userprompt command:', error);
            await interaction.editReply({
                content: 'An error occurred while setting your custom prompt. Please try again.',
                ephemeral: true
            });
        }
    }
};

module.exports = {
    command,
    getUserCustomPrompt,
    saveUserCustomPrompt,
    fetchPromptFromRentry,
    AYUMI_SYSTEM_PROMPT
};
