const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s latency and API ping'),

    async execute(interaction) {
        const apiPing = interaction.client.ws.ping; // This is the WebSocket ping, which is the time it takes for a message to go to Discord and back
        const now = Date.now();
        const latency = now - interaction.createdTimestamp; // This calculates the latency in milliseconds between when the interaction was created and when the bot received it
        
        await interaction.reply(`Pong ⌛: ${latency} ms\nAPI ping: ${apiPing} ms`);
    }
}