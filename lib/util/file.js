"use strict";

const fs = require('node:fs/promises');
const path = require('node:path');

const MEDIA_TYPE_BY_EXTENSION = {
    '.flac': 'audio/flac',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.mp4': 'audio/mp4',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
};

function getExtensionFromContentType(contentType) {
    if (!contentType) return '.mp3';
    if (contentType.includes('audio/mpeg')) return '.mp3';
    if (contentType.includes('audio/mp4')) return '.m4a';
    if (contentType.includes('audio/wav')) return '.wav';
    if (contentType.includes('audio/flac')) return '.flac';
    return '.mp3';
}

function detectMediaType(buffer, contentType, fileUrl = '') {
    let extension;
    let mimeType;

    if (buffer?.length >= 4 && buffer.subarray(0, 4).toString('ascii') === 'fLaC') {
        extension = '.flac';
        mimeType = 'audio/flac';
    } else if (buffer?.length >= 4 && buffer.subarray(0, 4).toString('ascii') === 'OggS') {
        extension = '.ogg';
        mimeType = 'audio/ogg';
    } else if (buffer?.length >= 12
        && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
        && buffer.subarray(8, 12).toString('ascii') === 'WAVE') {
        extension = '.wav';
        mimeType = 'audio/wav';
    } else if (buffer?.length >= 8 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
        extension = '.m4a';
        mimeType = 'audio/mp4';
    } else if (buffer?.length >= 3 && buffer.subarray(0, 3).toString('ascii') === 'ID3') {
        extension = '.mp3';
        mimeType = 'audio/mpeg';
    } else if (buffer?.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
        extension = '.mp3';
        mimeType = 'audio/mpeg';
    }

    if (!extension && fileUrl) {
        try {
            const urlExtension = path.extname(new URL(fileUrl).pathname).toLowerCase();
            if (MEDIA_TYPE_BY_EXTENSION[urlExtension]) {
                extension = urlExtension === '.mp4' ? '.m4a' : urlExtension;
                mimeType = MEDIA_TYPE_BY_EXTENSION[urlExtension];
            }
        } catch {
            // Ignore malformed source URLs and fall back to the response header.
        }
    }

    if (!extension) {
        mimeType = (contentType || 'audio/mpeg').split(';')[0].trim();
        extension = getExtensionFromContentType(mimeType);
    }

    return { extension, mimeType };
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

module.exports = { getExtensionFromContentType, detectMediaType, parseFilenameTemplate, safeUnlink };
