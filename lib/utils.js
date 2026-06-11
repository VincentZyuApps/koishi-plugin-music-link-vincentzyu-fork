"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAssets = exports.createUtilFunctions = exports.safeUnlink = exports.getExtensionFromContentType = void 0;

const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const path = require('node:path');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');

// ============ 资源文件配置 ============

const ASSET_CONFIGS = [
    {
        filename: 'LXGWWenKaiMono-Regular.ttf',
        downloadUrl: 'https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/fonts/LXGWWenKaiMono-Regular.ttf',
        type: 'font'
    },
    {
        filename: 'SourceHanSerifSC-Medium.otf',
        downloadUrl: 'https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/fonts/SourceHanSerifSC-Medium.otf',
        type: 'font'
    },
    {
        filename: 'mahiro_mihari.png',
        downloadUrl: 'https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/bg/mahiro_mihari.png',
        type: 'image'
    },
    {
        filename: 'pixai_koishi.png',
        downloadUrl: 'https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/bg_koishi/pixai_koishi.png',
        type: 'image'
    }
];

// ============ 纯工具函数 ============

/**
 * 安全的 JSON 解析（兼容已解析对象和字符串）
 */
function safeJsonParse(data) {
    if (typeof data === 'object' && data !== null) return data;
    try { return JSON.parse(data); } catch (e) { return null; }
}
exports.safeJsonParse = safeJsonParse;

/**
 * 根据 API 后端构建歌曲直链 URL
 */
function buildSongUrl(useApi, songId) {
    const apiUrlMap = {
        'api.injahow.cn': `https://api.injahow.cn/meting/?type=url&id=${songId}`,
        'meting.jmstrand.cn': `https://meting.jmstrand.cn/?type=url&id=${songId}`,
        'api.qijieya.cn': `https://api.qijieya.cn/meting/?type=url&id=${songId}`,
        'metingapi.nanorocky.top': `https://metingapi.nanorocky.top/?server=netease&type=url&id=${songId}`,
    };
    return apiUrlMap[useApi] || '';
}
exports.buildSongUrl = buildSongUrl;

/**
 * 根据 Content-Type 获取文件扩展名
 * @param {string} contentType - MIME 类型
 * @returns {string} 文件扩展名
 */
function getExtensionFromContentType(contentType) {
    if (!contentType) return '.mp3';

    if (contentType.includes('audio/mpeg')) return '.mp3';
    if (contentType.includes('audio/mp4')) return '.m4a';
    if (contentType.includes('audio/wav')) return '.wav';
    if (contentType.includes('audio/flac')) return '.flac';

    return '.mp3';
}
exports.getExtensionFromContentType = getExtensionFromContentType;

/**
 * 解析文件名模板，替换占位符
 * @param {string} template - 文件名模板，如 "${name}-${artist}"
 * @param {object} data - 歌曲数据对象
 * @param {string} platform - 平台名称（可选）
 * @param {object} options - 可选配置
 * @param {boolean} options.keepSpaces - 是否保留空格（默认 false）
 * @param {string} options.slashReplacement - 斜杠替换字符（默认 '-'）
 * @returns {string} 解析后的文件名（不含扩展名）
 */
function parseFilenameTemplate(template, data, platform = '', options = {}) {
    if (!template || !data) return null;

    const { keepSpaces = false, slashReplacement = '-' } = options;

    // 生成时间戳 YYYYMMDD-HHMMSS
    const now = new Date();
    const timeStr = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
        '-',
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0')
    ].join('');

    // 定义可用的占位符映射
    const placeholders = {
        '${name}': data.name || data.songname || data.title || '',
        '${artist}': data.artist || data.singer || '',
        '${id}': data.id || '',
        '${quality}': data.quality || '',
        '${platform}': platform || '',
        '${time}': timeStr,
    };

    let result = template;

    // 替换所有占位符
    for (const [placeholder, value] of Object.entries(placeholders)) {
        let safeValue = String(value || '');

        // 1. 先处理斜杠 / （歌手分隔符），根据配置替换
        safeValue = safeValue.replace(/\//g, slashReplacement);

        // 2. 移除非法文件名字符（不包括空格和斜杠，斜杠已处理）
        safeValue = safeValue.replace(/[<>:"\\|?*\x00-\x1F]/g, '-');

        // 3. 根据配置决定是否保留空格
        if (!keepSpaces) {
            safeValue = safeValue.replace(/\s+/g, '-');
        }

        safeValue = safeValue.trim();
        result = result.replace(new RegExp(placeholder.replace(/\$/g, '\\$').replace(/\{/g, '\\{').replace(/\}/g, '\\}'), 'g'), safeValue);
    }

    // 清理连续的分隔符和首尾空白（但保留空格如果 keepSpaces 为 true）
    if (keepSpaces) {
        // 保留空格时：只合并连续的横杠和下划线
        result = result.replace(/[-_]{2,}/g, '-').replace(/^[-_]+|[-_]+$/g, '').trim();
    } else {
        // 不保留空格时：合并所有分隔符（包括空格）
        result = result.replace(/[-_\s]+/g, '-').replace(/^[-_\s]+|[-_\s]+$/g, '').trim();
    }

    return result || null;
}
exports.parseFilenameTemplate = parseFilenameTemplate;

/**
 * 安全删除文件（带重试机制）
 * @param {string} filePath - 文件路径
 * @param {number} maxRetries - 最大重试次数
 * @param {number} interval - 重试间隔（毫秒）
 * @param {Function} setTimeoutFn - setTimeout 函数（用于 Koishi 环境）
 */
async function safeUnlink(filePath, maxRetries = 5, interval = 1000, setTimeoutFn = setTimeout) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            await fs.access(filePath);
            await fs.unlink(filePath);
            return;
        } catch (error) {
            if (error.code === 'ENOENT') return; // 文件不存在直接返回
            if (error.code === 'EBUSY') {
                retries++;
                await new Promise(resolve => setTimeoutFn(resolve, interval));
            } else {
                throw error;
            }
        }
    }
    throw new Error(`Failed to delete ${filePath} after ${maxRetries} retries`);
}
exports.safeUnlink = safeUnlink;

// ============ 需要依赖注入的工具函数 ============

/**
 * 验证并下载资源文件（字体、背景图片等）
 * @param {object} ctx - Koishi Context 实例
 * @param {object} logger - Logger 实例
 */
async function validateAssets(ctx, logger) {
    const assetsDir = path.join(__dirname, '..', 'assets');
    const downloadStatus = [];

    // 确保 assets 目录存在
    if (!existsSync(assetsDir)) {
        mkdirSync(assetsDir, { recursive: true });
    }

    for (const assetConfig of ASSET_CONFIGS) {
        const assetPath = path.join(assetsDir, assetConfig.filename);
        const typeLabel = assetConfig.type === 'font' ? '插件内置字体' : '插件内置图片';

        // 检查资源文件是否存在
        if (!existsSync(assetPath)) {
            logger.info(`📦 [资源下载] ${typeLabel}文件 ${assetConfig.filename} 不存在，开始下载...`);

            try {
                const response = await ctx.http.get(assetConfig.downloadUrl, { responseType: 'arraybuffer' });
                const assetBuffer = Buffer.from(response);
                writeFileSync(assetPath, assetBuffer);
                logger.info(`✅ [资源下载] ${typeLabel}文件 ${assetConfig.filename} 下载完成`);
                downloadStatus.push({ name: assetConfig.filename, status: 'success', type: typeLabel });
            } catch (error) {
                logger.error(`❌ [资源下载] 下载${typeLabel}文件 ${assetConfig.filename} 失败: ${error.message}`);
                downloadStatus.push({ name: assetConfig.filename, status: 'failed', type: typeLabel });
            }
        } else {
            logger.debug(`ℹ️ [资源检查] ${typeLabel}文件 ${assetConfig.filename} 已存在`);
            downloadStatus.push({ name: assetConfig.filename, status: 'exists', type: typeLabel });
        }
    }

    return downloadStatus;
}
exports.validateAssets = validateAssets;

/**
 * 创建依赖上下文的工具函数集合
 * @param {object} options - 配置选项
 * @param {object} options.ctx - Koishi Context 实例
 * @param {object} options.config - 插件配置
 * @param {object} options.logger - Logger 实例
 * @param {Function} options.logInfo - 日志输出函数
 * @param {string} options.cacheDir - 缓存文件目录
 * @returns {object} 工具函数集合
 */
function createUtilFunctions({ ctx, config, logger, logInfo, cacheDir }) {
    let isCacheDirInitialized = false;

    /**
     * 确保缓存目录存在
     */
    async function ensureCacheDir() {
        if (!isCacheDirInitialized) {
            try {
                // 检查路径是否存在
                const stats = await fs.stat(cacheDir);

                // 检查是否是文件而非目录
                if (stats.isFile()) {
                    const errorMsg = `❌ [缓存目录] 配置的路径是一个文件而非目录: ${cacheDir}`;
                    logger.error(errorMsg);
                    logger.error(`   ├─ 📁 当前路径类型: 文件 (file)`);
                    logger.error(`   ├─ 📂 期望路径类型: 目录 (directory)`);
                    logger.error(`   └─ 💡 请修改配置项 "缓存目录" 为一个有效的目录路径，或删除该文件后重新运行`);
                    throw new Error(errorMsg);
                }

                // 是目录，正常
                isCacheDirInitialized = true;
                logInfo(`✅ [缓存目录] 目录已存在: ${cacheDir}`);
            } catch (error) {
                // 如果是上面抛出的文件错误，直接 rethrow
                if (error.message.includes('配置的路径是一个文件而非目录')) {
                    throw error;
                }

                // 目录不存在 (ENOENT)
                if (config.autoCreateCacheDir) {
                    // 自动创建目录
                    logInfo(`📂 [缓存目录] 目录不存在，正在自动创建: ${cacheDir}`);
                    await fs.mkdir(cacheDir, { recursive: true });
                    isCacheDirInitialized = true;
                    logInfo(`✅ [缓存目录] 创建成功`);
                } else {
                    // 不自动创建，抛出错误
                    const errorMsg = `❌ [缓存目录] 目录不存在且未开启自动创建: ${cacheDir}`;
                    logger.error(errorMsg);
                    logger.error(`   💡 请手动创建目录或在配置中开启"自动创建缓存目录"`);
                    throw new Error(errorMsg);
                }
            }
        }
    }

    /**
     * 代理请求函数（适用于海外用户）
     * @param {string} targetUrl - 目标 URL
     * @returns {Promise<any>} 响应数据
     */
    async function requestWithProxy(targetUrl) {
        const proxyUrl = 'https://web-proxy.apifox.cn/api/v1/request';
        logInfo(`使用${proxyUrl}代理请求${targetUrl}`);
        try {
            const response = await ctx.http.post(proxyUrl, {}, {
                headers: {
                    'api-u': targetUrl,
                    'api-o0': 'method=GET, timings=true, timeout=3000',
                    'Content-Type': 'application/json'
                }
            });
            return response;
        } catch (error) {
            logger.error('代理请求失败', error);
            throw error;
        }
    }

    /**
     * 下载文件到本地临时目录（或返回 base64）
     * @param {string} url - 文件 URL
     * @param {object} data - 歌曲数据对象（包含 name, artist, id 等字段）
     * @param {string} platform - 平台名称（可选，如 'netease', 'tencent'）
     * @returns {Promise<{localPath: string|null, base64: string|null, mimeType: string, filename: string}|null>} 文件信息对象，失败返回 null
     */
    async function downloadFile(url, data = {}, platform = '') {
        await ensureCacheDir();

        const songName = data.name || data.songname || data.title || '未知歌曲';
        const artist = data.artist || data.singer || '未知歌手';

        logInfo(`📥 [下载开始] ${songName} - ${artist}`);
        logInfo(`   ├─ URL: ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}`);
        logInfo(`   ├─ 平台: ${platform || '未指定'}`);
        logInfo(`   └─ 启用文件下载: ${config.enableFileDownload ? '✅ 是' : '❌ 否'}`);

        try {
            const startTime = Date.now();

            // 设置超时提醒（5秒）
            const timeoutTimer = setTimeout(() => {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                logInfo(`⏳ [下载进行中] 已耗时 ${elapsed}秒，文件可能较大或网络较慢，请耐心等待...`);
            }, 5000);

            const file = await ctx.http.file(url);

            // 清除超时提醒
            clearTimeout(timeoutTimer);

            const downloadTime = ((Date.now() - startTime) / 1000).toFixed(2);
            const fileSizeKB = (file.data.byteLength / 1024).toFixed(2);

            logInfo(`✅ [下载完成] 耗时 ${downloadTime}秒 | 大小 ${fileSizeKB} KB`);

            const contentType = file.type || file.mime;
            logInfo(`   ├─ MIME类型: ${contentType || '未知'}`);

            const ext = getExtensionFromContentType(contentType);
            logInfo(`   └─ 文件扩展名: ${ext || '未知'}`);

            let filename;
            if (config.renameTempFile) {
                logInfo(`📝 [文件名生成] 使用自定义命名模式`);
                // 使用模板解析文件名，传入配置选项
                const filenameOptions = {
                    keepSpaces: config.fileNameKeepSpaces || false,
                    slashReplacement: config.fileNameSlashReplacement || '-',
                };
                const parsedName = parseFilenameTemplate(config.fileNameTemplate, data, platform, filenameOptions);
                if (parsedName) {
                    filename = parsedName + ext;
                    logInfo(`   ├─ 模板: ${config.fileNameTemplate}`);
                    logInfo(`   └─ 生成文件名: ${filename}`);
                } else {
                    // 模板解析失败，使用默认方式
                    logInfo(`   ⚠️ 模板解析失败，降级到安全歌名模式`);
                    const songname = data.name || data.songname || data.title || '';
                    if (songname) {
                        const safeSongname = songname.replace(/[<>:"/\\|?*\x00-\x1F\s]/g, '-').trim();
                        filename = safeSongname + ext;
                        logInfo(`   └─ 降级文件名: ${filename}`);
                    } else {
                        filename = crypto.randomBytes(8).toString('hex') + ext;
                        logInfo(`   └─ 随机文件名: ${filename}`);
                    }
                }
            } else {
                logInfo(`📝 [文件名生成] 使用随机Hash模式`);
                filename = crypto.randomBytes(8).toString('hex') + ext;
                logInfo(`   └─ 生成文件名: ${filename}`);
            }

            // 将 ArrayBuffer 转换为 Buffer
            const buffer = Buffer.from(file.data);

            // 根据 enableFileDownload 决定是否保存到本地磁盘
            let localPath = null;
            if (config.enableFileDownload) {
                logInfo(`💾 [文件保存] 启用文件下载，正在写入本地磁盘`);
                const filePath = path.join(cacheDir, filename);
                await fs.writeFile(filePath, buffer);
                localPath = filePath;
                logInfo(`   └─ 保存路径: ${filePath}`);
            } else {
                logInfo(`💾 [文件保存] 未启用文件下载，跳过写入磁盘`);
            }

            // 生成 base64（始终生成，供需要时使用）
            const base64 = buffer.toString('base64');
            const mimeType = contentType || 'audio/mpeg';

            const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
            logInfo(`✨ [处理完成] 总耗时 ${totalTime}秒 | 📡 传输模式: ${config.fileTransferMode} | 💾 已保存本地: ${!!localPath}`);

            return {
                localPath,
                base64,
                mimeType,
                filename
            };
        } catch (error) {
            logger.error(`❌ [下载失败] ${songName} - ${artist}`);
            logger.error(`   ├─ 🔴 错误类型: ${error.constructor.name}`);
            logger.error(`   ├─ 💬 错误消息: ${error.message}`);
            if (error.response) {
                logger.error(`   ├─ 🌐 HTTP状态码: ${error.response.status}`);
                logger.error(`   └─  响应数据: ${JSON.stringify(error.response.data).substring(0, 200)}`);
            }
            logger.error(`   └─  堆栈跟踪:`, error.stack);
            return null;
        }
    }

    /**
     * 发送音乐卡片
     * @param {object} session - 会话对象
     * @param {object} songData - 歌曲数据
     * @param {string} platform - 平台名称 ('netease' 或 'tencent')
     * @param {object} config - 配置对象
     * @param {object} logger - 日志对象
     * @returns {Promise<void>}
     */
    async function sendMusicCard(session, songData, platform, config, logger) {
        if (session.platform !== "onebot") return;

        try {
            const onebotBot = session.onebot || undefined;
            if (!onebotBot) return;

            let musicCard;
            if (platform === 'netease') {
                // 网易云音乐使用官方卡片
                musicCard = {
                    "type": "music",
                    "data": {
                        "type": '163',
                        "id": songData.id
                    }
                };
            } else if (platform === 'tencent') {
                // QQ音乐使用自定义卡片
                musicCard = {
                    "type": "music",
                    "data": {
                        "type": "custom",
                        "url": songData.link || `https://y.qq.com/n/ryqq/songDetail/${songData.mid || songData.id}`,
                        "audio": songData.url,
                        "title": songData.song || songData.name,
                        "content": songData.singer || songData.artist,
                        "image": songData.cover || songData.pic
                    }
                };
            } else {
                return;
            }

            logger.info(` [发送卡片] ${JSON.stringify(musicCard)}`);

            // 根据会话类型选择发送接口 - 用 guildId 判断是否有群号
            if (session.guildId) {
                // 在qq群中，发送群聊消息
                await onebotBot._request('send_group_msg', {
                    "group_id": session.guildId,
                    "message": [musicCard]
                });
            } else {
                // 在私聊中，发送私聊消息
                await onebotBot._request('send_private_msg', {
                    "user_id": session.userId,
                    "message": [musicCard]
                });
            }
        } catch (error) {
            logger.error('❌ [发送失败] 发送音乐卡片失败:', error);
        }
    }

    /**
     * 检测是否为 crack 适配器
     * @param {object} session - 会话对象
     * @returns {boolean}
     */
    function isCrackAdapter(session) {
        const result = 'useMarkdownIfAt' in ((session.bot)?.config || {});
        logInfo(`🔍 [适配器检测] 当前识别为: 【 ${result ? '🔨 crack 适配器' : '📦 官方适配器'}】`);
        return result;
    }

    /**
     * Crack 适配器：通过 h.file() 元素，适配器内部处理上传
     * @param {object} session - 会话对象
     * @param {string} fileUrl - 文件 URL（base64 或 file:// 或 http://）
     * @param {string} filename - 文件名
     * @returns {object} h.file() 元素
     */
    function sendFileViaCrackAdapter(session, fileUrl, filename) {
        const { h } = require('koishi');
        return h.file(fileUrl, { title: filename, filename, name: filename });
    }

    /**
     * 官方适配器：直接调 QQ Bot API 上传文件 + 发消息
     * @param {object} ctx - Koishi Context
     * @param {object} session - 会话对象
     * @param {string} fileUrl - 文件 URL（base64 或 file:// 或 http://）
     * @param {string} filename - 文件名
     * @returns {Promise<void>}
     */
    async function sendFileViaOfficialAdapter(ctx, session, fileUrl, filename) {
        const MSG_TIMEOUT = 5 * 60 * 1000 - 2000;

        // 1. 构建文件上传请求 (file_type=4 文件)
        const fileRequest = {
            file_type: 4,
            srv_send_msg: false,
        };

        // 2. 处理文件数据
        const base64Match = /^data:([\w/.+-]+);base64,(.*)$/.exec(fileUrl);
        if (base64Match?.[2]) {
            fileRequest.file_data = base64Match[2];
        } else if (fileUrl.startsWith('file://')) {
            const localPath = decodeURIComponent(new URL(fileUrl).pathname);
            fileRequest.file_data = (await fs.readFile(localPath)).toString('base64');
        } else {
            fileRequest.url = fileUrl;
        }

        // 3. 上传文件
        let fileResponse;
        if (session.isDirect) {
            fileResponse = await session.bot.internal.sendFilePrivate(session.userId, fileRequest);
        } else {
            fileResponse = await session.bot.internal.sendFileGuild(session.channelId, fileRequest);
        }

        logInfo(`📤 [Official文件上传] 成功: ${filename}, file_uuid: ${fileResponse.file_uuid}, ttl: ${fileResponse.ttl}`);

        // 4. 构建消息 payload（msg_type=7 媒体消息，不带 content 避免空行 bug）
        const msgPayload = {
            msg_type: 7,
            media: fileResponse,
        };

        // 被动回复：附带 msg_id/msg_seq
        if (session.messageId && session.timestamp && Date.now() - session.timestamp < MSG_TIMEOUT) {
            session.seq = (session.seq || 0) + 1;
            msgPayload.msg_id = session.messageId;
            msgPayload.msg_seq = session.seq;
        }

        // 5. 发送消息
        if (session.isDirect) {
            await session.bot.internal.sendPrivateMessage(session.userId, msgPayload);
        } else {
            await session.bot.internal.sendMessage(session.channelId, msgPayload);
        }

        logInfo(`✅ [Official文件发送] 成功: ${filename}`);
    }

    /**
     * QQ 平台文件发送统一入口
     * @param {object} ctx - Koishi Context
     * @param {object} session - 会话对象
     * @param {string} fileUrl - 文件 URL
     * @param {string} filename - 文件名
     * @returns {Promise<object|void>} crack 返回 h.file() 元素，official 返回 void
     */
    async function sendQQFile(ctx, session, fileUrl, filename) {
        if (isCrackAdapter(session)) {
            return sendFileViaCrackAdapter(session, fileUrl, filename);
        } else {
            await sendFileViaOfficialAdapter(ctx, session, fileUrl, filename);
        }
    }

    return {
        ensureCacheDir,
        requestWithProxy,
        downloadFile,
        sendMusicCard,
        isCrackAdapter,
        sendQQFile,
    };
}
exports.createUtilFunctions = createUtilFunctions;
