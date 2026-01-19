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

        const commandList = [];
        
        // Iterate through all loaded commands
        commands.forEach(cmd => {
            const name = `/${cmd.data.name}`;
            const desc = cmd.data.description;
            commandList.push({ name: name, value: desc, inline: false });
        });

        // Add fields to embed (max 25 fields strictly, we have ~7 so it's fine)
        embed.addFields(commandList);

        // Add a footer tip
        embed.setFooter({ text: 'Zephyr Voice AI • Built with Discord.js & OpenAI' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
