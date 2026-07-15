"use strict";

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { getExtensionFromContentType, parseFilenameTemplate } = require('./file');

function createDownloadUtils({ ctx, config, logger, logInfo, cacheDir }) {
    let isCacheDirInitialized = false;

    async function ensureCacheDir() {
        if (isCacheDirInitialized) return;
        try {
            const stats = await fs.stat(cacheDir);
            if (stats.isFile()) {
                const errorMsg = `❌ [缓存目录] 配置的路径是一个文件而非目录: ${cacheDir}`;
                logger.error(errorMsg);
                logger.error('   ├─ 📁 当前路径类型: 文件 (file)');
                logger.error('   ├─ 📂 期望路径类型: 目录 (directory)');
                logger.error('   └─ 💡 请修改配置项 "缓存目录" 为一个有效的目录路径，或删除该文件后重新运行');
                throw new Error(errorMsg);
            }
            isCacheDirInitialized = true;
            logInfo(`✅ [缓存目录] 目录已存在: ${cacheDir}`);
        } catch (error) {
            if (error.message.includes('配置的路径是一个文件而非目录')) throw error;
            if (!config.autoCreateCacheDir) {
                const errorMsg = `❌ [缓存目录] 目录不存在且未开启自动创建: ${cacheDir}`;
                logger.error(errorMsg);
                logger.error('   💡 请手动创建目录或在配置中开启"自动创建缓存目录"');
                throw new Error(errorMsg);
            }
            logInfo(`📂 [缓存目录] 目录不存在，正在自动创建: ${cacheDir}`);
            await fs.mkdir(cacheDir, { recursive: true });
            isCacheDirInitialized = true;
            logInfo('✅ [缓存目录] 创建成功');
        }
    }

    async function requestWithProxy(targetUrl) {
        const proxyUrl = 'https://web-proxy.apifox.cn/api/v1/request';
        logInfo(`使用${proxyUrl}代理请求${targetUrl}`);
        try {
            return await ctx.http.post(proxyUrl, {}, {
                headers: {
                    'api-u': targetUrl,
                    'api-o0': 'method=GET, timings=true, timeout=3000',
                    'Content-Type': 'application/json',
                },
            });
        } catch (error) {
            logger.error('❌ 代理请求失败', error);
            throw error;
        }
    }

    async function downloadFile(fileUrl, data = {}, platform = '') {
        await ensureCacheDir();
        const songName = data.name || data.songname || data.title || '未知歌曲';
        const artist = data.artist || data.singer || '未知歌手';
        logInfo(`📥 [下载开始] ${songName} - ${artist}`);
        logInfo(`   ├─ URL: ${fileUrl.substring(0, 100)}${fileUrl.length > 100 ? '...' : ''}`);
        logInfo(`   ├─ 平台: ${platform || '未指定'}`);
        logInfo(`   └─ 启用文件下载: ${config.enableFileDownload ? '✅ 是' : '❌ 否'}`);

        try {
            const startTime = Date.now();
            const timeoutTimer = setTimeout(() => {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                logInfo(`⏳ [下载进行中] 已耗时 ${elapsed}秒，文件可能较大或网络较慢，请耐心等待...`);
            }, 5000);
            let file;
            try {
                file = await ctx.http.file(fileUrl);
            } finally {
                clearTimeout(timeoutTimer);
            }

            const downloadTime = ((Date.now() - startTime) / 1000).toFixed(2);
            const fileSizeKB = (file.data.byteLength / 1024).toFixed(2);
            const contentType = file.type || file.mime;
            const ext = getExtensionFromContentType(contentType);
            logInfo(`✅ [下载完成] 耗时 ${downloadTime}秒 | 大小 ${fileSizeKB} KB`);
            logInfo(`   ├─ MIME类型: ${contentType || '未知'}`);
            logInfo(`   └─ 文件扩展名: ${ext || '未知'}`);

            let filename;
            if (config.renameTempFile) {
                logInfo('📝 [文件名生成] 使用自定义命名模式');
                const parsedName = parseFilenameTemplate(config.fileNameTemplate, data, platform, {
                    keepSpaces: config.fileNameKeepSpaces || false,
                    slashReplacement: config.fileNameSlashReplacement || '-',
                });
                if (parsedName) {
                    filename = parsedName + ext;
                    logInfo(`   ├─ 模板: ${config.fileNameTemplate}`);
                    logInfo(`   └─ 生成文件名: ${filename}`);
                } else {
                    logInfo('   ⚠️ 模板解析失败，降级到安全歌名模式');
                    const fallbackName = data.name || data.songname || data.title || '';
                    filename = fallbackName
                        ? fallbackName.replace(/[<>:"/\\|?*\x00-\x1F\s]/g, '-').trim() + ext
                        : crypto.randomBytes(8).toString('hex') + ext;
                    logInfo(`   └─ 降级文件名: ${filename}`);
                }
            } else {
                filename = crypto.randomBytes(8).toString('hex') + ext;
                logInfo(`📝 [文件名生成] 使用随机Hash模式`);
                logInfo(`   └─ 生成文件名: ${filename}`);
            }

            const buffer = Buffer.from(file.data);
            let localPath = null;
            if (config.enableFileDownload) {
                localPath = path.join(cacheDir, filename);
                await fs.writeFile(localPath, buffer);
                logInfo(`💾 [文件保存] 已写入本地磁盘: ${localPath}`);
            } else {
                logInfo('💾 [文件保存] 未启用文件下载，跳过写入磁盘');
            }

            const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
            logInfo(`✨ [处理完成] 总耗时 ${totalTime}秒 | 📡 传输模式: ${config.fileTransferMode} | 💾 已保存本地: ${!!localPath}`);
            return {
                localPath,
                base64: buffer.toString('base64'),
                mimeType: contentType || 'audio/mpeg',
                filename,
            };
        } catch (error) {
            logger.error(`❌ [下载失败] ${songName} - ${artist}`);
            logger.error(`   ├─ 🔴 错误类型: ${error.constructor.name}`);
            logger.error(`   ├─ 💬 错误消息: ${error.message}`);
            if (error.response) {
                logger.error(`   ├─ 🌐 HTTP状态码: ${error.response.status}`);
                logger.error(`   └─ 📄 响应数据: ${JSON.stringify(error.response.data).substring(0, 200)}`);
            }
            logger.error('   └─ 🧵 堆栈跟踪:', error.stack);
            return null;
        }
    }

    return { ensureCacheDir, requestWithProxy, downloadFile };
}

module.exports = { createDownloadUtils };
