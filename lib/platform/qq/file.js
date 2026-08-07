"use strict";

const fs = require('node:fs/promises');
const { fileURLToPath } = require('node:url');
const { h } = require('koishi');

function createQqFileUtils(musicLogger) {
    const { logInfo, logDebug } = musicLogger;
    function isCrackAdapter(session) {
        const result = 'useMarkdownIfAt' in (session.bot?.config || {});
        logDebug('QQ 文件适配器检测结果', result ? 'crack 适配器' : '官方适配器');
        return result;
    }

    function sendFileViaCrackAdapter(_session, fileUrl, filename, type) {
        if (type === 'audio') return h.audio(fileUrl);
        if (type === 'video') return h.video(fileUrl);
        return h.file(fileUrl, { title: filename, filename, name: filename });
    }

    function getFileTypeFromMime(mimeType) {
        if (!mimeType) return 4;
        const type = mimeType.toLowerCase();
        if (type.startsWith('audio/')) return 3;  // 语音
        if (type.startsWith('video/')) return 2;  // 视频
        if (type.startsWith('image/')) return 1;  // 图片
        return 4;  // 默认文件
    }

    async function sendFileViaOfficialAdapter(session, fileUrl, filename, mimeType) {
        const fileType = getFileTypeFromMime(mimeType);
        logDebug('QQ 文件类型映射', { filename, mimeType, fileType });
        const fileRequest = { file_type: fileType, srv_send_msg: false };
        const base64Match = /^data:([\w/.+-]+);base64,(.*)$/.exec(fileUrl);
        if (base64Match?.[2]) {
            fileRequest.file_data = base64Match[2];
        } else if (fileUrl.startsWith('file://')) {
            fileRequest.file_data = (await fs.readFile(fileURLToPath(fileUrl))).toString('base64');
        } else {
            fileRequest.url = fileUrl;
        }

        const fileResponse = session.isDirect
            ? await session.bot.internal.sendFilePrivate(session.userId, fileRequest)
            : await session.bot.internal.sendFileGuild(session.channelId, fileRequest);
        logDebug('QQ 官方文件上传结果', () => ({
            filename,
            fileUuid: fileResponse.file_uuid,
            ttl: fileResponse.ttl,
        }));

        const msgPayload = { msg_type: 7, media: fileResponse };
        const replyTimeout = 5 * 60 * 1000 - 2000;
        if (session.messageId && session.timestamp && Date.now() - session.timestamp < replyTimeout) {
            session.seq = (session.seq || 0) + 1;
            msgPayload.msg_id = session.messageId;
            msgPayload.msg_seq = session.seq;
        }

        const messageResponse = session.isDirect
            ? await session.bot.internal.sendPrivateMessage(session.userId, msgPayload)
            : await session.bot.internal.sendMessage(session.channelId, msgPayload);
        logInfo('✅ QQ 文件发送成功', filename);
        return messageResponse;
    }

    async function sendQQFile(_ctx, session, fileUrl, filename, mimeType, type) {
        if (isCrackAdapter(session)) {
            return { element: sendFileViaCrackAdapter(session, fileUrl, filename, type), messageIds: [] };
        }
        const response = await sendFileViaOfficialAdapter(session, fileUrl, filename, mimeType);
        return { element: null, messageIds: response?.id && !response.audit_id ? [response.id] : [] };
    }

    return { isCrackAdapter, sendQQFile };
}

module.exports = { createQqFileUtils };
