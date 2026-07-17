const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const economy = require('../../src/services/economyService');

const MIN_BET = 10;
const TRACK = 16;
const PAYOUT = 4.5; // 5 horses with equal odds → small house edge

const HORSES = [
    { id: 1, name: 'Lightning', emoji: '🐎' },
    { id: 2, name: 'Tornado', emoji: '🏇' },
    { id: 3, name: 'Star', emoji: '🐴' },
    { id: 4, name: 'Bullet', emoji: '🎠' },
    { id: 5, name: 'Thunder', emoji: '🦄' }
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function renderTrack(positions, pickId, winnerId = null) {
    return HORSES.map(h => {
        const pos = Math.min(positions[h.id], TRACK);
        const line = `🏁${'－'.repeat(TRACK - pos)}${h.emoji}`;
        const you = h.id === pickId ? ' ⭐' : '';
        const crown = h.id === winnerId ? ' 👑' : '';
        return `${line} **${h.name}**${you}${crown}`;
    }).join('\n');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('horserace')
        .setDescription('Bet on a horse and watch the race live (pays x4.5).')
        .addStringOption(option =>
            option.setName('horse')
                .setDescription('Which horse are you betting on?')
                .setRequired(true)
                .addChoices(...HORSES.map(h => ({ name: `${h.emoji} ${h.name}`, value: String(h.id) }))))
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription(`Coins to bet (minimum ${MIN_BET})`)
                .setMinValue(MIN_BET)
                .setRequired(true)),
    async execute(interaction) {
        const userId = interaction.user.id;
        economy.ensureUser(userId, interaction.user.username);
        const bet = interaction.options.getInteger('bet', true);
        const pickId = Number(interaction.options.getString('horse', true));
        const pick = HORSES.find(h => h.id === pickId);

        if (!economy.tryDebit(userId, bet)) {
            const { coins } = economy.getUser(userId);
            return interaction.reply({
                content: `💸 You don't have enough coins. Balance: **${economy.fmt(coins)}** (don't forget \`/daily\`).`,
                flags: MessageFlags.Ephemeral
            });
        }

        // Pre-simulate the whole race so the payout can be applied up-front.
        // If the bot dies mid-animation, the coins are already settled.
        const positions = Object.fromEntries(HORSES.map(h => [h.id, 0]));
        const frames = [];
        let winnerId = null;
        while (winnerId === null) {
            for (const h of HORSES) positions[h.id] += 1 + Math.floor(Math.random() * 3);

            const finishers = HORSES.filter(h => positions[h.id] >= TRACK);
            if (finishers.length > 0) {
                // Furthest past the line wins; random among exact ties
                const best = Math.max(...finishers.map(h => positions[h.id]));
                const tied = finishers.filter(h => positions[h.id] === best);
                winnerId = tied[Math.floor(Math.random() * tied.length)].id;
            }
            frames.push({ positions: { ...positions }, done: winnerId !== null });
        }

        const winner = HORSES.find(h => h.id === winnerId);
        const won = winnerId === pickId;
        const payout = won ? Math.floor(bet * PAYOUT) : 0;
        if (payout > 0) economy.addCoins(userId, payout);
        economy.recordGame(userId, won);

        const baseEmbed = () => new EmbedBuilder()
            .setColor(0x5865f2)
            .setAuthor({ name: '🏇 Horse race', iconURL: interaction.user.displayAvatarURL() })
            .setFooter({ text: `Your bet: ${bet.toLocaleString('en-US')} coins on ${pick.name}` });

        await interaction.reply({
            embeds: [baseEmbed().setDescription(`**And they're off!** 🔫\n\n${renderTrack(Object.fromEntries(HORSES.map(h => [h.id, 0])), pickId)}`)]
        });

        // Replay the pre-computed race frame by frame
        for (const frame of frames) {
            await sleep(1300);
            await interaction.editReply({
                embeds: [baseEmbed().setDescription(
                    frame.done
                        ? `**The race is over!**\n\n${renderTrack(frame.positions, pickId, winnerId)}`
                        : `**They're at full speed!** 💨\n\n${renderTrack(frame.positions, pickId)}`
                )]
            }).catch(() => {});
        }

        const { coins } = economy.getUser(userId);
        await sleep(800);
        return interaction.editReply({
            embeds: [baseEmbed()
                .setColor(won ? 0x57f287 : 0xed4245)
                .setDescription(
                    `**The race is over!**\n\n${renderTrack(positions, pickId, winnerId)}\n\n` +
                    `🏆 **${winner.emoji} ${winner.name}** wins\n` +
                    (won
                        ? `🎉 You called it! You win **${economy.fmt(payout - bet)}**`
                        : `😔 You bet on ${pick.name}... you lose **${economy.fmt(bet)}**`)
                )
                .setFooter({ text: `Balance: ${coins.toLocaleString('en-US')} coins` })]
        });
    }
};
