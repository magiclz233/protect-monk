/**
 * 全局类型定义 - 共享枚举和接口
 * 纯数据，不依赖任何引擎
 */

// ==================== 游戏状态 ====================

export enum GameState {
  IDLE = 'idle',
  PLAYING = 'playing',
  PAUSED = 'paused',
  RESULT = 'result',
}

export enum GameMode {
  DEFENSE = 'defense',
  JOURNEY = 'journey',
}

// ==================== 单位 ====================

export enum UnitSide {
  ALLY = 'ally',
  ENEMY = 'enemy',
}

export enum AttackType {
  MELEE = 'melee',
  MID_RANGE = 'mid_range',
  RANGED = 'ranged',
  AOE = 'aoe',
}

// ==================== 小兵 ====================

export enum SoldierType {
  MONKEY = 'monkey',     // 灵猴兵
  SOLDIER = 'soldier',   // 天兵甲士
  RIDER = 'rider',       // 妖王骑
  ARCHER = 'archer',     // 道法弓手
}

export enum SoldierRank {
  WHITE = 1,
  GREEN = 2,
  BLUE = 3,
  PURPLE = 4,
  ORANGE = 5,
}

export interface SoldierConfigItem {
  type: SoldierType;
  rank: SoldierRank;
  name: string;
  hp: number;
  attack: number;
  defense: number;
  attackSpeed: number;
  attackRange: number;
  attackType: AttackType;
}

// ==================== 英雄 ====================

export enum HeroRarity {
  NORMAL = 'normal',
  CORE = 'core',
}

export interface HeroStats {
  heroId: string;
  name: string;
  rarity: HeroRarity;
  shardsNeeded: number;
  maxLevel: number;
  baseHp: number;
  baseAttack: number;
  attackRange: number;
  attackSpeed: number;
  description: string;
}

// ==================== 怪物 ====================

export enum EnemyType {
  NORMAL = 'normal',
  ELITE = 'elite',
  BOSS = 'boss',
}

export interface EnemyConfig {
  enemyId: string;
  name: string;
  type: EnemyType;
  hp: number;
  attack: number;
  speed: number;
  killExp: number;
  assistExp: number;
  auraExp: number;
  abilities: string[];
}

// ==================== 阵营 ====================

export enum Faction {
  SHITU = 'shitu',
  XIANFO = 'xianfo',
  YAOWANG = 'yaowang',
}

export interface FactionBuff {
  damageBonus: number;
  attackSpeedBonus: number;
  defenseBonus: number;
  hpRegenRate: number;
  maxHpBonus: number;
  critRateBonus: number;
}

// ==================== 召唤 ====================

export enum CardType {
  SOLDIER = 'soldier',
  HERO_SHARD = 'hero_shard',
  ITEM = 'item',
}

export interface CardData {
  type: CardType;
  soldierType?: SoldierType;
  heroId?: string;
  itemId?: string;
  displayName: string;
}

export interface SummonResult {
  cards: CardData[];
  cost: number;
}

// ==================== 道具 ====================

export enum ItemId {
  AXE = 'kaishanfu',
  ELIXIR = 'jiuzhuanxiandan',
  UNIVERSAL_SHARD = 'tongyongsuipian',
  HEADBAND = 'jinguzhou',
  VASE = 'yujingping',
}

// ==================== 网格 ====================

export enum CellState {
  EMPTY = 'empty',
  OCCUPIED = 'occupied',
  LOCKED = 'locked',
}

export interface CellData {
  row: number;
  col: number;
  state: CellState;
  occupant: any | null; // 占据该格的实体
}

// ==================== 存档 ====================

export interface SaveData {
  version: number;
  lastPlayTime: number;
  journeyProgress: {
    currentLevel: number;
    levelStars: Record<number, number>;
    clearedLevels: number[];
  };
  heroStars: Record<string, {
    heroId: string;
    starLevel: number;
    shardCount: number;
    unlocked: boolean;
  }>;
  defenseHighScore: number;
  defenseBestWave: number;
}

// ==================== 敌方路径 ====================

export interface Waypoint {
  row: number;
  col: number;
}

// ==================== 关卡 ====================

export interface LevelConfig {
  levelId: number;
  name: string;
  chapter: number;
  waves: WaveConfig[];
  lockedCells: Array<[number, number]>;
  monsterPath: Waypoint[];
}

export interface WaveConfig {
  enemies: { enemyId: string; count: number; interval: number }[];
  startDelay: number;
}
