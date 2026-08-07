"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;
const { h } = require("koishi");
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const { generateSongList } = require('./render');
const {
    validateAssets,
    normalizeAssetConfigPaths,
    createDownloadUtils,
    safeUnlink,
    safeJsonParse,
    buildSongUrl,
    createQualityFallbackState,
    sendMediaWithFallback,
    getQualityLabel,
    getFirstMessageId,
    splitTextByLength,
    createMusicLogger,
    summarizeError,
} = require('./util');

// 导入新模块
const { registerMiddleware } = require('./middleware');
const { registerCommand6, registerCommand9 } = require('./command');
const { registerI18n } = require('./i18n');
const { createQqFileUtils } = require('./platform/qq/file');
const { sendQqRichuiCard } = require('./platform/qq/richui');
const { sendMusicCard } = require('./platform/onebot/card');
const { trySendTelegramSafeItems } = require('./platform/telegram/send');

// 从 config.js 导入配置
const {
    Config,
    IMAGE_STYLE_MAP,
    platformMap,
    command6_returnDataField_default,
    command9_returnDataField_default,
    createNotifierInfoOfConfig,
    createNotifierInfoOfAssets,
} = require('./config');

// usage 已提取至独立文件
const { usage } = require('./usage');

// 读取 package.json 获取版本号
const pkg = JSON.parse(
    require('fs').readFileSync(require('path').resolve(__dirname, '../package.json'), 'utf-8')
);

exports.Config = Config;
exports.usage = usage;

const name = 'music-link';
const inject = {
    required: ['http', "i18n"],
    optional: ['puppeteer', 'notifier'],
};
function apply(ctx, config) {
    const musicLogger = createMusicLogger(ctx, config);
    const { logInfo, logDebug } = musicLogger;
    normalizeAssetConfigPaths(ctx, config, musicLogger);
    const cacheDir = config.cacheDir || path.join(__dirname, '..', 'cache');
    const cacheFiles = new Set();

    /**
     * 解析 renderMode 配置（支持新旧两种格式）
     * @returns {{useText: boolean, usePuppeteer: boolean, useSvg: boolean, useMarkdownTable: boolean, useMarkdownStyle: boolean, order: string[]}}
     */
    function parseRenderMode() {
        const renderMode = config.renderMode || [];

        if (Array.isArray(renderMode) && renderMode.length > 0 && typeof renderMode[0] === 'string') {
            return {
                useText: renderMode.includes('text'),
                usePuppeteer: renderMode.includes('puppeteer'),
                useSvg: renderMode.includes('svg'),
                useCanvas: renderMode.includes('canvas'),
                useMarkdownTable: renderMode.includes('markdown_table'),
                useMarkdownStyle: renderMode.includes('markdown_style'),
                order: renderMode.filter(m => ['text', 'svg', 'puppeteer', 'canvas', 'markdown_table', 'markdown_style'].includes(m))
            };
        }

        let useText = false;
        let usePuppeteer = false;
        let useSvg = false;
        let useCanvas = false;
        let useMarkdownTable = false;
        let useMarkdownStyle = false;
        const enabledModes = [];
        let selectedNone = false;

        if (Array.isArray(renderMode)) {
            for (const item of renderMode) {
                if (item && item.mode && item.enabled) {
                    enabledModes.push(item.mode);
                    if (item.mode === 'text') useText = true;
                    if (item.mode === 'puppeteer') usePuppeteer = true;
                    if (item.mode === 'svg') useSvg = true;
                    if (item.mode === 'canvas') useCanvas = true;
                    if (item.mode === 'markdown_table') useMarkdownTable = true;
                    if (item.mode === 'markdown_style') useMarkdownStyle = true;
                }
            }
        }

        // 如果没有任何启用的，fallback是默认启用 SVG
        if (enabledModes.length === 0) {
            selectedNone = true;
            useSvg = true;
            enabledModes.push('svg');
        }

        return { useText, usePuppeteer, useSvg, useCanvas, useMarkdownTable, useMarkdownStyle, order: enabledModes, selectedNone };
    }

    // 启动时显示配置提示
    const { useText, usePuppeteer, useSvg, useCanvas, useMarkdownTable, useMarkdownStyle, order, selectedNone } = parseRenderMode();
    logInfo(
        '🎵 music-link 插件启动',
        `v${pkg.version}，渲染=${order.join(' → ') || '无'}，调度=${config.strictOrderMode ? '严格顺序' : '并行'}`,
    );
    if (selectedNone) {
        logInfo('⚠️ 未选择渲染模式，已回退 SVG');
    }

    let cmdInfo = '';
    if (config.serverSelect === 'command6' && config.command6) {
        cmdInfo = `/${config.command6} (网易云点歌)`;
    } else if (config.serverSelect === 'command9' && config.command9) {
        cmdInfo = `/${config.command9} (落月api点歌)`;
    }
    if (cmdInfo) logInfo('📋 点歌指令已启用', cmdInfo);
    logDebug('渲染配置', () => ({
        useText,
        usePuppeteer,
        useSvg,
        useCanvas,
        useMarkdownTable,
        useMarkdownStyle,
        imageStyle: config.imageStyle,
        puppeteerDarkMode: config.enablePuppeteerDarkMode,
        svgDarkMode: config.enableSvgDarkMode,
        canvasDarkMode: config.canvasDarkMode,
        svgThemeColor: config.svgThemeColor,
        canvasThemeColor: config.canvasThemeColor,
        svgScale: config.svgScale,
    }));

    // 使用 notifier 显示插件信息。notifier 是可选服务，副作用注册放进 ctx.inject。
    ctx.inject(['notifier'], (ctx) => {
        createNotifierInfoOfConfig(ctx, config, { useText, usePuppeteer, useSvg, useCanvas, useMarkdownTable, useMarkdownStyle, order, selectedNone });
    });

    const smartApiGet = async (targetUrl, { expectText = false } = {}) => {
        const response = await ctx.http(targetUrl, {
            method: 'GET',
            responseType: expectText ? 'text' : 'json',
            fullResponse: true,
        });
        const cacheStatus = response?.headers?.['x-luoyue-tencent-search-cache'];
        if (cacheStatus) logDebug('落月 API QQ 音乐搜索缓存状态', cacheStatus);
        return response?.data;
    };

    const { ensureCacheDir, requestWithProxy, downloadFile } = createDownloadUtils({
        ctx,
        config,
        musicLogger,
        cacheDir,
    });
    const { isCrackAdapter, sendQQFile } = createQqFileUtils(musicLogger);

    /**
     * 智能 GET 请求（自动处理 command6 的代理配置）
     */
    const smartGet = async (targetUrl) => {
        if (config.command6_useProxy) {
            return await requestWithProxy(targetUrl);
        }
        return await smartApiGet(targetUrl, { expectText: true });
    };

    /**
     * 获取网易云歌词
     */
    const fetchNeteaseLyric = async (songId) => {
        try {
            //直接请求网易云官方接口捏
            const lyricApiUrl = `https://music.163.com/api/song/lyric?id=${songId}&lv=1&kv=1&tv=-1`;
            const lyricResponse = await smartGet(lyricApiUrl);
            const parsed = safeJsonParse(lyricResponse);
            if (parsed && parsed.code === 200 && parsed.lrc && parsed.lrc.lyric) {
                return `\n${parsed.lrc.lyric}`;
            }
            logInfo('⚠️ 获取歌词失败，继续发送其他歌曲字段', `返回代码=${parsed?.code ?? '未知'}`);
            logDebug('网易云歌词响应诊断', () => ({ lyricApiUrl, response: parsed }));
        } catch (error) {
            logInfo('⚠️ 获取歌词失败，继续发送其他歌曲字段', summarizeError(error));
            logDebug('网易云歌词请求异常', error);
        }
        return '歌词获取失败';
    };

    /**
     * 生成响应消息
     */
    async function generateResponse(session, data, platformconfig, platform = '', options = {}) {
        const qualityState = createQualityFallbackState(data, options.qualityFallback || {});
        const riskyTypes = new Set(['audio', 'video', 'file']);
        const items = platformconfig
            .filter((field) => field.enable && data[field.data])
            .map((field) => ({ field, type: field.type }));

        const textItems = items.filter((item) => item.type === 'text');
        const imageItems = items.filter((item) => item.type === 'image');
        const mediaItems = items.filter((item) => item.type === 'audio' || item.type === 'video');
        const fileItems = items.filter((item) => item.type === 'file');
        let responseItems;

        switch (config.dataFieldSortMode) {
            case 'image':
                responseItems = [...imageItems, ...textItems, ...mediaItems, ...fileItems];
                break;
            case 'raw':
                responseItems = items;
                break;
            case 'text':
            default:
                responseItems = [...textItems, ...imageItems, ...mediaItems, ...fileItems];
                break;
        }

        const formatText = (field, currentData) => {
            let textValue = currentData[field.data];
            textValue = typeof textValue === 'string' ? textValue : String(textValue || '');
            if (config.isuppercase) {
                textValue = textValue.replace(/(https?:\/\/)([^/]+)/, (_match, protocol, domain) => `${protocol}${domain.toUpperCase()}`);
            }
            return `${field.describe}：${textValue}`;
        };

        const createSafeElement = (item) => {
            const currentData = qualityState.data;
            if (item.type === 'text') return h.text(formatText(item.field, currentData));
            if (item.type === 'image') return h.image(currentData[item.field.data]);
            return null;
        };

        const sendSafeItemsIndividually = async (safeItems) => {
            for (const item of safeItems) {
                try {
                    if (item.type === 'text') {
                        const text = formatText(item.field, qualityState.data);
                        for (const chunk of splitTextByLength(text)) {
                            await session.send(h.text(chunk));
                        }
                    } else {
                        await session.send(createSafeElement(item));
                    }
                } catch (error) {
                    logInfo(`⚠️ ${item.type === 'text' ? '文本' : '图片'}字段发送失败，继续处理后续字段`, summarizeError(error));
                    logDebug(`${item.type} 字段发送异常`, error);
                }
            }
        };

        const sendSafeBatch = async (safeItems) => {
            if (!safeItems.length) return;

            const handledByTelegram = await trySendTelegramSafeItems({
                session,
                musicLogger,
                safeItems,
                mode: options.telegramCaptionMode,
                configKey: options.telegramCaptionConfigKey,
                formatText: (item) => formatText(item.field, qualityState.data),
                createSafeElement,
            });
            if (handledByTelegram) return;

            const elements = safeItems.map(createSafeElement).filter(Boolean);
            try {
                await session.send(elements.join('\n'));
            } catch (error) {
                logInfo('⚠️ 图文组合发送失败，正在拆分重试', summarizeError(error));
                logDebug('图文组合发送异常', error);
                await sendSafeItemsIndividually(safeItems);
            }
        };

        const trackCacheFile = (localFilePath) => {
            if (!localFilePath || cacheFiles.has(localFilePath)) return;
            cacheFiles.add(localFilePath);
            if (config.deleteTempTime > 0) {
                ctx.setTimeout(async () => {
                    await safeUnlink(localFilePath, 5, 1000, ctx.setTimeout).catch(() => { });
                    cacheFiles.delete(localFilePath);
                    logDebug('已清理音乐缓存文件', localFilePath);
                }, config.deleteTempTime * 1000);
            }
        };

        const prepareMedia = async (item, currentData) => {
            const value = currentData[item.field.data];
            if (!value) {
                const error = new Error(`当前音质未返回 ${item.field.data} 字段`);
                error.code = 'MEDIA_QUALITY_UNAVAILABLE';
                throw error;
            }
            if (item.type === 'audio' || item.type === 'video') {
                const fileInfo = await downloadFile(value, currentData, platform);
                if (!fileInfo) {
                    const error = new Error('媒体文件下载失败');
                    error.code = 'MEDIA_DOWNLOAD_FAILED';
                    throw error;
                }
                trackCacheFile(fileInfo.localPath);
                const useBase64 = config.fileTransferMode === 'base64' || !fileInfo.localPath;
                const fileUrl = useBase64
                    ? `data:${fileInfo.mimeType};base64,${fileInfo.base64}`
                    : url.pathToFileURL(fileInfo.localPath).href;
                const attrs = { title: fileInfo.filename, filename: fileInfo.filename, name: fileInfo.filename };
                logInfo('📄 媒体文件准备完成', `${fileInfo.filename}，${(fileInfo.byteLength / 1024 / 1024).toFixed(2)} MiB`);
                logDebug('媒体文件准备详情', () => ({
                    filename: fileInfo.filename,
                    byteLength: fileInfo.byteLength,
                    mimeType: fileInfo.mimeType,
                    localPath: fileInfo.localPath,
                    transferMode: useBase64 ? 'base64' : 'localPath',
                }));
                return {
                    element: item.type === 'audio' ? h.audio(fileUrl) : h.video(fileUrl),
                    type: item.type,
                    fileUrl,
                    filename: fileInfo.filename,
                    mimeType: fileInfo.mimeType,
                };
            }

            const fileInfo = await downloadFile(value, currentData, platform);
            if (!fileInfo) {
                const error = new Error('媒体文件下载失败');
                error.code = 'MEDIA_DOWNLOAD_FAILED';
                throw error;
            }
            trackCacheFile(fileInfo.localPath);

            const useBase64 = config.fileTransferMode === 'base64' || !fileInfo.localPath;
            const fileUrl = useBase64
                ? `data:${fileInfo.mimeType};base64,${fileInfo.base64}`
                : url.pathToFileURL(fileInfo.localPath).href;
            const attrs = { title: fileInfo.filename, filename: fileInfo.filename, name: fileInfo.filename };
            logInfo('📄 媒体文件准备完成', `${fileInfo.filename}，${(fileInfo.byteLength / 1024 / 1024).toFixed(2)} MiB`);
            logDebug('媒体文件准备详情', () => ({
                filename: fileInfo.filename,
                byteLength: fileInfo.byteLength,
                mimeType: fileInfo.mimeType,
                localPath: fileInfo.localPath,
                transferMode: useBase64 ? 'base64' : 'localPath',
            }));
            return {
                element: h.file(fileUrl, attrs),
                type: item.type,
                fileUrl,
                filename: fileInfo.filename,
                mimeType: fileInfo.mimeType,
            };
        };

        const sendPreparedMedia = async (prepared) => {
            if (session.platform === 'qq' && (prepared.type === 'file' || prepared.type === 'audio' || prepared.type === 'video')) {
                logDebug('QQ 文件发送参数', () => ({ filename: prepared.filename, mimeType: prepared.mimeType, type: prepared.type }));
                const qqResult = await sendQQFile(ctx, session, prepared.fileUrl, prepared.filename, prepared.mimeType, prepared.type);
                return qqResult.element ? await session.send(qqResult.element) : qqResult.messageIds;
            }
            return await session.send(prepared.element);
        };

        const sendNotice = async (message, quoteId) => {
            try {
                const quote = quoteId ? h.quote(quoteId) : '';
                await session.send(`${quote}${h.text(message)}`);
            } catch (error) {
                logInfo('⚠️ 媒体状态提示发送失败，不影响主体结果', summarizeError(error));
                logDebug('媒体状态提示发送异常', error);
            }
        };

        const sendRiskyItem = async (item) => {
            const mediaLabel = item.type === 'audio' ? '音频' : item.type === 'video' ? '视频' : '文件';
            const allowQualityFallback = item.field.data === 'url';
            await sendMediaWithFallback({
                state: qualityState,
                allowQualityFallback,
                prepare: (currentData) => prepareMedia(item, currentData),
                send: sendPreparedMedia,
                logInfo: (message, detail) => logInfo(`⚠️ [${mediaLabel}] ${message}`, detail),
                logDebug: (message, data) => logDebug(`[${mediaLabel}] ${message}`, data),
                onDowngraded: async ({ fromData, toData, fromCandidate, toCandidate, messageIds }) => {
                    const fromQuality = getQualityLabel(platform, fromCandidate, fromData?.quality);
                    const toQuality = getQualityLabel(platform, toCandidate, toData?.quality);
                    logInfo(`⚠️ ${mediaLabel}音质已自动降级`, `${fromQuality} → ${toQuality}`);
                    await sendNotice(`原音质“${fromQuality}”发送失败，已自动降级为“${toQuality}”。`, getFirstMessageId(messageIds));
                },
                onFailed: async (error) => {
                    const exhausted = qualityState.enabled && qualityState.index >= qualityState.candidates.length - 1;
                    const detail = exhausted ? '已尝试至最低可用音质' : '发送失败';
                    logInfo(`⚠️ ${mediaLabel}${detail}，已跳过且不影响其他内容`, summarizeError(error));
                    logDebug(`${mediaLabel}最终发送失败`, error);
                    await sendNotice(`${mediaLabel}${detail}，已跳过该媒体，其他内容不受影响。`, session.messageId);
                },
            });
        };

        if (config.isfigure && (session.platform === 'onebot' || session.platform === 'red')) {
            const safeItems = responseItems.filter((item) => !riskyTypes.has(item.type));
            if (safeItems.length) {
                const figureChildren = safeItems.map((item) => h('message', {
                    userId: session.userId,
                    nickname: session.author?.nickname || session.username,
                }, createSafeElement(item)));
                try {
                    await session.send(h('figure', { children: figureChildren }));
                } catch (error) {
                    logInfo('⚠️ 合并转发发送失败，正在拆分重试', summarizeError(error));
                    logDebug('合并转发发送异常', error);
                    await sendSafeItemsIndividually(safeItems);
                }
            }
            for (const item of responseItems.filter((item) => riskyTypes.has(item.type))) {
                await sendRiskyItem(item);
            }
            return '';
        }

        let safeBatch = [];
        for (const item of responseItems) {
            if (!riskyTypes.has(item.type)) {
                safeBatch.push(item);
                continue;
            }
            await sendSafeBatch(safeBatch);
            safeBatch = [];
            await sendRiskyItem(item);
        }
        await sendSafeBatch(safeBatch);
        return '';
    }

    /**
     * 渲染歌单
     */
    async function renderSongList(ctx, session, config, options, songList, formattedList) {
        const exitCommands = config.exitCommand.split(/[,，]/).map(cmd => cmd.trim());
        const exitCommandTip = config.menuExitCommandTip ? `${session.text('.exitCommandTip', [exitCommands.join(' / ')])}<br /><br />` : '';
        let quoteId = session.messageId;

        // 检查 renderMode 配置
    const { useText, usePuppeteer, useSvg, useCanvas, useMarkdownTable, useMarkdownStyle, order, selectedNone } = parseRenderMode();

        // 检查是否至少启用了一种模式（理论上不会到这里，因为 parseRenderMode 会 fallback 到 svg）
        if (!useText && !usePuppeteer && !useSvg && !useCanvas && !useMarkdownTable && !useMarkdownStyle) {
            return `${config.enableQuote ? h.quote(session.messageId) : ''}${session.text('.noRenderMode')}`;
        }

        const selectedNoneFallbackTip = `${session.text('.selectedNoneFallbackTip')}\n`;
        if (selectedNone) logInfo('⚠️ 未选择渲染模式，本次歌单已回退 SVG');
        // 发送统一的渲染提示（如果启用）
        let waitTipMsgId = null; //默认值是falsy值呢
        if (config.showGeneratingTip !== false) {
            waitTipMsgId = await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}${selectedNone ? selectedNoneFallbackTip : ''}${session.text('.generatingTip')}`);
        }
        // 如果发了 那么就记录下 提示的消息id，后面撤回用呢, 这个waitTipMsgId会返回一个truthy的值


        // 检查是否为 QQ 平台
        const isQQ = session.platform === 'qq';

        // 准备艾特机器人的内容
        // QQ 平台艾特消息段能力有限，强制使用文本
        const atRobotText = "@机器人";
        const atRobotSegment = (config.useRealAtRobot && !isQQ) ? h.at(session.selfId) : atRobotText;

        // 辅助函数：发送单个渲染结果
        const sendRenderResult = async (result, type) => {
            const isMarkdown = type === 'markdown_table' || type === 'markdown_style';
            const isText = type === 'text';
            const isImage = type === 'svg' || type === 'puppeteer' || type === 'canvas';

            // (¦3[▓▓] 睡觉觉咯
            // const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            let mdCnt = 0;

            if (isMarkdown && result && result.markdown) {
                mdCnt++;
                try {
                    if (isQQ) {
                        await session.bot.internal.sendMessage(session.channelId, {
                            msg_id: session.messageId,
                            msg_type: 2,
                            markdown: { content: result.markdown },
                            msg_seq: Date.now() % 1e6 + mdCnt
                        });
                    } else {
                        throw new Error('⚠️ 当前平台不是 QQ 🐧，无法发送 Markdown');
                    }
                } catch (e) {
                    logInfo('⚠️ QQ Markdown 发送失败，继续尝试其他渲染结果', summarizeError(e));
                    logDebug('QQ Markdown 发送异常', e);
                }
            } else if ((isText || isImage) && result && result.payload) {
                // 文本和图片模式都直接使用 payload
                const msg = await session.send(result.payload);
                quoteId = msg.at(-1);
            }
        };

        // 辅助函数：执行单个渲染模式
        const executeMode = async (mode) => {
            // // 检查 QQ 平台限制
            // if ((mode === 'markdown_table' || mode === 'markdown_style') && !isQQ) {
            //    return;
            // }
            // 上面抛异常，这样有日志捏
            const startExecTime = Date.now();
            logDebug('开始执行渲染模式', mode);

            const imageStyle = options.image_style ? IMAGE_STYLE_MAP[Object.keys(IMAGE_STYLE_MAP)[options.image_style - 1]] : config.imageStyle;

            const renderStartTime = Date.now();
            const result = await generateSongList(ctx, mode, {
                config,
                musicLogger,
                session,
                formattedList,
                songList,
                options: {
                    ...options,
                    imageStyle,
                    mode: options.mode
                },
                exitCommandTip,
                atRobotSegment
            });
            const renderEndTime = Date.now();
            logDebug(`${mode} 渲染耗时`, `${renderEndTime - renderStartTime}ms`);

            if (result) {
                const sendStartTime = Date.now();
                await sendRenderResult(result, mode);
                const sendEndTime = Date.now();
                logDebug(`${mode} 渲染发送计时`, () => ({
                    sendMs: sendEndTime - sendStartTime,
                    totalMs: sendEndTime - startExecTime,
                }));
                logInfo(`✅ 已发送 ${mode} 模式渲染结果`);
            } else {
                logInfo(`⚠️ 渲染模式 ${mode} 未返回结果`);
            }
        };

        // 统一处理：遍历 order 数组执行所有启用的模式
        const pendingTasks = [];

        for (const mode of order) {
            if (config.strictOrderMode) {
                // 严格串行顺序模式：等待当前任务完成后再执行下一个
                logDebug('严格串行开始执行渲染', mode);
                await executeMode(mode).catch(err => {
                    logInfo(`⚠️ 串行渲染模式 ${mode} 执行失败，继续后续流程`, summarizeError(err));
                    logDebug(`串行渲染模式 ${mode} 异常`, err);
                });
            } else {
                // 并行模式：立即启动所有任务
                logDebug('开始并行执行渲染', mode);
                const task = executeMode(mode).catch(err => {
                    logInfo(`⚠️ 并行渲染模式 ${mode} 执行失败，继续其他模式`, summarizeError(err));
                    logDebug(`并行渲染模式 ${mode} 异常`, err);
                });
                pendingTasks.push(task);
            }
        }

        // 并行模式下，等待所有任务完成后撤回提示
        if (!config.strictOrderMode && pendingTasks.length > 0) {
            Promise.all(pendingTasks).finally(() => {
                if (waitTipMsgId) {
                    session.bot.deleteMessage(session.guildId, String(waitTipMsgId))
                        .catch(error => {
                            logInfo('⚠️ 撤回渲染提示消息失败，不影响点歌结果', summarizeError(error));
                            logDebug('撤回渲染提示消息异常', error);
                        });
                }
            });
        } else if (config.strictOrderMode && waitTipMsgId) {
            // 串行模式：所有任务已按顺序执行完毕，立即撤回
            session.bot.deleteMessage(session.guildId, String(waitTipMsgId))
                .catch(error => {
                    logInfo('⚠️ 撤回渲染提示消息失败，不影响点歌结果', summarizeError(error));
                    logDebug('撤回渲染提示消息异常', error);
                });
        }

        // config.waitTimeout的单位是s，而promp需要的单位是ms，所以乘以1000
        let input = await session.prompt(config.waitTimeout * 1000);
        if (!input) {
            return { timeout: true };
        }
        if (exitCommands.includes(input)) {
            return { exit: true };
        }
        return { input };
    }

    ctx.on('ready', async () => {
        // 验证并下载字体文件
        const downloadStatus = await validateAssets(ctx, musicLogger);

        // 使用 notifier 显示资源文件下载状态。notifier 是可选服务，副作用注册放进 ctx.inject。
        ctx.inject(['notifier'], (ctx) => {
            createNotifierInfoOfAssets(ctx, downloadStatus);
        });

        registerI18n(ctx, config);

        // 创建共享函数对象
        const sharedFunctions = {
            parseRenderMode,
            smartGet,
            smartApiGet,
            fetchNeteaseLyric,
            generateResponse,
            renderSongList,
            sendMusicCard,
            sendQqRichuiCard,
        };

        // 注册中间件
        registerMiddleware(ctx, config, musicLogger);

        // 注册网易云点歌指令
        registerCommand6(ctx, config, musicLogger, sharedFunctions);

        // 注册落月点歌指令
        registerCommand9(ctx, config, musicLogger, sharedFunctions);
    });
}

exports.apply = apply;
exports.Config = Config;
exports.name = name;
exports.usage = usage;
exports.inject = inject;
exports.reusable = true;
