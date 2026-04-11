"use strict";

const { h } = require('koishi');

/**
 * 文本渲染器 - 生成纯文本格式的歌单
 * @param {string} formattedList - 格式化后的歌单文本
 * @param {Object} config - 配置对象
 * @param {Object} options - 额外选项
 * @returns {{payload: Array, isText: boolean}} 文本消息负载
 */
function renderSongListText(formattedList, config, options = {}) {
    const {
        exitCommandTip = '',
        enableQuote = false,
        messageId = '',
        useRealAtRobot = false,
        atRobotSegment = null,
        waitTimeout = 45,
        session
    } = options;

    // 构建消息段数组
    const messageSegments = [];

    if (enableQuote && messageId) {
        messageSegments.push(h.quote(messageId));
    }

    messageSegments.push(h.text(`${formattedList}\n\n${exitCommandTip.replace(/<br \/>/g, '\n')}`));

    // 处理waitTime文本，替换@机器人为真实的艾特消息段
    const atRobotText = "@机器人";
    const waitTimeText = session ? session.text(`.waitTime`, [waitTimeout, atRobotText]) : `⏰ 请在${waitTimeout}秒内输入歌曲对应的序号`;

    if (useRealAtRobot && waitTimeText.includes(atRobotText) && atRobotSegment) {
        const parts = waitTimeText.split(atRobotText);
        for (let i = 0; i < parts.length; i++) {
            if (parts[i]) {
                messageSegments.push(h.text(parts[i]));
            }
            if (i < parts.length - 1) {
                messageSegments.push(atRobotSegment);
            }
        }
    } else {
        messageSegments.push(h.text(waitTimeText));
    }

    return {
        payload: messageSegments,
        isText: true
    };
}

module.exports = { renderSongListText };
