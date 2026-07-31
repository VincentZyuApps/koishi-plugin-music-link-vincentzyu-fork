"use strict";

const fs = require('node:fs/promises');
const { fileURLToPath } = require('node:url');
const { h } = require('koishi');

function createQqFileUtils({ logInfo }) {
    function isCrackAdapter(session) {
        const result = 'useMarkdownIfAt' in (session.bot?.config || {});
        logInfo(`🔍 [适配器检测] 当前识别为: 【 ${result ? '🔨 crack 适配器' : '📦 官方适配器'}】`);
        return result;
    }

    function sendFileViaCrackAdapter(_session, fileUrl, filename) {
        return h.file(fileUrl, { title: filename, filename, name: filename });
    }

    async function sendFileViaOfficialAdapter(session, fileUrl, filename) {
        const fileRequest = { file_type: 4, srv_send_msg: false };
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
        logInfo(`📤 [Official文件上传] 成功: ${filename}, file_uuid: ${fileResponse.file_uuid}, ttl: ${fileResponse.ttl}`);

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
        logInfo(`✅ [Official文件发送] 成功: ${filename}`);
        return messageResponse;
    }

    async function sendQQFile(_ctx, session, fileUrl, filename) {
        if (isCrackAdapter(session)) {
            return { element: sendFileViaCrackAdapter(session, fileUrl, filename), messageIds: [] };
        }
        const response = await sendFileViaOfficialAdapter(session, fileUrl, filename);
        return { element: null, messageIds: response?.id && !response.audit_id ? [response.id] : [] };
    }

    return { isCrackAdapter, sendQQFile };
}

module.exports = { createQqFileUtils };
