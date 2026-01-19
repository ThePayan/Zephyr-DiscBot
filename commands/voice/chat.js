const { SlashCommandBuilder } = require('discord.js');
const logger = require('../../src/utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chat')
        .setDescription('Activates conversational AI mode.'),
    async execute(interaction) {
        const voiceHandler = interaction.client.voiceHandler;

        if (!voiceHandler) {
            await interaction.reply({ content: 'Bot is not ready.', ephemeral: true });
            return;
        }
        voiceHandler.setChatMode(true); 

        logger.info(`Chat mode activated`);
        await interaction.reply({ content: '💬 **Chat Mode Activated!**\nLet\'s talk! I\'m listening.', ephemeral: true });
    },
};
