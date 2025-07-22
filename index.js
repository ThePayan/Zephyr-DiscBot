require("dotenv").config() // Import dotenv to load environment variables from .env file
const { Client, Collection, Events, GatewayIntentBits, MessageFlags, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const colors = require('colors');
// import { fileURLToPath } from 'url' | Only required if using ES modules

const guildPrefixes = {}; // Object to store guild-specific prefixes

function getPrefix(guildId) {
	return guildPrefixes[guildId] || "z!";
}
function setPrefix(guildId, newPrefix) {
	guildPrefixes[guildId] = newPrefix;
}



module.exports = {
	getPrefix,
	setPrefix,
};

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates] });
client.commands = new Collection();

const commands = []; // Create a new collection to store commands
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	// Grab all the command files from the commands directory you created earlier
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
			commands.push(command.data.toJSON());
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.TOKEN);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set

		const data = await rest.put(
			Routes.applicationGuildCommands(process.env.APPLICATION_ID, process.env.GUILD_ID),
			{ body: commands },
			
		// const data = await rest.put(Routes.applicationCommands(process.env.APPLICATION_ID),
		// 	{ body: commands },
		);
		

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);
	
	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		}
	}
});

client.once('ready', () => {
    console.log("[RUNNING]".green,`Logged in as`.magenta,`${client.user.tag}!`.yellow);
});

client.on('messageCreate', async message => {
    if (message.content.toLowerCase() === getPrefix(message.guildId)+'ping') {
		const apiPing = client.ws.ping; // This is the WebSocket ping, which is the time it takes for a message to go to Discord and back
        const now = Date.now();
        const latency = now - message.createdTimestamp; // This calculates the latency in milliseconds between when the message was created and when the bot received it
        
        message.reply(`Pong ⌛: ${latency} ms\nAPI ping: ${apiPing} ms`);
    }
});


client.login(process.env.TOKEN);