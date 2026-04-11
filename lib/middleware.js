"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMiddleware = void 0;
const { h } = require("koishi");

/**
 * 判断是否应该解析该音乐卡片
 * @param {object} jsonData - 解析后的JSON数据
 * @param {object} config - 配置对象
 * @returns {boolean} 是否应该解析
 */
function shouldParseCard(jsonData, config) {
   const view = jsonData.view;
   
   // 如果未启用白名单，允许所有卡片
   if (!config.enableWhitelist) {
      return true;
   }
   
   // 启用白名单时，检查是否在白名单中
   if (!config.customWhitelist || config.customWhitelist.length === 0) {
      return false; // 白名单为空则拒绝
   }
   
   return config.customWhitelist.some(rule => {
      if (!rule.enabled) return false;
      
      const viewMatch = rule.viewType === '*' || rule.viewType === view;
      
      return viewMatch;
   });
}

/**
 * 注册音乐卡片中间件
 * @param {any} ctx - Koishi 上下文
 * @param {any} config - 配置对象
 * @param {any} logger - 日志对象
 * @param {Function} logInfo - 日志函数
 */
function registerMiddleware(ctx, config, logger, logInfo) {
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

            // 检查是否应该解析该卡片（白名单过滤）
            if (!shouldParseCard(jsonData, config)) {
              logInfo(`⏭️ [卡片过滤] 跳过非匹配卡片 | 🔍 view=${jsonData.view} | ️ 白名单=${config.enableWhitelist ? '已启用' : '未启用'}`);
              continue; // 跳过当前卡片，继续处理下一个元素
            }

            logInfo(`✅ [卡片解析] 检测到匹配的卡片 | 📱 app=${jsonData.app} | 👁️ view=${jsonData.view}`);

            // 检查是否存在 musicMeta 和 tag
            const musicMeta = jsonData?.meta?.music || jsonData?.meta?.news; // 尝试兼容两种结构
            const tag = musicMeta?.tag;
            if (musicMeta && tag.includes("音乐")) {

              const title = musicMeta.title;
              const desc = musicMeta.desc;
              logInfo("🎵 ↡--------------中间件解析--------------↡", null, config, logger);
			  console.log(`tmp, meta = ${JSON.stringify(musicMeta)}`)
              logInfo(`🏷️ ${tag}`, null, config, logger);
              logInfo(`🎶 ${title}`, null, config, logger);
              logInfo(`📝 ${desc}`, null, config, logger);
              logInfo("🎵 ↟--------------中间件解析--------------↟", null, config, logger);
              // 获取配置的指令名称
              let command = config.serverSelect;
              let commandName = config[command]; // 直接使用 config[command] 获取配置项的值
              logInfo(`🔧 指令名称: ${commandName}`, null, config, logger);
              if (!commandName) {
                commandName = '歌曲搜索'; // 默认值，以防配置项不存在
                logger.error(`❌ [配置错误] 未找到配置项 ${command} 对应的指令名称，使用默认指令名称 '歌曲搜索'`);
              }

              // 如果选择了 command6 并且是网易云音乐卡片
              if (command === 'command6' && tag === '网易云音乐') {
                // 直接提取歌曲 ID
                const jumpUrl = musicMeta.jumpUrl;
                const match = jumpUrl?.match(/id=(\d+)/); // 使用 ?. 确保 jumpUrl 不为 null 或 undefined
                if (match && match[1]) {
                  const songId = match[1];
                  logInfo(`🆔 提取到网易云音乐 ID: ${songId}`, null, config, logger);

                  // 执行 command6 指令
                  await session.execute(`${commandName} ${songId}`);
                  return; // 结束当前中间件处理
                } else {
                  logger.error('❌ [解析失败] 未能在 jumpUrl 中找到歌曲 ID');
                }
              } else {
                // 其他情况，按照原逻辑处理
                let usedId = config.used_id;

                if (command) {
                  // 更通用的获取指令名称方式
                  logInfo(`🎯 执行指令: ${commandName} -n ${usedId} "${title} ${desc}"`);
                  await session.execute(`${commandName} -n ${usedId} "${title} ${desc}"`);
                }
              }
            }
          }
        }
      } catch (error) {
        ctx.logger.error(`❌ [中间件异常] ${error.message}`);
        await session.send('处理消息时出错。');
      }
      // 如果没有匹配到任何 json 数据，继续下一个中间件
      return next();
    }, config.enablePrependMiddleware);
  }
}

exports.registerMiddleware = registerMiddleware;
