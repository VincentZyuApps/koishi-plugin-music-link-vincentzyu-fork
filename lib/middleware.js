"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMiddleware = void 0;
const { h } = require("koishi");
const { summarizeError } = require('./util/logger');

/**
 * 判断是否应该解析该音乐卡片
 * @param {object} jsonData - 解析后的JSON数据
 * @param {object} config - 配置对象
 * @returns {boolean} 是否应该解析
 */
function shouldParseCard(jsonData, config) {
    const view = jsonData.view;

    // 如果未启用白名单，允许所有卡片
    if (!config.enableWhitelist) {
        return true;
    }

    // 启用白名单时，检查是否在白名单中
    if (!config.customWhitelist || config.customWhitelist.length === 0) {
        return false; // 白名单为空则拒绝
    }

    return config.customWhitelist.some(rule => {
        if (!rule.enabled) return false;

        const viewMatch = rule.viewType === '*' || rule.viewType === view;

        return viewMatch;
    });
}

/**
 * 注册音乐卡片中间件
 * @param {any} ctx - Koishi 上下文
 * @param {any} config - 配置对象
 * @param {{logInfo: Function, logDebug: Function}} musicLogger - 插件日志工具
 */
function registerMiddleware(ctx, config, musicLogger) {
    const { logInfo, logDebug } = musicLogger;
    if (config.enablemiddleware) {
        ctx.middleware(async (session, next) => {
            try {
                // 解析消息内容
                const messageElements = await h.parse(session.content);

                // 遍历解析后的消息元素
                for (const element of messageElements) {
                    // 确保元素类型为 'json' 并且有数据
                    if (element.type === 'json' && element.attrs && element.attrs.data) {
                        const jsonData = JSON.parse(element.attrs.data);
                        logDebug('OneBot 中间件收到卡片 JSON', jsonData);

                        // 检查是否应该解析该卡片（白名单过滤）
                        if (!shouldParseCard(jsonData, config)) {
                            logDebug('OneBot 卡片被白名单过滤', () => ({
                                view: jsonData.view,
                                whitelistEnabled: config.enableWhitelist,
                            }));
                            continue; // 跳过当前卡片，继续处理下一个元素
                        }

                        logInfo('✅ 检测到匹配的 OneBot 音乐卡片', `app=${jsonData.app || '未知'}，view=${jsonData.view || '未知'}`);

                        // 检查是否存在 musicMeta 和 tag
                        const musicMeta = jsonData?.meta?.music || jsonData?.meta?.news; // 尝试兼容两种结构
                        const tag = musicMeta?.tag;
                        if (musicMeta && tag.includes("音乐")) {

                            const title = musicMeta.title;
                            const desc = musicMeta.desc;
                            logDebug('OneBot 音乐卡片 metadata', () => ({ musicMeta, tag, title, desc }));
                            // 获取配置的指令名称
                            let command = config.serverSelect;
                            let commandName = config[command]; // 直接使用 config[command] 获取配置项的值
                            logDebug('OneBot 音乐卡片目标指令', commandName);
                            if (!commandName) {
                                commandName = '歌曲搜索'; // 默认值，以防配置项不存在
                                logInfo(`❌ 未找到配置项 ${command} 对应的指令名称`, '已使用默认指令“歌曲搜索”');
                            }

                            // 如果选择了 command6 并且是网易云音乐卡片
                            if (command === 'command6' && tag === '网易云音乐') {
                                // 直接提取歌曲 ID
                                const jumpUrl = musicMeta.jumpUrl;
                                const match = jumpUrl?.match(/id=(\d+)/); // 使用 ?. 确保 jumpUrl 不为 null 或 undefined
                                if (match && match[1]) {
                                    const songId = match[1];
                                    logDebug('从 OneBot 卡片提取网易云音乐 ID', songId);

                                    // 执行 command6 指令
                                    logInfo('🎯 OneBot 音乐卡片执行点歌指令', `${commandName} ${songId}`);
                                    await session.execute(`${commandName} ${songId}`);
                                    return; // 结束当前中间件处理
                                } else {
                                    logInfo('❌ OneBot 网易云音乐卡片解析失败', '未能在 jumpUrl 中找到歌曲 ID');
                                    logDebug('OneBot 卡片 jumpUrl', jumpUrl);
                                }
                            } else {
                                // 其他情况，按照原逻辑处理
                                const defaultSongIndex = config.middlewareDefaultSongIndex;

                                if (command) {
                                    // 更通用的获取指令名称方式
                                    logInfo('🎯 OneBot 音乐卡片执行点歌指令', `${commandName} -n ${defaultSongIndex}`);
                                    logDebug('OneBot 音乐卡片执行指令详情', () => ({ commandName, defaultSongIndex, title, desc }));
                                    await session.execute(`${commandName} -n ${defaultSongIndex} "${title} ${desc}"`);
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                logInfo('❌ OneBot 音乐卡片中间件异常', summarizeError(error));
                logDebug('OneBot 音乐卡片中间件诊断', error);
                await session.send(session.text('middlewareError'));
            }
            // 如果没有匹配到任何 json 数据，继续下一个中间件
            return next();
        }, config.enablePrependMiddleware);
    }
}

exports.registerMiddleware = registerMiddleware;
