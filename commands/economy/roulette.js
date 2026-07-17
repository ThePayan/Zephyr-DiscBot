const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const economy = require('../../src/services/economyService');

const MIN_BET = 10;
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function colorOf(n) {
    if (n === 0) return 'green';
    return RED_NUMBERS.has(n) ? 'red' : 'black';
}

const COLOR_EMOJI = { red: '🔴', black: '⚫', green: '🟢' };

// Returns the total-return multiplier for a winning bet (0 = lost)
function payoutFor(type, number, result) {
    const color = colorOf(result);
    switch (type) {
        case 'red': return color === 'red' ? 2 : 0;
        case 'black': return color === 'black' ? 2 : 0;
        case 'green': return result === 0 ? 36 : 0;
        case 'even': return result !== 0 && result % 2 === 0 ? 2 : 0;
        case 'odd': return result % 2 === 1 ? 2 : 0;
        case 'dozen1': return result >= 1 && result <= 12 ? 3 : 0;
        case 'dozen2': return result >= 13 && result <= 24 ? 3 : 0;
        case 'dozen3': return result >= 25 && result <= 36 ? 3 : 0;
        case 'number': return result === number ? 36 : 0;
        default: return 0;
    }
}

const BET_LABELS = {
    red: '🔴 Red (x2)', black: '⚫ Black (x2)', green: '🟢 Green / 0 (x36)',
    even: 'Even (x2)', odd: 'Odd (x2)',
    dozen1: '1st dozen 1-12 (x3)', dozen2: '2nd dozen 13-24 (x3)', dozen3: '3rd dozen 25-36 (x3)',
    number: 'Exact number (x36)'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Play European roulette.')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription(`Coins to bet (minimum ${MIN_BET})`)
                .setMinValue(MIN_BET)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('What are you betting on?')
                .setRequired(true)
                .addChoices(
                    { name: '🔴 Red (x2)', value: 'red' },
                    { name: '⚫ Black (x2)', value: 'black' },
                    { name: '🟢 Green / 0 (x36)', value: 'green' },
                    { name: 'Even (x2)', value: 'even' },
                    { name: 'Odd (x2)', value: 'odd' },
                    { name: '1st dozen · 1-12 (x3)', value: 'dozen1' },
                    { name: '2nd dozen · 13-24 (x3)', value: 'dozen2' },
                    { name: '3rd dozen · 25-36 (x3)', value: 'dozen3' },
                    { name: '🎯 Exact number (x36)', value: 'number' }
                ))
        .addIntegerOption(option =>
            option.setName('number')
                .setDescription('The number (0-36), only when betting on an exact number')
                .setMinValue(0)
                .setMaxValue(36)
                .setRequired(false)),
    async execute(interaction) {
        const userId = interaction.user.id;
        economy.ensureUser(userId, interaction.user.username);
        const bet = interaction.options.getInteger('bet', true);
        const type = interaction.options.getString('type', true);
        const number = interaction.options.getInteger('number');

        if (type === 'number' && number === null) {
            return interaction.reply({
                content: '🎯 When betting on an exact number you must provide the `number` (0-36).',
                flags: MessageFlags.Ephemeral
            });
        }

        if (!economy.tryDebit(userId, bet)) {
            const { coins } = economy.getUser(userId);
            return interaction.reply({
                content: `💸 You don't have enough coins. Balance: **${economy.fmt(coins)}** (don't forget \`/daily\`).`,
                flags: MessageFlags.Ephemeral
            });
        }

        const result = Math.floor(Math.random() * 37); // 0-36
        const multiplier = payoutFor(type, number, result);
        const payout = bet * multiplier;
        if (payout > 0) economy.addCoins(userId, payout);
        economy.recordGame(userId, payout > 0);

        const betLabel = type === 'number' ? `🎯 Number ${number} (x36)` : BET_LABELS[type];

        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(0x5865f2)
                .setAuthor({ name: '🎡 Roulette', iconURL: interaction.user.displayAvatarURL() })
                .setDescription(`Bet: **${betLabel}** · ${economy.fmt(bet)}\n\n# 🎡\n*The ball is spinning...*`)]
        });
        await sleep(2000);

        const { coins } = economy.getUser(userId);
        const resultText = payout > 0
            ? `🎉 **You win ${economy.fmt(payout - bet)}!** (x${multiplier})`
            : `😔 You lose **${economy.fmt(bet)}**`;

        const embed = new EmbedBuilder()
            .setColor(payout > 0 ? 0x57f287 : 0xed4245)
            .setAuthor({ name: '🎡 Roulette', iconURL: interaction.user.displayAvatarURL() })
            .setDescription(
                `Bet: **${betLabel}** · ${economy.fmt(bet)}\n\n` +
                `# ${COLOR_EMOJI[colorOf(result)]} ${result}\n${resultText}`
            )
            .setFooter({ text: `Balance: ${coins.toLocaleString('en-US')} coins` });

        return interaction.editReply({ embeds: [embed] });
    }
};
