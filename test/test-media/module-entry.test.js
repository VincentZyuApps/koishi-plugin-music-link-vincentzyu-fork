"use strict";

const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ENTRY_EXPORTS = {
    command: ['registerCommand6', 'registerCommand9'],
    render: ['generateSongList', 'loadTestSongList'],
    util: ['createMusicLogger', 'getQualityCandidates', 'summarizeError'],
};

test('resolves aggregate modules through directory index files', () => {
    for (const [entry, exportNames] of Object.entries(ENTRY_EXPORTS)) {
        const request = `../../lib/${entry}`;
        assert.equal(
            require.resolve(request).endsWith(path.join('lib', entry, 'index.js')),
            true,
        );

        const exports = require(request);
        for (const exportName of exportNames) {
            assert.equal(typeof exports[exportName], 'function');
        }
    }
});

test('keeps utility module exports collision-free', () => {
    const moduleNames = ['api', 'assets', 'download', 'file', 'logger', 'media', 'quality'];
    const owners = new Map();

    for (const moduleName of moduleNames) {
        const exports = require(`../../lib/util/${moduleName}`);
        for (const exportName of Object.keys(exports)) {
            const previousOwner = owners.get(exportName);
            assert.equal(previousOwner, undefined, `${exportName} 同时由 ${previousOwner} 和 ${moduleName} 导出`);
            owners.set(exportName, moduleName);
        }
    }
});
