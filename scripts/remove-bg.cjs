/**
 * 批量去除素材背景色
 * 检测四角颜色 → 将匹配的背景色像素替换为透明
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'public', 'assets');
const TOLERANCE = 50;   // 与背景色距离 < 此值 → 透明
const FEATHER = 20;      // 羽化过渡范围

function collectPngs(dir) {
  const files = [];
  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const fp = path.join(d, e.name);
      if (e.isDirectory()) walk(fp);
      else if (e.name.endsWith('.png')) files.push(fp);
    }
  }
  walk(dir);
  return files;
}

function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

async function processImage(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels: ch } = info;
  const totalPx = width * height;

  // 采样四角 (3x3 均值)
  function cornerAvg(cx, cy) {
    let sr = 0, sg = 0, sb = 0, sa = 0, n = 0;
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        const x = Math.max(0, Math.min(width - 1, cx + dx));
        const y = Math.max(0, Math.min(height - 1, cy + dy));
        const i = (y * width + x) * ch;
        sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; sa += data[i + 3];
        n++;
      }
    }
    return { r: Math.round(sr / n), g: Math.round(sg / n), b: Math.round(sb / n), a: Math.round(sa / n) };
  }

  const c = [
    cornerAvg(0, 0),
    cornerAvg(width - 4, 0),
    cornerAvg(0, height - 4),
    cornerAvg(width - 4, height - 4),
  ];

  // 如果四角都已经透明 → 跳过
  const avgAlpha = c.reduce((s, x) => s + x.a, 0) / 4;
  if (avgAlpha < 30) return null;

  // 四角颜色一致性检查
  const bgR = Math.round(c.reduce((s, x) => s + x.r, 0) / 4);
  const bgG = Math.round(c.reduce((s, x) => s + x.g, 0) / 4);
  const bgB = Math.round(c.reduce((s, x) => s + x.b, 0) / 4);

  const maxCornerDiff = Math.max(...c.map(x => colorDist(x.r, x.g, x.b, bgR, bgG, bgB)));
  if (maxCornerDiff > 55) {
    return { skipped: true, reason: `四角色差过大 (${maxCornerDiff.toFixed(0)})` };
  }

  // 去除背景
  let removed = 0;
  for (let i = 0; i < data.length; i += ch) {
    const d = colorDist(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB);
    if (d < TOLERANCE) {
      data[i + 3] = 0;
      removed++;
    } else if (d < TOLERANCE + FEATHER) {
      data[i + 3] = Math.round((d - TOLERANCE) / FEATHER * 255);
      removed++;
    }
  }

  const ratio = (removed / totalPx * 100).toFixed(1);
  return { data, width, height, bgR, bgG, bgB, ratio };
}

async function main() {
  const files = collectPngs(ASSETS_DIR);
  console.log(`扫描到 ${files.length} 个 PNG\n`);

  let ok = 0, skip = 0, err = 0;

  for (const fp of files) {
    const rel = path.relative(ASSETS_DIR, fp);
    try {
      const result = await processImage(fp);

      if (result === null) {
        // 已透明，跳过
        continue;
      }
      if (result.skipped) {
        console.log(`⊘ ${rel.padEnd(44)} ${result.reason}`);
        skip++;
        continue;
      }

      // 写回
      const outBuf = await sharp(Buffer.from(result.data), {
        raw: { width: result.width, height: result.height, channels: 4 },
      }).png().toBuffer();

      fs.writeFileSync(fp, outBuf);
      console.log(`✓ ${rel.padEnd(44)} 背景RGB(${result.bgR},${result.bgG},${result.bgB})  去除${result.ratio}%`);
      ok++;
    } catch (e) {
      console.log(`✗ ${rel}  - ${e.message}`);
      err++;
    }
  }

  console.log(`\n完成: ${ok} 去背景, ${skip} 跳过, ${err} 失败`);
}

main().catch(console.error);
