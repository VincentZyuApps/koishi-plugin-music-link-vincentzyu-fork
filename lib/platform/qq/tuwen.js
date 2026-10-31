"use strict";

const { h } = require('koishi');
const { summarizeError } = require('../../util/logger');
const { normalizeSongData, PLATFORM_META } = require('./richui');

const DEFAULT_COVER = 'https://downv6.qq.com/qqface/default_cover.png';
const MSG_TIMEOUT = 5 * 60 * 1000 - 2000;

function normalizeHttpsUrl(value) {
    if (!value || typeof value !== 'string') return '';
    const trimmed = value.trim();
    return trimmed.startsWith('http://') ? `https://${trimmed.slice(7)}` : trimmed;
}

function normalizeCardUrl(value) {
    let url = normalizeHttpsUrl(value);
    if (!url || !url.startsWith('https://')) {
        return 'https://y.qq.com/';
    }
    // 移除前端 hash 路由锚点（如网易云 music.163.com/#/song -> music.163.com/song）
    return url.replace('music.163.com/#/song', 'music.163.com/song');
}

function resolvePlatformMeta(platform) {
    return PLATFORM_META[platform] || {
        label: platform || '音乐',
        icon: DEFAULT_COVER,
        detailUrl: () => '',
    };
}

function resolveCardUrl(song, meta) {
    return meta.detailUrl(song) || song.explicitLink || song.audioUrl || 'https://y.qq.com/';
}

function buildQqTuwenPayload(songData, platform) {
    const song = normalizeSongData(songData);
    const meta = resolvePlatformMeta(platform);

    // 1. title: 1-50 字符
    const title = (song.title || '未知歌曲').slice(0, 50);

    // 2. description: 1-200 字符 (歌手 · 专辑 [音质/平台])
    const descParts = [];
    if (song.artistText) descParts.push(song.artistText);
    if (song.albumText) descParts.push(song.albumText);
    if (song.quality) descParts.push(`[${song.quality}]`);
    let description = descParts.join(' · ');
    if (!description) {
        description = `${meta.label || '音乐'}推荐`;
    }
    description = description.slice(0, 200);

    // 3. pic_url: 必须为 HTTPS，封面兜底
    let pic_url = normalizeHttpsUrl(song.coverUrl);
    if (!pic_url || !pic_url.startsWith('https://')) {
        pic_url = DEFAULT_COVER;
    }

    // 4. url: 必须为 HTTPS 跳转页，清理 hash 路由
    const url = normalizeCardUrl(resolveCardUrl(song, meta));

    return {
        msg_type: 8,
        card: {
            type: 'tuwen',
            content: {
                title,
                description,
                url,
                pic_url,
            },
        },
    };
}

async function sendQqTuwenCard(session, songData, platform, musicLogger) {
    // 仅针对 qq 适配器生效
    if (session.platform !== 'qq') return false;
    const { logInfo, logDebug } = musicLogger;

    const payload = buildQqTuwenPayload(songData, platform);
    const isDirect = Boolean(session.isDirect || session.channelId?.startsWith('private:'));
    const target = isDirect
        ? (session.userId || String(session.channelId || '').replace(/^private:/, ''))
        : session.channelId;

    // 自动装配被动回复（5分钟窗口内携带 msg_id / msg_seq）
    if (session.messageId && session.timestamp && Date.now() - session.timestamp < MSG_TIMEOUT) {
        session.seq = (session.seq || 0) + 1;
        payload.msg_id = session.messageId;
        payload.msg_seq = session.seq;
    }

    try {
        // 核心：无嗅探，有 internal 原生接口则直接发 JSON（官方与 crack 双适配器 100% 通用）
        if (session.bot?.internal) {
            logDebug('🚀 [QQ图文卡片] 走 bot.internal 原生接口发送 JSON', payload);
            let res;
            if (isDirect) {
                res = await session.bot.internal.sendPrivateMessage(target, payload);
            } else {
                res = await session.bot.internal.sendMessage(target, payload);
            }
            logInfo('✅ QQ 图文卡片 (msg_type=8) 发送成功', `${resolvePlatformMeta(platform).label || platform} - ${payload.card.content.title} | id=${res?.id || 'ok'}`);
            logDebug('QQ 图文卡片响应详情', res);
            return true;
        } else {
            // 兜底降级：走 session.send(h('qq:card'))
            logDebug('🚀 [QQ图文卡片] 降级走 session.send(qq:card) 元素');
            const res = await session.send(h('qq:card', payload.card));
            logInfo('✅ QQ 图文卡片 (msg_type=8) 发送成功', `${resolvePlatformMeta(platform).label || platform} - ${payload.card.content.title}`);
            logDebug('QQ 图文卡片元素响应', res);
            return true;
        }
    } catch (error) {
        logInfo('⚠️ QQ 图文卡片发送失败，继续正常点歌流程', summarizeError(error));
        logDebug('QQ 图文卡片发送异常', error);
        return false;
    }
}

module.exports = {
    DEFAULT_COVER,
    resolvePlatformMeta,
    resolveCardUrl,
    normalizeHttpsUrl,
    buildQqTuwenPayload,
    sendQqTuwenCard,
};
