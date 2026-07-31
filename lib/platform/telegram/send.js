"use strict";

const { h } = require('koishi');
const { splitTextByLength } = require('../../util/media');

const TELEGRAM_CAPTION_MODES = Object.freeze({
    LEGACY: 'legacy',
    SEPARATE_LYRICS: 'separate-lyrics',
    SEPARATE_IMAGE: 'separate-image',
});
const TELEGRAM_TEXT_CHUNK_LENGTH = 3333;

function createTelegramSafePlan(safeItems, mode) {
    if (mode === TELEGRAM_CAPTION_MODES.SEPARATE_LYRICS) {
        const lyricItems = safeItems.filter((item) => item.type === 'text' && item.field.data === 'lrc');
        const captionItems = safeItems.filter((item) => !lyricItems.includes(item));
        return [
            ...(captionItems.length ? [{ type: 'batch', items: captionItems }] : []),
            ...(lyricItems.length ? [{ type: 'text', items: lyricItems }] : []),
        ];
    }

    if (mode === TELEGRAM_CAPTION_MODES.SEPARATE_IMAGE) {
        const imageItems = safeItems.filter((item) => item.type === 'image');
        const textItems = safeItems.filter((item) => item.type === 'text');
        return [
            ...imageItems.map((item) => ({ type: 'image', items: [item] })),
            ...(textItems.length ? [{ type: 'text', items: textItems }] : []),
        ];
    }

    return safeItems.length ? [{ type: 'batch', items: safeItems }] : [];
}

function logTelegramSendFailure({ type, items, error, mode, configKey, logger }) {
    const includesImage = items.some((item) => item.type === 'image');
    if (type === 'batch' && includesImage && mode !== TELEGRAM_CAPTION_MODES.SEPARATE_IMAGE) {
        logger.warn(`⚠️ Telegram 图文发送失败，caption 可能超过长度限制；请将 ${configKey} 切换为“图片单独发送”: ${error.message}`);
        return;
    }
    logger.warn(`⚠️ Telegram ${type === 'image' ? '图片' : '文本'}发送失败，继续处理后续字段: ${error.message}`);
}

async function trySendTelegramSafeItems(options) {
    const {
        session,
        logger,
        safeItems,
        formatText,
        createSafeElement,
        mode = TELEGRAM_CAPTION_MODES.SEPARATE_LYRICS,
        configKey = 'command*_telegramCaptionMode',
    } = options;
    if (session.platform !== 'telegram') return false;

    for (const group of createTelegramSafePlan(safeItems, mode)) {
        const attempts = group.type === 'text'
            ? splitTextByLength(group.items.map(formatText).join('\n'), TELEGRAM_TEXT_CHUNK_LENGTH)
                .map((text) => () => session.send(h.text(text)))
            : group.type === 'image'
                ? [() => session.send(createSafeElement(group.items[0]))]
                : [() => {
                    const elements = group.items.map(createSafeElement).filter(Boolean);
                    return session.send(elements.join('\n'));
                }];

        for (const send of attempts) {
            try {
                const messageIds = await send();
                if (Array.isArray(messageIds) && messageIds.length === 0) {
                    logTelegramSendFailure({
                        type: group.type,
                        items: group.items,
                        error: new Error('session.send 未返回消息 ID'),
                        mode,
                        configKey,
                        logger,
                    });
                }
            } catch (error) {
                logTelegramSendFailure({
                    type: group.type,
                    items: group.items,
                    error,
                    mode,
                    configKey,
                    logger,
                });
            }
        }
    }

    return true;
}

module.exports = {
    TELEGRAM_CAPTION_MODES,
    TELEGRAM_TEXT_CHUNK_LENGTH,
    createTelegramSafePlan,
    trySendTelegramSafeItems,
};
