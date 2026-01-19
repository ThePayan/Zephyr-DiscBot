const { Client, GatewayIntentBits, Collection, Events, REST, Routes, MessageFlags, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config/config');
const VoiceHandler = require('./handlers/voiceHandler');
const logger = require('./utils/logger'); // This now has colors enabled

// --- LEGACY PREFIX LOGIC ---
const guildPrefixes = {}; 
function getPrefix(guildId) {
	return guildPrefixes[guildId] || "z!";
}
function setPrefix(guildId, newPrefix) {
	guildPrefixes[guildId] = newPrefix;
}

// --- CLIENT SETUP ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent  
    ]
});


client.commands = new Collection();
client.voiceHandler = new VoiceHandler(client);

// --- LOAD COMMANDS (Legacy Structure) ---
const commands = [];
const foldersPath = path.join(__dirname, '../commands'); 

if (fs.existsSync(foldersPath)) {
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        // Ensure it's a directory
        if (fs.lstatSync(commandsPath).isDirectory()) {
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    commands.push(command.data.toJSON());
                    logger.debug(`Loaded command: ${command.data.name}`);
                } else {
                    logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            }
        }
    }
}

// --- REST DEPLOYMENT ---
const rest = new REST({ version: '10' }).setToken(config.discord.token);

(async () => {
	try {
		logger.info(`Started refreshing ${commands.length} application (/) commands.`);

		if (config.discord.guildId) {
             await rest.put(
                Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
                { body: commands },
            );
        } else {
            await rest.put(
                Routes.applicationCommands(config.discord.clientId),
                { body: commands },
            );
        }

		logger.info(`Successfully reloaded ${commands.length} application (/) commands.`);
	} catch (error) {
		logger.error("Error reloading commands:", error);
	}
})();

// --- EVENTS ---

client.once('ready', () => {
    logger.loggedIn(client.user.tag);
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

    // Standard command handling
	const command = interaction.client.commands.get(interaction.commandName);
	if (!command) {
		logger.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		logger.error("Error executing command:", error);
		if (interaction.replied || interaction.deferred) { // ...
			await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		}
	}
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const prefix = getPrefix(message.guildId);
    if (message.content.toLowerCase() === prefix + 'ping') {
		const apiPing = client.ws.ping;
        const now = Date.now();
        const latency = now - message.createdTimestamp;
        message.reply(`Pong ⌛: ${latency} ms\nAPI ping: ${apiPing} ms`);
    }
});

logger.info("Attempting to login with token..." + (config.discord.token ? " (Token present)" : " (Token missing!)"));

client.login(config.discord.token).catch(err => {
    logger.error("Failed to login:", err);
});

module.exports = {
	getPrefix,
	setPrefix,
};
