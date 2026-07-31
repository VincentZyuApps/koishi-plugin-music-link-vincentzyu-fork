"use strict";

async function sendMusicCard(session, songData, platform, _config, logger) {
    if (session.platform !== 'onebot' || !session.onebot) return;
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

        logger.info(`🎵 [发送卡片] ${JSON.stringify(musicCard)}`);
        if (session.guildId) {
            await session.onebot._request('send_group_msg', { group_id: session.guildId, message: [musicCard] });
        } else {
            await session.onebot._request('send_private_msg', { user_id: session.userId, message: [musicCard] });
        }
    } catch (error) {
        logger.error('❌ [发送失败] 发送音乐卡片失败:', error);
    }
}

module.exports = { sendMusicCard };
