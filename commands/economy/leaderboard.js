const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../../src/services/economyService');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Top 10 users with the most coins, plus your position.'),
    async execute(interaction) {
        const me = economy.ensureUser(interaction.user.id, interaction.user.username);
        const top = economy.top(10);
        const myRank = economy.rank(interaction.user.id);

        const lines = top.map((u, i) => {
            const medal = MEDALS[i] ?? `**${i + 1}.**`;
            const name = u.id === interaction.user.id ? `**${u.username ?? 'Unknown'}** ← you` : (u.username ?? 'Unknown');
            return `${medal} ${name} — ${economy.fmt(u.coins)}`;
        });

        const embed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setAuthor({ name: '🏆 Global coin leaderboard' })
            .setDescription(lines.length > 0 ? lines.join('\n') : 'Nobody is on the leaderboard yet. Use `/daily` to get started!')
            .setFooter({ text: `Your position: #${myRank} · ${me.coins.toLocaleString('en-US')} coins` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
