"use strict";

const fs = require('node:fs');
const path = require('node:path');
const { IMAGE_STYLE_MAP } = require('../config');
const { summarizeError } = require('../util/logger');

/**
 * Puppeteer 渲染模块 - 使用 Headless Chrome 渲染 HTML
 * 支持多种样式：原始黑白、现代思源宋体、扁平现代
 */

// 模块级缓存
const _fontCache = new Map();
const _imageCache = new Map();
const _pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8'));

/**
 * 加载字体文件并缓存 base64
 * @param {string} fontConfigPath - 字体文件路径（必须是绝对路径）
 * @returns {Object} 包含 fontBase64、fontName、fontPath 的对象
 */
function loadFontBase64(fontConfigPath, fallbackFontPath, musicLogger) {
    // 验证路径是否为绝对路径
    if (fontConfigPath && !path.isAbsolute(fontConfigPath)) {
        musicLogger?.logInfo('⚠️ Puppeteer 字体路径不是绝对路径，已忽略', '请配置绝对路径');
        musicLogger?.logDebug('Puppeteer 无效字体路径', fontConfigPath);
        fontConfigPath = null;
    }

    const fontPath = (fontConfigPath && fs.existsSync(fontConfigPath))
        ? fontConfigPath
        : (fallbackFontPath || path.join(process.cwd(), 'data', 'assets', 'music-link-vincentzyu-fork', 'SourceHanSerifSC-Medium.otf'));

    if (_fontCache.has(fontPath)) return _fontCache.get(fontPath);

    const result = { fontBase64: '', fontName: 'SourceHanSerifSC-Medium', fontPath };
    try {
        if (fs.existsSync(fontPath)) {
            const fontBuffer = fs.readFileSync(fontPath);
            result.fontBase64 = fontBuffer.toString('base64');
            result.fontName = path.basename(fontPath, path.extname(fontPath));
        }
    } catch (error) {
        musicLogger?.logInfo('⚠️ Puppeteer 字体读取失败，将使用系统字体', summarizeError(error));
        musicLogger?.logDebug('Puppeteer 字体读取异常', () => ({ fontPath, error }));
    }

    _fontCache.set(fontPath, result);
    return result;
}

/**
 * 加载背景图片并缓存 base64
 * @param {string} imagePath - 图片文件路径（必须是绝对路径）
 * @returns {Object} 包含 base64、format 的对象
 */
function loadImageBase64(imagePath, musicLogger) {
    // 验证路径是否为绝对路径
    if (imagePath && !path.isAbsolute(imagePath)) {
        musicLogger?.logInfo('⚠️ Puppeteer 背景图片路径不是绝对路径，已忽略', '请配置绝对路径');
        musicLogger?.logDebug('Puppeteer 无效背景图片路径', imagePath);
        return { base64: '', format: 'jpeg' };
    }

    if (!imagePath || !fs.existsSync(imagePath)) return { base64: '', format: 'jpeg' };

    if (_imageCache.has(imagePath)) return _imageCache.get(imagePath);

    const result = { base64: '', format: 'jpeg' };
    try {
        const imageBuffer = fs.readFileSync(imagePath);
        result.base64 = imageBuffer.toString('base64');
        const ext = path.extname(imagePath).toLowerCase();
        if (ext === '.png') result.format = 'png';
        else if (ext === '.webp') result.format = 'webp';
        else if (ext === '.gif') result.format = 'gif';
    } catch (error) {
        musicLogger?.logInfo('⚠️ Puppeteer 背景图片读取失败，将使用纯色背景', summarizeError(error));
        musicLogger?.logDebug('Puppeteer 背景图片读取异常', () => ({ imagePath, error }));
    }

    _imageCache.set(imagePath, result);
    return result;
}

/**
 * 生成原始黑白样式的 HTML 内容
 * @param {string} listText - 歌曲列表 HTML 文本
 * @param {Object} config - 配置对象
 * @returns {string} HTML 内容
 */
function generateOriginBlackWhiteHtml(listText, config, musicLogger) {
    const version = _pkg.version;
    const repositoryUrl = _pkg.repository?.url || '';
    
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') + '-' +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');
    
    const textBrightness = config.enablePuppeteerDarkMode ? 255 : 0;
    const backgroundBrightness = config.enablePuppeteerDarkMode ? 0 : 255;
    const textColor = `rgb(${textBrightness},${textBrightness},${textBrightness})`;
    const backgroundColor = `rgb(${backgroundBrightness},${backgroundBrightness},${backgroundBrightness})`;
    
    const { fontBase64, fontName } = loadFontBase64(config.textFontPath, config.__musicLinkDefaultSourceHanSerifPath, musicLogger);
    const fontFamilyDeclaration = fontBase64
        ? `@font-face{font-family:'${fontName}';src:url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}`
        : '';
    const fontFamilyStyle = fontBase64 ? `'${fontName}', ` : '';
    
    let processedText = listText;
    if (!config.puppeteerApplySeparator) {
        // 不应用separator，将制表符替换为空字符串
        processedText = processedText.replace(/\t/g, '');
    }
    
    const formattedListText = processedText
        .replace(/\((\d+)\)/g, (match, p1) => {
            const number = parseInt(p1, 10);
            return `<b style="font-size: 1.333333333em; font-weight: bold;">(${number.toString().padStart(2, '0')})</b>`;
        })
        .replace(/\n/g, '<br />');

    const versionInfoHtml = config.puppeteerShowVersionInfo !== false ? `
<div class="version-info">
    <div>generated by koishi plugin: music-link-vincentzyu-fork</div>
    <div>version: \t ${version}</div>
    <div>date_time: \t ${timestamp}</div>
    <div>repo_url: \t ${repositoryUrl}</div>
    <div>quality: ${config.screenshotQuality || 'default'}</div>
</div>
` : '';

    return `
<!DOCTYPE html>
<html lang="zh">
<head>
<title>music</title>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
${fontFamilyDeclaration}
body {
margin: 0;
padding-top: 99px;
font-family: ${fontFamilyStyle}PingFang SC, Hiragino Sans GB, Microsoft YaHei, SimSun, sans-serif;
font-size: 16px;
background: ${backgroundColor};
color: ${textColor};
position: relative;
}
.header-bar {
    position: fixed;
    top: 55px;
    left: 0;
    right: 0;
    height: 50px;
    background: ${config.enablePuppeteerDarkMode ? '#1a1a1a' : '#f5f5f5'};
    border-bottom: 2px solid #808080;
    margin-bottom: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
}
.header-title {
    font-size: 20px;
    font-weight: bold;
    color: ${textColor};
}
#song-list {
padding: 5px;
display: inline-block;
max-width: fit-content;
white-space: pre-wrap;
word-break: break-word;
}
.version-info {
    position: fixed;
    top: 8px;
    left: 8px;
    font-size: 11px;
    line-height: 1.4;
    color: rgba(10, 10, 10, 0.7);
    text-align: left;
    z-index: 1000;
    pointer-events: none;
    font-family: monospace;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
    font-weight: 600;
}
</style>
</head>
<body>
${versionInfoHtml}
<div class="header-bar">
    <div class="header-title">🎵 歌曲列表</div>
</div>
<div id="song-list">${formattedListText}</div>
</body>
</html>
`;
}

/**
 * 生成现代思源宋体样式的 HTML 内容
 * @param {string} listText - 歌曲列表 HTML 文本
 * @param {Object} config - 配置对象
 * @returns {string} HTML 内容
 */
function generateModernSourceHansSerifHtml(listText, config, musicLogger) {
    const version = _pkg.version;
    const repositoryUrl = _pkg.repository?.url || '';
    
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') + '-' +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');
    
    const { fontBase64, fontName } = loadFontBase64(config.textFontPath, config.__musicLinkDefaultSourceHanSerifPath, musicLogger);
    const { base64: backgroundImageBase64, format: imageFormat } = loadImageBase64(config.backgroundImagePath, musicLogger);
    
    const backgroundStyle = backgroundImageBase64
        ? `background-image: url(data:image/${imageFormat};base64,${backgroundImageBase64});`
        : `background-color: #f0f2f5;`;

    let processedText = listText;
    if (!config.puppeteerApplySeparator) {
        // 不应用separator，将制表符替换为空字符串
        processedText = processedText.replace(/\t/g, '');
    }
    
    const formattedListText = processedText
        .replace(/\((\d+)\)/g, (match, p1) => {
            const number = parseInt(p1, 10);
            return `<b style="font-size: 1.333333333em; font-weight: bold;">(${number.toString().padStart(2, '0')})</b>`;
        })
        .replace(/\n/g, '<br />');
    
    return `
<!DOCTYPE html>
<html lang="zh">
<head>
<title>music</title>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
${fontBase64 ? `@font-face{font-family:'${fontName}';src:url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}` : ''}
body {
    font-family: ${fontBase64 ? `'${fontName}',` : ''} -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 13vh 3vw 3vh 3vw;
    background-size: cover;
    background-position: center center;
    background-repeat: no-repeat;
    position: relative;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    perspective: 1000px;
    ${backgroundStyle}
}
.card {
    background: rgba(255, 255, 255, 0.13);
    backdrop-filter: blur(12px) saturate(200%);
    -webkit-backdrop-filter: blur(12px) saturate(200%);
    border-radius: 32px;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3),
                0 0 0 1px rgba(255, 255, 255, 0.5),
                inset 0 0 20px rgba(255, 255, 255, 0.5);
    padding: 3vh 3vw;
    margin: 0 auto;
    height: auto;
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: #212121;
    position: relative;
    z-index: 2;
    overflow: visible;
    transform: perspective(1000px) rotateX(-0deg) rotateY(0deg) translateY(0px);
    transform-origin: center center;
    transition: transform 0.3s ease;
}
#song-list {
    max-width: fit-content;
    font-size: 27px;
    font-weight: 600;
    line-height: 1.09;
    color: #212121;
    text-shadow: 1.3px 1.3px 0.9px rgba(255, 255, 255, 0.9);
    white-space: pre-wrap;
    word-break: break-word;
}
.version-info {
    position: fixed;
    top: 1.3px;
    left: 1.3px;
    font-size: 13px;
    line-height: 1.3;
    color: rgba(10, 10, 10, 0.8);
    text-align: left;
    z-index: 1000;
    pointer-events: none;
    font-family: monospace;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
    font-weight: 900;
}
${config.enablePuppeteerDarkMode ? `
body.dark .card {
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(9px) saturate(250%);
    -webkit-backdrop-filter: blur(9px) saturate(250%);
    border: 1px solid rgba(70, 70, 70, 0.6);
    color: #f0f0f0;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.95),
                0 0 0 1px rgba(70, 70, 70, 0.4),
                inset 0 0 20px rgba(255, 255, 255, 0.2);
}
body.dark #song-list {
    color: #f0f0f0;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}
body.dark .version-info {
    color: rgba(180, 180, 180, 0.8);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}
 ` : ''}
</style>
</head>
<body${config.enablePuppeteerDarkMode ? ' class="dark"' : ''}>
    <div class="card">
        <div id="song-list">${formattedListText}</div>
    </div>
    ${config.puppeteerShowVersionInfo !== false ? `
    <div class="version-info">
        <div>generated by koishi plugin: music-link-vincentzyu-fork</div>
        <div>version: \t ${version}</div>
        <div>date_time: \t ${timestamp}</div>
        <div>repo_url: \t ${repositoryUrl}</div>
        <div>quality: ${config.screenshotQuality || 'default'}</div>
    </div>
    ` : ''}
</body>
</html>
`;
}

/**
 * 生成扁平现代样式的 HTML 内容
 * @param {string} listText - 歌曲列表 HTML 文本
 * @param {Object} config - 配置对象
 * @returns {string} HTML 内容
 */
function generateFlatModernHtml(listText, config, musicLogger) {
    const version = _pkg.version;
    const repositoryUrl = _pkg.repository?.url || '';
    
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') + '-' +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');
    
    const { fontBase64, fontName } = loadFontBase64(config.textFontPath, config.__musicLinkDefaultSourceHanSerifPath, musicLogger);
    
    const lightColors = {
        background: '#fefefe',
        cardBackground: '#ffffff',
        primary: '#2d3748',
        secondary: '#4299e1',
        accent: '#38b2ac',
        tertiary: '#718096',
        border: '#e2e8f0',
        shadow: 'rgba(45, 55, 72, 0.08)',
        titleBg: '#f7fafc'
    };
    
    const darkColors = {
        background: '#1a202c',
        cardBackground: '#2d3748',
        primary: '#f7fafc',
        secondary: '#63b3ed',
        accent: '#4fd1c7',
        tertiary: '#a0aec0',
        border: '#4a5568',
        shadow: 'rgba(0, 0, 0, 0.25)',
        titleBg: '#4a5568'
    };
    
    const colors = config.enablePuppeteerDarkMode ? darkColors : lightColors;
    
    let processedText = listText;
    if (!config.puppeteerApplySeparator) {
        // 不应用separator，将制表符替换为空字符串
        processedText = processedText.replace(/\t/g, '');
    }
    
    const formattedListText = processedText
        .replace(/(\d+)\./g, (match, p1) => {
            const number = parseInt(p1, 10);
            return `<span class="song-number">${number.toString().padStart(2, '0')}.</span>`;
        })
        .replace(/\n/g, '<br />');
    
    return `
<!DOCTYPE html>
<html lang="zh">
<head>
<title>music</title>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
${fontBase64 ? `@font-face{font-family:'${fontName}';src:url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}` : ''}
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
body {
    font-family: ${fontBase64 ? `'${fontName}',` : ''} -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: ${colors.background};
    color: ${colors.primary};
    padding: 24px 8px 8px 8px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    line-height: 1.6;
}
.page-title {
    background: ${colors.titleBg};
    color: ${colors.primary};
    padding: 16px 24px;
    border-radius: 12px;
    margin-bottom: 16px;
    font-size: 30px;
    font-weight: 600;
    text-align: center;
    border: 1px solid ${colors.border};
    box-shadow: 0 2px 8px ${colors.shadow};
    min-width: 200px;
}
.main-container {
    background: ${colors.cardBackground};
    border-radius: 16px;
    padding: 28px;
    box-shadow: 0 4px 20px ${colors.shadow}, 0 1px 3px rgba(0,0,0,0.05);
    border: 1px solid ${colors.border};
    max-width: 95%;
    width: 95%;
    position: relative;
}
.title {
    text-align: center;
    margin-bottom: 24px;
    font-size: 27px;
    font-weight: 700;
    color: ${colors.secondary};
}
#song-list {
    line-height: 1.3;
    font-size: 25px;
}
.song-number {
    display: inline-block;
    background: linear-gradient(135deg, ${colors.secondary}, ${colors.accent});
    color: white;
    padding: 2px 2px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 18px;
    margin-right: 14px;
    min-width: 30px;
    text-align: center;
    box-shadow: 1px 2px 4px rgba(0,0,0,0.5);
}
.song-item {
    display: flex;
    align-items: center;
    padding: 18px 0;
    border-bottom: 1px solid ${colors.border};
    transition: background-color 0.2s ease;
}
.song-item:hover {
    background-color: ${colors.titleBg};
    border-radius: 8px;
    margin: 0 -8px;
    padding: 18px 8px;
}
.song-item:last-child {
    border-bottom: none;
}
.song-content {
    flex: 1;
    color: ${colors.primary};
    font-weight: 500;
}
.version-info {
    position: fixed;
    top: 12px;
    left: 12px;
    font-size: 10px;
    color: ${colors.tertiary};
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    line-height: 1.4;
    opacity: 0.6;
    z-index: 1000;
    pointer-events: none;
    background: rgba(255, 255, 255, 0.8);
    padding: 6px 8px;
    border-radius: 6px;
    backdrop-filter: blur(10px);
    border: 1px solid ${colors.border};
}
</style>
</head>
<body>
    <div class="page-title">🎵 歌曲列表</div>
    <div class="main-container">
        <div id="song-list">${formattedListText}</div>
    </div>
    ${config.puppeteerShowVersionInfo !== false ? `
    <div class="version-info">
        <div>generated by koishi plugin: music-link-vincentzyu-fork</div>
        <div>version: \t ${version}</div>
        <div>date_time: \t ${timestamp}</div>
        <div>repo_url: \t ${repositoryUrl}</div>
        <div>quality: ${config.screenshotQuality || 'default'}</div>
    </div>
    ` : ''}
</body>
</html>
`;
}

/**
 * 使用 Puppeteer 渲染歌单图片
 * @param {Object} pptr - Puppeteer 实例
 * @param {string} listText - 歌曲列表 HTML 文本
 * @param {Object} config - 配置对象
 * @param {{logInfo: Function, logDebug: Function}} musicLogger - 插件日志工具
 * @param {string} imageStyle - 图片样式
 * @returns {Promise<{buffer: Buffer, renderInfo: string|null}>} 图片二进制数据和渲染信息
 */
async function renderSongListPuppeteer(pptr, listText, config, musicLogger, imageStyle) {
    const startTime = Date.now();
    let html;
    const style = imageStyle || config.imageStyle || IMAGE_STYLE_MAP.ORIGIN_BLACK_WHITE;
    
    config.renderTime = 0;
    config.screenshotQuality = config.screenshotQuality || 80;
    config.imageType = config.imageType || 'png';
    
    switch (style) {
        case IMAGE_STYLE_MAP.MODERN_SOURCE_HANS_SERIF:
            html = generateModernSourceHansSerifHtml(listText, config, musicLogger);
            break;
        case IMAGE_STYLE_MAP.FLAT_MODERN:
            html = generateFlatModernHtml(listText, config, musicLogger);
            break;
        case IMAGE_STYLE_MAP.ORIGIN_BLACK_WHITE:
        default:
            html = generateOriginBlackWhiteHtml(listText, config, musicLogger);
            break;
    }
    
    const page = await pptr.browser.newPage();
    try {
        await page.setContent(html);

        let screenshot;
        let clipRect;

        switch (style) {
            case IMAGE_STYLE_MAP.ORIGIN_BLACK_WHITE:
                clipRect = await page.evaluate(() => {
                    const body = document.querySelector('body');
                    const rect = body.getBoundingClientRect();
                    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
                });
                screenshot = await page.screenshot({
                    clip: clipRect,
                    encoding: 'binary',
                    type: config.imageType,
                    quality: config.imageType === 'png' ? undefined : config.screenshotQuality,
                    deviceScaleFactor: 1.3
                });
                break;

            case IMAGE_STYLE_MAP.MODERN_SOURCE_HANS_SERIF:
                clipRect = await page.evaluate(() => {
                    const body = document.querySelector('body');
                    const rect = body.getBoundingClientRect();
                    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
                });
                screenshot = await page.screenshot({
                    clip: clipRect,
                    encoding: 'binary',
                    type: config.imageType,
                    quality: config.imageType === 'png' ? undefined : config.screenshotQuality
                });
                break;

            case IMAGE_STYLE_MAP.FLAT_MODERN:
                clipRect = await page.evaluate(() => {
                    const body = document.querySelector('body');
                    const rect = body.getBoundingClientRect();
                    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
                });
                screenshot = await page.screenshot({
                    clip: clipRect,
                    encoding: 'binary',
                    type: config.imageType,
                    quality: config.imageType === 'png' ? undefined : config.screenshotQuality
                });
                break;
            
            default:
                clipRect = await page.evaluate(() => {
                    const body = document.querySelector('body');
                    const rect = body.getBoundingClientRect();
                    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
                });
                screenshot = await page.screenshot({
                    clip: clipRect,
                    encoding: 'binary',
                    type: config.imageType,
                    quality: config.imageType === 'png' ? undefined : config.screenshotQuality
                });
                break;
        }
        
        const elapsed = Date.now() - startTime;
        
        config.renderTime = elapsed;
        
        let renderInfo = null;
        if (config.puppeteerShowRenderInfo) {
            renderInfo = `(🖼️ Puppeteer 渲染耗时：${elapsed}ms | 类型：${config.imageType || 'png'} | 质量：${config.screenshotQuality || 'default'})\n\n`;
        }
        
        return { buffer: screenshot, renderInfo, isSvg: false };
    } finally {
        await page.close();
    }
}

module.exports = {
    generateOriginBlackWhiteHtml,
    generateModernSourceHansSerifHtml,
    generateFlatModernHtml,
    renderSongListPuppeteer,
    loadFontBase64,
    loadImageBase64
};
