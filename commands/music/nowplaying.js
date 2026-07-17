const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { miniEmbed, COLORS } = require('../../src/handlers/musicHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Muestra la canción que está sonando y su progreso.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                embeds: [miniEmbed('🔇 No hay música sonando ahora mismo.', COLORS.error)],
                flags: MessageFlags.Ephemeral
            });
        }

        const track = queue.currentTrack;
        const progressBar = queue.node.createProgressBar() || '';

        const embed = new EmbedBuilder()
            .setColor(COLORS.playing)
            .setAuthor({ name: queue.node.isPaused() ? '⏸️ En pausa' : '🎶 Sonando ahora' })
            .setTitle(track.title)
            .setURL(track.url)
            .setThumbnail(track.thumbnail)
            .setDescription(progressBar)
            .addFields(
                { name: '🎤 Artista', value: track.author || 'Desconocido', inline: true },
                { name: '🙋 Pedida por', value: `${track.requestedBy ?? '—'}`, inline: true },
                { name: '🔊 Volumen', value: `${queue.node.volume}%`, inline: true }
            );

        return interaction.reply({ embeds: [embed] });
    }
};
