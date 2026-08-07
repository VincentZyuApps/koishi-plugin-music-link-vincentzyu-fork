# verboseConsoleLog 配置项详解

- 日期：2026-08-01
- 适用版本：1.11.3-beta.4+20260801 及后续版本
- 插件：music-link-vincentzyu-fork

## 1. 配置作用

`verboseConsoleLog` 是插件唯一的控制台详细日志开关喵。

关闭时只显示业务结果、降级动作和错误摘要，开启后额外显示 API、payload、响应、路径、内部过程和 Stack trace 喵。

```js
verboseConsoleLog: false
```

默认值是 `false`，普通用户不需要主动开启喵。

遇到平台接口、消息发送、文件下载或渲染问题时，可以临时开启以收集诊断信息喵。

## 2. 两档日志模型

插件只有 `logInfo()` 与 `logDebug()` 两个生产日志函数，两者底层都调用 Koishi 的 `ctx.logger.info()` 喵。

插件不使用 `ctx.logger.warn()`、`ctx.logger.error()` 或 `ctx.logger.debug()` 喵。

| 函数 | 是否始终输出 | 插件内前缀 | 用途 |
| --- | --- | --- | --- |
| `logInfo(summary, detail)` | 是 | `[🎵 INFO] <语义 emoji>` | 业务摘要、成功、降级和失败结果 |
| `logDebug(message, data)` | 仅开启详细日志时 | `[🐛 DEBUG] <语义 emoji>` | 请求、响应、对象、路径、计时和异常诊断 |

Koishi 自身仍会在前面显示 `[I] music-link`，因此完整输出类似下面这样喵：

```text
[I] music-link [🎵 INFO] 🔎 聚合搜索开始 | 关键词=mimi，平台=netease,tencent,kugou
[I] music-link [🐛 DEBUG] 🌐 tencent 搜索 API
http://example.test/v2/music/tencent?word=mimi&num=20&quality=10
```

## 3. INFO 行为

`logInfo(summary, detail)` 始终输出，summary 和 detail 合并成一条日志喵。

```js
logInfo('🎼 聚合搜索完成', 'netease 20 首，tencent 20 首，总计 40 首')
```

输出喵：

```text
[I] music-link [🎵 INFO] 🎼 聚合搜索完成 | netease 20 首，tencent 20 首，总计 40 首
```

INFO 用于以下事件喵：

- 插件启动和启用的点歌指令喵。
- 搜索开始、搜索完成和最终选歌喵。
- 文件下载、保存和发送结果喵。
- 最终采用的渲染结果喵。
- 平台消息发送结果喵。
- 音质降级、拆分重试和回退动作喵。
- 配置错误和当前操作最终失败喵。

警告使用 `⚠️`，最终失败使用 `❌`，但 Koishi 底层等级仍然是 INFO 喵。

```text
[I] music-link [🎵 INFO] ⚠️ QQ RichUI 音乐卡片发送失败，继续发送普通歌曲字段 | HTTP 400，Bad Request
[I] music-link [🎵 INFO] ❌ 音乐文件下载失败 | HTTP 403，Forbidden
```

summary 没有显式 emoji 时，日志工具会根据主题自动选择，无法判断时使用 `📝` 喵。

## 4. DEBUG 行为

`logDebug(message, data)` 仅在 `verboseConsoleLog=true` 时输出喵。

```js
logDebug('QQ RichUI 失败诊断', () => ({
    request,
    response,
    stack: error.stack,
}))
```

输出喵：

```text
[I] music-link [🐛 DEBUG] 💥 QQ RichUI 失败诊断
{
  "request": {},
  "response": {},
  "stack": "HTTPError: Bad Request ..."
}
```

DEBUG 主题会自动获得语义 emoji 喵：

| 内容 | emoji | 示例 |
| --- | --- | --- |
| API、HTTP、URL、请求和响应 | `🌐` | `[🐛 DEBUG] 🌐 落月搜索 API` |
| 文件、路径、目录、资源和缓存 | `📁` | `[🐛 DEBUG] 📁 音乐文件本地路径` |
| 渲染器和样式 | `🎨` | `[🐛 DEBUG] 🎨 Canvas 渲染配置` |
| 耗时和计时 | `⏱️` | `[🐛 DEBUG] ⏱️ SVG 渲染耗时` |
| payload、JSON、卡片和字段 | `📦` | `[🐛 DEBUG] 📦 RichUI payload` |
| 歌曲、歌单、音质和媒体 | `🎵` | `[🐛 DEBUG] 🎵 聚合候选歌曲` |
| 错误、异常和失败诊断 | `💥` | `[🐛 DEBUG] 💥 发送失败诊断` |
| 无法自动分类 | `🔍` | `[🐛 DEBUG] 🔍 内部状态` |

调用方显式提供 emoji 时会保留原值，不会重复添加喵。

## 5. Lazy 诊断数据

对象、数组、响应和复杂诊断应通过函数形式传给 `logDebug()` 喵。

```js
logDebug('聚合搜索原始结果', () => ({ resultGroups, searchResults }))
```

关闭详细模式时，该函数不会执行，也不会发生 JSON 序列化或大型对象复制喵。

简单字符串可以直接传入喵：

```js
logDebug('歌曲详情 API', detailApiUrl)
```

## 6. 错误记录方式

失败事件由一条常驻摘要和一条可选详细诊断组成喵。

```js
logInfo('⚠️ QQ RichUI 发送失败，已回退普通字段', summarizeError(error))
logDebug('QQ RichUI 失败诊断', error)
```

关闭详细模式时只能看到错误消息、HTTP 状态、业务码和 trace ID 等短摘要喵。

开启后可以额外看到 Error 属性、响应数据、请求 payload、cause 和 Stack trace 喵。

任何错误摘要都不能受 `verboseConsoleLog` 控制，否则关闭详细模式后会丢失业务失败记录喵。

## 7. 安全处理

详细日志会递归处理 Error、Headers、BigInt、循环引用和特殊对象喵。

以下认证字段会显示为 `[REDACTED]` 喵：

- Authorization、Cookie 和 Set-Cookie 喵。
- token、access token 和 refresh token 喵。
- secret、ticket、session key 和认证签名喵。

Buffer、ArrayBuffer、Base64 和大型二进制内容只记录类型与长度，不输出正文喵。

QQ payload 与响应 JSON 会保留排查所需结构，但会先执行上述脱敏和二进制摘要化喵。

## 8. 与 verboseFileLog 的区别

`verboseFileLog` 只控制完整歌单文件 `log/songlist-latest.json`，不控制 DEBUG 控制台日志喵。

| 配置 | 控制内容 |
| --- | --- |
| `verboseConsoleLog` | API、payload、响应、路径、计时和 Stack trace |
| `verboseFileLog` | 最后一次完整歌单 JSON 文件 |

两个配置可以独立开启，也可以同时开启喵。

即使同时开启，完整歌单也不会整体倾倒到控制台喵。

## 9. 从 loggerinfo 迁移

旧 `loggerinfo` 配置项已经移除，不再提供兼容别名喵。

```diff
- loggerinfo: true
+ verboseConsoleLog: true
```

旧版 `logInfo(msg, msg2, config, logger)` 的额外参数也已经删除喵。

新模块统一接收实例级 `musicLogger` 对象，并从中使用 `logInfo` 与 `logDebug` 喵。

## 10. 相关实现

- 配置定义：`lib/config.js` 喵。
- logger 工具：`lib/util/logger.js` 喵。
- logger 单元测试：`test/test-media/logger.test.js` 喵。
- 完整重构规划：`doc/dev/20260801.logger重构/20260801.logger重构.md` 喵。

静态验收要求 `lib/` 中只有 `lib/util/logger.js` 可以直接调用 `ctx.logger.info()`，并且不存在直接 console、WARN、ERROR 或 Koishi DEBUG 调用喵。
