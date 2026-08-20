const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');

function readBuildFile(relativePath) {
  const absolutePath = path.join(distDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`缺少构建产物：dist/${relativePath}`);
  }
  const content = fs.readFileSync(absolutePath);
  if (content.length === 0) {
    throw new Error(`构建产物为空：dist/${relativePath}`);
  }
  return content;
}

const miniGameBundle = readBuildFile('game.js');
const webBundle = readBuildFile('game.web.js');
const previewHtml = readBuildFile('index.html').toString('utf8');
const gameConfig = JSON.parse(readBuildFile('game.json').toString('utf8'));
readBuildFile(path.join('assets', 'ui', '战斗背景_森林.png'));

if (miniGameBundle.equals(webBundle)) {
  throw new Error('微信小游戏与浏览器构建产物不应完全相同');
}
if (!previewHtml.includes('src="./game.web.js"')) {
  throw new Error('预览页面没有引用浏览器构建入口 game.web.js');
}
if (previewHtml.includes('/src/main.ts')) {
  throw new Error('预览页面仍然引用 TypeScript 源码入口');
}
if (gameConfig.deviceOrientation !== 'portrait') {
  throw new Error('game.json 未保留竖屏小游戏配置');
}

console.log('构建产物验证通过');
