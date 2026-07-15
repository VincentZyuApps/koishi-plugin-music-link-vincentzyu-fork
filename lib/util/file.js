"use strict";

const fs = require('node:fs/promises');

function getExtensionFromContentType(contentType) {
    if (!contentType) return '.mp3';
    if (contentType.includes('audio/mpeg')) return '.mp3';
    if (contentType.includes('audio/mp4')) return '.m4a';
    if (contentType.includes('audio/wav')) return '.wav';
    if (contentType.includes('audio/flac')) return '.flac';
    return '.mp3';
}

function parseFilenameTemplate(template, data, platform = '', options = {}) {
    if (!template || !data) return null;
    const { keepSpaces = false, slashReplacement = '-' } = options;
    const now = new Date();
    const timeStr = [
        now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0'), '-',
        String(now.getHours()).padStart(2, '0'), String(now.getMinutes()).padStart(2, '0'), String(now.getSeconds()).padStart(2, '0'),
    ].join('');
    const placeholders = {
        '${name}': data.name || data.songname || data.title || '',
        '${artist}': data.artist || data.singer || '',
        '${id}': data.id || '',
        '${quality}': data.quality || '',
        '${platform}': platform || '',
        '${time}': timeStr,
    };

    let result = template;
    for (const [placeholder, value] of Object.entries(placeholders)) {
        let safeValue = String(value || '').replace(/\//g, slashReplacement);
        safeValue = safeValue.replace(/[<>:"\\|?*\x00-\x1F]/g, '-');
        if (!keepSpaces) safeValue = safeValue.replace(/\s+/g, '-');
        const pattern = placeholder.replace(/\$/g, '\\$').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
        result = result.replace(new RegExp(pattern, 'g'), safeValue.trim());
    }
    result = keepSpaces
        ? result.replace(/[-_]{2,}/g, '-').replace(/^[-_]+|[-_]+$/g, '').trim()
        : result.replace(/[-_\s]+/g, '-').replace(/^[-_\s]+|[-_\s]+$/g, '').trim();
    return result || null;
}

async function safeUnlink(filePath, maxRetries = 5, interval = 1000, setTimeoutFn = setTimeout) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            await fs.access(filePath);
            await fs.unlink(filePath);
            return;
        } catch (error) {
            if (error.code === 'ENOENT') return;
            if (error.code !== 'EBUSY') throw error;
            retries++;
            await new Promise(resolve => setTimeoutFn(resolve, interval));
        }
    }
    throw new Error(`Failed to delete ${filePath} after ${maxRetries} retries`);
}

module.exports = { getExtensionFromContentType, parseFilenameTemplate, safeUnlink };
