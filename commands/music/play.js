const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { useMainPlayer } = require('discord-player');
const logger = require('../../src/utils/logger');
const { miniEmbed, COLORS } = require('../../src/handlers/musicHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Searches for a song and plays it or adds it to the queue.')
        .addStringOption(option =>
            option.setName('song')
                .setDescription('Song name or YouTube URL')
                .setRequired(true)),
    async execute(interaction) {
        const player = useMainPlayer();
        const voiceChannel = interaction.member.voice?.channel;

        if (!voiceChannel) {
            return interaction.reply({
                embeds: [miniEmbed('🔇 You need to be in a voice channel to request music.', COLORS.error)],
                flags: MessageFlags.Ephemeral
            });
        }

        const query = interaction.options.getString('song', true);
        await interaction.deferReply();

        try {
            const { track, queue } = await player.play(voiceChannel, query, {
                requestedBy: interaction.user,
                nodeOptions: {
                    metadata: { channel: interaction.channel },
                    volume: 60,
                    selfDeaf: true,
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 60_000,
                    leaveOnEnd: true,
                    leaveOnEndCooldown: 120_000
                }
            });

            // -1 means it's not waiting in the queue (it became the current track)
            const position = queue.node.getTrackPosition(track) + 1;

            const embed = new EmbedBuilder()
                .setColor(COLORS.added)
                .setAuthor({
                    name: position > 0 ? `Added to the queue · position ${position}` : 'Starting to play!',
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setDescription(`**[${track.title}](${track.url})**`)
                .setThumbnail(track.thumbnail)
                .addFields(
                    { name: '🎤 Artist', value: track.author || 'Unknown', inline: true },
                    { name: '⏱️ Duration', value: track.duration || '—', inline: true }
                );

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error in /play:', error);
            const message = error.code === 'ERR_NO_RESULT'
                ? `🔍 No results found for **${query}**.`
                : '⚠️ There was an error trying to play that song.';
            return interaction.editReply({ embeds: [miniEmbed(message, COLORS.error)] });
        }
    }
};
