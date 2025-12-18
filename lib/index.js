"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apply = exports.Config = exports.usage = exports.inject = exports.name = void 0;
const { Schema, Logger, h } = require("koishi");
const { readFileSync } = require('fs')
const { resolve } = require('path')
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const path = require('node:path');
const url = require('node:url');
const { generateSongListImage, logInfo } = require('./render');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const name = 'music-link';
const inject = {
   required: ['http', "i18n"],
   optional: ['puppeteer'],
};
const logger = new Logger('music-link');

const pkg = JSON.parse(
   readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
)

const usage = `
<h1>Koishi 插件：music-link-vincentzyu-fork</h1>
<h2>🎯 插件版本：v${pkg.version}</h2>
<h3>原始仓库: <a href="https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/music-link" target="_blank">https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/music-link</a></h3>

<p>插件使用问题 / Bug反馈 / 插件开发交流，欢迎加入QQ群：<b>259248174</b></p>

<hr>

<details>
<summary><h3>使用方法 (点击展开)</h3></summary>

<p>安装并配置插件后，使用下述命令搜索和下载音乐：</p>
<hr>

<h3>使用api.vkeys.cn/v2 落月API搜索音乐（推荐）</h3>
<pre><code>落月点歌 [歌曲名称/歌曲ID]</code></pre>
<p><b>(最推荐)</b> api.vkeys.cn 落月API，API请求快速且稳定，支持<b>网易云音乐</b>和<b>QQ音乐</b>，支持多种音质选择（最高支持超清母带/臻品母带2.0），可以通过歌曲名称或歌曲ID进行搜索。<b>支持付费歌曲！</b></p>
<hr>

<h3>使用api.injahow.cn网站搜索网易云音乐</h3>
<pre><code>网易点歌 [歌曲名称/歌曲ID]</code></pre>
<p><b>(推荐)</b> api.injahow.cn 网站，API请求快速且稳定，无需 puppeteer 服务，推荐QQ官方机器人使用此后端，使用这个后端VIP歌曲只能听45秒，但这个指令还有一个后端可以都听。很好用哦<b>仅支持网易云音乐</b>，可以通过歌曲名称或歌曲ID进行搜索。</p>
<hr>

</details>

---

<h3>如何返回语音/视频/群文件消息</h3>
<p>可以修改对应指令的<code>返回字段表</code>中的 <code>下载链接</code> 对应的 <code>字段发送类型</code> 字段，

把 <code>text</code> 更改为 <code>audio</code> 就是返回 语音，

改为 <code>video</code> 就是返回 视频消息，

改为 <code>file</code> 就是返回 群文件。</p>
<hr>

<p>⚠️需要注意的是，当配置返回格式为音频/视频的时候，请自行检查是否安装了 <code>silk</code>、<code>ffmpeg</code> 等服务。</p>
<p>⚠️如果你选择了 <code>file</code> 类型，请确保平台支持！目前仅实测了 <code>onebot</code> 平台的部分协议端支持！</p>
<hr>

<h3>使用 <code>-n 1</code> 直接返回内容</h3>
<p>在使用命令时，可以通过添加 <code>-n 1</code> 选项直接返回指定序号的歌曲内容。这对于快速获取特定歌曲非常有用。</p>
<p>例如，使用以下命令可以直接获取第一首歌曲的详细信息：</p>
<pre><code>落月点歌 -n 1 蔚蓝档案</code></pre>

<h3>使用 <code>-s</code> 跳过歌单选择</h3>
<p>在使用命令时，可以通过添加 <code>-s</code> 或 <code>--skip</code> 选项跳过歌单选择，直接返回第一首歌曲。</p>
<p>例如：</p>
<pre><code>落月点歌 -s 蔚蓝档案</code></pre>


---
| 后端推荐度 |               名称                | 备注  |
| :--------: | :-------------------------------: | :---: |
|   **ⅰ**    | \`api.vkeys.cn\` (落月API) | 极高  |
|   **ⅱ**    | \`api.injahow.cn\` (歌曲搜索) | 较高  |
|   **ⅲ**    |   \`dev.iw233.cn\` (音乐搜索器)   | 中等  |
|  *......*  |               其他                | 中等  |

---

<h3>关于落月API</h3>
<p>落月API是一个高质量的音乐API服务，支持网易云音乐和QQ音乐。</p>
<ul>
<li>支持付费歌曲（但付费专辑无法获取）</li>
<li>支持多种音质选择（网易云：标准64k ~ 超清母带；QQ音乐：标准 ~ 臻品母带2.0）</li>
<li>API文档：<a href="https://doc.vkeys.cn" target="_blank">https://doc.vkeys.cn</a></li>
<li>数据缓存时间：5分钟 ~ 1天</li>
</ul>

---

`;



const command6_return_data_Field_default = [
   {
      "data": "name",
      "describe": "歌曲名称",
      "type": "text"
   },
   {
      "data": "id",
      "describe": "歌曲ID",
      "type": "text"
   },
   {
      "data": "artist",
      "describe": "歌手",
      "type": "text"
   },
   {
      "data": "url",
      "describe": "下载链接",
      "type": "text"
   },
   {
      "data": "pic",
      "describe": "封面链接",
      "type": "image"
   },
   {
      "data": "lrc",
      "describe": "歌词",
      "type": "text",
      "enable": false
   }
];

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

const IMAGE_STYLE_MAP = {
   ORIGIN_BLACK_WHITE: 'ORIGIN_BLACK_WHITE',
   MODERN_SOURCE_HANS_SERIF: 'MODERN_SOURCE_HANS_SERIF',
   FLAT_MODERN: 'FLAT_MODERN',
}


const Config = Schema.intersect([
   Schema.object({
      enableReplySonglist: Schema.boolean().default(true).description("开启后 发送歌单消息的时候 会回复触发指令的消息"),
      skipSongListSelection: Schema.boolean().default(false).description("开启后 发送歌单消息的时候 不再等待用户输入序号 直接返回歌单第一首歌曲"),
      waitTimeout: Schema.natural().role('s').description('允许用户返回选择序号的等待时间').default(45),
      exitCommand: Schema.string().default('0, 不听了').description('退出选择指令，多个指令间请用逗号分隔开'), // 兼容中文逗号、英文逗号
      menuExitCommandTip: Schema.boolean().default(false).description('是否在歌单内容的后面，加上退出选择指令的文字提示'),
   }).description('基础设置'),

   Schema.object({
      imageMode: Schema.boolean().default(true).description('开启后返回图片歌单（需要puppeteer服务），关闭后返回文本歌单（部分指令必须使用puppeteer）'),
      darkMode: Schema.boolean().default(true).description('是否开启暗黑模式（黑底菜单）'),
      backgroundImagePath: Schema.string().role('textarea', { rows: [2, 5] }).default(path.resolve(__dirname, '../assets/pixai_koishi.png')).description(`背景图片路径. 仅对${IMAGE_STYLE_MAP.MODERN_SOURCE_HANS_SERIF}生效`),
      textFontPath: Schema.string().role('textarea', { rows: [2, 5] }).default(path.resolve(__dirname, '../assets/SourceHanSerifSC-Medium.otf')).description('文字字体文件路径. 对任何imageStyle都生效。'),
      imageStyle: Schema.union([
         Schema.const(IMAGE_STYLE_MAP.ORIGIN_BLACK_WHITE).description('原始_黑白'),
         Schema.const(IMAGE_STYLE_MAP.MODERN_SOURCE_HANS_SERIF).description('现代_思源宋体'),
         Schema.const(IMAGE_STYLE_MAP.FLAT_MODERN).description('扁平_现代'),
      ]).role('radio').description('图片样式').default(IMAGE_STYLE_MAP.MODERN_SOURCE_HANS_SERIF),
      addCoverInImage: Schema.boolean().default(true).description('是否在图片歌单中添加封面. 只对command6和8生效'),

   }).description('图片歌单设置'),

   Schema.object({
      serverSelect: Schema.union([
         Schema.const('command6').description('command6：`api.injahow.cn`网站       （API 请求快 + 稳定 推荐QQ官方机器人使用）      （网易云）'),
         Schema.const('command9').description('command9：`api.vkeys.cn/v2`落月API（推荐）  支持网易云和QQ音乐 支持多音质选择'),
      ]).role('radio').default("command6").description('选择使用的后端<br>➣ 推荐度：`api.vkeys.cn` ≥ `api.injahow.cn`  ≥ `music.gdstudio.xyz` ≥ `dev.iw233.cn` ≥ `api.dragonlongzhu.cn` > `星之阁API`'),
   }).description('后端选择'),
   Schema.union([

      Schema.object({
         serverSelect: Schema.const('command6'),
         command6: Schema.string().default('网易点歌').description('`网易点歌`的指令名称<br>输入歌曲ID，返回歌曲'),
         command6_searchListLength: Schema.number().default(50).min(1).max(100).description('歌曲搜索的列表长度。返回的候选项个数。不建议超过50，可能超过最长文本长度/让图片渲染、发送、加载时间变长'),
         maxDuration: Schema.natural().description('歌曲最长持续时间，单位为：秒').default(900),
         command6_useProxy: Schema.boolean().experimental().description('是否使用 Apifox Web Proxy 代理请求（适用于海外用户）').default(false),
         command6_usedAPI: Schema.union([
            Schema.const('api.injahow.cn').description('（稳定）黑胶只能30秒的`api.injahow.cn`后端（适合官方bot）'),
            Schema.const('meting.jmstrand.cn').description('（推荐）稳定性未知、全部可听的`meting.jmstrand.cn`后端').experimental(),
            Schema.const('api.qijieya.cn').description('（推荐）稳定性未知、全部可听的`api.qijieya.cn`后端').experimental(),
            Schema.const('metingapi.nanorocky.top').description('(不推荐 文件很大) 稳定性未知、无损音质、全部可听的`meting.jmstrand.cn`后端').experimental(),
         ]).description("选择 获取音乐直链的后端API").default("api.qijieya.cn"),
         command6_add_music_card: Schema.boolean().default(true).description("是否发送onebot音乐卡片，位于所有的字段的最后 <br/> *仅适用于onebot平台，其他平台开启无效*"),
         command6_return_data_Field: Schema.array(Schema.object({
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
         })).role('table').description('歌曲返回信息的字段选择<br>[➣ 点我查看该API返回内容示例](http://music.163.com/api/search/get/web?csrf_token=hlpretag=&hlposttag=&s=蔚蓝档案&type=1&offset=0&total=true&limit=10)').default(command6_return_data_Field_default),
      }).description('`网易点歌`返回设置'),

      Schema.object({
         serverSelect: Schema.const('command9'),
         command9: Schema.string().default('落月点歌').description('`落月点歌`的指令名称<br>支持网易云和QQ音乐搜索'),
         command9_luoyueApiBaseUrl: Schema.string().default('https://api.vkeys.cn').description('落月API的基础URL<br>默认为官方API地址，可以替换为自建或镜像地址'),
         command9_platform: Schema.union([
            Schema.const('netease').description('网易云音乐'),
            Schema.const('tencent').description('QQ音乐'),
            Schema.const('aggregation').description('聚合(选择此项会让歌单长度是searchListLength配置项的二倍)'), //结合了qq和网易云
         ]).role('radio').default('netease').description('选择音乐平台'),
         command9_searchListLength: Schema.number().default(50).min(1).max(100).description('歌曲搜索的列表长度。返回的候选项个数。'),
         command9_maxDuration: Schema.natural().description('歌曲最长持续时间，单位为：秒').default(900),
         command9_quality: Schema.union([
            Schema.const(1).description('标准（64k）'),
            Schema.const(2).description('标准（128k）'),
            Schema.const(3).description('HQ极高（192k）'),
            Schema.const(4).description('HQ极高（320k）'),
            Schema.const(5).description('SQ无损'),
            Schema.const(6).description('高解析度无损（Hi-Res）'),
            Schema.const(7).description('高清臻音（Spatial Audio）'),
            Schema.const(8).description('沉浸环绕声（Surround Audio）'),
            Schema.const(9).description('超清母带（Master）'),
         ]).description('网易云音乐最大音质（网易云音乐专用）').default(5),
         command9_quality_qq: Schema.union([
            Schema.const(4).description('标准音质'),
            Schema.const(8).description('HQ高音质'),
            Schema.const(10).description('SQ无损音质'),
            Schema.const(11).description('Hi-Res音质'),
            Schema.const(12).description('杜比全景声'),
            Schema.const(14).description('臻品母带2.0'),
         ]).description('QQ音乐最大音质（QQ音乐专用）').default(10),
         command9_add_music_card: Schema.boolean().default(false).description("是否发送onebot音乐卡片，位于所有的字段的最后 <br/> *仅适用于onebot平台，其他平台开启无效*"),
         command9_return_data_Field: Schema.array(Schema.object({
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
         })).role('table').description('歌曲返回信息的字段选择').default(command6_return_data_Field_default),
      }).description('`落月点歌`返回设置'),

      Schema.object({
      }).description('↑ 请选择后端服务 ↑'),
   ]),

   Schema.object({
      enablemiddleware: Schema.boolean().description("是否自动解析JSON音乐卡片").default(false),
      enablePrependMiddleware: Schema.boolean().description("是否使用前置中间件监听<br>`中间件无法接受到消息可以考虑开启`").default(false),
      used_id: Schema.number().default(1).min(0).max(10).description("在歌单里默认选择的序号<br>范围`0-10`，无需考虑11-20，会自动根据JSON卡片的平台选择。若音乐平台不匹配 则在搜索项前十个进行选择。"),
   }).description('JSON卡片解析设置'),

   Schema.object({
      isfigure: Schema.boolean().default(false).description("`图片、文本`元素 使用合并转发，其余单独发送<br>`仅支持 onebot 适配器` 其他平台开启 无效").experimental(),
      isuppercase: Schema.boolean().default(false).description("将链接域名进行大写置换，仅适用于qq官方平台").experimental(),
      data_Field_Mode: Schema.union([
         Schema.const('text').description('富媒体置底：文字 > 图片 > 语音 ≥ 视频 ≥ 文件 （默认）'),
         Schema.const('image').description('仅图片置顶的 富媒体置底：图片 > 文字 ≥ 语音 ≥ 视频 ≥ 文件 （仅官方机器人考虑使用）'),
         Schema.const('raw').description('严格按照 `command_return_data_Field` 表格的顺序 （严格按照配置项表格的上下顺序）'),
      ]).role('radio').default("text").description('对 `command*_return_data_Field`配置项 排序的控制<br>优先级越高，顺序越靠前<br>[➣点我查看此配置项 效果预览图](https://i0.hdslb.com/bfs/article/6e8b901f9b9daa57f082bf0cece36102312276085.png)'),
      renameTempFile: Schema.boolean().default(false).description('是否对`临时音频文件`以`歌曲名称`重命名<br>否则会使用hash值为名称<br>（仅在部分协议端的`h.file`方法下见效）').experimental(),
      deleteTempTime: Schema.number().default(20).description('对于`file`类型的`Temp`临时文件的删除时间<br>若干`秒`后 删除下载的本地临时文件').experimental(),
   }).description('高级进阶设置'),

   Schema.object({
      loggerinfo: Schema.boolean().default(false).description('日志调试开关'),
   }).description('调试模式'),
]);

/**
 * 验证并下载字体文件
 * @param ctx Koishi Context 实例
 * @returns Promise<void>
 */
async function validateAssets(ctx) {
   const assetsDir = path.join(__dirname, '..', 'assets');

   // 确保assets目录存在
   if (!existsSync(assetsDir)) {
      mkdirSync(assetsDir, { recursive: true });
   }

   const assetConfigs = [
      {
         filename: 'LXGWWenKaiMono-Regular.ttf',
         downloadUrl: 'https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/fonts/LXGWWenKaiMono-Regular.ttf',
         type: 'font'
      },
      {
         filename: 'SourceHanSerifSC-Medium.otf',
         downloadUrl: 'https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/fonts/SourceHanSerifSC-Medium.otf',
         type: 'font'
      },
      {
         filename: 'mahiro_mihari.png',
         downloadUrl: 'https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/bg/mahiro_mihari.png',
         type: 'image'
      },
      {
         filename: 'pixai_koishi.png',
         downloadUrl: 'https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/bg_koishi/pixai_koishi.png',
         type: 'image'
      }
   ];

   for (const assetConfig of assetConfigs) {
      const assetPath = path.join(assetsDir, assetConfig.filename);

      // 检查资源文件是否存在
      if (!existsSync(assetPath)) {
         logger.info(`${assetConfig.type === 'font' ? '字体' : '图片'}文件 ${assetConfig.filename} 不存在，开始下载...`);

         try {
            // 下载资源文件
            const response = await ctx.http.get(assetConfig.downloadUrl, { responseType: 'arraybuffer' });
            const assetBuffer = Buffer.from(response);

            // 保存资源文件
            writeFileSync(assetPath, assetBuffer);
            logger.info(`${assetConfig.type === 'font' ? '字体' : '图片'}文件 ${assetConfig.filename} 下载完成`);
         } catch (error) {
            logger.error(`下载${assetConfig.type === 'font' ? '字体' : '图片'}文件 ${assetConfig.filename} 失败: ${error.message}`);
         }
      } else {
         logger.debug(`${assetConfig.type === 'font' ? '字体' : '图片'}文件 ${assetConfig.filename} 已存在`);
      }
   }
}

function apply(ctx, config) {
   // 设置全局变量以支持render.js中的向后兼容
   global._musicPluginConfig = config;
   global._musicPluginLogger = logger;

   const tempDir = path.join(__dirname, 'temp'); // h.file的临时存储 用于解决部分协议端必须上传本地URL
   let isTempDirInitialized = false;
   const tempFiles = new Set(); // 用于跟踪临时文件路径

   ctx.on('ready', async () => {
      // 验证并下载字体文件
      await validateAssets(ctx);

      ctx.i18n.define("zh-CN", {
         commands: {
            [config.command6]: {
               description: `网易云点歌`,
               messages: {
                  "nopuppeteer": "没有开启puppeteer服务",
                  "nokeyword": `请输入网易云歌曲的 名称 或 ID。\n➣示例：/${config.command6} 蔚蓝档案\n➣示例：/${config.command6} 2608813264`,
                  "invalidNumber": "序号输入错误，已退出歌曲选择。",
                  "waitTime": "请在{0}秒内，\n输入歌曲对应的序号:\n➣示例：@机器人 1",
                  "waitTimeout": "输入超时，已取消点歌。",
                  "exitprompt": "已退出歌曲选择。",
                  "noplatform": "获取歌曲失败。",
                  "somerror": "解析歌曲详情时发生错误",
                  "songlisterror": "无法获取歌曲列表，请稍后再试。",
                  "maxsongDuration": "歌曲持续时间超出限制，允许的单曲最大时长为 {0} 秒。",
               }
            },
            [config.command9]: {
               description: `落月点歌（支持网易云和QQ音乐）`,
               messages: {
                  "nokeyword": `请输入歌曲的 名称 或 ID。\n➣示例：/${config.command9} 蔚蓝档案\n➣示例：/${config.command9} 2608813264`,
                  "invalidNumber": "序号输入错误，已退出歌曲选择。",
                  "waitTime": "请在{0}秒内，\n输入歌曲对应的序号:\n➣示例：@机器人 1",
                  "waitTimeout": "输入超时，已取消点歌。",
                  "exitprompt": "已退出歌曲选择。",
                  "somerror": "解析歌曲详情时发生错误",
                  "songlisterror": "无法获取歌曲列表，请稍后再试。",
                  "maxsongDuration": "歌曲持续时间超出限制，允许的单曲最大时长为 {0} 秒。",
               }
            },
         }
      });

      if (config.enablemiddleware) {
         ctx.middleware(async (session, next) => {
            try {
               // 解析消息内容
               const messageElements = await h.parse(session.content);

               // 遍历解析后的消息元素
               for (const element of messageElements) {
                  // 确保元素类型为 'json' 并且有数据
                  if (element.type === 'json' && element.attrs && element.attrs.data) {
                     const jsonData = JSON.parse(element.attrs.data);
                     logInfo(JSON.stringify(jsonData, null, 2), null, config, logger);


                     // 检查是否存在 musicMeta 和 tag
                     const musicMeta = jsonData?.meta?.music || jsonData?.meta?.news; // 尝试兼容两种结构
                     const tag = musicMeta?.tag;
                     if (musicMeta && tag.includes("音乐")) {

                        const title = musicMeta.title;
                        const desc = musicMeta.desc;
                        logInfo("↡--------------中间件解析--------------↡", null, config, logger);
                        logInfo(tag, null, config, logger);
                        logInfo(title, null, config, logger);
                        logInfo(desc, null, config, logger);
                        logInfo("↟--------------中间件解析--------------↟", null, config, logger);
                        // 获取配置的指令名称
                        let command = config.serverSelect;
                        let commandName = config[command]; // 直接使用 config[command] 获取配置项的值
                        logInfo(commandName, null, config, logger);
                        if (!commandName) {
                           commandName = '歌曲搜索'; // 默认值，以防配置项不存在
                           logger.error(`未找到配置项 ${command} 对应的指令名称，使用默认指令名称 '歌曲搜索'`);
                        }

                        // 如果选择了 command6 并且是网易云音乐卡片
                        if (command === 'command6' && tag === '网易云音乐') {
                           // 直接提取歌曲 ID
                           const jumpUrl = musicMeta.jumpUrl;
                           const match = jumpUrl?.match(/id=(\d+)/); // 使用 ?. 确保 jumpUrl 不为 null 或 undefined
                           if (match && match[1]) {
                              const songId = match[1];
                              logInfo(`提取到网易云音乐 ID: ${songId}`, null, config, logger);

                              // 执行 command6 指令
                              await session.execute(`${commandName} ${songId}`);
                              return; // 结束当前中间件处理
                           } else {
                              logger.error('未能在 jumpUrl 中找到歌曲 ID');
                           }
                        } else {
                           // 其他情况，按照原逻辑处理
                           let usedId = config.used_id;

                           if (command) {
                              // 更通用的获取指令名称方式
                              logInfo(`${commandName} -n ${usedId} “${title} ${desc}”`)
                              await session.execute(`${commandName} -n ${usedId} “${title} ${desc}”`);
                           }
                        }
                     }
                  }
               }
            } catch (error) {
               ctx.logger.error(error);
               await session.send('处理消息时出错。');
            }
            // 如果没有匹配到任何 json 数据，继续下一个中间件
            return next();
         }, config.enablePrependMiddleware);
      }

      if (config.serverSelect === "command6") {
         ctx.command(`${config.command6} <keyword:text>`)
            .option('image_style', '-i, --image_style <image_style:number> 图片样式')
            .example("网易点歌 2608813264")
            .example("网易点歌 蔚蓝档案")
            .option('number', '-n <number:number> 歌曲序号')
            .option('skip', '-s, --skip 跳过歌单选择，直接返回第一首歌曲')
            .action(async ({ session, options }, keyword) => {
               if (!keyword) return h.text(session.text(`.nokeyword`));

               const isSongId = /^\d+$/.test(keyword.trim());
               const useApi = config.command6_usedAPI; // 获取用户选择的 API

               if (isSongId && !options.number) {
                  try {
                     // 获取歌曲直链 (根据选择的 API 调整)
                     let songUrl = '';
                     if (useApi === 'api.injahow.cn') {
                        songUrl = `https://api.injahow.cn/meting/?type=url&id=${selectedSongId}`;
                     } else if (useApi === 'meting.jmstrand.cn') {
                        songUrl = `https://meting.jmstrand.cn/?type=url&id=${selectedSongId}`;
                     } else if (useApi === 'api.qijieya.cn') {
                        songUrl = `https://api.qijieya.cn/meting/?type=url&id=${selectedSongId}`;
                     } else if (useApi === 'metingapi.nanorocky.top') {
                        songUrl = `https://metingapi.nanorocky.top/?server=netease&type=url&id=${selectedSongId}`;
                     }

                     logInfo("请求 API (songUrl):", songUrl);
                     // 请求 163 API 获取歌曲详情 (用于获取歌曲名称、艺术家、图片等信息，与获取直链的 API 无关)
                     const apiBase = `http://music.163.com/api/song/detail/?id=${keyword}&ids=[${keyword}]`;
                     logInfo("请求 API (ID点歌):", apiBase);

                     let apiResponse;
                     if (config.command6_useProxy) {
                        // 使用代理请求
                        apiResponse = await requestWithProxy(apiBase);
                     } else {
                        // 直接请求
                        apiResponse = await ctx.http.get(apiBase);
                     }

                     let parsedApiResponse;
                     try {
                        parsedApiResponse = JSON.parse(apiResponse);
                     } catch (e) {
                        ctx.logger.error("JSON 解析失败:", e);
                        return h.text(session.text(`.songlisterror`));
                     }

                     if (!parsedApiResponse || parsedApiResponse.code !== 200 || !parsedApiResponse.songs || parsedApiResponse.songs.length === 0) {
                        return h.text(session.text(`.songlisterror`));
                     }

                     const songData = parsedApiResponse.songs[0];
                     if (!songData) {
                        ctx.logger.error('网易单曲点歌插件出错， 获取歌曲信息失败');
                        return h.text(session.text(`.songlisterror`));
                     }


                     // 处理歌词 (仍然使用 163 的 API)
                     let lyric = '歌词获取失败';
                     try {
                        const lyricApiUrl = `https://music.163.com/api/song/lyric?id=${keyword}&lv=1&kv=1&tv=-1`;

                        let lyricResponse;
                        if (config.command6_useProxy) {
                           // 使用代理请求
                           lyricResponse = await requestWithProxy(lyricApiUrl);
                        } else {
                           // 直接请求
                           lyricResponse = await ctx.http.get(lyricApiUrl);
                        }
                        const parsedLyricResponse = JSON.parse(lyricResponse);
                        if (parsedLyricResponse.code === 200 && parsedLyricResponse.lrc && parsedLyricResponse.lrc.lyric) {
                           lyric = `\n${parsedLyricResponse.lrc.lyric}`;
                        } else {
                           ctx.logger.error(`获取歌词失败: ${lyricApiUrl}，返回代码: ${parsedLyricResponse.code}`);
                           ctx.logger.error(lyricResponse);
                        }
                     } catch (error) {
                        ctx.logger.error(`获取歌词失败:`, error);
                     }

                     const processedSongData = {
                        name: songData.name,
                        artist: songData.artists.map(artist => artist.name).join('/'),
                        url: songUrl,
                        lrc: lyric,
                        pic: songData.album.picUrl,
                        id: songData.id,
                     };
                     logInfo(processedSongData);
                     const response = generateResponse(session, processedSongData, config.command6_return_data_Field);
                     return response;
                  } catch (error) {
                     ctx.logger.error('网易单曲点歌插件出错 (ID点歌):', error);
                     return h.text(session.text(`.somerror`));
                  }
               } else {
                  // 歌名搜索
                  try {
                     const searchApiUrl = `http://music.163.com/api/search/get/web?csrf_token=hlpretag=&hlposttag=&s=${encodeURIComponent(keyword)}&type=1&offset=0&total=true&limit=${config.command6_searchListLength}`;
                     logInfo("请求搜索 API:", searchApiUrl);

                     let searchApiResponse;
                     if (config.command6_useProxy) {
                        // 使用代理请求
                        searchApiResponse = await requestWithProxy(searchApiUrl);
                     } else {
                        // 直接请求
                        searchApiResponse = await ctx.http.get(searchApiUrl);
                     }

                     let parsedSearchApiResponse;
                     try {
                        parsedSearchApiResponse = JSON.parse(searchApiResponse);
                     } catch (e) {
                        ctx.logger.error("搜索结果 JSON 解析失败:", e);
                        return h.text(session.text(`.songlisterror`));
                     }
                     const searchData = parsedSearchApiResponse.result;

                     ctx.logger.info(`searchData = ${JSON.stringify(searchData)}`);

                     if (!searchData || !searchData.songs || searchData.songs.length === 0) {
                        return h.text(session.text(`.songlisterror`));
                     }

                     const songList = searchData.songs.map((song, index) => {
                        return {
                           id: song.id,
                           name: song.name,
                           artists: song.artists.map(artist => artist.name).join('/'),
                           albumName: song.album.name,
                           duration: song.duration
                        };
                     });
                     let input = options.number;

                     // 如果启用了跳过歌单选择（配置项或命令参数），直接选择第一首歌曲
                     if ( (config.skipSongListSelection || options.skip) ) {
                        input = '1';
                     } else if (!options.number) {
                        // ctx.logger.info(`songList = ${JSON.stringify(songList)}`);
                        const formattedList = songList.map((song, index) => `${index + 1}. ${song.name} - ${song.artists} - ${song.albumName}`).join('<br />');
                        const exitCommands = config.exitCommand.split(/[,，]/).map(cmd => cmd.trim());
                        const exitCommandTip = config.menuExitCommandTip ? `退出选择请发[${exitCommands}]中的任意内容<br /><br />` : '';
                        let quoteId = session.messageId;

                        if (config.imageMode) {
                           const imageStyle = options.image_style ? IMAGE_STYLE_MAP[Object.keys(IMAGE_STYLE_MAP)[options.image_style - 1]] : config.imageStyle;
                           const imageBuffer = await generateSongListImage(ctx.puppeteer, formattedList, config, logger, imageStyle, undefined);
                           const payload = [
                              ...(config.enableReplySonglist ? [h.quote(session.messageId)] : []),
                              h.image(imageBuffer, 'image/png'),
                              h.text(`${exitCommandTip.replaceAll('<br />', '\n')}${h.text(session.text(`.waitTime`, [config.waitTimeout]))}`),
                           ];
                           const msg = await session.send(payload);
                           quoteId = msg.at(-1);
                        } else {
                           const msg = await session.send(`${config.enableReplySonglist ? h.quote(session.messageId) : ""}${formattedList}<br /><br />${exitCommandTip}${h.text(session.text(`.waitTime`, [config.waitTimeout]))}`);
                           quoteId = msg.at(-1);
                        }

                        input = await session.prompt(config.waitTimeout * 1000);
                        if (!input) {
                           return `${quoteId ? h.quote(quoteId) : ''}${session.text(`.waitTimeout`)}`;
                        }
                        if (exitCommands.includes(input)) {
                           return h.text(session.text(`.exitprompt`));
                        }
                     }

                     const serialNumber = +input;
                     if (Number.isNaN(serialNumber) || serialNumber < 1 || serialNumber > songList.length) {
                        return h.text(session.text(`.invalidNumber`));
                     }

                     const selectedSongId = songList[serialNumber - 1].id;
                     const selectedinterval = songList[serialNumber - 1].duration / 1000; // selected 的 duration 秒数
                     logInfo("音乐时长：", selectedinterval)
                     if (selectedinterval > config.maxDuration) {
                        return h.text(session.text(`.maxsongDuration`, [config.maxDuration]));
                     }
                     // 获取歌曲详情 (用于获取歌曲名称、艺术家、图片等，与获取直链的 API 无关)
                     const detailApiUrl = `http://music.163.com/api/song/detail/?id=${selectedSongId}&ids=[${selectedSongId}]`;
                     logInfo("请求歌曲详情 API:", detailApiUrl);

                     let detailApiResponse;
                     if (config.command6_useProxy) {
                        // 使用代理请求
                        detailApiResponse = await requestWithProxy(detailApiUrl);
                     } else {
                        // 直接请求
                        detailApiResponse = await ctx.http.get(detailApiUrl);
                     }
                     const detailParsedApiResponse = JSON.parse(detailApiResponse);

                     if (!detailParsedApiResponse || detailParsedApiResponse.code !== 200 || !detailParsedApiResponse.songs || detailParsedApiResponse.songs.length === 0) {
                        return h.text(session.text(`.songlisterror`));
                     }
                     const songData = detailParsedApiResponse.songs[0];


                     // 获取歌曲直链 (根据选择的 API 调整)
                     let songUrl = '';
                     if (useApi === 'api.injahow.cn') {
                        songUrl = `https://api.injahow.cn/meting/?type=url&id=${selectedSongId}`;
                     } else if (useApi === 'meting.jmstrand.cn') {
                        songUrl = `https://meting.jmstrand.cn/?type=url&id=${selectedSongId}`;
                     } else if (useApi === 'api.qijieya.cn') {
                        songUrl = `https://api.qijieya.cn/meting/?type=url&id=${selectedSongId}`;
                     } else if (useApi === 'metingapi.nanorocky.top') {
                        songUrl = `https://metingapi.nanorocky.top/?server=netease&type=url&id=${selectedSongId}`;
                     }

                     logInfo("请求 API (songUrl):", songUrl);

                     // 处理歌词 (仍然使用 163 的 API)
                     let lyric = '歌词获取失败';
                     try {
                        const lyricApiUrl = `https://music.163.com/api/song/lyric?id=${selectedSongId}&lv=1&kv=1&tv=-1`;

                        let lyricResponse;
                        if (config.command6_useProxy) {
                           // 使用代理请求
                           lyricResponse = await requestWithProxy(lyricApiUrl);
                        } else {
                           // 直接请求
                           lyricResponse = await ctx.http.get(lyricApiUrl);
                        }
                        const parsedLyricResponse = JSON.parse(lyricResponse);
                        if (parsedLyricResponse.code === 200 && parsedLyricResponse.lrc && parsedLyricResponse.lrc.lyric) {
                           lyric = `\n${parsedLyricResponse.lrc.lyric}`;
                        } else {
                           ctx.logger.error(`获取歌词失败: ${lyricApiUrl}，返回代码: ${parsedLyricResponse.code}`);
                        }
                     } catch (error) {
                        ctx.logger.error(`获取歌词失败:`, error);
                     }

                     const processedSongData = {
                        name: songData.name,
                        artist: songData.artists.map(artist => artist.name).join('/'),
                        url: songUrl,
                        lrc: lyric,
                        pic: songData.album.picUrl,
                        id: songData.id,
                     };
                     logInfo(processedSongData)

                     const response = generateResponse(session, processedSongData, config.command6_return_data_Field,);
                     return response;


                  } catch (error) {
                     ctx.logger.error('网易点歌插件出错 (歌名搜索):', error);
                     return h.text(session.text(`.somerror`));
                  }
               }
            });
      }

      // command9: 落月API
      if (config.serverSelect === "command9") {
         ctx.command(`${config.command9} <keyword:text>`)
            .option('image_style', '-i, --image_style <image_style:number> 图片样式')
            .example(`${config.command9} 蔚蓝档案`)
            .example(`${config.command9} 2608813264`)
            .option('number', '-n <number:number> 歌曲序号')
            .option('skip', '-s, --skip 跳过歌单选择，直接返回第一首歌曲')
            .action(async ({ session, options }, keyword) => {
               if (!keyword) return h.text(session.text(`.nokeyword`));

               const platform = config.command9_platform; // 'netease' 或 'tencent'
               const isSongId = /^\d+$/.test(keyword.trim());
               
               // 根据平台选择质量参数
               const quality = platform === 'netease' ? config.command9_quality : config.command9_quality_qq;

               if (isSongId && !options.number) {
                  // ID点歌模式
                  try {
                     const apiUrl = `${config.command9_luoyueApiBaseUrl}/v2/music/${platform}?id=${keyword}&quality=${quality}`;
                     logInfo("请求落月API (ID点歌):", apiUrl);

                     const apiResponse = await ctx.http.get(apiUrl);
                     logInfo("落月API响应:", JSON.stringify(apiResponse, null, 2));

                     if (!apiResponse || apiResponse.code !== 200 || !apiResponse.data) {
                        return h.text(session.text(`.songlisterror`));
                     }

                     const songData = apiResponse.data;
                     
                     // 获取歌词
                     let lyric = '歌词获取失败';
                     try {
                        const lyricApiUrl = `${config.command9_luoyueApiBaseUrl}/v2/music/${platform}/lyric?id=${keyword}`;
                        const lyricResponse = await ctx.http.get(lyricApiUrl);
                        if (lyricResponse.code === 200 && lyricResponse.data && lyricResponse.data.lrc) {
                           lyric = `\n${lyricResponse.data.lrc}`;
                        }
                     } catch (error) {
                        ctx.logger.error(`获取歌词失败:`, error);
                     }

                     // 处理歌曲时长
                     const durationMatch = songData.interval?.match(/(\d+)分(\d+)秒/);
                     let durationSeconds = 0;
                     if (durationMatch) {
                        durationSeconds = parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2]);
                     }

                     if (durationSeconds > config.command9_maxDuration) {
                        return h.text(session.text(`.maxsongDuration`, [config.command9_maxDuration]));
                     }

                     const processedSongData = {
                        name: songData.song || songData.name,
                        artist: songData.singer || songData.artist,
                        url: songData.url,
                        lrc: lyric,
                        pic: songData.cover || songData.pic,
                        id: songData.id,
                        album: songData.album,
                        quality: songData.quality,
                        size: songData.size,
                        kbps: songData.kbps,
                        pay: songData.pay,
                     };
                     
                     logInfo("处理后的歌曲数据:", processedSongData);

                     const response = await generateResponse(session, processedSongData, config.command9_return_data_Field);
                     
                     // 发送音乐卡片
                     if (config.command9_add_music_card && session.platform === "onebot") {
                        try {
                           const onebotBot = ctx.bots.find(b => b.platform === "onebot");
                           if (onebotBot) {
                              if (platform === 'netease') {
                                 // 网易云音乐使用官方卡片
                                 await onebotBot.internal._request('send_group_msg', {
                                    "group_id": session.channelId,
                                    "message": [{
                                       "type": "music",
                                       "data": {
                                          "type": '163',
                                          "id": songData.id
                                       }
                                    }]
                                 });
                              } else if (platform === 'tencent') {
                                 // QQ音乐使用自定义卡片（因为腾讯服务器调整问题）
                                 await onebotBot.internal._request('send_group_msg', {
                                    "group_id": session.channelId,
                                    "message": [{
                                       "type": "music",
                                       "data": {
                                          "type": "custom",
                                          "url": songData.link || `https://y.qq.com/n/ryqq/songDetail/${songData.mid || songData.id}`,
                                          "audio": songData.url,
                                          "title": songData.song || songData.name,
                                          "content": songData.singer || songData.artist,
                                          "image": songData.cover || songData.pic
                                       }
                                    }]
                                 });
                              }
                           }
                        } catch (error) {
                           ctx.logger.error('发送音乐卡片失败:', error);
                        }
                     }
                     
                     return response;
                  } catch (error) {
                     ctx.logger.error('落月点歌插件出错 (ID点歌):', error);
                     return h.text(session.text(`.somerror`));
                  }
               } else {
                  // 歌名搜索模式
                  try {
                     let searchResults = [];
                     
                     // 聚合模式：同时从网易云和QQ音乐搜索
                     if (platform === 'aggregation') {
                        const halfLimit = Math.floor(config.command9_searchListLength / 2);
                        
                        logInfo(`聚合搜索开始: 关键词="${keyword}", 每平台数量=${halfLimit}, 网易云音质=${config.command9_quality}, QQ音质=${config.command9_quality_qq}`);
                        
                        // 网易云搜索函数（带降级重试）
                        const searchNetease = async (quality) => {
                           try {
                              const url = `${config.command9_luoyueApiBaseUrl}/v2/music/netease?word=${encodeURIComponent(keyword)}&num=${halfLimit}&quality=${quality}`;
                              logInfo(`请求网易云API: ${url}`);
                              const response = await ctx.http.get(url);
                              
                              if (response.code === 503 && quality > 4) {
                                 // 如果503且音质高于320k，尝试降级到320k
                                 logInfo(`网易云音质${quality}返回503，尝试降级到音质4(320k)`);
                                 return await searchNetease(4);
                              }
                              
                              return response;
                           } catch (err) {
                              ctx.logger.error('网易云搜索失败:', err);
                              return { code: 500, data: [], error: err.message };
                           }
                        };
                        
                        // 并行请求网易云和QQ音乐
                        const [neteaseResponse, tencentResponse] = await Promise.all([
                           searchNetease(config.command9_quality),
                           ctx.http.get(`${config.command9_luoyueApiBaseUrl}/v2/music/tencent?word=${encodeURIComponent(keyword)}&num=${halfLimit}&quality=${config.command9_quality_qq}`).catch(err => {
                              ctx.logger.error('QQ音乐搜索失败:', err);
                              return { code: 500, data: [], error: err.message };
                           })
                        ]);

                        logInfo("========== 网易云搜索响应 ==========");
                        logInfo(`响应码: ${neteaseResponse.code}`);
                        logInfo(`数据类型: ${Array.isArray(neteaseResponse.data) ? '数组' : typeof neteaseResponse.data}`);
                        if (neteaseResponse.code !== 200) {
                           logInfo(`错误信息: ${JSON.stringify(neteaseResponse)}`);
                        }
                        
                        logInfo("========== QQ音乐搜索响应 ==========");
                        logInfo(`响应码: ${tencentResponse.code}`);
                        logInfo(`数据类型: ${Array.isArray(tencentResponse.data) ? '数组' : typeof tencentResponse.data}`);

                        // 处理网易云结果
                        let neteaseResults = [];
                        if (neteaseResponse.code === 200 && neteaseResponse.data) {
                           neteaseResults = Array.isArray(neteaseResponse.data) ? neteaseResponse.data : [neteaseResponse.data];
                           logInfo(`网易云结果处理: 原始数据有 ${Array.isArray(neteaseResponse.data) ? neteaseResponse.data.length : 1} 项, 处理后 ${neteaseResults.length} 项`);
                        } else {
                           logInfo(`网易云结果处理: 响应码=${neteaseResponse.code}, data=${neteaseResponse.data}, 结果为空`);
                        }
                        
                        // 处理QQ音乐结果
                        let tencentResults = [];
                        if (tencentResponse.code === 200 && tencentResponse.data) {
                           tencentResults = Array.isArray(tencentResponse.data) ? tencentResponse.data : [tencentResponse.data];
                           logInfo(`QQ音乐结果处理: 原始数据有 ${Array.isArray(tencentResponse.data) ? tencentResponse.data.length : 1} 项, 处理后 ${tencentResults.length} 项`);
                        } else {
                           logInfo(`QQ音乐结果处理: 响应码=${tencentResponse.code}, data=${tencentResponse.data}, 结果为空`);
                        }

                        // 交替合并两个数组
                        const maxLength = Math.max(neteaseResults.length, tencentResults.length);
                        logInfo(`开始交替合并: 网易云${neteaseResults.length}首, QQ音乐${tencentResults.length}首, 最大长度${maxLength}`);
                        
                        for (let i = 0; i < maxLength; i++) {
                           if (i < neteaseResults.length) {
                              searchResults.push({
                                 ...neteaseResults[i],
                                 platform: 'netease',
                                 platformLabel: '[网易云]'
                              });
                              logInfo(`添加网易云歌曲 [${i}]: ${neteaseResults[i].song || neteaseResults[i].name}`);
                           }
                           if (i < tencentResults.length) {
                              searchResults.push({
                                 ...tencentResults[i],
                                 platform: 'tencent',
                                 platformLabel: '[Q Q 音]'
                              });
                              logInfo(`添加QQ音乐歌曲 [${i}]: ${tencentResults[i].song || tencentResults[i].name}`);
                           }
                        }

                        logInfo(`========== 聚合搜索完成 ==========`);
                        logInfo(`最终结果: 网易云 ${neteaseResults.length} 首, QQ音乐 ${tencentResults.length} 首, 总计 ${searchResults.length} 首`);

                     } else {
                        // 单平台搜索（原有逻辑）
                        const searchApiUrl = `${config.command9_luoyueApiBaseUrl}/v2/music/${platform}?word=${encodeURIComponent(keyword)}&num=${config.command9_searchListLength}&quality=${quality}`;
                        logInfo("请求落月API搜索:", searchApiUrl);

                        const searchApiResponse = await ctx.http.get(searchApiUrl);
                        logInfo("落月API搜索响应:", JSON.stringify(searchApiResponse, null, 2));

                        if (!searchApiResponse || searchApiResponse.code !== 200 || !searchApiResponse.data) {
                           return h.text(session.text(`.songlisterror`));
                        }

                        // 搜索返回的是数组
                        searchResults = Array.isArray(searchApiResponse.data) ? searchApiResponse.data : [searchApiResponse.data];
                        
                        // 添加平台标识（单平台时不需要显示）
                        searchResults = searchResults.map(song => ({
                           ...song,
                           platform: platform,
                           platformLabel: '' // 单平台搜索不显示标签
                        }));
                     }

                     if (searchResults.length === 0) {
                        return h.text(session.text(`.songlisterror`));
                     }

                     const songList = searchResults.map((song, index) => {
                        // 解析时长
                        const intervalMatch = song.interval?.match(/(\d+)分(\d+)秒/);
                        let duration = 0;
                        if (intervalMatch) {
                           duration = parseInt(intervalMatch[1]) * 60 + parseInt(intervalMatch[2]);
                        }
                        
                        return {
                           id: song.id,
                           mid: song.mid,
                           name: song.song || song.name,
                           artist: song.singer || song.artist,
                           album: song.album,
                           duration: duration * 1000, // 转换为毫秒
                           cover: song.cover,
                           url: song.url,
                           quality: song.quality,
                           size: song.size,
                           kbps: song.kbps,
                           pay: song.pay, // 保留付费信息
                           platform: song.platform, // 保留平台信息
                           platformLabel: song.platformLabel || '', // 保留平台标签
                        };
                     });

                     let input = options.number;

                     // 如果启用了跳过歌单选择（配置项或命令参数），直接选择第一首歌曲
                     if ((config.skipSongListSelection || options.skip) && !options.number) {
                        input = '1';
                     } else if (!options.number) {
                        const formattedList = songList.map((song, index) => {
                           const albumInfo = song.album ? ` - ${song.album}` : '';
                           return `${song.platformLabel}${index + 1}. ${song.name} - ${song.artist}${albumInfo}`;
                        }).join('<br />');
                        
                        const exitCommands = config.exitCommand.split(/[,，]/).map(cmd => cmd.trim());
                        const exitCommandTip = config.menuExitCommandTip ? `退出选择请发[${exitCommands}]中的任意内容<br /><br />` : '';
                        let quoteId = session.messageId;

                        if (config.imageMode) {
                           const imageStyle = options.image_style ? IMAGE_STYLE_MAP[Object.keys(IMAGE_STYLE_MAP)[options.image_style - 1]] : config.imageStyle;
                           const imageBuffer = await generateSongListImage(ctx.puppeteer, formattedList, config, logger, imageStyle, undefined);
                           const payload = [
                              ...(config.enableReplySonglist ? [h.quote(session.messageId)] : []),
                              h.image(imageBuffer, 'image/png'),
                              h.text(`${exitCommandTip.replaceAll('<br />', '\n')}${h.text(session.text(`.waitTime`, [config.waitTimeout]))}`),
                           ];
                           const msg = await session.send(payload);
                           quoteId = msg.at(-1);
                        } else {
                           const msg = await session.send(`${config.enableReplySonglist ? h.quote(session.messageId) : ""}${formattedList}<br /><br />${exitCommandTip}${h.text(session.text(`.waitTime`, [config.waitTimeout]))}`);
                           quoteId = msg.at(-1);
                        }

                        input = await session.prompt(config.waitTimeout * 1000);
                        if (!input) {
                           return `${quoteId ? h.quote(quoteId) : ''}${session.text(`.waitTimeout`)}`;
                        }
                        if (exitCommands.includes(input)) {
                           return h.text(session.text(`.exitprompt`));
                        }
                     }

                     const serialNumber = +input;
                     if (Number.isNaN(serialNumber) || serialNumber < 1 || serialNumber > songList.length) {
                        return h.text(session.text(`.invalidNumber`));
                     }

                     const selectedSong = songList[serialNumber - 1];
                     const selectedDuration = selectedSong.duration / 1000; // 转换为秒

                     logInfo("选中歌曲时长：", selectedDuration);
                     if (selectedDuration > config.command9_maxDuration) {
                        return h.text(session.text(`.maxsongDuration`, [config.command9_maxDuration]));
                     }

                     // 如果没有URL，需要再次请求获取完整信息
                     let finalSongData = selectedSong;
                     // 使用歌曲实际平台（聚合模式下每首歌有自己的平台）
                     const actualPlatform = selectedSong.platform || platform;
                     const actualQuality = actualPlatform === 'tencent' ? config.command9_quality_qq : config.command9_quality;
                     
                     if (!selectedSong.url) {
                        const detailApiUrl = `${config.command9_luoyueApiBaseUrl}/v2/music/${actualPlatform}?${actualPlatform === 'tencent' && selectedSong.mid ? 'mid' : 'id'}=${selectedSong.mid || selectedSong.id}&quality=${actualQuality}`;
                        logInfo("请求歌曲详情:", detailApiUrl);
                        
                        const detailResponse = await ctx.http.get(detailApiUrl);
                        if (detailResponse.code === 200 && detailResponse.data) {
                           finalSongData = {
                              ...selectedSong,
                              url: detailResponse.data.url,
                              quality: detailResponse.data.quality,
                              size: detailResponse.data.size,
                              kbps: detailResponse.data.kbps,
                              pay: detailResponse.data.pay,
                           };
                        }
                     }

                     // 获取歌词
                     let lyric = '歌词获取失败';
                     try {
                        const lyricApiUrl = `${config.command9_luoyueApiBaseUrl}/v2/music/${actualPlatform}/lyric?id=${finalSongData.id}`;
                        const lyricResponse = await ctx.http.get(lyricApiUrl);
                        if (lyricResponse.code === 200 && lyricResponse.data && lyricResponse.data.lrc) {
                           lyric = `\n${lyricResponse.data.lrc}`;
                        }
                     } catch (error) {
                        ctx.logger.error(`获取歌词失败:`, error);
                     }

                     const processedSongData = {
                        name: finalSongData.name,
                        artist: finalSongData.artist,
                        url: finalSongData.url,
                        lrc: lyric,
                        pic: finalSongData.cover,
                        id: finalSongData.id,
                        album: finalSongData.album,
                        quality: finalSongData.quality,
                        size: finalSongData.size,
                        kbps: finalSongData.kbps,
                        pay: finalSongData.pay,
                     };

                     logInfo("处理后的歌曲数据:", processedSongData);

                     const response = await generateResponse(session, processedSongData, config.command9_return_data_Field);
                     
                     // 发送音乐卡片
                     if (config.command9_add_music_card && session.platform === "onebot") {
                        try {
                           const onebotBot = ctx.bots.find(b => b.platform === "onebot");
                           if (onebotBot) {
                              // 使用歌曲实际平台（聚合模式下每首歌有自己的平台）
                              if (actualPlatform === 'netease') {
                                 // 网易云音乐使用官方卡片
                                 await onebotBot.internal._request('send_group_msg', {
                                    "group_id": session.channelId,
                                    "message": [{
                                       "type": "music",
                                       "data": {
                                          "type": '163',
                                          "id": finalSongData.id
                                       }
                                    }]
                                 });
                              } else if (actualPlatform === 'tencent') {
                                 // QQ音乐使用自定义卡片（因为腾讯服务器调整问题）
                                 await onebotBot.internal._request('send_group_msg', {
                                    "group_id": session.channelId,
                                    "message": [{
                                       "type": "music",
                                       "data": {
                                          "type": "custom",
                                          "url": `https://y.qq.com/n/ryqq/songDetail/${finalSongData.mid || finalSongData.id}`,
                                          "audio": finalSongData.url,
                                          "title": finalSongData.name,
                                          "content": finalSongData.artist,
                                          "image": finalSongData.cover
                                       }
                                    }]
                                 });
                              }
                           }
                        } catch (error) {
                           ctx.logger.error('发送音乐卡片失败:', error);
                        }
                     }
                     
                     return response;

                  } catch (error) {
                     ctx.logger.error('落月点歌插件出错 (歌名搜索):', error);
                     return h.text(session.text(`.somerror`));
                  }
               }
            });
      }


      // 代理请求函数
      async function requestWithProxy(targetUrl) {
         const proxyUrl = 'https://web-proxy.apifox.cn/api/v1/request';
         logInfo(`使用${proxyUrl}代理请求${targetUrl}`)
         try {
            const response = await ctx.http.post(proxyUrl, {}, {
               headers: {
                  'api-u': targetUrl,
                  'api-o0': 'method=GET, timings=true, timeout=3000',
                  'Content-Type': 'application/json'
               }
            });
            return response;
         } catch (error) {
            logger.error('代理请求失败', error);
            throw error;
         }
      }

      async function ensureTempDir() {
         if (!isTempDirInitialized) {
            await fs.mkdir(tempDir, { recursive: true });
            isTempDirInitialized = true;
         }
      }

      async function downloadFile(url, songname) {
         await ensureTempDir();

         try {
            const file = await ctx.http.file(url);

            // 获取正确的文件扩展名
            const contentType = file.type || file.mime;
            logInfo(file)

            let ext = '.mp3';
            if (contentType) {
               if (contentType.includes('audio/mpeg')) {
                  ext = '.mp3';
               } else if (contentType.includes('audio/mp4')) {
                  ext = '.m4a';
               } else if (contentType.includes('audio/wav')) {
                  ext = '.wav';
               } else if (contentType.includes('audio/flac')) {
                  ext = '.flac';
               }
            }

            let filename;
            if (config.renameTempFile && songname) {
               // 移除非法字符
               const safeSongname = songname.replace(/[<>:"/\\|?*\x00-\x1F\s]/g, '-').trim();
               filename = safeSongname + ext;
            } else {
               filename = crypto.randomBytes(8).toString('hex') + ext;
            }

            const filePath = path.join(tempDir, filename);

            // 将 ArrayBuffer 转换为 Buffer
            const buffer = Buffer.from(file.data);

            // 将文件数据写入文件系统
            await fs.writeFile(filePath, buffer);
            return filePath;
         } catch (error) {
            logger.error('文件下载失败:', error);
            return null;
         }
      }

      async function safeUnlink(filePath, maxRetries = 5, interval = 1000) {
         let retries = 0;
         while (retries < maxRetries) {
            try {
               await fs.access(filePath); // 先检查文件是否存在
               await fs.unlink(filePath);
               return;
            } catch (error) {
               if (error.code === 'ENOENT') return; // 文件不存在直接返回
               if (error.code === 'EBUSY') {
                  retries++;
                  await new Promise(resolve => ctx.setTimeout(resolve, interval));
               } else {
                  throw error;
               }
            }
         }
         throw new Error(`Failed to delete ${filePath} after ${maxRetries} retries`);
      }

      async function generateResponse(session, data, platformconfig) {
         // 按类型分类存储
         const textElements = [];
         const imageElements = [];
         const mediaElements = [];
         const fileElements = [];
         const rawElements = [];

         // 用于合并转发的内容
         const figureContentElements = []; // 存储 figure 内部的元素

         // 遍历配置项，根据类型收集元素
         for (const field of platformconfig) {
            if (!field.enable) continue;

            const value = data[field.data];
            if (!value) continue;

            let element = null;
            switch (field.type) {
               case 'text':
                  let textValue = data[field.data];

                  // 类型检查和默认值
                  if (typeof textValue === 'string') {
                     if (config.isuppercase) {
                        // 使用正则表达式匹配 URL 中的域名部分
                        textValue = textValue.replace(/(https?:\/\/)([^/]+)/, (match, protocol, domain) => {
                           return `${protocol}${domain.toUpperCase()}`;
                        });
                     }
                  } else {
                     // 如果 textValue 不是字符串，则使用空字符串作为默认值或进行其他处理
                     textValue = textValue ? String(textValue) : ''; // 转换为字符串或使用空字符串
                     // 或者，如果 textValue 为 null 或 undefined，则不进行任何操作
                     // textValue = '';
                  }

                  element = h.text(`${field.describe}：${textValue}`);
                  textElements.push(element);
                  break;

               case 'image':
                  element = h.image(value);
                  imageElements.push(element);
                  break;
               case 'audio':
                  element = h.audio(value);
                  mediaElements.push(element);
                  break;
               case 'video':
                  element = h.video(value);
                  mediaElements.push(element);
                  break;
               case 'file':
                  try {
                     const songname = data.songname || data.title || data.name || "TempSongFileName";
                     const localFilePath = await downloadFile(value, songname);
                     if (localFilePath) {
                        element = h.file(url.pathToFileURL(localFilePath).href);
                        fileElements.push(element);
                        tempFiles.add(localFilePath);

                        // 定时删除逻辑
                        if (config.deleteTempTime > 0) {
                           ctx.setTimeout(async () => {
                              await safeUnlink(localFilePath).catch(() => { });
                              logInfo(`正在执行： tempFiles.delete(${localFilePath})`)
                              tempFiles.delete(localFilePath);
                           }, config.deleteTempTime * 1000);
                        }
                     }
                  } catch (error) {
                     logger.error('文件处理失败:', error);
                  }
                  break;
            }
            if (config.data_Field_Mode === 'raw' && element) {
               rawElements.push(element); // 'raw' 模式下，按配置顺序添加元素
            }
         }

         let responseElements = [];

         // 根据 data_Field_Mode 排序元素
         switch (config.data_Field_Mode) {
            case 'image':
               responseElements = [...imageElements, ...textElements, ...mediaElements, ...fileElements];
               break;
            case 'raw':
               responseElements = rawElements; // 严格按照配置顺序
               break;
            case 'text': // 默认模式
            default:
               responseElements = [...textElements, ...imageElements, ...mediaElements, ...fileElements];
               break;
         }

         if (config.command6_add_music_card) {
            const onebotBot = await ctx.bots.find(b => b.platform === "onebot")
            onebotBot && await onebotBot.internal._request(
               'send_group_msg',
               {
                  "group_id": session.channelId,
                  "message": [
                     {
                        "type": "music",
                        "data": {
                           "type": "163",
                           "id": data.id
                        }
                     }
                  ]
               }
            )
         }

         // 如果启用了合并转发，处理文本和图片
         if (config.isfigure && (session.platform === "onebot" || session.platform === "red")) {
            logInfo(`使用合并转发，正在收集图片和文本。`);

            // 创建 figureContentElements
            for (const element of responseElements) {
               if (element.type === 'text' || element.type === 'image' || element.type === 'img') { // 图片是 img 元素
                  const attrs = {
                     userId: session.userId,
                     nickname: session.author?.nickname || session.username,
                  };
                  figureContentElements.push(h('message', attrs, element));
               }
            }

            // 创建 figure 元素
            const figureContent = h('figure', {
               children: figureContentElements
            });
            logInfo(JSON.stringify(figureContent, null, 2));

            // 发送合并转发消息
            await session.send(figureContent);

            // 发送剩余的媒体和文件
            for (const element of responseElements) {
               if (element.type === 'audio' || element.type === 'video' || element.type === 'file') {
                  await session.send(element);
               }
            }
            return; // 结束函数，不再返回字符串
         } else {
            // 如果没有启用合并转发，按顺序发送所有元素
            responseElements = responseElements.join('\n')
            logInfo(responseElements);
            return responseElements;
         }


      }


   });

}
exports.apply = apply;
exports.Config = Config;
exports.name = name;
exports.usage = usage;
exports.inject = inject;
exports.reusable = true; // 声明可重用