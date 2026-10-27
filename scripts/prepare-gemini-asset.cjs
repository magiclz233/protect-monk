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
    fail('用法：node scripts/prepare-gemini-asset.cjs <原图> --type hero --name 孙悟空_1阶 [--force] [--bg auto|checker|none] [--crop x,y,w,h] [--keep-largest]');
  }

  const options = { input, footpoint: 0.78, force: false, bg: 'chroma', crop: null, keepLargest: false };
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--force') {
      options.force = true;
      continue;
    }
    if (arg === '--keep-largest') {
      options.keepLargest = true;
      continue;
    }
    const value = argv[++i];
    if (!value) fail(`${arg} 缺少参数`);
    if (arg === '--type') options.type = value;
    else if (arg === '--name') options.name = value;
    else if (arg === '--out') options.out = value;
    else if (arg === '--footpoint') options.footpoint = Number(value);
    else if (arg === '--bg') options.bg = value;
    else if (arg === '--crop') {
      const parts = value.split(',').map(Number);
      if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) fail('--crop 需要 x,y,w,h');
      options.crop = { left: parts[0], top: parts[1], width: parts[2], height: parts[3] };
    }
    else fail(`未知参数：${arg}`);
  }
  if (!['chroma', 'auto', 'checker', 'none'].includes(options.bg)) {
    fail('--bg 只支持 chroma / auto / checker / none');
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

function alphaBounds(data, width, height) {  let left = width;
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

/** 从边框采样背景色，取出现次数最多的几种，用于棋盘格、纯白底和平灰底 */
function collectBorderSeeds(data, width, height) {
  const buckets = new Map();
  const ring = 3;
  const add = (index) => {
    const i = index * 4;
    if (data[i + 3] <= 8) return;
    const key = `${data[i] >> 3},${data[i + 1] >> 3},${data[i + 2] >> 3}`;
    const entry = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    entry.r += data[i]; entry.g += data[i + 1]; entry.b += data[i + 2]; entry.n++;
    buckets.set(key, entry);
  };
  for (let x = 0; x < width; x++) {
    for (let m = 0; m < ring; m++) {
      add(m * width + x);
      add((height - 1 - m) * width + x);
    }
  }
  for (let y = 0; y < height; y++) {
    for (let m = 0; m < ring; m++) {
      add(y * width + m);
      add(y * width + (width - 1 - m));
    }
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).slice(0, 3);
  return sorted.map((e) => ({ r: Math.round(e.r / e.n), g: Math.round(e.g / e.n), b: Math.round(e.b / e.n) }));
}

function nearestSeedDistance(r, g, b, seeds) {
  let best = Infinity;
  for (const s of seeds) {
    const dr = r - s.r, dg = g - s.g, db = b - s.b;
    const d = dr * dr + dg * dg + db * db;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/**
 * 边框泛洪剥背景：只吃与四周连通的背景色，主体内部同色像素不受影响。
 * 不做色调替换，抗锯齿边缘用软 alpha 收尾。
 * relaxAchromatic 只给棋盘格用：两档灰之间色差大，不放宽泛洪会被格子卡住；
 * 平灰底和纯白底必须关掉，否则银白、浅灰主体也会被吃掉。
 */
function removeBorderBackground(data, width, height, seeds, tolerance, relaxAchromatic) {
  const total = width * height;
  const removed = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0, tail = 0;
  const isAchromatic = (r, g, b) =>
    Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b)) <= 14;
  const isBg = (r, g, b) => {
    const d = nearestSeedDistance(r, g, b, seeds);
    if (d <= tolerance) return true;
    return relaxAchromatic && isAchromatic(r, g, b) && d <= tolerance * 2.8;
  };
  const tryPush = (index) => {
    if (removed[index]) return;
    const i = index * 4;
    if (!isBg(data[i], data[i + 1], data[i + 2])) return;
    removed[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) { tryPush(x); tryPush((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y++) { tryPush(y * width); tryPush(y * width + width - 1); }
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) tryPush(index - 1);
    if (x + 1 < width) tryPush(index + 1);
    if (y > 0) tryPush(index - width);
    if (y + 1 < height) tryPush(index + width);
  }

  let removedCount = 0;
  for (let index = 0; index < total; index++) {
    if (removed[index]) { data[index * 4 + 3] = 0; removedCount++; }
  }

  // 软边：紧贴空白的像素按“离背景色多远”折算 alpha，去掉一圈灰/白硬边
  const softTargets = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const i = index * 4;
      if (removed[index] || data[i + 3] <= 8) continue;
      const touches =
        (x > 0 && removed[index - 1]) ||
        (x + 1 < width && removed[index + 1]) ||
        (y > 0 && removed[index - width]) ||
        (y + 1 < height && removed[index + width]);
      if (!touches) continue;
      const d = nearestSeedDistance(data[i], data[i + 1], data[i + 2], seeds);
      if (d >= tolerance * 2.2) continue;
      const ratio = Math.max(0, Math.min(1, (d - tolerance * 0.7) / (tolerance * 1.5)));
      softTargets.push([i, ratio]);
    }
  }
  let softened = 0;
  for (const [i, ratio] of softTargets) {
    data[i + 3] = Math.round(data[i + 3] * ratio);
    if (ratio === 0) softened++;
  }
  return { removed: removedCount, softened };
}

/**
 * 丢掉细碎残片：切母图时用来清掉相邻格子的边角和标签碎片。
 * 只删小于“最大块 1%”的连通块，装饰性的小星星、火花不会被误删。
 */
function dropSpecks(data, width, height, ratio = 0.01) {
  const total = width * height;
  const seen = new Uint8Array(total);
  const blobs = [];
  for (let start = 0; start < total; start++) {
    if (seen[start] || data[start * 4 + 3] <= 8) continue;
    const pixels = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const cur = stack.pop();
      pixels.push(cur);
      const cx = cur % width;
      const cy = (cur - cx) / width;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const n = ny * width + nx;
        if (seen[n] || data[n * 4 + 3] <= 8) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    blobs.push(pixels);
  }
  if (blobs.length <= 1) return 0;
  const largest = Math.max(...blobs.map((b) => b.length));
  const threshold = Math.max(12, largest * ratio);
  let cleared = 0;
  for (const pixels of blobs) {
    if (pixels.length >= threshold) continue;
    for (const p of pixels) {
      if (data[p * 4 + 3] > 0) { data[p * 4 + 3] = 0; cleared++; }
    }
  }
  return cleared;
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

  const cropped = options.crop
    ? sharp(inputPath).rotate().extract(options.crop)
    : sharp(inputPath).rotate();

  const { data, info } = await cropped
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 4) fail(`不支持的通道数：${info.channels}`);
  const { width, height } = info;

  if (preset.layout === 'background') {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    await (options.crop ? sharp(inputPath).rotate().extract(options.crop) : sharp(inputPath).rotate())
      .resize(preset.width, preset.height, { fit: 'cover', position: 'centre' })
      .png({ compressionLevel: 9 })
      .toFile(outputPath);
    console.log(`完成：${outputPath} (${preset.width}×${preset.height})`);
    return;
  }

  let removed = 0;
  let chroma = null;
  let keyColor = null;
  let softened = 0;

  if (options.bg === 'none') {
    console.log('背景：跳过抠图（原图已带 alpha）');
  } else if (options.bg === 'auto' || options.bg === 'checker') {
    const seeds = collectBorderSeeds(data, width, height);
    if (!seeds.length) fail('四边取不到背景色');
    const tolerance = 26;
    const relax = options.bg === 'checker';
    const result = removeBorderBackground(data, width, height, seeds, tolerance, relax);
    removed = result.removed;
    softened = result.softened;
    console.log(`背景：${options.bg}，边框采样 ${seeds.map((s) => `${s.r},${s.g},${s.b}`).join(' | ')}，容差 ${tolerance}`);
  } else {
    chroma = detectChroma(data, width, height);
    keyColor = sampleKeyColor(data, width, height);
    removed = removeConnectedChroma(data, width, height, chroma, keyColor);
  }

  if (options.keepLargest) {
    const cleared = dropSpecks(data, width, height);
    console.log(`碎片清理：丢弃非主体像素 ${cleared} 个`);
  }

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

  const edgeCleanup = chroma
    ? sanitizeFinalEdges(composed.data, preset.width, preset.height, chroma, keyColor)
    : { cleared: 0, decontaminated: 0 };
  if (preset.layout === 'character') {
    validateCharacterLayout(composed.data, preset.width, preset.height, options.footpoint);
  }

  await sharp(composed.data, {
    raw: { width: preset.width, height: preset.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  const ratio = ((removed / (width * height)) * 100).toFixed(1);
  if (chroma) {
    console.log(`色键：${chroma}，移除 ${ratio}%`);
    console.log(`边缘清理：透明 ${edgeCleanup.cleared} 像素，去色 ${edgeCleanup.decontaminated} 像素`);
  } else {
    console.log(`背景移除：${ratio}%，软边 ${softened} 像素`);
  }
  console.log(`中间图：${cleanedPath}`);
  console.log(`完成：${outputPath} (${preset.width}×${preset.height})`);
}

main().catch((error) => fail(error.message));
