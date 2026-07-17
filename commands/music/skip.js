const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { miniEmbed, COLORS } = require('../../src/handlers/musicHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips to the next song in the queue.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                embeds: [miniEmbed('🔇 There is no music playing right now.', COLORS.error)],
                flags: MessageFlags.Ephemeral
            });
        }

        const skipped = queue.currentTrack;
        queue.node.skip();

        return interaction.reply({
            embeds: [miniEmbed(`⏭️ ${interaction.user} skipped **${skipped.title}**.`)]
        });
    }
};
