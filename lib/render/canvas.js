"use strict";

const fs = require('node:fs');
const path = require('node:path');
const { summarizeError } = require('../util/logger');

let napiCanvas;
try { napiCanvas = require('@napi-rs/canvas'); } catch { napiCanvas = null; }

const _pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8'));

const _fontCache = new Set();

function getPlatformTagInfo(platform) {
    switch (platform) {
        case 'netease':
            return { text: '网易', bg: '#e4393c' };
        case 'tencent':
            return { text: 'QQ', bg: '#31c27c' };
        case 'kugou':
            return { text: '酷狗', bg: '#2f86ff' };
        default:
            return null;
    }
}

function registerFont(fontPath, alias, musicLogger) {
    const cacheKey = `${fontPath}::${alias || ''}`;
    if (!napiCanvas || _fontCache.has(cacheKey)) return false;
    if (!fs.existsSync(fontPath)) return false;
    try {
        napiCanvas.GlobalFonts.registerFromPath(fontPath, alias);
        _fontCache.add(cacheKey);
        return true;
    } catch (e) {
        musicLogger?.logInfo('⚠️ Canvas 字体注册失败，将使用后备字体', summarizeError(e));
        musicLogger?.logDebug('Canvas 字体注册异常', () => ({ fontPath, alias, error: e }));
        return false;
    }
}

function normalizeFontFamilyList(fontFamilies) {
    if (!Array.isArray(fontFamilies)) return ['sans-serif'];

    const families = fontFamilies
        .flatMap(item => String(item || '').split(','))
        .map(item => item.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);

    return families.length > 0 ? families : ['sans-serif'];
}

function buildFontSpec(sizePx, families, weight = null) {
    const familySpec = families.map(name => `"${name}"`).join(', ');
    return `${weight ? `${weight} ` : ''}${sizePx}px ${familySpec}`;
}

function mergeFontFamilies(...familyGroups) {
    const merged = [];
    for (const group of familyGroups) {
        for (const family of group || []) {
            if (family && !merged.includes(family)) {
                merged.push(family);
            }
        }
    }
    return merged;
}

function formatDuration(seconds) {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function renderSongListCanvas(songs, options = {}) {
    if (!napiCanvas) {
        return { buffer: null, renderInfo: null, error: '@napi-rs/canvas not installed' };
    }

    const startTime = Date.now();
    const {
        darkMode = false,
        themeColor = '#7e57c2',
        width = 666,
        scale = 2,
        columns = 2,
        columnLayoutMode = 'row-first',
        showSongDividers = true,
        showSongBackground = true,
        version = _pkg.version || '',
        repositoryUrl = _pkg.repository?.url || '',
        showRenderInfo = true,
        enableCustomFont = true,
        fontFiles = [],
        fontFamilies = ['LXGWWenKaiMono, sans-serif'],
        showVersionInfo = true,
        musicLogger,
    } = options;

    const timestamp = new Date().toLocaleString('zh-CN');
    const familyList = normalizeFontFamilyList(fontFamilies);
    const primaryFont = familyList[0];
    const footerFamilyList = mergeFontFamilies(
        familyList,
        ['Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'sans-serif']
    );

    if (enableCustomFont && Array.isArray(fontFiles)) {
        for (const fp of fontFiles) {
            if (fs.existsSync(fp)) {
                registerFont(fp, primaryFont, musicLogger);
            }
        }
    }

    const bgColor = darkMode ? '#0d1117' : '#ffffff';
    const cardBg = darkMode ? '#161b22' : '#f6f8fa';
    const textColor = darkMode ? '#e6edf3' : '#1f2328';
    const subTextColor = darkMode ? '#8b949e' : '#656d76';
    const dividerColor = darkMode ? '#30363d' : '#d0d7de';
    const accentColor = themeColor;
    const watermarkColor = darkMode ? '#484f58' : '#8b949e';

    const W = width;
    const PADDING = 16;
    const CARD_RX = 8;
    const itemHeight = 50;
    const headerHeight = 52;
    const footerHeight = showVersionInfo ? 68 : 20;

    let songsPerCol, rows;
    if (columnLayoutMode === 'row-first') {
        rows = Math.ceil(songs.length / columns);
        songsPerCol = rows;
    } else {
        songsPerCol = Math.ceil(songs.length / columns);
        rows = songsPerCol;
    }

    const totalHeight = headerHeight + rows * itemHeight + footerHeight;
    const H = Math.max(150, totalHeight);
    const colWidth = (W - PADDING * 2) / columns;
    const cardWidth = colWidth - 8;
    const internalScale = Number.isFinite(scale) ? Math.max(1, scale) : 2;

    const canvas = napiCanvas.createCanvas(Math.round(W * internalScale), Math.round(H * internalScale));
    const ctx = canvas.getContext('2d');
    ctx.scale(internalScale, internalScale);

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    roundRect(ctx, PADDING, PADDING, W - PADDING * 2, H - PADDING * 2, CARD_RX);
    ctx.fillStyle = cardBg;
    ctx.fill();
    ctx.strokeStyle = hexToRgba(accentColor, 0.3);
    ctx.lineWidth = 1;
    ctx.stroke();

    roundRect(ctx, PADDING, PADDING, W - PADDING * 2, headerHeight - PADDING, CARD_RX);
    ctx.fillStyle = hexToRgba(accentColor, 0.1);
    ctx.fill();

    ctx.font = buildFontSpec(15, footerFamilyList, 500);
    ctx.fillStyle = accentColor;
    ctx.textBaseline = 'middle';
    ctx.fillText('🎧 歌单', PADDING + 16, PADDING + 20);

    ctx.font = buildFontSpec(12, familyList);
    ctx.fillStyle = subTextColor;
    ctx.fillText(`${songs.length} 首`, PADDING + 76, PADDING + 20);

    ctx.beginPath();
    ctx.moveTo(PADDING + 12, PADDING + 32);
    ctx.lineTo(W - PADDING - 12, PADDING + 32);
    ctx.strokeStyle = hexToRgba(accentColor, 0.3);
    ctx.lineWidth = 1;
    ctx.stroke();

    for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        let col, row;

        if (columnLayoutMode === 'row-first') {
            row = Math.floor(i / columns);
            col = i % columns;
        } else {
            col = Math.floor(i / songsPerCol);
            row = i % songsPerCol;
        }

        const x = PADDING + col * colWidth;
        const y = headerHeight + row * itemHeight;

        if (showSongBackground) {
            roundRect(ctx, x, y, cardWidth, itemHeight - 4, CARD_RX);
            ctx.fillStyle = cardBg;
            ctx.fill();
            ctx.strokeStyle = hexToRgba(accentColor, 0.2);
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        const colOffset = x + 5;
        const indexBoxSize = 22;
        const indexBoxX = colOffset;
        const indexBoxY = y + 14;

        roundRect(ctx, indexBoxX, indexBoxY, indexBoxSize, indexBoxSize, 6);
        ctx.fillStyle = hexToRgba(accentColor, 0.15);
        ctx.fill();

        ctx.font = buildFontSpec(11, familyList, 500);
        ctx.fillStyle = accentColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}`, indexBoxX + indexBoxSize / 2, indexBoxY + indexBoxSize / 2);
        ctx.textAlign = 'left';

        const unifiedTagWidth = 40;
        const labelX = colOffset + 28;
        const titleYOffset = -4;
        const metaYOffset = -2;
        const textClipX = labelX;
        const textClipY = y + 4;
        const textClipWidth = cardWidth - 28 - unifiedTagWidth - 14;
        const textClipHeight = itemHeight - 10;

        let artistStr = song.artists;
        if (Array.isArray(artistStr)) {
            artistStr = artistStr.map(a => a.name || a).join('/');
        }
        const artist = artistStr || song.singer || song.artist || '未知歌手';
        const title = song.name || song.song || song.title || '未知歌名';

        ctx.save();
        ctx.beginPath();
        ctx.rect(textClipX, textClipY, textClipWidth, textClipHeight);
        ctx.clip();

        ctx.font = buildFontSpec(13, familyList, 500);
        ctx.fillStyle = textColor;
        ctx.textBaseline = 'middle';
        ctx.fillText(title, labelX, y + 16 + titleYOffset);

        ctx.font = buildFontSpec(11, familyList);
        ctx.fillStyle = subTextColor;
        ctx.fillText(artist, labelX, y + 28 + metaYOffset);

        const albumStr = song.album?.name || song.albumName || song.album;
        if (albumStr) {
            ctx.font = buildFontSpec(10, familyList);
            ctx.fillStyle = subTextColor;
            ctx.fillText(albumStr, labelX, y + 38 + metaYOffset);
        }

        ctx.restore();

        const tagX = x + cardWidth - 5;
        const tagH = 18;
        const tagYBase = y + 3;
        const tagSpacing = 3;
        const tags = [];

        if (song.platform) {
            const platformTag = getPlatformTagInfo(song.platform);
            if (platformTag) {
                tags.push({ type: 'platform', text: platformTag.text, color: '#ffffff', bgColor: platformTag.bg, width: unifiedTagWidth });
            }
        }

        if (song.duration) {
            const duration = formatDuration(Math.floor(song.duration / 1000));
            tags.push({ type: 'duration', text: duration, color: subTextColor, width: unifiedTagWidth });
        }

        for (let t = 0; t < tags.length; t++) {
            const tag = tags[t];
            const tagY = tagYBase + t * (tagH + tagSpacing);
            const tagBg = tag.type === 'duration'
                ? (darkMode ? '#21262d' : '#eaeef2')
                : (tag.bgColor || accentColor);

            roundRect(ctx, tagX - tag.width, tagY, tag.width, tagH, 4);
            ctx.fillStyle = tagBg;
            ctx.fill();

            ctx.font = buildFontSpec(11, familyList, 500);
            ctx.fillStyle = tag.type === 'quality' ? accentColor : tag.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tag.text, tagX - tag.width / 2, tagY + tagH / 2);
            ctx.textAlign = 'left';
        }

        if (showSongDividers) {
            ctx.beginPath();
            ctx.moveTo(x + 4, y + itemHeight - 4);
            ctx.lineTo(x + cardWidth - 4, y + itemHeight - 4);
            ctx.strokeStyle = hexToRgba(dividerColor, 0.5);
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    if (showVersionInfo) {
        ctx.font = buildFontSpec(9, footerFamilyList);
        ctx.fillStyle = watermarkColor;
        ctx.textBaseline = 'middle';
        const footerX = PADDING + 8;
        ctx.fillText(`🎵 generated by koishi plugin: music-link-vincentzyu-fork`, footerX, H - 63);
        ctx.fillText(`🏷️ version: ${version || 'unknown'}`, footerX, H - 53);
        ctx.fillText(`🕒 date_time: ${timestamp}`, footerX, H - 43);
        ctx.fillText(`🔗 repo_url: ${repositoryUrl || 'unknown'}`, footerX, H - 33);
        ctx.fillText(`🎨 renderer: @napi-rs/canvas (Skia)`, footerX, H - 23);
    }

    const buffer = canvas.toBuffer('image/png');
    const elapsed = Date.now() - startTime;

    return {
        buffer,
        renderInfo: showRenderInfo ? `(🎨 canvas渲染耗时：${elapsed}ms | scale: ${internalScale}x)\n\n` : null,
    };
}

module.exports = {
    renderSongListCanvas,
};
