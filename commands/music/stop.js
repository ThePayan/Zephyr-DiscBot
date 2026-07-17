const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { miniEmbed, COLORS } = require('../../src/handlers/musicHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops the music, clears the queue and disconnects the bot.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue) {
            return interaction.reply({
                embeds: [miniEmbed('🔇 There is no music playing right now.', COLORS.error)],
                flags: MessageFlags.Ephemeral
            });
        }

        const meta = queue.metadata;
        if (meta?.nowPlaying) {
            meta.nowPlaying.edit({ components: [] }).catch(() => {});
            meta.nowPlaying = null;
        }
        queue.delete();

        return interaction.reply({
            embeds: [miniEmbed(`⏹️ ${interaction.user} stopped the music and cleared the queue.`)]
        });
    }
};
