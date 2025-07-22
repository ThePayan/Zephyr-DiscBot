const Discord = require('discord.js');

module.exports = {
    data: new Discord.SlashCommandBuilder()
    .setName(`aaa`)
    .setDescription(`aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`),
    permissions:0,

    async execute(interaction) {
        try
        {
            await interaction.reply({content: `AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA` });
        }

        catch (err) {
            console.log(err);
            interaction.reply({ content: `Something went wrong!\nERROR: ${err}` });
        }
    }
}