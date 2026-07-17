const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { miniEmbed, queueEmbed, COLORS } = require('../../src/handlers/musicHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Muestra la cola de reproducción.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                embeds: [miniEmbed('🔇 No hay música sonando ahora mismo.', COLORS.error)],
                flags: MessageFlags.Ephemeral
            });
        }

        return interaction.reply({ embeds: [queueEmbed(queue)] });
    }
};
