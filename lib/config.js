"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = exports.normalizeCommand9Platforms = exports.usage = exports.IMAGE_STYLE_MAP = exports.platformMap = exports.command9_returnDataField_default = exports.command6_returnDataField_default = void 0;

const { Schema } = require("koishi");
const path = require('node:path');

// ============ 常量定义 ============

const command6_returnDataField_default = [
    { "data": "name", "describe": "歌曲名称", "type": "text" },
    { "data": "id", "describe": "歌曲ID", "type": "text" },
    { "data": "artist", "describe": "歌手", "type": "text" },
    { "data": "url", "describe": "下载链接", "type": "text" },
    { "data": "pic", "describe": "封面链接", "type": "image" },
    { "data": "quality", "describe": "音质", "type": "text" },
    { "data": "pay", "describe": "是否付费", "type": "text", "enable": false },
    { "data": "lrc", "describe": "歌词", "type": "text", "enable": false },
    { "data": "url", "describe": "语音", "type": "audio", "enable": false },
    { "data": "url", "describe": "文件", "type": "file", "enable": false }
];
exports.command6_returnDataField_default = command6_returnDataField_default;

const command9_returnDataField_default = [
    { "data": "name", "describe": "歌曲名称", "type": "text" },
    { "data": "id", "describe": "歌曲ID", "type": "text" },
    { "data": "artist", "describe": "歌手", "type": "text" },
    { "data": "url", "describe": "下载链接", "type": "text" },
    { "data": "pic", "describe": "封面链接", "type": "image" },
    { "data": "quality", "describe": "音质", "type": "text" },
    { "data": "pay", "describe": "是否付费", "type": "text", "enable": false },
    { "data": "lrc", "describe": "歌词", "type": "text", "enable": false },
    { "data": "url", "describe": "语音", "type": "audio", "enable": false },
    { "data": "url", "describe": "文件", "type": "file", "enable": false }
];
exports.command9_returnDataField_default = command9_returnDataField_default;

const platformMap = {
    '网易云': 'netease',
    'QQ': 'tencent',
    '酷我': 'kuwo',
    'Tidal': 'tidal',
    'Qobuz': 'qobuz',
    '喜马FM': 'ximalaya',
    '咪咕': 'migu',
    '酷狗': 'kugou',
    '油管': 'ytmusic',
    'Spotify': 'spotify',
};
exports.platformMap = platformMap;

const IMAGE_STYLE_MAP = {
    ORIGIN_BLACK_WHITE: 'ORIGIN_BLACK_WHITE',
    MODERN_SOURCE_HANS_SERIF: 'MODERN_SOURCE_HANS_SERIF',
    FLAT_MODERN: 'FLAT_MODERN',
};
exports.IMAGE_STYLE_MAP = IMAGE_STYLE_MAP;

// ============ (usage 已移至 lib/usage.js) ============

// ============ Notifier 辅助函数 ============

function createNotifierInfoOfConfig(ctx, config, { useText, usePuppeteer, useSvg, useCanvas, useMarkdownTable, useMarkdownStyle, order, selectedNone }) {
    if (!ctx.notifier) return;

    const { h } = require('koishi');
    const infoItems = [];
    // infoItems.push(`🎵 当前消息渲染模式：${order.join(' → ') || '无'}`);
    const seletecNoneFallbackTip = '⚠️ \t 检测到没有选中任何渲染模式，会fallback到svg';
    selectedNone && ctx.logger.warn(seletecNoneFallbackTip);
    infoItems.push(`🎵 当前消息渲染模式：${selectedNone ? seletecNoneFallbackTip : order.join(' → ')}`);
    infoItems.push(`⚡ 渲染模式：${config.strictOrderMode ? '严格串行顺序' : '并行'}模式`);

    let cmdInfo = '';
    if (config.serverSelect === 'command6' && config.command6) {
        cmdInfo = `/${config.command6} (网易云点歌)`;
    } else if (config.serverSelect === 'command9' && config.command9) {
        cmdInfo = `/${config.command9} (落月api点歌)`;
    }
    if (cmdInfo) {
        infoItems.push(`📋 指令名称: ${cmdInfo}`);
    }
    if (useText) {
        infoItems.push(`📝 纯文本模式已启用`);
    }
    if (useMarkdownTable) {
        infoItems.push(`📊 QQ Markdown 表格模式已启用 | 显示数量：${config.markdownTableMaxDisplay || 20}`);
    }
    if (useMarkdownStyle) {
        infoItems.push(`💫 QQ Markdown 格式风格已启用 | 显示数量：${config.markdownStyleMaxDisplay || 10}`);
    }
    if (usePuppeteer) {
        infoItems.push(`🎨 Puppeteer 渲染已启用 | 样式：${config.imageStyle} | 暗黑模式：${config.enablePuppeteerDarkMode}`);
    }
    if (useSvg) {
        infoItems.push(`✨ SVG 渲染已启用 | 暗黑模式：${config.enableSvgDarkMode ? '开启' : '关闭'} | 主题色：${config.svgThemeColor} | 缩放：${config.svgScale}x`);
    }
    if (useCanvas) {
        infoItems.push(`🎨 Canvas 渲染已启用 | 暗黑模式：${config.canvasDarkMode ? '开启' : '关闭'} | 主题色：${config.canvasThemeColor || config.svgThemeColor}`);
    }

    ctx.notifier.create(
        h(h.Fragment, [
            h('p', '🎵 music-link 插件配置项信息：'),
            h('ul', infoItems.map(item => h('li', item)))
        ])
    );
}

function createNotifierInfoOfAssets(ctx, downloadStatus) {
    if (!ctx.notifier || !downloadStatus || downloadStatus.length === 0) return;

    const { h } = require('koishi');
    const statusItems = downloadStatus.map(item => {
        let icon = '';
        let text = '';
        if (item.status === 'success') {
            icon = '✅';
            text = `${item.name} - 下载完成`;
        } else if (item.status === 'failed') {
            icon = '❌';
            text = `${item.name} - 下载失败`;
        } else {
            icon = '📦';
            text = `${item.name} - 已存在`;
        }
        return `${icon} ${item.type}：${text}`;
    });

    ctx.notifier.create(
        h(h.Fragment, [
            h('p', '📦 资源文件状态：'),
            h('ul', statusItems.map(item => h('li', item)))
        ])
    );
}

exports.createNotifierInfoOfConfig = createNotifierInfoOfConfig;
exports.createNotifierInfoOfAssets = createNotifierInfoOfAssets;

function normalizeCommand9Platforms(value) {
    const list = Array.isArray(value) ? value : [value];
    const normalized = [];
    for (const item of list) {
        if (['netease', 'tencent', 'kugou'].includes(item) && !normalized.includes(item)) {
            normalized.push(item);
        }
    }
    return normalized.length ? normalized : ['netease'];
}
exports.normalizeCommand9Platforms = normalizeCommand9Platforms;

// ============ Config Schema ============

const Config = Schema.intersect([
    // ⚙️ 基础指令设置
    Schema.object({
        enableQuote: Schema.boolean().default(true).description("💬 开启后，本插件发送的所有消息都会引用回复触发指令的消息"),
        skipSongListSelection: Schema.boolean().default(false).description("⏭️ 开启后 发送歌单消息的时候 不再等待用户输入序号 直接返回歌单第一首歌曲"),
        useRealAtRobot: Schema.boolean().default(true).experimental().description("🤖 开启后，发送歌单消息时使用真实的艾特机器人自身的消息段，而不是固定的@机器人文本<br>⚠️ 仅在 text/svg/puppeteer 模式生效，QQ Markdown 模式不支持真实艾特<br>⚠️ QQ 平台开启无效（QQ 平台艾特消息段能力有限）"),
        waitTimeout: Schema.natural().role('s').description('⏱️ 允许用户返回选择序号的等待时间').default(45),
        exitCommand: Schema.string().default('0, 不听了').description('🚪 退出选择指令，多个指令间请用逗号分隔开'),
        menuExitCommandTip: Schema.boolean().default(true).description('💡 是否在歌单内容后面追加退出选择指令的文字提示'),
    }).description('⚙️ 基础指令设置'),

    // 🖼️ 歌单渲染格式设置
    Schema.object({
        showGeneratingTip: Schema.boolean().default(true).description('💬 是否在开始生成歌单时发送“🔄 正在生成歌单，请稍候...”的提示消息<br>✅ 开启（默认）：发送提示并在完成后撤回<br>❌ 关闭：不发送提示消息，直接等待渲染完成'),
        renderMode: Schema
            .array(Schema.object({
                mode: Schema.union([
                    Schema.const('text').description('📝 文字模式'),
                    Schema.const('puppeteer').description('🎨 Puppeteer (传统方式)'),
                    Schema.const('svg').description('✨ SVG (resvg 渲染，推荐)'),
                    Schema.const('canvas').description('🎨 Canvas (Skia 渲染，轻量快速)'),
                    Schema.const('markdown_table').description('📊 QQ Markdown 表格模式'),
                    Schema.const('markdown_style').description('💫 QQ Markdown 格式风格'),
                ]).role('radio').description('渲染模式'),
                enabled: Schema.boolean().default(true).description('是否启用'),
            }))
            .role('table')
            .default([
                { mode: 'text', enabled: false },
                { mode: 'puppeteer', enabled: false },
                { mode: 'svg', enabled: false },
                { mode: 'canvas', enabled: true },
                { mode: 'markdown_table', enabled: false },
                { mode: 'markdown_style', enabled: true },
            ])
            .description('🖼️ 消息渲染模式设置（可添加多个，按顺序执行）<br>✨ (非qq官机平台)配合"严格顺序模式"可实现：文字 → SVG → Puppeteer 的发送顺序<br>⚠️ 如果启用了多个相同模式，只有第一个会生效'),
        strictOrderMode: Schema.boolean().default(true).description('📋 是否严格按照上表顺序串行执行（默认 true 为串行渲染）<br>⚠️ <b>强烈建议开启</b>：由于 Node.js单线程特性，并行渲染会导致 CPU争抢，使所有模式都变慢<br>✅ 串行模式：各渲染器独占CPU，互不干扰，总耗时更短<br>🐢 并行模式：多个渲染器同时竞争单线程CPU，互相阻塞，性能会有下降'),
    }).description('🖼️ 歌单渲染格式设置'),

    // 📄 文字歌单设置
    Schema.object({
        textListSeparator: Schema.string().default('${tab}').description('📝 文字歌单中每行不同字段之间的分隔文本，默认使用制表符（${tab}表示制表符）'),
        puppeteerApplySeparator: Schema.boolean().default(false).description('📋 是否在Puppeteer出图时应用separator分隔符'),
        smartTabAlignment: Schema.boolean().default(true).experimental().description('🎯 当使用制表符分隔时，是否智能计算tab数量使各部分左侧对齐'),
    }).description('📄 文字歌单设置'),

    // 📝 QQ Markdown 歌单设置
    Schema.object({
        markdownTableMaxDisplay: Schema.number().default(20).min(1).max(100).description('📊 QQ Markdown 表格模式显示的最大歌曲数量 <br> ↔️ <i> 范围：[1,100]</i>'),
        markdownStyleMaxDisplay: Schema.number().default(10).min(1).max(100).description('💫 QQ Markdown 格式风格显示的最大歌曲数量 <br> ↔️ <i> 范围：[1,100]</i>'),
        markdownSongUseInlineCommandLink: Schema.boolean().default(true).description('🔗 QQ Markdown 是否将歌曲序号渲染为可点击发送的蓝字（`mqqapi://...inlinecmd`）<br>✅ 开启时：可以点击蓝字直接发送序号，也可以手动回复序号<br>📝 关闭时：恢复为原来的普通文本提示'),
        markdownExitUseInlineCommandLink: Schema.boolean().default(true).description('🚪 QQ Markdown 的退出提示是否渲染为可点击发送的蓝字（`mqqapi://...inlinecmd`）<br>✅ 开启时：可以点击蓝字直接发送退出指令，也可以手动回复退出内容<br>📝 关闭时：恢复为原来的普通文本提示'),
        markdownShowVersionInfo: Schema.boolean().default(true).description('📊 是否在 QQ Markdown 消息末尾增加引用块显示版本、时间等信息 <br> 格式长这样捏：<br> <code> > generated by koishi plugin: ... </code> <br> <code> > version: ... </code> <br> <code> > date_time: ... </code> <br> <code> > repo_url: ... </code>'),
    }).description('📝 QQ Markdown 歌单设置'),

    // 🖌️ Puppeteer 渲染图片歌单设置
    Schema.object({
        enablePuppeteerDarkMode: Schema.boolean().default(false).description('🌙 是否开启 Puppeteer 暗黑模式（黑底菜单）'),
        backgroundImagePath: Schema.string().role('textarea', { rows: [2, 5] }).default(path.resolve(__dirname, '../assets/pixai_koishi.png')).description(`🎨 背景图片路径. 仅对${IMAGE_STYLE_MAP.MODERN_SOURCE_HANS_SERIF}生效`),
        textFontPath: Schema.string().role('textarea', { rows: [2, 5] }).default(path.resolve(__dirname, '../assets/LXGWWenKaiMono-Regular.ttf')).description('🔤 文字字体文件路径. 对任何 imageStyle 都生效。'),
        imageStyle: Schema.union([
            Schema.const(IMAGE_STYLE_MAP.ORIGIN_BLACK_WHITE).description('原始_黑白'),
            Schema.const(IMAGE_STYLE_MAP.MODERN_SOURCE_HANS_SERIF).description('现代_思源宋体'),
            Schema.const(IMAGE_STYLE_MAP.FLAT_MODERN).description('扁平_现代'),
        ]).role('radio').description('🎭 图片样式').default(IMAGE_STYLE_MAP.MODERN_SOURCE_HANS_SERIF),
        imageType: Schema.union([
            Schema.const('png').description('🖼️ PNG, ❌ 不支持调整quality'),
            Schema.const('jpeg').description('🌄 JPEG, ✅ 支持调整quality'),
            Schema.const('webp').description('🌐 WEBP, ✅ 支持调整quality'),
        ]).role('radio').default('jpeg').description('📤 渲染图片的输出类型。'),
        screenshotQuality: Schema.number().min(0).max(100).step(1).default(50).description('📏 Puppeteer 截图质量 (0-100)。'),
        addCoverInImage: Schema.boolean().default(false).disabled().experimental().description('🖼️ 是否在图片歌单中添加封面。只对 command6 和 9 生效<br><s>现在还没想好怎么实现，未来可能会做 (())</s>'),
        puppeteerShowRenderInfo: Schema.boolean().default(true).description('📊 是否在 Puppeteer 图片消息段后 增加文字消息段显示渲染耗时等统计信息 <br> 格式长这样捏：<code> (🖼️ Puppeteer 渲染耗时：x ms | 类型：y | 质量：z) </code>'),
        puppeteerShowVersionInfo: Schema.boolean().default(true).description('📊 是否在 Puppeteer 出图中显示版本、时间、仓库等信息（左上角固定位置）<br> 格式长这样捏：<br> <code> generated by koishi plugin: ...  </code> <br> <code> version: ... </code> <br> <code> date_time: ... </code> <br> <code> repo_url: ... </code> <br> <code> quality: ... </code>'),
    }).description('🖌️ Puppeteer 渲染图片歌单设置'),

    // 🎨 SVG 渲染设置
    Schema.object({
        enableSvgDarkMode: Schema.boolean().default(false).description('🌙 是否启用 SVG 出图的暗黑模式（默认亮色模式）'),
        svgThemeColor: Schema.string().default('#7e57c2').role('color').description('🎨 SVG 主题色（默认是Koishi紫捏~）'),
        svgScale: Schema.number().default(2.5).min(0.1).max(10).step(0.1).description('🔍 SVG 渲染缩放比例（影响输出图片大小和清晰度）'),
        svgWidth: Schema.number().default(666).min(100).max(1000).step(1).experimental().description('📐 SVG 图片宽度（px）</br><i>⚠️ 调整列数 和 宽度 可能导致格式变的比较乱，暂时还没想到太好的智能排版方案，</br> 😞所以建议暂时不要动本选项捏</i>'),
        svgColumns: Schema.number().default(3).min(1).max(10).step(1).experimental().description('📊 SVG 歌单列数</br><i>⚠️ 调整列数 和 宽度 可能导致格式变的比较乱，暂时还没想到太好的智能排版方案，</br> 😞所以建议暂时不要动本选项捏</i>'),
        svgColumnLayoutMode: Schema.union([
            Schema.const('column-first').description('📊 先上下再左右（默认，按列填充）'),
            Schema.const('row-first').description('📋 先左右再上下（按行填充）'),
        ]).role('radio').default('row-first').description('🔄 SVG 歌单列排列模式<br>• <b>先上下再左右</b>：从上到下填满第一列，再填第二列...（适合阅读习惯）<br>• <b>先左右再上下</b>：从左到右填满第一行，再填第二行...（类似表格）'),
        svgShowSongDividers: Schema.boolean().default(true).description('📏 是否显示歌曲分割线'),
        svgShowSongBackground: Schema.boolean().default(true).description('🎨 是否显示歌曲底纹圆角矩形（使用主题色）'),
        svgEnableCustomFont: Schema.boolean().default(true).description('🔤 是否启用自定义字体渲染。开启后下方的「字体文件路径」和「font-family名称」配置才会生效。关闭则使用系统默认字体 sans-serif'),
        svgFontFiles: Schema.array(Schema.string())
            .role('table')
            .default([
                path.resolve(__dirname, '../assets/LXGWWenKaiMono-Regular.ttf'),
                // path.resolve(__dirname, '../assets/SourceHanSerifSC-Medium.otf'),
            ])
            .description('🔤 resvg 渲染使用的字体文件路径 <b>(绝对路径)</b>，会按顺序查找所有存在的字体文件并加载'),
        svgFontFamilies: Schema.array(Schema.string())
            .role('table')
            // .default(['LXGWWenKaiMono, Source Han Serif SC Medium, sans-serif'])
            .default(['LXGWWenKaiMono, sans-serif'])
            .description('🔤 resvg 渲染使用的 font-family 名称（需要与字体文件对应），支持多个备用字体族'),
        svgShowRenderInfo: Schema.boolean().default(true).description('📊 是否在 SVG 图片消息段后 增加文字消息段显示渲染耗时等统计信息 <br> 格式长这样捏：<code> (🚀 resvg渲染耗时：a ms | 缩放：b x) </code> '),
        svgShowVersionInfo: Schema.boolean().default(true).description('📊 是否在 SVG 图片底部显示版本、时间、仓库等信息 <br> 格式长这样捏: <br> 格式长这样捏：<br> <code> generated by koishi plugin: ... </code> <br> <code> version: ... </code> <br> <code> date_time: ... </code> <br> <code> repo_url: ... </code> <br> <code> scale: ... </code>'),
    }).description('🎨 SVG 渲染设置'),

    // 🎨 Canvas 渲染设置
    Schema.object({
        canvasDarkMode: Schema.boolean().default(false).description('🌙 是否启用 Canvas 出图的暗黑模式（默认亮色模式）'),
        canvasThemeColor: Schema.string().default('#7e57c2').role('color').description('🎨 Canvas 主题色（默认是Koishi紫捏~）'),
        canvasWidth: Schema.number().default(666).min(100).max(1000).step(1).experimental().description('📐 Canvas 图片宽度（px）</br><i>⚠️ 调整列数 和 宽度 可能导致格式变的比较乱，暂时还没想到太好的智能排版方案，</br> 😞所以建议暂时不要动本选项捏</i>'),
        canvasScale: Schema.number().default(2.5).min(0.5).max(10).step(0.1).description('🔍 Canvas 内部渲染缩放倍率。值越大越清晰，但耗时和图片体积也会增加'),
        canvasColumns: Schema.number().default(3).min(1).max(10).step(1).experimental().description('📊 Canvas 歌单列数</br><i>⚠️ 调整列数 和 宽度 可能导致格式变的比较乱，暂时还没想到太好的智能排版方案，</br> 😞所以建议暂时不要动本选项捏</i>'),
        canvasColumnLayoutMode: Schema.union([
            Schema.const('column-first').description('📊 先上下再左右（默认，按列填充）'),
            Schema.const('row-first').description('📋 先左右再上下（按行填充）'),
        ]).role('radio').default('row-first').description('🔄 Canvas 歌单列排列模式<br>• <b>先上下再左右</b>：从上到下填满第一列，再填第二列...（适合阅读习惯）<br>• <b>先左右再上下</b>：从左到右填满第一行，再填第二行...（类似表格）'),
        canvasShowSongDividers: Schema.boolean().default(true).description('📏 是否显示歌曲分割线'),
        canvasShowSongBackground: Schema.boolean().default(true).description('🎨 是否显示歌曲底纹圆角矩形（使用主题色）'),
        canvasEnableCustomFont: Schema.boolean().default(true).description('🔤 是否启用自定义字体渲染。开启后下方的「字体文件路径」和「font-family名称」配置才会生效。关闭则使用系统默认字体 sans-serif'),
        canvasFontFiles: Schema.array(Schema.string())
            .role('table')
            .default([
                path.resolve(__dirname, '../assets/LXGWWenKaiMono-Regular.ttf'),
            ])
            .description('🔤 Canvas 渲染使用的字体文件路径 <b>(绝对路径)</b>，会按顺序查找所有存在的字体文件并加载'),
        canvasFontFamilies: Schema.array(Schema.string())
            .role('table')
            .default(['LXGW WenKai Mono, sans-serif'])
            .description('🔤 Canvas 渲染使用的 font-family 名称（需要与字体文件对应），支持多个备用字体族'),
        canvasShowRenderInfo: Schema.boolean().default(true).description('📊 是否在 Canvas 图片消息段后 增加文字消息段显示渲染耗时等统计信息 <br> 格式长这样捏：<code> (🎨 canvas渲染耗时：a ms | 缩放: b x) </code> '),
        canvasShowVersionInfo: Schema.boolean().default(true).description('📊 是否在 Canvas 图片底部显示版本、时间、仓库等信息 <br> 格式长这样捏：<br> <code> generated by koishi plugin: ... </code> <br> <code> version: ... </code> <br> <code> date_time: ... </code> <br> <code> repo_url: ... </code> <br> <code> renderer: @napi-rs/canvas (Skia) </code>'),
    }).description('🎨 Canvas 渲染设置'),


    // 🌐 后端API选择
    Schema.object({
        serverSelect: Schema.union([
            Schema.const('command6').description('command6：`api.injahow.cn` 等等api站点       （仅网易云 API 请求快 + 稳定 推荐QQ官方机器人使用） '),
            Schema.const('command9').description('command9：`api.vkeys.cn/v2` 落月API（推荐）  （支持网易云和QQ音乐 支持多音质选择 支持自定义url）'),
        ]).role('radio').default("command6").description('🔧 选择使用的后端<br>📈 推荐度：`我自建的落月api` ≥ `api.vkeys.cn` ≥ `api.injahow.cn`'),
    }).description('🌐 后端API选择'),
    Schema.union([

        Schema.object({
            serverSelect: Schema.const('command6'),
            command6: Schema.string().default('网易点歌').description('📝 `网易点歌` 的指令名称<br>输入歌曲 ID，返回歌曲'),
            command6_searchListLength: Schema.number().default(50).min(1).max(100).description('📋 歌曲搜索的列表长度，即返回的候选项个数<br>⚠️ 不建议超过 50，可能导致文本过长或图片渲染、发送、加载时间变长'),
            maxDuration: Schema.natural().description('⏳ 歌曲最长持续时间，单位为：秒').default(1800),
            command6_useProxy: Schema.boolean().experimental().description('🌍 是否使用 Apifox Web Proxy 代理请求（适用于海外用户）').default(false),
            command6_usedAPI: Schema.union([
                Schema.const('api.injahow.cn').description('黑胶只能30秒的`api.injahow.cn`后端（适合qq平台 官方bot）'),
                Schema.const('meting.jmstrand.cn').description('稳定性未知、全部可听的`meting.jmstrand.cn`后端').experimental(),
                Schema.const('api.qijieya.cn').description('稳定性未知、全部可听的`api.qijieya.cn`后端').experimental(),
                Schema.const('metingapi.nanorocky.top').description('稳定性未知、无损音质、全部可听的`meting.jmstrand.cn`后端').experimental(),
            ]).description("🔗 选择获取音乐直链的后端 API").default("api.qijieya.cn"),
            command6_AddOnebotMusicCard: Schema.boolean().default(true).description("🎵 是否发送 onebot 音乐卡片，位于所有字段的最后<br/>⚠️ *仅适用于 `onebot` 和 `red` 平台，其他平台开启无效*"),
            command6_returnDataField: Schema.array(Schema.object({
                data: Schema.string().description('key'),
                describe: Schema.string().description('对该key的备注'),
                type: Schema.union([
                    Schema.const('text').description('文本（text）'),
                    Schema.const('image').description('图片（image）'),
                    Schema.const('audio').description('语音（audio）'),
                    Schema.const('video').description('视频（video）'),
                    Schema.const('file').description('文件（file）'),
                ]).description('字段发送类型'),
                enable: Schema.boolean().default(true).description('启用'),
            })).role('table').description('📊 歌曲返回信息的字段选择<br>[➣ 点我查看该 API 返回内容示例](http://music.163.com/api/search/get/web?csrf_token=hlpretag=&hlposttag=&s=蔚蓝档案&type=1&offset=0&total=true&limit=10)').default(command6_returnDataField_default),
        }).description('🎵 `网易点歌` API 返回设置'),

        Schema.object({
            serverSelect: Schema.const('command9'),
            command9: Schema.string().default('落月点歌').description('🎵 `落月点歌` 的指令名称<br>✅ 支持网易云、QQ 音乐和酷狗音乐搜索'),
            command9_luoyueApiBaseUrl: Schema.string().role('link').default('https://api.vkeys.cn').description('🔗 落月 API 的基础 URL<br>默认使用官方 API 地址，也可以替换为自建或镜像地址<br>🛠️ 作者自建 API：`http://xwl.vincentzyu233.cn:51217`<br><i>💬 如果挂了可以去qq群`1085190201`里艾特我 `@VincentZyu` </i>'),
            command9_platforms: Schema.array(Schema.union([
                Schema.const('netease').description('网易云音乐'),
                Schema.const('tencent').description('QQ音乐'),
                Schema.const('kugou').description('酷狗音乐'),
            ])).role('checkbox').default(['netease']).description('🎧 选择音乐平台<br>✨ 多选即聚合，不再单独保留旧版本的 `aggregation`选项'),
            command9_searchListLength: Schema.number().default(50).min(1).max(100).description('📋 歌曲搜索的列表长度，即返回的候选项个数<br>🧮 如果选了多个音乐平台，则每个平台的请求数量 = `ceil(Len / n)`<br> 🔢 其中 `Len` 是这里填写的值，`n` 是勾选的平台数, `ceil`是指向上取整 <br>📌 例如 `Len=50`、`n=3` 时：`50/3 = 16.666... ≈ 17`'),
            command9_maxDuration: Schema.natural().description('⏳ 歌曲最长持续时间，单位为：秒').default(1800),
            command9_NeteaseMusicQuality: Schema.union([
                Schema.const(1).description('标准（64k）'),
                Schema.const(2).description('标准（128k）'),
                Schema.const(3).description('HQ极高（192k）'),
                Schema.const(4).description('HQ极高（320k）'),
                Schema.const(5).description('SQ无损'),
                Schema.const(6).description('高解析度无损（Hi-Res）'),
                Schema.const(7).description('高清臻音（Spatial Audio）'),
                Schema.const(8).description('沉浸环绕声（Surround Audio）'),
                Schema.const(9).description('超清母带（Master）'),
            ]).description('🎼 网易云音乐最大音质（网易云音乐专用）').default(5),
            command9_QQMusicQuality: Schema.union([
                Schema.const(4).description('标准音质'),
                Schema.const(8).description('HQ高音质'),
                Schema.const(10).description('SQ无损音质'),
                Schema.const(11).description('Hi-Res音质'),
                Schema.const(12).description('杜比全景声'),
                Schema.const(14).description('臻品母带2.0'),
            ]).description('🎼 QQ 音乐最大音质（QQ 音乐专用）').default(10),
            command9_KugouMusicQuality: Schema.union([
                Schema.const('128').description('标准音质'),
                Schema.const('320').description('HQ高品质'),
                Schema.const('flac').description('SQ无损'),
                Schema.const('high').description('Hi-Res'),
            ]).description('🎼 酷狗音乐最大音质（酷狗专用）').default('320'),
            command9_AddOnebotMusicCard: Schema.boolean().default(false).description("🎵 是否发送 onebot 音乐卡片，位于所有字段的最后<br/>⚠️ *仅适用于 onebot 平台，其他平台开启无效*"),
            command9_returnDataField: Schema.array(Schema.object({
                data: Schema.string().description('key'),
                describe: Schema.string().description('对该key的备注'),
                type: Schema.union([
                    Schema.const('text').description('文本（text）'),
                    Schema.const('image').description('图片（image）'),
                    Schema.const('audio').description('语音（audio）'),
                    Schema.const('video').description('视频（video）'),
                    Schema.const('file').description('文件（file）'),
                ]).description('字段发送类型'),
                enable: Schema.boolean().default(true).description('启用'),
            })).role('table').description('📊 歌曲返回信息的字段选择').default(command9_returnDataField_default),
        }).description('🌙 `落月点歌` API 返回设置'),

        Schema.object({
        }).description('↑ 请选择后端服务 ↑'),
    ]),

    // 💬 更多Bot发送的音乐消息细节设置
    Schema.object({
        isfigure: Schema.boolean().default(false).description("📦 `图片、文本`元素 使用合并转发，其余单独发送<br>`仅支持 onebot 适配器` 其他平台开启 无效"),
        isuppercase: Schema.boolean().default(false).description("🔠 将链接域名进行大写置换，仅适用于qq官方平台"),
        dataFieldSortMode: Schema.union([
            Schema.const('text').description('【text】富媒体置底：文字 > 图片 > 语音 ≥ 视频 ≥ 文件 （默认）'),
            Schema.const('image').description('【image】富媒体置底但是图片置顶：图片 > 文字 ≥ 语音 ≥ 视频 ≥ 文件 （仅qq官方机器人考虑使用）'),
            Schema.const('raw').description('【raw】严格按照 `command_returnDataField` 表格的顺序 （严格按照配置项表格的上下顺序）'),
        ]).role('radio').default("text").description('📐 对 `command*_returnDataField`配置项 排序的控制<br>优先级越高，顺序越靠前<br>[➣点我查看此配置项 效果预览图](https://i0.hdslb.com/bfs/article/6e8b901f9b9daa57f082bf0cece36102312276085.png)'),
    }).description('💬 更多 Bot 发送的音乐消息细节设置'),

    // 🎴 中间件解析Onebot音乐卡片Json的相关设置
    Schema.object({
        enablemiddleware: Schema.boolean().description("🔍 是否自动解析Onebot音乐卡片json <br> <i> ⚠️仅对Onebot平台生效</i>").default(false),
        enablePrependMiddleware: Schema.boolean().description("⚡ 是否使用前置中间件监听<br>`中间件无法接受到消息可以考虑开启`").default(false),
        enableWhitelist: Schema.boolean().default(true).description('🎯 是否启用白名单过滤<br>✅ 开启（默认）：只解析白名单中允许的卡片类型<br>❌ 关闭：解析所有音乐卡片'),
        customWhitelist: Schema.array(Schema.object({
            viewType: Schema.string().default('music').description('视图类型'),
            enabled: Schema.boolean().default(true).description('启用此规则'),
        })).role('table').description('⚙️ 自定义白名单规则<br>只有匹配白名单规则的卡片才会被解析<br>💡 留空表示拒绝所有卡片<br><b>常见类型说明：</b><br>• <code>music</code> - 大概率为单曲卡片（推荐启用）<br>• <code>news</code> - 大概率为歌单、一起听等（通常禁用）<br>• <code>其他</code> - 如果以后有新的type你也可以自己填入喵').default([
            { viewType: 'music', enabled: true },
            { viewType: 'news', enabled: false },
        ]),
        // <br>• <code>music</code> - 单曲卡片（最常见）<br>• <code>news</code> - 歌单/一起听等其他卡片<br>• 其他 - 自定义类型
        used_id: Schema.number().default(1).min(0).max(10).description("🔢 在歌单里默认选择的序号<br>范围`0-10`，无需考虑11-20，会自动根据Onebot音乐卡片卡片的平台选择。若音乐平台不匹配 则在搜索项前十个进行选择。"),
    }).description('🎴 中间件解析Onebot音乐卡片Json的相关设置'),

    // ⬇️ 音乐文件下载设置 📄
    Schema.object({
        enableFileDownload: Schema.boolean().default(true).description('📥 是否启用音乐文件下载到本地功能 <br> <i> 仅当需要发送语音/视频/文件消息时才需开启 </i> <br> ⚠️ <b>关闭后，下方所有下载相关配置均无效</b>'),
        cacheDir: Schema.string().role('textarea', { rows: [2, 5] }).default(path.resolve(__dirname, '..', 'cache')).description('📁 音乐文件缓存目录（绝对路径）<br>默认值为插件目录下的 cache 文件夹<br>💡 <i>仅在上方"【启用文件下载】`enableFileDownload`"配置项开启时生效</i>'),
        autoCreateCacheDir: Schema.boolean().default(true).description('📂 当缓存目录不存在时是否自动创建<br>✅ 开启（默认）：自动创建目录<br>❌ 关闭：如果目录不存在则跳过下载并记录错误<br>💡 <i>仅在上方"【启用文件下载】`enableFileDownload`"配置项开启时生效</i>'),
        deleteTempTime: Schema.number().default(300).description('🗑️ 对于`file`类型的`Temp`临时文件的删除时间<br>若干`秒`后 删除下载的本地临时文件<br>⚠️ 设置为 `0` 或 `负数` 时，表示永远不删除临时文件<br>💡 <i>仅在上方"【启用文件下载】`enableFileDownload`"配置项开启时生效</i>'),
        renameTempFile: Schema.boolean().default(true).description('✏️ 是否启用`音频文件`自定义命名<br>关闭则使用随机十六进制字符串作为文件名（`crypto.randomBytes(8).toString(\'hex\')`）<br>💡 <i>仅在上方"【启用文件下载】`enableFileDownload`"配置项开启时生效</i>'),
        fileNameTemplate: Schema.string().role('textarea', { rows: [2, 4] }).default('${name}-${artist}-${time}').description('📄 文件名模板（不含扩展名，扩展名会自动添加）<br>可用占位符：<br>`${name}` 歌曲名称<br>`${artist}` 歌手<br>`${id}` 歌曲ID<br>`${quality}` 音质<br>`${platform}` 平台<br>`${time}` 时间戳 (YYYYMMDD-HHMMSS)<br>💡 <i>需同时开启"【启用文件下载】`enableFileDownload`"和"【自定义命名】`renameTempFile`"才生效</i>'),
        fileNameKeepSpaces: Schema.boolean().default(false).description('🔤 是否保留文件名中的空格<br>⚠️ 关闭（默认）：空格会被替换为横杠`-`，这是业界通用做法，可避免某些系统/协议端的兼容性问题<br>💡 <i>需同时开启"【启用文件下载】`enableFileDownload`"和"【自定义命名】`renameTempFile`"才生效</i>').experimental(),
        fileNameSlashReplacement: Schema.union([
            Schema.const('-').description('横杠 - （默认，业界通用）'),
            Schema.const('&').description('与号 &（多歌手分隔常用）'),
            Schema.const('_').description('下划线 _'),
            Schema.const(',').description('逗号 ,'),
            Schema.const('').description('直接删除'),
        ]).default('-').description('📁 文件名中的斜杠`/`替换为什么字符<br>影响歌曲名、歌手名等所有字段中的斜杠<br>⚠️ 建议使用默认的横杠`-`，这是业界通用做法，可避免路径解析等奇怪问题<br>💡 <i>需同时开启"【启用文件下载】`enableFileDownload`"和"【自定义命名】`renameTempFile`"才生效</i>').experimental(),
        fileTransferMode: Schema.union([
            Schema.const('localPath').description('【本地路径】file:// 协议（适用于Koishi 和 协议端在同一设备）'),
            Schema.const('base64').description('【Base64】base64:// 协议（适用于 Koishi 和 协议端 在不同设备/容器， 比如`Napcat Docker`、`LLBot Docker`等，或者说又比如你的koishi是在docker里面跑的）'),
        ]).role('radio').default('base64').description('📡 文件传输模式（仅影响发送时的协议类型，不影响是否保存到本地）<br>• `localPath`: 使用 file:// 协议引用已保存的本地文件<br>• `base64`: 使用 base64:// 协议嵌入文件内容（适合跨设备/容器场景）<br>⚠️ 无论选择哪种模式，只要开启"启用文件下载"就会保存到本地磁盘').experimental(),
    }).description('⬇️ 音乐文件下载设置 📄'),

    // 🔍 调试模式
    Schema.object({
        loggerinfo: Schema.boolean().default(false).description('🐛 日志调试开关'),
        verboseFileLog: Schema.boolean().default(false).description('📝 开启后将最后一次请求的歌单输出到 `/log/songlist-latest.json`（方便调试）'),
    }).description('🔍 调试模式'),
]);

exports.Config = Config;
