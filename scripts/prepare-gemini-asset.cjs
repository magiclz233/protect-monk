/**
 * 将 Gemini 单资产原图处理成游戏可直接加载的 PNG。
 * 功能：移除连通色键背景、清理边缘、裁边、缩放、脚点对齐。
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const PRESETS = {
  soldier: { width: 80, height: 80, dir: 'soldiers', layout: 'character' },
  hero: { width: 96, height: 96, dir: 'heroes', layout: 'character' },
  shard: { width: 96, height: 96, dir: 'heroes', layout: 'icon' },
  monk: { width: 135, height: 135, dir: 'heroes', layout: 'character' },
  enemy: { width: 80, height: 80, dir: 'enemies', layout: 'character' },
  elite: { width: 96, height: 96, dir: 'enemies', layout: 'character' },
  boss: { width: 128, height: 128, dir: 'enemies', layout: 'character' },
  item: { width: 128, height: 128, dir: 'items', layout: 'icon' },
  artifact: { width: 128, height: 128, dir: 'artifacts', layout: 'icon' },
  ui: { width: 64, height: 64, dir: 'ui', layout: 'icon' },
  lock: { width: 80, height: 80, dir: 'ui', layout: 'icon' },
  background: { width: 750, height: 1334, dir: 'ui', layout: 'background' },
};

function fail(message) {
  console.error(`失败：${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const input = argv[0];
  if (!input || input.startsWith('--')) {
    fail('用法：node scripts/prepare-gemini-asset.cjs <原图> --type hero --name 孙悟空_1阶 [--force]');
  }

  const options = { input, footpoint: 0.78, force: false };
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--force') {
      options.force = true;
      continue;
    }
    const value = argv[++i];
    if (!value) fail(`${arg} 缺少参数`);
    if (arg === '--type') options.type = value;
    else if (arg === '--name') options.name = value;
    else if (arg === '--out') options.out = value;
    else if (arg === '--footpoint') options.footpoint = Number(value);
    else fail(`未知参数：${arg}`);
  }
  return options;
}

function isChroma(r, g, b, key) {
  if (key === 'green') return g > r + 20 && g > b + 20;
  return r > g + 20 && b > g + 20;
}

function detectChroma(data, width, height) {
  let greenVotes = 0;
  let magentaVotes = 0;
  const points = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
  ];
  for (const [x, y] of points) {
    const i = (y * width + x) * 4;
    if (isChroma(data[i], data[i + 1], data[i + 2], 'green')) greenVotes++;
    if (isChroma(data[i], data[i + 1], data[i + 2], 'magenta')) magentaVotes++;
  }
  if (greenVotes >= 3) return 'green';
  if (magentaVotes >= 3) return 'magenta';
  fail('四角不是可识别的绿色或洋红色背景');
}

function sampleKeyColor(data, width, height) {
  const points = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
  ];
  const color = { r: 0, g: 0, b: 0 };
  for (const [x, y] of points) {
    const i = (y * width + x) * 4;
    color.r += data[i];
    color.g += data[i + 1];
    color.b += data[i + 2];
  }
  color.r = Math.round(color.r / points.length);
  color.g = Math.round(color.g / points.length);
  color.b = Math.round(color.b / points.length);
  return color;
}

function keyDistanceSq(r, g, b, keyColor) {
  const dr = r - keyColor.r;
  const dg = g - keyColor.g;
  const db = b - keyColor.b;
  return dr * dr + dg * dg + db * db;
}

function isBackgroundKey(r, g, b, key, keyColor) {
  if (keyDistanceSq(r, g, b, keyColor) > 110 * 110) return false;
  if (key === 'green') return g > r + 8 && g > b + 8;
  return r > g + 8 && b > g + 8;
}

function removeConnectedChroma(data, width, height, key, keyColor) {
  const total = width * height;
  const removed = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  function enqueue(index) {
    if (removed[index]) return;
    const i = index * 4;
    if (!isBackgroundKey(data[i], data[i + 1], data[i + 2], key, keyColor)) return;
    removed[index] = 1;
    queue[tail++] = index;
  }

  for (let x = 0; x < width; x++) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }

  // 只清除与键色接近的封闭空隙，保留叶子、护甲等深色主体内容。
  for (let index = 0; index < total; index++) {
    const i = index * 4;
    if (isBackgroundKey(data[i], data[i + 1], data[i + 2], key, keyColor)) removed[index] = 1;
    if (removed[index]) data[i + 3] = 0;
  }

  // 色键边缘去污染，避免缩小后出现一圈绿边或洋红边。
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      if (removed[index]) continue;
      const nearRemoved =
        removed[index - 1] || removed[index + 1] ||
        removed[index - width] || removed[index + width];
      if (!nearRemoved) continue;

      const i = index * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (key === 'green' && g > Math.max(r, b)) {
        data[i + 1] = Math.max(r, b);
      } else if (key === 'magenta' && g < Math.min(r, b)) {
        const neutral = Math.round((r + b) / 2);
        data[i] = neutral;
        data[i + 1] = neutral;
        data[i + 2] = neutral;
      }
    }
  }

  let removedCount = 0;
  for (let index = 0; index < total; index++) removedCount += removed[index];
  return removedCount;
}

function alphaBounds(data, width, height) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] <= 8) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) fail('处理后的图片没有可见主体');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function sanitizeFinalEdges(data, width, height, key, keyColor) {
  let cleared = 0;
  let decontaminated = 0;
  const total = width * height;

  for (let index = 0; index < total; index++) {
    const i = index * 4;
    const alpha = data[i + 3];
    if (alpha <= 8) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
      cleared++;
      continue;
    }

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (
      alpha < 192 &&
      keyDistanceSq(r, g, b, keyColor) < 140 * 140 &&
      ((key === 'green' && g > r && g > b) || (key === 'magenta' && r > g && b > g))
    ) {
      if (key === 'green') {
        data[i + 1] = Math.max(r, b);
      } else {
        const neutral = Math.round((r + b) / 2);
        data[i] = neutral;
        data[i + 1] = neutral;
        data[i + 2] = neutral;
      }
      decontaminated++;
    }
  }

  return { cleared, decontaminated };
}

function validateCharacterLayout(data, width, height, footpoint) {
  const bounds = alphaBounds(data, width, height);
  const bottom = bounds.top + bounds.height;
  const expected = height * footpoint;
  if (Math.abs(bottom - expected) > 1) {
    fail(`脚点校验失败：实际 ${((bottom / height) * 100).toFixed(1)}%，目标 ${(footpoint * 100).toFixed(1)}%`);
  }
  return bounds;
}

function normalizeName(name) {
  return path.basename(name, path.extname(name));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const preset = PRESETS[options.type];
  if (!preset) fail(`未知类型：${options.type || '未提供'}`);
  if (!options.name) fail('缺少 --name');
  if (!Number.isFinite(options.footpoint) || options.footpoint <= 0.5 || options.footpoint >= 0.95) {
    fail('--footpoint 必须在 0.5 到 0.95 之间');
  }

  const inputPath = path.resolve(options.input);
  if (!fs.existsSync(inputPath)) fail(`找不到原图：${inputPath}`);
  const name = normalizeName(options.name);
  const outputPath = path.resolve(
    options.out || path.join(ROOT, 'public', 'assets', preset.dir, `${name}.png`),
  );
  if (fs.existsSync(outputPath) && !options.force) {
    fail(`输出已存在：${outputPath}。确认替换请加 --force`);
  }

  const { data, info } = await sharp(inputPath)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 4) fail(`不支持的通道数：${info.channels}`);
  const { width, height } = info;

  if (preset.layout === 'background') {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    await sharp(inputPath)
      .rotate()
      .resize(preset.width, preset.height, { fit: 'cover', position: 'centre' })
      .png({ compressionLevel: 9 })
      .toFile(outputPath);
    console.log(`完成：${outputPath} (${preset.width}×${preset.height})`);
    return;
  }

  const chroma = detectChroma(data, width, height);
  const keyColor = sampleKeyColor(data, width, height);
  const removed = removeConnectedChroma(data, width, height, chroma, keyColor);
  const bounds = alphaBounds(data, width, height);

  const cleanedPath = path.join(ROOT, 'art-source', 'cleaned', `${name}.png`);
  fs.mkdirSync(path.dirname(cleanedPath), { recursive: true });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const cleanedBuffer = await sharp(data, { raw: { width, height, channels: 4 } })
    .extract(bounds)
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(cleanedPath, cleanedBuffer);

  const maxWidth = preset.width * (preset.layout === 'character' ? 0.9 : 0.82);
  const maxHeight = preset.height * (
    preset.layout === 'character' ? options.footpoint - 0.05 : 0.82
  );
  const scale = Math.min(maxWidth / bounds.width, maxHeight / bounds.height);
  const resizedWidth = Math.max(1, Math.round(bounds.width * scale));
  const resizedHeight = Math.max(1, Math.round(bounds.height * scale));
  const resized = await sharp(cleanedBuffer)
    .resize(resizedWidth, resizedHeight, { kernel: 'lanczos3' })
    .png()
    .toBuffer();

  const left = Math.round((preset.width - resizedWidth) / 2);
  const top = preset.layout === 'character'
    ? Math.round(preset.height * options.footpoint) - resizedHeight
    : Math.round((preset.height - resizedHeight) / 2);

  const composed = await sharp({
    create: {
      width: preset.width,
      height: preset.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left, top }])
    .raw()
    .toBuffer({ resolveWithObject: true });

  const edgeCleanup = sanitizeFinalEdges(
    composed.data,
    preset.width,
    preset.height,
    chroma,
    keyColor,
  );
  if (preset.layout === 'character') {
    validateCharacterLayout(composed.data, preset.width, preset.height, options.footpoint);
  }

  await sharp(composed.data, {
    raw: { width: preset.width, height: preset.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  const ratio = ((removed / (width * height)) * 100).toFixed(1);
  console.log(`色键：${chroma}，移除 ${ratio}%`);
  console.log(`边缘清理：透明 ${edgeCleanup.cleared} 像素，去色 ${edgeCleanup.decontaminated} 像素`);
  console.log(`中间图：${cleanedPath}`);
  console.log(`完成：${outputPath} (${preset.width}×${preset.height})`);
}

main().catch((error) => fail(error.message));
