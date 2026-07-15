# QQ RichUI 音乐卡片测试

本目录用于测试 `lib/qq/richui.js` 的卡片构建、Markdown 编码和 QQ 内部 API 调用逻辑喵。

## 环境要求

- 已安装 Node.js 喵。
- 不需要启动 Koishi，也不需要访问网络喵。
- 测试使用 Node.js 内置的 `node:assert/strict`，不需要额外安装测试框架喵。

## 运行方法

在插件根目录执行喵：

```powershell
node .\test\test-qq-richui\test-qq-richui.js
```

也可以进入当前目录后执行喵：

```powershell
cd .\test\test-qq-richui
node .\test-qq-richui.js
```

测试通过时会输出喵：

```text
QQ RichUI tests passed
```

若断言失败，进程退出码会变为非零，并在控制台输出具体错误喵。

## 测试范围

脚本会验证以下行为喵：

- 网易云音乐详情页、标题、`歌手 · 专辑名` 描述、HTTPS 封面和底栏文案喵。
- QQ 音乐详情页、底栏文案和完整 `mqqapi://markdown/node?nodeType=richui` 编解码喵。
- 酷狗音乐 `hash/album_id` 详情页和底栏文案喵。
- 群聊通过 `sendMessage()` 发送 `msg_type: 2` 的原始 Markdown 请求喵。
- 私聊通过 `sendPrivateMessage()` 发送同一请求结构喵。
- 被动回复的 `msg_id` 与递增 `msg_seq` 喵。
- 非 QQ 平台自动跳过 RichUI 发送喵。

## QQ 实机验证

自动测试不会真正连接 QQ，也无法验证不同 QQ 客户端版本的最终渲染效果喵。

进行实机验证时，在插件配置中按当前后端开启对应选项喵：

- command6 使用 `command6_AddQqRichuiCard` 喵。
- command9 使用 `command9_AddQqRichuiCard` 喵。

随后在 QQ 群聊或私聊中完成一次点歌，并检查以下结果喵：

1. RichUI 卡片应在普通歌曲字段之前单独发送喵。
2. 标题应为歌曲名，描述应为 `歌手 · 专辑名` 喵。
3. 底栏应显示 `网易云音乐/QQ音乐/酷狗音乐 · 音乐分享` 喵。
4. 点击卡片应优先打开平台歌曲详情页，缺少平台标识时回退到音频直链喵。
5. 控制台成功日志应包含 `🎴 [QQ RichUI] 已发送` 喵。

RichUI 使用 QQ 客户端的 `FlashTransfer/flash` 协议，客户端升级后可能出现兼容性变化喵。
