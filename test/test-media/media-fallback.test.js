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
