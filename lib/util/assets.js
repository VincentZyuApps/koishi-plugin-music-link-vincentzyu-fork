"use strict";

const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const path = require('node:path');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { summarizeError } = require('./logger');

const PLUGIN_ASSET_DIR_NAME = 'music-link-vincentzyu-fork';
const ASSET_RELEASE_TAG = 'assets';
const GITEE_RELEASE_BASE = `https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/${ASSET_RELEASE_TAG}`;
const GITHUB_RELEASE_BASE = `https://github.com/VincentZyuApps/koishi-plugin-music-link-vincentzyu-fork/releases/download/${ASSET_RELEASE_TAG}`;

const ASSET_CONFIGS = [
    { filename: 'LXGWWenKaiMono-Regular.ttf', sha256: 'ee9faa6479c5b2434f9bceca8e2e7b643f699f4f3d067aac9609261e07c6be61', size: 24755236, type: 'font' },
    { filename: 'SourceHanSerifSC-Medium.otf', sha256: '1d4dc4b757c07034e2412d6edf48f54f94ec7172d4deb3b90a3e4fc9dcb94f5d', size: 24805580, type: 'font' },
    { filename: 'mahiro_mihari.png', sha256: '846efc02fccf6ad73077b7e4f2a879f70dae0db9513b5893d5e982f76f17ac83', size: 2010978, type: 'image' },
    { filename: 'pixai_koishi.png', sha256: '8b02b8efe6acbf935ea1c90e5bc00cd76592cef931af0cde4db03db4dc9ef380', size: 450187, type: 'image' },
];

function getRuntimeAssetsDir(baseDir) {
    return path.join(baseDir, 'data', 'assets', PLUGIN_ASSET_DIR_NAME);
}

function getRuntimeAssetPath(baseDir, filename) {
    return path.join(getRuntimeAssetsDir(baseDir), filename);
}

function getDefaultAssetDisplayPath(filename) {
    return path.resolve(process.cwd(), 'data', 'assets', PLUGIN_ASSET_DIR_NAME, filename);
}

function getLegacyBundledAssetPath(filename) {
    return path.resolve(__dirname, '..', '..', 'assets', filename);
}

function buildAssetUrls(filename) {
    return [
        { source: 'Gitee', url: `${GITEE_RELEASE_BASE}/${filename}` },
        { source: 'GitHub', url: `${GITHUB_RELEASE_BASE}/${filename}` },
    ];
}

function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function verifyAssetFile(filePath, assetConfig) {
    try {
        const buffer = await fs.readFile(filePath);
        return {
            ok: buffer.length === assetConfig.size && sha256(buffer) === assetConfig.sha256,
            size: buffer.length,
            sha256: sha256(buffer),
        };
    } catch (error) {
        if (error.code === 'ENOENT') return { ok: false, missing: true, size: 0, sha256: '' };
        throw error;
    }
}

function isDefaultOrLegacyAssetPath(value, filename) {
    if (!value) return true;
    const normalized = path.resolve(String(value));
    return normalized === getDefaultAssetDisplayPath(filename)
        || normalized === getLegacyBundledAssetPath(filename);
}

function normalizeAssetConfigPaths(ctx, config, musicLogger) {
    if (!config) return;
    const mappings = [
        ['backgroundImagePath', 'pixai_koishi.png'],
        ['textFontPath', 'LXGWWenKaiMono-Regular.ttf'],
    ];
    for (const [key, filename] of mappings) {
        if (isDefaultOrLegacyAssetPath(config[key], filename)) {
            config[key] = getRuntimeAssetPath(ctx.baseDir, filename);
        }
    }

    const arrayMappings = [
        ['svgFontFiles', 'LXGWWenKaiMono-Regular.ttf'],
        ['canvasFontFiles', 'LXGWWenKaiMono-Regular.ttf'],
    ];
    for (const [key, filename] of arrayMappings) {
        if (!Array.isArray(config[key]) || config[key].length === 0) {
            config[key] = [getRuntimeAssetPath(ctx.baseDir, filename)];
            continue;
        }
        config[key] = config[key].map(item => (
            isDefaultOrLegacyAssetPath(item, filename) ? getRuntimeAssetPath(ctx.baseDir, filename) : item
        ));
    }

    config.__musicLinkDefaultSourceHanSerifPath = getRuntimeAssetPath(ctx.baseDir, 'SourceHanSerifSC-Medium.otf');
    musicLogger?.logDebug?.('默认资源目录', getRuntimeAssetsDir(ctx.baseDir));
}

async function validateAssets(ctx, musicLogger) {
    const { logInfo, logDebug } = musicLogger;
    const assetsDir = getRuntimeAssetsDir(ctx.baseDir);
    const downloadStatus = [];
    if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true });

    for (const assetConfig of ASSET_CONFIGS) {
        const assetPath = path.join(assetsDir, assetConfig.filename);
        const typeLabel = assetConfig.type === 'font' ? '插件内置字体' : '插件内置图片';
        const existingCheck = await verifyAssetFile(assetPath, assetConfig);
        if (existingCheck.ok) {
            logDebug('资源校验通过', () => ({ type: typeLabel, filename: assetConfig.filename, assetPath }));
            downloadStatus.push({ name: assetConfig.filename, status: 'exists', type: typeLabel });
            continue;
        }

        if (existingCheck.missing) {
            logInfo('📦 插件资源不存在，开始下载', `${typeLabel} ${assetConfig.filename}`);
        } else {
            logInfo('⚠️ 插件资源校验失败，准备重新下载', `${typeLabel} ${assetConfig.filename}`);
            logDebug('插件资源校验差异', () => ({
                assetPath,
                actual: existingCheck,
                expected: { size: assetConfig.size, sha256: assetConfig.sha256 },
            }));
        }

        let lastError = null;
        for (const candidate of buildAssetUrls(assetConfig.filename)) {
            try {
                logDebug('尝试下载插件资源', candidate);
                const response = await ctx.http.get(candidate.url, { responseType: 'arraybuffer' });
                const assetBuffer = Buffer.from(response);
                const actualSha256 = sha256(assetBuffer);
                if (assetBuffer.length !== assetConfig.size || actualSha256 !== assetConfig.sha256) {
                    throw new Error(`资源校验失败: size=${assetBuffer.length}/${assetConfig.size}, sha256=${actualSha256}/${assetConfig.sha256}`);
                }
                writeFileSync(assetPath, assetBuffer);
                const finalCheck = await verifyAssetFile(assetPath, assetConfig);
                if (!finalCheck.ok) throw new Error('写入后校验失败');
                logInfo('✅ 插件资源下载并校验成功', `${typeLabel} ${assetConfig.filename}，来源=${candidate.source}`);
                downloadStatus.push({ name: assetConfig.filename, status: 'success', type: typeLabel });
                lastError = null;
                break;
            } catch (error) {
                lastError = error;
                logInfo('⚠️ 插件资源下载源失败，正在尝试下一来源', `${candidate.source} ${assetConfig.filename}，${summarizeError(error)}`);
                logDebug(`插件资源从 ${candidate.source} 下载异常`, error);
            }
        }

        if (lastError) {
            logInfo('❌ 插件资源在所有来源均下载或校验失败', `${typeLabel} ${assetConfig.filename}`);
            logDebug('插件资源最终下载失败', lastError);
            downloadStatus.push({ name: assetConfig.filename, status: 'failed', type: typeLabel });
            throw new Error(`❌ music-link 资源 ${assetConfig.filename} 下载失败或 sha256 校验失败: ${lastError.message}`);
        }
    }
    return downloadStatus;
}

module.exports = {
    getRuntimeAssetsDir,
    getRuntimeAssetPath,
    getDefaultAssetDisplayPath,
    normalizeAssetConfigPaths,
    validateAssets,
};
