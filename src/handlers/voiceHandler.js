
// src/handlers/voiceHandler.js
const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus, 
    VoiceConnectionStatus,
    entersState 
} = require('@discordjs/voice');
const voiceRecorder = require('../services/voiceRecorder');
const openaiService = require('../services/openaiService');
const fs = require('fs');

class VoiceHandler {
    constructor(client) {
        this.client = client;
        this.isProcessing = false;
        // Translator State
        this.isTranslatorActive = false;
        this.primaryLanguage = 'English';
        this.secondaryLanguage = 'Spanish';

        // Chat State
        this.isChatActive = false;
    }

    setTranslatorMode(active, primLang = 'English', secLang = 'Spanish') {
        this.isTranslatorActive = active;
        this.isChatActive = false; // Disable chat mode if translating
        this.primaryLanguage = primLang;
        this.secondaryLanguage = secLang;
        console.log(`Translator Mode: ${active ? 'ON' : 'OFF'} (${primLang} <-> ${secLang})`);
    }

    setChatMode(active) {
        this.isChatActive = active;
        this.isTranslatorActive = false; // Disable translator if chatting
        console.log(`Chat Mode: ${active ? 'ON' : 'OFF'}`);
    }

    async joinChannel(channel) {
        try {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: false,
                selfMute: false
            });

            connection.on(VoiceConnectionStatus.Ready, () => {
                console.log('✅ Voice connection ready!');
                this.listenToUsers(connection);
            });

            return connection;
        } catch (error) {
            console.error('Error joining voice channel:', error);
        }
    }

    listenToUsers(connection) {
        const receiver = connection.receiver;

        receiver.speaking.on('start', async (userId) => {
            // IGNORE if processing
            if (this.isProcessing) return;
            
            // Check Modes
            if (!this.isTranslatorActive && !this.isChatActive) return; // Silent if no mode active

            try {
                this.isProcessing = true;
                console.log(`👂 Detected speech from user: ${userId}`);

                // 1. Record Audio
                const audioPath = await voiceRecorder.recordUser(connection, userId);
                
                // 2. Transcribe
                // Common step for both modes
                const text = await openaiService.transcribeAudio(audioPath);
                
                if (!text || text.trim().length === 0) {
                    console.log('Ignore empty transcription.');
                    this.isProcessing = false;
                    return;
                }

                let responseText = "";

                if (this.isTranslatorActive) {
                    // 3a. TRANSLATE (Bidirectional)
                    responseText = await openaiService.translateText(
                        text, 
                        this.primaryLanguage, 
                        this.secondaryLanguage
                    );
                } else if (this.isChatActive) {
                    // 3b. CHAT (GPT-4)
                    responseText = await openaiService.generateResponse(text);
                }

                if (!responseText) {
                   this.isProcessing = false;
                   return;
                }

                // 4. Generate Speech (TTS)
                const audioBuffer = await openaiService.generateSpeech(responseText);

                // 5. Play Response
                await this.playAudio(connection, audioBuffer);

                // Cleanup recorded file
                fs.unlink(audioPath, (err) => {
                    if(err) console.error("Error deleting temp file:", err);
                });

            } catch (error) {
                console.error('Error in voice interaction loop:', error);
            } finally {
                this.isProcessing = false;
            }
        });
    }

    /**
     * Plays audio buffer in the voice channel
     * @param {import('@discordjs/voice').VoiceConnection} connection 
     * @param {Buffer} audioBuffer 
     */
    async playAudio(connection, audioBuffer) {
        return new Promise((resolve) => {
            const player = createAudioPlayer();
            
            // Create a readable stream from buffer because createAudioResource needs path or stream
            const { Readable } = require('stream');
            const stream = Readable.from(audioBuffer);
            
            const resource = createAudioResource(stream);
            connection.subscribe(player);
            player.play(resource);

            player.on(AudioPlayerStatus.Idle, () => {  // When the audio finishes, it resolves the promise
                resolve();
            });

            player.on('error', error => {
                console.error('Audio player error:', error);
                resolve(); // Resolve anyway to unblock
            });
        });
    }
}

module.exports = VoiceHandler;
