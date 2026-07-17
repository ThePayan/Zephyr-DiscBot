const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { miniEmbed, COLORS } = require('../../src/handlers/musicHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Shows the current song and its progress.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                embeds: [miniEmbed('🔇 There is no music playing right now.', COLORS.error)],
                flags: MessageFlags.Ephemeral
            });
        }

        const track = queue.currentTrack;
        const progressBar = queue.node.createProgressBar() || '';

        const embed = new EmbedBuilder()
            .setColor(COLORS.playing)
            .setAuthor({ name: queue.node.isPaused() ? '⏸️ Paused' : '🎶 Now playing' })
            .setTitle(track.title)
            .setURL(track.url)
            .setThumbnail(track.thumbnail)
            .setDescription(progressBar)
            .addFields(
                { name: '🎤 Artist', value: track.author || 'Unknown', inline: true },
                { name: '🙋 Requested by', value: `${track.requestedBy ?? '—'}`, inline: true },
                { name: '🔊 Volume', value: `${queue.node.volume}%`, inline: true }
            );

        return interaction.reply({ embeds: [embed] });
    }
};
