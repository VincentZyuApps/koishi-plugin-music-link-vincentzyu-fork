"use strict";

const test = require('node:test');
const assert = require('node:assert/strict');
const { detectMediaType } = require('../../lib/util/file');

test('detects FLAC from magic bytes even when the server claims audio/mpeg', () => {
    const result = detectMediaType(Buffer.from('fLaC\x00\x00\x00\x22', 'binary'), 'audio/mpeg', 'https://example.test/song.mp3');
    assert.deepEqual(result, { extension: '.flac', mimeType: 'audio/flac' });
});

test('uses a recognized source URL extension before an incorrect response header', () => {
    const result = detectMediaType(Buffer.from([0, 1, 2, 3]), 'audio/mpeg', 'https://example.test/song.flac?token=1');
    assert.deepEqual(result, { extension: '.flac', mimeType: 'audio/flac' });
});

test('detects MP4 audio from the ftyp signature', () => {
    const buffer = Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20]);
    const result = detectMediaType(buffer, 'application/octet-stream');
    assert.deepEqual(result, { extension: '.m4a', mimeType: 'audio/mp4' });
});
