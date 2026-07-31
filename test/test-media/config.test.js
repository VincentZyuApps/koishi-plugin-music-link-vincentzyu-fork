"use strict";

const test = require('node:test');
const assert = require('node:assert/strict');
const { Config } = require('../../lib/config');
const { usage } = require('../../lib/usage');
const {
    QUALITY_PROFILES,
    getQualityCandidates,
} = require('../../lib/util/quality');

test('enables command9 automatic quality downgrade by default', () => {
    const config = Config({ serverSelect: 'command9' });
    assert.equal(config.command9_AutoDowngradeQuality, true);
});

test('preserves an explicitly disabled automatic quality downgrade option', () => {
    const config = Config({ serverSelect: 'command9', command9_AutoDowngradeQuality: false });
    assert.equal(config.command9_AutoDowngradeQuality, false);
});

test('uses a search length divisible across one to three platforms by default', () => {
    const config = Config({ serverSelect: 'command9' });
    assert.equal(config.command9_searchListLength, 60);
    assert.deepEqual([1, 2, 3].map((count) => 60 / count), [60, 30, 20]);
});

test('uses catalog defaults and ordering for every command9 platform', () => {
    const config = Config({ serverSelect: 'command9' });
    const profiles = Object.entries(QUALITY_PROFILES);

    assert.equal(
        profiles.reduce((count, [, profile]) => count + profile.qualities.length, 0),
        19,
    );

    for (const [platform, profile] of profiles) {
        assert.equal(config[profile.configKey], profile.defaultQuality);
        assert.deepEqual(
            getQualityCandidates(platform, profile.qualities[profile.qualities.length - 1].value),
            profile.qualities.map((quality) => quality.value).reverse(),
        );
    }
});

test('renders every catalog quality as an individual usage table row', () => {
    let expectedRows = 0;

    for (const profile of Object.values(QUALITY_PROFILES)) {
        for (const quality of profile.qualities) {
            expectedRows++;
            assert.ok(usage.includes(
                `<tr><td>${profile.platformLabel}</td><td><code>${quality.value}</code></td><td>${quality.label}</td></tr>`,
            ));
        }
    }

    const actualRows = usage.match(/<tr><td>(?:网易云|QQ音乐|酷狗音乐)<\/td>/g) || [];
    assert.equal(actualRows.length, expectedRows);
});

test('distinguishes official and compatible Kugou backends in usage', () => {
    assert.ok(usage.includes('官方 <code>api.vkeys.cn/v2</code> 当前仅支持网易云和 QQ 音乐，暂不支持酷狗音乐。'));
    assert.ok(usage.includes('酷狗音乐可使用作者自建 API；其他自定义后端是否支持酷狗取决于具体实现。'));
    assert.ok(usage.includes('✅ 额外支持酷狗音乐 API 等扩展能力'));
});
