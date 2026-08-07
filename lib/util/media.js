"use strict";

function getErrorStatus(error) {
    return error?.response?.status ?? error?.status ?? error?.statusCode;
}

function getErrorText(error) {
    const details = [
        error?.message,
        error?.response?.data?.description,
        error?.response?.data?.message,
        typeof error?.response?.data === 'string' ? error.response.data : '',
        error?.description,
        error?.code,
    ];
    return details.filter(Boolean).join(' ').toLowerCase();
}

function isTransientMediaError(error) {
    const text = getErrorText(error);
    return /timeout|timed out|etimedout|econnreset|econnrefused|socket hang up|fetch failed|network error|connection reset|und_err/.test(text);
}

function isQualityRelatedMediaError(error) {
    const status = getErrorStatus(error);
    const text = getErrorText(error);
    if (status === 413 || error?.code === 'MEDIA_DOWNLOAD_FAILED' || error?.code === 'MEDIA_QUALITY_UNAVAILABLE') return true;
    return /request entity too large|payload too large|file is too big|file too large|entity too large|unsupported.*(?:audio|media|format)|audio[_ ]content[_ ]type[_ ]invalid|media[_ ]invalid|invalid.*file format|can't parse (?:audio|media)|failed to process (?:audio|media)|wrong file identifier|failed to get http url content|wrong type of the web page content/.test(text);
}

function isTerminalMediaError(error) {
    const status = getErrorStatus(error);
    const text = getErrorText(error);
    return status === 401 || status === 403 || status === 429
        || /bot was blocked|chat not found|not enough rights|forbidden|too many requests|retry after/.test(text);
}

function createQualityFallbackState(initialData, options = {}) {
    const candidates = options.candidates || [];
    return {
        enabled: options.enabled !== false && candidates.length > 1,
        platform: options.platform || '',
        candidates,
        index: 0,
        data: initialData,
        fetchData: options.fetchData,
        seenUrls: new Set(initialData?.url ? [initialData.url] : []),
        pendingInitialDowngradeFrom: options.initialDowngradeFrom,
    };
}

async function advanceQuality(state, logDebug) {
    const previousData = state.data;
    const previousCandidate = state.candidates[state.index];

    while (state.index + 1 < state.candidates.length) {
        const nextIndex = state.index + 1;
        const nextCandidate = state.candidates[nextIndex];
        state.index = nextIndex;

        try {
            const nextData = await state.fetchData(nextCandidate);
            if (!nextData?.url) {
                logDebug?.(`音质 ${nextCandidate} 未返回媒体 URL，继续降低音质`);
                continue;
            }
            if (state.seenUrls.has(nextData.url)) {
                logDebug?.(`音质 ${nextCandidate} 返回了重复媒体 URL，跳过重复上传`);
                continue;
            }

            state.seenUrls.add(nextData.url);
            state.data = nextData;
            return {
                fromData: previousData,
                toData: nextData,
                fromCandidate: previousCandidate,
                toCandidate: nextCandidate,
            };
        } catch (error) {
            logDebug?.(`获取音质 ${nextCandidate} 失败，继续降低音质`, error);
        }
    }

    return null;
}

async function sendMediaWithFallback(options) {
    const {
        state,
        allowQualityFallback,
        prepare,
        send,
        onDowngraded,
        onFailed,
        logInfo,
        logDebug,
    } = options;
    const startIndex = state.index;
    const startData = state.data;
    const startCandidate = state.candidates[startIndex];
    let retriedCurrentQuality = false;
    let preparedKey;
    let preparedMedia;
    let lastError;

    while (true) {
        const mediaKey = `${state.index}:${state.data?.url || ''}`;
        try {
            if (preparedKey !== mediaKey) {
                preparedMedia = await prepare(state.data);
                preparedKey = mediaKey;
            }
            const messageIds = await send(preparedMedia);
            if (state.index > startIndex || state.pendingInitialDowngradeFrom != null) {
                const initialDowngradeFrom = state.pendingInitialDowngradeFrom;
                try {
                    await onDowngraded?.({
                        fromData: initialDowngradeFrom != null ? {} : startData,
                        toData: state.data,
                        fromCandidate: initialDowngradeFrom ?? startCandidate,
                        toCandidate: state.candidates[state.index],
                        messageIds,
                    });
                } catch (error) {
                    logInfo?.('降级状态提示失败，但媒体已经发送成功', error.message);
                    logDebug?.('降级状态提示发送异常', error);
                }
                state.pendingInitialDowngradeFrom = undefined;
            }
            return { success: true, messageIds, data: state.data };
        } catch (error) {
            lastError = error;
            logDebug?.('媒体发送失败', error);

            if (isTerminalMediaError(error)) break;
            if (isTransientMediaError(error) && !retriedCurrentQuality) {
                retriedCurrentQuality = true;
                logInfo?.('当前音质遇到临时网络错误，正在原音质重试');
                continue;
            }

            const canDowngrade = allowQualityFallback
                && state.enabled
                && (isQualityRelatedMediaError(error) || isTransientMediaError(error));
            if (!canDowngrade) break;

            const advanced = await advanceQuality(state, logDebug);
            if (!advanced) break;
            retriedCurrentQuality = false;
            preparedKey = undefined;
            preparedMedia = undefined;
        }
    }

    try {
        await onFailed?.(lastError);
    } catch (error) {
        logDebug?.('最终失败状态提示发送异常', error);
    }
    return { success: false, error: lastError, data: state.data };
}

function getFirstMessageId(messageIds) {
    if (Array.isArray(messageIds)) return messageIds.find(Boolean);
    return messageIds || undefined;
}

function splitTextByLength(text, maxLength = 3500) {
    if (text.length <= maxLength) return [text];
    const chunks = [];
    let current = '';

    for (const line of text.split('\n')) {
        const next = current ? `${current}\n${line}` : line;
        if (next.length <= maxLength) {
            current = next;
            continue;
        }
        if (current) chunks.push(current);
        current = line;
        while (current.length > maxLength) {
            chunks.push(current.slice(0, maxLength));
            current = current.slice(maxLength);
        }
    }
    if (current) chunks.push(current);
    return chunks;
}

module.exports = {
    isTransientMediaError,
    isQualityRelatedMediaError,
    isTerminalMediaError,
    createQualityFallbackState,
    sendMediaWithFallback,
    getFirstMessageId,
    splitTextByLength,
};
