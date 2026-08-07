"use strict";

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { detectMediaType, parseFilenameTemplate } = require('./file');
const { summarizeError } = require('./logger');

function createDownloadUtils({ ctx, config, musicLogger, cacheDir }) {
    const { logInfo, logDebug } = musicLogger;
    let isCacheDirInitialized = false;

    async function ensureCacheDir() {
        if (isCacheDirInitialized) return;
        try {
            const stats = await fs.stat(cacheDir);
            if (stats.isFile()) {
                const errorMsg = `❌ [缓存目录] 配置的路径是一个文件而非目录: ${cacheDir}`;
                logInfo(errorMsg, '请将“缓存目录”改为有效目录，或删除同名文件');
                logDebug('缓存目录类型错误', () => ({ cacheDir, actualType: 'file', expectedType: 'directory' }));
                throw new Error(errorMsg);
            }
            isCacheDirInitialized = true;
            logDebug('缓存目录已存在', cacheDir);
        } catch (error) {
            if (error.message.includes('配置的路径是一个文件而非目录')) throw error;
            if (!config.autoCreateCacheDir) {
                const errorMsg = `❌ [缓存目录] 目录不存在且未开启自动创建: ${cacheDir}`;
                logInfo(errorMsg, '请手动创建目录或开启“自动创建缓存目录”');
                logDebug('缓存目录不可用', () => ({ cacheDir, error }));
                throw new Error(errorMsg);
            }
            logInfo('📂 缓存目录不存在，正在自动创建');
            logDebug('待创建缓存目录', cacheDir);
            await fs.mkdir(cacheDir, { recursive: true });
            isCacheDirInitialized = true;
            logInfo('✅ 缓存目录创建成功');
        }
    }

    async function requestWithProxy(targetUrl) {
        const proxyUrl = 'https://web-proxy.apifox.cn/api/v1/request';
        logDebug('代理请求参数', () => ({ proxyUrl, targetUrl }));
        try {
            return await ctx.http.post(proxyUrl, {}, {
                headers: {
                    'api-u': targetUrl,
                    'api-o0': 'method=GET, timings=true, timeout=3000',
                    'Content-Type': 'application/json',
                },
            });
        } catch (error) {
            logInfo('❌ 代理请求失败', summarizeError(error));
            logDebug('代理请求异常', error);
            throw error;
        }
    }

    async function downloadFile(fileUrl, data = {}, platform = '') {
        if (config.enableFileDownload) await ensureCacheDir();
        const songName = data.name || data.songname || data.title || '未知歌曲';
        const artist = data.artist || data.singer || '未知歌手';
        logInfo('📥 音乐文件下载开始', `${songName} - ${artist}，平台=${platform || '未指定'}`);
        logDebug('音乐文件下载参数', () => ({
            fileUrl,
            platform: platform || '未指定',
            enableFileDownload: config.enableFileDownload,
            fileTransferMode: config.fileTransferMode,
        }));

        try {
            const startTime = Date.now();
            const timeoutTimer = setTimeout(() => {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                logInfo('⏳ 音乐文件仍在下载', `已耗时 ${elapsed} 秒`);
            }, 5000);
            let file;
            try {
                file = await ctx.http.file(fileUrl);
            } finally {
                clearTimeout(timeoutTimer);
            }

            const downloadTime = ((Date.now() - startTime) / 1000).toFixed(2);
            const buffer = Buffer.from(file.data);
            const fileSizeKB = (buffer.byteLength / 1024).toFixed(2);
            const responseContentType = file.type || file.mime;
            const { extension: ext, mimeType: contentType } = detectMediaType(buffer, responseContentType, fileUrl);
            logInfo('✅ 音乐文件下载完成', `耗时 ${downloadTime} 秒，大小 ${fileSizeKB} KiB`);
            logDebug('下载媒体类型检测结果', () => ({
                detectedMimeType: contentType || '未知',
                responseContentType: responseContentType || '未知',
                extension: ext || '未知',
            }));

            let filename;
            if (config.renameTempFile) {
                logDebug('文件名生成模式', '自定义模板');
                const parsedName = parseFilenameTemplate(config.fileNameTemplate, data, platform, {
                    keepSpaces: config.fileNameKeepSpaces || false,
                    slashReplacement: config.fileNameSlashReplacement || '-',
                });
                if (parsedName) {
                    filename = parsedName + ext;
                    logDebug('自定义文件名生成结果', () => ({ template: config.fileNameTemplate, filename }));
                } else {
                    logInfo('⚠️ 文件名模板解析失败，已回退安全歌名模式');
                    const fallbackName = data.name || data.songname || data.title || '';
                    filename = fallbackName
                        ? fallbackName.replace(/[<>:"/\\|?*\x00-\x1F\s]/g, '-').trim() + ext
                        : crypto.randomBytes(8).toString('hex') + ext;
                    logDebug('回退文件名生成结果', filename);
                }
            } else {
                filename = crypto.randomBytes(8).toString('hex') + ext;
                logDebug('随机 Hash 文件名生成结果', filename);
            }

            let localPath = null;
            if (config.enableFileDownload) {
                localPath = path.join(cacheDir, filename);
                await fs.writeFile(localPath, buffer);
                logInfo('💾 音乐文件已写入本地缓存', filename);
                logDebug('音乐文件本地路径', localPath);
            } else {
                logDebug('未启用文件下载，跳过写入本地磁盘');
            }

            const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
            logDebug('音乐文件处理完成', () => ({
                totalSeconds: totalTime,
                transferMode: config.fileTransferMode,
                savedLocally: Boolean(localPath),
            }));
            return {
                localPath,
                base64: config.fileTransferMode === 'base64' || !localPath ? buffer.toString('base64') : null,
                mimeType: contentType || 'audio/mpeg',
                filename,
                byteLength: buffer.byteLength,
            };
        } catch (error) {
            logInfo(`❌ 音乐文件下载失败：${songName} - ${artist}`, summarizeError(error));
            logDebug('音乐文件下载异常', error);
            throw error;
        }
    }

    return { ensureCacheDir, requestWithProxy, downloadFile };
}

module.exports = { createDownloadUtils };
