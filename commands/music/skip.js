const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { miniEmbed, COLORS } = require('../../src/handlers/musicHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Salta a la siguiente canción de la cola.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                embeds: [miniEmbed('🔇 No hay música sonando ahora mismo.', COLORS.error)],
                flags: MessageFlags.Ephemeral
            });
        }

        const skipped = queue.currentTrack;
        queue.node.skip();

        return interaction.reply({
            embeds: [miniEmbed(`⏭️ ${interaction.user} ha saltado **${skipped.title}**.`)]
        });
    }
};
