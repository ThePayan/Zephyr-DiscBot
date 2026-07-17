const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economy = require('../../src/services/economyService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription(`Collect your ${economy.DAILY_AMOUNT} daily coins.`),
    async execute(interaction) {
        economy.ensureUser(interaction.user.id, interaction.user.username);
        const result = economy.claimDaily(interaction.user.id);

        if (!result.claimed) {
            const embed = new EmbedBuilder()
                .setColor(0xed4245)
                .setAuthor({ name: '⏳ Daily reward', iconURL: interaction.user.displayAvatarURL() })
                .setDescription(
                    `You already collected your coins today.\n` +
                    `You can claim them again <t:${result.nextTimestamp}:R>.`
                )
                .setFooter({ text: `Current balance: ${result.coins.toLocaleString('en-US')} coins` });
            return interaction.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setColor(0x57f287)
            .setAuthor({ name: '💰 Daily reward', iconURL: interaction.user.displayAvatarURL() })
            .setDescription(
                `You collected **${economy.fmt(result.amount)}**!\n\n` +
                `💼 Balance: **${economy.fmt(result.coins)}**\n` +
                `🔥 Streak: **${result.streak}** day(s) in a row\n` +
                `⏰ Next reward: <t:${result.nextTimestamp}:R>`
            );

        return interaction.reply({ embeds: [embed] });
    }
};
