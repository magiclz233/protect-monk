import { getBoardTemplateForLevel, getLockedCellsForTemplate } from './DefenseBoardData';
import { LevelConfig, WaveConfig } from '../types';

/** 章节数值倍率（Ch1=1.0, Ch9=3.6） */
const CHAPTER_ENEMY_SCALE = [1.0, 1.15, 1.35, 1.6, 1.9, 2.25, 2.65, 3.1, 3.6];

/**
 * 每章精英怪分配（每章 1 个专属精英，对应西游原著章节主题）
 * Ch1 虎先锋    — 黄风岭虎怪，敏捷型
 * Ch2 黄风怪    — 沙尘眩晕
 * Ch3 狐狸精    — 白骨精部下，闪避型
 * Ch4 火云童    — 红孩儿部下，火焰践踏
 * Ch5 玉面狐    — 牛魔王之妾，速度光环
 * Ch6 老鼋      — 通天河巨龟，防御型
 * Ch7 蛛妖      — 盘丝洞，蛛网眩晕
 * Ch8 象兵      — 白象部下，践踏型
 * Ch9 大鹏鹰    — 大鹏部下，速度光环
 */
const CHAPTER_ELITE_IDS = [
  'elite_huwei',      // Ch1 五行山
  'elite_huangfeng',  // Ch2 流沙河
  'elite_huli',       // Ch3 白虎岭
  'elite_huoyun',     // Ch4 号山
  'elite_yumian',     // Ch5 火焰山
  'elite_laoyuan',    // Ch6 通天河
  'elite_zhuyu',      // Ch7 盘丝洞
  'elite_kuangtou',   // Ch8 狮驼岭
  'elite_dapeng',     // Ch9 灵山
];

/**
 * 每章 Boss 分配（严格对应西游原著）
 * Ch1 五行山 — 黑熊精（观音院）
 * Ch2 流沙河 — 灵感大王（金鱼精）
 * Ch3 白虎岭 — 白骨夫人（三打白骨精）
 * Ch4 号山   — 红孩儿（火云洞）
 * Ch5 火焰山 — 铁扇公主（芭蕉洞）
 * Ch6 通天河 — 金角大王（平顶山莲花洞）
 * Ch7 盘丝洞 — 百眼魔君（黄花观蜈蚣精）
 * Ch8 狮驼岭 — 大鹏金翅雕（狮驼三魔之首）
 * Ch9 灵山   — 黄眉怪（小雷音寺假佛）
 */
const CHAPTER_BOSS_IDS = [
  'boss_heixiongjing',  // Ch1
  'boss_linggan',       // Ch2
  'boss_baigufuren',    // Ch3
  'boss_honghaier',     // Ch4
  'boss_tieshan',       // Ch5
  'boss_jinjiao',       // Ch6
  'boss_baiyan',        // Ch7
  'boss_dapengjinchi',  // Ch8
  'boss_huangmei',      // Ch9
];

/**
 * 每章普通小怪分配（按章节主题）
 * Ch1 五行山 — 山精+虎妖（山林主题）
 * Ch2 流沙河 — 水妖+虾兵（水域主题）
 * Ch3 白虎岭 — 骷髅妖+白骨兵（亡骨主题）
 * Ch4 号山   — 火妖+熔岩怪（火焰主题）
 * Ch5 火焰山 — 熔岩怪+火妖（火山主题）
 * Ch6 通天河 — 虾兵+蟹将（水域主题）
 * Ch7 盘丝洞 — 骷髅妖+白骨兵（蛛虫洞穴借用亡骨）
 * Ch8 狮驼岭 — 狮驼小妖+虎妖（兽妖主题）
 * Ch9 灵山   — 山精+虎妖（佛门最后试炼，回归山林）
 */
const CHAPTER_NORMAL_IDS: Array<[string, string]> = [
  ['xiaoyao_1', 'xiaoyao_2'],  // Ch1 山精+虎妖
  ['xiaoyao_5', 'xiaoyao_6'],  // Ch2 水妖+虾兵
  ['xiaoyao_3', 'xiaoyao_4'],  // Ch3 骷髅妖+白骨兵
  ['xiaoyao_8', 'xiaoyao_9'],  // Ch4 火妖+熔岩怪
  ['xiaoyao_9', 'xiaoyao_8'],  // Ch5 熔岩怪+火妖
  ['xiaoyao_6', 'xiaoyao_7'],  // Ch6 虾兵+蟹将
  ['xiaoyao_3', 'xiaoyao_4'],  // Ch7 骷髅妖+白骨兵
  ['xiaoyao_10', 'xiaoyao_2'], // Ch8 狮驼小妖+虎妖
  ['xiaoyao_1', 'xiaoyao_2'],  // Ch9 山精+虎妖
];

function scaledEnemy(enemyId: string, count: number, interval: number, scale: number): WaveConfig['enemies'][number] {
  return {
    enemyId,
    count,
    interval,
    hpMultiplier: scale,
    attackMultiplier: 1 + (scale - 1) * 0.35,
  };
}

function makeWaves(level: number): WaveConfig[] {
  const chapter = Math.ceil(level / 9);
  const countBase = 4 + Math.min(Math.ceil(level / 5), 8);
  const levelScale = CHAPTER_ENEMY_SCALE[chapter - 1] ?? 1;
  const [normalId, altId] = CHAPTER_NORMAL_IDS[chapter - 1] ?? ['xiaoyao_1', 'xiaoyao_2'];
  const eliteId = CHAPTER_ELITE_IDS[chapter - 1] ?? 'elite_huangfeng';
  const bossId = CHAPTER_BOSS_IDS[chapter - 1] ?? 'boss_heixiongjing';
  const waves: WaveConfig[] = [
    { startDelay: 2, enemies: [scaledEnemy(normalId, countBase, 0.85, levelScale)] },
    { startDelay: 3, enemies: [scaledEnemy(normalId, countBase + 2, 0.78, levelScale), scaledEnemy(altId, Math.ceil(level / 9), 0.9, levelScale)] },
  ];

  if (level % 3 === 0) {
    waves.push({ startDelay: 4, enemies: [scaledEnemy(altId, countBase + 3, 0.7, levelScale), scaledEnemy(eliteId, 1, 1, levelScale)] });
  }

  if (level % 9 === 0) {
    waves.push({ startDelay: 5, enemies: [scaledEnemy(eliteId, 1 + Math.floor(chapter / 3), 1.1, levelScale), scaledEnemy(bossId, 1, 1, levelScale)] });
  }

  return waves;
}

function makeLevel(levelId: number): LevelConfig {
  const chapter = Math.ceil(levelId / 9);
  const template = getBoardTemplateForLevel(levelId);
  return {
    levelId,
    chapter,
    name: `第${levelId}难`,
    monsterPath: template.path,
    lockedCells: getLockedCellsForTemplate(template),
    boardTemplateId: template.id,
    waves: makeWaves(levelId),
  };
}

export const JOURNEY_LEVELS: LevelConfig[] = Array.from({ length: 81 }, (_, index) => makeLevel(index + 1));

export function getJourneyLevel(levelId: number): LevelConfig | undefined {
  return JOURNEY_LEVELS.find(level => level.levelId === levelId);
}
