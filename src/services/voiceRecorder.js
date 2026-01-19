const fs = require('fs');
const path = require('path');
const { EndBehaviorType } = require('@discordjs/voice');
const prism = require('prism-media');
const { pipeline } = require('stream');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');

class VoiceRecorder {
    constructor() {
        this.recordingsPath = path.join(__dirname, '../../recordings');
        if (!fs.existsSync(this.recordingsPath)) {
            fs.mkdirSync(this.recordingsPath, { recursive: true });
        }
    }

    async recordUser(connection, userId) {
        return new Promise((resolve, reject) => {
            const receiver = connection.receiver;
            // Lo que hace 
            const opusStream = receiver.subscribe(userId, {
                end: {
                    behavior: EndBehaviorType.AfterSilence,
                    duration: 700, 
                },
            });
            opusStream.on('error', (error) => {
                console.warn(`[WARN] Audio stream error for ${userId}:`, error.message);
            });

            // Use static filename per user to overwrite and save space
            const filename = `${userId}.pcm`;
            const filepath = path.join(this.recordingsPath, filename);
            const outputStream = fs.createWriteStream(filepath);

            // Decoding Opus to PCM using prism-media
            const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });

            pipeline(opusStream, opusDecoder, outputStream, (err) => {
                if (err) {
                    console.error('Pipeline failed:', err);
                    reject(err);
                } else {
                    console.log(`✅ Recording finished for ${userId}`);
                    // Convert raw PCM to WAV/MP3 for OpenAI
                    const finalPath = filepath.replace('.pcm', '.mp3');
                    this.convertPcmToMp3(filepath, finalPath)
                        .then(() => {
                            fs.unlinkSync(filepath); // Delete raw PCM
                            resolve(finalPath);
                        })
                        .catch(reject);
                }
            });
        });
    }

    /**
     * Converts raw PCM audio to MP3 using ffmpeg
     * @param {string} inputPath 
     * @param {string} outputPath 
     */
    convertPcmToMp3(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            const args = [
                '-f', 's16le', // Input format: signed 16-bit little-endian
                '-ar', '48000', // Sample rate: 48kHz
                '-ac', '2',     // Channels: 2 (Discord default)
                '-i', inputPath,
                '-y',           // Overwrite output
                outputPath
            ];

            const ffmpegProcess = spawn(ffmpeg, args);

            ffmpegProcess.on('close', (code) => {
                if (code === 0) {
                    resolve(outputPath);
                } else {
                    reject(new Error(`FFmpeg process exited with code ${code}`));
                }
            });

            ffmpegProcess.on('error', (err) => {
                reject(err);
            });
        });
    }
}

module.exports = new VoiceRecorder();
