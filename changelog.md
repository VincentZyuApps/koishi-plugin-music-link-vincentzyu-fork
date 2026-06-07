# 更新日志

## fork仓库 (koishi-plugin-music-link-vincentzyu-fork)

- **1.9.9+20260607** 📦
  - 🗂️ **整理仓库结构**
    - 将 `tmp/拆分计划捏.md` 迁移到 `doc/dev/202604.拆分计划捏.md`
    - 更新 `.gitignore`，补充排除 `tmp/` 与 `node_modules/`
  - 📝 **文档与版本**
    - `package.json` 版本号 bump 到 `1.9.9+20260607`
    - `readme.md` 追加少量说明内容

- **1.9.9-beta.4+20260411** 📚
  - 📝 **文档补完**
    - 完善 `1.9.7` 与 `1.9.0` 的详细说明文档
    - 在 `readme.md` 中补充对应跳转链接
  - 💬 **论坛稿微调**
    - 后续又补了两个纯文档提交，删除重复图片，并微调 OneBot 白名单更新帖内容

- **1.9.9-beta.3+20260411** 🎨
  - 🐛 **Puppeteer 样式修复**
    - 修复 `ORIGIN_BLACK_WHITE` 样式中 version info 与歌单内容重叠的问题
    - `body` 顶部留白增大，`version-info` 与 `header-bar` 的定位重新调整
    - 调整 DOM 顺序，让版本信息先于 header 渲染
  - 📸 **截图范围修复**
    - 截图目标从 `#song-list` 改为整个 `body`，避免顶部信息被裁掉

- **1.9.9-beta.2+20260411** 🧪
  - 📦 **测试资源整理**
    - 将测试资源从 `assets/` 迁移到 `test/`
    - 修正测试数据读取路径
  - 📝 **发布内容修复**
    - `package.json` 的 `files` 字段加入 `test`
    - 更新 `test/README.md`，补充测试脚本使用说明

- **1.9.9-beta.1+20260411** 🚀
  - ✨ **渲染与调试增强**
    - `command6` / `command9` 新增 `--test` 模式，只展示歌单，不进入选择流程
    - SVG 渲染支持自定义字体：`svgEnableCustomFont`、`svgFontFiles`、`svgFontFamilies`
    - SVG / Puppeteer 渲染器新增版本信息显示开关：`svgShowVersionInfo`、`puppeteerShowVersionInfo`
  - 🐛 **问题修复**
    - 修复 Puppeteer 重复生成 HTML 的性能浪费问题
    - 修复 SVG 渲染中 `config` 未定义导致的 `ReferenceError`
  - 🎨 **代码整理**
    - 全仓库重新格式化，统一缩进与代码风格

- **1.9.7-beta.1+20260410** 🔍
  - ✨ **OneBot 音乐卡片白名单**
    - 新增 OneBot 音乐卡片 JSON 解析白名单机制
    - 支持按 `viewType + enabled` 自定义规则
    - 默认启用 `music`，默认禁用 `news`
    - 新增 `enableWhitelist` 与 `customWhitelist` 配置项
  - ⚙️ **交互与配置增强**
    - 新增 `used_id` 配置项，用于指定歌单默认选择序号
    - QQ Markdown 模式新增 `renderInfo` 信息展示
  - 🔧 **架构调整**
    - 重构渲染架构，新增 `lib/renderer-text.js`
    - 重写并行 / 串行渲染流程，按配置顺序严格发送
    - 修复 QQ 平台连续发送多个 Markdown 歌单时的 `msg_seq` 问题
  - 🪵 **日志系统增强**
    - 下载、缓存、发送流程统一增加结构化日志与 emoji 标记
    - 增强耗时、大小、超时等调试信息
  - 📖 **详细文档**：[查看 1.9.7 OneBot 音乐卡片白名单功能详解](doc/koishi论坛的更新日志捏/1.9.7更新了解析onebot音乐卡片的白名单.md)

- **1.9.6-beta.4+20260330** 📝
  - 🖼️ **文档与预览补充**
    - 新增 QQ Markdown 渲染模式预览图
    - 更新 `README.md` 中的 QQ Markdown 说明
    - 补充 Koishi WebUI notifier 预览图
    - 配套微调 `render-qq-markdown.js`

- **1.9.6-beta.3+20260330** 💬
  - ✨ **QQ Markdown 首次接入**
    - `command6` 与 `command9` 支持 QQ Markdown 发送
    - 为正式可用版本预先整理发送链路与渲染逻辑

- **1.9.6-beta.2+20260329** 🐛
  - 🐛 **显示修复**
    - 修复 QQ Markdown 模式下歌手信息不显示的问题
  - ⚙️ **配置拆分**
    - 新增 `markdownTableMaxDisplay`，默认 20 首
    - 新增 `markdownStyleMaxDisplay`，默认 10 首
    - 移除旧的 `markdownMaxDisplay`

- **1.9.5-beta.1+20260329** 🎵
  - ✨ **列表显示优化**
    - 歌曲序号由 `1. 歌曲名` 改为 `(1) 歌曲名`
    - 尝试优化智能制表符对齐，不过这次仍未完全修好
  - 🐛 **细节修复**
    - 修复 `command6` 搜索结果缺少平台标识的问题，网易来源会正确显示 tag
  - 💡 **文案调整**
    - 将“出图模式”更名为“消息渲染模式”
    - 微调部分后端 API 描述

- **1.9.4-beta.1+20260325** 🧩
  - 🔧 **模块拆分**
    - 将 `index.js` 拆分为 `middleware.js`、`command6.js`、`command9.js` 等模块
    - 新增 `sendMusicCard` 发送函数，方便后续扩展
  - 🐛 **功能修复**
    - 修复序号输入错误 bug
    - 修复私聊音乐卡片发送失败问题
  - ✨ **后续补丁并入本版本脉络**
    - 紧接着又修复了重复插件检测问题
    - 增加 `exports.reusable = true`、`exports.Config`、`exports.usage`
    - 优化 `command6` 默认配置，并让启动日志显示已启用指令名称
  - 🔔 **notifier 相关能力**
    - WebUI 中展示配置信息与资源下载状态的能力，是这一阶段一起补进来的

- **1.9.1-beta.1+20260325** 🌗
  - 🔧 **渲染器行为统一**
    - 将 SVG 的 `renderInfo` 判断逻辑收进内部，与 Puppeteer 行为保持一致
    - 简化 `render.js`，移除部分冗余判断
  - 🎨 **布局优化**
    - 右侧标签整体右移
    - 左侧文本可显示长度略微增加，减少省略号
  - 🌙 **参数增强**
    - `darkMode` 重命名为 `enablePuppeteerDarkMode`
    - `command6` / `command9` 新增 `--mode`
    - 支持 `light` / `dark` / `白天` / `黑夜`
  - ⚠️ **提示优化**
    - 对 `svgWidth` 与 `svgColumns` 增加警告说明

- **1.9.0-alpha.1+20260324** 🦀
  - ✨ **SVG 渲染正式落地**
    - 引入基于 `@resvg/resvg-js` 的 SVG 歌单渲染能力
    - 新增 `lib/renderer-svg.js` 与 `lib/renderer-pptr.js`
    - `renderMode` 支持 `svg` / `puppeteer` / `text` 多模式组合
  - 🎨 **SVG 能力**
    - 支持暗黑模式、自定义主题色、多列布局与缩放比例
    - 默认仅启用 SVG，Puppeteer 保持可选依赖
  - 🧱 **工程调整**
    - 重构 `render.js`、`index.js`、`config.js`
    - 新增预览图、测试文件、开发文档与日志样例
  - 📌 **说明**
    - 后续 `9e86356` 提交又把版本号从 `1.9.0-beta.1+20260324` 回调为 `1.9.0-alpha.1+20260324` 用于发版，因此这里按仓库实际提交历史记为 `alpha.1`
  - 📖 **详细文档**：[查看 1.9.0 SVG 渲染功能详解](doc/koishi论坛的更新日志捏/1.9.x更新了svg出图捏.md)

- **1.8.2-beta.1+20260310** 🛠️
  - 🐛 修复 `command6` 的 ID 点歌模式中 `selectedSongId` 未定义的致命 bug
  - 🐛 修复 `generateResponse()` 无条件发送音乐卡片，导致 `command9` 重复 / 误发
  - 🧹 移除 `global._musicPlugin*` 全局变量污染，和 `reusable: true` 设计保持一致
  - ♻️ 提取 `buildSongUrl()`、`smartGet()`、`fetchNeteaseLyric()`、`safeJsonParse()` 等辅助函数
  - ⚡ 将字体和图片读取改为模块级缓存，并给 Puppeteer page 增加 `try/finally`
  - 🏠 `homepage` / `bugs` 迁移到 GitHub

- **1.8.1+20260310** 🎉
  - 💬 更新反馈群号为 `1085190201`
  - 📦 正式发版

- **1.8.1-beta2+20260207** 🧰
  - ✨ 新增 `fileNameKeepSpaces`，支持保留文件名空格
  - ✨ 新增 `fileNameSlashReplacement`，支持自定义文件名中 `/` 的替换字符
  - 📝 `deleteTempTime` 说明里明确支持 `0` 或负数，表示永不删除临时文件
  - ⚙️ `maxDuration` 默认值从 900 秒调整为 1800 秒
  - 🧹 移除部分配置项的 `.experimental()` 标记

- **1.8.1-beta1+20260127** 🚚
  - ✨ 新增 base64 发文件支持，适配不方便挂载 `temp` 目录的 napcat docker 场景
  - ✨ 新增自定义文件名格式，例如 `${name}-${artist}-${time}.mp3`
  - 🔧 把原本超长的 `index.js` 拆到 `config.js`、`utils.js` 等文件，便于继续维护
  - ⚙️ 调整部分默认配置，例如 `deleteTempTime = 300`
  - 📴 将尚未真正实现的 `addCoverInImage` 改为默认 `false` 并禁用

- **1.8.0-beta1+20251218** 🌙
  - ✨ 落月 API 新增自定义 URL
  - 🔢 调整版本号命名方式，开始使用新的 fork 版本风格

- **1.7.31-vincentzyu.v8+20251028** 🖼️
  - ✨ 新增 `FLAT_MODERN` HTML 渲染模板
  - ✨ 支持自定义字体路径配置
  - 🧹 清理旧预览图文件并更新 `readme.md`

- **1.7.31-vincentzyu.v6+20251027** 🎴
  - ✨ 支持发送 OneBot 音乐卡片
  - ✨ 接入落月 API v2，基于 `api.vkeys.cn`
  - 🎵 支持 QQ 音乐、网易云，以及二者聚合搜索 / 取链
  - 📚 仓库内新增一整套落月 API v2 说明文档

- **1.7.30-vincentzyu.v4+20250923** 🌱
  - ✂️ 这是 fork 早期的关键整理版本
  - 🔧 只保留 `command6` 和 `command8`，删去大部分已经不稳定或不可用的旧命令
  - 🖼️ 初步提供两种渲染图片样式

- **更早的 fork 初期提交** 🕰️
  - 2025-08 到 2025-09 之间还有 `1.7.30-vincentzyu.v1~v3` 几个早期试验版本
  - 这几次提交主要是 fork 起步阶段的小步试改；目前仓库里没有更完整的人工 changelog 描述，后续如果要继续补，建议按这些提交逐个回填：`e4228b4`、`e252c3f`、`3e806c4`

---

## 上游仓库 (koishi-plugin-music-link)

- **1.7.23**：
  - 添加`网易点歌`的最大时长限制
  - 支持qq官方平台机器人发送下载链接

- **1.7.20**：
  - 优化`generateResponse`调用方法
  - 修复command5的无下载链接的歌曲导致的无限等待
  - 新增合并转发模式 仅支持onebot平台
  - 优化项目说明

- **1.7.17**：
  - 感谢`https://github.com/Onimaimai/nonebot-plugin-voicemusic/issues/10`提及的的API捏
  - 感谢`www.byfuns.top`
  - 新增网易点歌的直链获取后端。再也不是黑胶只能30秒啦~

- **1.7.16**：
  - 取消龙珠点歌的QQ音乐API调用
  - 优化command8的传参和本地化使用
  - 修改readme内容

- **1.7.15**：
  - 优化部分配置项说明
  - 整理优化结构
  - 声明支持多份配置
  - 为保持配置项统一稳定和简洁，暂不支持在同一个配置里 同时选择多个后端 注册多个指令
  - 修复`music.gdstudio.xyz`平台多弹窗的提示问题
  - 完善指令说明
  - 优化所有指令的具体实现
  - 通测确保正常
  - 取消字段的.hidden()
  - 优化说明内容

- **1.7.14**：
  - 优化command6的请求逻辑
  - 使用更加稳定的网易云官方API
  - 优化封面返回清晰度
  - 仍然使用原来的后端作为语音后端
  - 优化使用说明
  - 优化本地化对指令的描述
  - 优化项目说明内容，新增对file类型的提示

- **1.7.13**：
  - 优化command5等待逻辑
  - 修复command5QQ平台无限等待的bug
  - 完善匹配`没有找到相关的歌曲，请尝试更换关键词或平台。`的情况

- **1.7.12**：
  - 优化之后感觉`music.gdstudio.xyz`最好用
  - 修改默认后端
  - 优化说明内容
  - 优化`music.gdstudio.xyz`监听
  - 优化等待时机
  - 优化匹配内容
  - 优化返回
  - ...

- **1.7.9**：
  - 优化`music.gdstudio.xyz`的点歌逻辑
  - 改为网络监听而不是操作元素
  - 优化说明内容
  - 优化`music.gdstudio.xyz`菜单渲染逻辑
  - 修改`formatSongList`优化参数+1，允许自定义结束ID
  - 优化超时定时器的设置
  - 交互逻辑放到page.on的外面

- **1.7.7**：
  - 增加龙珠API
  - 修复音质指定的bug
  - 修复中间件解析的command8的网易云卡片解析id比预期-10
  - 完善说明
  - 修改部分，忘了

- **1.7.2**：
  - 优化配置项结构
  - 修改网易云ID点歌，改为搜索点歌
  - 优化配置项说明内容
  - 完善说明内容
  - 新增【选择使用的后端】
  - 优化command6对-n选项的支持

- **1.6.15**：
  - 兼容QQ音乐新格式的卡片
  - 加强判断，优化小黑盒卡片判断
  - 修复网易云ID点歌的include报错
  - 修复【歌曲搜索】网页因为经验条的报错
  - 取消部分日志输出，改为调试模式输出

- **1.6.10**：
  - 修复 command7 的数据持续监听逻辑问题（不关闭puppeteer）
  - 定位temp删不掉的问题（发现是onebot协议端 发不出去 retcode200，但是资源占用）

- **1.6.9**：
  - 新增`音乐搜索器`点歌，支持酷狗+网易云（江苏好像不好访问，会江苏反诈）
  - 优化temp删除逻辑
  - 优化中间件解析，新增command6 的解析功能
  - 修复父级指令消失

- **1.6.7**：
  - 优化temp删除逻辑
  - 按照指令层级注册指令

- **1.6.6**：
  - 换key不能解决用完的问题，需要用户自己去申请
  - 新增网易云ID单曲点歌——command6
  - 新增file返回类型，支持temp保存，和定时删除
  - 修复 command5 截图元素获取不到大小的问题
  - 修复部分说明内容
  - 完善配置项类型选择的说明

- **1.6.2**：
  - 更换APIKEY
  - 修复中间件监听解析对于command5的支持

- **1.6.1**：本地化支持
- **1.6.0**：新增对第三方网站 `music.gdstudio.xyz` 的支持，优化用户体验。
- **1.5.10**：往期更新。
