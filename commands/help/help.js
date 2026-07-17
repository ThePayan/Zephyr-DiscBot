const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays a list of all available commands.'),
    async execute(interaction) {
        const commands = interaction.client.commands;
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🤖 Zephyr Bot - Command List')
            .setDescription('Here are all the available commands you can use:')
            .setThumbnail(interaction.client.user.displayAvatarURL());

        // One line per command (embed fields are capped at 25, a description is not)
        const lines = commands.map(cmd => `**/${cmd.data.name}** — ${cmd.data.description}`);
        embed.setDescription(`Here are all the available commands you can use:\n\n${lines.join('\n')}`);

        // Add a footer tip
        embed.setFooter({ text: 'Zephyr Voice AI • Built with Discord.js & OpenAI' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
