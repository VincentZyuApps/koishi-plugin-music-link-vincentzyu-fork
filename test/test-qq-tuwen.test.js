"use strict";

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildQqTuwenPayload, normalizeHttpsUrl, sendQqTuwenCard } = require('../lib/platform/qq/tuwen');

test('normalizeHttpsUrl converts http to https', () => {
    assert.equal(normalizeHttpsUrl('http://p1.music.126.net/abc.jpg'), 'https://p1.music.126.net/abc.jpg');
    assert.equal(normalizeHttpsUrl('https://p1.music.126.net/abc.jpg'), 'https://p1.music.126.net/abc.jpg');
    assert.equal(normalizeHttpsUrl(''), '');
});

test('buildQqTuwenPayload constructs valid msg_type=8 payload', () => {
    const songData = {
        name: '透明夜 (feat. 可不)',
        artist: 'MIMI/可不',
        album: '透明夜',
        cover: 'http://imge.kugou.com/stdmusic/400/cover.jpg',
        link: 'http://music.163.com/song?id=123',
        quality: 'SQ无损',
    };

    const payload = buildQqTuwenPayload(songData, 'netease');
    assert.equal(payload.msg_type, 8);
    assert.equal(payload.card.type, 'tuwen');
    assert.equal(payload.card.content.title, '透明夜 (feat. 可不)');
    assert.equal(payload.card.content.description, 'MIMI/可不 · 透明夜 · [SQ无损]');
    assert.equal(payload.card.content.pic_url, 'https://imge.kugou.com/stdmusic/400/cover.jpg');
    assert.equal(payload.card.content.url, 'https://music.163.com/song?id=123');
});

test('sendQqTuwenCard sends via bot.internal when available', async () => {
    let sentTarget = null;
    let sentPayload = null;
    const session = {
        platform: 'qq',
        channelId: 'group_openid_123',
        messageId: 'msg_999',
        timestamp: Date.now(),
        bot: {
            internal: {
                sendMessage: async (target, payload) => {
                    sentTarget = target;
                    sentPayload = payload;
                },
            },
        },
    };

    const silentLogger = { logInfo: () => {}, logDebug: () => {} };
    const ok = await sendQqTuwenCard(session, { name: '测试歌曲' }, 'tencent', silentLogger);

    assert.equal(ok, true);
    assert.equal(sentTarget, 'group_openid_123');
    assert.equal(sentPayload.msg_type, 8);
    assert.equal(sentPayload.msg_id, 'msg_999');
    assert.equal(sentPayload.msg_seq, 1);
    assert.equal(sentPayload.card.content.title, '测试歌曲');
});

test('sendQqTuwenCard skips non-qq sessions gracefully', async () => {
    let sent = false;
    const dummySession = {
        platform: 'onebot',
        send: async () => { sent = true; },
    };
    const silentLogger = { logInfo: () => {}, logDebug: () => {} };
    const res = await sendQqTuwenCard(dummySession, { name: '测试' }, 'netease', silentLogger);
    assert.equal(res, false);
    assert.equal(sent, false);
});
