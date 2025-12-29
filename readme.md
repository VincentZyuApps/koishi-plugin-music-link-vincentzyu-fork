# koishi-plugin-music-link-vincentzyu-fork

[![npm](https://img.shields.io/npm/v/koishi-plugin-music-link-vincentzyu-fork?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-music-link-vincentzyu-fork)
[![npm-download](https://img.shields.io/npm/dm/koishi-plugin-music-link-vincentzyu-fork?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-music-link-vincentzyu-fork)


## 原始仓库：
https://github.com/shangxueink/koishi-shangxue-apps/tree/main/plugins/music-link 
> (66原作者怎么删了)

## fork此插件时候 上游仓库版本号:
1.7.30

## 效果预览

![https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/example_image/songlist_example_source.png](https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/example_image/songlist_example_source.png)
![https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/example_image/songlist_example_flat.png](https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/example_image/songlist_example_flat.png)
![https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/example_image/onebot_example.png](https://gitee.com/vincent-zyu/koishi-plugin-music-link-vincentzyu-fork/releases/download/example_image/onebot_example.png)

## fork版本的更新日志

- **1.8.0-beta1-20251218**
  - 落月api新增自定义url
  - 换一个版本号方式，之前的太奇怪了((

- **1.7.31-vincentzyu.v6+20251027**
  - 支持发送onebot音乐卡片
  - 新增落月apiV2， powered by `api.vkeys.cn`，支持qq音乐、网易云 以及 二者聚合

- **1.7.31-vincentzyu.v7+20251028**
  - 新增html渲染模板：FLAT_MODERN
  - 支持自定义字体，在配置项中填入字体路径即可
  - 更新readme.md

- **1.7.31-vincentzyu.v4+20250923**
  - 到目前为止，fork以后的所有改动:
    - 只保留command6和8，其他全删了，因为貌似apiG了((
    - 提供两种渲染图片样式

- **前面的版本号**
  - 忘了
    - 反正你看到的features都是上游作者和我前面更新的(

-----
# 以下是修改过的部分的原始仓库的readme
# koishi-plugin-music-link

🎵 **音乐下载** - 搜索并提供QQ音乐和网易云音乐平台的歌曲下载链接，🤩付费的也可以欸！？

## 特点

- **搜索歌曲**：🤩 支持QQ音乐和网易云音乐平台的歌曲搜索。
- **下载歌曲**：🎶 QQ平台支持以不同音质下载歌曲，满足不同的音乐体验需求。提供免费以及付费音乐的下载链接。
- **歌曲详情**：🎧 获取包括音质、大小和下载链接在内的歌曲详细信息。
- **友好交互**：📱 简单易用的指令，快速获取你喜欢的音乐。

## 安装

在koishi插件市场 搜索并安装`music-link-vincentzyu-fork`
或者
在koishi依赖管理 右上角加号 搜索`koishi-plugin-music-link-vincentzyu-fork`
或者
`cd到你koishi的根目录` 然后 `npm install koishi-plugin-music-link-vincentzyu-fork`
或者
`cd到你koishi的根目录` 然后 `yarn add koishi-plugin-music-link-vincentzyu-fork`

---

## 📖 使用方法

安装并配置插件后，使用下述命令搜索和下载音乐：
> 指令名是可以改的，下面展示的`网易点歌`和`落月点歌`都是默认值捏

### 🎵 网易点歌 (command6)
```
网易点歌 [歌曲名称/歌曲ID]
```

**后端选择：**
- **`api.injahow.cn`** (默认 - 稳定推荐)
  - ✅ API请求快速且稳定，无需 puppeteer 服务
  - ✅ 推荐QQ官方机器人使用
  - ⚠️ VIP歌曲只能听45秒（黑胶限制）
  - 🎯 **仅支持网易云音乐**

- **`api.qijieya.cn`** (推荐 - 完整版)
  - ✅ 稳定性未知，但支持全部可听
  - ✅ 无VIP限制，完整歌曲
  - 🎯 **仅支持网易云音乐**

- **`meting.jmstrand.cn`** (可选)
  - ✅ 稳定性未知，全部可听
  - 🎯 **仅支持网易云音乐**

- **`metingapi.nanorocky.top`** (不推荐)
  - ✅ 无损音质，全部可听
  - ⚠️ 文件很大，下载慢
  - 🎯 **仅支持网易云音乐**

### 🎶 落月点歌 (command9)
```
落月点歌 [歌曲名称]
```

**后端选择：**
- **`api.vkeys.cn/v2`** (落月api官方)
  - ✅ 支持**网易云 + QQ音乐**
  - ✅ 支持多音质选择（64k - Master母带）
  - ✅ 支持聚合搜索（双平台同时搜索）
  - 🎯 **网易云最高支持：超清母带 (Master)**
  - 🎯 **QQ音乐最高支持：臻品母带2.0**

- **`http://xwl.vincentzyu233.cn:51217`** (作者自建)
  - ✅ 与官方API功能相同
  - ⚠️ 如果挂了可以去QQ群：259248174 叫我

**落月api音质等级说明：**

| 平台 | 音质选项 | 码率/格式 |
|:---|:---|:---|
| 网易云 | 标准 | 64k / 128k |
| 网易云 | HQ极高 | 192k / 320k |
| 网易云 | SQ无损 | FLAC |
| 网易云 | Hi-Res | 高解析度无损 |
| 网易云 | Spatial Audio | 高清臻音 |
| 网易云 | Master | 超清母带 |
| QQ音乐 | 标准/HQ | 标准/高音质 |
| QQ音乐 | SQ无损 | 无损音质 |
| QQ音乐 | Hi-Res | Hi-Res音质 |
| QQ音乐 | 杜比全景声 | Dolby Atmos |
| QQ音乐 | 臻品母带2.0 | Master 2.0 |

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

<h3>使用 <code>-n 数字</code> 直接返回内容</h3>
<p>在使用命令时，可以通过添加 <code>-n 数字</code> 选项直接返回指定序号的歌曲内容。这对于快速获取特定歌曲非常有用。</p>
<p>例如，使用以下命令可以直接获取第一首歌曲的详细信息：</p>
<pre><code>歌曲搜索 -n 1 蔚蓝档案</code></pre>


---


## 免责声明

1. **数据来源**：
   - 本插件调用了第三方网站（如 `music.gdstudio.xyz`）的接口来获取音乐资源。插件开发者不对这些第三方网站的内容、合法性或安全性负责。
   - 用户在使用本插件时，应自行承担因使用第三方服务而产生的任何风险。

2. **版权声明**：
   - 本插件提供的音乐资源可能受版权保护。用户应确保在使用这些资源时遵守相关法律法规。
   - 插件开发者不鼓励或支持任何侵犯版权的行为。用户应仅下载和使用已获得合法授权的音乐资源。

3. **插件用途**：
   - 本插件仅供学习和研究使用，禁止用于任何商业用途。
   - 插件开发者不对用户因使用本插件而产生的任何法律问题负责。

4. **服务稳定性**：
   - 由于依赖第三方服务，插件的功能可能会因第三方服务的变更或不可用而受到影响。
   - 插件开发者不保证插件的持续可用性或稳定性。

5. **用户责任**：
   - 用户在使用本插件时，应遵守相关法律法规和平台规定。
   - 如因用户不当使用本插件而导致任何问题，插件开发者不承担任何责任。

---



### 上游仓库的更新日志

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