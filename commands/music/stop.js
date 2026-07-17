const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useQueue } = require('discord-player');
const { miniEmbed, COLORS } = require('../../src/handlers/musicHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Para la música, vacía la cola y desconecta el bot.'),
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue) {
            return interaction.reply({
                embeds: [miniEmbed('🔇 No hay música sonando ahora mismo.', COLORS.error)],
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
            embeds: [miniEmbed(`⏹️ ${interaction.user} ha parado la música y vaciado la cola.`)]
        });
    }
};
