const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const economy = require('../../src/services/economyService');

const MIN_BET = 10;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Bet on heads or tails: double or nothing.')
        .addStringOption(option =>
            option.setName('side')
                .setDescription('Heads or tails?')
                .setRequired(true)
                .addChoices(
                    { name: '🪙 Heads', value: 'heads' },
                    { name: '✖️ Tails', value: 'tails' }
                ))
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription(`Coins to bet (minimum ${MIN_BET})`)
                .setMinValue(MIN_BET)
                .setRequired(true)),
    async execute(interaction) {
        const userId = interaction.user.id;
        economy.ensureUser(userId, interaction.user.username);
        const bet = interaction.options.getInteger('bet', true);
        const pick = interaction.options.getString('side', true);

        if (!economy.tryDebit(userId, bet)) {
            const { coins } = economy.getUser(userId);
            return interaction.reply({
                content: `💸 You don't have enough coins. Balance: **${economy.fmt(coins)}** (don't forget \`/daily\`).`,
                flags: MessageFlags.Ephemeral
            });
        }

        const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = outcome === pick;
        if (won) economy.addCoins(userId, bet * 2);
        economy.recordGame(userId, won);

        const { coins } = economy.getUser(userId);
        const embed = new EmbedBuilder()
            .setColor(won ? 0x57f287 : 0xed4245)
            .setAuthor({ name: '🪙 Coinflip', iconURL: interaction.user.displayAvatarURL() })
            .setDescription(
                `The coin lands on... **${outcome === 'heads' ? '🪙 HEADS' : '✖️ TAILS'}**\n\n` +
                (won
                    ? `🎉 You called it! You win **${economy.fmt(bet)}**`
                    : `😔 You picked **${pick}**... you lose **${economy.fmt(bet)}**`)
            )
            .setFooter({ text: `Balance: ${coins.toLocaleString('en-US')} coins` });

        return interaction.reply({ embeds: [embed] });
    }
};
