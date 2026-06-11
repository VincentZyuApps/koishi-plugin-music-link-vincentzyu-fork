"use strict";

const fs = require('node:fs');
const path = require('node:path');
const { h } = require('koishi');
const { renderSongListText } = require('./renderer-text');
const { renderSongListSvg } = require('./renderer-svg');
const { renderSongListPuppeteer } = require('./renderer-pptr');
const { renderSongListCanvas } = require('./renderer-canvas');
const { renderSongListMarkdownTable, renderSongListMarkdownStyle } = require('./renderer-qq-markdown');

const _pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
const _version = _pkg.version;
const _repositoryUrl = _pkg.repository?.url || _pkg.repository || '';

/**
 * 构建图片消息负载（SVG/Puppeteer 通用）
 * @param {Buffer} buffer - 图片二进制数据
 * @param {string|null} renderInfo - 渲染信息文本
 * @param {Object} config - 配置对象
 * @param {Object} session - 会话对象
 * @param {string} exitCommandTip - 退出命令提示
 * @param {string|Object} atRobotSegment - 艾特消息段或文本
 * @returns {Array} 消息段数组
 */
function buildImagePayload(buffer, renderInfo, config, session, exitCommandTip, atRobotSegment) {
    const isQQ = session.platform === 'qq';
    const atRobotText = "@机器人";
    
    const imagePayloadParts = [
        ...(config.enableQuote ? [h.quote(session.messageId)] : []),
        h.image(buffer, 'image/png'),
    ];

    if (renderInfo) {
        imagePayloadParts.push(h.text(`\n${renderInfo}`));
    }

    const waitTimeText = session.text(`.waitTime`, [config.waitTimeout, atRobotText]);
    if (config.useRealAtRobot && waitTimeText.includes(atRobotText)) {
        const parts = waitTimeText.split(atRobotText);
        for (let i = 0; i < parts.length; i++) {
            if (parts[i]) {
                imagePayloadParts.push(h.text(`${i === 0 ? exitCommandTip.replace(/<br \/>/g, '\n') : ''}${parts[i]}`));
            }
            if (i < parts.length - 1) {
                imagePayloadParts.push(atRobotSegment);
            }
        }
    } else {
        imagePayloadParts.push(h.text(`${exitCommandTip.replace(/<br \/>/g, '\n')}${waitTimeText}`));
    }

    return imagePayloadParts;
}

/**
 * 统一的歌单渲染入口
 * 根据 type 参数调用对应的渲染器
 * 
 * @param {Object} ctx - Koishi 上下文
 * @param {string} type - 渲染类型: 'text' | 'svg' | 'puppeteer' | 'markdown_table' | 'markdown_style'
 * @param {Object} params - 渲染参数
 * @returns {Promise<Object|null>} 渲染结果Payload
 */
async function generateSongList(ctx, type, params) {
    const { config, logger, session, formattedList, songList, options = {} } = params;

    try {
        switch (type) {
            case 'text':
                {
                    const textResult = renderSongListText(formattedList, config, {
                        exitCommandTip: params.exitCommandTip,
                        enableQuote: config.enableQuote,
                        messageId: session?.messageId,
                        useRealAtRobot: config.useRealAtRobot,
                        atRobotSegment: params.atRobotSegment,
                        waitTimeout: config.waitTimeout,
                        waitTimeText: session.text('.waitTime', [config.waitTimeout, "@机器人"]),
                        session
                    });
                    return textResult;
                }

            case 'markdown_table':
                {
                    const mdContent = renderSongListMarkdownTable(songList, {
                        maxDisplay: config.markdownTableMaxDisplay || 20,
                        waitTimeout: config.waitTimeout || 45,
                        atRobotText: "@机器人",
                        markdownTitle: session.text('.markdownTitle'),
                        markdownSummary: session.text('.markdownSummary', [songList.length, config.markdownTableMaxDisplay || 20]),
                        waitTime: session.text('.waitTime', [config.waitTimeout || 45, "@机器人"]),
                        waitTimeInline: session.text('.waitTimeInline', [config.waitTimeout || 45, "@机器人"]),
                        exitCommandTipMarkdownInlinePrefix: session.text('.exitCommandTipMarkdownInlinePrefix'),
                        exitCommandTipMarkdownInlineSuffix: session.text('.exitCommandTipMarkdownInlineSuffix'),
                        exitCommandTipMarkdownText: session.text('.exitCommandTipMarkdownText', [config.exitCommand.split(/[,，]/).map(cmd => cmd.trim()).join(' / ')]),
                        useSongInlineCommandLink: config.markdownSongUseInlineCommandLink !== false,
                        useExitInlineCommandLink: config.markdownExitUseInlineCommandLink !== false,
                        showRenderInfo: config.markdownShowVersionInfo !== false,
                        version: _version,
                        repositoryUrl: _repositoryUrl
                    });

                    const mdTableResult = { markdown: mdContent, isMarkdown: true }

                    return mdTableResult;
                }

            case 'markdown_style':
                {
                    const mdContent = renderSongListMarkdownStyle(songList, {
                        maxDisplay: config.markdownStyleMaxDisplay || 10,
                        waitTimeout: config.waitTimeout || 45,
                        atRobotText: "@机器人",
                        markdownTitle: session.text('.markdownTitle'),
                        markdownSummary: session.text('.markdownSummary', [songList.length, config.markdownStyleMaxDisplay || 10]),
                        waitTime: session.text('.waitTime', [config.waitTimeout || 45, "@机器人"]),
                        waitTimeInline: session.text('.waitTimeInline', [config.waitTimeout || 45, "@机器人"]),
                        exitCommandTipMarkdownInlinePrefix: session.text('.exitCommandTipMarkdownInlinePrefix'),
                        exitCommandTipMarkdownInlineSuffix: session.text('.exitCommandTipMarkdownInlineSuffix'),
                        exitCommandTipMarkdownText: session.text('.exitCommandTipMarkdownText', [config.exitCommand.split(/[,，]/).map(cmd => cmd.trim()).join(' / ')]),
                        useSongInlineCommandLink: config.markdownSongUseInlineCommandLink !== false,
                        useExitInlineCommandLink: config.markdownExitUseInlineCommandLink !== false,
                        showRenderInfo: config.markdownShowVersionInfo !== false,
                        version: _version,
                        repositoryUrl: _repositoryUrl
                    });

                    const mdStyleResult = { markdown: mdContent, isMarkdown: true };

                    return mdStyleResult;
                }

            case 'puppeteer':
                {
                    const isDarkMode = options.mode === 'dark' || options.mode === '黑夜';
                    const imageStyle = options.imageStyle;

                    const puppeteerConfig = {
                        ...config,
                        enablePuppeteerDarkMode: isDarkMode !== undefined ? isDarkMode : config.enablePuppeteerDarkMode
                    };

                    const pptrResult = await renderSongListPuppeteer(
                        ctx.puppeteer,
                        formattedList,
                        puppeteerConfig,
                        logger,
                        imageStyle
                    );

                    // 构建完整的消息负载
                    if (pptrResult && pptrResult.buffer) {
                        pptrResult.payload = buildImagePayload(
                            pptrResult.buffer,
                            pptrResult.renderInfo,
                            config,
                            session,
                            params.exitCommandTip,
                            params.atRobotSegment
                        );
                    }

                    return pptrResult;
                }

            case 'svg':
                {
                    const isDarkMode = options.mode === 'dark' || options.mode === '黑夜';
                    const result = renderSongListSvg(songList, {
                        darkMode: isDarkMode !== undefined ? isDarkMode : (config.enableSvgDarkMode || false),
                        themeColor: config.svgThemeColor || '#7e57c2',
                        scale: config.svgScale || 3.3,
                        width: config.svgWidth || 460,
                        columns: config.svgColumns || 2,
                        columnLayoutMode: config.svgColumnLayoutMode || 'row-first',
                        showSongDividers: config.svgShowSongDividers !== false,
                        showSongBackground: config.svgShowSongBackground !== false,
                        version: _version,
                        repositoryUrl: _repositoryUrl,
                        showRenderInfo: config.svgShowRenderInfo !== false,
                        showVersionInfo: config.svgShowVersionInfo !== false, // 🔥 新增：传递字体配置
                        enableCustomFont: config.svgEnableCustomFont !== false,
                        fontFiles: config.svgFontFiles || [],
                        fontFamilies: config.svgFontFamilies || ['LXGWWenKaiMono, Source Han Serif SC Medium, sans-serif'],
                    });

                    const svgResult = {
                        buffer: result.buffer,
                        renderInfo: result.renderInfo,
                        isSvg: true
                    };

                    // 构建完整的消息负载
                    svgResult.payload = buildImagePayload(
                        svgResult.buffer,
                        svgResult.renderInfo,
                        config,
                        session,
                        params.exitCommandTip,
                        params.atRobotSegment
                    );

                    return svgResult;
                }

            case 'canvas':
                {
                    const isDarkMode = options.mode === 'dark' || options.mode === '黑夜';
                    const result = renderSongListCanvas(songList, {
                        darkMode: isDarkMode !== undefined ? isDarkMode : (config.canvasDarkMode || false),
                        themeColor: config.canvasThemeColor || config.svgThemeColor || '#7e57c2',
                        width: config.canvasWidth || config.svgWidth || 555,
                        scale: config.canvasScale || 2,
                        columns: config.canvasColumns || config.svgColumns || 2,
                        columnLayoutMode: config.canvasColumnLayoutMode || config.svgColumnLayoutMode || 'row-first',
                        showSongDividers: config.canvasShowSongDividers !== false,
                        showSongBackground: config.canvasShowSongBackground !== false,
                        version: _version,
                        repositoryUrl: _repositoryUrl,
                        showRenderInfo: config.canvasShowRenderInfo !== false,
                        showVersionInfo: config.canvasShowVersionInfo !== false,
                        enableCustomFont: config.canvasEnableCustomFont !== false,
                        fontFiles: config.canvasFontFiles || config.svgFontFiles || [],
                        fontFamilies: config.canvasFontFamilies || config.svgFontFamilies || ['LXGWWenKaiMono, sans-serif'],
                    });

                    if (result.error) {
                        logger.warn(`⚠️ Canvas 渲染器不可用: ${result.error}`);
                        return null;
                    }

                    const canvasResult = {
                        buffer: result.buffer,
                        renderInfo: result.renderInfo,
                        isCanvas: true
                    };

                    canvasResult.payload = buildImagePayload(
                        canvasResult.buffer,
                        canvasResult.renderInfo,
                        config,
                        session,
                        params.exitCommandTip,
                        params.atRobotSegment
                    );

                    return canvasResult;
                }

            default:
                logger.warn(`❓ 未知的渲染类型: ${type}`);
                return null;
        }

    } catch (error) {
        logger.error(`⚠️ 渲染失败[${type}]:`, error);
        return null;
    }
}

/**
 * 加载测试歌单数据（用于 --test 参数）
 * @param {Object} ctx - Koishi Context
 * @param {Object} config - 配置对象
 * @param {Function} logInfo - 日志函数
 * @param {string} platformType - 平台类型 ('netease' | 'tencent' | 'mixed')
 * @returns {Promise<Object|null>} 包含 songList 和 formattedList 的对象，失败返回 null
 */
async function loadTestSongList(ctx, config, logInfo, platformType = 'mixed') {
    try {
        const testFilePath = path.resolve(__dirname, '../test/songlist-test.json');
        
        logInfo(`🧪 [测试模式] 读取测试数据: ${testFilePath}`);
        
        if (!fs.existsSync(testFilePath)) {
            ctx.logger.error('❌ 测试数据文件不存在，请先运行 generate-test-data.py 生成测试数据');
            return null;
        }
        
        const testData = JSON.parse(fs.readFileSync(testFilePath, 'utf-8'));
        logInfo(`🧪 [测试模式] 加载了 ${testData.length} 首测试歌曲`);
        
        // 根据平台类型过滤数据
        let filteredData = testData;
        if (platformType === 'netease') {
            filteredData = testData.filter(song => song.platform === 'netease');
            logInfo(`🧪 [测试模式] 过滤后保留 ${filteredData.length} 首网易云歌曲`);
        } else if (platformType === 'tencent') {
            filteredData = testData.filter(song => song.platform === 'tencent');
            logInfo(`🧪 [测试模式] 过滤后保留 ${filteredData.length} 首QQ音乐歌曲`);
        }
        
        // 转换为统一的songList格式
        const songList = filteredData.map((song, index) => ({
            id: song.id,
            mid: song.mid,
            name: song.name,
            artist: song.artist,
            album: song.album || song.albumName,
            duration: song.duration,
            cover: song.cover,
            url: song.url,
            quality: song.quality,
            size: song.size,
            kbps: song.kbps,
            platform: song.platform,
            platformLabel: song.platformLabel || '',
            // command6 兼容字段
            artists: song.artist,
            albumName: song.album || song.albumName,
        }));
        
        // verbose file log
        if (config.verboseFileLog) {
            try {
                const logDir = path.resolve(__dirname, '../log');
                if (!fs.existsSync(logDir)) {
                    fs.mkdirSync(logDir, { recursive: true });
                }
                fs.writeFileSync(path.join(logDir, 'songlist-latest.json'), JSON.stringify(songList, null, 2));
            } catch (e) {
                ctx.logger.warn('verbose file log failed:', e.message);
            }
        }
        
        // 生成格式化列表（用于文本渲染）
        let maxPlatformWidth = 0;
        let maxSongNameWidth = 0;
        let maxArtistWidth = 0;
        
        if ((config.textListSeparator === '${tab}' || config.textListSeparator === '\t') && config.smartTabAlignment) {
            // 第一次遍历：计算每列的最大宽度
            songList.forEach((song) => {
                const platformLabelPart = song.platformLabel || '';
                const songNamePart = `(${songList.indexOf(song) + 1}) ${song.name}`;
                const artistPart = `- ${song.artist}`;
                
                if (platformLabelPart.length > maxPlatformWidth) {
                    maxPlatformWidth = platformLabelPart.length;
                }
                if (songNamePart.length > maxSongNameWidth) {
                    maxSongNameWidth = songNamePart.length;
                }
                if (artistPart.length > maxArtistWidth) {
                    maxArtistWidth = artistPart.length;
                }
            });
        }
        
        // 第二次遍历：生成格式化文本
        const formattedList = songList.map((song, index) => {
            let separator = config.textListSeparator || '${tab}';
            separator = separator.replace(/\$\{tab\}/g, '\t');
            
            const platformLabelPart = song.platformLabel || '';
            const songNumberPart = `(${index + 1}) ${song.name}`;
            const artistPart = `- ${song.artist}`;
            const albumInfo = song.album ? `- ${song.album}` : '';
            
            // 如果使用制表符且启用智能对齐
            if (separator === '\t' && config.smartTabAlignment) {
                const tabWidth = 8;
                
                const currentPlatformWidth = platformLabelPart.length;
                const currentSongNameWidth = songNumberPart.length;
                const currentArtistWidth = artistPart.length;
                
                const targetPlatformPos = Math.ceil(maxPlatformWidth / tabWidth) * tabWidth;
                const targetSongNamePos = Math.ceil(maxSongNameWidth / tabWidth) * tabWidth;
                const targetArtistPos = albumInfo ? Math.ceil(maxArtistWidth / tabWidth) * tabWidth : 0;
                
                const platformTabs = Math.max(1, Math.ceil((targetPlatformPos - currentPlatformWidth) / tabWidth));
                const songNameTabs = Math.max(1, Math.ceil((targetSongNamePos - currentSongNameWidth) / tabWidth));
                const artistTabs = albumInfo ? Math.max(1, Math.ceil((targetArtistPos - currentArtistWidth) / tabWidth)) : 0;
                
                const platformTabStr = separator.repeat(platformTabs);
                const songNameTabStr = separator.repeat(songNameTabs);
                const artistTabStr = separator.repeat(artistTabs);
                
                return `${platformLabelPart}${platformTabStr}${songNumberPart}${songNameTabStr}${artistPart}${artistTabStr}${albumInfo}`;
            } else {
                // 使用默认分隔符
                const albumInfoStr = albumInfo ? `${separator}${albumInfo}` : '';
                return `${platformLabelPart}${separator}${songNumberPart}${separator}${artistPart}${albumInfoStr}`;
            }
        }).join('\n');
        
        return { songList, formattedList };
        
    } catch (error) {
        ctx.logger.error('🧪 [测试模式] 加载测试数据失败:', error);
        return null;
    }
}

module.exports = { 
    generateSongList,
    loadTestSongList 
};
