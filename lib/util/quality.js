"use strict";

const QUALITY_PROFILES = {
    netease: {
        platformLabel: '网易云',
        configKey: 'command9_NeteaseMusicQuality',
        configDescription: '🎼 网易云音乐最大音质（网易云音乐专用）',
        defaultQuality: 5,
        qualities: [
            { value: 1, label: '标准（64k，standard）' },
            { value: 2, label: '标准（128k，standard）' },
            { value: 3, label: 'HQ极高（192k，higher）' },
            { value: 4, label: 'HQ极高（320k，exhigh）' },
            { value: 5, label: 'SQ无损（lossless）' },
            { value: 6, label: '高解析度无损（Hi-Res，hires）' },
            { value: 7, label: '高清臻音（Spatial Audio，jyeffect）' },
            { value: 8, label: '沉浸环绕声（Surround Audio，sky）' },
            { value: 9, label: '超清母带（Master，jymaster）' },
        ],
    },
    tencent: {
        platformLabel: 'QQ音乐',
        configKey: 'command9_QQMusicQuality',
        configDescription: '🎼 QQ 音乐最大音质（QQ 音乐专用）',
        defaultQuality: 10,
        qualities: [
            { value: 4, label: '标准音质（128）' },
            { value: 8, label: 'HQ高音质（320）' },
            { value: 10, label: 'SQ无损音质（flac）' },
            { value: 11, label: 'Hi-Res音质（hires）' },
            { value: 12, label: '杜比全景声（dolby）' },
            { value: 14, label: '臻品母带2.0（master）' },
        ],
    },
    kugou: {
        platformLabel: '酷狗音乐',
        configKey: 'command9_KugouMusicQuality',
        configDescription: '🎼 酷狗音乐最大音质（酷狗专用）',
        defaultQuality: '320',
        qualities: [
            { value: '128', label: '标准音质（128）' },
            { value: '320', label: 'HQ高品质（320）' },
            { value: 'flac', label: 'SQ无损（flac）' },
            { value: 'high', label: 'Hi-Res（high）' },
        ],
    },
};

for (const profile of Object.values(QUALITY_PROFILES)) {
    profile.qualities.forEach(Object.freeze);
    Object.freeze(profile.qualities);
    Object.freeze(profile);
}
Object.freeze(QUALITY_PROFILES);

function getQualityOption(platform, quality) {
    return QUALITY_PROFILES[platform]?.qualities.find(
        (option) => String(option.value) === String(quality),
    );
}

function getQualityCandidates(platform, selectedQuality) {
    const qualities = QUALITY_PROFILES[platform]?.qualities || [];
    const selectedIndex = qualities.findIndex(
        (option) => String(option.value) === String(selectedQuality),
    );
    if (selectedIndex < 0) {
        return [selectedQuality].filter((quality) => quality != null);
    }
    return qualities
        .slice(0, selectedIndex + 1)
        .reverse()
        .map((option) => option.value);
}

function getQualityLabel(platform, requestedQuality, actualQuality) {
    const actualOption = getQualityOption(platform, actualQuality);
    if (actualOption) return actualOption.label;
    if (actualQuality != null && actualQuality !== '') return String(actualQuality);

    const requestedOption = getQualityOption(platform, requestedQuality);
    return requestedOption?.label || String(requestedQuality || '未知音质');
}

module.exports = {
    QUALITY_PROFILES,
    getQualityOption,
    getQualityCandidates,
    getQualityLabel,
};
