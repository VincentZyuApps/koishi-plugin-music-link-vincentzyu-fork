"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;
const { Logger, h } = require("koishi");
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const { generateSongListImage, generateSongListImagePuppeteer } = require('./render');
const { validateAssets, createUtilFunctions, safeUnlink, safeJsonParse, buildSongUrl } = require('./utils');

// 导入新模块
const { registerMiddleware } = require('./middleware');
const { registerCommand6 } = require('./command6');
const { registerCommand9 } = require('./command9');

// 从 config.js 导入配置
const {
   Config,
   usage,
   IMAGE_STYLE_MAP,
   platformMap,
   command6_return_data_Field_default,
   command9_return_data_Field_default,
   createNotifierInfo,
   createNotifierAssets,
} = require('./config');
exports.Config = Config;
exports.usage = usage;

const name = 'music-link';
const inject = {
   required: ['http', "i18n"],
   optional: ['puppeteer', 'notifier'],
};
const logger = new Logger('music-link');



function apply(ctx, config) {
   const cacheDir = path.join(__dirname, '..', 'cache');
   const cacheFiles = new Set();

    /**
     * 解析 renderMode 配置（支持新旧两种格式）
     * @returns {{useText: boolean, usePuppeteer: boolean, useSvg: boolean, useMarkdownTable: boolean, useMarkdownStyle: boolean, order: string[]}}
     */
    function parseRenderMode() {
       const renderMode = config.renderMode || [];
       
       // 兼容旧格式：['svg', 'text']
       if (Array.isArray(renderMode) && renderMode.length > 0 && typeof renderMode[0] === 'string') {
          return {
             useText: renderMode.includes('text'),
             usePuppeteer: renderMode.includes('puppeteer'),
             useSvg: renderMode.includes('svg'),
             useMarkdownTable: renderMode.includes('markdown_table'),
             useMarkdownStyle: renderMode.includes('markdown_style'),
             order: renderMode.filter(m => ['text', 'svg', 'puppeteer', 'markdown_table', 'markdown_style'].includes(m))
          };
       }
       
       // 新格式：[{mode: 'svg', enabled: true}, {mode: 'text', enabled: false}]
       const enabledModes = [];
       let useText = false;
       let usePuppeteer = false;
       let useSvg = false;
       let useMarkdownTable = false;
       let useMarkdownStyle = false;
       
       if (Array.isArray(renderMode)) {
          for (const item of renderMode) {
             if (item && item.mode && item.enabled) {
                enabledModes.push(item.mode);
                if (item.mode === 'text') useText = true;
                if (item.mode === 'puppeteer') usePuppeteer = true;
                if (item.mode === 'svg') useSvg = true;
                if (item.mode === 'markdown_table') useMarkdownTable = true;
                if (item.mode === 'markdown_style') useMarkdownStyle = true;
             }
          }
       }
       
       // 如果没有任何启用的，默认启用 SVG
       if (enabledModes.length === 0) {
          useSvg = true;
          enabledModes.push('svg');
       }
       
       return { useText, usePuppeteer, useSvg, useMarkdownTable, useMarkdownStyle, order: enabledModes };
    }

     // 启动时显示配置提示
    const { useText, usePuppeteer, useSvg, useMarkdownTable, useMarkdownStyle, order } = parseRenderMode();
    logger.info(`🎵 music-link 启动 - 当前渲染模式：${order.join(' → ') || '无'}`);
    logger.info(`⚡ 渲染模式：${config.strictOrderMode ? '严格顺序' : '并行'}模式`);
    
    let cmdInfo = '';
    if (config.serverSelect === 'command6' && config.command6) {
       cmdInfo = `/${config.command6} (网易云点歌)`;
       logger.info(`📋 指令名称: ${cmdInfo}`);
    } else if (config.serverSelect === 'command9' && config.command9) {
       cmdInfo = `/${config.command9} (落月api点歌)`;
       logger.info(`📋 指令名称: ${cmdInfo}`);
    }
    if (useText) {
       logger.info(`📝 纯文本模式已启用`);
    }
    if (usePuppeteer) {
       logger.info(`🎨 Puppeteer 渲染已启用 | 样式：${config.imageStyle} | 暗黑模式：${config.enablePuppeteerDarkMode}`);
    }
   if (useSvg) {
      logger.info(`✨ SVG 渲染已启用 | 暗黑模式：${config.enableSvgDarkMode ? '开启' : '关闭'} | 主题色：${config.svgThemeColor} | 缩放：${config.svgScale}x`);
   }

   // 使用 notifier 显示插件信息
   createNotifierInfo(ctx, config, { useText, usePuppeteer, useSvg, useMarkdownTable, useMarkdownStyle, order });

   // 本地日志函数（替代 global 全局变量，支持多实例）
   const logInfo = (msg, msg2 = null, _config, _logger) => {
      if (config && config.loggerinfo && logger) {
         if (msg2 !== null && msg2 !== undefined) {
            logger.info(`${msg}${msg2}`);
         } else {
            logger.info(msg);
         }
      }
   };

   // 创建工具函数集合
   const { ensureCacheDir, requestWithProxy, downloadFile, sendMusicCard } = createUtilFunctions({
      ctx,
      config,
      logger,
      logInfo,
      cacheDir,
   });

   /**
    * 智能 GET 请求（自动处理 command6 的代理配置）
    */
   const smartGet = async (targetUrl) => {
      if (config.command6_useProxy) {
         return await requestWithProxy(targetUrl);
      }
      return await ctx.http.get(targetUrl, { responseType: 'text' });
   };

   /**
    * 获取网易云歌词
    */
   const fetchNeteaseLyric = async (songId) => {
      try {
         const lyricApiUrl = `https://music.163.com/api/song/lyric?id=${songId}&lv=1&kv=1&tv=-1`;
         const lyricResponse = await smartGet(lyricApiUrl);
         const parsed = safeJsonParse(lyricResponse);
         if (parsed && parsed.code === 200 && parsed.lrc && parsed.lrc.lyric) {
            return `\n${parsed.lrc.lyric}`;
         }
         ctx.logger.error(`获取歌词失败: ${lyricApiUrl}，返回代码: ${parsed?.code}`);
      } catch (error) {
         ctx.logger.error(`获取歌词失败:`, error);
      }
      return '歌词获取失败';
   };

   /**
    * 生成响应消息
    */
   async function generateResponse(session, data, platformconfig, platform = '') {
      // 按类型分类存储
      const textElements = [];
      const imageElements = [];
      const mediaElements = [];
      const fileElements = [];
      const rawElements = [];

      // 用于合并转发的内容
      const figureContentElements = []; // 存储 figure 内部的元素

      // 遍历配置项，根据类型收集元素
      for (const field of platformconfig) {
         if (!field.enable) continue;

         const value = data[field.data];
         if (!value) continue;

         let element = null;
         switch (field.type) {
            case 'text':
               let textValue = data[field.data];

               // 类型检查和默认值
               if (typeof textValue === 'string') {
                  if (config.isuppercase) {
                     // 使用正则表达式匹配 URL 中的域名部分
                     textValue = textValue.replace(/(https?:\/\/)([^/]+)/, (match, protocol, domain) => {
                        return `${protocol}${domain.toUpperCase()}`;
                     });
                  }
               } else {
                  // 如果 textValue 不是字符串，则使用空字符串作为默认值或进行其他处理
                  textValue = textValue ? String(textValue) : ''; // 转换为字符串或使用空字符串
                  // 或者，如果 textValue 为 null 或 undefined，则不进行任何操作
                  // textValue = '';
               }

               element = h.text(`${field.describe}：${textValue}`);
               textElements.push(element);
               break;

            case 'image':
               element = h.image(value);
               imageElements.push(element);
               break;
            case 'audio':
               element = h.audio(value);
               mediaElements.push(element);
               break;
            case 'video':
               element = h.video(value);
               mediaElements.push(element);
               break;
            case 'file':
               try {
                  // 传入完整的 data 对象和 platform 供文件名模板使用
                  const fileInfo = await downloadFile(value, data, platform);
                  if (fileInfo) {
                     // 确保文件名有正确的扩展名
                     let finalFilename = fileInfo.filename;
                     if (!finalFilename.includes('.')) {
                        // 根据 mimeType 补充扩展名
                        const extMap = {
                           'audio/mpeg': '.mp3',
                           'audio/mp4': '.m4a',
                           'audio/wav': '.wav',
                           'audio/flac': '.flac',
                           'audio/ogg': '.ogg',
                        };
                        finalFilename += extMap[fileInfo.mimeType] || '.mp3';
                     }
                     
                     // 根据配置选择文件传输模式
                     if (config.fileTransferMode === 'base64') {
                        // 使用 base64 模式，适用于跨设备传输
                        const dataUrl = `data:${fileInfo.mimeType};base64,${fileInfo.base64}`;
                        // 使用 title, filename, name 多个属性以兼容不同适配器
                        element = h.file(dataUrl, { title: finalFilename, filename: finalFilename, name: finalFilename });
                        logInfo(`使用 base64 模式发送文件: ${finalFilename}, mimeType: ${fileInfo.mimeType}`);
                     } else {
                        // 使用本地路径模式（默认）
                        // 同样需要传递文件名
                        element = h.file(url.pathToFileURL(fileInfo.localPath).href, { title: finalFilename, filename: finalFilename, name: finalFilename });
                        cacheFiles.add(fileInfo.localPath);

                        // 定时删除逻辑
                        if (config.deleteTempTime > 0) {
                           const localFilePath = fileInfo.localPath;
                           ctx.setTimeout(async () => {
                              await safeUnlink(localFilePath, 5, 1000, ctx.setTimeout).catch(() => { });
                              logInfo(`正在执行： cacheFiles.delete(${localFilePath})`);
                              cacheFiles.delete(localFilePath);
                           }, config.deleteTempTime * 1000);
                        }
                     }
                     logInfo(`文件名: ${finalFilename}`);
                     fileElements.push(element);
                  }
               } catch (error) {
                  logger.error('文件处理失败:', error);
               }
               break;
         }
         if (config.data_Field_Mode === 'raw' && element) {
            rawElements.push(element); // 'raw' 模式下，按配置顺序添加元素
         }
      }

      let responseElements = [];

      // 根据 data_Field_Mode 排序元素
      switch (config.data_Field_Mode) {
         case 'image':
            responseElements = [...imageElements, ...textElements, ...mediaElements, ...fileElements];
            break;
         case 'raw':
            responseElements = rawElements; // 严格按照配置顺序
            break;
         case 'text': // 默认模式
         default:
            responseElements = [...textElements, ...imageElements, ...mediaElements, ...fileElements];
            break;
      }

      // 如果启用了合并转发，处理文本和图片
      if (config.isfigure && (session.platform === "onebot" || session.platform === "red")) {
         logInfo(`使用合并转发，正在收集图片和文本。`);

         // 创建 figureContentElements
         for (const element of responseElements) {
            if (element.type === 'text' || element.type === 'image' || element.type === 'img') { // 图片是 img 元素
               const attrs = {
                  userId: session.userId,
                  nickname: session.author?.nickname || session.username,
               };
               figureContentElements.push(h('message', attrs, element));
            }
         }

         // 创建 figure 元素
         const figureContent = h('figure', {
            children: figureContentElements
         });
         logInfo(`合并转发的内容：${JSON.stringify(figureContent, null, 2)}`);

         // 发送合并转发消息
         await session.send(figureContent);

         // 发送剩余的媒体和文件
         for (const element of responseElements) {
            if (element.type === 'audio' || element.type === 'video' || element.type === 'file') {
               await session.send(element);
            }
         }
         return; // 结束函数，不再返回字符串
      } else {
         // 如果没有启用合并转发，按顺序发送所有元素
         responseElements = responseElements.join('\n');
         logInfo(responseElements);
         return responseElements;
      }


   }

   /**
    * 渲染歌单
    */
   async function renderSongList(ctx, session, config, logger, options, songList, formattedList) {
      const exitCommands = config.exitCommand.split(/[,，]/).map(cmd => cmd.trim());
      const exitCommandTip = config.menuExitCommandTip ? `退出选择请发 [${exitCommands}] 中的任意内容<br /><br />` : '';
      let quoteId = session.messageId;

      // 检查 renderMode 配置
      const { useText, usePuppeteer, useSvg, useMarkdownTable, useMarkdownStyle, order } = parseRenderMode();

      // 检查是否至少启用了一种模式
      if (!useText && !usePuppeteer && !useSvg && !useMarkdownTable && !useMarkdownStyle) {
         return `${h.quote(session.messageId)}❌ 你没有勾选任何格式的歌单！请去 WebUI 渲染模式设置 勾选至少一个 renderMode`;
      }

      // 发送统一的渲染提示
      const waitTipMsgId = await session.send(`${h.quote(session.messageId)}🔄 正在生成歌单，请稍候⏳...`);

      // 并行渲染所有启用的模式
      const renderPromises = [];
      let textPayload = null;
      let imagePayload = null;

      // 准备艾特机器人的内容
      const atRobotText = "@机器人";
      const atRobotSegment = config.useRealAtRobot ? h.at(session.selfId) : atRobotText;
      
      // 准备文本内容
      if (useText) {
         // 先获取基础文本
         const waitTimeText = session.text(`.waitTime`, [config.waitTimeout, atRobotText]);
         // 构建消息段数组
         const messageSegments = [];
         if (config.enableReplySonglist) {
            messageSegments.push(h.quote(session.messageId));
         }
         messageSegments.push(h.text(`${formattedList}\n\n${exitCommandTip.replace(/<br \/>/g, '\n')}`));
         // 处理waitTime文本，替换@机器人为真实的艾特消息段
         if (config.useRealAtRobot && waitTimeText.includes(atRobotText)) {
            const parts = waitTimeText.split(atRobotText);
            for (let i = 0; i < parts.length; i++) {
               if (parts[i]) {
                  messageSegments.push(h.text(parts[i]));
               }
               if (i < parts.length - 1) {
                  messageSegments.push(atRobotSegment);
               }
            }
         } else {
            messageSegments.push(h.text(waitTimeText));
         }
         textPayload = messageSegments;
      }

      // 检查是否严格顺序模式
      const strictOrder = config.strictOrderMode || false;
      
      // 检查是否为 QQ 平台
      const isQQ = session.platform === 'qq';
      
       if (strictOrder) {
          // 严格顺序模式：按 text → markdown → svg → puppeteer 顺序执行
          if (useText) {
             const msg = await session.send(textPayload);
             quoteId = msg.at(-1);
          }
          
          // Markdown 表格模式（仅 QQ 平台）
          if (useMarkdownTable && isQQ) {
             const mdResult = await generateSongListImage(ctx.puppeteer, formattedList, config, logger, null, songList, options.mode).catch(() => null);
             if (mdResult && mdResult.isMarkdown) {
                try {
                   await session.bot.internal.sendMessage(session.channelId, {
                      msg_id: session.messageId,
                      msg_type: 2,
                      markdown: { content: mdResult.markdown }
                   });
                } catch (e) {
                   logger.error('发送 Markdown 表格失败:', e);
                }
             }
          }
          
          // Markdown 格式风格模式（仅 QQ 平台）
          if (useMarkdownStyle && isQQ) {
             const mdResult = await generateSongListImage(ctx.puppeteer, formattedList, config, logger, null, songList, options.mode).catch(() => null);
             if (mdResult && mdResult.isMarkdown) {
                try {
                   await session.bot.internal.sendMessage(session.channelId, {
                      msg_id: session.messageId,
                      msg_type: 2,
                      markdown: { content: mdResult.markdown }
                   });
                } catch (e) {
                   logger.error('发送 Markdown 格式风格失败:', e);
                }
             }
          }
          
          if (useSvg) {
            const imageStyle = options.image_style ? IMAGE_STYLE_MAP[Object.keys(IMAGE_STYLE_MAP)[options.image_style - 1]] : config.imageStyle;
            const svgResult = await generateSongListImage(ctx.puppeteer, formattedList, config, logger, imageStyle, songList, options.mode).catch(() => null);
            if (svgResult && svgResult.isSvg) {
               const imagePayloadParts = [
                  ...(config.enableReplySonglist ? [h.quote(session.messageId)] : []),
                  h.image(svgResult.buffer, 'image/png'),
               ];
               if (svgResult.renderInfo) {
                  imagePayloadParts.push(h.text(`\n${svgResult.renderInfo}`));
               }
               // 处理waitTime文本，替换@机器人为真实的艾特消息段
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
               const msg = await session.send(imagePayloadParts);
               quoteId = msg.at(-1);
            }
         }
         
         if (usePuppeteer) {
            const imageStyle = options.image_style ? IMAGE_STYLE_MAP[Object.keys(IMAGE_STYLE_MAP)[options.image_style - 1]] : config.imageStyle;
            const pptrResult = await generateSongListImagePuppeteer(ctx.puppeteer, formattedList, config, logger, imageStyle).catch(() => null);
            if (pptrResult && !pptrResult.isSvg) {
               const imagePayloadParts = [
                  ...(config.enableReplySonglist ? [h.quote(session.messageId)] : []),
                  h.image(pptrResult.buffer, 'image/png'),
               ];
               if (pptrResult.renderInfo) {
                  imagePayloadParts.push(h.text(`\n${pptrResult.renderInfo}`));
               }
               // 处理waitTime文本，替换@机器人为真实的艾特消息段
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
               const msg = await session.send(imagePayloadParts);
               quoteId = msg.at(-1);
            }
         }
      } else {
         // 并行模式：同时渲染所有启用的模式
         const renderResults = [];
         let markdownResult = null;
         
         // Markdown 渲染（仅 QQ 平台，并行执行）
         if ((useMarkdownTable || useMarkdownStyle) && isQQ) {
            renderPromises.push(
               generateSongListImage(ctx.puppeteer, formattedList, config, logger, null, songList, options.mode).then(result => {
                  if (result && result.isMarkdown) {
                     markdownResult = result;
                  }
               }).catch(() => {})
            );
         }
         
         if (useSvg) {
            const imageStyle = options.image_style ? IMAGE_STYLE_MAP[Object.keys(IMAGE_STYLE_MAP)[options.image_style - 1]] : config.imageStyle;
            renderPromises.push(
               generateSongListImage(ctx.puppeteer, formattedList, config, logger, imageStyle, songList, options.mode).then(result => {
                  if (result && result.isSvg) {
                     renderResults.push(result);
                  }
               }).catch(() => {})
            );
         }
         
         if (usePuppeteer) {
            const imageStyle = options.image_style ? IMAGE_STYLE_MAP[Object.keys(IMAGE_STYLE_MAP)[options.image_style - 1]] : config.imageStyle;
            renderPromises.push(
               generateSongListImagePuppeteer(ctx.puppeteer, formattedList, config, logger, imageStyle).then(result => {
                  if (result && !result.isSvg) {
                     renderResults.push(result);
                  }
               }).catch(() => {})
            );
         }
         
         // 等待所有渲染完成
         if (renderPromises.length > 0) {
            await Promise.all(renderPromises);
         }
         
         // 撤回渲染提示
         try {
            await session.bot.deleteMessage(session.guildId, String(waitTipMsgId));
         } catch (error) {
            logger.warn('撤回渲染提示消息失败:', error);
         }
         
         // 按顺序发送所有启用的输出（先文本，后图片）
         if (textPayload) {
            const msg = await session.send(textPayload);
            quoteId = msg.at(-1);
         }
         
         // 发送 Markdown 内容（仅 QQ 平台）
         if (markdownResult && markdownResult.markdown && isQQ) {
            try {
               await session.bot.internal.sendMessage(session.channelId, {
                  msg_id: session.messageId,
                  msg_type: 2,
                  markdown: { content: markdownResult.markdown }
               });
            } catch (e) {
               logger.error('发送 Markdown 失败:', e);
            }
         }
         
         // 发送所有渲染好的图片
         for (const result of renderResults) {
            const imagePayloadParts = [
               ...(config.enableReplySonglist ? [h.quote(session.messageId)] : []),
               h.image(result.buffer, 'image/png'),
            ];
            
            // 如果有渲染信息，添加到图片后面
            if (result.renderInfo) {
               imagePayloadParts.push(h.text(`\n${result.renderInfo}`));
            }
            
            // 添加退出提示和等待时间
            // 处理waitTime文本，替换@机器人为真实的艾特消息段
            const waitTimeText = session.text(`.waitTime`, [config.waitTimeout, atRobotText]);
            if (config.useRealAtRobot && waitTimeText.includes(atRobotText)) {
               const parts = waitTimeText.split(atRobotText);
               for (let i = 0; i < parts.length; i++) {
                  if (parts[i]) {
                     imagePayloadParts.push(h.text(`${i === 0 ? exitCommandTip.replaceAll('<br />', '\n') : ''}${parts[i]}`));
                  }
                  if (i < parts.length - 1) {
                     imagePayloadParts.push(atRobotSegment);
                  }
               }
            } else {
               imagePayloadParts.push(h.text(`${exitCommandTip.replaceAll('<br />', '\n')}${waitTimeText}`));
            }
            
            const msg = await session.send(imagePayloadParts);
            quoteId = msg.at(-1);
         }
      }

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
      const downloadStatus = await validateAssets(ctx, logger);

      // 使用 notifier 显示资源文件下载状态
      createNotifierAssets(ctx, downloadStatus);

      ctx.i18n.define("zh-CN", {
         commands: {
            [config.command6]: {
               description: `🎵 网易云点歌`,
               messages: {
                  "nopuppeteer": "🚫 没有开启puppeteer服务",
                  "nokeyword": `🎶 请输入网易云歌曲的 名称 或 ID。\n➣示例：/${config.command6} 蔚蓝档案\n➣示例：/${config.command6} 2608813264`,
                  "invalidNumber": "❌ 序号输入错误，已退出歌曲选择。",
                  "waitTime": "⏰ 请在{0}秒内，\n输入歌曲对应的序号:\n➣示例：{1} 1",
                  "waitTimeout": "⌛ 输入超时，已取消点歌。",
                  "exitprompt": "👋 已退出歌曲选择。",
                  "noplatform": "😢 获取歌曲失败。",
                  "somerror": "⚡ 解析歌曲详情时发生错误",
                  "songlisterror": "📋 无法获取歌曲列表，请稍后再试。",
                  "maxsongDuration": "⏱️ 歌曲持续时间超出限制，允许的单曲最大时长为 {0} 秒。",
               }
            },
            [config.command9]: {
               description: `🌙 落月点歌（支持网易云和QQ音乐）`,
               messages: {
                  "nokeyword": `🎶 请输入歌曲的 名称 或 ID。\n➣示例：/${config.command9} 蔚蓝档案\n➣示例：/${config.command9} 2608813264`,
                  "invalidNumber": "❌ 序号输入错误，已退出歌曲选择。",
                  "waitTime": "⏰ 请在{0}秒内，\n输入歌曲对应的序号:\n➣示例：{1} 1",
                  "waitTimeout": "⌛ 输入超时，已取消点歌。",
                  "exitprompt": "👋 已退出歌曲选择。",
                  "somerror": "⚡ 解析歌曲详情时发生错误",
                  "songlisterror": "📋 无法获取歌曲列表，请稍后再试。",
                  "maxsongDuration": "⏱️ 歌曲持续时间超出限制，允许的单曲最大时长为 {0} 秒。",
               }
            },
         }
      });

      // 创建共享函数对象
      const sharedFunctions = {
         parseRenderMode,
         smartGet,
         fetchNeteaseLyric,
         generateResponse,
         renderSongList,
         sendMusicCard
      };

      // 注册中间件
      registerMiddleware(ctx, config, logger, logInfo);

      // 注册网易云点歌指令
      registerCommand6(ctx, config, logger, logInfo, sharedFunctions);

      // 注册落月点歌指令
      registerCommand9(ctx, config, logger, logInfo, sharedFunctions);
   });
}

exports.apply = apply;
exports.Config = Config;
exports.name = name;
exports.usage = usage;
exports.inject = inject;
exports.reusable = true;