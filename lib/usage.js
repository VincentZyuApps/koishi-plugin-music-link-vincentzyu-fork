"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usage = void 0;

const { readFileSync } = require('fs');
const { resolve } = require('path');
const { QUALITY_PROFILES } = require('./util/quality');

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
);

const qualityProfiles = Object.values(QUALITY_PROFILES);
const qualityPlatformNames = qualityProfiles.map((profile) => profile.platformLabel).join(' + ');
const qualityOptionCount = qualityProfiles.reduce(
  (count, profile) => count + profile.qualities.length,
  0,
);
const qualityHighlights = qualityProfiles.map((profile) => {
  const highestQuality = profile.qualities[profile.qualities.length - 1];
  return `<li>🎯 <b>${profile.platformLabel}最高支持：${highestQuality.label}</b></li>`;
}).join('\n');
const qualityTableRows = qualityProfiles.flatMap((profile) => (
  profile.qualities.map((quality) => (
    `<tr><td>${profile.platformLabel}</td><td><code>${quality.value}</code></td><td>${quality.label}</td></tr>`
  ))
)).join('\n');

const usage = `
<h1>Koishi 插件：music-link-vincentzyu-fork</h1>
<p>
  <a href="https://www.npmjs.com/package/koishi-plugin-music-link-vincentzyu-fork" target="_blank">
    <img src="https://img.shields.io/npm/v/koishi-plugin-music-link-vincentzyu-fork?style=flat-square" alt="npm version">
  </a>
  <a href="https://github.com/VincentZyuApps/koishi-plugin-music-link-vincentzyu-fork" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork" target="_blank">
    <img src="https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white" alt="Gitee">
  </a>
  <a href="https://forum.koishi.xyz/t/topic/12120" target="_blank">
    <img src="https://img.shields.io/badge/Koishi Forum-12120-5546A3?style=for-the-badge&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&logoColor=white" alt="Forum">
  </a>
  <a href="https://qm.qq.com/q/4vjto4V7Di" target="_blank">
    <img src="https://img.shields.io/badge/QQ群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white" alt="QQ群">
  </a>
</p>
<h2>🎯 插件版本：v${pkg.version}</h2>
<h3>原始仓库: <a href="https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/music-link" target="_blank">https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/music-link</a></h3>

<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>   🎉（这个群G了</del> </p> 
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>

<p><b>💡 提示：</b>  <a href="https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork" target="_blank"> 前往 Gitee README 获得更佳观感 → <i> https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork </i> </a> </p>

<hr>

<details>
<summary><h2>📖 插件详细说明 (点击展开)</h2></summary>

<h2 style="color: #FF9800;">⚠️ 首次启动说明</h2>
<p>插件首次启动时，会自动下载所需资源到 <code>ctx.baseDir/data/assets/music-link-vincentzyu-fork</code>，优先使用 Gitee release，失败后 fallback 到 GitHub release，并校验 sha256。<b>资源全部校验通过后才会注册指令和启动中间件</b>。如果网络不稳定或自动下载失败，可以手动下载资源文件。</p>

<p><b>资源文件下载链接：</b></p>
<ul>
<li><b>字体文件：</b>
  <ul>
  <li><a href="https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/assets/LXGWWenKaiMono-Regular.ttf" target="_blank">LXGWWenKaiMono-Regular.ttf</a></li>
  <li><a href="https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/assets/SourceHanSerifSC-Medium.otf" target="_blank">SourceHanSerifSC-Medium.otf</a></li>
  </ul>
</li>
<li><b>背景图片：</b>
  <ul>
  <li><a href="https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/assets/mahiro_mihari.png" target="_blank">mahiro_mihari.png</a></li>
  <li><a href="https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/assets/pixai_koishi.png" target="_blank">pixai_koishi.png</a></li>
  </ul>
</li>
</ul>

<p><b>手动下载步骤：</b></p>
<ol>
<li>点击上述链接下载资源文件</li>
<li>将所有文件放入 <code>Koishi 根目录/data/assets/music-link-vincentzyu-fork</code></li>
<li>重启本插件，让插件重新执行一遍资源校验</li>
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
  <li>⚠️ 当前不支持酷狗音乐</li>
  <li>✅ 支持多音质选择和双平台聚合搜索</li>
  </ul>
</li>
<li><b><code>http://xwl.vincentzyu233.cn:51217</code></b> (作者自建)
  <ul>
  <li>✅ 保留官方 API 的网易云和 QQ 音乐功能</li>
  <li>✅ 额外支持酷狗音乐 API 等扩展能力</li>
  <li>⚠️ 如果挂了可以去QQ群：259248174 叫我</li>
  </ul>
</li>
</ul>

<p><b>落月点歌（command9）全平台音质等级说明：</b></p>
<blockquote>
<p>⚠️ <b>后端兼容性说明：</b>下表列出插件可配置的全部音质档位。官方 <code>api.vkeys.cn/v2</code> 当前仅支持网易云和 QQ 音乐，暂不支持酷狗音乐。酷狗音乐可使用作者自建 API；其他自定义后端是否支持酷狗取决于具体实现。</p>
</blockquote>
<ul>
<li>🎼 全部平台：<b>${qualityPlatformNames}</b></li>
<li>✅ 共 ${qualityOptionCount} 个真实音质档位</li>
${qualityHighlights}
</ul>
<table>
<thead>
<tr><th>平台</th><th>quality 参数</th><th>原始音质选项</th></tr>
</thead>
<tbody>
${qualityTableRows}
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
<p>⚠️针对 QQ 官机发语音的特别说明：</p>
<ul>
<li>需要安装 <code>ffmpeg</code> 服务和 <code>silk</code> 服务</li>
<li>推荐安装方式：
  <ul>
    <li>插件市场搜索并安装 <code>ffmpeg-path</code> 和 <code>silk</code> 插件</li>
    <li>或使用 CLI 命令在 Koishi 根目录执行：
      <pre><code>npm install koishi-plugin-ffmpeg-path koishi-plugin-silk</code></pre>
      或
      <pre><code>yarn add koishi-plugin-ffmpeg-path koishi-plugin-silk</code></pre>
    </li>
  </ul>
</li>
<li>安装完成后，在 <code>ffmpeg-path</code> 插件配置中填写你的 ffmpeg 路径，例如：<code>/usr/bin/ffmpeg</code></li>
<li>如果你使用 Docker Napcat / LLbot 的情况，建议建议使用 base64 传文件，而不是本地路径，免去了docker卷挂载配置捏（默认已开启）</li>
</ul>
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

<hr>

<h3 style="color: #27ae60;">字体使用声明</h3>
<p>本插件使用以下开源字体进行图像渲染：</p>
<ul>
  <li><b style="color: #3498db;"><a href="https://github.com/adobe-fonts/source-han-serif/tree/master" target="_blank">思源宋体（Source Han Serif SC）</a></b> - 由 Adobe 与 Google 联合开发，遵循 <a href="https://openfontlicense.org" target="_blank">SIL Open Font License 1.1</a> 协议。</li>
  <li><b style="color: #3498db;"><a href="https://github.com/lxgw/LxgwWenkai" target="_blank">霞鹜文楷（LXGW WenKai）</a></b> - 由 LXGW 开发并维护，遵循 <a href="https://openfontlicense.org" target="_blank">SIL Open Font License 1.1</a> 协议。</li>
</ul>
<p>两者均为自由字体，可在本项目中自由使用、修改与发布。若你也在开发相关插件或项目，欢迎一同使用这些优秀的字体。</p>

<hr>

<h3 style="color: #e67e22;">插件许可声明</h3>
<p>本插件为开源免费项目，基于 <a href="https://opensource.org/licenses/MIT" target="_blank">MIT 协议</a> 开放。欢迎修改、分发、二创。</p>
<p>如果你觉得插件好用，欢迎在 GitHub 上 ⭐ Star 或通过其他方式给予支持（例如提供服务器、API Key 或直接赞助）！</p>
<p style="color: #e91e63;">感谢所有开源字体与项目的贡献者 ❤️</p>

`;
exports.usage = usage;
