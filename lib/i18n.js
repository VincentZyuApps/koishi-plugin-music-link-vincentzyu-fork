"use strict";

function registerI18n(ctx, config) {
    ctx.i18n.define("zh-CN", {
        messages: {
            "middlewareError": "处理消息时出错。",
        },
        commands: {
            [config.command6]: {
                description: `🎵 网易云点歌`,
                messages: {
                    "nokeyword": `🎶 请输入网易云歌曲的 名称 或 ID。\n➣示例：/${config.command6} 蔚蓝档案\n➣示例：/${config.command6} 2608813264`,
                    "invalidNumber": "❌ 序号输入错误，已退出歌曲选择。",
                    "waitTime": "⏰ 请在{0}秒内，\n输入歌曲对应的序号:\n➣示例：{1} 1",
                    "waitTimeInline": "⏰ 请在 {0} 秒内，\n点击对应的蓝字发送，或直接输入歌曲对应的序号\n➣示例：{1} 1",
                    "waitTimeout": "⌛ 输入超时，已取消点歌。",
                    "exitprompt": "👋 已退出歌曲选择。",
                    "exitCommandTip": "退出选择请发 [{0}] 中的任意内容",
                    "exitCommandTipMarkdownInlinePrefix": "退出选择请点",
                    "exitCommandTipMarkdownInlineSuffix": "或者发送其中的任意内容",
                    "exitCommandTipMarkdownText": "退出选择请发 @机器人 + 【{0}】 中的任意内容",
                    "somerror": "⚡ 解析歌曲详情时发生错误",
                    "songlisterror": "📋 无法获取歌曲列表，请稍后再试。",
                    "maxsongDuration": "⏱️ 歌曲持续时间超出限制，允许的单曲最大时长为 {0} 秒。",
                    "noRenderMode": "❌ 你没有勾选任何格式的歌单！请去 WebUI 渲染模式设置 勾选至少一个 renderMode",
                    "selectedNoneFallbackTip": "⚠️ 检测到未选择任何渲染模式，已自动 fallback 到 单个SVG",
                    "generatingTip": "🔄 正在生成歌单，请稍候⏳...",
                    "markdownTitle": "🎵 歌单列表",
                    "markdownSummary": "📋 共 {0} 首歌曲，显示前 {1} 首",
                }
            },
            [config.command9]: {
                description: `🌙 落月点歌（支持网易云和QQ音乐）`,
                messages: {
                    "nokeyword": `🎶 请输入歌曲的 名称 或 ID。\n➣示例：/${config.command9} 蔚蓝档案\n➣示例：/${config.command9} 2608813264`,
                    "invalidNumber": "❌ 序号输入错误，已退出歌曲选择。",
                    "waitTime": "⏰ 请在{0}秒内，\n输入歌曲对应的序号:\n➣示例：{1} 1",
                    "waitTimeInline": "⏰ 请在 {0} 秒内，\n点击对应的蓝字发送，或直接输入歌曲对应的序号\n➣示例：{1} 1",
                    "waitTimeout": "⌛ 输入超时，已取消点歌。",
                    "exitprompt": "👋 已退出歌曲选择。",
                    "exitCommandTip": "退出选择请发 [{0}] 中的任意内容",
                    "exitCommandTipMarkdownInlinePrefix": "退出选择请点",
                    "exitCommandTipMarkdownInlineSuffix": "或者发送其中的任意内容",
                    "exitCommandTipMarkdownText": "退出选择请发 @机器人 + 【{0}】 中的任意内容",
                    "somerror": "⚡ 解析歌曲详情时发生错误",
                    "songlisterror": "📋 无法获取歌曲列表，请稍后再试。",
                    "maxsongDuration": "⏱️ 歌曲持续时间超出限制，允许的单曲最大时长为 {0} 秒。",
                    "noRenderMode": "❌ 你没有勾选任何格式的歌单！请去 WebUI 渲染模式设置 勾选至少一个 renderMode",
                    "selectedNoneFallbackTip": "⚠️ 检测到未选择任何渲染模式，已自动 fallback 到 单个SVG",
                    "generatingTip": "🔄 正在生成歌单，请稍候⏳...",
                    "markdownTitle": "🎵 歌单列表",
                    "markdownSummary": "📋 共 {0} 首歌曲，显示前 {1} 首",
                }
            }
        }
    });
}

module.exports = {
    registerI18n,
};
