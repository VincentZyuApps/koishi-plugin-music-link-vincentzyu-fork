"use strict";

/**
 * SVG 渲染测试脚本
 * 用于测试 resvg SVG 渲染功能
 */

const { renderSongListSvg } = require('../lib/renderer-svg');

// 测试数据
const testSongs = [
  {
    title: '蔚蓝档案',
    artist: '小倉唯',
    album: '蔚蓝档案 OP',
    duration: 95,
    quality: 5,
    platform: 'netease',
  },
  {
    title: '千本桜',
    artist: '黒うさ P',
    album: 'VOCALOID',
    duration: 243,
    quality: 4,
    platform: 'tencent',
  },
  {
    title: 'Lemon',
    artist: '米津玄師',
    album: 'Lemon EP',
    duration: 255,
    quality: 3,
  },
  {
    title: '打上花火',
    artist: 'DAOKO/米津玄師',
    duration: 289,
  },
  {
    title: '前前前世',
    artist: 'RADWIMPS',
    album: '你的名字。OST',
    duration: 284,
    quality: 6,
    platform: 'netease',
  },
];

async function runTest() {
  console.log('🧪 开始测试 SVG 渲染...\n');

  try {
    // 测试 1: 亮色模式
    console.log('📝 测试 1: 亮色模式渲染...');
    const brightBuffer = renderSongListSvg(testSongs, {
      darkMode: false,
      themeColor: '#7e57c2',
      scale: 3.3,
    });
    console.log(`✅ 亮色模式渲染成功！图片大小：${brightBuffer.length} bytes\n`);

    // 测试 2: 暗黑模式
    console.log('🌙 测试 2: 暗黑模式渲染...');
    const darkBuffer = renderSongListSvg(testSongs, {
      darkMode: true,
      themeColor: '#7e57c2',
      scale: 3.3,
    });
    console.log(`✅ 暗黑模式渲染成功！图片大小：${darkBuffer.length} bytes\n`);

    // 测试 3: 自定义主题色
    console.log('🎨 测试 3: 自定义主题色渲染...');
    const customColorBuffer = renderSongListSvg(testSongs, {
      darkMode: false,
      themeColor: '#ff6b6b',
      scale: 3.3,
    });
    console.log(`✅ 自定义主题色渲染成功！图片大小：${customColorBuffer.length} bytes\n`);

    // 测试 4: 不同缩放比例
    console.log('🔍 测试 4: 不同缩放比例测试...');
    const scale2Buffer = renderSongListSvg(testSongs, {
      darkMode: false,
      themeColor: '#7e57c2',
      scale: 2.0,
    });
    console.log(`✅ 缩放 2.0x 渲染成功！图片大小：${scale2Buffer.length} bytes\n`);

    console.log('🎉 所有测试通过！SVG 渲染功能正常工作 ✨');
    console.log('\n💡 提示：');
    console.log('   - 默认配置：亮色模式 + Koishi 紫主题色 + 3.3x 缩放');
    console.log('   - 可以通过 config.renderMode 配置选择出图模式');
    console.log('   - 支持多选：svg, puppeteer, text');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
runTest();
