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

const MIN_BET = 10;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('duel')
        .setDescription('Challenge another user: you both bet the same and the winner takes it all.')
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('User you are challenging')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription(`Coins each player bets (minimum ${MIN_BET})`)
                .setMinValue(MIN_BET)
                .setRequired(true)),
    async execute(interaction) {
        const challenger = interaction.user;
        const opponent = interaction.options.getUser('opponent', true);
        const bet = interaction.options.getInteger('bet', true);

        if (opponent.bot) {
            return interaction.reply({ content: '🤖 You can\'t challenge a bot.', flags: MessageFlags.Ephemeral });
        }
        if (opponent.id === challenger.id) {
            return interaction.reply({ content: '🪞 You can\'t challenge yourself.', flags: MessageFlags.Ephemeral });
        }

        economy.ensureUser(challenger.id, challenger.username);
        economy.ensureUser(opponent.id, opponent.username);

        if ((economy.getUser(challenger.id)?.coins ?? 0) < bet) {
            return interaction.reply({
                content: `💸 You don't have **${economy.fmt(bet)}** to bet.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const row = (disabled = false) => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('duel_accept').setLabel('Accept').setEmoji('⚔️').setStyle(ButtonStyle.Success).setDisabled(disabled),
            new ButtonBuilder().setCustomId('duel_decline').setLabel('Decline').setEmoji('🏳️').setStyle(ButtonStyle.Danger).setDisabled(disabled)
        );

        const challengeEmbed = new EmbedBuilder()
            .setColor(0xe67e22)
            .setAuthor({ name: '⚔️ Betting duel!', iconURL: challenger.displayAvatarURL() })
            .setDescription(
                `${challenger} challenges ${opponent} for **${economy.fmt(bet)}** each.\n\n` +
                `🏆 The winner takes **${economy.fmt(bet * 2)}**\n` +
                `⏳ ${opponent}, you have 60 seconds to accept.`
            );

        await interaction.reply({ content: `${opponent}`, embeds: [challengeEmbed], components: [row()] });
        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60_000
        });

        let resolved = false;

        collector.on('collect', async (i) => {
            if (i.user.id !== opponent.id) {
                return i.reply({ content: `Only ${opponent.username} can respond to this duel.`, flags: MessageFlags.Ephemeral });
            }

            resolved = true;
            collector.stop('done');

            if (i.customId === 'duel_decline') {
                return i.update({
                    embeds: [challengeEmbed.setColor(0x99aab5).setDescription(`🏳️ ${opponent} declined ${challenger}'s duel.`)],
                    components: []
                });
            }

            // Accept: debit both atomically (refund the first if the second fails)
            if (!economy.tryDebit(challenger.id, bet)) {
                return i.update({
                    embeds: [challengeEmbed.setColor(0xed4245).setDescription(`💸 ${challenger} no longer has **${economy.fmt(bet)}**... duel cancelled.`)],
                    components: []
                });
            }
            if (!economy.tryDebit(opponent.id, bet)) {
                economy.addCoins(challenger.id, bet);
                return i.update({
                    embeds: [challengeEmbed.setColor(0xed4245).setDescription(`💸 ${opponent} doesn't have **${economy.fmt(bet)}**... duel cancelled.`)],
                    components: []
                });
            }

            await i.update({
                embeds: [new EmbedBuilder()
                    .setColor(0xe67e22)
                    .setAuthor({ name: '⚔️ Duel accepted!' })
                    .setDescription(`${challenger} 🆚 ${opponent}\n\n🎲 *Rolling the dice of fate...*`)],
                components: []
            });
            await sleep(2000);

            let rollA, rollB;
            do {
                rollA = 1 + Math.floor(Math.random() * 100);
                rollB = 1 + Math.floor(Math.random() * 100);
            } while (rollA === rollB);

            const winner = rollA > rollB ? challenger : opponent;
            const loser = rollA > rollB ? opponent : challenger;
            economy.addCoins(winner.id, bet * 2);
            economy.recordGame(challenger.id, winner.id === challenger.id);
            economy.recordGame(opponent.id, winner.id === opponent.id);

            const winnerCoins = economy.getUser(winner.id).coins;
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(0x57f287)
                    .setAuthor({ name: '⚔️ Duel result' })
                    .setThumbnail(winner.displayAvatarURL())
                    .setDescription(
                        `${challenger} rolls 🎲 **${rollA}**\n` +
                        `${opponent} rolls 🎲 **${rollB}**\n\n` +
                        `🏆 **${winner} wins ${economy.fmt(bet * 2)}**\n` +
                        `😔 ${loser} loses their bet.`
                    )
                    .setFooter({ text: `${winner.username}'s balance: ${winnerCoins.toLocaleString('en-US')} coins` })]
            });
        });

        collector.on('end', async (_collected, reason) => {
            if (resolved || reason === 'done') return;
            await message.edit({
                embeds: [challengeEmbed.setColor(0x99aab5).setDescription(`⌛ ${opponent} didn't respond to ${challenger}'s duel. Challenge expired.`)],
                components: []
            }).catch(() => {});
        });
    }
};
