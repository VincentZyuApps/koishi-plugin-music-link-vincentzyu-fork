"use strict";

const fs = require('node:fs');
const path = require('node:path');
const { IMAGE_STYLE_MAP } = require('./config');
const { renderSongListSvg } = require('./renderer-svg');
const { renderSongListPuppeteer } = require('./renderer-pptr');

const _pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
const _version = _pkg.version;
const _repositoryUrl = _pkg.repository?.url || _pkg.repository || '';

/**
 * 音乐列表图片渲染模块 - 协调器
 * 根据 renderMode 配置协调 SVG 和 Puppeteer 渲染
 * 支持并行和严格顺序两种模式
 */

/**
 * 解析 renderMode 配置（支持新旧两种格式）
 * @param {Array} renderMode - renderMode 配置
 * @returns {{useText: boolean, usePuppeteer: boolean, useSvg: boolean}}
 */
function parseRenderModeConfig(renderMode) {
    if (!renderMode || !Array.isArray(renderMode)) {
        return { useText: false, usePuppeteer: false, useSvg: true };
    }
    
    // 兼容旧格式：['svg', 'text']
    if (renderMode.length > 0 && typeof renderMode[0] === 'string') {
        return {
            useText: renderMode.includes('text'),
            usePuppeteer: renderMode.includes('puppeteer'),
            useSvg: renderMode.includes('svg')
        };
    }
    
    // 新格式：[{mode: 'svg', enabled: true}, {mode: 'text', enabled: false}]
    let useText = false;
    let usePuppeteer = false;
    let useSvg = false;
    
    for (const item of renderMode) {
        if (item && item.mode && item.enabled) {
            if (item.mode === 'text') useText = true;
            if (item.mode === 'puppeteer') usePuppeteer = true;
            if (item.mode === 'svg') useSvg = true;
        }
    }
    
    // 默认启用 SVG
    if (!useText && !usePuppeteer && !useSvg) {
        useSvg = true;
    }
    
    return { useText, usePuppeteer, useSvg };
}

/**
 * 生成歌曲列表图片（主入口函数）
 * 根据 renderMode 配置决定使用哪种渲染方式
 * 
 * @param {Object} pptr - Puppeteer 实例
 * @param {string} listText - 歌曲列表 HTML 文本
 * @param {Object} config - 配置对象
 * @param {Object} logger - 日志记录器
 * @param {string} imageStyle - 图片样式
 * @param {Array} songList - 歌曲列表数据（用于 SVG 渲染）
 * @returns {Promise<{buffer: Buffer, renderInfo: string|null, isSvg: boolean}|null>}
 */
async function generateSongListImage(pptr, listText, config, logger, imageStyle, songList, mode) {
    const { useText, usePuppeteer, useSvg } = parseRenderModeConfig(config.renderMode);
    
    // 解析 mode 参数
    const isDarkMode = mode === 'dark' || mode === '黑夜';
    
    if (useSvg && songList && Array.isArray(songList)) {
        try {
            const svgResult = renderSongListSvg(songList, {
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
            
            return { buffer: svgResult.buffer, renderInfo: svgResult.renderInfo, isSvg: true };
        } catch (error) {
            console.error('SVG 渲染失败，回退到 Puppeteer:', error);
        }
    }
    
    // 如果只启用了文本模式，返回 null
    if (useText && !useSvg && !usePuppeteer) {
        return null;
    }
    
    // Puppeteer 渲染（如果启用）
    if (usePuppeteer) {
        try {
            // 为 Puppeteer 配置添加 mode 参数
            const puppeteerConfig = {
                ...config,
                enablePuppeteerDarkMode: isDarkMode !== undefined ? isDarkMode : config.enablePuppeteerDarkMode
            };
            return await renderSongListPuppeteer(pptr, listText, puppeteerConfig, logger, imageStyle);
        } catch (error) {
            console.error('Puppeteer 渲染失败:', error);
            throw error;
        }
    }
    
    return null;
}

/**
 * 生成歌曲列表图片（仅 Puppeteer 渲染）
 * 用于需要强制使用 Puppeteer 的场景
 * 
 * @param {Object} pptr - Puppeteer 实例
 * @param {string} listText - 歌曲列表 HTML 文本
 * @param {Object} config - 配置对象
 * @param {Object} logger - 日志记录器
 * @param {string} imageStyle - 图片样式
 * @returns {Promise<{buffer: Buffer, renderInfo: string|null, isSvg: boolean}>}
 */
async function generateSongListImagePuppeteer(pptr, listText, config, logger, imageStyle) {
    return renderSongListPuppeteer(pptr, listText, config, logger, imageStyle);
}

/**
 * 使用 SVG 渲染歌单列表
 * @param {Array} songs - 歌曲列表
 * @param {Object} config - 配置对象
 * @returns {Buffer} PNG Buffer
 */
async function generateSongListSvgRender(songs, config) {
    try {
        const result = renderSongListSvg(songs, {
            darkMode: config.enableSvgDarkMode || false,
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
        return result.buffer;
    } catch (error) {
        console.error('SVG 渲染失败:', error);
        throw error;
    }
}

module.exports = {
    generateSongListImage,
    generateSongListImagePuppeteer,
    generateSongListSvgRender
};
