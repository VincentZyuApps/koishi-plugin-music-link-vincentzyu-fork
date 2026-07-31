"use strict";

const test = require('node:test');
const assert = require('node:assert/strict');
const { createQqFileUtils } = require('../../lib/platform/qq/file');

test('returns the QQ official message id for downgrade notices', async () => {
    const utils = createQqFileUtils({ logInfo: () => {} });
    const session = {
        isDirect: false,
        channelId: 'channel-1',
        bot: {
            config: {},
            internal: {
                sendFileGuild: async () => ({ file_uuid: 'file-1', ttl: 300 }),
                sendMessage: async () => ({ id: 'message-1', timestamp: new Date().toISOString() }),
            },
        },
    };

    const result = await utils.sendQQFile(
        null,
        session,
        'data:audio/mpeg;base64,SUQz',
        'song.mp3',
    );

    assert.equal(result.element, null);
    assert.deepEqual(result.messageIds, ['message-1']);
});

test('keeps crack adapter file sending as an h.file element', async () => {
    const utils = createQqFileUtils({ logInfo: () => {} });
    const session = { bot: { config: { useMarkdownIfAt: true } } };
    const result = await utils.sendQQFile(null, session, 'https://example.test/song.mp3', 'song.mp3');

    assert.equal(result.element.type, 'file');
    assert.deepEqual(result.messageIds, []);
});
