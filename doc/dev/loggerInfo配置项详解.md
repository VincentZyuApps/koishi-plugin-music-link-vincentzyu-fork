# loggerInfo 配置项详解

**日期**: 2026-04-10  
**版本**: 1.9.6  
**插件**: music-link-vincentzyu-fork

---

## 📌 概述

`loggerinfo` 是原作者留下的一个**日志调试开关**配置项，用于控制插件是否输出详细的调试日志信息。

---

## ⚙️ 配置项定义

**位置**: [`lib/config.js`](../lib/config.js#L573)

```javascript
loggerinfo: Schema.boolean().default(false).description('🐛 日志调试开关')
```

| 属性 | 值 |
|------|-----|
| **类型** | `boolean` |
| **默认值** | `false`（关闭） |
| **作用域** | 全局调试开关 |

---

## 🔧 实现原理

### logInfo 函数定义

**位置**: [`lib/index.js`](../lib/index.js#L120-L128)

```javascript
// 本地日志函数（替代 global 全局变量，支持多实例）
const logInfo = (msg, msg2 = null, _config, _logger) => {
   if (config && config.loggerinfo && logger) {
      if (msg2 !== null && msg2 !== undefined) {
         logger.info(`${msg}${msg2}`);
      } else {
         logger.info(msg);
      }
   }
};
```

### 工作机制

1. **条件判断**: 只有当 `config.loggerinfo === true` 且 `logger` 对象存在时，才会输出日志
2. **双重消息支持**: 
   - 如果提供了 `msg2` 参数，会将两个消息拼接后输出
   - 否则只输出 `msg`
3. **多实例安全**: 使用局部闭包而非全局变量，支持 Koishi 的多实例运行

---

## 📍 使用场景

`logInfo` 函数在以下关键位置被调用，用于输出调试信息：

### 1. 代理请求调试

**位置**: [`lib/utils.js`](../lib/utils.js#L250)

```javascript
logInfo(`使用${proxyUrl}代理请求${targetUrl}`);
```

**输出示例**:
```
[INFO] 使用https://web-proxy.apifox.cn/api/v1/request代理请求https://music.163.com/api/song/url
```

---

### 2. 文件下载详情

**位置**: [`lib/utils.js`](../lib/utils.js#L279)

```javascript
logInfo(file);
```

**输出内容**: 完整的文件对象信息（包括 MIME 类型、大小等）

---

### 3. 文件名生成

**位置**: [`lib/utils.js`](../lib/utils.js#L293)

```javascript
logInfo(`使用模板生成文件名: ${filename}`);
```

**输出示例**:
```
[INFO] 使用模板生成文件名: 晴天-周杰伦-20260410-143025.mp3
```

---

### 4. 文件传输模式

**位置**: [`lib/index.js`](../lib/index.js#L249)

```javascript
logInfo(`使用 base64 模式发送文件: ${finalFilename}, mimeType: ${fileInfo.mimeType}`);
```

**输出示例**:
```
[INFO] 使用 base64 模式发送文件: 晴天-周杰伦-20260410-143025.mp3, mimeType: audio/mpeg
```

---

### 5. 临时文件清理

**位置**: [`lib/index.js`](../lib/index.js#L261)

```javascript
logInfo(`正在执行： cacheFiles.delete(${localFilePath})`);
```

**输出示例**:
```
[INFO] 正在执行： cacheFiles.delete(/path/to/cache/晴天-周杰伦-20260410-143025.mp3)
```

---

### 6. 合并转发调试

**位置**: [`lib/index.js`](../lib/index.js#L297, L314, L329)

```javascript
logInfo(`使用合并转发，正在收集图片和文本。`);
logInfo(`合并转发的内容：${JSON.stringify(figureContent, null, 2)}`);
logInfo(responseElements);
```

**输出内容**: 
- 合并转发的触发状态
- 完整的消息内容结构（JSON 格式化）
- 响应元素详情

---

## 💡 使用建议

### ✅ 何时开启

| 场景 | 建议 |
|------|------|
| **排查下载问题** | ✅ 开启，查看文件下载和命名过程 |
| **调试代理配置** | ✅ 开启，确认代理是否生效 |
| **检查文件清理** | ✅ 开启，验证临时文件是否按时删除 |
| **分析消息结构** | ✅ 开启，查看合并转发的详细内容 |
| **日常使用** | ❌ 关闭，避免日志过多影响性能 |
| **生产环境** | ❌ 关闭，减少不必要的 I/O 操作 |

---

### 🔍 调试流程示例

#### 问题：音乐文件没有正确命名

**步骤 1**: 开启日志
```yaml
loggerinfo: true
```

**步骤 2**: 触发点歌命令
```
网易点歌 晴天
```

**步骤 3**: 查看日志输出
```
[INFO] 使用模板生成文件名: 晴天-周杰伦-20260410-143025.mp3
[INFO] 使用 base64 模式发送文件: 晴天-周杰伦-20260410-143025.mp3, mimeType: audio/mpeg
```

**步骤 4**: 分析问题
- 如果看到随机 hash 文件名 → 检查 `renameTempFile` 配置
- 如果看到错误的占位符 → 检查 `fileNameTemplate` 配置
- 如果没有日志输出 → 确认 `loggerinfo` 已开启

---

## 🆚 与其他日志配置的区别

| 配置项 | 作用 | 级别 |
|--------|------|------|
| `loggerinfo` | 插件内部调试日志（logInfo 函数） | 应用层 |
| `verboseFileLog` | 输出最后一次请求的歌单到 JSON 文件 | 数据层 |
| Koishi 内置日志 | 框架级日志（error/warn/info/debug） | 框架层 |

**关系**:
- `loggerinfo` 是最细粒度的调试开关
- 专注于插件业务逻辑的关键节点
- 不影响 Koishi 框架的其他日志输出

---

## ⚠️ 注意事项

1. **性能影响**: 开启后会增加日志 I/O，高频使用时可能影响性能
2. **隐私风险**: 日志中可能包含歌曲 URL、文件路径等信息，公开分享时需脱敏
3. **日志量**: 单次点歌可能产生 5-10 条日志，批量操作时会更多
4. **多实例**: 每个插件实例有独立的 `logInfo` 函数，互不干扰

---

## 📝 代码演进历史

根据注释 `"本地日志函数（替代 global 全局变量，支持多实例）"` 可知：

**早期版本**:
```javascript
// 使用全局变量（存在问题）
global.logInfo = (msg) => {
   if (config.loggerinfo) {
      console.log(msg);
   }
};
```

**当前版本**:
```javascript
// 使用闭包（支持多实例）
const logInfo = (msg, msg2 = null, _config, _logger) => {
   if (config && config.loggerinfo && logger) {
      logger.info(msg);
   }
};
```

**改进点**:
- ✅ 避免全局污染
- ✅ 支持 Koishi 多实例运行
- ✅ 集成到 Koishi 的日志系统（使用 `logger.info` 而非 `console.log`）
- ✅ 更好的上下文隔离

---

## 🔗 相关文档

- [音乐文件下载业务逻辑](./20260410_1.9.6_有关音乐文件下载的业务逻辑.md)
- [Koishi 日志系统文档](https://koishi.chat/zh-CN/api/core/logger.html)

---

---

## 🆕 增强版下载日志（v1.9.6+）

### 下载流程日志

当开启 `loggerinfo: true` 时，文件下载过程会输出详细的阶段性日志：

#### 1️⃣ 下载开始

```
[INFO] 📥 [下载开始] 晴天 - 周杰伦
[INFO]    ├─ URL: https://music.163.com/song/media/outer/url?id=123456.mp3
[INFO]    ├─ 平台: netease
[INFO]    └─ 启用文件下载: ✅ 是
```

**包含信息**:
- 歌曲名称和歌手
- 下载URL（超过100字符会截断）
- 音乐平台标识
- 文件下载功能是否启用

---

#### 2️⃣ 下载进行中（超时提醒）

如果下载超过 **5秒**，会自动输出提醒：

```
[INFO] ⏳ [下载进行中] 已耗时 5.2秒，文件可能较大或网络较慢，请耐心等待...
```

**触发条件**:
- 下载时间 > 5秒
- 每5秒只会提醒一次（通过setTimeout实现）

---

#### 3️⃣ 下载完成

```
[INFO] ✅ [下载完成] 耗时 3.45秒 | 大小 8524.32 KB
[INFO]    ├─ MIME类型: audio/mpeg
[INFO]    └─ 文件扩展名: .mp3
```

**包含信息**:
- 实际下载耗时（精确到0.01秒）
- 文件大小（KB单位）
- MIME类型检测结果
- 推断的文件扩展名

---

#### 4️⃣ 文件名生成

**自定义命名模式** (`renameTempFile: true`):
```
[INFO] 📝 [文件名生成] 使用自定义命名模式
[INFO]    ├─ 模板: ${name}-${artist}-${time}
[INFO]    └─ 生成文件名: 晴天-周杰伦-20260410-143025.mp3
```

**模板解析失败降级**:
```
[INFO] 📝 [文件名生成] 使用自定义命名模式
[INFO]    ⚠️ 模板解析失败，降级到安全歌名模式
[INFO]    └─ 降级文件名: 晴天.mp3
```

**随机Hash模式** (`renameTempFile: false`):
```
[INFO] 📝 [文件名生成] 使用随机Hash模式
[INFO]    └─ 生成文件名: a3f5b8c2d1e4f678.mp3
```

---

#### 5️⃣ 文件保存

**localPath 模式**:
```
[INFO] 💾 [文件保存] 使用 localPath 模式
[INFO]    └─ 保存路径: /path/to/cache/晴天-周杰伦-20260410-143025.mp3
```

**base64 模式**:
```
[INFO] 💾 [文件保存] 使用 base64 模式（不保存到本地）
```

---

#### 6️⃣ 处理完成

```
[INFO] ✨ [处理完成] 总耗时 3.67秒 | 传输模式: base64
```

**包含信息**:
- 从开始到结束的总耗时
- 当前使用的文件传输模式

---

### 下载失败日志

当下载失败时，会输出详细的错误信息：

```
[ERROR] ❌ [下载失败] 晴天 - 周杰伦
[ERROR]    ├─ 错误类型: AxiosError
[ERROR]    ├─ 错误消息: Request failed with status code 404
[ERROR]    ├─ HTTP状态码: 404
[ERROR]    └─ 响应数据: {"code":404,"message":"Resource not found"}
[ERROR]    └─ 堆栈跟踪: Error: ...
```

**包含信息**:
- 失败的歌曲信息
- 错误类型（AxiosError、TypeError等）
- 错误消息摘要
- HTTP状态码（如果有）
- 响应数据前200字符
- 完整堆栈跟踪

---

### 日志优势

| 特性 | 说明 |
|------|------|
| **结构化** | 使用树形结构（├─ └─）清晰展示层级关系 |
| **阶段化** | 每个关键步骤都有明确的标签（📥 ✅ ⏳ 💾 ✨ ❌） |
| **量化指标** | 耗时、文件大小等数值一目了然 |
| **故障诊断** | 失败时提供完整的错误上下文 |
| **性能监控** | 可追踪下载速度和瓶颈 |

---

### 使用场景示例

#### 场景1: 排查下载慢的问题

```yaml
loggerinfo: true
```

观察日志中的耗时信息：
```
[INFO] ⏳ [下载进行中] 已耗时 5.1秒，文件可能较大或网络较慢，请耐心等待...
[INFO] ✅ [下载完成] 耗时 12.34秒 | 大小 15234.56 KB
```

→ 结论：文件较大（15MB），下载速度约1.2MB/s，属于正常范围

---

#### 场景2: 调试文件名问题

```yaml
loggerinfo: true
renameTempFile: true
fileNameTemplate: '${name}-${artist}'
```

观察日志：
```
[INFO] 📝 [文件名生成] 使用自定义命名模式
[INFO]    ├─ 模板: ${name}-${artist}
[INFO]    └─ 生成文件名: feat.-Unknown Artist.mp3
```

→ 发现问题：歌手字段为空，导致生成了"Unknown Artist"

---

#### 场景3: 分析API错误

```
[ERROR] ❌ [下载失败] 未知歌曲 - 未知歌手
[ERROR]    ├─ 错误类型: AxiosError
[ERROR]    ├─ 错误消息: Request failed with status code 403
[ERROR]    ├─ HTTP状态码: 403
[ERROR]    └─ 响应数据: {"error":"Access denied","reason":"VIP required"}
```

→ 结论：该歌曲需要VIP权限，API返回403拒绝访问

---

*本文档基于 v1.9.6 版本代码分析生成，新增了完整的下载流程日志系统*
