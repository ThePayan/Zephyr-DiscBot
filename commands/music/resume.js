const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { miniEmbed, controlsRow, COLORS } = require('../../src/handlers/musicHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Reanuda la canción pausada.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                embeds: [miniEmbed('🔇 No hay música sonando ahora mismo.', COLORS.error)],
                flags: MessageFlags.Ephemeral
            });
        }

        if (!queue.node.isPaused()) {
            return interaction.reply({
                embeds: [miniEmbed('▶️ La música ya está sonando.')],
                flags: MessageFlags.Ephemeral
            });
        }

        queue.node.setPaused(false);
        queue.metadata?.nowPlaying?.edit({ components: [controlsRow(false)] }).catch(() => {});

        return interaction.reply({
            embeds: [miniEmbed(`▶️ ${interaction.user} ha reanudado la música.`)]
        });
    }
};
