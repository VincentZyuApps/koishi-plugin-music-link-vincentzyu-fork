# Diff 描述：e4228b4 → 34e8056

> **起始版本**：`e4228b4` — v1.7.30-vincentzyu.v1+20250813  
> **结束版本**：`34e8056` — v1.8.1 正式版  
> **变更统计**：28 files changed, 3863 insertions(+), 2322 deletions(-)

---

## 一、代码架构重构

上游作者原始的 **2334 行单文件 `lib/index.js`** 被拆分为 4 个模块：

| 文件 | 行数 | 职责 |
|---|---|---|
| `lib/index.js` | 1034 | 主逻辑（命令注册、API 请求处理） |
| `lib/config.js` | 475 | Schema 配置定义、usage 说明页、常量映射表 |
| `lib/render.js` | 607 | 歌曲列表图片渲染（基于 puppeteer） |
| `lib/utils.js` | 312 | 工具函数（资源校验、临时文件管理等） |

涉及的 commit：
- `e252c3f` v1.7.30-v2：首次抽出 `render.js`
- `3e806c4` v1.7.30-v3：大幅精简 `index.js`（-1327 行）
- `bc23c59` 1.8.1-beta1：正式拆出 `config.js` 和 `utils.js`，index.js 从 ~1650 行降至 ~1030 行

## 二、功能新增

### 2.1 base64 发文件
- 新增通过 base64 编码发送音乐文件的方式，作为文件发送的备选方案
- commit：`bc23c59` 1.8.1-beta1

### 2.2 自定义文件名格式
- 支持用户通过配置自定义下载音乐文件的命名格式
- 后续在 `5caf050` (1.8.1-beta2) 中进一步增强，优化了格式化逻辑
- commit：`bc23c59` 1.8.1-beta1, `5caf050` 1.8.1-beta2

### 2.3 歌曲列表图片渲染
- 新增 `render.js`，使用 puppeteer 将搜索结果渲染为图片列表返回
- commit：`e252c3f` v1.7.30-v2, `3f63a51` v1.7.31-v8（+275 行大幅增强）

### 2.4 临时文件管理优化
- 新增 `safeUnlink` 等工具函数，更安全地清理下载产生的临时文件
- `deleteTempTime` 默认值从原来的值改为 300s
- 清理了误提交到仓库的临时音频文件（`lib/temp/f9288ca2907cef2e.m4a`）
- commit：`5caf050` 1.8.1-beta2, `f9a24b7`, `2cb2a70` 1.8.0-beta5

### 2.5 1.8.0 阶段的迭代（beta1 ~ beta6）
- `9555e81` beta1：小幅调整 index.js 逻辑
- `05c3f8e` beta2：新增 `dev.md` 开发笔记
- `1556e13` beta3：增加 index.js 逻辑
- `1ad31c8` beta4：大量重写（+320 行），调整默认配置
- `3faae56`：追加 usage 和 readme 内容
- `f3a28e9` beta6：微调

## 三、项目元信息 Fork 化

`package.json` 中的以下字段从上游改为 fork 仓库自己的信息：

| 字段 | 上游 (旧) | Fork (新) |
|---|---|---|
| `description` | `/*音乐下载*/🎵搜索音乐资源...` | `/*音乐下载*/music-link的fork版本。🎵搜索音乐资源...` |
| `homepage` | `github.com/shangxueink/...` | `gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork` |
| `bugs.url` | `github.com/shangxueink/.../issues` | `gitee.com/vincent-zyu/.../issues` |
| `repository` | *(无)* | 新增，指向 Gitee 仓库 |

涉及的 commit：`e252c3f`, `2c08779`, `b97d8af` 等

## 四、文档变更

- **README**：多次重写和调整格式（其中 `80d2394` 还在吐槽换行问题😂）
- **socialify banner**：给 README 加上了 `socialify.git.ci` 的项目 banner（`f18262d`）
- **更新日志**：在 README 中增加 1.8.1-beta2 版本的更新日志（`df5f6a0`）
- **落月 API v2 文档**：新增 `doc/落月API_v2/` 目录，包含 QQ 音乐和网易云音乐的完整 API 接口文档（17 个 md 文件）（`b97d8af`）
- **dev.md**：新增开发笔记（`05c3f8e`, `2cb2a70`）

## 五、其他杂项

- 新增 `.gitignore`，排除 `changes.diff`、临时文件等
- 新增 `assets/.gitkeep` 占位
- usage 说明页更新 QQ 反馈群号：旧群 `259248174` 已失效，换为 `1085190201`（`34e8056`）

## 六、版本演进时间线

```
e4228b4  2025-08-13  v1.7.30-vincentzyu.v1     起点
e252c3f  2025-08-14  v1.7.30-vincentzyu.v2     首次拆出 render.js
3e806c4  2025-08-17  v1.7.30-vincentzyu.v3     大幅精简 index.js
ef46dd0  2025-09-23  v1.7.30-vincentzyu.v4     小修
b97d8af  2025-10-27  v1.7.31-vincentzyu.v6     大量功能增强 + API 文档
3f63a51  2025-10-28  v1.7.31-vincentzyu.v8     render.js 大幅增强
9555e81  2025-12-18  v1.8.0-beta1              进入 1.8.0 开发
1ad31c8  2025-12-30  v1.8.0-beta4              大量重写
f3a28e9  2025-12-30  v1.8.0-beta6              1.8.0 最后一个 beta
bc23c59  2026-01-27  v1.8.1-beta1              拆分架构 + base64 + 自定义文件名
5caf050  2026-02-07  v1.8.1-beta2              增强文件名功能 + 临时文件优化
34e8056  2026-03-10  v1.8.1                    正式发版 🎉
```

---

**一句话总结**：把上游的单文件大杂烩拆成了模块化架构，加了 base64 发文件 / 自定义文件名 / 图片渲染等新功能，完成了 fork 独立化，最终发布 v1.8.1 正式版。
