"use strict";

const { summarizeError } = require('../../util/logger');

async function sendMusicCard(session, songData, platform, musicLogger) {
    if (session.platform !== 'onebot' || !session.onebot) return;
    const { logInfo, logDebug } = musicLogger;
    try {
        let musicCard;
        if (platform === 'netease') {
            musicCard = { type: 'music', data: { type: '163', id: songData.id } };
        } else if (platform === 'tencent') {
            musicCard = {
                type: 'music',
                data: {
                    type: 'custom',
                    url: songData.link || `https://y.qq.com/n/ryqq/songDetail/${songData.mid || songData.id}`,
                    audio: songData.url,
                    title: songData.song || songData.name,
                    content: songData.singer || songData.artist,
                    image: songData.cover || songData.pic,
                },
            };
        } else {
            return;
        }

        logDebug('OneBot 音乐卡片 payload', musicCard);
        if (session.guildId) {
            await session.onebot._request('send_group_msg', { group_id: session.guildId, message: [musicCard] });
        } else {
            await session.onebot._request('send_private_msg', { user_id: session.userId, message: [musicCard] });
        }
        logInfo('✅ OneBot 音乐卡片发送成功', `${platform}，${songData.song || songData.name || songData.id || '未知歌曲'}`);
    } catch (error) {
        logInfo('⚠️ OneBot 音乐卡片发送失败，不影响普通歌曲字段', summarizeError(error));
        logDebug('OneBot 音乐卡片发送异常', error);
    }
}

module.exports = { sendMusicCard };
