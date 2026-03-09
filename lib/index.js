"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;
const { Logger, h } = require("koishi");
const fs = require('node:fs/promises');
const path = require('node:path');
const url = require('node:url');
const { generateSongListImage } = require('./render');
const { validateAssets, createUtilFunctions, safeUnlink } = require('./utils');

// 从 config.js 导入配置
const {
   Config,
   usage,
   IMAGE_STYLE_MAP,
   platformMap,
   command6_return_data_Field_default,
   command9_return_data_Field_default
} = require('./config');
exports.Config = Config;
exports.usage = usage;

const name = 'music-link';
const inject = {
   required: ['http', "i18n"],
   optional: ['puppeteer'],
};
const logger = new Logger('music-link');

// ============ 辅助函数 ============

/**
 * 安全的 JSON 解析（兼容已解析对象和字符串）
 */
function safeJsonParse(data) {
   if (typeof data === 'object' && data !== null) return data;
   try { return JSON.parse(data); } catch (e) { return null; }
}

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

function apply(ctx, config) {
   const tempDir = path.join(__dirname, 'temp');
   const tempFiles = new Set();

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
   const { ensureTempDir, requestWithProxy, downloadFile } = createUtilFunctions({
      ctx,
      config,
      logger,
      logInfo,
      tempDir,
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

   ctx.on('ready', async () => {
      // 验证并下载字体文件
      await validateAssets(ctx, logger);

      ctx.i18n.define("zh-CN", {
         commands: {
            [config.command6]: {
               description: `网易云点歌`,
               messages: {
                  "nopuppeteer": "没有开启puppeteer服务",
                  "nokeyword": `请输入网易云歌曲的 名称 或 ID。\n➣示例：/${config.command6} 蔚蓝档案\n➣示例：/${config.command6} 2608813264`,
                  "invalidNumber": "序号输入错误，已退出歌曲选择。",
                  "waitTime": "请在{0}秒内，\n输入歌曲对应的序号:\n➣示例：@机器人 1",
                  "waitTimeout": "输入超时，已取消点歌。",
                  "exitprompt": "已退出歌曲选择。",
                  "noplatform": "获取歌曲失败。",
                  "somerror": "解析歌曲详情时发生错误",
                  "songlisterror": "无法获取歌曲列表，请稍后再试。",
                  "maxsongDuration": "歌曲持续时间超出限制，允许的单曲最大时长为 {0} 秒。",
               }
            },
            [config.command9]: {
               description: `落月点歌（支持网易云和QQ音乐）`,
               messages: {
                  "nokeyword": `请输入歌曲的 名称 或 ID。\n➣示例：/${config.command9} 蔚蓝档案\n➣示例：/${config.command9} 2608813264`,
                  "invalidNumber": "序号输入错误，已退出歌曲选择。",
                  "waitTime": "请在{0}秒内，\n输入歌曲对应的序号:\n➣示例：@机器人 1",
                  "waitTimeout": "输入超时，已取消点歌。",
                  "exitprompt": "已退出歌曲选择。",
                  "somerror": "解析歌曲详情时发生错误",
                  "songlisterror": "无法获取歌曲列表，请稍后再试。",
                  "maxsongDuration": "歌曲持续时间超出限制，允许的单曲最大时长为 {0} 秒。",
               }
            },
         }
      });

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
                     logInfo(JSON.stringify(jsonData, null, 2), null, config, logger);


                     // 检查是否存在 musicMeta 和 tag
                     const musicMeta = jsonData?.meta?.music || jsonData?.meta?.news; // 尝试兼容两种结构
                     const tag = musicMeta?.tag;
                     if (musicMeta && tag.includes("音乐")) {

                        const title = musicMeta.title;
                        const desc = musicMeta.desc;
                        logInfo("↡--------------中间件解析--------------↡", null, config, logger);
                        logInfo(tag, null, config, logger);
                        logInfo(title, null, config, logger);
                        logInfo(desc, null, config, logger);
                        logInfo("↟--------------中间件解析--------------↟", null, config, logger);
                        // 获取配置的指令名称
                        let command = config.serverSelect;
                        let commandName = config[command]; // 直接使用 config[command] 获取配置项的值
                        logInfo(commandName, null, config, logger);
                        if (!commandName) {
                           commandName = '歌曲搜索'; // 默认值，以防配置项不存在
                           logger.error(`未找到配置项 ${command} 对应的指令名称，使用默认指令名称 '歌曲搜索'`);
                        }

                        // 如果选择了 command6 并且是网易云音乐卡片
                        if (command === 'command6' && tag === '网易云音乐') {
                           // 直接提取歌曲 ID
                           const jumpUrl = musicMeta.jumpUrl;
                           const match = jumpUrl?.match(/id=(\d+)/); // 使用 ?. 确保 jumpUrl 不为 null 或 undefined
                           if (match && match[1]) {
                              const songId = match[1];
                              logInfo(`提取到网易云音乐 ID: ${songId}`, null, config, logger);

                              // 执行 command6 指令
                              await session.execute(`${commandName} ${songId}`);
                              return; // 结束当前中间件处理
                           } else {
                              logger.error('未能在 jumpUrl 中找到歌曲 ID');
                           }
                        } else {
                           // 其他情况，按照原逻辑处理
                           let usedId = config.used_id;

                           if (command) {
                              // 更通用的获取指令名称方式
                              logInfo(`${commandName} -n ${usedId} “${title} ${desc}”`)
                              await session.execute(`${commandName} -n ${usedId} “${title} ${desc}”`);
                           }
                        }
                     }
                  }
               }
            } catch (error) {
               ctx.logger.error(error);
               await session.send('处理消息时出错。');
            }
            // 如果没有匹配到任何 json 数据，继续下一个中间件
            return next();
         }, config.enablePrependMiddleware);
      }

      if (config.serverSelect === "command6") {
         ctx.command(`${config.command6} <keyword:text>`)
            .option('image_style', '-i, --image_style <image_style:number> 图片样式 (1=原始黑白, 2=现代思源宋体, 3=扁平现代)')
            .example("网易点歌 2608813264")
            .example("网易点歌 蔚蓝档案")
            .option('number', '-n <number:number> 歌曲序号')
            .option('skip', '-s, --skip 跳过歌单选择，直接返回第一首歌曲')
            .action(async ({ session, options }, keyword) => {
               if (!keyword) return h.text(session.text(`.nokeyword`));

               const isSongId = /^\d+$/.test(keyword.trim());
               const useApi = config.command6_usedAPI; // 获取用户选择的 API

               if (isSongId && !options.number) {
                  try {
                     // 获取歌曲直链 (根据选择的 API 调整)
                     const songUrl = buildSongUrl(useApi, keyword);
                     logInfo("请求 API (songUrl):", songUrl);
                     // 请求 163 API 获取歌曲详情 (用于获取歌曲名称、艺术家、图片等信息，与获取直链的 API 无关)
                     const apiBase = `http://music.163.com/api/song/detail/?id=${keyword}&ids=[${keyword}]`;
                     logInfo("请求 API (ID点歌):", apiBase);

                     const apiResponse = await smartGet(apiBase);
                     const parsedApiResponse = safeJsonParse(apiResponse);
                     if (!parsedApiResponse) {
                        ctx.logger.error("JSON 解析失败");
                        return h.text(session.text(`.songlisterror`));
                     }

                     if (!parsedApiResponse || parsedApiResponse.code !== 200 || !parsedApiResponse.songs || parsedApiResponse.songs.length === 0) {
                        return h.text(session.text(`.songlisterror`));
                     }

                     const songData = parsedApiResponse.songs[0];
                     if (!songData) {
                        ctx.logger.error('网易单曲点歌插件出错， 获取歌曲信息失败');
                        return h.text(session.text(`.songlisterror`));
                     }


                     const lyric = await fetchNeteaseLyric(keyword);

                     const processedSongData = {
                        name: songData.name,
                        artist: songData.artists.map(artist => artist.name).join('/'),
                        url: songUrl,
                        lrc: lyric,
                        pic: songData.album.picUrl,
                        id: songData.id,
                     };
                     logInfo(processedSongData);
                     const response = await generateResponse(session, processedSongData, config.command6_return_data_Field, 'netease');

                     // 发送 onebot 音乐卡片
                     if (config.command6_add_music_card && session.platform === "onebot") {
                        try {
                           const onebotBot = session.onebot || undefined;
                           if (onebotBot) {
                              logInfo(`command6, 即将发送onebot音乐卡片: id=${processedSongData.id}`);
                              await onebotBot._request('send_group_msg', {
                                 "group_id": session.channelId,
                                 "message": [{ "type": "music", "data": { "type": "163", "id": processedSongData.id } }]
                              });
                           }
                        } catch (error) {
                           ctx.logger.error('发送音乐卡片失败:', error);
                        }
                     }

                     return response;
                  } catch (error) {
                     ctx.logger.error('网易单曲点歌插件出错 (ID点歌):', error);
                     return h.text(session.text(`.somerror`));
                  }
               } else {
                  // 歌名搜索
                  try {
                     const searchApiUrl = `http://music.163.com/api/search/get/web?csrf_token=hlpretag=&hlposttag=&s=${encodeURIComponent(keyword)}&type=1&offset=0&total=true&limit=${config.command6_searchListLength}`;
                     logInfo("请求搜索 API:", searchApiUrl);

                     const searchApiResponse = await smartGet(searchApiUrl);
                     const parsedSearchApiResponse = safeJsonParse(searchApiResponse);
                     if (!parsedSearchApiResponse) {
                        ctx.logger.error("搜索结果 JSON 解析失败");
                        return h.text(session.text(`.songlisterror`));
                     }
                     const searchData = parsedSearchApiResponse.result;

                     ctx.logger.info(`searchData = ${JSON.stringify(searchData)}`);

                     if (!searchData || !searchData.songs || searchData.songs.length === 0) {
                        return h.text(session.text(`.songlisterror`));
                     }

                     const songList = searchData.songs.map((song, index) => {
                        return {
                           id: song.id,
                           name: song.name,
                           artists: song.artists.map(artist => artist.name).join('/'),
                           albumName: song.album.name,
                           duration: song.duration
                        };
                     });
                     let input = options.number;

                     // 如果启用了跳过歌单选择（配置项或命令参数），直接选择第一首歌曲
                     if ( (config.skipSongListSelection || options.skip) ) {
                        input = '1';
                     } else if (!options.number) {
                        // ctx.logger.info(`songList = ${JSON.stringify(songList)}`);
                        const formattedList = songList.map((song, index) => `${index + 1}. ${song.name} - ${song.artists} - ${song.albumName}`).join('<br />');
                        const exitCommands = config.exitCommand.split(/[,，]/).map(cmd => cmd.trim());
                        const exitCommandTip = config.menuExitCommandTip ? `退出选择请发[${exitCommands}]中的任意内容<br /><br />` : '';
                        let quoteId = session.messageId;

                        if (config.imageMode) {
                           const imageStyle = options.image_style ? IMAGE_STYLE_MAP[Object.keys(IMAGE_STYLE_MAP)[options.image_style - 1]] : config.imageStyle;
                           const imageBuffer = await generateSongListImage(ctx.puppeteer, formattedList, config, logger, imageStyle, undefined);
                           const payload = [
                              ...(config.enableReplySonglist ? [h.quote(session.messageId)] : []),
                              h.image(imageBuffer, 'image/png'),
                              h.text(`${exitCommandTip.replaceAll('<br />', '\n')}${h.text(session.text(`.waitTime`, [config.waitTimeout]))}`),
                           ];
                           const msg = await session.send(payload);
                           quoteId = msg.at(-1);
                        } else {
                           const msg = await session.send(`${config.enableReplySonglist ? h.quote(session.messageId) : ""}${formattedList}<br /><br />${exitCommandTip}${h.text(session.text(`.waitTime`, [config.waitTimeout]))}`);
                           quoteId = msg.at(-1);
                        }

                        input = await session.prompt(config.waitTimeout * 1000);
                        if (!input) {
                           return `${quoteId ? h.quote(quoteId) : ''}${session.text(`.waitTimeout`)}`;
                        }
                        if (exitCommands.includes(input)) {
                           return h.text(session.text(`.exitprompt`));
                        }
                     }

                     const serialNumber = +input;
                     if (Number.isNaN(serialNumber) || serialNumber < 1 || serialNumber > songList.length) {
                        return h.text(session.text(`.invalidNumber`));
                     }

                     const selectedSongId = songList[serialNumber - 1].id;
                     const selectedinterval = songList[serialNumber - 1].duration / 1000; // selected 的 duration 秒数
                     logInfo("音乐时长：", selectedinterval)
                     if (selectedinterval > config.maxDuration) {
                        return h.text(session.text(`.maxsongDuration`, [config.maxDuration]));
                     }
                     // 获取歌曲详情 (用于获取歌曲名称、艺术家、图片等，与获取直链的 API 无关)
                     const detailApiUrl = `http://music.163.com/api/song/detail/?id=${selectedSongId}&ids=[${selectedSongId}]`;
                     logInfo("请求歌曲详情 API:", detailApiUrl);

                     const detailApiResponse = await smartGet(detailApiUrl);
                     const detailParsedApiResponse = safeJsonParse(detailApiResponse);

                     if (!detailParsedApiResponse || detailParsedApiResponse.code !== 200 || !detailParsedApiResponse.songs || detailParsedApiResponse.songs.length === 0) {
                        return h.text(session.text(`.songlisterror`));
                     }
                     const songData = detailParsedApiResponse.songs[0];


                     // 获取歌曲直链 (根据选择的 API 调整)
                     const songUrl = buildSongUrl(useApi, selectedSongId);

                     logInfo("请求 API (songUrl):", songUrl);

                     const lyric = await fetchNeteaseLyric(selectedSongId);

                     const processedSongData = {
                        name: songData.name,
                        artist: songData.artists.map(artist => artist.name).join('/'),
                        url: songUrl,
                        lrc: lyric,
                        pic: songData.album.picUrl,
                        id: songData.id,
                     };
                     logInfo(processedSongData)

                     const response = await generateResponse(session, processedSongData, config.command6_return_data_Field, 'netease');

                     // 发送 onebot 音乐卡片
                     if (config.command6_add_music_card && session.platform === "onebot") {
                        try {
                           const onebotBot = session.onebot || undefined;
                           if (onebotBot) {
                              logInfo(`command6, 即将发送onebot音乐卡片: id=${processedSongData.id}`);
                              await onebotBot._request('send_group_msg', {
                                 "group_id": session.channelId,
                                 "message": [{ "type": "music", "data": { "type": "163", "id": processedSongData.id } }]
                              });
                           }
                        } catch (error) {
                           ctx.logger.error('发送音乐卡片失败:', error);
                        }
                     }

                     return response;


                  } catch (error) {
                     ctx.logger.error('网易点歌插件出错 (歌名搜索):', error);
                     return h.text(session.text(`.somerror`));
                  }
               }
            });
      }

      // command9: 落月API
      if (config.serverSelect === "command9") {
         ctx.command(`${config.command9} <keyword:text>`)
            .option('image_style', '-i, --image_style <image_style:number> 图片样式 (1=原始黑白, 2=现代思源宋体, 3=扁平现代)')
            .example(`${config.command9} 蔚蓝档案`)
            .example(`${config.command9} 2608813264`)
            .option('number', '-n <number:number> 歌曲序号')
            .option('skip', '-s, --skip 跳过歌单选择，直接返回第一首歌曲')
            .action(async ({ session, options }, keyword) => {
               if (!keyword) return h.text(session.text(`.nokeyword`));

               const platform = config.command9_platform; // 'netease' 或 'tencent'
               const isSongId = /^\d+$/.test(keyword.trim());
               
               // 根据平台选择质量参数
               const quality = platform === 'netease' ? config.command9_quality : config.command9_quality_qq;

               if (isSongId && !options.number) {
                  // ID点歌模式
                  try {
                     const apiUrl = `${config.command9_luoyueApiBaseUrl}/v2/music/${platform}?id=${keyword}&quality=${quality}`;
                     logInfo("请求落月API (ID点歌):", apiUrl);

                     const apiResponse = await ctx.http.get(apiUrl);
                     logInfo("落月API响应:", JSON.stringify(apiResponse, null, 2));

                     if (!apiResponse || apiResponse.code !== 200 || !apiResponse.data) {
                        return h.text(session.text(`.songlisterror`));
                     }

                     const songData = apiResponse.data;
                     
                     // 获取歌词
                     let lyric = '歌词获取失败';
                     try {
                        const lyricApiUrl = `${config.command9_luoyueApiBaseUrl}/v2/music/${platform}/lyric?id=${keyword}`;
                        const lyricResponse = await ctx.http.get(lyricApiUrl);
                        if (lyricResponse.code === 200 && lyricResponse.data && lyricResponse.data.lrc) {
                           lyric = `\n${lyricResponse.data.lrc}`;
                        }
                     } catch (error) {
                        ctx.logger.error(`获取歌词失败:`, error);
                     }

                     // 处理歌曲时长
                     const durationMatch = songData.interval?.match(/(\d+)分(\d+)秒/);
                     let durationSeconds = 0;
                     if (durationMatch) {
                        durationSeconds = parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2]);
                     }

                     if (durationSeconds > config.command9_maxDuration) {
                        return h.text(session.text(`.maxsongDuration`, [config.command9_maxDuration]));
                     }

                     const processedSongData = {
                        name: songData.song || songData.name,
                        artist: songData.singer || songData.artist,
                        url: songData.url,
                        lrc: lyric,
                        pic: songData.cover || songData.pic,
                        id: songData.id,
                        album: songData.album,
                        quality: songData.quality,
                        size: songData.size,
                        kbps: songData.kbps,
                     };
                     
                     logInfo("处理后的歌曲数据:", processedSongData);

                     const response = await generateResponse(session, processedSongData, config.command9_return_data_Field, platform);
                     
                     // 发送音乐卡片
                     if (config.command9_add_music_card && session.platform === "onebot") {
                        try {
                           const onebotBot = (session.onebot) ? session.onebot : undefined;
                           if (platform === 'netease') {
                              // 网易云音乐使用官方卡片
                              const neteaseMusicCard = {
                                 "type": "music",
                                 "data": {
                                    "type": '163',
                                    "id": songData.id
                                 }
                              }
                              logInfo(`command9, 即将发送网易云 音乐卡片: ${JSON.stringify(neteaseMusicCard)}`)
                              onebotBot && await onebotBot._request('send_group_msg', {
                                 "group_id": session.channelId,
                                 "message": [ neteaseMusicCard ]
                              });
                           } else if (platform === 'tencent') {
                              // QQ音乐使用自定义卡片（因为腾讯服务器调整问题）
                              const qqMusicCard = {
                                 "type": "music",
                                 "data": {
                                    "type": "custom",
                                    "url": songData.link || `https://y.qq.com/n/ryqq/songDetail/${songData.mid || songData.id}`,
                                    "audio": songData.url,
                                    "title": songData.song || songData.name,
                                    "content": songData.singer || songData.artist,
                                    "image": songData.cover || songData.pic
                                 }
                              }
                              logInfo(`command9, 即将发送QQ 音乐卡片: ${JSON.stringify(qqMusicCard)}`)
                              onebotBot && await onebotBot._request('send_group_msg', {
                                 "group_id": session.channelId,
                                 "message": [ qqMusicCard ]
                              });
                           }
                        } catch (error) {
                           ctx.logger.error('发送音乐卡片失败:', error);
                        }
                     }
                     
                     return response;
                  } catch (error) {
                     ctx.logger.error('落月点歌插件出错 (ID点歌):', error);
                     return h.text(session.text(`.somerror`));
                  }
               } else {
                  // 歌名搜索模式
                  try {
                     let searchResults = [];
                     
                     // 聚合模式：同时从网易云和QQ音乐搜索
                     if (platform === 'aggregation') {
                        const halfLimit = Math.floor(config.command9_searchListLength / 2);
                        
                        logInfo(`聚合搜索开始: 关键词="${keyword}", 每平台数量=${halfLimit}, 网易云音质=${config.command9_quality}, QQ音质=${config.command9_quality_qq}`);
                        
                        // 网易云搜索函数（带降级重试）
                        const searchNetease = async (quality) => {
                           try {
                              const url = `${config.command9_luoyueApiBaseUrl}/v2/music/netease?word=${encodeURIComponent(keyword)}&num=${halfLimit}&quality=${quality}`;
                              logInfo(`请求网易云API: ${url}`);
                              const response = await ctx.http.get(url);
                              
                              if (response.code === 503 && quality > 4) {
                                 // 如果503且音质高于320k，尝试降级到320k
                                 logInfo(`网易云音质${quality}返回503，尝试降级到音质4(320k)`);
                                 return await searchNetease(4);
                              }
                              
                              return response;
                           } catch (err) {
                              ctx.logger.error('网易云搜索失败:', err);
                              return { code: 500, data: [], error: err.message };
                           }
                        };
                        
                        // 并行请求网易云和QQ音乐
                        const [neteaseResponse, tencentResponse] = await Promise.all([
                           searchNetease(config.command9_quality),
                           ctx.http.get(`${config.command9_luoyueApiBaseUrl}/v2/music/tencent?word=${encodeURIComponent(keyword)}&num=${halfLimit}&quality=${config.command9_quality_qq}`).catch(err => {
                              ctx.logger.error('QQ音乐搜索失败:', err);
                              return { code: 500, data: [], error: err.message };
                           })
                        ]);

                        logInfo("========== 网易云搜索响应 ==========");
                        logInfo(`响应码: ${neteaseResponse.code}`);
                        logInfo(`数据类型: ${Array.isArray(neteaseResponse.data) ? '数组' : typeof neteaseResponse.data}`);
                        if (neteaseResponse.code !== 200) {
                           logInfo(`错误信息: ${JSON.stringify(neteaseResponse)}`);
                        }
                        
                        logInfo("========== QQ音乐搜索响应 ==========");
                        logInfo(`响应码: ${tencentResponse.code}`);
                        logInfo(`数据类型: ${Array.isArray(tencentResponse.data) ? '数组' : typeof tencentResponse.data}`);

                        // 处理网易云结果
                        let neteaseResults = [];
                        if (neteaseResponse.code === 200 && neteaseResponse.data) {
                           neteaseResults = Array.isArray(neteaseResponse.data) ? neteaseResponse.data : [neteaseResponse.data];
                           logInfo(`网易云结果处理: 原始数据有 ${Array.isArray(neteaseResponse.data) ? neteaseResponse.data.length : 1} 项, 处理后 ${neteaseResults.length} 项`);
                        } else {
                           logInfo(`网易云结果处理: 响应码=${neteaseResponse.code}, data=${neteaseResponse.data}, 结果为空`);
                        }
                        
                        // 处理QQ音乐结果
                        let tencentResults = [];
                        if (tencentResponse.code === 200 && tencentResponse.data) {
                           tencentResults = Array.isArray(tencentResponse.data) ? tencentResponse.data : [tencentResponse.data];
                           logInfo(`QQ音乐结果处理: 原始数据有 ${Array.isArray(tencentResponse.data) ? tencentResponse.data.length : 1} 项, 处理后 ${tencentResults.length} 项`);
                        } else {
                           logInfo(`QQ音乐结果处理: 响应码=${tencentResponse.code}, data=${tencentResponse.data}, 结果为空`);
                        }

                        // 交替合并两个数组
                        const maxLength = Math.max(neteaseResults.length, tencentResults.length);
                        logInfo(`开始交替合并: 网易云${neteaseResults.length}首, QQ音乐${tencentResults.length}首, 最大长度${maxLength}`);
                        
                        for (let i = 0; i < maxLength; i++) {
                           if (i < neteaseResults.length) {
                              searchResults.push({
                                 ...neteaseResults[i],
                                 platform: 'netease',
                                 platformLabel: '[网易云]'
                              });
                              logInfo(`添加网易云歌曲 [${i}]: ${neteaseResults[i].song || neteaseResults[i].name}`);
                           }
                           if (i < tencentResults.length) {
                              searchResults.push({
                                 ...tencentResults[i],
                                 platform: 'tencent',
                                 platformLabel: '[Q Q 音]'
                              });
                              logInfo(`添加QQ音乐歌曲 [${i}]: ${tencentResults[i].song || tencentResults[i].name}`);
                           }
                        }

                        logInfo(`========== 聚合搜索完成 ==========`);
                        logInfo(`最终结果: 网易云 ${neteaseResults.length} 首, QQ音乐 ${tencentResults.length} 首, 总计 ${searchResults.length} 首`);

                     } else {
                        // 单平台搜索（原有逻辑）
                        const searchApiUrl = `${config.command9_luoyueApiBaseUrl}/v2/music/${platform}?word=${encodeURIComponent(keyword)}&num=${config.command9_searchListLength}&quality=${quality}`;
                        logInfo("请求落月API搜索:", searchApiUrl);

                        const searchApiResponse = await ctx.http.get(searchApiUrl);
                        logInfo("落月API搜索响应:", JSON.stringify(searchApiResponse, null, 2));

                        if (!searchApiResponse || searchApiResponse.code !== 200 || !searchApiResponse.data) {
                           return h.text(session.text(`.songlisterror`));
                        }

                        // 搜索返回的是数组
                        searchResults = Array.isArray(searchApiResponse.data) ? searchApiResponse.data : [searchApiResponse.data];
                        
                        // 添加平台标识（单平台时不需要显示）
                        searchResults = searchResults.map(song => ({
                           ...song,
                           platform: platform,
                           platformLabel: '' // 单平台搜索不显示标签
                        }));
                     }

                     if (searchResults.length === 0) {
                        return h.text(session.text(`.songlisterror`));
                     }

                     const songList = searchResults.map((song, index) => {
                        // 解析时长
                        const intervalMatch = song.interval?.match(/(\d+)分(\d+)秒/);
                        let duration = 0;
                        if (intervalMatch) {
                           duration = parseInt(intervalMatch[1]) * 60 + parseInt(intervalMatch[2]);
                        }
                        
                        return {
                           id: song.id,
                           mid: song.mid,
                           name: song.song || song.name,
                           artist: song.singer || song.artist,
                           album: song.album,
                           duration: duration * 1000, // 转换为毫秒
                           cover: song.cover,
                           url: song.url,
                           quality: song.quality,
                           size: song.size,
                           kbps: song.kbps,
                           platform: song.platform, // 保留平台信息
                           platformLabel: song.platformLabel || '', // 保留平台标签
                        };
                     });

                     let input = options.number;

                     // 如果启用了跳过歌单选择（配置项或命令参数），直接选择第一首歌曲
                     if ((config.skipSongListSelection || options.skip) && !options.number) {
                        input = '1';
                     } else if (!options.number) {
                        const formattedList = songList.map((song, index) => {
                           const albumInfo = song.album ? ` - ${song.album}` : '';
                           return `${song.platformLabel}${index + 1}. ${song.name} - ${song.artist}${albumInfo}`;
                        }).join('<br />');
                        
                        const exitCommands = config.exitCommand.split(/[,，]/).map(cmd => cmd.trim());
                        const exitCommandTip = config.menuExitCommandTip ? `退出选择请发[${exitCommands}]中的任意内容<br /><br />` : '';
                        let quoteId = session.messageId;

                        if (config.imageMode) {
                           const imageStyle = options.image_style ? IMAGE_STYLE_MAP[Object.keys(IMAGE_STYLE_MAP)[options.image_style - 1]] : config.imageStyle;
                           const imageBuffer = await generateSongListImage(ctx.puppeteer, formattedList, config, logger, imageStyle, undefined);
                           const payload = [
                              ...(config.enableReplySonglist ? [h.quote(session.messageId)] : []),
                              h.image(imageBuffer, 'image/png'),
                              h.text(`${exitCommandTip.replaceAll('<br />', '\n')}${h.text(session.text(`.waitTime`, [config.waitTimeout]))}`),
                           ];
                           const msg = await session.send(payload);
                           quoteId = msg.at(-1);
                        } else {
                           const msg = await session.send(`${config.enableReplySonglist ? h.quote(session.messageId) : ""}${formattedList}<br /><br />${exitCommandTip}${h.text(session.text(`.waitTime`, [config.waitTimeout]))}`);
                           quoteId = msg.at(-1);
                        }

                        input = await session.prompt(config.waitTimeout * 1000);
                        if (!input) {
                           return `${quoteId ? h.quote(quoteId) : ''}${session.text(`.waitTimeout`)}`;
                        }
                        if (exitCommands.includes(input)) {
                           return h.text(session.text(`.exitprompt`));
                        }
                     }

                     const serialNumber = +input;
                     if (Number.isNaN(serialNumber) || serialNumber < 1 || serialNumber > songList.length) {
                        return h.text(session.text(`.invalidNumber`));
                     }

                     const selectedSong = songList[serialNumber - 1];
                     const selectedDuration = selectedSong.duration / 1000; // 转换为秒

                     logInfo("选中歌曲时长：", selectedDuration);
                     if (selectedDuration > config.command9_maxDuration) {
                        return h.text(session.text(`.maxsongDuration`, [config.command9_maxDuration]));
                     }

                     // 如果没有URL，需要再次请求获取完整信息
                     let finalSongData = selectedSong;
                     // 使用歌曲实际平台（聚合模式下每首歌有自己的平台）
                     const actualPlatform = selectedSong.platform || platform;
                     const actualQuality = actualPlatform === 'tencent' ? config.command9_quality_qq : config.command9_quality;
                     
                     if (!selectedSong.url) {
                        const detailApiUrl = `${config.command9_luoyueApiBaseUrl}/v2/music/${actualPlatform}?${actualPlatform === 'tencent' && selectedSong.mid ? 'mid' : 'id'}=${selectedSong.mid || selectedSong.id}&quality=${actualQuality}`;
                        logInfo("请求歌曲详情:", detailApiUrl);
                        
                        const detailResponse = await ctx.http.get(detailApiUrl);
                        if (detailResponse.code === 200 && detailResponse.data) {
                           finalSongData = {
                              ...selectedSong,
                              url: detailResponse.data.url,
                              quality: detailResponse.data.quality,
                              size: detailResponse.data.size,
                              kbps: detailResponse.data.kbps,
                           };
                        }
                     }

                     // 获取歌词
                     let lyric = '歌词获取失败';
                     try {
                        const lyricApiUrl = `${config.command9_luoyueApiBaseUrl}/v2/music/${actualPlatform}/lyric?id=${finalSongData.id}`;
                        const lyricResponse = await ctx.http.get(lyricApiUrl);
                        if (lyricResponse.code === 200 && lyricResponse.data && lyricResponse.data.lrc) {
                           lyric = `\n${lyricResponse.data.lrc}`;
                        }
                     } catch (error) {
                        ctx.logger.error(`获取歌词失败:`, error);
                     }

                     const processedSongData = {
                        name: finalSongData.name,
                        artist: finalSongData.artist,
                        url: finalSongData.url,
                        lrc: lyric,
                        pic: finalSongData.cover,
                        id: finalSongData.id,
                        album: finalSongData.album,
                        quality: finalSongData.quality,
                        size: finalSongData.size,
                        kbps: finalSongData.kbps,
                     };

                     logInfo("处理后的歌曲数据:", processedSongData);

                     const response = await generateResponse(session, processedSongData, config.command9_return_data_Field, actualPlatform);
                     
                     // 发送音乐卡片
                     if (config.command9_add_music_card && session.platform === "onebot") {
                        try {
                           const onebotBot = ctx.bots.find(b => b.platform === "onebot");
                           if (onebotBot) {
                              // 使用歌曲实际平台（聚合模式下每首歌有自己的平台）
                              if (actualPlatform === 'netease') {
                                 // 网易云音乐使用官方卡片
                                 await onebotBot.internal._request('send_group_msg', {
                                    "group_id": session.channelId,
                                    "message": [{
                                       "type": "music",
                                       "data": {
                                          "type": '163',
                                          "id": finalSongData.id
                                       }
                                    }]
                                 });
                              } else if (actualPlatform === 'tencent') {
                                 // QQ音乐使用自定义卡片（因为腾讯服务器调整问题）
                                 await onebotBot.internal._request('send_group_msg', {
                                    "group_id": session.channelId,
                                    "message": [{
                                       "type": "music",
                                       "data": {
                                          "type": "custom",
                                          "url": `https://y.qq.com/n/ryqq/songDetail/${finalSongData.mid || finalSongData.id}`,
                                          "audio": finalSongData.url,
                                          "title": finalSongData.name,
                                          "content": finalSongData.artist,
                                          "image": finalSongData.cover
                                       }
                                    }]
                                 });
                              }
                           }
                        } catch (error) {
                           ctx.logger.error('发送音乐卡片失败:', error);
                        }
                     }
                     
                     return response;

                  } catch (error) {
                     ctx.logger.error('落月点歌插件出错 (歌名搜索):', error);
                     return h.text(session.text(`.somerror`));
                  }
               }
            });
      }


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
                           tempFiles.add(fileInfo.localPath);

                           // 定时删除逻辑
                           if (config.deleteTempTime > 0) {
                              const localFilePath = fileInfo.localPath;
                              ctx.setTimeout(async () => {
                                 await safeUnlink(localFilePath, 5, 1000, ctx.setTimeout).catch(() => { });
                                 logInfo(`正在执行： tempFiles.delete(${localFilePath})`)
                                 tempFiles.delete(localFilePath);
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
            responseElements = responseElements.join('\n')
            logInfo(responseElements);
            return responseElements;
         }


      }


   });

}
exports.apply = apply;
exports.Config = Config;
exports.name = name;
exports.usage = usage;
exports.inject = inject;
exports.reusable = true; // 声明可重用