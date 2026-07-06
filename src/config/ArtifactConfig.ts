import { ArtifactId, ArtifactLevel, ArtifactSaveData } from '../types';

export interface ArtifactConfigItem {
  artifactId: ArtifactId;
  name: string;
  unlockChapter: number;
  cooldown: number;
  targetType: 'cell' | 'ally' | 'enemy' | 'global' | 'monk';
  levelDescriptions: Record<ArtifactLevel, string>;
}

export const ARTIFACT_UPGRADE_COST: Record<2 | 3, number> = {
  2: 80,
  3: 200,
};

export const INITIAL_ARTIFACT_LOADOUT: ArtifactId[] = [
  ArtifactId.AXE,
  ArtifactId.RETURN_TALISMAN,
  ArtifactId.WILLOW_DEW,
];

export const ARTIFACT_CONFIGS: ArtifactConfigItem[] = [
  {
    artifactId: ArtifactId.AXE,
    name: '开山斧',
    unlockChapter: 0,
    cooldown: 60,
    targetType: 'cell',
    levelDescriptions: {
      1: '解锁 1 格',
      2: '冷却缩短至 50 秒',
      3: '一次解锁 2 格',
    },
  },
  {
    artifactId: ArtifactId.RETURN_TALISMAN,
    name: '回山符',
    unlockChapter: 0,
    cooldown: 100,
    targetType: 'global',
    levelDescriptions: {
      1: '弹回 2 次漏怪',
      2: '弹回 3 次漏怪',
      3: '弹回 4 次漏怪',
    },
  },
  {
    artifactId: ArtifactId.WILLOW_DEW,
    name: '杨枝甘露',
    unlockChapter: 0,
    cooldown: 45,
    targetType: 'global',
    levelDescriptions: {
      1: '全体回复 20% HP',
      2: '全体回复 25% HP',
      3: '全体回复 30% HP 并净化',
    },
  },
  {
    artifactId: ArtifactId.HEADBAND,
    name: '紧箍咒',
    unlockChapter: 1,
    cooldown: 60,
    targetType: 'global',
    levelDescriptions: {
      1: '全体敌人减速 40%，持续 4 秒',
      2: '全体敌人减速 50%，持续 5 秒',
      3: '全体敌人减速 60%，持续 6 秒',
    },
  },
  {
    artifactId: ArtifactId.SKULL_BEADS,
    name: '骷髅念珠',
    unlockChapter: 2,
    cooldown: 75,
    targetType: 'global',
    levelDescriptions: {
      1: '全体减速 25% + 易伤 15%，持续 4 秒',
      2: '全体减速 35% + 易伤 25%，持续 6 秒',
      3: '全体减速 45% + 易伤 35%，持续 8 秒',
    },
  },
  {
    artifactId: ArtifactId.DEMON_MIRROR,
    name: '照妖镜',
    unlockChapter: 3,
    cooldown: 80,
    targetType: 'global',
    levelDescriptions: {
      1: '精英/Boss 易伤 40%，持续 8 秒',
      2: '精英/Boss 易伤 60%，持续 10 秒',
      3: '精英/Boss 易伤 80%，持续 12 秒',
    },
  },
  {
    artifactId: ArtifactId.FIRE_COVER,
    name: '避火罩',
    unlockChapter: 4,
    cooldown: 70,
    targetType: 'ally',
    levelDescriptions: {
      1: '指定友方 30% 减伤，持续 6 秒',
      2: '指定友方 40% 减伤，持续 8 秒',
      3: '指定友方 40% 减伤，前 2 秒无敌',
    },
  },
  {
    artifactId: ArtifactId.PLANTAIN_FAN,
    name: '芭蕉扇',
    unlockChapter: 5,
    cooldown: 85,
    targetType: 'global',
    levelDescriptions: {
      1: '全体敌人后退 2 格',
      2: '全体敌人后退 3 格 + 1 秒眩晕',
      3: '全体敌人后退 4 格 + 1.5 秒眩晕',
    },
  },
  {
    artifactId: ArtifactId.TURTLE_ARMOR,
    name: '老鼋甲',
    unlockChapter: 6,
    cooldown: 90,
    targetType: 'ally',
    levelDescriptions: {
      1: '指定友方无敌 2 秒',
      2: '指定友方无敌 3 秒',
      3: '指定友方无敌 4 秒',
    },
  },
  {
    artifactId: ArtifactId.CLEANSING_DEW,
    name: '甘露净露',
    unlockChapter: 7,
    cooldown: 55,
    targetType: 'global',
    levelDescriptions: {
      1: '全体每秒回复 2% HP，持续 6 秒',
      2: '全体每秒回复 3% HP 并净化，持续 8 秒',
      3: '全体每秒回复 4% HP 并净化，持续 10 秒',
    },
  },
  {
    artifactId: ArtifactId.DIAMOND_SNARE,
    name: '金刚琢',
    unlockChapter: 8,
    cooldown: 95,
    targetType: 'enemy',
    levelDescriptions: {
      1: '指定敌人易伤 60%，持续 4 秒',
      2: '指定敌人易伤 80%，持续 5 秒',
      3: '指定敌人易伤 100%，击杀后冷却减半',
    },
  },
  {
    artifactId: ArtifactId.KASAYA,
    name: '锦斓袈裟',
    unlockChapter: 9,
    cooldown: 120,
    targetType: 'monk',
    levelDescriptions: {
      1: '唐僧免疫所有伤害 5 秒',
      2: '唐僧免疫 8 秒，诵经光环翻倍',
      3: '唐僧免疫 10 秒，诵经光环 3 倍',
    },
  },
];

export function getArtifactConfig(artifactId: ArtifactId): ArtifactConfigItem | undefined {
  return ARTIFACT_CONFIGS.find(config => config.artifactId === artifactId);
}

export function getArtifactUpgradeCost(currentLevel: ArtifactLevel): number | null {
  if (currentLevel >= 3) return null;
  return ARTIFACT_UPGRADE_COST[(currentLevel + 1) as 2 | 3];
}

export function getArtifactCarrySlotCount(clearedChapter: number): number {
  if (clearedChapter >= 9) return 6;
  if (clearedChapter >= 6) return 5;
  if (clearedChapter >= 3) return 4;
  return 3;
}

export function getChapterArtifact(chapter: number): ArtifactConfigItem | undefined {
  return ARTIFACT_CONFIGS.find(config => config.unlockChapter === chapter);
}

export function createDefaultArtifactSaveData(): ArtifactSaveData {
  const levels: Record<string, ArtifactLevel> = {};
  for (const config of ARTIFACT_CONFIGS) {
    levels[config.artifactId] = 1;
  }

  return {
    unlocked: [...INITIAL_ARTIFACT_LOADOUT],
    levels,
    loadout: [...INITIAL_ARTIFACT_LOADOUT],
  };
}

export function normalizeArtifactSaveData(value: Partial<ArtifactSaveData> | undefined | null): ArtifactSaveData {
  const defaults = createDefaultArtifactSaveData();
  const unlocked = new Set<ArtifactId>(defaults.unlocked);
  for (const artifactId of value?.unlocked ?? []) {
    if (getArtifactConfig(artifactId)) {
      unlocked.add(artifactId);
    }
  }

  const levels = { ...defaults.levels };
  for (const [artifactId, level] of Object.entries(value?.levels ?? {})) {
    if (!getArtifactConfig(artifactId as ArtifactId)) continue;
    levels[artifactId] = Math.max(1, Math.min(3, level)) as ArtifactLevel;
  }

  const loadout = (value?.loadout ?? defaults.loadout)
    .filter((artifactId): artifactId is ArtifactId => !!getArtifactConfig(artifactId))
    .filter(artifactId => unlocked.has(artifactId));

  return {
    unlocked: Array.from(unlocked),
    levels,
    loadout: loadout.length > 0 ? loadout : [...defaults.loadout],
  };
}
