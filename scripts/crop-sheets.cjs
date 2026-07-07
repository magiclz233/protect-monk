/**
 * 把 image/ 下的 sprite sheet 裁切成单张 PNG
 * 用法: node scripts/crop-sheets.js
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IMAGE_DIR = path.join(__dirname, '..', 'image');
const OUT_BASE = path.join(__dirname, '..', 'public', 'assets');

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 裁切 + 缩放到目标尺寸，保持透明背景
async function cropAndResize(inputFile, outPath, x, y, w, h, outW, outH) {
  const inputPath = path.join(IMAGE_DIR, inputFile);
  if (!fs.existsSync(inputPath)) {
    console.log(`  ⚠ 跳过：文件不存在 ${inputPath}`);
    return false;
  }
  try {
    await sharp(inputPath)
      .extract({ left: Math.round(x), top: Math.round(y), width: Math.round(w), height: Math.round(h) })
      .resize(outW, outH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);
    return true;
  } catch (e) {
    console.log(`  ✗ 裁切失败 ${outPath}: ${e.message}`);
    return false;
  }
}

// 简单缩放（用于单张图或背景）
async function justResize(inputFile, outPath, outW, outH, fit = 'contain') {
  const inputPath = path.join(IMAGE_DIR, inputFile);
  if (!fs.existsSync(inputPath)) {
    console.log(`  ⚠ 跳过：文件不存在 ${inputPath}`);
    return;
  }
  ensureDir(path.dirname(outPath));
  await sharp(inputPath)
    .resize(outW, outH, { fit, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
  console.log(`  ✓ ${path.basename(outPath)}`);
}

// ============================================================
// 各 sheet 裁切定义
// ============================================================

const tasks = [];

// ─── 1. 小兵静态 (一到五级小兵.png) — 4行5列 ───
// 注意：这张图 alpha:false，但先裁出来看看
{
  const input = '一到五级小兵.png';
  const meta = { cols: 5, rows: 4, outW: 80, outH: 80 };
  const types = ['monkey', 'soldier', 'rider', 'archer'];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      tasks.push({
        input, meta,
        outDir: 'soldiers',
        outName: `soldier_${types[row]}_rank_${col + 1}.png`,
        col, row,
        note: !true, // 之后改成 true 表示有 alpha
      });
    }
  }
}

// ─── 2. MVP 英雄 stage_1 (七个主要英雄.png) — 7列横排 ───
{
  const input = '七个主要英雄.png';
  const names = ['sunwukong', 'zhubajie', 'shawujing', 'bailongma', 'guanyin', 'honghaier', 'nezha'];
  const meta = { cols: 7, rows: 1, outW: 96, outH: 96 };
  for (let i = 0; i < 7; i++) {
    tasks.push({
      input, meta,
      outDir: 'heroes',
      outName: `hero_${names[i]}_stage_1.png`,
      col: i, row: 0,
    });
  }
}

// ─── 3. 唐僧 (唐僧.png) — 单张 ───
{
  tasks.push({
    input: '唐僧.png',
    meta: { cols: 1, rows: 1, outW: 96, outH: 96 },
    outDir: 'heroes',
    outName: 'tangmonk_idle.png',
    col: 0, row: 0,
  });
}

// ─── 4. 普通敌人 (10个小怪.png) — 10列横排 ───
{
  const input = '10个小怪.png';
  const meta = { cols: 10, rows: 1, outW: 80, outH: 80 };
  for (let i = 0; i < 10; i++) {
    tasks.push({
      input, meta,
      outDir: 'enemies',
      outName: `enemy_xiaoyao_${i + 1}.png`,
      col: i, row: 0,
    });
  }
}

// ─── 5. 精英敌人 (四个小boss.png) — 4列横排 ───
{
  const input = '四个小boss.png';
  const names = ['huangfeng', 'huli', 'kuangtou', 'dapeng'];
  const meta = { cols: 4, rows: 1, outW: 96, outH: 96 };
  for (let i = 0; i < 4; i++) {
    tasks.push({
      input, meta,
      outDir: 'enemies',
      outName: `enemy_elite_${names[i]}.png`,
      col: i, row: 0,
    });
  }
}

// ─── 6. BOSS (七个boss.png) — 7列横排 ───
{
  const input = '七个boss.png';
  const names = ['heixiongjing', 'jinjiao', 'honghaier', 'baigufuren', 'qingshi', 'baixiang', 'dapengjinchi'];
  const meta = { cols: 7, rows: 1, outW: 128, outH: 128 };
  for (let i = 0; i < 7; i++) {
    tasks.push({
      input, meta,
      outDir: 'enemies',
      outName: `enemy_boss_${names[i]}.png`,
      col: i, row: 0,
    });
  }
}

// ─── 7. 英雄碎片 (英雄碎片.png) — 14列横排 ───
// 注意：alpha:false
{
  const input = '英雄碎片.png';
  const names = ['sunwukong', 'zhubajie', 'shawujing', 'bailongma', 'guanyin', 'honghaier', 'nezha',
                 'niumowang', 'erlangshen', 'taishanglaojun', 'heixiongjing', 'baigufuren', 'zhizhujing', 'tuotatianwang'];
  const meta = { cols: 14, rows: 1, outW: 96, outH: 96 };
  for (let i = 0; i < 14; i++) {
    tasks.push({
      input, meta,
      outDir: 'heroes',
      outName: `shard_${names[i]}.png`,
      col: i, row: 0,
    });
  }
}

// ─── 8. 法宝图标 (12个法宝.png) — 12列横排 ───
{
  const input = '12个法宝.png';
  const names = ['kaishanfu', 'huishanfu', 'yangzhiganlu', 'jinguzhou', 'kulounianzhu', 'zhaoyaojing',
                 'bihuozhao', 'bajiaoshan', 'laoyuanjia', 'ganlujinglu', 'jingangzhuo', 'jinlanjiasha'];
  const meta = { cols: 12, rows: 1, outW: 128, outH: 128 };
  for (let i = 0; i < 12; i++) {
    tasks.push({
      input, meta,
      outDir: 'artifacts',
      outName: `artifact_${names[i]}.png`,
      col: i, row: 0,
    });
  }
}

// ─── 9. 初识法宝 (三个初始法宝.png) — 3列横排（前3个法宝） ───
// 已包含在12个法宝中，这里额外裁一份到法宝目录
{
  const input = '三个初始法宝.png';
  const names = ['kaishanfu', 'huishanfu', 'yangzhiganlu'];
  const meta = { cols: 3, rows: 1, outW: 128, outH: 128 };
  for (let i = 0; i < 3; i++) {
    tasks.push({
      input, meta,
      outDir: 'artifacts',
      outName: `artifact_${names[i]}_v2.png`, // 加 _v2 避免覆盖
      col: i, row: 0,
    });
  }
}

// ─── 10. 道具图标 (五个法宝.png) — 5列横排 ───
// 这张图里包含的是道具（items）不是法宝
{
  const input = '五个法宝.png';
  const names = ['kaishanfu', 'jiuzhuanxiandan', 'tongyongsuipian', 'jinguzhou', 'yujingping'];
  const meta = { cols: 5, rows: 1, outW: 128, outH: 128 };
  for (let i = 0; i < 5; i++) {
    tasks.push({
      input, meta,
      outDir: 'items',
      outName: `item_${names[i]}.png`,
      col: i, row: 0,
    });
  }
}

// ─── 11. UI 图标 (八个UI图标.png) — 8列横排 ───
{
  const input = '八个UI图标.png';
  const names = ['peach', 'hp', 'wave', 'kill', 'pause', 'star', 'sweep', 'ad_reward'];
  const meta = { cols: 8, rows: 1, outW: 64, outH: 64 };
  for (let i = 0; i < 8; i++) {
    tasks.push({
      input, meta,
      outDir: 'ui',
      outName: `ui_icon_${names[i]}.png`,
      col: i, row: 0,
    });
  }
}

// ─── 12. 阵营图标 (三大阵营.png) — 3列横排 ───
// 注意：alpha:false
{
  const input = '三大阵营.png';
  const names = ['shitu', 'xianfo', 'yaowang'];
  const meta = { cols: 3, rows: 1, outW: 64, outH: 64 };
  for (let i = 0; i < 3; i++) {
    tasks.push({
      input, meta,
      outDir: 'ui',
      outName: `ui_icon_faction_${names[i]}.png`,
      col: i, row: 0,
    });
  }
}

// ─── 13. 仙桃和灵蕴 (仙桃和灵韵.png) — 2列横排 ───
{
  const input = '仙桃和灵韵.png';
  const meta = { cols: 2, rows: 1, outW: 64, outH: 64 };
  tasks.push({
    input, meta,
    outDir: 'ui',
    outName: 'ui_icon_peach.png',
    col: 0, row: 0,
  });
  tasks.push({
    input, meta,
    outDir: 'ui',
    outName: 'ui_icon_spirit.png',
    col: 1, row: 0,
  });
}

// ============================================================
// 执行裁切
// ============================================================

async function main() {
  // 先获取所有图片的原始尺寸（缓存，避免重复读取）
  const sizeCache = {};
  for (const f of fs.readdirSync(IMAGE_DIR)) {
    if (f.endsWith('.png')) {
      const meta = await sharp(path.join(IMAGE_DIR, f)).metadata();
      sizeCache[f] = { w: meta.width, h: meta.height, alpha: meta.hasAlpha };
    }
  }

  console.log('═══════════════════════════════════');
  console.log('  开始裁切 sprite sheets');
  console.log('═══════════════════════════════════\n');

  let ok = 0;
  let skip = 0;
  const noAlphaWarn = [];

  // 按 input 分组处理
  const byInput = {};
  for (const t of tasks) {
    if (!byInput[t.input]) byInput[t.input] = [];
    byInput[t.input].push(t);
  }

  for (const [input, group] of Object.entries(byInput)) {
    const size = sizeCache[input];
    if (!size) {
      console.log(`✗ 找不到文件: ${input}`);
      skip += group.length;
      continue;
    }

    const { w, h, alpha } = size;
    const { cols, rows, outW, outH } = group[0].meta;
    const cellW = w / cols;
    const cellH = h / rows;

    console.log(`\n${input}`);
    console.log(`  原图 ${w}×${h} | ${cols}列×${rows}行 | 每格 ${cellW.toFixed(0)}×${cellH.toFixed(0)} | → ${outW}×${outH}`);
    if (!alpha) {
      console.log(`  ⚚ 警告：此图无透明通道！`);
      noAlphaWarn.push(input);
    }
    console.log(`  共 ${group.length} 个输出:`);

    ensureDir(path.join(OUT_BASE, group[0].outDir));

    for (const t of group) {
      const x = t.col * cellW;
      const y = t.row * cellH;
      const outPath = path.join(OUT_BASE, t.outDir, t.outName);
      const success = await cropAndResize(t.input, outPath, x, y, cellW, cellH, outW, outH);
      if (success) {
        console.log(`    ✓ ${t.outName}`);
        ok++;
      } else {
        skip++;
      }
    }
  }

  // ─── 背景图单独处理（不需要裁切，只需缩放） ───
  console.log('\n── 背景图 ──');
  {
    ensureDir(path.join(OUT_BASE, 'ui'));
    await justResize('战斗背景.png', path.join(OUT_BASE, 'ui', 'ui_bg_battle_forest.png'), 750, 1334, 'fill');
    await justResize('九章背景图.png', path.join(OUT_BASE, 'ui', 'ui_bg_journey_map.png'), 750, 1334, 'fill');
    ok += 2;
  }

  console.log(`\n═══════════════════════════════════`);
  console.log(`  完成：${ok} 个成功，${skip} 个跳过`);
  console.log(`  输出目录: ${OUT_BASE}`);
  console.log(`═══════════════════════════════════`);

  if (noAlphaWarn.length > 0) {
    console.log(`\n⚠ 以下图片无透明通道，裁出来的图会有实色背景：`);
    for (const f of noAlphaWarn) {
      console.log(`  - ${f} (${sizeCache[f]?.alpha === false ? 'PNG但alpha:false，需重新生成' : 'JPEG格式'})`);
    }
    console.log(`\n这些图需要让 AI 重新生成，提示词强调"透明背景PNG、真alpha通道"。`);
  }
}

main().catch(console.error);
