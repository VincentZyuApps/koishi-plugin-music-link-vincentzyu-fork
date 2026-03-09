"use strict";

 const fs = require('node:fs');
 const path = require('node:path');
 const { IMAGE_STYLE_MAP } = require('./config');

 /**
  * 音乐列表图片渲染模块
  * 用于生成歌曲列表的图片截图
  */

 // 模块级缓存
 const _fontCache = new Map();
 const _imageCache = new Map();
 const _pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));

 /**
  * 加载字体文件并缓存 base64
  */
 function loadFontBase64(fontConfigPath) {
     const fontPath = (fontConfigPath && fs.existsSync(fontConfigPath))
         ? fontConfigPath
         : path.join(__dirname, '..', 'assets', 'SourceHanSerifSC-Medium.otf');

     if (_fontCache.has(fontPath)) return _fontCache.get(fontPath);

     const result = { fontBase64: '', fontName: 'SourceHanSerifSC-Medium', fontPath };
     try {
         if (fs.existsSync(fontPath)) {
             const fontBuffer = fs.readFileSync(fontPath);
             result.fontBase64 = fontBuffer.toString('base64');
             result.fontName = path.basename(fontPath, path.extname(fontPath));
         }
     } catch (error) {
         console.error('读取字体文件失败:', error, '路径:', fontPath);
     }

     _fontCache.set(fontPath, result);
     return result;
 }

 /**
  * 加载背景图片并缓存 base64
  */
 function loadImageBase64(imagePath) {
     if (!imagePath || !fs.existsSync(imagePath)) return { base64: '', format: 'jpeg' };

     if (_imageCache.has(imagePath)) return _imageCache.get(imagePath);

     const result = { base64: '', format: 'jpeg' };
     try {
         const imageBuffer = fs.readFileSync(imagePath);
         result.base64 = imageBuffer.toString('base64');
         const ext = path.extname(imagePath).toLowerCase();
         if (ext === '.png') result.format = 'png';
         else if (ext === '.webp') result.format = 'webp';
         else if (ext === '.gif') result.format = 'gif';
     } catch (error) {
         console.error('读取背景图片失败:', error);
     }

     _imageCache.set(imagePath, result);
     return result;
 }

 /**
  * 生成原始黑白样式的HTML内容
  * @param {string} listText - 歌曲列表HTML文本
  * @param {Object} config - 配置对象
  * @returns {string} HTML内容
  */
 function generateOriginBlackWhiteHtml(listText, config) {
     const textBrightness = config.darkMode ? 255 : 0;
     const backgroundBrightness = config.darkMode ? 0 : 255;
     const textColor = `rgb(${textBrightness},${textBrightness},${textBrightness})`;
     const backgroundColor = `rgb(${backgroundBrightness},${backgroundBrightness},${backgroundBrightness})`;
     
     // 加载字体（带缓存）
     const { fontBase64, fontName } = loadFontBase64(config.textFontPath);
     const fontFamilyDeclaration = fontBase64
         ? `@font-face{font-family:'${fontName}';src:url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}`
         : '';
     const fontFamilyStyle = fontBase64 ? `'${fontName}', ` : '';
     
     // 匹配并修改歌曲序号格式
     const formattedListText = listText.replace(/(\d+)\./g, (match, p1) => {
         const number = parseInt(p1, 10);
         return `<b style="font-size: 1.3em; font-weight: bold;">${number.toString().padStart(2, '0')}.</b>`;
     });

     return `
 <!DOCTYPE html>
 <html lang="zh">
 <head>
 <title>music</title>
 <meta charset="UTF-8" />
 <meta name="viewport" content="width=device-width, initial-scale=1.0" />
 <style>
 ${fontFamilyDeclaration}
 body {
 margin: 0;
 font-family: ${fontFamilyStyle}PingFang SC, Hiragino Sans GB, Microsoft YaHei, SimSun, sans-serif;
 font-size: 16px;
 background: ${backgroundColor};
 color: ${textColor};
 }
 #song-list {
 padding: 5px;
 display: inline-block;
 max-width: fit-content;
 white-space: pre-wrap;
 word-break: break-word;
 }
 </style>
 </head>
 <body>
 <div id="song-list">${formattedListText}</div>
 </body>
 </html>
 `;
 }

 /**
  * 生成现代思源宋体样式的HTML内容
  * @param {string} listText - 歌曲列表HTML文本
  * @param {Object} config - 配置对象
  * @returns {string} HTML内容
  */
 function generateModernSourceHansSerifHtml(listText, config) {
     const version = _pkg.version;
     const repositoryUrl = _pkg.repository?.url || '';
      
     // 生成当前时间戳
     const now = new Date();
     const timestamp = now.getFullYear().toString() +
         (now.getMonth() + 1).toString().padStart(2, '0') +
         now.getDate().toString().padStart(2, '0') + '-' +
         now.getHours().toString().padStart(2, '0') +
         now.getMinutes().toString().padStart(2, '0') +
         now.getSeconds().toString().padStart(2, '0');
      
     // 加载字体（带缓存）
     const { fontBase64, fontName } = loadFontBase64(config.textFontPath);

     // 加载背景图片（带缓存）
     const { base64: backgroundImageBase64, format: imageFormat } = loadImageBase64(config.backgroundImagePath);
      
     const backgroundStyle = backgroundImageBase64
         ? `background-image: url(data:image/${imageFormat};base64,${backgroundImageBase64});`
         : `background-color: #f0f2f5;`;

     // 匹配并修改歌曲序号格式
     const formattedListText = listText.replace(/(\d+)\./g, (match, p1) => {
         const number = parseInt(p1, 10);
         return `<b style="font-size: 1.5em; font-weight: bold;">${number.toString().padStart(2, '0')}.</b>`;
     });
      
     return `
 <!DOCTYPE html>
 <html lang="zh">
 <head>
 <title>music</title>
 <meta charset="UTF-8" />
 <meta name="viewport" content="width=device-width, initial-scale=1.0" />
 <style>
 ${fontBase64 ? `@font-face{font-family:'${fontName}';src:url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}` : ''}
 body {
     font-family: ${fontBase64 ? `'${fontName}',` : ''} -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
     margin: 0;
     padding: 13vh 3vw 3vh 3vw; /* 增大四周空隙到8% */
     background-size: cover;
     background-position: center center;
     background-repeat: no-repeat;
     position: relative;
     box-sizing: border-box;
     display: flex;
     justify-content: center;
     align-items: flex-start;
     perspective: 1000px; /* 添加透视效果 */
     ${backgroundStyle}
 }
 .card {
     background: rgba(255, 255, 255, 0.13);
     backdrop-filter: blur(9px) saturate(200%);
     -webkit-backdrop-filter: blur(9px) saturate(200%);
     border-radius: 32px;
     box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3),
                 0 0 0 1px rgba(255, 255, 255, 0.5),
                 inset 0 0 20px rgba(255, 255, 255, 0.5);
     padding: 3vh 3vw; /* 增加卡片内部间距 */
     margin: 0 auto;
     height: auto;
     box-sizing: border-box;
     border: 1px solid rgba(255, 255, 255, 0.3);
     color: #212121;
     position: relative;
     z-index: 2;
     overflow: visible;
     transform: perspective(1000px) rotateX(-0deg) rotateY(0deg) translateY(0px); /* 添加倾斜透视效果，顶部更大底部更小 */
     transform-origin: center center; /* 以矩形几何中心（对角线交点）为变换原点 */
     transition: transform 0.3s ease; /* 平滑过渡效果 */
 }
 #song-list {
     max-width: fit-content;
     font-size: 27px;
     font-weight: 600;
     line-height: 1.09;
     color: #212121;
     text-shadow: 1.3px 1.3px 0.9px rgba(255, 255, 255, 0.9);
     white-space: no-wrap;
     word-break: break-word;
 }
 .version-info {
     position: fixed;
     top: 1.3px;
     left: 1.3px;
     font-size: 13px;
     line-height: 1.3;
     color: rgba(10, 10, 10, 0.8);
     text-align: left;
     z-index: 1000;
     pointer-events: none;
     font-family: monospace;
     text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
     font-weight: 900;
 }
 ${config.darkMode ? `
 body.dark .card {
     background: rgba(0, 0, 0, 0.7);
     backdrop-filter: blur(9px) saturate(250%); /* 增加模糊和饱和度，增强磨砂质感 */
     -webkit-backdrop-filter: blur(9px) saturate(250%); /* 增加模糊和饱和度，增强磨砂质感 */
     border: 1px solid rgba(70, 70, 70, 0.6);
     color: #f0f0f0;
     box-shadow: 0 20px 60px rgba(0, 0, 0, 0.95), /* 保持原有阴影 */
                 0 0 0 1px rgba(70, 70, 70, 0.4), /* 保持原有内嵌描边 */
                 inset 0 0 20px rgba(255, 255, 255, 0.2); /* 新增发光内阴影 */
 }
 body.dark #song-list {
     color: #f0f0f0;
     text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
 }
 body.dark .version-info {
     color: rgba(180, 180, 180, 0.8);
     text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
 }
 ` : ''}
 </style>
 </head>
 <body${config.darkMode ? ' class="dark"' : ''}>
     <div class="card">
         <div id="song-list">${formattedListText}</div>
     </div>
     <div class="version-info">
         <div>generated by koishi plugin: music-link-vincentzyu-fork</div>
         <div>version: \t ${version}</div>
         <div>date_time: \t ${timestamp}</div>
         <div>repo_url: \t ${repositoryUrl}</div>
     </div>
 </body>
 </html>
 `;
 }

 /**
  * 生成扁平现代样式的HTML内容
  * @param {string} listText - 歌曲列表HTML文本
  * @param {Object} config - 配置对象
  * @returns {string} HTML内容
  */
 function generateFlatModernHtml(listText, config) {
     const version = _pkg.version;
     const repositoryUrl = _pkg.repository?.url || '';
     
     // 生成当前时间戳
     const now = new Date();
     const timestamp = now.getFullYear().toString() +
         (now.getMonth() + 1).toString().padStart(2, '0') +
         now.getDate().toString().padStart(2, '0') + '-' +
         now.getHours().toString().padStart(2, '0') +
         now.getMinutes().toString().padStart(2, '0') +
         now.getSeconds().toString().padStart(2, '0');
     
     // 加载字体（带缓存）
     const { fontBase64, fontName } = loadFontBase64(config.textFontPath);
     
     // 扁平化样式的颜色方案 - 参考文楷字体风格
     const lightColors = {
         background: '#fefefe',           // 极淡的米白色背景
         cardBackground: '#ffffff',       // 纯白卡片背景
         primary: '#2d3748',              // 深灰蓝色文字
         secondary: '#4299e1',            // 温和的蓝色
         accent: '#38b2ac',               // 青绿色强调
         tertiary: '#718096',             // 中性灰色
         border: '#e2e8f0',               // 浅灰边框
         shadow: 'rgba(45, 55, 72, 0.08)', // 温和阴影
         titleBg: '#f7fafc'               // 标题背景
     };
     
     const darkColors = {
         background: '#1a202c',           // 深蓝灰背景
         cardBackground: '#2d3748',       // 深灰卡片
         primary: '#f7fafc',              // 浅色文字
         secondary: '#63b3ed',            // 亮蓝色
         accent: '#4fd1c7',               // 亮青色
         tertiary: '#a0aec0',             // 中性浅灰
         border: '#4a5568',               // 深灰边框
         shadow: 'rgba(0, 0, 0, 0.25)',   // 深色阴影
         titleBg: '#4a5568'               // 深色标题背景
     };
     
     const colors = config.darkMode ? darkColors : lightColors;
     
     // 匹配并修改歌曲序号格式
     const formattedListText = listText.replace(/(\d+)\./g, (match, p1) => {
         const number = parseInt(p1, 10);
         return `<span class="song-number">${number.toString().padStart(2, '0')}.</span>`;
     });
     
     return `
 <!DOCTYPE html>
 <html lang="zh">
 <head>
 <title>music</title>
 <meta charset="UTF-8" />
 <meta name="viewport" content="width=device-width, initial-scale=1.0" />
 <style>
 ${fontBase64 ? `@font-face{font-family:'${fontName}';src:url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}` : ''}
 * {
     margin: 0;
     padding: 0;
     box-sizing: border-box;
 }
 body {
     font-family: ${fontBase64 ? `'${fontName}',` : ''} -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
     background: ${colors.background};
     color: ${colors.primary};
     padding: 24px 8px 8px 8px;
     min-height: 100vh;
     display: flex;
     flex-direction: column;
     align-items: center;
     justify-content: flex-start;
     line-height: 1.6;
 }
 .page-title {
     background: ${colors.titleBg};
     color: ${colors.primary};
     padding: 16px 24px;
     border-radius: 12px;
     margin-bottom: 16px;
     font-size: 30px;
     font-weight: 600;
     text-align: center;
     border: 1px solid ${colors.border};
     box-shadow: 0 2px 8px ${colors.shadow};
     min-width: 200px;
 }
 .main-container {
     background: ${colors.cardBackground};
     border-radius: 16px;
     padding: 28px;
     box-shadow: 0 4px 20px ${colors.shadow}, 0 1px 3px rgba(0,0,0,0.05);
     border: 1px solid ${colors.border};
     max-width: 95%;
     width: 95%;
     position: relative;
 }
 .title {
     text-align: center;
     margin-bottom: 24px;
     font-size: 27px;
     font-weight: 700;
     color: ${colors.secondary};
 }
 #song-list {
     line-height: 1.3;
     font-size: 25px;
 }
 .song-number {
     display: inline-block;
     background: linear-gradient(135deg, ${colors.secondary}, ${colors.accent});
     color: white;
     padding: 2px 2px;
     border-radius: 6px;
     font-weight: 600;
     font-size: 18px;
     margin-right: 14px;
     min-width: 30px;
     text-align: center;
     box-shadow: 1px 2px 4px rgba(0,0,0,0.5);
 }
 .song-item {
     display: flex;
     align-items: center;
     padding: 18px 0;
     border-bottom: 1px solid ${colors.border};
     transition: background-color 0.2s ease;
 }
 .song-item:hover {
     background-color: ${colors.titleBg};
     border-radius: 8px;
     margin: 0 -8px;
     padding: 18px 8px;
 }
 .song-item:last-child {
     border-bottom: none;
 }
 .song-content {
     flex: 1;
     color: ${colors.primary};
     font-weight: 500;
 }
 .version-info {
     position: fixed;
     top: 12px;
     left: 12px;
     font-size: 10px;
     color: ${colors.tertiary};
     font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
     line-height: 1.4;
     opacity: 0.6;
     z-index: 1000;
     pointer-events: none;
     background: rgba(255, 255, 255, 0.8);
     padding: 6px 8px;
     border-radius: 6px;
     backdrop-filter: blur(10px);
     border: 1px solid ${colors.border};
 }
 </style>
 </head>
 <body>
     <div class="page-title">🎵 歌曲列表</div>
     <div class="main-container">
         <div id="song-list">${formattedListText}</div>
     </div>
     <div class="version-info">
         <div>generated by koishi plugin: music-link-vincentzyu-fork</div>
         <div>version: \t ${version}</div>
         <div>date_time: \t ${timestamp}</div>
         <div>repo_url: \t ${repositoryUrl}</div>
     </div>
 </body>
 </html>
 `;
 }

 /**
  * 生成歌曲列表图片
  * @param {Object} pptr - Puppeteer实例
  * @param {string} listText - 歌曲列表HTML文本
  * @param {Object} config - 配置对象，包含darkMode、imageStyle等设置
  * @param {Object} logger - 日志记录器
  * @param {string} imageStyle - 图片样式，可选值：ORIGIN_BLACK_WHITE, MODERN_SOURCE_HANS_SERIF, FLAT_MODERN
  * @returns {Promise<Buffer>} 图片二进制数据
  */
 async function generateSongListImage(pptr, listText, config, logger, imageStyle, songList) {
     let html;
     const style = imageStyle || config.imageStyle || IMAGE_STYLE_MAP.ORIGIN_BLACK_WHITE;
      
     switch (style) {
         case IMAGE_STYLE_MAP.MODERN_SOURCE_HANS_SERIF:
             html = generateModernSourceHansSerifHtml(listText, config);
             break;
         case IMAGE_STYLE_MAP.FLAT_MODERN:
             html = generateFlatModernHtml(listText, config);
             break;
         case IMAGE_STYLE_MAP.ORIGIN_BLACK_WHITE:
         default:
             html = generateOriginBlackWhiteHtml(listText, config);
             break;
     }
       
     const page = await pptr.browser.newPage();
     try {
     await page.setContent(html);

     let screenshot;
     let clipRect;

     switch (style) {
         case IMAGE_STYLE_MAP.ORIGIN_BLACK_WHITE:
             // 截图 #song-list 元素，并应用缩放
             clipRect = await page.evaluate(() => {
                 const songList = document.getElementById('song-list');
                 const rect = songList.getBoundingClientRect();
                 return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
             });
             screenshot = await page.screenshot({
                 clip: clipRect,
                 encoding: 'binary',
                 // 设置 deviceScaleFactor 替代 CSS 中的 transform
                 deviceScaleFactor: 1.3
             });
             break;

         case IMAGE_STYLE_MAP.MODERN_SOURCE_HANS_SERIF:
             // 截图 body 元素，因为 body 包含了 padding，可以提供留白
             clipRect = await page.evaluate(() => {
                 const body = document.querySelector('body');
                 const rect = body.getBoundingClientRect();
                 return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
             });

             screenshot = await page.screenshot({
                 clip: clipRect,
                 encoding: 'binary'
             });
             break;

         case IMAGE_STYLE_MAP.FLAT_MODERN:
             // 截图 body 元素，扁平化样式也使用全body截图
             clipRect = await page.evaluate(() => {
                 const body = document.querySelector('body');
                 const rect = body.getBoundingClientRect();
                 return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
             });

             screenshot = await page.screenshot({
                 clip: clipRect,
                 encoding: 'binary'
             });
             break;
          
         default:
             // 默认情况下，截取整个 body 的有效内容区域
             clipRect = await page.evaluate(() => {
                 const body = document.querySelector('body');
                 const rect = body.getBoundingClientRect();
                 return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
             });
             screenshot = await page.screenshot({
                 clip: clipRect,
                 encoding: 'binary'
             });
             break;
     }
      
     return screenshot;
     } finally {
         await page.close();
     }
 }

 /**
  * 日志信息记录函数
  * 支持两种调用方式：
  * 1. logInfo(message, message2, config, logger) - 新的方式
  * 2. logInfo(message, message2) - 兼容旧的调用方式（需要在apply函数中设置全局变量）
  * @param {string} message - 主要消息
  * @param {string} message2 - 可选的附加消息或null
  * @param {Object} config - 配置对象（可选）
  * @param {Object} logger - 日志记录器（可选）
  */
 function logInfo(message, message2, config, logger) {
     if (!config || !config.loggerinfo || !logger) return;
     if (message2) {
         logger.info(`${message}${message2}`);
     } else {
         logger.info(typeof message === 'string' ? message : JSON.stringify(message, null, 2));
     }
 }

 module.exports = {
     generateSongListImage,
     logInfo
 };