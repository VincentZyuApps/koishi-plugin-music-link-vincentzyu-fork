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

   // 确保 assets 目录存在
   if (!existsSync(assetsDir)) {
      mkdirSync(assetsDir, { recursive: true });
   }

   for (const assetConfig of ASSET_CONFIGS) {
      const assetPath = path.join(assetsDir, assetConfig.filename);
      const typeLabel = assetConfig.type === 'font' ? '字体' : '图片';

      // 检查资源文件是否存在
      if (!existsSync(assetPath)) {
         logger.info(`${typeLabel}文件 ${assetConfig.filename} 不存在，开始下载...`);

         try {
            const response = await ctx.http.get(assetConfig.downloadUrl, { responseType: 'arraybuffer' });
            const assetBuffer = Buffer.from(response);
            writeFileSync(assetPath, assetBuffer);
            logger.info(`${typeLabel}文件 ${assetConfig.filename} 下载完成`);
         } catch (error) {
            logger.error(`下载${typeLabel}文件 ${assetConfig.filename} 失败: ${error.message}`);
         }
      } else {
         logger.debug(`${typeLabel}文件 ${assetConfig.filename} 已存在`);
      }
   }
}
exports.validateAssets = validateAssets;

/**
 * 创建依赖上下文的工具函数集合
 * @param {object} options - 配置选项
 * @param {object} options.ctx - Koishi Context 实例
 * @param {object} options.config - 插件配置
 * @param {object} options.logger - Logger 实例
 * @param {Function} options.logInfo - 日志输出函数
 * @param {string} options.tempDir - 临时文件目录
 * @returns {object} 工具函数集合
 */
function createUtilFunctions({ ctx, config, logger, logInfo, tempDir }) {
   let isTempDirInitialized = false;

   /**
    * 确保临时目录存在
    */
   async function ensureTempDir() {
      if (!isTempDirInitialized) {
         await fs.mkdir(tempDir, { recursive: true });
         isTempDirInitialized = true;
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
      await ensureTempDir();

      try {
         const file = await ctx.http.file(url);
         const contentType = file.type || file.mime;
         logInfo(file);

         const ext = getExtensionFromContentType(contentType);

         let filename;
         if (config.renameTempFile) {
            // 使用模板解析文件名，传入配置选项
            const filenameOptions = {
               keepSpaces: config.fileNameKeepSpaces || false,
               slashReplacement: config.fileNameSlashReplacement || '-',
            };
            const parsedName = parseFilenameTemplate(config.fileNameTemplate, data, platform, filenameOptions);
            if (parsedName) {
               filename = parsedName + ext;
               logInfo(`使用模板生成文件名: ${filename}`);
            } else {
               // 模板解析失败，使用默认方式
               const songname = data.name || data.songname || data.title || '';
               if (songname) {
                  const safeSongname = songname.replace(/[<>:"/\\|?*\x00-\x1F\s]/g, '-').trim();
                  filename = safeSongname + ext;
               } else {
                  filename = crypto.randomBytes(8).toString('hex') + ext;
               }
            }
         } else {
            filename = crypto.randomBytes(8).toString('hex') + ext;
         }

         // 将 ArrayBuffer 转换为 Buffer
         const buffer = Buffer.from(file.data);

         // 根据配置决定是否需要保存本地文件
         let localPath = null;
         if (config.fileTransferMode !== 'base64') {
            const filePath = path.join(tempDir, filename);
            await fs.writeFile(filePath, buffer);
            localPath = filePath;
         }

         // 生成 base64（始终生成，供需要时使用）
         const base64 = buffer.toString('base64');
         const mimeType = contentType || 'audio/mpeg';

         return {
            localPath,
            base64,
            mimeType,
            filename
         };
      } catch (error) {
         logger.error('文件下载失败:', error);
         return null;
      }
   }

   return {
      ensureTempDir,
      requestWithProxy,
      downloadFile,
   };
}
exports.createUtilFunctions = createUtilFunctions;
