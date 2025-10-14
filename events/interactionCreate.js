const { InteractionType, Events, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const CustomPromptManager = require('../commands/geminiReply/customPromptManager');
const { AYUMI_SYSTEM_PROMPT } = require('../commands/geminiReply/geminiSystemPrompt');

const customPromptManager = new CustomPromptManager();

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Handle modal submissions
        if (interaction.type === InteractionType.ModalSubmit) {
            if (interaction.customId === 'setPromptModal') {
                const rentryUrl = interaction.fields.getTextInputValue('rentryUrl');
                const userId = interaction.user.id;

                try {
                    // Check rate limit
                    const rateLimitCheck = customPromptManager.isRateLimited(userId);
                    if (rateLimitCheck.limited) {
                        const embed = customPromptManager.createRateLimitEmbed(rateLimitCheck.timeLeft);
                        if (!interaction.replied && !interaction.deferred) {
                            return await interaction.reply({ embeds: [embed], flags: 64 });
                        } else {
                            return;
                        }
                    }

                    // Validate that the input is a Rentry URL
                    if (!customPromptManager.isValidRentryUrl(rentryUrl)) {
                        const embed = customPromptManager.createErrorEmbed(
                            'Invalid Rentry URL', 
                            'Please provide a valid Rentry URL (https://rentry.co/...)'
                        );
                        if (!interaction.replied && !interaction.deferred) {
                            return await interaction.reply({ embeds: [embed], flags: 64 });
                        } else {
                            return;
                        }
                    }
                    
                    await interaction.deferReply({ flags: 64 });
                    
                    // Fetch the prompt content from Rentry
                    let customPrompt;
                    try {
                        customPrompt = await customPromptManager.fetchPromptFromRentry(rentryUrl);
                    } catch (error) {
                        const embed = customPromptManager.createErrorEmbed(
                            'Error Fetching Prompt', 
                            `Error fetching prompt from Rentry: ${error.message}`
                        );
                        return await interaction.editReply({ embeds: [embed], flags: 64 });
                    }
                    
                    // Validate the fetched content
                    const validation = customPromptManager.validatePromptContent(customPrompt);
                    if (!validation.valid) {
                        const embed = customPromptManager.createErrorEmbed(
                            'Invalid Prompt Content', 
                            validation.error
                        );
                        return await interaction.editReply({ embeds: [embed], flags: 64 });
                    }
                    
                    // Check if the fetched content is empty
                    if (!customPrompt || customPrompt.trim().length === 0) {
                        const embed = customPromptManager.createErrorEmbed(
                            'Empty Prompt', 
                            'The Rentry URL provided is empty or contains no content.'
                        );
                        return await interaction.editReply({ embeds: [embed], flags: 64 });
                    }
                    
                    // Save the custom prompt to local file
                    const saveSuccess = customPromptManager.saveUserCustomPrompt(userId, customPrompt);
                    if (!saveSuccess) {
                        const embed = customPromptManager.createErrorEmbed(
                            'Error Saving Prompt', 
                            'Error saving your custom prompt. Please try again.'
                        );
                        return await interaction.editReply({ embeds: [embed], flags: 64 });
                    }
                    
                    // Truncate prompt for display if too long
                    const displayPrompt = customPrompt.length > 100 
                        ? customPrompt.substring(0, 100) + '...' 
                        : customPrompt;
                    
                    // Send success message
                    const successEmbed = customPromptManager.createSuccessEmbed(
                        'Custom Prompt Set Successfully!',
                        `Your custom prompt has been saved and will be used in future conversations with Ayumi.`,
                        [
                            { name: 'User', value: interaction.user.username, inline: true },
                            { name: 'Status', value: 'Active', inline: true },
                            { name: 'Prompt Preview', value: `\`\`\`${displayPrompt}\`\`\``, inline: false }
                        ]
                    );
                        
                    await interaction.editReply({ embeds: [successEmbed], flags: 64 });
                    
                } catch (error) {
                    console.error('Error in setprompt modal:', error);
                    if (!interaction.replied && !interaction.deferred) {
                        const embed = customPromptManager.createErrorEmbed(
                            'Unexpected Error', 
                            'An error occurred while setting your custom prompt. Please try again.'
                        );
                        await interaction.reply({ embeds: [embed], flags: 64 });
                    } else {
                        const embed = customPromptManager.createErrorEmbed(
                            'Unexpected Error', 
                            'An error occurred while setting your custom prompt. Please try again.'
                        );
                        await interaction.editReply({ embeds: [embed], flags: 64 });
                    }
                }
            }
        }
    },
};
