"use strict";

function formatDuration(ms) {
    if (!ms || ms <= 0) return '-';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getArtistDisplay(artist) {
    if (!artist) return '未知';
    if (Array.isArray(artist)) {
        return artist.map(a => a.name || a).join(', ');
    }
    return artist;
}

function renderSongListMarkdownTable(songList, config = {}) {
    if (!songList || !Array.isArray(songList) || songList.length === 0) {
        return '';
    }

    const maxDisplay = config.maxDisplay || 10;
    const displayList = songList.slice(0, maxDisplay);

    let md = `# 🎵 歌单列表\n\n`;
    md += `| # | 歌曲名称 | 歌手 | 时长 |\n`;
    md += `|---|---------|------|-----|\n`;

    displayList.forEach((song, index) => {
        const name = song.name || song.song || '未知';
        const artist = song.artists || song.artist || song.ar || song.singer || '未知';
        const duration = formatDuration(song.duration);
        
        md += `| ${index + 1} | ${name} | ${getArtistDisplay(artist)} | ${duration} |\n`;
    });

    if (songList.length > maxDisplay) {
        md += `\n> 共 ${songList.length} 首歌曲，显示前 ${maxDisplay} 首\n`;
    }

    return md;
}

function renderSongListMarkdownStyle(songList, config = {}) {
    if (!songList || !Array.isArray(songList) || songList.length === 0) {
        return '';
    }

    const maxDisplay = config.maxDisplay || 10;
    const displayList = songList.slice(0, maxDisplay);

    let md = `# 🎵 歌单列表\n\n`;

    displayList.forEach((song, index) => {
        const name = song.name || song.song || '未知';
        const artist = song.artists || song.artist || song.ar || song.singer || '未知';
        const duration = formatDuration(song.duration);

        md += `### ${index + 1}. ${name}\n`;
        md += `> 👤 **歌手**: ${getArtistDisplay(artist)}\n`;
        md += `> ⏱️ **时长**: ${duration}\n\n`;
        md += `---\n\n`;
    });

    if (songList.length > maxDisplay) {
        md += `> 📋 共 ${songList.length} 首歌曲，显示前 ${maxDisplay} 首\n`;
    }

    return md;
}

async function sendQQMarkdown(ctx, session, content) {
    try {
        await session.bot.internal.sendMessage(session.channelId, {
            msg_id: session.messageId,
            msg_type: 2,
            markdown: {
                content: content
            }
        });
        return true;
    } catch (error) {
        ctx.logger.error('发送 QQ Markdown 失败:', error);
        return false;
    }
}

module.exports = {
    renderSongListMarkdownTable,
    renderSongListMarkdownStyle,
    sendQQMarkdown
};
