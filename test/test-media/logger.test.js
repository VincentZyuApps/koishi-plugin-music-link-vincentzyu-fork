"use strict";

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    createMusicLogger,
    summarizeError,
    stringifyDebugValue,
} = require('../../lib/util/logger');

function createHarness(verboseConsoleLog = false) {
    const entries = [];
    const ctx = {
        logger: {
            info(message) {
                entries.push(message);
            },
        },
    };
    return {
        entries,
        logger: createMusicLogger(ctx, { verboseConsoleLog }),
    };
}

test('always emits info and suppresses debug by default', () => {
    const { entries, logger } = createHarness(false);
    let debugFactoryCalls = 0;

    logger.logInfo('🎼 聚合搜索完成', '总计 60 首');
    logger.logDebug('原始结果', () => {
        debugFactoryCalls++;
        return { count: 60 };
    });

    assert.deepEqual(entries, ['[🎵 INFO] 🎼 聚合搜索完成 | 总计 60 首']);
    assert.equal(debugFactoryCalls, 0);
});

test('emits verbose diagnostics through the same info backend', () => {
    const { entries, logger } = createHarness(true);
    let debugFactoryCalls = 0;

    logger.logDebug('请求诊断', () => {
        debugFactoryCalls++;
        return { status: 400 };
    });

    assert.equal(debugFactoryCalls, 1);
    assert.equal(entries.length, 1);
    assert.match(entries[0], /^\[🐛 DEBUG\] 💥 请求诊断\n/);
    assert.match(entries[0], /"status": 400/);
});

test('serializes errors, circular references and bigint safely', () => {
    const error = new Error('Bad Request');
    error.code = 'ERR_HTTP';
    error.response = { status: 400, data: { message: 'invalid payload' } };
    const value = { error, count: 10n };
    value.self = value;

    const output = stringifyDebugValue(value);

    assert.match(output, /"message": "Bad Request"/);
    assert.match(output, /"status": 400/);
    assert.match(output, /"count": "10n"/);
    assert.match(output, /"self": "\[Circular\]"/);
});

test('redacts secrets and summarizes binary data', () => {
    const output = stringifyDebugValue({
        authorization: 'Bearer private-token',
        nested: { access_token: 'secret-value' },
        url: 'https://example.test/?token=secret-value&id=123',
        buffer: Buffer.from('hello'),
        base64: 'A'.repeat(256),
    });

    assert.doesNotMatch(output, /private-token|secret-value/);
    assert.match(output, /\[REDACTED\]/);
    assert.match(output, /\[Buffer length=5\]/);
    assert.match(output, /\[String length=256\]/);
    assert.match(output, /id=123/);
});

test('summarizes HTTP and QQ errors on one line', () => {
    const error = new Error('Bad Request');
    error.response = {
        status: 400,
        headers: { 'x-tps-trace-id': 'trace-1' },
        data: { code: 40034028, message: 'invalid markdown' },
    };

    assert.equal(
        summarizeError(error),
        'HTTP 400，code=40034028，invalid markdown，trace_id=trace-1',
    );
});

test('keeps logger instances independent', () => {
    const quiet = createHarness(false);
    const verbose = createHarness(true);

    quiet.logger.logDebug('quiet', { value: 1 });
    verbose.logger.logDebug('verbose', { value: 2 });

    assert.equal(quiet.entries.length, 0);
    assert.equal(verbose.entries.length, 1);
});

test('adds default emojis without duplicating explicit status emojis', () => {
    const { entries, logger } = createHarness(true);

    logger.logInfo('普通业务摘要');
    logger.logInfo('⚠️ 已有警告标记');
    logger.logDebug('内部状态');
    logger.logDebug('🌐 API 请求');

    assert.equal(entries[0], '[🎵 INFO] 📝 普通业务摘要');
    assert.equal(entries[1], '[🎵 INFO] ⚠️ 已有警告标记');
    assert.equal(entries[2], '[🐛 DEBUG] 🔍 内部状态');
    assert.equal(entries[3], '[🐛 DEBUG] 🌐 API 请求');
});

test('chooses a semantic emoji for info topics', () => {
    const { entries, logger } = createHarness(false);

    logger.logInfo('搜索开始');
    logger.logInfo('音乐文件下载开始');
    logger.logInfo('SVG 渲染完成');
    logger.logInfo('发送失败，正在回退');

    assert.equal(entries[0], '[🎵 INFO] 🔎 搜索开始');
    assert.equal(entries[1], '[🎵 INFO] 📥 音乐文件下载开始');
    assert.equal(entries[2], '[🎵 INFO] ✅ SVG 渲染完成');
    assert.equal(entries[3], '[🎵 INFO] ⚠️ 发送失败，正在回退');
});

test('chooses a semantic emoji for debug topics', () => {
    const { entries, logger } = createHarness(true);

    logger.logDebug('歌曲详情 API');
    logger.logDebug('缓存文件路径');
    logger.logDebug('SVG 渲染耗时');
    logger.logDebug('RichUI payload');
    logger.logDebug('发送失败诊断');

    assert.equal(entries[0], '[🐛 DEBUG] 🌐 歌曲详情 API');
    assert.equal(entries[1], '[🐛 DEBUG] 📁 缓存文件路径');
    assert.equal(entries[2], '[🐛 DEBUG] ⏱️ SVG 渲染耗时');
    assert.equal(entries[3], '[🐛 DEBUG] 📦 RichUI payload');
    assert.equal(entries[4], '[🐛 DEBUG] 💥 发送失败诊断');
});
