const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { miniEmbed, queueEmbed, COLORS } = require('../../src/handlers/musicHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Shows the playback queue.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                embeds: [miniEmbed('🔇 There is no music playing right now.', COLORS.error)],
                flags: MessageFlags.Ephemeral
            });
        }

        return interaction.reply({ embeds: [queueEmbed(queue)] });
    }
};
