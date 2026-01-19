const { SlashCommandBuilder } = require('discord.js');
// Path relative from commands/voice/join.js to src/utils/logger.js
const logger = require('../../src/utils/logger'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Joins your voice channel and starts listening to you.'),
    async execute(interaction) {
        const member = interaction.member;
        // Access the shared voiceHandler attached to the client
        const voiceHandler = interaction.client.voiceHandler;

        if (!voiceHandler) {
            await interaction.reply({ content: 'Voice handler is not initialized!', ephemeral: true });
            return;
        }

        if (member.voice.channel) {
            logger.info(`Requested to join channel: ${member.voice.channel.name}`);
            
            // Make the thinking state and subsequent reply ephemeral
            await interaction.deferReply({ ephemeral: true });

            try {
                await voiceHandler.joinChannel(member.voice.channel);
                await interaction.editReply(`Joined ${member.voice.channel.name}! I'm listening...`);
            } catch(err) {
                logger.error("Failed to join channel", err);
                await interaction.editReply("Failed to join voice channel.");
            }
        } else {
            await interaction.reply({ content: 'You need to be in a voice channel first!', ephemeral: true });
        }
    },
};
