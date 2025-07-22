const Discord = require('discord.js');
const zephyr = require('../../index.js'); 

module.exports = {
    data: new Discord.SlashCommandBuilder()
    .setName(`changeprefix`)
    .setDescription(`Change the bot's command prefix`)
    .addStringOption(option => option.setName('newprefix')
        .setDescription('The new prefix for the bot')
        .setRequired(true)),
   permissions:0,

    async execute(interaction) {
        newPrefix = interaction.options.getString('newprefix');        
        zephyr.setPrefix(interaction.guild.id, interaction.options.getString('newprefix'));
        await interaction.reply(`Prefix changed to: ${newPrefix}`);
    }
}    