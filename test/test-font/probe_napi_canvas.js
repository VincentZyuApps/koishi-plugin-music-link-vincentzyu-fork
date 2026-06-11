"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createCanvas, GlobalFonts } = require("@napi-rs/canvas");

const testDir = __dirname;
const pluginRoot = path.resolve(testDir, "..", "..");
const assetsDir = path.join(pluginRoot, "assets");
const fontPath = path.join(assetsDir, "LXGWWenKaiMono-Regular.ttf");
const outputDir = testDir;

const familyCandidates = [
  { label: "family-en", name: "LXGW WenKai Mono" },
  { label: "family-zh", name: "霞鹜文楷等宽" },
  { label: "postscript", name: "LXGWWenKaiMono-Regular" },
  { label: "alias-short", name: "LXGWWenKaiMono" },
];

const sampleLines = [
  "中文测试：霞鹜文楷 / 星间飞行 / 青花瓷",
  "English: Hello World / ABC abc 123",
  "Symbols: ♪ QQ 网易 歌单",
];

function drawPreview(fontName, outputName) {
  const canvas = createCanvas(1400, 320);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#111111";
  ctx.textBaseline = "top";

  ctx.font = `24px "${fontName}", sans-serif`;
  ctx.fillText(`font=${fontName}`, 30, 20);

  ctx.font = `42px "${fontName}", sans-serif`;
  let y = 70;
  for (const line of sampleLines) {
    ctx.fillText(line, 30, y);
    y += 72;
  }

  const outputPath = path.join(outputDir, outputName);
  fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
  return outputPath;
}

function main() {
  console.log("fontPath:", fontPath);
  console.log("fontExists:", fs.existsSync(fontPath));
  if (!fs.existsSync(fontPath)) {
    process.exitCode = 1;
    return;
  }

  console.log("\n[before register] matching families:");
  console.log(GlobalFonts.families.filter(item => /LXGW|霞鹜|WenKai/i.test(item.family)));

  for (const item of familyCandidates) {
    try {
      const key = GlobalFonts.registerFromPath(fontPath, item.name);
      console.log(`register ${item.label}:`, key ? "OK" : "NULL", `name=${item.name}`);
    } catch (error) {
      console.log(`register ${item.label}: ERROR`, error.message);
    }
  }

  console.log("\n[after register] matching families:");
  console.log(GlobalFonts.families.filter(item => /LXGW|霞鹜|WenKai/i.test(item.family)));

  console.log("\nrender outputs:");
  for (const item of familyCandidates) {
    try {
      const outputPath = drawPreview(item.name, `probe-${item.label}.png`);
      console.log(`render ${item.label}: OK -> ${outputPath}`);
    } catch (error) {
      console.log(`render ${item.label}: ERROR`, error.message);
    }
  }

  try {
    const fallbackOutput = drawPreview("sans-serif", "probe-fallback-sans-serif.png");
    console.log(`render fallback-sans-serif: OK -> ${fallbackOutput}`);
  } catch (error) {
    console.log("render fallback-sans-serif: ERROR", error.message);
  }
}

main();
