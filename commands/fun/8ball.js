const Discord = require('discord.js');

module.exports = {
    data: new Discord.SlashCommandBuilder()
    .setName(`8ball`)
    .setDescription(`Ask the magic 8ball whatever questions that are bothering you at this time!`)
    .addStringOption(option => option.setName('question')
        .setDescription('The thing you wanna ask')
        .setRequired(true)),
    // .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    permissions:0,

    async execute(interaction) {
        let rand = Math.random() * 100;
        
        let answer = "Yes"
        if (rand < 90) answer = "Probably"
        if (rand < 80) answer = "I don't think so"
        if (rand < 70) answer = "Maybe"
        if (rand < 60) answer = "Follow your heart"
        if (rand < 50) answer = "No"
        if (rand < 40) answer = "Yes, but no"
        if (rand < 30) answer = "Absolutely not"
        if (rand < 20) answer = "Ask again later"
        if (rand < 10) answer = "I don't know, ask your mom"
        if (rand < 5) answer = "I don't know, ask your dad"
        if (rand < 1) answer = "Ip address: 192.168.1.42"

        try
        {
            await interaction.reply({content: `${interaction.member} asked: "${interaction.options.data.find(arg => arg.name === 'question').value}" 
            
Answer: **${answer}**` })
        }

        catch (err) {
            console.log(err);
            interaction.reply({ content: `Something went wrong!\nERROR: ${err}` });
        }
    }
}