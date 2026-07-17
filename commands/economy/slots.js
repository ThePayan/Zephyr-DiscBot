const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const economy = require('../../src/services/economyService');

const MIN_BET = 10;

// Weighted reel: common symbols appear more often
const REEL = ['🍒', '🍒', '🍒', '🍒', '🍋', '🍋', '🍋', '🍇', '🍇', '🔔', '🔔', '💎', '7️⃣'];

// Total-return multiplier for three of a kind
const TRIPLE_PAYOUT = { '🍒': 4, '🍋': 6, '🍇': 10, '🔔': 15, '💎': 30, '7️⃣': 75 };
const PAIR_PAYOUT = 1.5;

const spin = () => REEL[Math.floor(Math.random() * REEL.length)];
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Try your luck on the slot machine.')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription(`Coins to bet (minimum ${MIN_BET})`)
                .setMinValue(MIN_BET)
                .setRequired(true)),
    async execute(interaction) {
        const userId = interaction.user.id;
        economy.ensureUser(userId, interaction.user.username);
        const bet = interaction.options.getInteger('bet', true);

        if (!economy.tryDebit(userId, bet)) {
            const { coins } = economy.getUser(userId);
            return interaction.reply({
                content: `💸 You don't have enough coins. Balance: **${economy.fmt(coins)}** (don't forget \`/daily\`).`,
                flags: MessageFlags.Ephemeral
            });
        }

        const reels = [spin(), spin(), spin()];

        let payout = 0;
        if (reels[0] === reels[1] && reels[1] === reels[2]) {
            payout = bet * TRIPLE_PAYOUT[reels[0]];
        } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
            payout = Math.floor(bet * PAIR_PAYOUT);
        }
        if (payout > 0) economy.addCoins(userId, payout);
        economy.recordGame(userId, payout > bet);

        // Little spin animation
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(0x5865f2)
                .setAuthor({ name: '🎰 Slots', iconURL: interaction.user.displayAvatarURL() })
                .setDescription('# 🎲 | 🎲 | 🎲\n*Spinning...*')]
        });
        await sleep(1200);

        const { coins } = economy.getUser(userId);
        const net = payout - bet;
        const resultText = payout === 0
            ? `😔 Nothing... you lose **${economy.fmt(bet)}**`
            : payout > bet
                ? `🎉 **JACKPOT!** You win **${economy.fmt(net)}** (x${(payout / bet).toLocaleString('en-US')})`
                : `😅 A pair: you get part back, you only lose **${economy.fmt(-net)}**`;

        const embed = new EmbedBuilder()
            .setColor(payout > bet ? 0x57f287 : payout > 0 ? 0xfee75c : 0xed4245)
            .setAuthor({ name: '🎰 Slots', iconURL: interaction.user.displayAvatarURL() })
            .setDescription(`# ${reels.join(' | ')}\n${resultText}`)
            .setFooter({ text: `Balance: ${coins.toLocaleString('en-US')} coins` });

        return interaction.editReply({ embeds: [embed] });
    }
};
