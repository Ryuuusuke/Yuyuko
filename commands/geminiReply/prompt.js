const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const CustomPromptManager = require('./customPromptManager');
const { AYUMI_SYSTEM_PROMPT } = require('./geminiSystemPrompt');

const customPromptManager = new CustomPromptManager();

const command = {
    data: new SlashCommandBuilder()
        .setName('prompt')
        .setDescription('Manage your custom prompt for Ayumi AI'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        
        try {
            // Create buttons for the different prompt actions
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('prompt_set')
                        .setLabel('Set Prompt')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('prompt_view')
                        .setLabel('View Prompt')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('prompt_delete')
                        .setLabel('Delete Prompt')
                        .setStyle(ButtonStyle.Danger)
                );

            const initialEmbed = new EmbedBuilder()
                .setColor(0x00ADEF)
                .setTitle('Ayumi Custom Prompt Manager')
                .setDescription('Choose an action to manage your custom prompt:')
                .addFields(
                    { name: 'Set Prompt', value: 'Set a new custom prompt using a Rentry URL', inline: true },
                    { name: 'View Prompt', value: 'View your current custom prompt', inline: true },
                    { name: 'Delete Prompt', value: 'Delete your custom prompt and revert to default', inline: true }
                )
                .setTimestamp();

            const message = await interaction.reply({ 
                embeds: [initialEmbed], 
                components: [row],
                flags: 64
            });

            // Create a collector to handle button interactions
            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === userId,
                time: 60000 // 1 minute timeout
            });

            collector.on('collect', async i => {
                if (i.customId === 'prompt_set') {
                    // Handle set prompt action
                    await i.showModal({
                        customId: 'setPromptModal',
                        title: 'Set Custom Prompt',
                        components: [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 4,
                                        customId: 'rentryUrl',
                                        label: 'Rentry URL',
                                        style: 1,
                                        placeholder: 'https://rentry.co/your-prompt-here',
                                        required: true,
                                        maxLength: 200
                                    }
                                ]
                            }
                        ]
                    });
                } else if (i.customId === 'prompt_view') {
                    // Handle view prompt action
                    const customPrompt = customPromptManager.getUserCustomPrompt(userId);
                    
                    let embed;
                    if (customPrompt) {
                        // User has a custom prompt
                        const displayPrompt = customPrompt.length > 100 
                            ? customPrompt.substring(0, 1000) + '...' 
                            : customPrompt;
                        
                        embed = customPromptManager.createSuccessEmbed(
                            'Your Custom Prompt',
                            `Here is your current custom prompt for Ayumi AI:`,
                            [
                                { name: 'Status', value: 'Active', inline: true },
                                { name: 'Prompt Content', value: `\`\`\`${displayPrompt}\`\`\``, inline: false }
                            ]
                        );
                    } else {
                        // User doesn't have a custom prompt, show default
                        const displayPrompt = AYUMI_SYSTEM_PROMPT.length > 1000 
                            ? AYUMI_SYSTEM_PROMPT.substring(0, 1000) + '...' 
                            : AYUMI_SYSTEM_PROMPT;
                        
                        embed = new EmbedBuilder()
                            .setColor(0x00ADEF)
                            .setTitle('Ayumi Default Prompt')
                            .setDescription('You currently don\'t have a custom prompt set. Ayumi is using the default system prompt.')
                            .addFields(
                                { name: 'Status', value: 'Using Default', inline: true },
                                { name: 'Default Prompt Content', value: `\`\`\`${displayPrompt}\`\`\``, inline: false }
                            )
                            .setTimestamp();
                    }
                    
                    await i.reply({ embeds: [embed], flags: 64 });
                } else if (i.customId === 'prompt_delete') {
                    // Handle delete prompt action
                    const hasCustomPrompt = customPromptManager.getUserCustomPrompt(userId) !== null;
                    
                    if (!hasCustomPrompt) {
                        const embed = customPromptManager.createErrorEmbed(
                            'No Custom Prompt Found', 
                            'You don\'t have a custom prompt set. You are already using the default Ayumi AI prompt.'
                        );
                        return await i.reply({ embeds: [embed], flags: 64 });
                    }
                    
                    // Delete the user's custom prompt
                    const deleteSuccess = customPromptManager.deleteUserCustomPrompt(userId);
                    
                    if (!deleteSuccess) {
                        const embed = customPromptManager.createErrorEmbed(
                            'Error Deleting Prompt', 
                            'An error occurred while deleting your custom prompt. Please try again.'
                        );
                        return await i.reply({ embeds: [embed], flags: 64 });
                    }
                    
                    // Send success message
                    const successEmbed = customPromptManager.createSuccessEmbed(
                        'Custom Prompt Deleted Successfully!',
                        `Your custom prompt has been deleted. Ayumi will now use the default system prompt for your conversations.`,
                        [
                            { name: 'User', value: i.user.username, inline: true },
                            { name: 'Status', value: 'Reverted to Default', inline: true }
                        ]
                    );
                        
                    await i.reply({ embeds: [successEmbed], flags: 64 });
                }
            });

            collector.on('end', () => {
                // Disable buttons after timeout
                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prompt_set')
                            .setLabel('Set Prompt')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('prompt_view')
                            .setLabel('View Prompt')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('prompt_delete')
                            .setLabel('Delete Prompt')
                            .setStyle(ButtonStyle.Danger)
                            .setDisabled(true)
                    );
                
                interaction.editReply({ components: [disabledRow] }).catch(console.error);
            });

        } catch (error) {
            console.error('Error in prompt command:', error);
            const embed = customPromptManager.createErrorEmbed(
                'Unexpected Error', 
                'An error occurred while managing your custom prompt. Please try again.'
            );
            await interaction.reply({ embeds: [embed], flags: 64 });
        }
    }
};

module.exports = command;
