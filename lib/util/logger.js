"use strict";

const SENSITIVE_KEY_PATTERN = /authorization|cookie|token|secret|ticket|session[_-]?key|signature/i;
const BINARY_KEY_PATTERN = /base64|binary|file[_-]?data/i;
const REDACTED = '[REDACTED]';

function ensureEmojiPrefix(value, fallback = '📝') {
    const message = String(value || '');
    const trimmed = message.trimStart();
    if (/^[\p{Extended_Pictographic}\u2600-\u27BF]/u.test(trimmed)) return message;
    return `${fallback} ${message}`;
}

function inferDebugEmoji(message) {
    const value = String(message || '');
    if (/异常|失败|错误|报错|Stack|诊断/i.test(value)) return '💥';
    if (/耗时|计时|时长|timeout/i.test(value)) return '⏱️';
    if (/API|HTTP|URL|请求|响应|代理|歌词|网络/i.test(value)) return '🌐';
    if (/文件|路径|目录|资源|缓存|font|image/i.test(value)) return '📁';
    if (/渲染|Canvas|Puppeteer|SVG|Markdown/i.test(value)) return '🎨';
    if (/卡片|payload|JSON|metadata|字段|数据/i.test(value)) return '📦';
    if (/歌曲|歌单|音乐|音质|媒体/i.test(value)) return '🎵';
    if (/配置|模式|适配器/i.test(value)) return '⚙️';
    if (/中间件|指令/i.test(value)) return '🔗';
    return '🔍';
}

function inferInfoEmoji(message) {
    const value = String(message || '');
    if (/成功|完成|已发送|已写入|已创建/.test(value)) return '✅';
    if (/失败|错误|异常|不可用/.test(value)) {
        return /继续|回退|降级|重试|不影响|已跳过/.test(value) ? '⚠️' : '❌';
    }
    if (/搜索|查找/.test(value)) return '🔎';
    if (/下载/.test(value)) return '📥';
    if (/文件|路径|目录|资源|缓存/.test(value)) return '📁';
    if (/渲染|Canvas|Puppeteer|SVG|Markdown/i.test(value)) return '🎨';
    if (/歌曲|歌单|音乐|音质|媒体|点歌/.test(value)) return '🎵';
    if (/配置|模式|适配器/.test(value)) return '⚙️';
    return '📝';
}

function redactString(value) {
    return String(value)
        .replace(/([?&](?:access_?token|refresh_?token|token|secret|ticket|signature)=)[^&\s]+/gi, `$1${REDACTED}`)
        .replace(/((?:authorization|cookie|token|secret|ticket|session[_-]?key|signature)["']?\s*[:=]\s*["']?)[^"',\s&}]+/gi, `$1${REDACTED}`);
}

function summarizeBinary(value, label) {
    const length = value?.byteLength ?? value?.length ?? 0;
    return `[${label} length=${length}]`;
}

function normalizeForLog(value, seen = new WeakSet(), key = '') {
    if (SENSITIVE_KEY_PATTERN.test(key)) return REDACTED;
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') {
        if (BINARY_KEY_PATTERN.test(key) && value.length > 128) {
            return `[String length=${value.length}]`;
        }
        return redactString(value);
    }
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'bigint') return `${value}n`;
    if (typeof value === 'symbol') return value.toString();
    if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
    if (Buffer.isBuffer(value)) return summarizeBinary(value, 'Buffer');
    if (value instanceof ArrayBuffer) return summarizeBinary(value, 'ArrayBuffer');
    if (ArrayBuffer.isView(value)) return summarizeBinary(value, value.constructor?.name || 'TypedArray');
    if (value instanceof Date) return value.toISOString();
    if (value instanceof URL) return redactString(value.toString());
    if (typeof Headers !== 'undefined' && value instanceof Headers) {
        return normalizeForLog(Object.fromEntries(value.entries()), seen, key);
    }

    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    if (value instanceof Error) {
        const normalized = {
            name: value.name,
            message: value.message,
            code: value.code,
            status: value.status ?? value.statusCode ?? value.response?.status,
            stack: value.stack,
            cause: value.cause,
        };
        for (const property of Object.keys(value)) {
            if (!(property in normalized)) normalized[property] = value[property];
        }
        return normalizeObject(normalized, seen);
    }

    if (Array.isArray(value)) {
        return value.map(item => normalizeForLog(item, seen));
    }
    return normalizeObject(value, seen);
}

function normalizeObject(value, seen) {
    const output = {};
    for (const [property, item] of Object.entries(value)) {
        output[property] = normalizeForLog(item, seen, property);
    }
    return output;
}

function stringifyDebugValue(value) {
    if (typeof value === 'string') return redactString(value);
    try {
        const normalized = normalizeForLog(value);
        const serialized = JSON.stringify(normalized, null, 2);
        return serialized === undefined ? String(normalized) : serialized;
    } catch (error) {
        return `[日志数据格式化失败: ${error?.message || String(error)}]`;
    }
}

function summarizeError(error) {
    if (!error) return '未知错误';
    if (typeof error === 'string') return redactString(error).replace(/\s+/g, ' ').trim();

    const status = error?.response?.status ?? error?.status ?? error?.statusCode;
    const responseData = error?.response?.data;
    const businessCode = responseData?.code ?? responseData?.err_code ?? error?.code;
    const responseMessage = responseData?.message ?? responseData?.description;
    const traceId = responseData?.trace_id
        ?? error?.response?.headers?.['x-tps-trace-id']
        ?? error?.response?.headers?.get?.('x-tps-trace-id');
    const parts = [
        status ? `HTTP ${status}` : '',
        businessCode !== undefined && businessCode !== null ? `code=${businessCode}` : '',
        responseMessage || error.message || String(error),
        traceId ? `trace_id=${traceId}` : '',
    ].filter(Boolean);
    return redactString(parts.join('，')).replace(/\s+/g, ' ').trim();
}

function formatInline(value) {
    if (value === null || value === undefined || value === '') return '';
    if (value instanceof Error) return summarizeError(value);
    if (typeof value === 'object') {
        const label = value.constructor?.name && value.constructor.name !== 'Object'
            ? value.constructor.name
            : 'Object';
        return `[${label}]`;
    }
    return redactString(value).replace(/\s+/g, ' ').trim();
}

function createMusicLogger(ctx, config) {
    const writeInfo = (message) => ctx.logger.info(message);

    function logInfo(summary, detail) {
        const rawSummary = formatInline(summary);
        const formattedSummary = ensureEmojiPrefix(rawSummary, inferInfoEmoji(rawSummary));
        const formattedDetail = formatInline(detail);
        const message = formattedDetail ? `${formattedSummary} | ${formattedDetail}` : formattedSummary;
        writeInfo(`[🎵 INFO] ${message}`);
    }

    function logDebug(message, data) {
        if (config?.verboseConsoleLog !== true) return;

        const formattedMessage = formatInline(message);
        let value;
        try {
            value = typeof data === 'function' ? data() : data;
        } catch (error) {
            value = { diagnosticFactoryError: error };
        }
        const formattedData = value === undefined ? '' : stringifyDebugValue(value);
        const debugMessage = ensureEmojiPrefix(formattedMessage, inferDebugEmoji(formattedMessage));
        const output = formattedData
            ? `[🐛 DEBUG] ${debugMessage}\n${formattedData}`
            : `[🐛 DEBUG] ${debugMessage}`;
        writeInfo(output);
    }

    return { logInfo, logDebug };
}

module.exports = {
    createMusicLogger,
    ensureEmojiPrefix,
    inferInfoEmoji,
    inferDebugEmoji,
    summarizeError,
    stringifyDebugValue,
};
