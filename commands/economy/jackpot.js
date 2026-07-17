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

const DURATION_MS = 60_000;
const ENTRY_AMOUNTS = [100, 250, 500, 1000];

// One active jackpot per channel
const activePots = new Set();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function entryRow(disabled = false) {
    return new ActionRowBuilder().addComponents(
        ENTRY_AMOUNTS.map(amount =>
            new ButtonBuilder()
                .setCustomId(`pot_${amount}`)
                .setLabel(`+${amount}`)
                .setEmoji('🪙')
                .setStyle(amount >= 1000 ? ButtonStyle.Danger : amount >= 500 ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setDisabled(disabled)
        )
    );
}

function potEmbed(contributions, endTimestamp, host) {
    const entries = [...contributions.values()];
    const total = entries.reduce((acc, e) => acc + e.amount, 0);

    const lines = entries
        .sort((a, b) => b.amount - a.amount)
        .map(e => {
            const pct = total > 0 ? Math.round((e.amount / total) * 100) : 0;
            return `• **${e.username}** — ${economy.fmt(e.amount)} (${pct}%)`;
        });

    return new EmbedBuilder()
        .setColor(0xe91e63)
        .setAuthor({ name: '🎰 JACKPOT OPEN!', iconURL: host.displayAvatarURL() })
        .setDescription(
            `Put coins into the pot with the buttons. When time runs out, ` +
            `the wheel will pick a winner who **takes it ALL**.\n` +
            `The more coins you put in, the better your odds. You can press multiple times.\n\n` +
            `💰 Current pot: **${economy.fmt(total)}**\n` +
            `⏳ Ends: <t:${endTimestamp}:R>\n\n` +
            (lines.length > 0 ? `**Players (${lines.length}):**\n${lines.join('\n')}` : '*No players yet...*')
        );
}

function pickWeightedWinner(contributions) {
    const entries = [...contributions.entries()];
    const total = entries.reduce((acc, [, e]) => acc + e.amount, 0);
    let r = Math.random() * total;
    for (const [id, e] of entries) {
        r -= e.amount;
        if (r <= 0) return id;
    }
    return entries[entries.length - 1][0];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jackpot')
        .setDescription('Open a 1-minute pot: everyone adds coins and the wheel decides who takes it all.'),
    async execute(interaction) {
        const channelId = interaction.channelId;

        if (activePots.has(channelId)) {
            return interaction.reply({
                content: '🎰 There is already an open jackpot in this channel. Join that one!',
                flags: MessageFlags.Ephemeral
            });
        }
        activePots.add(channelId);

        economy.ensureUser(interaction.user.id, interaction.user.username);

        const contributions = new Map(); // userId -> { username, amount }
        const endTimestamp = Math.floor((Date.now() + DURATION_MS) / 1000);

        await interaction.reply({
            embeds: [potEmbed(contributions, endTimestamp, interaction.user)],
            components: [entryRow()]
        });
        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: DURATION_MS
        });

        collector.on('collect', async (i) => {
            const amount = Number(i.customId.split('_')[1]);
            economy.ensureUser(i.user.id, i.user.username);

            if (!economy.tryDebit(i.user.id, amount)) {
                const { coins } = economy.getUser(i.user.id);
                return i.reply({
                    content: `💸 You don't have **${economy.fmt(amount)}**. Balance: **${economy.fmt(coins)}**`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const entry = contributions.get(i.user.id) ?? { username: i.user.username, amount: 0 };
            entry.amount += amount;
            contributions.set(i.user.id, entry);

            return i.update({ embeds: [potEmbed(contributions, endTimestamp, interaction.user)] });
        });

        collector.on('end', async () => {
            activePots.delete(channelId);
            const entries = [...contributions.entries()];
            const total = entries.reduce((acc, [, e]) => acc + e.amount, 0);
            let paidOut = false;

            try {
                if (entries.length === 0) {
                    return await message.edit({
                        embeds: [new EmbedBuilder()
                            .setColor(0x99aab5)
                            .setAuthor({ name: '🎰 Jackpot cancelled' })
                            .setDescription('Nobody joined the pot... maybe next time.')],
                        components: []
                    });
                }

                if (entries.length === 1) {
                    const [onlyId, only] = entries[0];
                    economy.addCoins(onlyId, only.amount);
                    paidOut = true;
                    return await message.edit({
                        embeds: [new EmbedBuilder()
                            .setColor(0x99aab5)
                            .setAuthor({ name: '🎰 Jackpot cancelled' })
                            .setDescription(`Only **${only.username}** joined... at least 2 players are needed.\nTheir ${economy.fmt(only.amount)} have been refunded.`)],
                        components: []
                    });
                }

                // Spin!
                await message.edit({
                    embeds: [new EmbedBuilder()
                        .setColor(0xe91e63)
                        .setAuthor({ name: '🎰 JACKPOT CLOSED!' })
                        .setDescription(`💰 Final pot: **${economy.fmt(total)}**\n\n# 🎡\n*The wheel is spinning between ${entries.length} players...*`)],
                    components: []
                });
                await sleep(3000);

                const winnerId = pickWeightedWinner(contributions);
                const winner = contributions.get(winnerId);
                const winnerPct = Math.round((winner.amount / total) * 100);

                economy.addCoins(winnerId, total);
                paidOut = true;
                for (const [id] of entries) economy.recordGame(id, id === winnerId);

                const resultLines = entries
                    .sort((a, b) => b[1].amount - a[1].amount)
                    .map(([id, e]) => id === winnerId
                        ? `👑 **${e.username}** — put in ${economy.fmt(e.amount)}`
                        : `▫️ ${e.username} — loses ${economy.fmt(e.amount)}`);

                await message.edit({
                    embeds: [new EmbedBuilder()
                        .setColor(0xf1c40f)
                        .setAuthor({ name: '🎰 WE HAVE A WINNER!' })
                        .setDescription(
                            `# 🎉 ${winner.username}\n` +
                            `Takes the pot of **${economy.fmt(total)}** ` +
                            `(they had a ${winnerPct}% chance)\n\n${resultLines.join('\n')}`
                        )
                        .setTimestamp()],
                    components: []
                });

                await message.channel.send(`🎊 <@${winnerId}> **you won the jackpot of ${economy.fmt(total)}!**`);
            } catch {
                // If the draw never happened (message deleted, missing perms), refund everyone
                if (total > 0 && !paidOut) {
                    for (const [id, e] of entries) economy.addCoins(id, e.amount);
                }
            }
        });
    }
};
