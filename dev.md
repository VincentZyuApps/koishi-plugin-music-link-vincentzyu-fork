```shell
cd G:\GGames\Minecraft\shuyeyun\qq-bot\koishi-dev\koishi-dev-3

$Env:HTTP_PROXY = "http://127.0.0.1:7890"
$Env:HTTPS_PROXY = "http://127.0.0.1:7890"
Invoke-WebRequest -Uri "https://www.google.com" -Method Head -UseBasicParsing
npm login --registry https://registry.npmjs.org
# 在浏览器里面登录npm，去邮件里面收验证码

npm run pub music-link-vincentzyu-fork -- --registry https://registry.npmjs.org
npm dist-tag add koishi-plugin-music-link-vincentzyu-fork@1.8.0-beta5-20251230 latest --registry https://registry.npmjs.org
npm view koishi-plugin-music-link-vincentzyu-fork
```