"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommand9 = void 0;
const { h } = require("koishi");
const { generateSongListImage, generateSongListImagePuppeteer, loadTestSongList } = require('./render');

/**
 * 注册落月点歌指令
 * @param {any} ctx - Koishi 上下文
 * @param {any} config - 配置对象
 * @param {any} logger - 日志对象
 * @param {Function} logInfo - 日志函数
 * @param {Object} sharedFunctions - 共享函数集合
 */
function registerCommand9(ctx, config, logger, logInfo, sharedFunctions) {
    const { parseRenderMode, generateResponse, renderSongList, sendMusicCard } = sharedFunctions;
    
    if (config.serverSelect === "command9") {
        ctx.command(`${config.command9} <keyword:text>`)
            .option('image_style', '-i, --image_style <image_style:number> 图片样式 (1=原始黑白, 2=现代思源宋体, 3=扁平现代)')
            .example(`${config.command9} 蔚蓝档案`)
            .example(`${config.command9} 2608813264`)
            .option('number', '-n <number:number> 歌曲序号')
            .option('skip', '-s, --skip 跳过歌单选择，直接返回第一首歌曲')
            .option('mode', '-m, --mode <mode:string> 渲染模式 (light/dark/白天/黑夜)')
            .option('test', '-t, --test 使用测试数据（从 assets/songlist-test.json 读取，无需请求API）')
            .action(async ({ session, options }, keyword) => {
                // 如果启用了--test参数，直接显示测试歌单
                if (options.test) {
                    try {
                        const platformType = config.command9_platform === 'aggregation' ? 'mixed' : config.command9_platform;
                        const testData = await loadTestSongList(ctx, config, logInfo, platformType);
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

                const platform = config.command9_platform; // 'netease' 或 'tencent'
                const isSongId = /^\d+$/.test(keyword.trim());
                
                // 根据平台选择质量参数
                const quality = platform === 'netease' ? config.command9_NeteaseMusicQuality : config.command9_QQMusicQuality;

                if (isSongId && !options.number) {
                    // ID点歌模式
                    try {
                        const apiUrl = `${config.command9_luoyueApiBaseUrl}/v2/music/${platform}?id=${keyword}&quality=${quality}`;
                        logInfo("请求落月API (ID点歌):", apiUrl);

                        const apiResponse = await ctx.http.get(apiUrl);
                        logInfo("落月API响应:", JSON.stringify(apiResponse, null, 2));

                        if (!apiResponse || apiResponse.code !== 200 || !apiResponse.data) {
                            return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.songlisterror`))}`;
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
                            return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.maxsongDuration`, [config.command9_maxDuration]))}`;
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

                        const response = await generateResponse(session, processedSongData, config.command9_returnDataField, platform);
                        
                        // 发送音乐卡片
                        if (config.command9_AddOnebotMusicCard) {
                            await sendMusicCard(session, songData, platform, config, logger);
                        }
                        
                        return response;
                    } catch (error) {
                        ctx.logger.error('落月点歌插件出错 (ID点歌):', error);
                        return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.somerror`))}`;
                    }
                } else {
                    // 歌名搜索模式
                    try {
                        let searchResults = [];
                        
                        // 聚合模式：同时从网易云和QQ音乐搜索
                        if (platform === 'aggregation') {
                            const halfLimit = Math.floor(config.command9_searchListLength / 2);
                            
                            logInfo(`聚合搜索开始: 关键词="${keyword}", 每平台数量=${halfLimit}, 网易云音质=${config.command9_NeteaseMusicQuality}, QQ音质=${config.command9_QQMusicQuality}`);
                            
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
                                searchNetease(config.command9_NeteaseMusicQuality),
                                ctx.http.get(`${config.command9_luoyueApiBaseUrl}/v2/music/tencent?word=${encodeURIComponent(keyword)}&num=${halfLimit}&quality=${config.command9_QQMusicQuality}`).catch(err => {
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
                                        platformLabel: '【网易云】'
                                    });
                                    logInfo(`添加网易云歌曲 [${i}]: ${neteaseResults[i].song || neteaseResults[i].name}`);
                                }
                                if (i < tencentResults.length) {
                                    searchResults.push({
                                        ...tencentResults[i],
                                        platform: 'tencent',
                                        platformLabel: '【QQ音乐】'
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
                                return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.songlisterror`))}`;
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
                            return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.songlisterror`))}`;
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
                        if ((config.skipSongListSelection || options.skip) && !options.number) {
                            input = '1';
                        } else if (!options.number) {
                            // 如果启用智能对齐，先计算每列的最大宽度
                            let maxPlatformWidth = 0;
                            let maxSongNameWidth = 0;
                            let maxArtistWidth = 0;
                            
                            if (config.textListSeparator === '${tab}' || config.textListSeparator === '\t') {
                                if (config.smartTabAlignment) {
                                    // 第一次遍历：计算每列的最大宽度
                                    songList.forEach((song) => {
                                        const platformLabelPart = song.platformLabel;
                                        const songNamePart = `(${songList.indexOf(song) + 1}) ${song.name}`;
                                        const artistPart = `- ${song.artist}`;
                                        
                                        if (platformLabelPart.length > maxPlatformWidth) {
                                            maxPlatformWidth = platformLabelPart.length;
                                        }
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
                                
                                let platformLabelPart = song.platformLabel;
                                let songNumberPart = `(${index + 1}) ${song.name}`;
                                let artistPart = `- ${song.artist}`;
                                let albumInfo = song.album ? `- ${song.album}` : '';
                                
                                // 如果使用制表符且启用智能对齐
                                if (separator === '\t' && config.smartTabAlignment) {
                                    // 假设一个 tab 等于 8 个字符宽度
                                    const tabWidth = 8;
                                    
                                    // 计算当前行的实际宽度
                                    const currentPlatformWidth = platformLabelPart.length;
                                    const currentSongNameWidth = songNumberPart.length;
                                    const currentArtistWidth = artistPart.length;
                                    
                                    // 计算目标 tab 边界位置（最大宽度所在的下一个 tab 边界）
                                    const targetPlatformPos = Math.ceil(maxPlatformWidth / tabWidth) * tabWidth;
                                    const targetSongNamePos = Math.ceil(maxSongNameWidth / tabWidth) * tabWidth;
                                    const targetArtistPos = albumInfo ? Math.ceil(maxArtistWidth / tabWidth) * tabWidth : 0;
                                    
                                    // 计算需要的 tab 数量
                                    // 从当前位置到目标位置需要的 tab 数
                                    const platformTabs = Math.max(1, Math.ceil((targetPlatformPos - currentPlatformWidth) / tabWidth));
                                    const songNameTabs = Math.max(1, Math.ceil((targetSongNamePos - currentSongNameWidth) / tabWidth));
                                    const artistTabs = albumInfo ? Math.max(1, Math.ceil((targetArtistPos - currentArtistWidth) / tabWidth)) : 0;
                                    
                                    // 生成tab字符串
                                    const platformTabStr = separator.repeat(platformTabs);
                                    const songNameTabStr = separator.repeat(songNameTabs);
                                    const artistTabStr = separator.repeat(artistTabs);
                                    
                                    return `${platformLabelPart}${platformTabStr}${songNumberPart}${songNameTabStr}${artistPart}${artistTabStr}${albumInfo}`;
                                } else {
                                    // 使用默认分隔符
                                    const albumInfoStr = albumInfo ? `${separator}${albumInfo}` : '';
                                    return `${platformLabelPart}${separator}${songNumberPart}${separator}${artistPart}${albumInfoStr}`;
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

                        const selectedSong = songList[serialNumber - 1];
                        const selectedDuration = selectedSong.duration / 1000; // 转换为秒

                        logInfo("选中歌曲时长：", selectedDuration);
                        if (selectedDuration > config.command9_maxDuration) {
                            return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.maxsongDuration`, [config.command9_maxDuration]))}`;
                        }

                        // 如果没有URL，需要再次请求获取完整信息
                        let finalSongData = selectedSong;
                        // 使用歌曲实际平台（聚合模式下每首歌有自己的平台）
                        const actualPlatform = selectedSong.platform || platform;
                        const actualQuality = actualPlatform === 'tencent' ? config.command9_QQMusicQuality : config.command9_NeteaseMusicQuality;
                        
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

                        const response = await generateResponse(session, processedSongData, config.command9_returnDataField, actualPlatform);
                        
                        // 发送音乐卡片
                        if (config.command9_AddOnebotMusicCard) {
                            await sendMusicCard(session, finalSongData, actualPlatform, config, logger);
                        }
                        
                        return response;

                    } catch (error) {
                        ctx.logger.error('落月点歌插件出错 (歌名搜索):', error);
                        return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.somerror`))}`;
                    }
                }
            });
    }
}

exports.registerCommand9 = registerCommand9;
