require('dotenv').config();

const config = {
    discord: {
        token: process.env.TOKEN,
        clientId: process.env.APPLICATION_ID,
        guildId: process.env.GUILD_ID
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-3.5-turbo', // Faster than gpt-4o
        ttsModel: 'tts-1',
        voice: 'alloy'
    }
};

if (!config.discord.token) {
    console.warn("WARNING: DISCORD_TOKEN is missing in .env");
}
if (!config.openai.apiKey) {
    console.warn("WARNING: OPENAI_API_KEY is missing in .env");
}

module.exports = config;
