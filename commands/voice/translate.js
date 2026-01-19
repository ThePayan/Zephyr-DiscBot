const { SlashCommandBuilder } = require('discord.js');
const logger = require('../../src/utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate')
        .setDescription('Toggles live translation mode.')
        .addStringOption(option =>
            option.setName('target')
                .setDescription('Target language (e.g. English)')
                .setRequired(true)
                .addChoices(
                    { name: '🇬🇧 English', value: 'English' },
                    { name: '🇪🇸 Spanish', value: 'Spanish' },
                    { name: '🇫🇷 French', value: 'French' },
                    { name: '🇩🇪 German', value: 'German' },
                    { name: '🇯🇵 Japanese', value: 'Japanese' }
                ))
        .addStringOption(option =>
            option.setName('source')
                .setDescription('Source/Secondary language (Default: Spanish)')
                .setRequired(false)
                .addChoices(
                    { name: '🇪🇸 Spanish', value: 'Spanish' },
                    { name: '🇬🇧 English', value: 'English' },
                    { name: '🇫🇷 French', value: 'French' },
                    { name: '🇩🇪 German', value: 'German' }
                )),
    async execute(interaction) {
        const voiceHandler = interaction.client.voiceHandler;
        const targetLang = interaction.options.getString('target');
        const sourceLang = interaction.options.getString('source') || 'Spanish'; // Default to Spanish

        if (!voiceHandler) {
            await interaction.reply({ content: 'Bot is not ready.', ephemeral: true });
            return;
        }

        // Toggle state
        voiceHandler.setTranslatorMode(true, targetLang, sourceLang);

        logger.info(`Translation mode activated: ${sourceLang} <-> ${targetLang}`);
        await interaction.reply(`🌍 **Bidirectional Translation Activated!**\nTranslating between **${sourceLang}** and **${targetLang}**.`);
    },
};
