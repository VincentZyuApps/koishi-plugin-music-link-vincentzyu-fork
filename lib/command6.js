"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommand6 = void 0;
const { h } = require("koishi");
const { generateSongListImage, generateSongListImagePuppeteer, loadTestSongList } = require('./render');
const { safeJsonParse, buildSongUrl } = require('./utils');

/**
 * 注册网易云点歌指令
 * @param {any} ctx - Koishi 上下文
 * @param {any} config - 配置对象
 * @param {any} logger - 日志对象
 * @param {Function} logInfo - 日志函数
 * @param {Object} sharedFunctions - 共享函数集合
 */
function registerCommand6(ctx, config, logger, logInfo, sharedFunctions) {
    const { parseRenderMode, smartGet, fetchNeteaseLyric, generateResponse, renderSongList, sendMusicCard } = sharedFunctions;
    
    if (config.serverSelect === "command6") {
        ctx.command(`${config.command6} <keyword:text>`)
            .option('image_style', '-i, --image_style <image_style:number> 图片样式 (1=原始黑白, 2=现代思源宋体, 3=扁平现代)')
            .example("网易点歌 2608813264")
            .example("网易点歌 蔚蓝档案")
            .option('number', '-n <number:number> 歌曲序号')
            .option('skip', '-s, --skip 跳过歌单选择，直接返回第一首歌曲')
            .option('mode', '-m, --mode <mode:string> 渲染模式 (light/dark/白天/黑夜)')
            .option('test', '-t, --test 使用测试数据（从 assets/songlist-test.json 读取，无需请求API）')
            .action(async ({ session, options }, keyword) => {
                // 如果启用了--test参数，直接显示测试歌单
                if (options.test) {
                    try {
                        const testData = await loadTestSongList(ctx, config, logInfo, 'netease');
                        if (!testData) {
                            ctx.logger.error('❌ 测试数据加载失败');
                            return '';
                        }
                        
                        const { songList, formattedList } = testData;
                        
                        // 在控制台和session输出提示信息
                        const testHintMsg = `🧪 [测试模式] 使用硬编码假数据展示歌单，没有后续选歌流程，仅用于测试渲染效果`;
                        await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}${testHintMsg}`)
                        ctx.logger.info(testHintMsg);
                        
                        // 直接渲染并返回歌单，不进行后续选歌流程
                        const renderResult = await renderSongList(ctx, session, config, logger, options, songList, formattedList);
                        
                        // 测试模式下不进入选歌流程，无论renderResult是什么都直接结束
                        return '';
                        
                    } catch (error) {
                        ctx.logger.error('测试模式出错:', error);
                        return '';
                    }
                }
                
                // 正常模式：原有的逻辑
                if (!keyword) return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.nokeyword`))}`;

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
                            return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.songlisterror`))}`;
                        }

                        if (!parsedApiResponse || parsedApiResponse.code !== 200 || !parsedApiResponse.songs || parsedApiResponse.songs.length === 0) {
                            return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.songlisterror`))}`;
                        }

                        const songData = parsedApiResponse.songs[0];
                        if (!songData) {
                            ctx.logger.error('网易单曲点歌插件出错， 获取歌曲信息失败');
                            return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.songlisterror`))}`;
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
                        const response = await generateResponse(session, processedSongData, config.command6_returnDataField, 'netease');

                        // 发送 onebot 音乐卡片
                        if (config.command6_AddOnebotMusicCard) {
                            await sendMusicCard(session, processedSongData, 'netease', config, logger);
                        }

                        return response;
                    } catch (error) {
                        ctx.logger.error('网易单曲点歌插件出错 (ID点歌):', error);
                        return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.somerror`))}`;
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
                            return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.songlisterror`))}`;
                        }
                        const searchData = parsedSearchApiResponse.result;

                        ctx.logger.info(`从api拿到的searchData json = ${JSON.stringify(searchData)}`);

                        if (!searchData || !searchData.songs || searchData.songs.length === 0) {
                            return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.songlisterror`))}`;
                        }

                         const songList = searchData.songs.map((song, index) => {
                            return {
                                id: song.id,
                                name: song.name,
                                artists: song.artists.map(artist => artist.name).join('/'),
                                albumName: song.album.name,
                                duration: song.duration,
                                platform: 'netease'
                            };
                         });
                          
                         // verbose file log
                         if (config.verboseFileLog) {
                            try {
                                const logDir = require('node:path').resolve(__dirname, '../log');
                                const fsSync = require('node:fs');
                                if (!fsSync.existsSync(logDir)) {
                                    fsSync.mkdirSync(logDir, { recursive: true });
                                }
                                fsSync.writeFileSync(require('node:path').join(logDir, 'songlist-latest.json'), JSON.stringify(songList, null, 2));
                            } catch (e) {
                                ctx.logger.warn('verbose file log failed:', e.message);
                            }
                         }
                          
                         let input = options.number;

                           // 如果启用了跳过歌单选择（配置项或命令参数），直接选择第一首歌曲
                         if ( (config.skipSongListSelection || options.skip) ) {
                            input = '1';
                         } else if (!options.number) {
                            // 如果启用智能对齐，先计算每列的最大宽度
                            let maxSongNameWidth = 0;
                            let maxArtistWidth = 0;
                            
                            if (config.textListSeparator === '${tab}' || config.textListSeparator === '\t') {
                                if (config.smartTabAlignment) {
                                    // 第一次遍历：计算每列的最大宽度
                                    songList.forEach((song) => {
                                        const songNamePart = `(${songList.indexOf(song) + 1}) ${song.name}`;
                                        const artistPart = `- ${song.artists}`;
                                        
                                        if (songNamePart.length > maxSongNameWidth) {
                                            maxSongNameWidth = songNamePart.length;
                                        }
                                        if (artistPart.length > maxArtistWidth) {
                                            maxArtistWidth = artistPart.length;
                                        }
                                    });
                                }
                            }
                            
                            // 生成歌单
                            const formattedList = songList.map((song, index) => {
                                // 处理分隔符，将${tab}替换为制表符
                                let separator = config.textListSeparator || '${tab}';
                                separator = separator.replace(/\$\{tab\}/g, '\t');
                                
                                let songNumberPart = `(${index + 1}) ${song.name}`;
                                let artistPart = `- ${song.artists}`;
                                let albumInfo = song.albumName ? `- ${song.albumName}` : '';
                                
                                // 如果使用制表符且启用智能对齐
                                if (separator === '\t' && config.smartTabAlignment) {
                                    // 假设一个 tab 等于 8 个字符宽度
                                    const tabWidth = 8;
                                    
                                    // 计算当前行的实际宽度
                                    const currentSongNameWidth = songNumberPart.length;
                                    const currentArtistWidth = artistPart.length;
                                    
                                    // 计算目标 tab 边界位置（最大宽度所在的下一个 tab 边界）
                                    const targetSongNamePos = Math.ceil(maxSongNameWidth / tabWidth) * tabWidth;
                                    const targetArtistPos = albumInfo ? Math.ceil(maxArtistWidth / tabWidth) * tabWidth : 0;
                                    
                                    // 计算需要的 tab 数量
                                    // 从当前位置到目标位置需要的 tab 数
                                    const songNameTabs = Math.max(1, Math.ceil((targetSongNamePos - currentSongNameWidth) / tabWidth));
                                    const artistTabs = albumInfo ? Math.max(1, Math.ceil((targetArtistPos - currentArtistWidth) / tabWidth)) : 0;
                                    
                                    // 生成tab字符串
                                    const songNameTabStr = separator.repeat(songNameTabs);
                                    const artistTabStr = separator.repeat(artistTabs);
                                    
                                    return `${songNumberPart}${songNameTabStr}${artistPart}${artistTabStr}${albumInfo}`;
                                } else {
                                    // 使用默认分隔符
                                    const albumInfoStr = albumInfo ? `${separator}${albumInfo}` : '';
                                    return `${songNumberPart}${separator}${artistPart}${albumInfoStr}`;
                                }
                            }).join('\n');
                            
                            // 调用共享的渲染函数
                            const renderResult = await renderSongList(ctx, session, config, logger, options, songList, formattedList);
                            if (typeof renderResult === 'string') {
                                return renderResult;
                            }
                            if (renderResult) {
                                if (renderResult.timeout) {
                                    return `${config.enableQuote ? h.quote(session.messageId) : ''}${session.text(`.waitTimeout`)}`;
                                }
                                if (renderResult.exit) {
                                    return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.exitprompt`))}`;
                                }
                                input = renderResult.input;
                            }
                         }

                         const serialNumber = +input;
                        if (Number.isNaN(serialNumber) || serialNumber < 1 || serialNumber > songList.length) {
                            return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.invalidNumber`))}`;
                        }

                        const selectedSongId = songList[serialNumber - 1].id;
                        const selectedinterval = songList[serialNumber - 1].duration / 1000; // selected 的 duration 秒数
                        logInfo("音乐时长：", selectedinterval);
                        if (selectedinterval > config.maxDuration) {
                            return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.maxsongDuration`, [config.maxDuration]))}`;
                        }
                        // 获取歌曲详情 (用于获取歌曲名称、艺术家、图片等，与获取直链的 API 无关)
                        const detailApiUrl = `http://music.163.com/api/song/detail/?id=${selectedSongId}&ids=[${selectedSongId}]`;
                        logInfo("请求歌曲详情 API:", detailApiUrl);

                        const detailApiResponse = await smartGet(detailApiUrl);
                        const detailParsedApiResponse = safeJsonParse(detailApiResponse);

                        if (!detailParsedApiResponse || detailParsedApiResponse.code !== 200 || !detailParsedApiResponse.songs || detailParsedApiResponse.songs.length === 0) {
                            return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.songlisterror`))}`;
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
                        logInfo(processedSongData);

                        const response = await generateResponse(session, processedSongData, config.command6_returnDataField, 'netease');

                        // 发送 onebot 音乐卡片
                        if (config.command6_AddOnebotMusicCard) {
                            await sendMusicCard(session, processedSongData, 'netease', config, logger);
                        }

                        return response;


                    } catch (error) {
                        ctx.logger.error('网易点歌插件出错 (歌名搜索):', error);
                        return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.somerror`))}`;
                    }
                }
            });
    }
}

exports.registerCommand6 = registerCommand6;
