const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const play = require('play-dl'); // Assuming you have a play-dl module for playing audio



module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Join the voice channel you are currently in')
            .addStringOption(option =>
                 option.setName('url')
                    .setDescription('The URL of the audio to play')
                    .setRequired(true)),

    async execute(interaction) {

        const url = interaction.options.getString('url');
        const channel = interaction.member.voice.channel;
        if (!channel) {
            return interaction.reply({ content: '❌ You need to be in a voice channel to use this command!', ephemeral: true }); // ephemeral = true means only the user who invoked the command can see the reply
        }
        const isValid = await play.validate(url);
        if (!isValid) {     
            return interaction.reply({ content: '❌ Invalid URL provided!', ephemeral: true });
        }
        try {
            const stream = await play.stream(url);
            const resource = createAudioResource(stream.stream, {
                inputType: stream.type,
            });
            const player = createAudioPlayer();

            const connection = joinVoiceChannel({
	            channelId: channel.id,
        	    guildId: channel.guild.id,
	            adapterCreator: channel.guild.voiceAdapterCreator,
            });
        
            connection.subscribe(player);
            player.play(resource)

            const videoInfo = await play.video_basic_info(url);
            const title = videoInfo.video_details.title;

            await interaction.reply({ content: `🎶 Reproduciendo: **${title}**` });
        } catch (error) {
            console.error('Error playing audio:', error);
            return interaction.reply({ content: '❌ An error occurred while trying to play the audio!', ephemeral: true });
        }
    }
};

