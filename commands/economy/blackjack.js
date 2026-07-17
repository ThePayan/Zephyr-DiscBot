const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MessageFlags
} = require('discord.js');
const economy = require('../../src/services/economyService');

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const MIN_BET = 10;

// One game at a time per user (bets are debited up-front)
const activeGames = new Set();

function newDeck() {
    const deck = [];
    for (const suit of SUITS) for (const rank of RANKS) deck.push({ rank, suit });
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function handValue(cards) {
    let value = 0;
    let aces = 0;
    for (const card of cards) {
        if (card.rank === 'A') { value += 11; aces++; }
        else if (['J', 'Q', 'K'].includes(card.rank)) value += 10;
        else value += Number(card.rank);
    }
    while (value > 21 && aces > 0) { value -= 10; aces--; }
    return value;
}

function fmtHand(cards) {
    return cards.map(c => `\`${c.rank}${c.suit}\``).join(' ');
}

function buttonsRow(canDouble, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setEmoji('🃏').setStyle(ButtonStyle.Primary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setEmoji('✋').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('bj_double').setLabel('Double down').setEmoji('⏫').setStyle(ButtonStyle.Success).setDisabled(disabled || !canDouble)
    );
}

function gameEmbed(game, { revealDealer = false, status = null, color = 0x5865f2 } = {}) {
    const dealerShown = revealDealer
        ? `${fmtHand(game.dealer)} → **${handValue(game.dealer)}**`
        : `\`${game.dealer[0].rank}${game.dealer[0].suit}\` \`🂠\` → **?**`;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: `🃏 Blackjack · bet ${game.totalBet.toLocaleString('en-US')} 🪙`, iconURL: game.avatar })
        .addFields(
            { name: `Your hand (${handValue(game.player)})`, value: fmtHand(game.player), inline: false },
            { name: 'Dealer', value: dealerShown, inline: false }
        );

    if (status) embed.setDescription(status);
    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play blackjack against the dealer.')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription(`Coins to bet (minimum ${MIN_BET})`)
                .setMinValue(MIN_BET)
                .setRequired(true)),
    async execute(interaction) {
        const userId = interaction.user.id;
        economy.ensureUser(userId, interaction.user.username);
        const bet = interaction.options.getInteger('bet', true);

        if (activeGames.has(userId)) {
            return interaction.reply({
                content: '🃏 You already have a blackjack game in progress. Finish it first!',
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

        activeGames.add(userId);

        const deck = newDeck();
        const game = {
            deck,
            player: [deck.pop(), deck.pop()],
            dealer: [deck.pop(), deck.pop()],
            bet,
            totalBet: bet,
            avatar: interaction.user.displayAvatarURL()
        };

        let finished = false;

        const finish = async (editFn, result) => {
            finished = true;
            activeGames.delete(userId);

            let payout = 0;
            let color = 0xed4245;
            let status;
            switch (result) {
                case 'blackjack':
                    payout = Math.floor(game.totalBet * 2.5);
                    color = 0x57f287;
                    status = `♠️ **BLACKJACK!** You win **${economy.fmt(payout - game.totalBet)}**`;
                    break;
                case 'win':
                    payout = game.totalBet * 2;
                    color = 0x57f287;
                    status = `🎉 **You win!** You earn **${economy.fmt(payout - game.totalBet)}**`;
                    break;
                case 'push':
                    payout = game.totalBet;
                    color = 0xfee75c;
                    status = '🤝 **Push.** You get your bet back.';
                    break;
                case 'bust':
                    status = `💥 **You went over 21.** You lose **${economy.fmt(game.totalBet)}**`;
                    break;
                case 'timeout':
                    status = `⌛ **Time ran out**, you stood automatically...`;
                    break;
                default:
                    status = `😔 **The dealer wins.** You lose **${economy.fmt(game.totalBet)}**`;
            }

            if (payout > 0) economy.addCoins(userId, payout);
            const won = result === 'win' || result === 'blackjack';
            economy.recordGame(userId, won);

            const { coins } = economy.getUser(userId);
            const embed = gameEmbed(game, { revealDealer: true, status, color })
                .setFooter({ text: `Balance: ${coins.toLocaleString('en-US')} coins` });

            await editFn({ embeds: [embed], components: [] });
        };

        const dealerPlay = () => {
            while (handValue(game.dealer) < 17) game.dealer.push(game.deck.pop());
        };

        const resolveStand = () => {
            dealerPlay();
            const p = handValue(game.player);
            const d = handValue(game.dealer);
            if (d > 21 || p > d) return 'win';
            if (p === d) return 'push';
            return 'lose';
        };

        // Natural blackjack check
        if (handValue(game.player) === 21) {
            const result = handValue(game.dealer) === 21 ? 'push' : 'blackjack';
            await interaction.deferReply();
            return finish((opts) => interaction.editReply(opts), result);
        }

        const canDouble = () => game.player.length === 2 && (economy.getUser(userId)?.coins ?? 0) >= game.bet;

        await interaction.reply({
            embeds: [gameEmbed(game, { status: 'What do you want to do?' })],
            components: [buttonsRow(canDouble())]
        });
        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120_000
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== userId) {
                return i.reply({ content: 'This game is not yours. Start your own with `/blackjack`!', flags: MessageFlags.Ephemeral });
            }

            try {
                if (i.customId === 'bj_hit') {
                    game.player.push(game.deck.pop());
                    const value = handValue(game.player);
                    if (value > 21) {
                        collector.stop('done');
                        return finish((opts) => i.update(opts), 'bust');
                    }
                    if (value === 21) {
                        collector.stop('done');
                        return finish((opts) => i.update(opts), resolveStand());
                    }
                    return i.update({
                        embeds: [gameEmbed(game, { status: 'What do you want to do?' })],
                        components: [buttonsRow(false)]
                    });
                }

                if (i.customId === 'bj_double') {
                    if (!canDouble() || !economy.tryDebit(userId, game.bet)) {
                        return i.reply({ content: '💸 You don\'t have enough coins to double down.', flags: MessageFlags.Ephemeral });
                    }
                    game.totalBet += game.bet;
                    game.player.push(game.deck.pop());
                    collector.stop('done');
                    const result = handValue(game.player) > 21 ? 'bust' : resolveStand();
                    return finish((opts) => i.update(opts), result);
                }

                if (i.customId === 'bj_stand') {
                    collector.stop('done');
                    return finish((opts) => i.update(opts), resolveStand());
                }
            } catch (err) {
                activeGames.delete(userId);
                throw err;
            }
        });

        collector.on('end', async (_collected, reason) => {
            if (finished || reason === 'done') return;
            // Timed out: auto-stand so the bet is not lost in limbo
            const result = resolveStand();
            await finish((opts) => message.edit(opts), result === 'lose' ? 'timeout' : result).catch(() => {
                activeGames.delete(userId);
            });
        });
    }
};
