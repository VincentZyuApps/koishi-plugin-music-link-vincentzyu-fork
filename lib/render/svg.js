"use strict";

const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

// 模块级缓存 - 读取package.json获取版本信息
const _pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8'));

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

/**
 * 渲染歌单SVG图片
 * @param {Array} songs - 歌曲列表
 * @param {Object} options - 渲染选项
 * @param {boolean} options.darkMode - 是否启用深色模式
 * @param {string} options.themeColor - 主题颜色
 * @param {number} options.scale - 缩放比例
 * @param {number} options.width - 图片宽度
 * @param {number} options.columns - 列数
 * @param {string} options.columnLayoutMode - 列排列模式：'column-first'(先上下再左右) 或 'row-first'(先左右再上下)
 * @param {boolean} options.showSongDividers - 是否显示分割线
 * @param {boolean} options.showSongBackground - 是否显示背景
 * @param {boolean} options.showRenderInfo - 是否显示渲染信息
 * @param {boolean} options.enableCustomFont - 是否启用自定义字体
 * @param {string[]} options.fontFiles - 字体文件路径数组（绝对路径）
 * @param {string[]} options.fontFamilies - font-family名称数组
 */
function renderSongListSvg(songs, options = {}) {
    const startTime = Date.now();
    const {
        darkMode = false,
        themeColor = '#7e57c2',
        scale = 2.5,
        width = 666,
        columns = 2,
        columnLayoutMode = 'row-first', // 'column-first' 或 'row-first'
        showSongDividers = true,
        showSongBackground = true,
        version = _pkg.version || '',
        repositoryUrl = _pkg.repository?.url || '',
        showRenderInfo = true,
        enableCustomFont = true,
        fontFiles = [],
        fontFamilies = ['LXGWWenKaiMono, sans-serif'],
        showVersionInfo = true,
    } = options;

    const timestamp = new Date().toLocaleString('zh-CN');

    // 确定使用的fontFamily
    const fontFamily = fontFamilies.length > 0 ? fontFamilies[0] : 'sans-serif';

    // 只生成一次SVG字符串，renderTime设为0（不在图片中显示渲染时间）
    const svgString = generateSongListSvgString(songs, {
        darkMode, themeColor, width, columns, showSongDividers, showSongBackground,
        version, timestamp, repositoryUrl, scale, renderTime: 0, fontFamily,
        showVersionInfo
    });

    // 准备Resvg字体配置
    let resvgFontConfig = {
        loadSystemFonts: false,
        defaultFontFamily: fontFamily,
    };

    // 如果启用自定义字体且有字体文件路径
    if (enableCustomFont && Array.isArray(fontFiles) && fontFiles.length > 0) {
        // 过滤出存在的字体文件
        const availableFonts = fontFiles.filter(fp => fs.existsSync(fp));

        if (availableFonts.length > 0) {
            resvgFontConfig.fontFiles = availableFonts;
        }
    }

    // 创建Resvg实例
    const resvg = new Resvg(svgString, {
        fitTo: { mode: 'zoom', value: scale },
        font: resvgFontConfig,
    });

    // 只渲染一次PNG
    const pngData = resvg.render();
    const elapsed = Date.now() - startTime;

    return {
        buffer: pngData.asPng(),
        // renderInfo用于在文本消息中显示统计信息（不在图片上显示）
        renderInfo: showRenderInfo ? `(🏗️ resvg渲染耗时：${elapsed}ms | 缩放：${scale}x)\n\n` : null,
    };
}

function generateSongListSvgString(songs, options) {
    const {
        darkMode, themeColor, width = 666, columns = 2, columnLayoutMode = 'row-first',
        showSongDividers = true, showSongBackground = true, version = '', timestamp = '',
        repositoryUrl = '', scale = 1, renderTime = 0, fontFamily = 'LXGWWenKaiMono, sans-serif',
        showVersionInfo = true
    } = options;

    const bgColor = darkMode ? '#0d1117' : '#ffffff';
    const cardBg = darkMode ? '#161b22' : '#f6f8fa';
    const textColor = darkMode ? '#e6edf3' : '#1f2328';
    const subTextColor = darkMode ? '#8b949e' : '#656d76';
    const dividerColor = darkMode ? '#30363d' : '#d0d7de';
    const accentColor = themeColor;
    const watermarkColor = darkMode ? '#484f58' : '#8b949e';
    const headerBgColor = darkMode ? '#1f2937' : '#f0f2f5';

    const W = width;
    const PADDING = 16;
    const CARD_RX = 8;
    // 使用传入的fontFamily参数，不再硬编码

    const itemHeight = 50;
    const headerHeight = 52;
    const footerHeight = 68;

    // 根据排列模式计算行列
    let songsPerCol, totalHeight, H, colWidth, cardWidth;

    if (columnLayoutMode === 'row-first') {
        // 先左右再上下：按行填充
        const rows = Math.ceil(songs.length / columns);
        songsPerCol = rows; // 这里实际是每列的行数
        totalHeight = headerHeight + rows * itemHeight + footerHeight;
        H = Math.max(150, totalHeight);
        colWidth = (W - PADDING * 2) / columns;
        cardWidth = colWidth - 8;
    } else {
        // 先上下再左右（默认）：按列填充
        songsPerCol = Math.ceil(songs.length / columns);
        totalHeight = headerHeight + songsPerCol * itemHeight + footerHeight;
        H = Math.max(150, totalHeight);
        colWidth = (W - PADDING * 2) / columns;
        cardWidth = colWidth - 8;
    }

    let songItems = '';
    for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        let col, row;

        if (columnLayoutMode === 'row-first') {
            // 先左右再上下：按行填充
            row = Math.floor(i / columns);
            col = i % columns;
        } else {
            // 先上下再左右（默认）：按列填充
            col = Math.floor(i / songsPerCol);
            row = i % songsPerCol;
        }

        const x = PADDING + col * colWidth;
        const y = headerHeight + row * itemHeight;

        if (showSongBackground) {
            songItems += `<rect x="${x}" y="${y}" width="${cardWidth}" height="${itemHeight - 4}" rx="${CARD_RX}" fill="${cardBg}" stroke="${accentColor}" stroke-width="1" stroke-opacity="0.2"/>`;
        }

        const colOffset = x + 5;
        const indexBoxSize = 22;
        const indexBoxX = colOffset;
        const indexBoxY = y + 14;
        songItems += `<rect x="${indexBoxX}" y="${indexBoxY}" width="${indexBoxSize}" height="${indexBoxSize}" rx="6" fill="${accentColor}" fill-opacity="0.15"/>`;
        songItems += `<text x="${indexBoxX + indexBoxSize / 2}" y="${indexBoxY + 15}" font-size="11" fill="${accentColor}" font-family="${fontFamily}" font-weight="600" text-anchor="middle">${i + 1}</text>`;

        const unifiedTagWidth = 40;
        const labelX = colOffset + 28;
        const infoY = y + 16;
        const textClipId = `text-clip-${i}`;
        const textClipWidth = cardWidth - 28 - unifiedTagWidth - 14;
        songItems += `<clipPath id="${textClipId}"><rect x="${labelX}" y="${y + 4}" width="${textClipWidth}" height="${itemHeight - 10}" /></clipPath>`;

        let artistStr = song.artists;
        if (Array.isArray(artistStr)) {
            artistStr = artistStr.map(a => a.name || a).join('/');
        }
        const artist = artistStr || song.singer || song.artist || '未知歌手';
        const title = song.name || song.song || song.title || '未知歌名';
        songItems += `<text x="${labelX}" y="${infoY}" font-size="13" fill="${textColor}" font-family="${fontFamily}" font-weight="600" clip-path="url(#${textClipId})">${escapeXml(title)}</text>`;

        const infoY2 = y + 28;
        songItems += `<text x="${labelX}" y="${infoY2}" font-size="11" fill="${subTextColor}" font-family="${fontFamily}" clip-path="url(#${textClipId})">${escapeXml(artist)}</text>`;

        const albumStr = song.album?.name || song.albumName || song.album;
        if (albumStr) {
            const infoY3 = y + 38;
            songItems += `<text x="${labelX}" y="${infoY3}" font-size="10" fill="${subTextColor}" font-family="${fontFamily}" clip-path="url(#${textClipId})">${escapeXml(albumStr)}</text>`;
        }

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
            const tagBg = tag.type === 'duration' ? (darkMode ? '#21262d' : '#eaeef2') : (tag.bgColor || (tag.type === 'quality' ? themeColor : '#31c27c'));
            songItems += `<rect x="${tagX - tag.width}" y="${tagY}" width="${tag.width}" height="${tagH}" rx="4" fill="${tagBg}" ${tag.bgOpacity ? `opacity="${tag.bgOpacity}"` : ''}/>`;
            const textColorVal = tag.type === 'quality' ? themeColor : tag.color;
            songItems += `<text x="${tagX - tag.width / 2}" y="${tagY + 13}" font-size="11" fill="${textColorVal}" font-family="${fontFamily}" text-anchor="middle" font-weight="600">${tag.text}</text>`;
        }

        if (showSongDividers) {
            songItems += `<line x1="${x + 4}" y1="${y + itemHeight - 4}" x2="${x + cardWidth - 4}" y2="${y + itemHeight - 4}" stroke="${dividerColor}" stroke-width="1" stroke-opacity="0.5"/>`;
        }
    }

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${bgColor}" rx="0"/>
  <rect x="${PADDING}" y="${PADDING}" width="${W - PADDING * 2}" height="${H - PADDING * 2}" rx="${CARD_RX}" fill="${cardBg}" stroke="${accentColor}" stroke-width="1" stroke-opacity="0.3"/>
  
  <rect x="${PADDING}" y="${PADDING}" width="${W - PADDING * 2}" height="${headerHeight - PADDING}" rx="${CARD_RX} ${CARD_RX} 0 0" fill="${accentColor}" fill-opacity="0.1"/>
  <text x="${PADDING + 16}" y="${PADDING + 20}" font-size="15" fill="${accentColor}" font-family="${fontFamily}" font-weight="600">🎵 歌单</text>
  <text x="${PADDING + 76}" y="${PADDING + 20}" font-size="12" fill="${subTextColor}" font-family="${fontFamily}">${songs.length} 首</text>
  
  <line x1="${PADDING + 12}" y1="${PADDING + 32}" x2="${W - PADDING - 12}" y2="${PADDING + 32}" stroke="${accentColor}" stroke-width="1" stroke-opacity="0.3"/>
  
  ${songItems}
  
  ${showVersionInfo ? `
  <text x="${PADDING + 8}" y="${H - 63}" font-size="9" fill="${watermarkColor}" font-family="${fontFamily}">generated by koishi plugin: music-link-vincentzyu-fork</text>
  <text x="${PADDING + 8}" y="${H - 53}" font-size="9" fill="${watermarkColor}" font-family="${fontFamily}">version: ${version || 'unknown'}</text>
  <text x="${PADDING + 8}" y="${H - 43}" font-size="9" fill="${watermarkColor}" font-family="${fontFamily}">date_time: ${timestamp}</text>
  <text x="${PADDING + 8}" y="${H - 33}" font-size="9" fill="${watermarkColor}" font-family="${fontFamily}">repo_url: ${repositoryUrl || 'unknown'}</text>
  <text x="${PADDING + 8}" y="${H - 23}" font-size="9" fill="${watermarkColor}" font-family="${fontFamily}">scale: ${scale}x</text>
  ` : ''}
</svg>
  `;

    return svg.trim();
}

function escapeXml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function formatDuration(seconds) {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

module.exports = {
    renderSongListSvg,
    generateSongListSvgString,
};
