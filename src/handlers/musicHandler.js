// src/handlers/musicHandler.js
const { Player, useQueue } = require('discord-player');
const { YoutubeiExtractor, Log } = require('discord-player-youtubei');

// youtubei.js floods the console with harmless parser warnings whenever
// YouTube ships UI components it doesn't know yet; only surface real errors.
Log.setLevel(Log.Level.ERROR);
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const logger = require('../utils/logger');

const COLORS = {
    playing: 0x1db954, // Spotify green
    added: 0x5865f2,   // Discord blurple
    info: 0xfee75c,    // Yellow
    error: 0xed4245    // Red
};

// --- UI BUILDERS ---

function controlsRow(paused = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('music_toggle')
            .setEmoji(paused ? '▶️' : '⏸️')
            .setLabel(paused ? 'Resume' : 'Pause')
            .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('music_skip')
            .setEmoji('⏭️')
            .setLabel('Skip')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('music_stop')
            .setEmoji('⏹️')
            .setLabel('Stop')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('music_shuffle')
            .setEmoji('🔀')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('music_queue')
            .setEmoji('📜')
            .setLabel('Queue')
            .setStyle(ButtonStyle.Secondary)
    );
}

function miniEmbed(text, color = COLORS.info) {
    return new EmbedBuilder().setColor(color).setDescription(text);
}

function nowPlayingEmbed(queue, track) {
    return new EmbedBuilder()
        .setColor(COLORS.playing)
        .setAuthor({ name: '🎶 Now playing' })
        .setTitle(track.title)
        .setURL(track.url)
        .setThumbnail(track.thumbnail)
        .addFields(
            { name: '🎤 Artist', value: track.author || 'Unknown', inline: true },
            { name: '⏱️ Duration', value: track.duration || '—', inline: true },
            { name: '🙋 Requested by', value: `${track.requestedBy ?? '—'}`, inline: true }
        )
        .setFooter({
            text: queue.tracks.size > 0
                ? `${queue.tracks.size} song(s) waiting in the queue`
                : 'No more songs in the queue'
        })
        .setTimestamp();
}

function formatMS(ms) {
    if (!ms || ms <= 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

function queueEmbed(queue) {
    const current = queue.currentTrack;
    const tracks = queue.tracks.toArray();

    const embed = new EmbedBuilder()
        .setColor(COLORS.added)
        .setAuthor({ name: '📜 Queue' });

    if (current) {
        embed.setThumbnail(current.thumbnail);
        embed.addFields({
            name: '▶️ Now playing',
            value: `[${current.title}](${current.url}) · \`${current.duration}\` · ${current.requestedBy ?? ''}`
        });
    }

    if (tracks.length === 0) {
        embed.setDescription('The queue is empty. Use `/play` to add songs.');
    } else {
        const lines = tracks
            .slice(0, 10)
            .map((t, i) => `**${i + 1}.** [${t.title}](${t.url}) · \`${t.duration}\``);
        if (tracks.length > 10) {
            lines.push(`*…and ${tracks.length - 10} more*`);
        }
        embed.addFields({ name: '⏭️ Up next', value: lines.join('\n') });

        const totalMS = tracks.reduce((acc, t) => acc + (t.durationMS || 0), 0);
        embed.setFooter({ text: `${tracks.length} song(s) · total duration ${formatMS(totalMS)}` });
    }

    return embed;
}

// --- HELPERS ---

async function clearControls(queue) {
    const meta = queue.metadata;
    if (meta?.nowPlaying) {
        await meta.nowPlaying.edit({ components: [] }).catch(() => {});
        meta.nowPlaying = null;
    }
}

// --- SETUP ---

function init(client) {
    const player = new Player(client);
    client.player = player;

    // Stream via yt-dlp: YouTube blocks the default innertube clients,
    // which makes tracks "play" without producing any audio.
    player.extractors.register(YoutubeiExtractor, { useYoutubeDL: true })
        .then(() => logger.info('Music: YouTube extractor registered.'))
        .catch(err => logger.error('Music: failed to register the YouTube extractor:', err));

    player.events.on('playerStart', async (queue, track) => {
        const meta = queue.metadata;
        if (!meta?.channel) return;
        try {
            if (meta.nowPlaying) {
                meta.nowPlaying.delete().catch(() => {});
                meta.nowPlaying = null;
            }
            meta.nowPlaying = await meta.channel.send({
                embeds: [nowPlayingEmbed(queue, track)],
                components: [controlsRow(false)]
            });
        } catch (err) {
            logger.error('Music: could not send the "Now playing" message:', err);
        }
    });

    player.events.on('emptyQueue', async (queue) => {
        await clearControls(queue);
        queue.metadata?.channel?.send({
            embeds: [miniEmbed('✅ Queue finished. Add more songs with `/play`!')]
        }).catch(() => {});
    });

    player.events.on('disconnect', async (queue) => {
        await clearControls(queue);
    });

    player.events.on('playerError', (queue, error) => {
        logger.error('Music: error playing the track:', error);
        queue.metadata?.channel?.send({
            embeds: [miniEmbed('⚠️ There was an error playing that song, skipping it.', COLORS.error)]
        }).catch(() => {});
    });

    player.events.on('error', (queue, error) => {
        logger.error('Music: queue error:', error);
    });

    return player;
}

// --- BUTTON INTERACTIONS ---

async function handleButton(interaction) {
    const queue = useQueue(interaction.guildId);

    if (!queue || !queue.currentTrack) {
        return interaction.reply({
            embeds: [miniEmbed('🔇 There is no music playing right now.', COLORS.error)],
            flags: MessageFlags.Ephemeral
        });
    }

    // Viewing the queue is allowed from anywhere; controls require being in the voice channel
    const memberChannelId = interaction.member?.voice?.channelId;
    if (interaction.customId !== 'music_queue' && queue.channel && memberChannelId !== queue.channel.id) {
        return interaction.reply({
            embeds: [miniEmbed('🎧 You need to be in my voice channel to use the controls.', COLORS.error)],
            flags: MessageFlags.Ephemeral
        });
    }

    switch (interaction.customId) {
        case 'music_toggle': {
            const paused = !queue.node.isPaused();
            queue.node.setPaused(paused);
            return interaction.update({ components: [controlsRow(paused)] });
        }
        case 'music_skip': {
            const skipped = queue.currentTrack;
            queue.node.skip();
            return interaction.reply({
                embeds: [miniEmbed(`⏭️ ${interaction.user} skipped **${skipped.title}**.`)]
            });
        }
        case 'music_stop': {
            queue.delete();
            await interaction.update({ components: [] }).catch(() => {});
            return interaction.followUp({
                embeds: [miniEmbed(`⏹️ ${interaction.user} stopped the music and cleared the queue.`)]
            });
        }
        case 'music_shuffle': {
            queue.tracks.shuffle();
            return interaction.reply({
                embeds: [miniEmbed(`🔀 ${interaction.user} shuffled the queue (${queue.tracks.size} songs).`)]
            });
        }
        case 'music_queue': {
            return interaction.reply({
                embeds: [queueEmbed(queue)],
                flags: MessageFlags.Ephemeral
            });
        }
    }
}

module.exports = {
    init,
    handleButton,
    controlsRow,
    nowPlayingEmbed,
    queueEmbed,
    miniEmbed,
    COLORS
};
