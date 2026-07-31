"use strict";

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    getQualityCandidates,
    getQualityLabel,
    isQualityRelatedMediaError,
    isTerminalMediaError,
    createQualityFallbackState,
    sendMediaWithFallback,
    splitTextByLength,
} = require('../../lib/util/media');
const {
    TELEGRAM_CAPTION_MODES,
    TELEGRAM_TEXT_CHUNK_LENGTH,
    createTelegramSafePlan,
    trySendTelegramSafeItems,
} = require('../../lib/platform/telegram/send');

function tooLargeError() {
    const error = new Error('Telegram API error 413. Request Entity Too Large');
    error.response = { status: 413 };
    return error;
}

test('returns quality candidates from the selected quality to the minimum', () => {
    assert.deepEqual(getQualityCandidates('netease', 5), [5, 4, 3, 2, 1]);
    assert.deepEqual(getQualityCandidates('tencent', 10), [10, 8, 4]);
    assert.deepEqual(getQualityCandidates('kugou', 'flac'), ['flac', '320', '128']);
});

test('formats numeric API quality values with their readable labels', () => {
    assert.equal(getQualityLabel('netease', 9, 4), 'HQ极高（320k，exhigh）');
    assert.equal(getQualityLabel('kugou', 'high', 'flac'), 'SQ无损（flac）');
});

test('downgrades after a 413 and reports the successful media id', async () => {
    const state = createQualityFallbackState(
        { url: 'https://media/high.flac', quality: 'Master' },
        {
            candidates: [9, 8],
            fetchData: async () => ({ url: 'https://media/lower.flac', quality: 'Surround' }),
        },
    );
    const attempts = [];
    let downgrade;

    const result = await sendMediaWithFallback({
        state,
        allowQualityFallback: true,
        prepare: async (data) => data.url,
        send: async (mediaUrl) => {
            attempts.push(mediaUrl);
            if (mediaUrl.includes('high')) throw tooLargeError();
            return ['message-2'];
        },
        onDowngraded: async (event) => { downgrade = event; },
    });

    assert.equal(result.success, true);
    assert.deepEqual(attempts, ['https://media/high.flac', 'https://media/lower.flac']);
    assert.equal(state.index, 1);
    assert.deepEqual(downgrade.messageIds, ['message-2']);
});

test('retries one transient failure at the same quality before downgrading', async () => {
    const state = createQualityFallbackState(
        { url: 'https://media/high.flac' },
        {
            candidates: [9, 8],
            fetchData: async () => ({ url: 'https://media/lower.mp3' }),
        },
    );
    const attempts = [];

    const result = await sendMediaWithFallback({
        state,
        allowQualityFallback: true,
        prepare: async (data) => data.url,
        send: async (mediaUrl) => {
            attempts.push(mediaUrl);
            if (mediaUrl.includes('high')) throw new Error('ETIMEDOUT while uploading');
            return ['message-3'];
        },
    });

    assert.equal(result.success, true);
    assert.deepEqual(attempts, [
        'https://media/high.flac',
        'https://media/high.flac',
        'https://media/lower.mp3',
    ]);
});

test('does not downgrade terminal permission errors', async () => {
    let fetchCount = 0;
    const state = createQualityFallbackState(
        { url: 'https://media/high.flac' },
        {
            candidates: [9, 8],
            fetchData: async () => {
                fetchCount++;
                return { url: 'https://media/lower.mp3' };
            },
        },
    );
    const error = new Error('Forbidden: bot was blocked');
    error.response = { status: 403 };

    const result = await sendMediaWithFallback({
        state,
        allowQualityFallback: true,
        prepare: async (data) => data.url,
        send: async () => { throw error; },
    });

    assert.equal(result.success, false);
    assert.equal(fetchCount, 0);
    assert.equal(state.index, 0);
});

test('keeps media isolated without downgrading when the option is disabled', async () => {
    let fetchCount = 0;
    const state = createQualityFallbackState(
        { url: 'https://media/high.flac' },
        {
            enabled: false,
            candidates: [9, 8],
            fetchData: async () => {
                fetchCount++;
                return { url: 'https://media/lower.mp3' };
            },
        },
    );

    const result = await sendMediaWithFallback({
        state,
        allowQualityFallback: true,
        prepare: async (data) => data.url,
        send: async () => { throw tooLargeError(); },
    });

    assert.equal(result.success, false);
    assert.equal(fetchCount, 0);
});

test('shares the downgraded quality with later media fields', async () => {
    const state = createQualityFallbackState(
        { url: 'https://media/high.flac' },
        {
            candidates: [9, 8],
            fetchData: async () => ({ url: 'https://media/lower.mp3' }),
        },
    );
    const attempts = [];
    const options = {
        state,
        allowQualityFallback: true,
        prepare: async (data) => data.url,
        send: async (mediaUrl) => {
            attempts.push(mediaUrl);
            if (mediaUrl.includes('high')) throw tooLargeError();
            return ['message'];
        },
    };

    assert.equal((await sendMediaWithFallback(options)).success, true);
    assert.equal((await sendMediaWithFallback(options)).success, true);
    assert.deepEqual(attempts, [
        'https://media/high.flac',
        'https://media/lower.mp3',
        'https://media/lower.mp3',
    ]);
});

test('skips duplicate quality URLs instead of uploading the same content again', async () => {
    const requested = [];
    const state = createQualityFallbackState(
        { url: 'https://media/same.flac' },
        {
            candidates: [9, 8, 7],
            fetchData: async (quality) => {
                requested.push(quality);
                return quality === 8
                    ? { url: 'https://media/same.flac' }
                    : { url: 'https://media/lower.mp3' };
            },
        },
    );

    const result = await sendMediaWithFallback({
        state,
        allowQualityFallback: true,
        prepare: async (data) => data.url,
        send: async (mediaUrl) => {
            if (mediaUrl.includes('same')) throw tooLargeError();
            return ['message'];
        },
    });

    assert.equal(result.success, true);
    assert.deepEqual(requested, [8, 7]);
    assert.equal(state.index, 2);
});

test('reports an initial API-level downgrade after media succeeds', async () => {
    const state = createQualityFallbackState(
        { url: 'https://media/available.mp3', quality: 'HQ 320k' },
        {
            candidates: [4, 3, 2, 1],
            initialDowngradeFrom: 9,
            fetchData: async () => null,
        },
    );
    let downgrade;

    await sendMediaWithFallback({
        state,
        allowQualityFallback: true,
        prepare: async (data) => data.url,
        send: async () => ['message-4'],
        onDowngraded: async (event) => { downgrade = event; },
    });

    assert.equal(downgrade.fromCandidate, 9);
    assert.equal(downgrade.toCandidate, 4);
    assert.equal(state.pendingInitialDowngradeFrom, undefined);
});

test('classifies payload and permission errors correctly', () => {
    assert.equal(isQualityRelatedMediaError(tooLargeError()), true);
    assert.equal(isQualityRelatedMediaError(new Error('Bad Request: AUDIO_CONTENT_TYPE_INVALID')), true);
    const forbidden = new Error('Forbidden');
    forbidden.status = 403;
    assert.equal(isTerminalMediaError(forbidden), true);
});

test('does not turn successful media into a failure when the notice fails', async () => {
    const state = createQualityFallbackState(
        { url: 'https://media/high.flac' },
        {
            candidates: [9, 8],
            fetchData: async () => ({ url: 'https://media/lower.mp3' }),
        },
    );

    const result = await sendMediaWithFallback({
        state,
        allowQualityFallback: true,
        prepare: async (data) => data.url,
        send: async (mediaUrl) => {
            if (mediaUrl.includes('high')) throw tooLargeError();
            return ['message'];
        },
        onDowngraded: async () => { throw new Error('notice failed'); },
    });

    assert.equal(result.success, true);
});

test('splits long lyrics on line boundaries', () => {
    const chunks = splitTextByLength('12345\n67890\nabcde', 11);
    assert.deepEqual(chunks, ['12345\n67890', 'abcde']);
});

function createTelegramItems(lyric = 'test lyric') {
    return [
        { type: 'image', field: { data: 'pic', describe: '封面' } },
        { type: 'text', field: { data: 'name', describe: '歌曲名称', value: 'Test Song' } },
        { type: 'text', field: { data: 'lrc', describe: '歌词', value: lyric } },
    ];
}

function formatTelegramTestText(item) {
    return `${item.field.describe}：${item.field.value}`;
}

test('keeps the legacy Telegram image and text batch unchanged', () => {
    const items = createTelegramItems();
    assert.deepEqual(createTelegramSafePlan(items, TELEGRAM_CAPTION_MODES.LEGACY), [
        { type: 'batch', items },
    ]);
});

test('separates lyrics from the Telegram image caption and chunks them at 3333 characters', async () => {
    const items = createTelegramItems('x'.repeat(TELEGRAM_TEXT_CHUNK_LENGTH + 100));
    const batches = [];
    const textChunks = [];

    await trySendTelegramSafeItems({
        session: {
            platform: 'telegram',
            send: async (payload) => {
                if (typeof payload === 'string') batches.push(payload);
                else textChunks.push(payload.attrs.content);
                return ['message'];
            },
        },
        logger: { warn: () => {} },
        safeItems: items,
        mode: TELEGRAM_CAPTION_MODES.SEPARATE_LYRICS,
        formatText: formatTelegramTestText,
        createSafeElement: (item) => item.type === 'image' ? '<image/>' : formatTelegramTestText(item),
    });

    assert.equal(batches[0], '<image/>\n歌曲名称：Test Song');
    assert.equal(textChunks.length, 2);
    assert.equal(textChunks[0].length, TELEGRAM_TEXT_CHUNK_LENGTH);
    assert.equal(textChunks[0].startsWith('歌词：'), true);
    assert.equal(textChunks[1].startsWith('歌词：'), false);
});

test('sends Telegram images independently and combines all text in separate-image mode', async () => {
    const items = createTelegramItems('short lyric');
    const calls = [];

    await trySendTelegramSafeItems({
        session: {
            platform: 'telegram',
            send: async (payload) => {
                calls.push([typeof payload === 'string' ? 'image' : 'text', payload]);
                return ['message'];
            },
        },
        logger: { warn: () => {} },
        safeItems: items,
        mode: TELEGRAM_CAPTION_MODES.SEPARATE_IMAGE,
        formatText: formatTelegramTestText,
        createSafeElement: (item) => item.type === 'image' ? '<image/>' : formatTelegramTestText(item),
    });

    assert.equal(calls[0][0], 'image');
    assert.equal(calls[0][1], '<image/>');
    assert.equal(calls[1][0], 'text');
    assert.equal(calls[1][1].attrs.content, '歌曲名称：Test Song\n歌词：short lyric');
});

test('reports an empty Telegram send result without changing the selected strategy', async () => {
    const items = createTelegramItems();
    const warnings = [];
    let batchAttempts = 0;

    await trySendTelegramSafeItems({
        session: {
            platform: 'telegram',
            send: async () => { batchAttempts++; return []; },
        },
        logger: { warn: (message) => { warnings.push(message); } },
        safeItems: items,
        mode: TELEGRAM_CAPTION_MODES.LEGACY,
        formatText: formatTelegramTestText,
        createSafeElement: (item) => item.type === 'image' ? '<image/>' : formatTelegramTestText(item),
    });

    assert.equal(batchAttempts, 1);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /command\*_telegramCaptionMode/);
    assert.match(warnings[0], /图片单独发送/);
});
