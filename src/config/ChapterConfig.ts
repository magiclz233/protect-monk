import { ArtifactId } from '../types';
import type { LevelData } from '../data/LevelData';

export type ChapterState = 'locked' | 'active' | 'completed';

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
}

export const CHAPTER_CONFIGS: ChapterConfig[] = [
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
  },
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
  },
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
  },
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
  },
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
  },
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
  },
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
  },
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
  },
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
  },
];

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
