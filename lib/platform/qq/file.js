"use strict";

const fs = require('node:fs/promises');
const { fileURLToPath } = require('node:url');
const { h } = require('koishi');

function createQqFileUtils(musicLogger) {
    const { logInfo, logDebug } = musicLogger;

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

        const internal = session.bot?.internal;
        const isDirect = Boolean(session.isDirect || session.channelId?.startsWith('private:'));
        const target = isDirect
            ? (session.userId || String(session.channelId || '').replace(/^private:/, ''))
            : session.channelId;

        const fileResponse = isDirect
            ? await internal.sendFilePrivate(target, fileRequest)
            : await internal.sendFileGuild(target, fileRequest);
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

        const messageResponse = isDirect
            ? await internal.sendPrivateMessage(target, msgPayload)
            : await internal.sendMessage(target, msgPayload);
        logInfo('✅ QQ 文件发送成功', filename);
        return messageResponse;
    }

    function createFallbackElement(fileUrl, filename, type) {
        if (type === 'audio') return h.audio(fileUrl);
        if (type === 'video') return h.video(fileUrl);
        return h.file(fileUrl, { title: filename, filename, name: filename });
    }

    async function sendQQFile(_ctx, session, fileUrl, filename, mimeType, type) {
        const internal = session.bot?.internal;
        if (internal && (internal.sendFileGuild || internal.sendFilePrivate)) {
            try {
                const response = await sendFileViaOfficialAdapter(session, fileUrl, filename, mimeType);
                return { element: null, messageIds: response?.id && !response.audit_id ? [response.id] : [] };
            } catch (error) {
                logInfo('⚠️ QQ 原生文件接口上传失败，降级走元素发送', filename);
                logDebug('QQ 原生文件接口上传异常', error);
            }
        }
        return { element: createFallbackElement(fileUrl, filename, type), messageIds: [] };
    }

    return { sendQQFile };
}

module.exports = { createQqFileUtils };
