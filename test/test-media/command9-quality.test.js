"use strict";

const test = require('node:test');
const assert = require('node:assert/strict');
const { registerCommand9 } = require('../../lib/command/command9_luoyue');

function createCommandContext() {
    let action;
    const chain = {
        option: () => chain,
        example: () => chain,
        action: (callback) => {
            action = callback;
            return chain;
        },
    };
    return {
        ctx: {
            command: () => chain,
            logger: { error: () => {} },
        },
        getAction: () => action,
    };
}

const silentMusicLogger = {
    logInfo() {},
    logDebug() {},
};

test('command9 resolves an unavailable initial quality before sending fields', async () => {
    const commandContext = createCommandContext();
    const calls = [];
    let generated;
    const config = {
        serverSelect: 'command9',
        command9: '落月点歌',
        command9_platforms: ['netease'],
        command9_searchListLength: 1,
        command9_maxDuration: 1800,
        command9_luoyueApiBaseUrl: 'https://api.example.test',
        command9_NeteaseMusicQuality: 9,
        command9_QQMusicQuality: 14,
        command9_KugouMusicQuality: 'high',
        command9_AutoDowngradeQuality: true,
        command9_telegramCaptionMode: 'separate-image',
        command9_AddQqRichuiCard: false,
        command9_AddOnebotMusicCard: false,
        command9_returnDataField: [{ data: 'url', describe: '音频', type: 'audio', enable: true }],
        skipSongListSelection: true,
        enableQuote: false,
    };
    const smartApiGet = async (requestUrl) => {
        calls.push(requestUrl);
        if (requestUrl.includes('/lyric?')) return { code: 200, data: { lrc: '[00:00.000]test' } };
        if (requestUrl.includes('word=')) {
            return {
                code: 200,
                data: [{ id: 42, song: 'Test Song', singer: 'Test Artist', interval: '3分0秒', cover: 'https://img.test/cover.jpg' }],
            };
        }
        if (requestUrl.includes('quality=9')) return { code: 503, data: null };
        if (requestUrl.includes('quality=8')) {
            return {
                code: 200,
                data: {
                    id: 42,
                    song: 'Test Song',
                    singer: 'Test Artist',
                    cover: 'https://img.test/cover.jpg',
                    url: 'https://media.test/surround.flac',
                    quality: '沉浸环绕声（Surround Audio）',
                },
            };
        }
        throw new Error(`Unexpected request: ${requestUrl}`);
    };

    registerCommand9(commandContext.ctx, config, silentMusicLogger, {
        parseRenderMode: () => ({}),
        generateResponse: async (...args) => {
            generated = args;
            return '';
        },
        renderSongList: async () => null,
        sendMusicCard: async () => {},
        sendQqRichuiCard: async () => {},
        smartApiGet,
    });

    const session = {
        messageId: 'source-message',
        platform: 'telegram',
        text: (key) => key,
    };
    const result = await commandContext.getAction()({ session, options: {} }, 'Test Song');

    assert.equal(result, '');
    assert.equal(generated[1].url, 'https://media.test/surround.flac');
    assert.deepEqual(generated[4].qualityFallback.candidates, [8, 7, 6, 5, 4, 3, 2, 1]);
    assert.equal(generated[4].telegramCaptionMode, 'separate-image');
    assert.equal(generated[4].telegramCaptionConfigKey, 'command9_telegramCaptionMode');
    assert.equal(generated[4].qualityFallback.initialDowngradeFrom, 9);
    assert.equal(calls.some((requestUrl) => requestUrl.includes('quality=9') && !requestUrl.includes('word=')), true);
    assert.equal(calls.some((requestUrl) => requestUrl.includes('quality=8')), true);
});

test('command9 requests Kugou LRC and accepts KRC as a fallback', async () => {
    const commandContext = createCommandContext();
    const calls = [];
    let generated;
    const config = {
        serverSelect: 'command9',
        command9: '落月点歌',
        command9_platforms: ['kugou'],
        command9_searchListLength: 1,
        command9_maxDuration: 1800,
        command9_luoyueApiBaseUrl: 'https://api.example.test',
        command9_NeteaseMusicQuality: 9,
        command9_QQMusicQuality: 14,
        command9_KugouMusicQuality: 'high',
        command9_AutoDowngradeQuality: true,
        command9_telegramCaptionMode: 'separate-lyrics',
        command9_AddQqRichuiCard: false,
        command9_AddOnebotMusicCard: false,
        command9_returnDataField: [{ data: 'lrc', describe: '歌词', type: 'text', enable: true }],
        skipSongListSelection: true,
        enableQuote: false,
    };
    const smartApiGet = async (requestUrl) => {
        calls.push(requestUrl);
        if (requestUrl.includes('/lyric?')) {
            return { code: 200, data: { lrc: '', krc: '[0,1000]<0,1000,0>test' } };
        }
        if (requestUrl.includes('word=')) {
            return {
                code: 200,
                data: [{
                    hash: 'ABC123',
                    album_audio_id: '456',
                    song: 'Test Song',
                    singer: 'Test Artist',
                    interval: '3分0秒',
                }],
            };
        }
        if (requestUrl.includes('quality=high')) {
            return {
                code: 200,
                data: {
                    hash: 'ABC123',
                    album_audio_id: '456',
                    song: 'Test Song',
                    singer: 'Test Artist',
                    url: 'https://media.test/song.flac',
                    quality: 'SQ无损',
                },
            };
        }
        throw new Error(`Unexpected request: ${requestUrl}`);
    };

    registerCommand9(commandContext.ctx, config, silentMusicLogger, {
        parseRenderMode: () => ({}),
        generateResponse: async (...args) => {
            generated = args;
            return '';
        },
        renderSongList: async () => null,
        sendMusicCard: async () => {},
        sendQqRichuiCard: async () => {},
        smartApiGet,
    });

    const session = {
        messageId: 'source-message',
        platform: 'telegram',
        text: (key) => key,
    };
    const result = await commandContext.getAction()({ session, options: {} }, 'Test Song');

    assert.equal(result, '');
    assert.equal(generated[1].lrc, '\n[0,1000]<0,1000,0>test');
    const lyricRequest = calls.find((requestUrl) => requestUrl.includes('/lyric?'));
    assert.ok(lyricRequest);
    assert.equal(new URL(lyricRequest).searchParams.get('fmt'), 'lrc');
});
