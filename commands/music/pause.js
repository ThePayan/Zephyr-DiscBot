const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { miniEmbed, controlsRow, COLORS } = require('../../src/handlers/musicHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pausa la canción actual.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                embeds: [miniEmbed('🔇 No hay música sonando ahora mismo.', COLORS.error)],
                flags: MessageFlags.Ephemeral
            });
        }

        if (queue.node.isPaused()) {
            return interaction.reply({
                embeds: [miniEmbed('⏸️ La música ya está pausada. Usa `/resume` para reanudarla.')],
                flags: MessageFlags.Ephemeral
            });
        }

        queue.node.setPaused(true);
        queue.metadata?.nowPlaying?.edit({ components: [controlsRow(true)] }).catch(() => {});

        return interaction.reply({
            embeds: [miniEmbed(`⏸️ ${interaction.user} ha pausado la música.`)]
        });
    }
};
