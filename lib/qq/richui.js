"use strict";

const MSG_TIMEOUT = 5 * 60 * 1000 - 2000;
const DEFAULT_COVER = 'https://downv6.qq.com/qqface/default_cover.png';

const PLATFORM_META = {
    netease: {
        label: '网易云音乐',
        icon: 'https://i.gtimg.cn/open/app_icon/00/49/50/85/100495085_100_m.png',
        detailUrl: song => song.id
            ? `https://music.163.com/#/song?id=${encodeURIComponent(song.id)}`
            : '',
    },
    tencent: {
        label: 'QQ音乐',
        icon: 'https://p.qpic.cn/qqconnect/0/app_100497308_1626060999/100?max-age=2592000&t=0',
        detailUrl: song => song.mid
            ? `https://y.qq.com/n/ryqq/songDetail/${encodeURIComponent(song.mid)}`
            : '',
    },
    kugou: {
        label: '酷狗音乐',
        icon: 'https://i.gtimg.cn/open/app_icon/00/20/51/41/205141_100_m.png',
        detailUrl: song => {
            if (!song.hash) return '';
            const albumId = song.album_id || song.albumID;
            const suffix = albumId ? `&album_id=${encodeURIComponent(albumId)}` : '';
            return `https://www.kugou.com/song/#hash=${encodeURIComponent(song.hash)}${suffix}`;
        },
    },
};

function firstValue(...values) {
    return values.find(value => value !== undefined && value !== null && value !== '');
}

function toText(value, fallback = '') {
    if (Array.isArray(value)) {
        return value
            .map(item => typeof item === 'object' ? firstValue(item.name, item.title) : item)
            .filter(Boolean)
            .join('/');
    }
    if (value && typeof value === 'object') {
        const nestedValue = firstValue(value.name, value.title);
        return nestedValue === undefined ? fallback : String(nestedValue);
    }
    return value === undefined || value === null || value === '' ? fallback : String(value);
}

function normalizeHttpsUrl(value) {
    const url = toText(value);
    return url.startsWith('http://') ? `https://${url.slice(7)}` : url;
}

function normalizeSongData(songData = {}) {
    const albumSource = firstValue(songData.album, songData.albumName, songData.album_name);
    return {
        ...songData,
        title: toText(firstValue(songData.song, songData.name, songData.title), '未知歌曲'),
        artistText: toText(firstValue(songData.singer, songData.artist, songData.artists), '未知歌手'),
        albumText: toText(albumSource),
        coverUrl: normalizeHttpsUrl(firstValue(
            songData.cover,
            songData.pic,
            songData.image,
            songData.preview,
            songData.album?.picUrl,
        )) || DEFAULT_COVER,
        audioUrl: toText(firstValue(songData.url, songData.musicUrl, songData.audio)),
        explicitLink: toText(firstValue(songData.link, songData.jumpUrl, songData.jump_url)),
    };
}

function resolvePlatformMeta(platform) {
    return PLATFORM_META[platform] || {
        label: toText(platform, '音乐'),
        icon: DEFAULT_COVER,
        detailUrl: () => '',
    };
}

function resolveCardUrl(song, meta) {
    return meta.detailUrl(song) || song.explicitLink || song.audioUrl || 'https://im.qq.com/';
}

function buildQqRichuiCard(songData, platform) {
    const song = normalizeSongData(songData);
    const meta = resolvePlatformMeta(platform);
    const description = song.albumText
        ? `${song.artistText} · ${song.albumText}`
        : song.artistText;

    return {
        busId: 'FlashTransfer',
        templateId: 'flash',
        version: 2,
        layout: {
            viewId: 'flash_file',
            width: -2,
            height: -2,
            direction: 'horizontal',
            layout: [
                {
                    viewId: 'progressLeft',
                    viewType: 'circularProgress',
                    height: 28,
                    width: 28,
                    marginRight: 8,
                    gravity: 'centerVertical',
                },
                {
                    viewId: 'file',
                    direction: 'vertical',
                    height: -2,
                    width: 263,
                    layout: [
                        { viewId: 'image', viewType: 'image', width: -1, height: 180 },
                        { viewId: 'title', viewType: 'text', width: -1, height: -2, marginTop: 12, marginLeft: 12, marginRight: 12 },
                        { viewId: 'desc', viewType: 'text', width: -1, height: -2, marginLeft: 12, marginTop: 4, marginRight: 12 },
                        { viewId: 'divider', width: -1, height: 0.5, marginTop: 13 },
                        {
                            viewId: 'tail',
                            direction: 'horizontal',
                            width: -1,
                            height: 22,
                            marginLeft: 12,
                            layout: [
                                { viewId: 'tailIcon', viewType: 'image', width: 12, height: 12, gravity: 'centerVertical' },
                                { viewId: 'tailText', viewType: 'text', width: -2, height: -2, gravity: 'centerVertical', marginLeft: 4 },
                            ],
                        },
                    ],
                },
                {
                    viewId: 'progressRight',
                    viewType: 'circularProgress',
                    height: 28,
                    width: 28,
                    marginLeft: 8,
                    gravity: 'centerVertical',
                },
            ],
        },
        attributes: {
            viewId: 'flash_file',
            attributes: [
                {
                    viewId: 'progressLeft',
                    progress: 0,
                    state: 'none',
                    event: { init: { visibleCtr: { visible: '$$leftProgressVisible', visibleBehave: 'gone', src: '1' } } },
                },
                {
                    viewId: 'file',
                    radius: 10,
                    schema: resolveCardUrl(song, meta),
                    backgroundColor: 'bubble_guest',
                    event: { init: { resetWidth: { width: '$$width' } } },
                    attributes: [
                        {
                            viewId: 'image',
                            src: song.coverUrl,
                            backgroundColor: '#33707999',
                            contentMode: 2,
                            failedSrc: DEFAULT_COVER,
                        },
                        {
                            viewId: 'title',
                            text: song.title,
                            textSize: 17,
                            textColor: 'bubble_guest_text_primary',
                            maxLine: 2,
                            ellipsize: 'middle',
                        },
                        {
                            viewId: 'desc',
                            text: description,
                            textColor: 'bubble_guest_text_secondary',
                            textSize: 12,
                            maxLine: 1,
                            lineHeightRatio: 1.14,
                        },
                        { viewId: 'divider', backgroundColor: 'border_standard' },
                        {
                            viewId: 'tail',
                            attributes: [
                                {
                                    viewId: 'tailIcon',
                                    src: meta.icon,
                                    contentMode: 2,
                                    radius: 2,
                                    failedSrc: DEFAULT_COVER,
                                },
                                {
                                    viewId: 'tailText',
                                    text: `${meta.label} · 音乐分享`,
                                    textSize: 12,
                                    textColor: '#909094',
                                },
                            ],
                        },
                    ],
                },
                {
                    viewId: 'progressRight',
                    progress: 0,
                    state: 'none',
                    event: { init: { visibleCtr: { visible: '$$rightProgressVisible', visibleBehave: 'gone', src: '1' } } },
                },
            ],
        },
    };
}

function buildQqRichuiMarkdown(songData, platform) {
    const card = buildQqRichuiCard(songData, platform);
    const url = `mqqapi://markdown/node?nodeType=richui&json=${encodeURIComponent(JSON.stringify(card))}`;
    return `[音乐分享](${url})`;
}

function applyPassiveReply(payload, session) {
    const timestamp = Number(session.timestamp);
    const isFresh = timestamp > 0 && Date.now() - timestamp < MSG_TIMEOUT;
    if (session.messageId && isFresh) {
        session.seq = (Number(session.seq) || 0) + 1;
        payload.msg_id = session.messageId;
        payload.msg_seq = session.seq;
    } else if (session.qq?.id && isFresh) {
        payload.event_id = session.qq.id;
    }
    return payload;
}

async function sendQqRichuiCard(session, songData, platform, logger = console) {
    if (session.platform !== 'qq') return false;

    try {
        const payload = applyPassiveReply({
            msg_type: 2,
            markdown: { content: buildQqRichuiMarkdown(songData, platform) },
        }, session);

        if (session.isDirect) {
            const target = session.userId || String(session.channelId || '').replace(/^private:/, '');
            await session.bot.internal.sendPrivateMessage(target, payload);
        } else {
            await session.bot.internal.sendMessage(session.channelId, payload);
        }

        logger.info(`🎴 [QQ RichUI] 已发送 ${resolvePlatformMeta(platform).label} 音乐卡片`);
        return true;
    } catch (error) {
        logger.warn(`⚠️ [QQ RichUI] 音乐卡片发送失败，继续发送普通歌曲字段: ${error?.message || error}`);
        return false;
    }
}

exports.PLATFORM_META = PLATFORM_META;
exports.normalizeSongData = normalizeSongData;
exports.buildQqRichuiCard = buildQqRichuiCard;
exports.buildQqRichuiMarkdown = buildQqRichuiMarkdown;
exports.applyPassiveReply = applyPassiveReply;
exports.sendQqRichuiCard = sendQqRichuiCard;
