import { ArtifactId } from '../types';
import type { LevelData } from '../data/LevelData';

export type ChapterState = 'locked' | 'active' | 'completed';

// ==================== 棋盘配色 ====================

export interface ChapterBoardColors {
  panelStroke: number;
  buildableFill: number;
  buildableBorder: number;
  pathFill: number;
  pathBorder: number;
  lockedFill: number;
  lockedBorder: number;
  pathWideLine: number;
  pathMidLine: number;
}

// ==================== 章节特殊机制 ====================

export type MechanicType =
  | 'none'
  | 'silence'       // 流沙陷足 — 随机格沉默
  | 'respawn'       // 白骨复生 — 击杀敌概率复活
  | 'fire_zone'     // 三昧火灼 — 随机格喷火
  | 'burn_all'      // 烈焰灼烧 — 全队持续扣血
  | 'slow'          // 激流缓行 — 全局减速
  | 'root'          // 蛛网缠绕 — 随机定身
  | 'stats_boost'   // 万妖之岭 — 敌人数值提升
  | 'shield_stack'; // 佛光庇护 — 敌人叠盾

export interface ChapterMechanic {
  type: MechanicType;
  interval?: number;   // 触发间隔（秒）
  duration?: number;   // 持续时间（秒）
  value?: number;      // 效果数值（百分比）
}

// ==================== ChapterConfig ====================

export interface ChapterConfig {
  chapterId: number;
  name: string;
  subtitle: string;
  levelRange: [number, number];
  bossLevelId: number;
  unlockHeroId: string;
  unlockArtifactId: ArtifactId;
  themeColor: number;
  themeColorDark: number;
  terrainType: string;
  /** 章节专属棋盘配色 */
  boardColors: ChapterBoardColors;
  /** 锁定格障碍物图片 key */
  lockedCellImage: string;
  /** 章节特殊机制 */
  specialMechanic: ChapterMechanic;
}

// ==================== 公共色（九章统一） ====================

const PANEL_FILL = 0x1a1814;
const PATH_BORDER = 0xc43d30;   // 朱砂
const PATH_GOLD = 0xf0c15a;     // 鎏金
const PATH_WIDE = 0x8b1a1a;     // 绛红

// ==================== 九章配置 ====================

export const CHAPTER_CONFIGS: ChapterConfig[] = [
  // ===== 第 1 章 · 五行山 =====
  {
    chapterId: 1,
    name: '五行山',
    subtitle: '悟空破山',
    levelRange: [1, 9],
    bossLevelId: 9,
    unlockHeroId: 'sunwukong',
    unlockArtifactId: ArtifactId.HEADBAND,
    themeColor: 0x5b8c5a,
    themeColorDark: 0x1a3320,
    terrainType: 'forest_mountain',
    boardColors: {
      panelStroke: 0x5b8c5a,
      buildableFill: 0x1e2a1c,
      buildableBorder: 0xe0c8a0,
      pathFill: 0xb89068,
      pathBorder: PATH_BORDER,
      lockedFill: 0x2a3824,
      lockedBorder: 0x5b8c5a,
      pathWideLine: PATH_WIDE,
      pathMidLine: 0x1a3320,
    },
    lockedCellImage: 'chapters/ch1_locked',
    specialMechanic: { type: 'none' },
  },
  // ===== 第 2 章 · 流沙河 =====
  {
    chapterId: 2,
    name: '流沙河',
    subtitle: '收服沙僧',
    levelRange: [10, 18],
    bossLevelId: 18,
    unlockHeroId: 'shawujing',
    unlockArtifactId: ArtifactId.SKULL_BEADS,
    themeColor: 0x4a90b8,
    themeColorDark: 0x142e3d,
    terrainType: 'water_sand',
    boardColors: {
      panelStroke: 0x4a90b8,
      buildableFill: 0x1a2832,
      buildableBorder: 0x9eaca0,
      pathFill: 0x7a6a52,
      pathBorder: PATH_BORDER,
      lockedFill: 0x1e303a,
      lockedBorder: 0x4a90b8,
      pathWideLine: PATH_WIDE,
      pathMidLine: 0x142e3d,
    },
    lockedCellImage: 'chapters/ch2_locked',
    specialMechanic: { type: 'silence', interval: 15, duration: 3 },
  },
  // ===== 第 3 章 · 白虎岭 =====
  {
    chapterId: 3,
    name: '白虎岭',
    subtitle: '三打白骨精',
    levelRange: [19, 27],
    bossLevelId: 27,
    unlockHeroId: 'baigufuren',
    unlockArtifactId: ArtifactId.DEMON_MIRROR,
    themeColor: 0x8b7a9e,
    themeColorDark: 0x231d2e,
    terrainType: 'bone_cave',
    boardColors: {
      panelStroke: 0x8b7a9e,
      buildableFill: 0x1e1a24,
      buildableBorder: 0xb0a0a8,
      pathFill: 0x8a7e82,
      pathBorder: PATH_BORDER,
      lockedFill: 0x26202c,
      lockedBorder: 0x8b7a9e,
      pathWideLine: PATH_WIDE,
      pathMidLine: 0x231d2e,
    },
    lockedCellImage: 'chapters/ch3_locked',
    specialMechanic: { type: 'respawn', value: 30 },
  },
  // ===== 第 4 章 · 号山 =====
  {
    chapterId: 4,
    name: '号山',
    subtitle: '火云洞斗法',
    levelRange: [28, 36],
    bossLevelId: 36,
    unlockHeroId: 'honghaier',
    unlockArtifactId: ArtifactId.FIRE_COVER,
    themeColor: 0xc45a3a,
    themeColorDark: 0x351510,
    terrainType: 'fire_cave',
    boardColors: {
      panelStroke: 0xc45a3a,
      buildableFill: 0x2a1a14,
      buildableBorder: 0x6a4a38,
      pathFill: 0x4a2a1e,
      pathBorder: PATH_BORDER,
      lockedFill: 0x302018,
      lockedBorder: 0xc45a3a,
      pathWideLine: PATH_WIDE,
      pathMidLine: 0x351510,
    },
    lockedCellImage: 'chapters/ch4_locked',
    specialMechanic: { type: 'fire_zone', interval: 10, duration: 3, value: 5 },
  },
  // ===== 第 5 章 · 火焰山 =====
  {
    chapterId: 5,
    name: '火焰山',
    subtitle: '大战牛魔王',
    levelRange: [37, 45],
    bossLevelId: 45,
    unlockHeroId: 'niumowang',
    unlockArtifactId: ArtifactId.PLANTAIN_FAN,
    themeColor: 0xd4702a,
    themeColorDark: 0x3d1a08,
    terrainType: 'volcano',
    boardColors: {
      panelStroke: 0xd4702a,
      buildableFill: 0x2e1a0c,
      buildableBorder: 0x7a4228,
      pathFill: 0x5a2a14,
      pathBorder: PATH_BORDER,
      lockedFill: 0x341e10,
      lockedBorder: 0xd4702a,
      pathWideLine: PATH_WIDE,
      pathMidLine: 0x3d1a08,
    },
    lockedCellImage: 'chapters/ch5_locked',
    specialMechanic: { type: 'burn_all', value: 1 },
  },
  // ===== 第 6 章 · 通天河 =====
  {
    chapterId: 6,
    name: '通天河',
    subtitle: '观音救难',
    levelRange: [46, 54],
    bossLevelId: 54,
    unlockHeroId: 'guanyin',
    unlockArtifactId: ArtifactId.TURTLE_ARMOR,
    themeColor: 0x3d7fba,
    themeColorDark: 0x0e1f33,
    terrainType: 'river_cross',
    boardColors: {
      panelStroke: 0x3d7fba,
      buildableFill: 0x162838,
      buildableBorder: 0x6a9aae,
      pathFill: 0x4a7a8a,
      pathBorder: PATH_BORDER,
      lockedFill: 0x1a3040,
      lockedBorder: 0x3d7fba,
      pathWideLine: PATH_WIDE,
      pathMidLine: 0x0e1f33,
    },
    lockedCellImage: 'chapters/ch6_locked',
    specialMechanic: { type: 'slow', value: 20 },
  },
  // ===== 第 7 章 · 盘丝洞 =====
  {
    chapterId: 7,
    name: '盘丝洞',
    subtitle: '盘丝除妖',
    levelRange: [55, 63],
    bossLevelId: 63,
    unlockHeroId: 'zhizhujing',
    unlockArtifactId: ArtifactId.CLEANSING_DEW,
    themeColor: 0x7b4f8a,
    themeColorDark: 0x1d1228,
    terrainType: 'spider_cave',
    boardColors: {
      panelStroke: 0x7b4f8a,
      buildableFill: 0x1c1624,
      buildableBorder: 0x6a5a7a,
      pathFill: 0x4a3a5a,
      pathBorder: PATH_BORDER,
      lockedFill: 0x221a2c,
      lockedBorder: 0x7b4f8a,
      pathWideLine: PATH_WIDE,
      pathMidLine: 0x1d1228,
    },
    lockedCellImage: 'chapters/ch7_locked',
    specialMechanic: { type: 'root', interval: 12, duration: 3 },
  },
  // ===== 第 8 章 · 狮驼岭 =====
  {
    chapterId: 8,
    name: '狮驼岭',
    subtitle: '二郎助战',
    levelRange: [64, 72],
    bossLevelId: 72,
    unlockHeroId: 'erlangshen',
    unlockArtifactId: ArtifactId.DIAMOND_SNARE,
    themeColor: 0x8b6f3a,
    themeColorDark: 0x261d0c,
    terrainType: 'lion_ridge',
    boardColors: {
      panelStroke: 0x8b6f3a,
      buildableFill: 0x221c10,
      buildableBorder: 0x7a6a4a,
      pathFill: 0x5a4a2a,
      pathBorder: PATH_BORDER,
      lockedFill: 0x2a2218,
      lockedBorder: 0x8b6f3a,
      pathWideLine: PATH_WIDE,
      pathMidLine: 0x261d0c,
    },
    lockedCellImage: 'chapters/ch8_locked',
    specialMechanic: { type: 'stats_boost', value: 15 },
  },
  // ===== 第 9 章 · 灵山 =====
  {
    chapterId: 9,
    name: '灵山',
    subtitle: '终成正果',
    levelRange: [73, 81],
    bossLevelId: 81,
    unlockHeroId: 'nezha',
    unlockArtifactId: ArtifactId.KASAYA,
    themeColor: 0xc9a44a,
    themeColorDark: 0x2a1f08,
    terrainType: 'spirit_mountain',
    boardColors: {
      panelStroke: 0xc9a44a,
      buildableFill: 0x1e1a10,
      buildableBorder: 0xd4c08a,
      pathFill: 0xc0a860,
      pathBorder: PATH_BORDER,
      lockedFill: 0x2a2418,
      lockedBorder: 0xc9a44a,
      pathWideLine: PATH_WIDE,
      pathMidLine: 0x2a1f08,
    },
    lockedCellImage: 'chapters/ch9_locked',
    specialMechanic: { type: 'shield_stack', interval: 20, value: 10 },
  },
];

// ==================== 默认配色（兜底） ====================

export const DEFAULT_BOARD_COLORS: ChapterBoardColors = {
  panelStroke: 0xc9a44a,
  buildableFill: 0x6b5540,
  buildableBorder: 0x9b8468,
  pathFill: 0x4a2020,
  pathBorder: PATH_BORDER,
  lockedFill: 0x5a4530,
  lockedBorder: 0x8b5a3c,
  pathWideLine: PATH_WIDE,
  pathMidLine: 0x2d1318,
};

// ==================== 守护模式机制池 ====================

/** 守护模式可从九章机制中随机抽取（排除 none 和 stats_boost，后者通过波次数值体现） */
export const DEFENSE_MECHANIC_POOL: ChapterMechanic[] = [
  { type: 'silence', interval: 15, duration: 3 },
  { type: 'respawn', value: 30 },
  { type: 'fire_zone', interval: 10, duration: 3, value: 5 },
  { type: 'burn_all', value: 1 },
  { type: 'slow', value: 20 },
  { type: 'root', interval: 12, duration: 3 },
  { type: 'shield_stack', interval: 20, value: 10 },
];

// ==================== 工具函数 ====================

export function getChapterConfig(chapterId: number): ChapterConfig | undefined {
  return CHAPTER_CONFIGS.find(chapter => chapter.chapterId === chapterId);
}

export function getChapterState(chapterId: number, levelData: LevelData): ChapterState {
  if (chapterId === 1) {
    return levelData.isChapterBossCleared(chapterId) ? 'completed' : 'active';
  }

  if (!levelData.isChapterBossCleared(chapterId - 1)) return 'locked';
  return levelData.isChapterBossCleared(chapterId) ? 'completed' : 'active';
}

/** 从九章中随机选一章，用于守护模式 */
export function rollDefenseChapter(): { chapterId: number; name: string } {
  const chapterId = Phaser.Math.Between(1, 9);
  const config = getChapterConfig(chapterId);
  return { chapterId, name: config?.name ?? '五行山' };
}

/** 从守护模式机制池中随机抽取不重复的 n 个机制 */
export function rollDefenseMechanics(count: number): ChapterMechanic[] {
  const pool = [...DEFENSE_MECHANIC_POOL];
  const result: ChapterMechanic[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Phaser.Math.Between(0, pool.length - 1);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}
