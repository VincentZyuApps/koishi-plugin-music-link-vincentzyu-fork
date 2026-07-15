"use strict";

const assert = require('node:assert/strict');
const {
    buildQqRichuiCard,
    buildQqRichuiMarkdown,
    normalizeSongData,
    sendQqRichuiCard,
} = require('../../lib/qq/richui');

function getCardFields(card) {
    const file = card.attributes.attributes.find(item => item.viewId === 'file');
    const fields = Object.fromEntries(file.attributes.map(item => [item.viewId, item]));
    const tailFields = Object.fromEntries(fields.tail.attributes.map(item => [item.viewId, item]));
    return { file, fields, tailFields };
}

function decodeMarkdownCard(markdown) {
    const match = /^\[音乐分享\]\(mqqapi:\/\/markdown\/node\?nodeType=richui&json=(.+)\)$/.exec(markdown);
    assert.ok(match, 'RichUI Markdown wrapper should be valid');
    return JSON.parse(decodeURIComponent(match[1]));
}

async function main() {
    const netease = buildQqRichuiCard({
        id: 1999253939,
        name: 'ハナタバ',
        artist: 'MIMI',
        album: 'ハナタバ',
        pic: 'http://p2.music.126.net/example.jpg',
        url: 'https://example.com/audio.mp3',
    }, 'netease');
    const neteaseFields = getCardFields(netease);
    assert.equal(neteaseFields.file.schema, 'https://music.163.com/#/song?id=1999253939');
    assert.equal(neteaseFields.fields.title.text, 'ハナタバ');
    assert.equal(neteaseFields.fields.desc.text, 'MIMI · ハナタバ');
    assert.equal(neteaseFields.fields.image.src, 'https://p2.music.126.net/example.jpg');
    assert.equal(neteaseFields.tailFields.tailText.text, '网易云音乐 · 音乐分享');

    const tencent = decodeMarkdownCard(buildQqRichuiMarkdown({
        mid: '004KHRXR1bXwIL',
        song: 'サイエンス',
        singer: 'MIMI/重音テト',
        album: 'サイエンス',
        cover: 'https://y.gtimg.cn/example.jpg',
    }, 'tencent'));
    const tencentFields = getCardFields(tencent);
    assert.equal(tencentFields.file.schema, 'https://y.qq.com/n/ryqq/songDetail/004KHRXR1bXwIL');
    assert.equal(tencentFields.tailFields.tailText.text, 'QQ音乐 · 音乐分享');

    const kugou = buildQqRichuiCard({
        hash: 'ABC123',
        album_id: '42',
        name: '酷狗测试',
        artist: '歌手',
        album: '专辑',
        cover: 'https://example.com/cover.jpg',
    }, 'kugou');
    const kugouFields = getCardFields(kugou);
    assert.equal(kugouFields.file.schema, 'https://www.kugou.com/song/#hash=ABC123&album_id=42');
    assert.equal(kugouFields.tailFields.tailText.text, '酷狗音乐 · 音乐分享');

    assert.equal(normalizeSongData({ album: {} }).albumText, '');

    let groupCall;
    const groupSession = {
        platform: 'qq',
        isDirect: false,
        channelId: 'group-openid',
        messageId: 'message-id',
        timestamp: Date.now(),
        bot: {
            internal: {
                sendMessage: async (...args) => { groupCall = args; },
            },
        },
    };
    assert.equal(await sendQqRichuiCard(groupSession, { id: 1, name: '测试' }, 'netease', { info() {}, warn() {} }), true);
    assert.equal(groupCall[0], 'group-openid');
    assert.equal(groupCall[1].msg_type, 2);
    assert.equal(groupCall[1].msg_id, 'message-id');
    assert.equal(groupCall[1].msg_seq, 1);

    let privateCall;
    const privateSession = {
        platform: 'qq',
        isDirect: true,
        channelId: 'private:user-openid',
        userId: 'user-openid',
        bot: {
            internal: {
                sendPrivateMessage: async (...args) => { privateCall = args; },
            },
        },
    };
    assert.equal(await sendQqRichuiCard(privateSession, { url: 'https://example.com/audio.mp3' }, 'unknown', { info() {}, warn() {} }), true);
    assert.equal(privateCall[0], 'user-openid');
    assert.equal(privateCall[1].markdown.content.startsWith('[音乐分享](mqqapi://'), true);

    const nonQqSession = { platform: 'onebot' };
    assert.equal(await sendQqRichuiCard(nonQqSession, {}, 'netease'), false);

    console.log('QQ RichUI tests passed');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
