const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { miniEmbed, controlsRow, COLORS } = require('../../src/handlers/musicHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pauses the current song.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                embeds: [miniEmbed('🔇 There is no music playing right now.', COLORS.error)],
                flags: MessageFlags.Ephemeral
            });
        }

        if (queue.node.isPaused()) {
            return interaction.reply({
                embeds: [miniEmbed('⏸️ The music is already paused. Use `/resume` to resume it.')],
                flags: MessageFlags.Ephemeral
            });
        }

        queue.node.setPaused(true);
        queue.metadata?.nowPlaying?.edit({ components: [controlsRow(true)] }).catch(() => {});

        return interaction.reply({
            embeds: [miniEmbed(`⏸️ ${interaction.user} paused the music.`)]
        });
    }
};
