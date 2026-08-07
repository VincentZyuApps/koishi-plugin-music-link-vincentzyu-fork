"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommand6 = void 0;
const { h } = require("koishi");
const { generateSongListImage, generateSongListImagePuppeteer, loadTestSongList } = require('../render');
const { safeJsonParse, buildSongUrl, summarizeError } = require('../util');

/**
 * 注册网易云点歌指令
 * @param {any} ctx - Koishi 上下文
 * @param {any} config - 配置对象
 * @param {{logInfo: Function, logDebug: Function}} musicLogger - 插件日志工具
 * @param {Object} sharedFunctions - 共享函数集合
 */
function registerCommand6(ctx, config, musicLogger, sharedFunctions) {
    const { logInfo, logDebug } = musicLogger;
    const { parseRenderMode, smartGet, fetchNeteaseLyric, generateResponse, renderSongList, sendMusicCard, sendQqRichuiCard } = sharedFunctions;
    const summarizeForVerboseLog = (value) => {
        const json = JSON.stringify(value);
        const preview = json.length > 50 ? `${json.slice(0, 50)}...` : json;
        const length = Array.isArray(value) ? value.length : 1;
        return `length=${length}, preview=${preview}`;
    };
    const logSongListSummaryIfEnabled = (songList) => {
        if (!config.verboseFileLog) return;
        logInfo('📝 完整歌单日志已写入', `${songList.length} 首，log/songlist-latest.json`);
        logDebug('完整歌单日志短预览', summarizeForVerboseLog(songList));
    };
    
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
                        const testData = await loadTestSongList(ctx, config, musicLogger, 'netease');
                        if (!testData) {
                            logInfo('❌ 网易云测试数据加载失败');
                            return '';
                        }
                        
                        const { songList, formattedList } = testData;
                        
                        // 在控制台和session输出提示信息
                        const testHintMsg = `🧪 [测试模式] 使用硬编码假数据展示歌单，没有后续选歌流程，仅用于测试渲染效果`;
                        await session.send(`${config.enableQuote ? h.quote(session.messageId) : ''}${testHintMsg}`)
                        logInfo(testHintMsg);
                        
                        // 直接渲染并返回歌单，不进行后续选歌流程
                        const renderResult = await renderSongList(ctx, session, config, options, songList, formattedList);
                        
                        // 测试模式下不进入选歌流程，无论renderResult是什么都直接结束
                        return '';
                        
                    } catch (error) {
                        logInfo('❌ 网易云测试模式执行失败', summarizeError(error));
                        logDebug('网易云测试模式异常', error);
                        return '';
                    }
                }
                
                // 正常模式：原有的逻辑
                if (!keyword) return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.nokeyword`))}`;

                const isSongId = /^\d+$/.test(keyword.trim());
                const useApi = config.command6_usedAPI; // 获取用户选择的 API
                logInfo('🎵 网易云点歌开始', isSongId && !options.number ? `ID=${keyword.trim()}` : `关键词=${keyword}`);

                if (isSongId && !options.number) {
                    try {
                        // 获取歌曲直链 (根据选择的 API 调整)
                        const songUrl = buildSongUrl(useApi, keyword);
                        logDebug('网易云歌曲直链', songUrl);
                        // 请求 163 API 获取歌曲详情 (用于获取歌曲名称、艺术家、图片等信息，与获取直链的 API 无关)
                        const apiBase = `http://music.163.com/api/song/detail/?id=${keyword}&ids=[${keyword}]`;
                        logDebug('网易云 ID 点歌详情 API', apiBase);

                        const apiResponse = await smartGet(apiBase);
                        const parsedApiResponse = safeJsonParse(apiResponse);
                        if (!parsedApiResponse) {
                            logInfo('❌ 网易云歌曲详情 JSON 解析失败');
                            logDebug('网易云歌曲详情原始响应', apiResponse);
                            return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.songlisterror`))}`;
                        }

                        if (!parsedApiResponse || parsedApiResponse.code !== 200 || !parsedApiResponse.songs || parsedApiResponse.songs.length === 0) {
                            return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.songlisterror`))}`;
                        }

                        const songData = parsedApiResponse.songs[0];
                        if (!songData) {
                            logInfo('❌ 网易云 ID 点歌未获取到歌曲信息', `ID=${keyword}`);
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
                            album: songData.album.name,
                        };
                        logInfo('🎯 已选择网易云歌曲', `${processedSongData.name} - ${processedSongData.artist}，ID=${processedSongData.id}`);
                        logDebug('网易云 ID 点歌处理结果', processedSongData);

                        if (config.command6_AddQqRichuiCard) {
                            await sendQqRichuiCard(session, processedSongData, 'netease', musicLogger);
                        }

                        const response = await generateResponse(
                            session,
                            processedSongData,
                            config.command6_returnDataField,
                            'netease',
                            {
                                telegramCaptionMode: config.command6_telegramCaptionMode,
                                telegramCaptionConfigKey: 'command6_telegramCaptionMode',
                            },
                        );

                        // 发送 onebot 音乐卡片
                        if (config.command6_AddOnebotMusicCard) {
                            await sendMusicCard(session, processedSongData, 'netease', musicLogger);
                        }

                        return response;
                    } catch (error) {
                        logInfo('❌ 网易云 ID 点歌执行失败', summarizeError(error));
                        logDebug('网易云 ID 点歌异常', error);
                        return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.somerror`))}`;
                    }
                } else {
                    // 歌名搜索
                    try {
                        const searchApiUrl = `http://music.163.com/api/search/get/web?csrf_token=hlpretag=&hlposttag=&s=${encodeURIComponent(keyword)}&type=1&offset=0&total=true&limit=${config.command6_searchListLength}`;
                        logInfo('🔎 网易云搜索开始', `关键词=${keyword}，数量=${config.command6_searchListLength}`);
                        logDebug('网易云搜索 API', searchApiUrl);

                        const searchApiResponse = await smartGet(searchApiUrl);
                        const parsedSearchApiResponse = safeJsonParse(searchApiResponse);
                        if (!parsedSearchApiResponse) {
                            logInfo('❌ 网易云搜索结果 JSON 解析失败');
                            logDebug('网易云搜索原始响应', searchApiResponse);
                            return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.songlisterror`))}`;
                        }
                        const searchData = parsedSearchApiResponse.result;

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
                         logInfo('🎼 网易云搜索完成', `共 ${songList.length} 首`);
                          
                         // verbose file log
                         if (config.verboseFileLog) {
                            try {
                                const logDir = require('node:path').resolve(__dirname, '../../log');
                                const fsSync = require('node:fs');
                                if (!fsSync.existsSync(logDir)) {
                                    fsSync.mkdirSync(logDir, { recursive: true });
                                }
                                fsSync.writeFileSync(require('node:path').join(logDir, 'songlist-latest.json'), JSON.stringify(songList, null, 2));
                                logSongListSummaryIfEnabled(songList);
                            } catch (e) {
                                logInfo('❌ 完整歌单日志写入失败', summarizeError(e));
                                logDebug('完整歌单日志写入异常', e);
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
                            const renderResult = await renderSongList(ctx, session, config, options, songList, formattedList);
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
                        logDebug('网易云选中歌曲时长', `${selectedinterval} 秒`);
                        if (selectedinterval > config.maxDuration) {
                            return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.maxsongDuration`, [config.maxDuration]))}`;
                        }
                        // 获取歌曲详情 (用于获取歌曲名称、艺术家、图片等，与获取直链的 API 无关)
                        const detailApiUrl = `http://music.163.com/api/song/detail/?id=${selectedSongId}&ids=[${selectedSongId}]`;
                        logDebug('网易云选中歌曲详情 API', detailApiUrl);

                        const detailApiResponse = await smartGet(detailApiUrl);
                        const detailParsedApiResponse = safeJsonParse(detailApiResponse);

                        if (!detailParsedApiResponse || detailParsedApiResponse.code !== 200 || !detailParsedApiResponse.songs || detailParsedApiResponse.songs.length === 0) {
                            return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.songlisterror`))}`;
                        }
                        const songData = detailParsedApiResponse.songs[0];


                        // 获取歌曲直链 (根据选择的 API 调整)
                        const songUrl = buildSongUrl(useApi, selectedSongId);

                        logDebug('网易云选中歌曲直链', songUrl);

                        const lyric = await fetchNeteaseLyric(selectedSongId);

                        const processedSongData = {
                            name: songData.name,
                            artist: songData.artists.map(artist => artist.name).join('/'),
                            url: songUrl,
                            lrc: lyric,
                            pic: songData.album.picUrl,
                            id: songData.id,
                            album: songData.album.name,
                        };
                        logInfo('🎯 已选择网易云歌曲', `${processedSongData.name} - ${processedSongData.artist}，ID=${processedSongData.id}，时长=${selectedinterval} 秒`);
                        logDebug('网易云搜索点歌处理结果', processedSongData);

                        if (config.command6_AddQqRichuiCard) {
                            await sendQqRichuiCard(session, processedSongData, 'netease', musicLogger);
                        }

                        const response = await generateResponse(
                            session,
                            processedSongData,
                            config.command6_returnDataField,
                            'netease',
                            {
                                telegramCaptionMode: config.command6_telegramCaptionMode,
                                telegramCaptionConfigKey: 'command6_telegramCaptionMode',
                            },
                        );

                        // 发送 onebot 音乐卡片
                        if (config.command6_AddOnebotMusicCard) {
                            await sendMusicCard(session, processedSongData, 'netease', musicLogger);
                        }

                        return response;


                    } catch (error) {
                        logInfo('❌ 网易云搜索点歌执行失败', summarizeError(error));
                        logDebug('网易云搜索点歌异常', error);
                        return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.somerror`))}`;
                    }
                }
            });
    }
}

exports.registerCommand6 = registerCommand6;
