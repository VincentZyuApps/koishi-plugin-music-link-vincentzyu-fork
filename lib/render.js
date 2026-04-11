"use strict";

const fs = require('node:fs');
const path = require('node:path');
const { h } = require('koishi');
const { renderSongListText } = require('./renderer-text');
const { renderSongListSvg } = require('./renderer-svg');
const { renderSongListPuppeteer } = require('./renderer-pptr');
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
                        showRenderInfo: config.markdownShowRenderInfo !== false,
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
                        showRenderInfo: config.markdownShowRenderInfo !== false,
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
                        showSongDividers: config.svgShowSongDividers !== false,
                        showSongBackground: config.svgShowSongBackground !== false,
                        version: _version,
                        repositoryUrl: _repositoryUrl,
                        showRenderInfo: config.svgShowRenderInfo !== false,
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

            default:
                logger.warn(`❓ 未知的渲染类型: ${type}`);
                return null;
        }

    } catch (error) {
        logger.error(`⚠️ 渲染失败[${type}]:`, error);
        return null;
    }
}

module.exports = { generateSongList };
