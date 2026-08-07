"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommand9 = void 0;
const { h } = require("koishi");
const { generateSongListImage, generateSongListImagePuppeteer, loadTestSongList } = require('../render');
const { normalizeCommand9Platforms } = require('../config');
const { getQualityCandidates, summarizeError } = require('../util');

/**
 * 注册落月点歌指令
 * @param {any} ctx - Koishi 上下文
 * @param {any} config - 配置对象
 * @param {{logInfo: Function, logDebug: Function}} musicLogger - 插件日志工具
 * @param {Object} sharedFunctions - 共享函数集合
 */
function registerCommand9(ctx, config, musicLogger, sharedFunctions) {
    const { logInfo, logDebug } = musicLogger;
    const { parseRenderMode, generateResponse, renderSongList, sendMusicCard, sendQqRichuiCard, smartApiGet } = sharedFunctions;
    const getSelectedPlatforms = () => normalizeCommand9Platforms(config.command9_platforms);
    const getQualityByPlatform = (platform) => {
        switch (platform) {
            case 'netease':
                return config.command9_NeteaseMusicQuality;
            case 'tencent':
                return config.command9_QQMusicQuality;
            case 'kugou':
                return config.command9_KugouMusicQuality || '320';
            default:
                return config.command9_NeteaseMusicQuality;
        }
    };
    const getPlatformLabel = (platform) => {
        switch (platform) {
            case 'netease':
                return '【网易云】';
            case 'tencent':
                return '【QQ音乐】';
            case 'kugou':
                return '【酷狗】';
            default:
                return `【${platform || '未知平台'}】`;
        }
    };
    const buildSongRequestParam = (platform, song) => {
        if (platform === 'tencent' && song.mid) return `mid=${song.mid}`;
        if (platform === 'kugou') {
            const parts = [];
            if (song.hash) parts.push(`hash=${song.hash}`);
            if (song.album_id || song.albumID) parts.push(`album_id=${song.album_id || song.albumID}`);
            if (song.album_audio_id || song.albumAudioID) parts.push(`album_audio_id=${song.album_audio_id || song.albumAudioID}`);
            if (parts.length) return parts.join('&');
        }
        return `id=${song.id}`;
    };
    const buildLyricRequestParam = (platform, song, keywordText) => {
        if (platform === 'kugou') {
            const parts = [];
            if (song.lyric_id && song.accesskey) {
                parts.push(`id=${encodeURIComponent(song.lyric_id)}`);
                parts.push(`accesskey=${encodeURIComponent(song.accesskey)}`);
            } else {
                if (song.hash) parts.push(`hash=${encodeURIComponent(song.hash)}`);
                if (song.album_audio_id || song.albumAudioID) parts.push(`album_audio_id=${encodeURIComponent(song.album_audio_id || song.albumAudioID)}`);
                if (keywordText || song.name) parts.push(`keyword=${encodeURIComponent(keywordText || song.name)}`);
            }
            parts.push('fmt=lrc');
            return parts.join('&');
        }
        return `id=${encodeURIComponent(song.id)}`;
    };
    const extractLyricText = (lyricResponse) => {
        if (lyricResponse?.code !== 200 || !lyricResponse.data) return '';
        return lyricResponse.data.lrc || lyricResponse.data.krc || '';
    };
    const normalizeSongData = (baseSong, apiData) => ({
        ...baseSong,
        ...apiData,
        id: apiData.id || baseSong.id,
        name: apiData.name || apiData.song || baseSong.name || baseSong.song,
        artist: apiData.artist || apiData.singer || baseSong.artist || baseSong.singer,
        cover: apiData.cover || apiData.pic || baseSong.cover || baseSong.pic,
        album: apiData.album || baseSong.album,
        lyric_id: apiData.lyric_id || baseSong.lyric_id,
        accesskey: apiData.accesskey || baseSong.accesskey,
    });
    const requestSongAtQuality = async (platform, song, requestedQuality) => {
        const detailQuery = buildSongRequestParam(platform, song);
        const detailApiUrl = `${config.command9_luoyueApiBaseUrl}/v2/music/${platform}?${detailQuery}&quality=${requestedQuality}`;
        logDebug(`请求歌曲详情（音质 ${requestedQuality}）`, detailApiUrl);
        const response = await smartApiGet(detailApiUrl);
        if (!response || response.code !== 200 || !response.data?.url) {
            const error = new Error(`音质 ${requestedQuality} 未返回可用媒体`);
            error.code = 'MEDIA_QUALITY_UNAVAILABLE';
            throw error;
        }
        return normalizeSongData(song, response.data);
    };
    const resolveFirstAvailableQuality = async (platform, song, selectedQuality) => {
        const candidates = getQualityCandidates(platform, selectedQuality);
        let lastError;
        for (const requestedQuality of candidates) {
            try {
                return {
                    song: await requestSongAtQuality(platform, song, requestedQuality),
                    requestedQuality,
                };
            } catch (error) {
                lastError = error;
                if (config.command9_AutoDowngradeQuality === false) break;
                logInfo(`⚠️ 音质 ${requestedQuality} 不可用，尝试下一档音质`);
                logDebug(`音质 ${requestedQuality} 获取失败`, error);
            }
        }
        throw lastError || new Error('没有可用的媒体音质');
    };
    const toProcessedSongData = (song, lyric) => ({
        name: song.name || song.song,
        artist: song.artist || song.singer,
        url: song.url,
        lrc: lyric,
        pic: song.cover || song.pic,
        id: song.id,
        album: song.album,
        quality: song.quality,
        size: song.size,
        kbps: song.kbps,
    });
    const createQualityFallbackOptions = (platform, sourceSong, lyric, initialRequestedQuality = getQualityByPlatform(platform)) => {
        const configuredQuality = getQualityByPlatform(platform);
        return {
            enabled: config.command9_AutoDowngradeQuality !== false,
            platform,
            candidates: getQualityCandidates(platform, initialRequestedQuality),
            initialDowngradeFrom: String(initialRequestedQuality) !== String(configuredQuality) ? configuredQuality : undefined,
            fetchData: async (requestedQuality) => {
                const fallbackSong = await requestSongAtQuality(platform, sourceSong, requestedQuality);
                return toProcessedSongData(fallbackSong, lyric);
            },
        };
    };
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
                        const selectedPlatforms = getSelectedPlatforms();
                        const platformType = selectedPlatforms.length > 1 ? 'mixed' : selectedPlatforms[0];
                        const testData = await loadTestSongList(ctx, config, musicLogger, platformType);
                        if (!testData) {
                            logInfo('❌ 落月测试数据加载失败');
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
                        logInfo('❌ 落月测试模式执行失败', summarizeError(error));
                        logDebug('落月测试模式异常', error);
                        return '';
                    }
                }
                
                // 正常模式：原有的逻辑
                if (!keyword) return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.nokeyword`))}`;

                const selectedPlatforms = getSelectedPlatforms();
                const isAggregateMode = selectedPlatforms.length > 1;
                const defaultPlatform = selectedPlatforms[0];
                const isSongId = /^\d+$/.test(keyword.trim());
                const quality = getQualityByPlatform(defaultPlatform);
                logInfo(
                    '🎵 落月点歌开始',
                    isSongId && !options.number
                        ? `平台=${defaultPlatform}，ID=${keyword.trim()}`
                        : `平台=${selectedPlatforms.join(',')}，关键词=${keyword}`,
                );

                if (isSongId && !options.number) {
                    if (isAggregateMode || defaultPlatform === 'kugou') {
                        return `${config.enableQuote ? h.quote(session.messageId) : ''}⚠️ 当前平台配置包含多平台聚合或酷狗，ID 直点请先搜索后选歌。`;
                    }
                    // ID点歌模式
                    try {
                        const apiUrl = `${config.command9_luoyueApiBaseUrl}/v2/music/${defaultPlatform}?id=${keyword}&quality=${quality}`;
                        logDebug('落月 API ID 点歌请求', apiUrl);

                        const apiResponse = await smartApiGet(apiUrl);
                        let requestedQuality = quality;
                        let songData;
                        if (apiResponse?.code === 200 && apiResponse.data?.url) {
                            songData = apiResponse.data;
                        } else {
                            const resolved = await resolveFirstAvailableQuality(defaultPlatform, { id: keyword }, quality);
                            songData = resolved.song;
                            requestedQuality = resolved.requestedQuality;
                        }
                        
                        // 获取歌词
                        let lyric = '歌词获取失败';
                        try {
                            const lyricApiUrl = `${config.command9_luoyueApiBaseUrl}/v2/music/${defaultPlatform}/lyric?id=${keyword}`;
                            const lyricResponse = await smartApiGet(lyricApiUrl);
                            const lyricText = extractLyricText(lyricResponse);
                            if (lyricText) lyric = `\n${lyricText}`;
                        } catch (error) {
                            logInfo('⚠️ 获取歌词失败，继续发送其他歌曲字段', summarizeError(error));
                            logDebug('落月 ID 点歌歌词请求异常', error);
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

                        const normalizedSongData = normalizeSongData({ id: keyword }, songData);
                        const processedSongData = toProcessedSongData(normalizedSongData, lyric);
                        
                        logInfo('🎯 已选择落月歌曲', `${processedSongData.name} - ${processedSongData.artist}，平台=${defaultPlatform}，音质=${requestedQuality}，时长=${durationSeconds} 秒`);
                        logDebug('落月 ID 点歌处理结果', processedSongData);

                        if (config.command9_AddQqRichuiCard) {
                            await sendQqRichuiCard(session, songData, defaultPlatform, musicLogger);
                        }

                        const response = await generateResponse(
                            session,
                            processedSongData,
                            config.command9_returnDataField,
                            defaultPlatform,
                            {
                                qualityFallback: createQualityFallbackOptions(defaultPlatform, normalizedSongData, lyric, requestedQuality),
                                telegramCaptionMode: config.command9_telegramCaptionMode,
                                telegramCaptionConfigKey: 'command9_telegramCaptionMode',
                            },
                        );
                        
                        // 发送音乐卡片
                        if (config.command9_AddOnebotMusicCard) {
                            await sendMusicCard(session, songData, defaultPlatform, musicLogger);
                        }
                        
                        return response;
                    } catch (error) {
                        logInfo('❌ 落月 ID 点歌执行失败', summarizeError(error));
                        logDebug('落月 ID 点歌异常', error);
                        return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.somerror`))}`;
                    }
                } else {
                    // 歌名搜索模式
                    try {
                        let searchResults = [];
                        
                        if (isAggregateMode) {
                            const perPlatformLimit = Math.max(1, Math.ceil(config.command9_searchListLength / selectedPlatforms.length));
                            logInfo(`🎼 聚合搜索开始: 关键词="${keyword}", 平台=${selectedPlatforms.join(',')}, 每平台数量=${perPlatformLimit}`);

                            const requestByPlatform = async (platform) => {
                                const quality = getQualityByPlatform(platform);
                                try {
                                    const url = `${config.command9_luoyueApiBaseUrl}/v2/music/${platform}?word=${encodeURIComponent(keyword)}&num=${perPlatformLimit}&quality=${quality}`;
                                    logDebug(`${platform} 搜索 API`, url);
                                    const response = await smartApiGet(url);

                                    if (platform === 'netease' && response.code === 503 && quality > 4) {
                                        logInfo(`⚠️ 网易云音质 ${quality} 返回 503，尝试降级到音质 4（320k）`);
                                        const retryUrl = `${config.command9_luoyueApiBaseUrl}/v2/music/${platform}?word=${encodeURIComponent(keyword)}&num=${perPlatformLimit}&quality=4`;
                                        logDebug('网易云搜索降级重试 API', retryUrl);
                                        return { platform, response: await smartApiGet(retryUrl) };
                                    }

                                    return { platform, response };
                                } catch (err) {
                                    logInfo(`⚠️ ${platform} 搜索失败，聚合搜索继续`, summarizeError(err));
                                    logDebug(`${platform} 搜索异常`, err);
                                    return { platform, response: { code: 500, data: [], error: err.message } };
                                }
                            };

                            const platformResponses = await Promise.all(selectedPlatforms.map(requestByPlatform));
                            const resultGroups = [];

                            for (const { platform, response } of platformResponses) {
                                logDebug(`${platform} 搜索响应`, () => ({
                                    code: response.code,
                                    dataType: Array.isArray(response.data) ? '数组' : typeof response.data,
                                    response: response.code === 200 ? undefined : response,
                                }));
                                const items = response.code === 200 && response.data
                                    ? (Array.isArray(response.data) ? response.data : [response.data])
                                    : [];
                                resultGroups.push({
                                    platform,
                                    items: items.map((song) => ({
                                        ...song,
                                        platform,
                                        platformLabel: getPlatformLabel(platform),
                                    })),
                                });
                            }

                            const maxLength = Math.max(...resultGroups.map((group) => group.items.length), 0);
                            logDebug('聚合搜索开始交替合并', () => ({
                                groups: resultGroups.map((group) => ({ platform: group.platform, count: group.items.length })),
                                maxLength,
                            }));
                            for (let i = 0; i < maxLength; i++) {
                                for (const group of resultGroups) {
                                    if (i < group.items.length) {
                                        searchResults.push(group.items[i]);
                                        logDebug('聚合搜索添加候选歌曲', () => ({
                                            platform: group.platform,
                                            index: i,
                                            song: group.items[i],
                                        }));
                                    }
                                }
                            }
                            logInfo('🎼 聚合搜索完成', `${resultGroups.map((group) => `${group.platform} ${group.items.length} 首`).join('，')}，总计 ${searchResults.length} 首`);

                        } else {
                            // 单平台搜索（原有逻辑）
                            const searchApiUrl = `${config.command9_luoyueApiBaseUrl}/v2/music/${defaultPlatform}?word=${encodeURIComponent(keyword)}&num=${config.command9_searchListLength}&quality=${quality}`;
                            logInfo('🔎 落月单平台搜索开始', `平台=${defaultPlatform}，关键词=${keyword}，数量=${config.command9_searchListLength}`);
                            logDebug('落月单平台搜索 API', searchApiUrl);

                            const searchApiResponse = await smartApiGet(searchApiUrl);
                            if (!searchApiResponse || searchApiResponse.code !== 200 || !searchApiResponse.data) {
                                return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.songlisterror`))}`;
                            }

                            // 搜索返回的是数组
                            searchResults = Array.isArray(searchApiResponse.data) ? searchApiResponse.data : [searchApiResponse.data];
                            
                            // 添加平台标识（单平台时不需要显示）
                            searchResults = searchResults.map(song => ({
                                ...song,
                                platform: defaultPlatform,
                                platformLabel: '' // 单平台搜索不显示标签
                            }));
                            logInfo('🎼 落月单平台搜索完成', `平台=${defaultPlatform}，共 ${searchResults.length} 首`);
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
                                hash: song.hash,
                                album_id: song.album_id || song.albumID,
                                album_audio_id: song.album_audio_id || song.albumAudioID,
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

                        const selectedSong = songList[serialNumber - 1];
                        const selectedDuration = selectedSong.duration / 1000; // 转换为秒

                        logDebug('落月选中歌曲时长', `${selectedDuration} 秒`);
                        if (selectedDuration > config.command9_maxDuration) {
                            return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.maxsongDuration`, [config.command9_maxDuration]))}`;
                        }

                        // 如果没有URL，需要再次请求获取完整信息
                        let finalSongData = selectedSong;
                        // 使用歌曲实际平台（聚合模式下每首歌有自己的平台）
                        const actualPlatform = selectedSong.platform || defaultPlatform;
                        const actualQuality = getQualityByPlatform(actualPlatform);
                        let requestedQuality = actualQuality;
                        
                        if (!selectedSong.url) {
                            const resolved = await resolveFirstAvailableQuality(actualPlatform, selectedSong, actualQuality);
                            finalSongData = resolved.song;
                            requestedQuality = resolved.requestedQuality;
                        }

                        // 获取歌词
                        let lyric = '歌词获取失败';
                        try {
                            const lyricQuery = buildLyricRequestParam(actualPlatform, finalSongData, keyword);
                            const lyricApiUrl = `${config.command9_luoyueApiBaseUrl}/v2/music/${actualPlatform}/lyric?${lyricQuery}`;
                            const lyricResponse = await smartApiGet(lyricApiUrl);
                            const lyricText = extractLyricText(lyricResponse);
                            if (lyricText) lyric = `\n${lyricText}`;
                        } catch (error) {
                            logInfo('⚠️ 获取歌词失败，继续发送其他歌曲字段', summarizeError(error));
                            logDebug('落月搜索点歌歌词请求异常', error);
                        }

                        const processedSongData = toProcessedSongData(finalSongData, lyric);

                        logInfo('🎯 已选择落月歌曲', `${processedSongData.name} - ${processedSongData.artist}，平台=${actualPlatform}，音质=${requestedQuality}，时长=${selectedDuration} 秒`);
                        logDebug('落月搜索点歌处理结果', processedSongData);

                        if (config.command9_AddQqRichuiCard) {
                            await sendQqRichuiCard(session, finalSongData, actualPlatform, musicLogger);
                        }

                        const response = await generateResponse(
                            session,
                            processedSongData,
                            config.command9_returnDataField,
                            actualPlatform,
                            {
                                qualityFallback: createQualityFallbackOptions(actualPlatform, finalSongData, lyric, requestedQuality),
                                telegramCaptionMode: config.command9_telegramCaptionMode,
                                telegramCaptionConfigKey: 'command9_telegramCaptionMode',
                            },
                        );
                        
                        // 发送音乐卡片
                        if (config.command9_AddOnebotMusicCard) {
                            await sendMusicCard(session, finalSongData, actualPlatform, musicLogger);
                        }
                        
                        return response;

                    } catch (error) {
                        logInfo('❌ 落月搜索点歌执行失败', summarizeError(error));
                        logDebug('落月搜索点歌异常', error);
                        return `${config.enableQuote ? h.quote(session.messageId) : ''}${h.text(session.text(`.somerror`))}`;
                    }
                }
            });
    }
}

exports.registerCommand9 = registerCommand9;
