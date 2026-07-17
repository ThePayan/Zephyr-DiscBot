const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { miniEmbed, controlsRow, COLORS } = require('../../src/handlers/musicHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resumes the paused song.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                embeds: [miniEmbed('🔇 There is no music playing right now.', COLORS.error)],
                flags: MessageFlags.Ephemeral
            });
        }

        if (!queue.node.isPaused()) {
            return interaction.reply({
                embeds: [miniEmbed('▶️ The music is already playing.')],
                flags: MessageFlags.Ephemeral
            });
        }

        queue.node.setPaused(false);
        queue.metadata?.nowPlaying?.edit({ components: [controlsRow(false)] }).catch(() => {});

        return interaction.reply({
            embeds: [miniEmbed(`▶️ ${interaction.user} resumed the music.`)]
        });
    }
};
