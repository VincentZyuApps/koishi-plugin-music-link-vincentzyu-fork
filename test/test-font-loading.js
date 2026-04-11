/**
 * 测试脚本：验证LXGW字体是否能正确加载并渲染
 */

const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

console.log('🧪 开始测试字体加载...\n');

// 检查字体文件是否存在
const fontPath1 = path.join(__dirname, '..', 'assets', 'LXGWWenKaiMono-Regular.ttf');
const fontPath2 = path.join(__dirname, '..', 'assets', 'SourceHanSerifSC-Medium.otf');

console.log(`📁 检查字体文件:`);
console.log(`   LXGWWenKaiMono-Regular.ttf: ${fs.existsSync(fontPath1) ? '✅ 存在' : '❌ 不存在'}`);
console.log(`   SourceHanSerifSC-Medium.otf: ${fs.existsSync(fontPath2) ? '✅ 存在' : '❌ 不存在'}\n`);

// 准备可用字体列表
const availableFonts = [fontPath1, fontPath2].filter(fp => fs.existsSync(fp));
console.log(`📋 可用字体数量: ${availableFonts.length}\n`);

// 创建简单SVG测试文本
const testSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <rect width="400" height="200" fill="#ffffff"/>
  <text x="20" y="50" font-size="24" fill="#333" font-family="LXGWWenKaiMono, sans-serif">
    霞鹜文楷测试文本
  </text>
  <text x="20" y="90" font-size="20" fill="#666" font-family="LXGWWenKaiMono, sans-serif">
    Hello World! 中文显示正常吗？
  </text>
  <text x="20" y="130" font-size="18" fill="#999" font-family="Source Han Serif SC Medium, sans-serif">
    思源宋体测试 - ABC abc 123
  </text>
  <text x="20" y="170" font-size="14" fill="#ccc" font-family="sans-serif">
    Fallback: 如果看到这段文字，说明fallback生效了
  </text>
</svg>
`.trim();

console.log('🎨 开始渲染测试图片...\n');

try {
  const startTime = Date.now();
  
  const resvg = new Resvg(testSvg, {
    fitTo: { mode: 'width', value: 400 },
    font: {
      fontFiles: availableFonts,
      loadSystemFonts: false,
      defaultFontFamily: 'LXGWWenKaiMono, Source Han Serif SC Medium, sans-serif',
    },
  });
  
  const pngData = resvg.render();
  const elapsed = Date.now() - startTime;
  
  console.log(`✅ 渲染成功！`);
  console.log(`   ⏱️  耗时: ${elapsed}ms`);
  console.log(`   📊 PNG大小: ${(pngData.asPng().byteLength / 1024).toFixed(2)} KB\n`);
  
  // 保存测试图片
  const outputPath = path.join(__dirname, 'test-output.png');
  fs.writeFileSync(outputPath, pngData.asPng());
  console.log(`💾 测试图片已保存到: ${outputPath}\n`);
  
  console.log('✨ 测试完成！请查看生成的PNG图片确认字体是否正常显示。\n');
  
} catch (error) {
  console.error('❌ 渲染失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}
