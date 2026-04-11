"use strict";

const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

// 模块级缓存 - 读取package.json获取版本信息
const _pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));

function renderSongListSvg(songs, options = {}) {
  const startTime = Date.now();
  const {
    darkMode = false,
    themeColor = '#7e57c2',
    scale = 2.5,
    width = 666,
    columns = 2,
    showSongDividers = true,
    showSongBackground = true,
    version = _pkg.version || '',
    repositoryUrl = _pkg.repository?.url || '',
    showRenderInfo = true,
  } = options;

  const timestamp = new Date().toLocaleString('zh-CN');

  const svgWithoutTime = generateSongListSvgString(songs, { darkMode, themeColor, width, columns, showSongDividers, showSongBackground, version, timestamp, repositoryUrl, scale, renderTime: 0 });

  const resvg = new Resvg(svgWithoutTime, {
    fitTo: { mode: 'zoom', value: scale },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: 'sans-serif',
    },
  });

  const pngData = resvg.render();
  const elapsed = Date.now() - startTime;
  
  const svgWithTime = generateSongListSvgString(songs, { darkMode, themeColor, width, columns, showSongDividers, showSongBackground, version, timestamp, repositoryUrl, scale, renderTime: elapsed });
  
  const resvgWithTime = new Resvg(svgWithTime, {
    fitTo: { mode: 'zoom', value: scale },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: 'sans-serif',
    },
  });
  
  const pngDataWithTime = resvgWithTime.render();
  
  return {
    buffer: pngDataWithTime.asPng(),
    renderInfo: showRenderInfo ? `(🚀 resvg 渲染耗时：${elapsed}ms | 缩放：${scale}x)\n\n` : null,
  };
}

function generateSongListSvgString(songs, options) {
  const { darkMode, themeColor, width = 666, columns = 2, showSongDividers = true, showSongBackground = true, version = '', timestamp = '', repositoryUrl = '', scale = 1, renderTime = 0 } = options;

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
  const fontFamily = 'sans-serif';

  const itemHeight = 50;
  const headerHeight = 52;
  const footerHeight = 68;
  const songsPerCol = Math.ceil(songs.length / columns);
  const totalHeight = headerHeight + songsPerCol * itemHeight + footerHeight;
  const H = Math.max(150, totalHeight);
  const colWidth = (W - PADDING * 2) / columns;
  const cardWidth = colWidth - 8;

  let songItems = '';
  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    const col = Math.floor(i / songsPerCol);
    const row = i % songsPerCol;
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

    const labelX = colOffset + 28;
    const infoY = y + 16;

    let artistStr = song.artists;
    if (Array.isArray(artistStr)) {
       artistStr = artistStr.map(a => a.name || a).join('/');
    }
    const artist = artistStr || song.singer || song.artist || '未知歌手';
    const title = truncate(song.name || song.song || song.title || '未知歌名', 19);
    songItems += `<text x="${labelX}" y="${infoY}" font-size="13" fill="${textColor}" font-family="${fontFamily}" font-weight="600">${escapeXml(title)}</text>`;
    
    const infoY2 = y + 28;
    songItems += `<text x="${labelX}" y="${infoY2}" font-size="11" fill="${subTextColor}" font-family="${fontFamily}">${escapeXml(truncate(artist, 21))}</text>`;

    const albumStr = song.album?.name || song.albumName || song.album;
    if (albumStr) {
      const infoY3 = y + 38;
      const album = truncate(albumStr, 25);
      songItems += `<text x="${labelX}" y="${infoY3}" font-size="10" fill="${subTextColor}" font-family="${fontFamily}">${escapeXml(album)}</text>`;
    }

    const tagX = x + cardWidth - 5;
    const tagH = 18;
    const tagYBase = y + 3;
    const tagSpacing = 3;
    const tags = [];
    // 统一标签宽度，确保所有标签左边缘和右边缘对齐
    const unifiedTagWidth = 40;

    if (song.platform) {
      const platformText = song.platform === 'netease' ? '网易' : 'QQ';
      const platformBg = song.platform === 'netease' ? '#e4393c' : '#31c27c';
      tags.push({ type: 'platform', text: platformText, color: '#ffffff', bgColor: platformBg, width: unifiedTagWidth });
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
  
  <text x="${PADDING + 8}" y="${H - 63}" font-size="9" fill="${watermarkColor}" font-family="${fontFamily}">generated by koishi plugin: music-link-vincentzyu-fork</text>
  <text x="${PADDING + 8}" y="${H - 53}" font-size="9" fill="${watermarkColor}" font-family="${fontFamily}">version: ${version || 'unknown'}</text>
  <text x="${PADDING + 8}" y="${H - 43}" font-size="9" fill="${watermarkColor}" font-family="${fontFamily}">date_time: ${timestamp}</text>
  <text x="${PADDING + 8}" y="${H - 33}" font-size="9" fill="${watermarkColor}" font-family="${fontFamily}">repo_url: ${repositoryUrl || 'unknown'}</text>
  <text x="${PADDING + 8}" y="${H - 23}" font-size="9" fill="${watermarkColor}" font-family="${fontFamily}">scale: ${scale}x</text>
</svg>
  `;

  return svg.trim();
}

function truncate(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
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

function getQualityText(quality) {
  const qualityMap = {
    1: '标准', 2: '标准', 3: 'HQ', 4: 'HQ',
    5: 'SQ', 6: 'Hi-Res', 7: '杜比', 8: '沉浸', 9: '母带',
  };
  return qualityMap[quality] || '标准';
}

module.exports = {
  renderSongListSvg,
  generateSongListSvgString,
};
