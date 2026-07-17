const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../../src/services/economyService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Shows your coins (or another user\'s).')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check')
                .setRequired(false)),
    async execute(interaction) {
        economy.ensureUser(interaction.user.id, interaction.user.username);

        const target = interaction.options.getUser('user') ?? interaction.user;
        const user = economy.ensureUser(target.id, target.username);
        const rank = economy.rank(target.id);
        const winRate = user.games_played > 0
            ? Math.round((user.games_won / user.games_played) * 100)
            : null;

        const embed = new EmbedBuilder()
            .setColor(0xfee75c)
            .setAuthor({ name: `💼 ${target.username}'s wallet`, iconURL: target.displayAvatarURL() })
            .addFields(
                { name: '🪙 Coins', value: `**${user.coins.toLocaleString('en-US')}**`, inline: true },
                { name: '🏆 Rank', value: rank ? `#${rank}` : '—', inline: true },
                { name: '🎲 Games', value: user.games_played > 0
                    ? `${user.games_won}/${user.games_played} won (${winRate}%)`
                    : 'None yet', inline: true }
            );

        return interaction.reply({ embeds: [embed] });
    }
};
