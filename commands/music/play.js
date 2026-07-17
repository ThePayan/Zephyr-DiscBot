const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { useMainPlayer } = require('discord-player');
const logger = require('../../src/utils/logger');
const { miniEmbed, COLORS } = require('../../src/handlers/musicHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Busca una canción y la reproduce o la añade a la cola.')
        .addStringOption(option =>
            option.setName('nombre')
                .setDescription('Nombre de la canción o URL de YouTube')
                .setRequired(true)),
    async execute(interaction) {
        const player = useMainPlayer();
        const voiceChannel = interaction.member.voice?.channel;

        if (!voiceChannel) {
            return interaction.reply({
                embeds: [miniEmbed('🔇 Tienes que estar en un canal de voz para pedir música.', COLORS.error)],
                flags: MessageFlags.Ephemeral
            });
        }

        const query = interaction.options.getString('nombre', true);
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
                    name: position > 0 ? `Añadida a la cola · posición ${position}` : '¡Empezando a sonar!',
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setDescription(`**[${track.title}](${track.url})**`)
                .setThumbnail(track.thumbnail)
                .addFields(
                    { name: '🎤 Artista', value: track.author || 'Desconocido', inline: true },
                    { name: '⏱️ Duración', value: track.duration || '—', inline: true }
                );

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error en /play:', error);
            const message = error.code === 'ERR_NO_RESULT'
                ? `🔍 No encontré resultados para **${query}**.`
                : '⚠️ Hubo un error intentando reproducir esa canción.';
            return interaction.editReply({ embeds: [miniEmbed(message, COLORS.error)] });
        }
    }
};
