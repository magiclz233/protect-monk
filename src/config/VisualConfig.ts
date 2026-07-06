import { AttackType, EnemyType, HeroRarity, ItemId, SoldierRank, SoldierType } from '../types';

export const VISUAL_PALETTE = {
  gold: 0xf0c15a,
  cinnabar: 0xb83f35,
  jade: 0x35b58f,
  ink: 0x101826,
  paper: 0xfff1c9,
} as const;

export interface SoldierVisualConfig {
  fill: number;
  stroke: number;
  accent: number;
  weapon: 'staff' | 'spear_shield' | 'axe_mount' | 'bow_talisman';
}

export const SOLDIER_VISUALS: Record<SoldierType, SoldierVisualConfig> = {
  [SoldierType.MONKEY]: { fill: 0xd99438, stroke: 0xffd36a, accent: 0x6b3c1e, weapon: 'staff' },
  [SoldierType.SOLDIER]: { fill: 0x3d7fc9, stroke: 0xc6e4ff, accent: 0xd9e7ef, weapon: 'spear_shield' },
  [SoldierType.RIDER]: { fill: 0x8f3a65, stroke: 0xff7b6d, accent: 0x34223f, weapon: 'axe_mount' },
  [SoldierType.ARCHER]: { fill: 0x36a978, stroke: 0xbfffd8, accent: 0xf0e06a, weapon: 'bow_talisman' },
};

export interface RankVisualConfig {
  color: number;
  labelColor: string;
  glowAlpha: number;
}

export const RANK_VISUALS: Record<SoldierRank, RankVisualConfig> = {
  [SoldierRank.WHITE]: { color: 0xf4f6f8, labelColor: '#ffffff', glowAlpha: 0.12 },
  [SoldierRank.GREEN]: { color: 0x6ee887, labelColor: '#70ff70', glowAlpha: 0.18 },
  [SoldierRank.BLUE]: { color: 0x6fa5ff, labelColor: '#78a8ff', glowAlpha: 0.24 },
  [SoldierRank.PURPLE]: { color: 0xd783ff, labelColor: '#e282ff', glowAlpha: 0.3 },
  [SoldierRank.ORANGE]: { color: 0xffbf47, labelColor: '#ffd36a', glowAlpha: 0.4 },
};

export interface HeroVisualConfig {
  fill: number;
  stroke: number;
  accent: number;
  rarity: HeroRarity;
  emblem: 'staff' | 'lotus' | 'horn' | 'fire_spear' | 'eye' | 'wheels' | 'flame' | 'rake' | 'crescent' | 'dragon' | 'bear' | 'bone' | 'web' | 'pagoda';
}

export const HERO_VISUALS: Record<string, HeroVisualConfig> = {
  sunwukong: { fill: 0xb75a25, stroke: 0xffd36a, accent: 0xf6ef7a, rarity: HeroRarity.CORE, emblem: 'staff' },
  guanyin: { fill: 0x3b8f8a, stroke: 0xffe9ad, accent: 0xf5f4ff, rarity: HeroRarity.CORE, emblem: 'lotus' },
  niumowang: { fill: 0x6e2d2d, stroke: 0xffc25f, accent: 0x2b1822, rarity: HeroRarity.CORE, emblem: 'horn' },
  honghaier: { fill: 0xb8402f, stroke: 0xffd36a, accent: 0xff7a32, rarity: HeroRarity.CORE, emblem: 'fire_spear' },
  erlangshen: { fill: 0x34589c, stroke: 0xffd36a, accent: 0xcfe8ff, rarity: HeroRarity.CORE, emblem: 'eye' },
  nezha: { fill: 0xb73f5a, stroke: 0xffd36a, accent: 0xff7f3a, rarity: HeroRarity.CORE, emblem: 'wheels' },
  taishanglaojun: { fill: 0x5b4c9a, stroke: 0xffd36a, accent: 0xf2e18a, rarity: HeroRarity.CORE, emblem: 'flame' },
  zhubajie: { fill: 0x2f7866, stroke: 0xb8f4de, accent: 0xd6c2a2, rarity: HeroRarity.NORMAL, emblem: 'rake' },
  shawujing: { fill: 0x336879, stroke: 0xb8d8ff, accent: 0xc2d9e8, rarity: HeroRarity.NORMAL, emblem: 'crescent' },
  bailongma: { fill: 0x4f7f96, stroke: 0xd9f7ff, accent: 0xffffff, rarity: HeroRarity.NORMAL, emblem: 'dragon' },
  heixiongjing: { fill: 0x3f3a35, stroke: 0xc2d1c1, accent: 0x171514, rarity: HeroRarity.NORMAL, emblem: 'bear' },
  baigufuren: { fill: 0x6c6178, stroke: 0xe6e1ef, accent: 0xffffff, rarity: HeroRarity.NORMAL, emblem: 'bone' },
  zhizhujing: { fill: 0x60367b, stroke: 0xdbb2ff, accent: 0xf4d6ff, rarity: HeroRarity.NORMAL, emblem: 'web' },
  tuotatianwang: { fill: 0x426a8f, stroke: 0xcde6ff, accent: 0xf0c15a, rarity: HeroRarity.NORMAL, emblem: 'pagoda' },
};

export interface EnemyVisualConfig {
  fill: number;
  stroke: number;
  accent: number;
  silhouette: 'grunt' | 'skull' | 'bat' | 'beast' | 'wind' | 'fox' | 'elephant' | 'wing' | 'boss_hex';
}

export const ENEMY_VISUALS: Record<string, EnemyVisualConfig> = {
  xiaoyao_1: { fill: 0xb6463a, stroke: 0xffa088, accent: 0x4c1f22, silhouette: 'grunt' },
  xiaoyao_2: { fill: 0xbfc3c8, stroke: 0xffffff, accent: 0x333844, silhouette: 'skull' },
  xiaoyao_3: { fill: 0x5e3b84, stroke: 0xb88cff, accent: 0x21152f, silhouette: 'bat' },
  xiaoyao_4: { fill: 0x9a5133, stroke: 0xffb27a, accent: 0x3b2318, silhouette: 'beast' },
  xiaoyao_5: { fill: 0x357ca0, stroke: 0xa7e5ff, accent: 0x1d4355, silhouette: 'grunt' },
  xiaoyao_6: { fill: 0x477f9d, stroke: 0xc0ebff, accent: 0x213849, silhouette: 'beast' },
  xiaoyao_7: { fill: 0x6f7580, stroke: 0xd3dae4, accent: 0x30343b, silhouette: 'beast' },
  xiaoyao_8: { fill: 0xb54932, stroke: 0xffb15c, accent: 0xff6a25, silhouette: 'grunt' },
  xiaoyao_9: { fill: 0x7c4535, stroke: 0xff7b45, accent: 0x2b1814, silhouette: 'beast' },
  xiaoyao_10: { fill: 0x8a403a, stroke: 0xff9a78, accent: 0x321b1d, silhouette: 'beast' },
  elite_huangfeng: { fill: 0xc29a3a, stroke: 0xffe08a, accent: 0x77551e, silhouette: 'wind' },
  elite_huli: { fill: 0xbe5c7c, stroke: 0xffb4ca, accent: 0x57283c, silhouette: 'fox' },
  elite_kuangtou: { fill: 0x77736b, stroke: 0xe0d8c6, accent: 0x3e3b35, silhouette: 'elephant' },
  elite_dapeng: { fill: 0x5a5d9c, stroke: 0xc7d0ff, accent: 0x272a54, silhouette: 'wing' },
  boss_heixiongjing: { fill: 0x3a2724, stroke: 0xffd36a, accent: 0x0f0c0b, silhouette: 'boss_hex' },
  boss_jinjiao: { fill: 0x8a5a2b, stroke: 0xffd36a, accent: 0xf0c15a, silhouette: 'boss_hex' },
  boss_honghaier: { fill: 0xb83f35, stroke: 0xffd36a, accent: 0xff7a32, silhouette: 'boss_hex' },
  boss_baigufuren: { fill: 0x7b6d88, stroke: 0xf3edf8, accent: 0xffffff, silhouette: 'boss_hex' },
  boss_qingshi: { fill: 0x346d62, stroke: 0xffd36a, accent: 0x153833, silhouette: 'boss_hex' },
  boss_baixiang: { fill: 0x7a756b, stroke: 0xffd36a, accent: 0xf0eadb, silhouette: 'boss_hex' },
  boss_dapengjinchi: { fill: 0x4d5298, stroke: 0xffd36a, accent: 0xe9ecff, silhouette: 'boss_hex' },
};

export interface ItemVisualConfig {
  fill: number;
  stroke: number;
  accent: number;
  icon: 'axe' | 'elixir' | 'shard' | 'headband' | 'vase';
  shortLabel: string;
}

export const ITEM_VISUALS: Record<ItemId, ItemVisualConfig> = {
  [ItemId.AXE]: { fill: 0x9b5d24, stroke: 0xffd36a, accent: 0xd7d2c6, icon: 'axe', shortLabel: '斧' },
  [ItemId.ELIXIR]: { fill: 0xb82f38, stroke: 0xffd6a6, accent: 0xffef8a, icon: 'elixir', shortLabel: '丹' },
  [ItemId.UNIVERSAL_SHARD]: { fill: 0x6d58a8, stroke: 0xd8c7ff, accent: 0x8df2ff, icon: 'shard', shortLabel: '万' },
  [ItemId.HEADBAND]: { fill: 0x8f7620, stroke: 0xffe08a, accent: 0xfff0a6, icon: 'headband', shortLabel: '箍' },
  [ItemId.VASE]: { fill: 0x3b8fa5, stroke: 0xd9f7ff, accent: 0x78e6dc, icon: 'vase', shortLabel: '瓶' },
};

export interface AttackEffectVisualConfig {
  color: number;
  lineWidth: number;
  projectileRadius: number;
  hitRadius: number;
}

export const ATTACK_EFFECT_VISUALS: Record<AttackType, AttackEffectVisualConfig> = {
  [AttackType.MELEE]: { color: 0xffd36a, lineWidth: 4, projectileRadius: 3, hitRadius: 12 },
  [AttackType.MID_RANGE]: { color: 0xb8d8ff, lineWidth: 3, projectileRadius: 4, hitRadius: 14 },
  [AttackType.RANGED]: { color: 0x8df2a8, lineWidth: 3, projectileRadius: 4, hitRadius: 13 },
  [AttackType.AOE]: { color: 0xff7a45, lineWidth: 4, projectileRadius: 5, hitRadius: 20 },
};

export const ENEMY_TYPE_FALLBACK_VISUALS: Record<EnemyType, EnemyVisualConfig> = {
  [EnemyType.NORMAL]: { fill: 0xb6463a, stroke: 0xffa088, accent: 0x4c1f22, silhouette: 'grunt' },
  [EnemyType.ELITE]: { fill: 0xc29a3a, stroke: 0xffe08a, accent: 0x77551e, silhouette: 'wind' },
  [EnemyType.BOSS]: { fill: 0xb83f35, stroke: 0xffd36a, accent: 0x5a1c18, silhouette: 'boss_hex' },
};
