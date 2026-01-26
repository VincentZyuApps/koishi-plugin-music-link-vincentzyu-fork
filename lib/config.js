"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = exports.usage = exports.IMAGE_STYLE_MAP = exports.platformMap = exports.command9_return_data_Field_default = exports.command6_return_data_Field_default = void 0;

const { Schema } = require("koishi");
const { readFileSync } = require('fs');
const { resolve } = require('path');
const path = require('node:path');

// 读取 package.json 获取版本号
const pkg = JSON.parse(
   readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
);

// ============ 常量定义 ============

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
exports.command6_return_data_Field_default = command6_return_data_Field_default;

const command9_return_data_Field_default = [
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
      "data": "quality",
      "describe": "音质",
      "type": "text"
   },
   {
      "data": "pay",
      "describe": "是否付费",
      "type": "text",
      "enable": false
   },
   {
      "data": "lrc",
      "describe": "歌词",
      "type": "text",
      "enable": false
   },
   {
      "data": "url",
      "describe": "语音",
      "type": "audio",
      "enable": false
   },
   {
      "data": "url",
      "describe": "文件",
      "type": "file",
      "enable": false
   }
];
exports.command9_return_data_Field_default = command9_return_data_Field_default;

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

// ============ usage 字符串 ============

const usage = `
<h1>Koishi 插件：music-link-vincentzyu-fork</h1>
<h2>🎯 插件版本：v${pkg.version}</h2>
<h3>原始仓库: <a href="https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/music-link" target="_blank">https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/music-link</a></h3>

<p>插件使用问题 / Bug反馈 / 插件开发交流，欢迎加入QQ群：<b>259248174</b></p>

<p><b>💡 提示：</b>  <a href="https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork" target="_blank"> 前往 Gitee README 获得更佳观感 → <i> https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork </i> </a> </p>

<hr>

<details>
<summary><h2>📖 插件详细说明 (点击展开)</h2></summary>

<h2 style="color: #FF9800;">⚠️ 首次启动说明</h2>
<p>插件首次启动时，会自动从 Gitee 下载所需的资源文件（字体和背景图片），<b>下载完成后才会注册指令和启动中间件</b>。如果网络不稳定或自动下载失败，可以手动下载资源文件。</p>

<p><b>资源文件下载链接：</b></p>
<ul>
<li><b>字体文件：</b>
  <ul>
  <li><a href="https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/fonts/LXGWWenKaiMono-Regular.ttf" target="_blank">LXGWWenKaiMono-Regular.ttf</a></li>
  <li><a href="https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/fonts/SourceHanSerifSC-Medium.otf" target="_blank">SourceHanSerifSC-Medium.otf</a></li>
  </ul>
</li>
<li><b>背景图片：</b>
  <ul>
  <li><a href="https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/bg/mahiro_mihari.png" target="_blank">mahiro_mihari.png</a></li>
  <li><a href="https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/bg_koishi/pixai_koishi.png" target="_blank">pixai_koishi.png</a></li>
  </ul>
</li>
</ul>

<p><b>手动下载步骤：</b></p>
<ol>
<li>点击上述链接下载资源文件</li>
<li>将所有文件放入 <code>assets</code> 文件夹（<code>assets</code> 文件夹与 <code>lib</code> 文件夹、<code>package.json</code> 文件位于同级目录中）</li>
<li>重启本插件，让插件重新执行一遍<code>validateAssets()</code></li>
</ol>

<hr>

<h2>特点</h2>
<ul>
<li><b>搜索歌曲</b>：🤩 支持QQ音乐和网易云音乐平台的歌曲搜索。</li>
<li><b>下载歌曲</b>：🎶 QQ平台支持以不同音质下载歌曲，满足不同的音乐体验需求。提供免费以及付费音乐的下载链接。</li>
<li><b>歌曲详情</b>：🎧 获取包括音质、大小和下载链接在内的歌曲详细信息。</li>
<li><b>友好交互</b>：📱 简单易用的指令，快速获取你喜欢的音乐。</li>
</ul>

<hr>

<h2>📖 使用方法</h2>
<p>安装并配置插件后，使用下述命令搜索和下载音乐：</p>
<blockquote>指令名是可以改的，下面展示的<code>网易点歌</code>和<code>落月点歌</code>都是默认值捏</blockquote>

<h3>🎵 网易点歌 (command6)</h3>
<pre><code>网易点歌 [歌曲名称/歌曲ID]</code></pre>

<p><b>后端选择：</b></p>
<ul>
<li><b><code>api.injahow.cn</code></b> (默认 - 稳定推荐)
  <ul>
  <li>✅ API请求快速且稳定，无需 puppeteer 服务</li>
  <li>✅ 推荐QQ官方机器人使用</li>
  <li>⚠️ VIP歌曲只能听45秒（黑胶限制）</li>
  <li>🎯 <b>仅支持网易云音乐</b></li>
  </ul>
</li>
<li><b><code>api.qijieya.cn</code></b> (推荐 - 完整版)
  <ul>
  <li>✅ 稳定性未知，但支持全部可听</li>
  <li>✅ 无VIP限制，完整歌曲</li>
  <li>🎯 <b>仅支持网易云音乐</b></li>
  </ul>
</li>
<li><b><code>meting.jmstrand.cn</code></b> (可选)
  <ul>
  <li>✅ 稳定性未知，全部可听</li>
  <li>🎯 <b>仅支持网易云音乐</b></li>
  </ul>
</li>
<li><b><code>metingapi.nanorocky.top</code></b> (不推荐)
  <ul>
  <li>✅ 无损音质，全部可听</li>
  <li>⚠️ 文件很大，下载慢</li>
  <li>🎯 <b>仅支持网易云音乐</b></li>
  </ul>
</li>
</ul>

<h3>🎶 落月点歌 (command9)</h3>
<pre><code>落月点歌 [歌曲名称]</code></pre>

<p><b>后端选择：</b></p>
<ul>
<li><b><code>api.vkeys.cn/v2</code></b> (落月api官方)
  <ul>
  <li>✅ 支持<b>网易云 + QQ音乐</b></li>
  <li>✅ 支持多音质选择（64k - Master母带）</li>
  <li>✅ 支持聚合搜索（双平台同时搜索）</li>
  <li>🎯 <b>网易云最高支持：超清母带 (Master)</b></li>
  <li>🎯 <b>QQ音乐最高支持：臻品母带2.0</b></li>
  </ul>
</li>
<li><b><code>http://xwl.vincentzyu233.cn:51217</code></b> (作者自建)
  <ul>
  <li>✅ 与官方API功能相同</li>
  <li>⚠️ 如果挂了可以去QQ群：259248174 叫我</li>
  </ul>
</li>
</ul>

<p><b>落月api音质等级说明：</b></p>
<table>
<thead>
<tr><th>平台</th><th>音质选项</th><th>码率/格式</th></tr>
</thead>
<tbody>
<tr><td>网易云</td><td>标准</td><td>64k / 128k</td></tr>
<tr><td>网易云</td><td>HQ极高</td><td>192k / 320k</td></tr>
<tr><td>网易云</td><td>SQ无损</td><td>FLAC</td></tr>
<tr><td>网易云</td><td>Hi-Res</td><td>高解析度无损</td></tr>
<tr><td>网易云</td><td>Spatial Audio</td><td>高清臻音</td></tr>
<tr><td>网易云</td><td>Master</td><td>超清母带</td></tr>
<tr><td>QQ音乐</td><td>标准/HQ</td><td>标准/高音质</td></tr>
<tr><td>QQ音乐</td><td>SQ无损</td><td>无损音质</td></tr>
<tr><td>QQ音乐</td><td>Hi-Res</td><td>Hi-Res音质</td></tr>
<tr><td>QQ音乐</td><td>杜比全景声</td><td>Dolby Atmos</td></tr>
<tr><td>QQ音乐</td><td>臻品母带2.0</td><td>Master 2.0</td></tr>
</tbody>
</table>

<hr>

<h3>如何返回语音/视频/群文件消息</h3>
<p>可以修改对应指令的<code>返回字段表</code>中的 <code>下载链接</code> 对应的 <code>字段发送类型</code> 字段，

把 <code>text</code> 更改为 <code>audio</code> 就是返回 语音，

改为 <code>video</code> 就是返回 视频消息，

改为 <code>file</code> 就是返回 群文件。</p>
<hr>

<p>⚠️需要注意的是，当配置返回格式为音频/视频的时候，请自行检查是否安装了 <code>silk</code>、<code>ffmpeg</code> 等服务。</p>
<p>⚠️如果你选择了 <code>file</code> 类型，请确保平台支持！目前仅实测了 <code>onebot</code> 平台的部分协议端支持！</p>
<hr>

<h3>使用 <code>-n 数字</code> 直接返回内容</h3>
<p>在使用命令时，可以通过添加 <code>-n 数字</code> 选项直接返回指定序号的歌曲内容。这对于快速获取特定歌曲非常有用。</p>
<p>例如，使用以下命令可以直接获取第一首歌曲的详细信息：</p>
<pre><code>歌曲搜索 -n 1 蔚蓝档案</code></pre>

<hr>

<h2>免责声明</h2>
<ol>
<li><b>数据来源</b>：
  <ul>
  <li>本插件调用了第三方网站（如 <code>music.gdstudio.xyz</code>）的接口来获取音乐资源。插件开发者不对这些第三方网站的内容、合法性或安全性负责。</li>
  <li>用户在使用本插件时，应自行承担因使用第三方服务而产生的任何风险。</li>
  </ul>
</li>
<li><b>版权声明</b>：
  <ul>
  <li>本插件提供的音乐资源可能受版权保护。用户应确保在使用这些资源时遵守相关法律法规。</li>
  <li>插件开发者不鼓励或支持任何侵犯版权的行为。用户应仅下载和使用已获得合法授权的音乐资源。</li>
  </ul>
</li>
<li><b>插件用途</b>：
  <ul>
  <li>本插件仅供学习和研究使用，禁止用于任何商业用途。</li>
  <li>插件开发者不对用户因使用本插件而产生的任何法律问题负责。</li>
  </ul>
</li>
<li><b>服务稳定性</b>：
  <ul>
  <li>由于依赖第三方服务，插件的功能可能会因第三方服务的变更或不可用而受到影响。</li>
  <li>插件开发者不保证插件的持续可用性或稳定性。</li>
  </ul>
</li>
<li><b>用户责任</b>：
  <ul>
  <li>用户在使用本插件时，应遵守相关法律法规和平台规定。</li>
  <li>如因用户不当使用本插件而导致任何问题，插件开发者不承担任何责任。</li>
  </ul>
</li>
</ol>

</details>

---

`;
exports.usage = usage;

// ============ Config Schema ============

const Config = Schema.intersect([
   Schema.object({
      enableReplySonglist: Schema.boolean().default(true).description("💬 开启后 发送歌单消息的时候 会回复触发指令的消息"),
      skipSongListSelection: Schema.boolean().default(false).description("⏭️ 开启后 发送歌单消息的时候 不再等待用户输入序号 直接返回歌单第一首歌曲"),
      waitTimeout: Schema.natural().role('s').description('⏱️ 允许用户返回选择序号的等待时间').default(45),
      exitCommand: Schema.string().default('0, 不听了').description('🚪 退出选择指令，多个指令间请用逗号分隔开'),
      menuExitCommandTip: Schema.boolean().default(true).description('💡 是否在歌单内容的后面，加上退出选择指令的文字提示'),
   }).description('⚙️ 基础设置'),

   Schema.object({
      imageMode: Schema.boolean().default(true).description('🖼️ 开启后返回图片歌单（需要puppeteer服务），关闭后返回文本歌单（部分指令必须使用puppeteer）'),
      darkMode: Schema.boolean().default(false).description('🌙 是否开启暗黑模式（黑底菜单）'),
      backgroundImagePath: Schema.string().role('textarea', { rows: [2, 5] }).default(path.resolve(__dirname, '../assets/pixai_koishi.png')).description(`🎨 背景图片路径. 仅对${IMAGE_STYLE_MAP.MODERN_SOURCE_HANS_SERIF}生效`),
      textFontPath: Schema.string().role('textarea', { rows: [2, 5] }).default(path.resolve(__dirname, '../assets/LXGWWenKaiMono-Regular.ttf')).description('🔤 文字字体文件路径. 对任何imageStyle都生效。'),
      imageStyle: Schema.union([
         Schema.const(IMAGE_STYLE_MAP.ORIGIN_BLACK_WHITE).description('原始_黑白'),
         Schema.const(IMAGE_STYLE_MAP.MODERN_SOURCE_HANS_SERIF).description('现代_思源宋体'),
         Schema.const(IMAGE_STYLE_MAP.FLAT_MODERN).description('扁平_现代'),
      ]).role('radio').description('🎭 图片样式').default(IMAGE_STYLE_MAP.MODERN_SOURCE_HANS_SERIF),
      addCoverInImage: Schema.boolean().default(false).disabled().experimental().description('🖼️ 是否在图片歌单中添加封面. 只对command6和9生效<br><s>现在还没想好怎么实现，未来可能会做(())</s>'),
   }).description('🖌️ puppeteer渲染图片歌单设置'),

   Schema.object({
      serverSelect: Schema.union([
         Schema.const('command6').description('command6：`api.injahow.cn`网站       （API 请求快 + 稳定 推荐QQ官方机器人使用）      （网易云）'),
         Schema.const('command9').description('command9：`api.vkeys.cn/v2`落月API（推荐）  支持网易云和QQ音乐 支持多音质选择'),
      ]).role('radio').default("command6").description('🔧 选择使用的后端<br>➣ 推荐度：`我自建的落月api` ≥ `api.vkeys.cn` ≥ `api.injahow.cn`'),
   }).description('🌐 后端选择'),
   Schema.union([

      Schema.object({
         serverSelect: Schema.const('command6'),
         command6: Schema.string().default('网易点歌').description('📝 `网易点歌`的指令名称<br>输入歌曲ID，返回歌曲'),
         command6_searchListLength: Schema.number().default(50).min(1).max(100).description('📋 歌曲搜索的列表长度。返回的候选项个数。不建议超过50，可能超过最长文本长度/让图片渲染、发送、加载时间变长'),
         maxDuration: Schema.natural().description('⏳ 歌曲最长持续时间，单位为：秒').default(900),
         command6_useProxy: Schema.boolean().experimental().description('🌍 是否使用 Apifox Web Proxy 代理请求（适用于海外用户）').default(false),
         command6_usedAPI: Schema.union([
            Schema.const('api.injahow.cn').description('（稳定）黑胶只能30秒的`api.injahow.cn`后端（适合官方bot）'),
            Schema.const('meting.jmstrand.cn').description('（推荐）稳定性未知、全部可听的`meting.jmstrand.cn`后端').experimental(),
            Schema.const('api.qijieya.cn').description('（推荐）稳定性未知、全部可听的`api.qijieya.cn`后端').experimental(),
            Schema.const('metingapi.nanorocky.top').description('(不推荐 文件很大) 稳定性未知、无损音质、全部可听的`meting.jmstrand.cn`后端').experimental(),
         ]).description("🔗 选择 获取音乐直链的后端API").default("api.qijieya.cn"),
         command6_add_music_card: Schema.boolean().default(true).description("🎵 是否发送onebot音乐卡片，位于所有的字段的最后 <br/> *仅适用于onebot平台，其他平台开启无效*"),
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
         })).role('table').description('📊 歌曲返回信息的字段选择<br>[➣ 点我查看该API返回内容示例](http://music.163.com/api/search/get/web?csrf_token=hlpretag=&hlposttag=&s=蔚蓝档案&type=1&offset=0&total=true&limit=10)').default(command6_return_data_Field_default),
      }).description('🎵 `网易点歌`返回设置'),

      Schema.object({
         serverSelect: Schema.const('command9'),
         command9: Schema.string().default('落月点歌').description('📝 `落月点歌`的指令名称<br>支持网易云和QQ音乐搜索'),
         command9_luoyueApiBaseUrl: Schema.string().default('https://api.vkeys.cn').description('🔗 落月API的基础URL<br>默认为官方API地址，可以替换为自建或镜像地址<br>作者自建的api:`http://xwl.vincentzyu233.cn:51217`<br> <i> ↑ 如果G了可以去群里叫我( </i>'),
         command9_platform: Schema.union([
            Schema.const('netease').description('网易云音乐'),
            Schema.const('tencent').description('QQ音乐'),
            Schema.const('aggregation').description('聚合(选择此项会让歌单长度是searchListLength配置项的二倍)'),
         ]).role('radio').default('netease').description('🎧 选择音乐平台'),
         command9_searchListLength: Schema.number().default(50).min(1).max(100).description('📋 歌曲搜索的列表长度。返回的候选项个数。'),
         command9_maxDuration: Schema.natural().description('⏳ 歌曲最长持续时间，单位为：秒').default(900),
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
         ]).description('🎼 网易云音乐最大音质（网易云音乐专用）').default(5),
         command9_quality_qq: Schema.union([
            Schema.const(4).description('标准音质'),
            Schema.const(8).description('HQ高音质'),
            Schema.const(10).description('SQ无损音质'),
            Schema.const(11).description('Hi-Res音质'),
            Schema.const(12).description('杜比全景声'),
            Schema.const(14).description('臻品母带2.0'),
         ]).description('🎼 QQ音乐最大音质（QQ音乐专用）').default(10),
         command9_add_music_card: Schema.boolean().default(false).description("🎵 是否发送onebot音乐卡片，位于所有的字段的最后 <br/> *仅适用于onebot平台，其他平台开启无效*"),
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
         })).role('table').description('📊 歌曲返回信息的字段选择').default(command9_return_data_Field_default),
      }).description('🌙 `落月点歌`返回设置'),

      Schema.object({
      }).description('↑ 请选择后端服务 ↑'),
   ]),

   Schema.object({
      enablemiddleware: Schema.boolean().description("🔍 是否自动解析JSON音乐卡片").default(false),
      enablePrependMiddleware: Schema.boolean().description("⚡ 是否使用前置中间件监听<br>`中间件无法接受到消息可以考虑开启`").default(false),
      used_id: Schema.number().default(1).min(0).max(10).description("🔢 在歌单里默认选择的序号<br>范围`0-10`，无需考虑11-20，会自动根据JSON卡片的平台选择。若音乐平台不匹配 则在搜索项前十个进行选择。"),
   }).description('🎴 JSON卡片解析设置'),

   Schema.object({
      isfigure: Schema.boolean().default(false).description("📦 `图片、文本`元素 使用合并转发，其余单独发送<br>`仅支持 onebot 适配器` 其他平台开启 无效").experimental(),
      isuppercase: Schema.boolean().default(false).description("🔠 将链接域名进行大写置换，仅适用于qq官方平台").experimental(),
      data_Field_Mode: Schema.union([
         Schema.const('text').description('富媒体置底：文字 > 图片 > 语音 ≥ 视频 ≥ 文件 （默认）'),
         Schema.const('image').description('仅图片置顶的 富媒体置底：图片 > 文字 ≥ 语音 ≥ 视频 ≥ 文件 （仅官方机器人考虑使用）'),
         Schema.const('raw').description('严格按照 `command_return_data_Field` 表格的顺序 （严格按照配置项表格的上下顺序）'),
      ]).role('radio').default("text").description('📐 对 `command*_return_data_Field`配置项 排序的控制<br>优先级越高，顺序越靠前<br>[➣点我查看此配置项 效果预览图](https://i0.hdslb.com/bfs/article/6e8b901f9b9daa57f082bf0cece36102312276085.png)'),
      renameTempFile: Schema.boolean().default(false).description('✏️ 是否启用`音频文件`自定义命名<br>关闭则使用随机hash值').experimental(),
      fileNameTemplate: Schema.string().role('textarea', { rows: [2, 4] }).default('${name}-${artist}-${time}').description('📄 文件名模板（不含扩展名，扩展名会自动添加）<br>可用占位符：<br>`${name}` 歌曲名称<br>`${artist}` 歌手<br>`${id}` 歌曲ID<br>`${quality}` 音质<br>`${platform}` 平台<br>`${time}` 时间戳 (YYYYMMDD-HHMMSS)').experimental(),
      deleteTempTime: Schema.number().default(30).description('🗑️ 对于`file`类型的`Temp`临时文件的删除时间<br>若干`秒`后 删除下载的本地临时文件').experimental(),
      fileTransferMode: Schema.union([
         Schema.const('localPath').description('本地路径：file:// 协议（默认，Koishi 和 协议端在同一设备）'),
         Schema.const('base64').description('Base64：适用于 Koishi 和 协议端 在不同设备/容器'),
      ]).role('radio').default('localPath').description('📡 文件传输模式<br>`base64`模式可解决跨设备传输时协议端无法访问本地路径的问题').experimental(),
   }).description('🔧 高级进阶设置'),

   Schema.object({
      loggerinfo: Schema.boolean().default(false).description('🐛 日志调试开关'),
   }).description('🔍 调试模式'),
]);
exports.Config = Config;
