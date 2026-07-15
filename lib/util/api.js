"use strict";

function safeJsonParse(data) {
    if (typeof data === 'object' && data !== null) return data;
    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
}

function buildSongUrl(useApi, songId) {
    const apiUrlMap = {
        'api.injahow.cn': `https://api.injahow.cn/meting/?type=url&id=${songId}`,
        'meting.jmstrand.cn': `https://meting.jmstrand.cn/?type=url&id=${songId}`,
        'api.qijieya.cn': `https://api.qijieya.cn/meting/?type=url&id=${songId}`,
        'metingapi.nanorocky.top': `https://metingapi.nanorocky.top/?server=netease&type=url&id=${songId}`,
    };
    return apiUrlMap[useApi] || '';
}

module.exports = { safeJsonParse, buildSongUrl };
