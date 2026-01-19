const fs = require('fs');
const OpenAI = require('openai');
const config = require('../config/config');

class OpenAIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: config.openai.apiKey,
        });
    }

    /**
     * Transcribes audio file to text using Whisper
     * @param {string} filePath - Path to the audio file
     * @returns {Promise<string>} Transcribed text
     */
    async transcribeAudio(filePath) {
        try {
            const transcription = await this.openai.audio.transcriptions.create({
                file: fs.createReadStream(filePath),
                model: 'whisper-1',
            });
            console.log(`📝 Transcription: "${transcription.text}"`);
            return transcription.text;
        } catch (error) {
            console.error('Error transcribing audio:', error);
            throw error;
        }
    }

    /**
     * Generates a text response using GPT-4o
     * @param {string} text - User's input text
     * @returns {Promise<string>} AI response
     */
    async generateResponse(text) {
        try {
            const completion = await this.openai.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a helpful and witty voice assistant on Discord." },
                    { role: "user", content: text }
                ],
                model: config.openai.model,
            });
            const response = completion.choices[0].message.content;
            console.log(`🤖 AI Response: "${response}"`);
            return response;
        } catch (error) {
            console.error('Error generating response:', error);
            throw error;
        }
    }

    /**
     * Translates text bi-directionally between two languages
     * @param {string} text - Input text
     * @param {string} langA - Primary language
     * @param {string} langB - Secondary language
     * @returns {Promise<string>} Translated text
     */
    async translateText(text, langA, langB) {
        try {
            const completion = await this.openai.chat.completions.create({
                messages: [
                    { role: "system", content: `You are a professional bidirectional interpreter between ${langA} and ${langB}. 
                    If the input is in ${langA}, translate it to ${langB}. 
                    If the input is in ${langB}, translate it to ${langA}. 
                    If the input is in a different language, translate it to ${langA}.
                    Output ONLY the translated text, nothing else.` },
                    { role: "user", content: text }
                ],
                model: 'gpt-3.5-turbo',
            });
            const response = completion.choices[0].message.content;
            console.log(`🌍 Translation (${langA} <-> ${langB}): "${response}"`);
            return response;
        } catch (error) {
            console.error('Error translating text:', error);
            throw error;
        }
    }

    /**
     * Generates speech from text using OpenAI TTS
     * @param {string} text - Text to convert to speech
     * @returns {Promise<Buffer>} Audio buffer
     */
    async generateSpeech(text) {
        try {
            console.log(`🗣️ Generating speech for: "${text}"...`);
            const mp3 = await this.openai.audio.speech.create({
                model: config.openai.ttsModel,
                voice: config.openai.voice,
                input: text,
            });
            const buffer = Buffer.from(await mp3.arrayBuffer());
            return buffer;
        } catch (error) {
            console.error('Error generating speech:', error);
            throw error;
        }
    }
}

module.exports = new OpenAIService();
