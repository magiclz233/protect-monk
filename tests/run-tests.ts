import { gameMgr } from '../src/core/GameManager';
import { eventMgr } from '../src/core/EventManager';
import { platformStorage } from '../src/platform/PlatformStorage';
import { SaveManager } from '../src/data/SaveManager';
import { LevelData } from '../src/data/LevelData';
import { HeroData, HeroRuntimeData } from '../src/data/HeroData';
import { ArtifactData } from '../src/data/ArtifactData';
import {
  BOARD_TEMPLATES,
  getInitialOpenCells,
  getLockedCellsForTemplate,
  isContinuousPath,
} from '../src/data/DefenseBoardData';
import { DEFENSE_WAVES, createEndlessWave } from '../src/data/DefenseWaveData';
import { getKillPeachReward } from '../src/data/EnemyRewardData';
import { JOURNEY_LEVELS, getJourneyLevel } from '../src/data/JourneyLevelData';
import { ARTIFACT_CONFIGS, ARTIFACT_UPGRADE_COST, getArtifactCarrySlotCount } from '../src/config/ArtifactConfig';
import { getDefenseRankByWave } from '../src/config/DefenseRankConfig';
import { ITEM_FEEDBACK_CONFIGS } from '../src/config/ItemFeedbackConfig';
import { ENEMY_CONFIGS, getEnemyConfig } from '../src/config/EnemyConfig';
import { getAttackRangePixels, getCellStep } from '../src/grid/GridMetrics';
import { HERO_CONFIGS, getHeroConfig, toHeroStats } from '../src/config/HeroConfig';
import { generateSoldierConfig } from '../src/config/SoldierConfig';
import {
  ATTACK_EFFECT_VISUALS,
  ENEMY_VISUALS,
  HERO_VISUALS,
  ITEM_VISUALS,
  RANK_VISUALS,
  SOLDIER_VISUALS,
  VISUAL_PALETTE,
} from '../src/config/VisualConfig';
import { ExperienceSystem, IExperienceTarget } from '../src/systems/ExperienceSystem';
import {
  canStoreInInventory,
  getHeroShardNeed,
  INITIAL_INVENTORY_SLOT_LIMIT,
  MAX_INVENTORY_SLOT_LIMIT,
  pickHeroShardConsumption,
} from '../src/systems/InventoryLogic';
import { canMergeHeroForUpgrade, getMergedHeroLevel } from '../src/systems/HeroUpgradeLogic';
import { canUseUniversalShardCount } from '../src/systems/HeroShardLogic';
import { MergeSystem } from '../src/systems/MergeSystem';
import { compareDefenseRecords, isBetterDefenseRecord, LeaderboardService } from '../src/systems/LeaderboardService';
import { calculateJourneyStars, calculateSpiritEssenceReward, settleBattleResult } from '../src/systems/SettlementSystem';
import {
  SELECTED_HERO_SHARD_WEIGHT,
  SUMMON_AXE_RATE,
  SUMMON_CARD_COUNT,
  SUMMON_COST,
  SUMMON_COST_STEP,
  SUMMON_SHARD_RATE,
  SUMMON_SOLDIER_RATE,
  SummonSystem,
} from '../src/systems/SummonSystem';
import { ArtifactId, AttackType, CardType, CellData, CellState, DefenseRecord, EnemyType, GameMode, ItemId, SoldierRank, SoldierType, WaveConfig } from '../src/types';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const { readFileSync } = require('node:fs') as { readFileSync: (path: string, encoding: string) => string };
const { join } = require('node:path') as { join: (...parts: string[]) => string };

type TestCase = {
  name: string;
  run: () => void;
};

function assertOk(value: unknown, message?: string): asserts value {
  if (!value) {
    throw new Error(message ?? '断言失败：期望值为真');
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message ?? `断言失败：期望 ${String(expected)}，实际 ${String(actual)}`);
  }
}

class FakeHero implements IExperienceTarget {
  level = 1;
  maxLevel = 10;
  exp = 0;

  constructor(
    readonly heroId: string,
    readonly isSupport: boolean = false,
  ) {}

  addExp(amount: number): void {
    this.exp += amount;
  }
}

function getMaxDistanceToPath(template: (typeof BOARD_TEMPLATES)[number]): number {
  const pathKeys = new Set(template.path.map(cell => `${cell.row},${cell.col}`));
  let maxDistance = 0;

  for (let row = 0; row < template.rows; row++) {
    for (let col = 0; col < template.cols; col++) {
      if (pathKeys.has(`${row},${col}`)) continue;

      const distance = Math.min(...template.path.map(pathCell =>
        Math.abs(pathCell.row - row) + Math.abs(pathCell.col - col),
      ));
      maxDistance = Math.max(maxDistance, distance);
    }
  }

  return maxDistance;
}

function createCells(rows: number, cols: number): CellData[][] {
  const cells: CellData[][] = [];
  for (let row = 0; row < rows; row++) {
    cells[row] = [];
    for (let col = 0; col < cols; col++) {
      cells[row][col] = { row, col, state: CellState.EMPTY, occupant: null };
    }
  }
  return cells;
}

function occupy(cell: CellData, occupant: unknown): CellData {
  cell.state = CellState.OCCUPIED;
  cell.occupant = occupant;
  return cell;
}

function estimateWaveSpawnDuration(wave: WaveConfig): number {
  const longestGroupDuration = Math.max(
    ...wave.enemies.map(group => Math.max(0, group.count - 1) * group.interval),
  );
  return wave.startDelay + longestGroupDuration;
}

function readRepoFile(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const SAVE_KEY = 'guard_monk_save';

const tests: TestCase[] = [
  {
    name: '付费召唤会消耗仙桃，开山斧分支只产出开山斧',
    run: () => {
      resetRuntime();
      gameMgr.startNewGame(GameMode.DEFENSE);
      gameMgr.addPeach(100);
      gameMgr.setSelectedHeroes([]);
      SummonSystem.getInstance().reset();

      const originalRandom = Math.random;
      Math.random = () => 0.9;
      try {
        const result = SummonSystem.getInstance().summon();
        assertOk(result, '召唤应成功');
        assertEqual(result.cost, SUMMON_COST);
        assertEqual(result.cards.length, SUMMON_CARD_COUNT);
        assertOk(result.cards.every(card => card.type === CardType.ITEM && card.itemId === ItemId.AXE));
      } finally {
        Math.random = originalRandom;
      }

      assertEqual(gameMgr.peach, 120);
    },
  },
  {
    name: '免费召唤不会抬高下一次付费召唤价格',
    run: () => {
      resetRuntime();
      gameMgr.startNewGame(GameMode.DEFENSE);
      gameMgr.addPeach(100);
      SummonSystem.getInstance().reset();

      const beforeCost = SummonSystem.getInstance().currentCost;
      const free = SummonSystem.getInstance().summonFree();
      assertEqual(free.cost, 0);
      assertEqual(SummonSystem.getInstance().currentCost, beforeCost);

      const paid = SummonSystem.getInstance().summon();
      assertOk(paid);
      assertEqual(paid.cost, beforeCost);
    },
  },
  {
    name: '广告通用碎片卡使用道具类型和通用碎片 ID',
    run: () => {
      const card = SummonSystem.getInstance().createUniversalShardCard();
      assertEqual(card.type, CardType.ITEM);
      assertEqual(card.itemId, ItemId.UNIVERSAL_SHARD);
      assertOk(card.displayName.length > 0);
    },
  },
  {
    name: '召唤池使用新的小兵、碎片和定向权重',
    run: () => {
      assertEqual(SUMMON_SOLDIER_RATE, 0.66);
      assertEqual(SUMMON_SHARD_RATE, 0.22);
      assertEqual(SUMMON_AXE_RATE, 0.12);
      assertEqual(SELECTED_HERO_SHARD_WEIGHT, 5);
    },
  },
  {
    name: '通用碎片只能补未完成的英雄碎片计数',
    run: () => {
      assertEqual(canUseUniversalShardCount(1, 3), true);
      assertEqual(canUseUniversalShardCount(2, 3), true);
      assertEqual(canUseUniversalShardCount(3, 3), false);
      assertEqual(canUseUniversalShardCount(0, 3), false);
    },
  },
  {
    name: '统一仓库栏初始 5 格且最多扩到 8 格',
    run: () => {
      assertEqual(INITIAL_INVENTORY_SLOT_LIMIT, 5);
      assertEqual(MAX_INVENTORY_SLOT_LIMIT, 8);
      assertOk(MAX_INVENTORY_SLOT_LIMIT > INITIAL_INVENTORY_SLOT_LIMIT);
    },
  },
  {
    name: '道具和英雄碎片都会占用统一仓库槽',
    run: () => {
      assertEqual(canStoreInInventory({ type: CardType.ITEM, itemId: ItemId.AXE, displayName: '开山斧' }), true);
      assertEqual(canStoreInInventory({ type: CardType.HERO_SHARD, heroId: 'sunwukong', displayName: '孙悟空碎片' }), true);
      assertEqual(canStoreInInventory({ type: CardType.SOLDIER, soldierType: SoldierType.MONKEY, displayName: '灵猴兵' }), true);
    },
  },
  {
    name: '10 级英雄 2 碎片、15 级英雄 3 碎片合成',
    run: () => {
      const bajie = getHeroConfig('zhubajie');
      const wukong = getHeroConfig('sunwukong');
      assertOk(bajie);
      assertOk(wukong);
      assertEqual(getHeroShardNeed(bajie.maxLevel), 2);
      assertEqual(getHeroShardNeed(wukong.maxLevel), 3);
    },
  },
  {
    name: '英雄碎片消耗优先同名碎片，允许通用碎片补位但不能单独合成',
    run: () => {
      const slots = [
        { type: CardType.HERO_SHARD, heroId: 'sunwukong', displayName: '孙悟空碎片' },
        { type: CardType.ITEM, itemId: ItemId.UNIVERSAL_SHARD, displayName: '通用碎片' },
        { type: CardType.HERO_SHARD, heroId: 'zhubajie', displayName: '猪八戒碎片' },
        { type: CardType.ITEM, itemId: ItemId.UNIVERSAL_SHARD, displayName: '通用碎片' },
        null,
      ];

      assertEqual(JSON.stringify(pickHeroShardConsumption(slots, 'sunwukong', 3, 0)), JSON.stringify([0, 1, 3]));
      assertEqual(pickHeroShardConsumption(slots, 'sunwukong', 3, 1), null);
      assertEqual(pickHeroShardConsumption(slots, 'sunwukong', 4, 0), null);
    },
  },
  {
    name: '所有道具都有可见反馈配置',
    run: () => {
      for (const itemId of Object.values(ItemId)) {
        const config = ITEM_FEEDBACK_CONFIGS[itemId];
        assertOk(config, `${itemId} 应有反馈配置`);
        assertOk(config.color > 0, `${itemId} 应配置反馈颜色`);
        assertOk(config.label.length > 0, `${itemId} 应配置反馈文字`);
        assertOk(config.radiusScale > 0, `${itemId} 应配置反馈半径`);
      }
    },
  },
  {
    name: '程序化视觉配置覆盖小兵、英雄、敌人、道具和主色',
    run: () => {
      assertOk(VISUAL_PALETTE.gold > 0);
      assertOk(VISUAL_PALETTE.cinnabar > 0);
      assertOk(VISUAL_PALETTE.jade > 0);
      assertOk(VISUAL_PALETTE.ink > 0);

      for (const soldierType of Object.values(SoldierType)) {
        const visual = SOLDIER_VISUALS[soldierType];
        assertOk(visual, `${soldierType} 应有小兵视觉配置`);
        assertOk(visual.fill > 0 && visual.stroke > 0 && visual.accent > 0);
      }
      for (const rank of [SoldierRank.WHITE, SoldierRank.GREEN, SoldierRank.BLUE, SoldierRank.PURPLE, SoldierRank.ORANGE]) {
        const visual = RANK_VISUALS[rank];
        assertOk(visual, `${rank} 阶应有视觉配置`);
        assertOk(visual.color > 0 && visual.labelColor.length > 0);
      }
      for (const hero of HERO_CONFIGS) {
        const visual = HERO_VISUALS[hero.heroId];
        assertOk(visual, `${hero.name} 应有英雄视觉配置`);
        assertOk(visual.fill > 0 && visual.stroke > 0 && visual.accent > 0);
      }
      for (const enemy of ENEMY_CONFIGS) {
        const visual = ENEMY_VISUALS[enemy.enemyId];
        assertOk(visual, `${enemy.name} 应有敌人视觉配置`);
        assertOk(visual.fill > 0 && visual.stroke > 0 && visual.accent > 0);
      }
      for (const itemId of Object.values(ItemId)) {
        const visual = ITEM_VISUALS[itemId];
        assertOk(visual, `${itemId} 应有道具视觉配置`);
        assertOk(visual.fill > 0 && visual.stroke > 0 && visual.accent > 0);
      }
    },
  },
  {
    name: '所有攻击类型都有表现反馈配置',
    run: () => {
      for (const attackType of Object.values(AttackType)) {
        const visual = ATTACK_EFFECT_VISUALS[attackType];
        assertOk(visual, `${attackType} 应有攻击反馈配置`);
        assertOk(visual.color > 0);
        assertOk(visual.lineWidth > 0);
        assertOk(visual.projectileRadius > 0);
        assertOk(visual.hitRadius > 0);
      }
    },
  },
  {
    name: '玉净瓶会提升唐僧当前血量和最大血量且不超过 7',
    run: () => {
      resetRuntime();
      gameMgr.startNewGame(GameMode.DEFENSE);

      assertEqual(gameMgr.monkHp, 3);
      assertEqual(gameMgr.maxMonkHp, 3);
      assertEqual(gameMgr.fortifyMonk(2, 7), true);
      assertEqual(gameMgr.monkHp, 5);
      assertEqual(gameMgr.maxMonkHp, 5);
      assertEqual(gameMgr.fortifyMonk(2, 7), true);
      assertEqual(gameMgr.monkHp, 7);
      assertEqual(gameMgr.maxMonkHp, 7);
      assertEqual(gameMgr.fortifyMonk(2, 7), false);
      assertEqual(gameMgr.monkHp, 7);
      assertEqual(gameMgr.maxMonkHp, 7);
    },
  },
  {
    name: '所有小兵类型和阶级都有有效攻击配置',
    run: () => {
      const configs = generateSoldierConfig();
      const expectedCount = Object.values(SoldierType).length * 5;
      const allowedAttackTypes = new Set(Object.values(AttackType));

      assertEqual(configs.length, expectedCount);
      for (const config of configs) {
        assertOk(config.attack > 0, `${config.name} 应有攻击力`);
        assertOk(config.attackRange >= 1, `${config.name} 应有攻击范围`);
        assertOk(config.attackSpeed > 0, `${config.name} 应有攻击速度`);
        assertOk(allowedAttackTypes.has(config.attackType), `${config.name} 应有有效攻击类型`);
      }
    },
  },
  {
    name: '所有 MVP 英雄配置可转为战斗属性且被动文本完整',
    run: () => {
      assertEqual(HERO_CONFIGS.length, 14);
      for (const config of HERO_CONFIGS) {
        const stats = toHeroStats(config);
        assertEqual(stats.heroId, config.heroId);
        assertOk(config.passive.length > 0, `${config.name} 应有被动说明`);
        assertOk(config.description.length > 0, `${config.name} 应有描述`);
        assertOk(stats.baseHp > 0, `${config.name} 应有血量`);
        assertOk(stats.baseAttack > 0, `${config.name} 应有攻击力`);
        assertOk(stats.attackRange >= 1, `${config.name} 应有攻击范围`);
        assertOk(stats.attackSpeed > 0, `${config.name} 应有攻击速度`);
      }
    },
  },
  {
    name: '前四波收益支持完成 3 次付费召唤',
    run: () => {
      resetRuntime();
      gameMgr.startNewGame(GameMode.DEFENSE);
      gameMgr.setSelectedHeroes([]);
      SummonSystem.getInstance().reset();

      const earlyReward = DEFENSE_WAVES.slice(0, 4)
        .flatMap(wave => wave.enemies)
        .reduce((sum, group) => {
          const config = getEnemyConfig(group.enemyId);
          assertOk(config, `${group.enemyId} 应存在敌人配置`);
          return sum + group.count * getKillPeachReward(config.type);
        }, 0);
      const peachBeforeWaveFive = 50 + earlyReward;
      const neededSummonCost = Array.from({ length: 3 }, (_, index) =>
        SUMMON_COST + SUMMON_COST_STEP * index,
      ).reduce((sum, cost) => sum + cost, 0);

      assertOk(peachBeforeWaveFive >= neededSummonCost);
    },
  },
  {
    name: '守护模式结算只更新 Defense 竞技记录且不产出灵蕴',
    run: () => {
      resetRuntime();

      const loseResult = settleBattleResult({
        mode: GameMode.DEFENSE,
        victory: false,
        currentLevel: 1,
        monkHp: 0,
        totalKills: 8,
        waveNumber: 3,
      });
      assertEqual(loseResult.stars, 0);
      assertEqual(loseResult.spiritEssenceReward, 0);

      const loseSave = SaveManager.getInstance().load();
      assertOk(loseSave);
      assertEqual(loseSave.defenseRecord.bestKills, 8);
      assertEqual(loseSave.defenseRecord.bestWave, 3);
      assertEqual(loseSave.spiritEssence, 0);

      const winResult = settleBattleResult({
        mode: GameMode.DEFENSE,
        victory: true,
        currentLevel: 1,
        monkHp: 2,
        totalKills: 24,
        waveNumber: 20,
      });
      assertEqual(winResult.spiritEssenceReward, 0);

      const winSave = SaveManager.getInstance().load();
      assertOk(winSave);
      assertEqual(winSave.defenseRecord.bestKills, 24);
      assertEqual(winSave.defenseRecord.bestWave, 20);
      assertEqual(winSave.spiritEssence, 0);
    },
  },
  {
    name: '取经模式胜利按剩余血量保存星级，失败不覆盖进度',
    run: () => {
      resetRuntime();
      const levelData = LevelData.getInstance();
      levelData.currentLevel = 1;
      levelData.levelStars = new Map();
      levelData.clearedLevels = new Set();

      const failed = settleBattleResult({
        mode: GameMode.JOURNEY,
        victory: false,
        currentLevel: 1,
        monkHp: 0,
        totalKills: 4,
        waveNumber: 2,
      });
      assertEqual(failed.stars, 0);
      assertEqual(failed.spiritEssenceReward, 0);
      assertEqual(levelData.getStars(1), 0);
      assertEqual(levelData.isCleared(1), false);

      const cleared = settleBattleResult({
        mode: GameMode.JOURNEY,
        victory: true,
        currentLevel: 1,
        monkHp: 2,
        totalKills: 12,
        waveNumber: 5,
      });
      assertEqual(cleared.stars, calculateJourneyStars(true, 2));
      assertEqual(cleared.spiritEssenceReward, calculateSpiritEssenceReward(1, 2));
      assertEqual(levelData.getStars(1), 2);
      assertEqual(levelData.isCleared(1), true);
      assertEqual(levelData.isUnlocked(2), true);
      assertEqual(SaveManager.getInstance().load()?.spiritEssence, calculateSpiritEssenceReward(1, 2));
    },
  },
  {
    name: '守护模式前 10 波节奏满足轻压起步、首个精英和首个 BOSS 节点',
    run: () => {
      const firstWave = DEFENSE_WAVES[0];
      const fifthWave = DEFENSE_WAVES[4];
      const tenthWave = DEFENSE_WAVES[9];
      const totalSpawnDuration = DEFENSE_WAVES.reduce((sum, wave) => sum + estimateWaveSpawnDuration(wave), 0);

      assertOk(firstWave.enemies.every(group => !group.enemyId.startsWith('elite_') && !group.enemyId.startsWith('boss_')));
      assertOk(firstWave.enemies.reduce((sum, group) => sum + group.count, 0) <= 6);
      assertOk(fifthWave.enemies.some(group => group.enemyId.startsWith('elite_')));
      assertOk(tenthWave.enemies.some(group => group.enemyId.startsWith('boss_')));
      assertOk(totalSpawnDuration >= 180 && totalSpawnDuration <= 480);
    },
  },
  {
    name: '击杀仙桃奖励按普通、精英和 Boss 威胁分层',
    run: () => {
      assertEqual(getKillPeachReward(EnemyType.NORMAL), 3);
      assertEqual(getKillPeachReward(EnemyType.ELITE), 12);
      assertEqual(getKillPeachReward(EnemyType.BOSS), 45);
    },
  },
  {
    name: '灵蕴公式按关卡、星级和 Boss 关计算',
    run: () => {
      assertEqual(calculateSpiritEssenceReward(1, 1), 2);
      assertEqual(calculateSpiritEssenceReward(1, 2), 22);
      assertEqual(calculateSpiritEssenceReward(1, 3), 52);
      assertEqual(calculateSpiritEssenceReward(9, 1), 48);
      assertEqual(calculateSpiritEssenceReward(9, 2), 68);
      assertEqual(calculateSpiritEssenceReward(9, 3), 98);
      assertEqual(calculateSpiritEssenceReward(27, 3), 134);
      assertEqual(calculateSpiritEssenceReward(81, 3), 242);
    },
  },
  {
    name: '法宝初始解锁、升级消耗灵蕴并持久化',
    run: () => {
      resetRuntime();
      const manager = SaveManager.getInstance();
      const save = manager.createDefault();
      save.spiritEssence = ARTIFACT_UPGRADE_COST[2] + ARTIFACT_UPGRADE_COST[3];
      manager.save(save);

      const artifactData = ArtifactData.getInstance();
      artifactData.loadFromSave();
      artifactData.ensureDefaults();

      assertEqual(ARTIFACT_CONFIGS.length, 12);
      assertEqual(artifactData.isUnlocked(ArtifactId.AXE), true);
      assertEqual(artifactData.isUnlocked(ArtifactId.HEADBAND), false);
      assertEqual(artifactData.getLevel(ArtifactId.AXE), 1);
      assertEqual(artifactData.upgrade(ArtifactId.AXE), true);
      assertEqual(artifactData.getLevel(ArtifactId.AXE), 2);
      assertEqual(manager.load()?.spiritEssence, ARTIFACT_UPGRADE_COST[3]);
      assertEqual(artifactData.upgrade(ArtifactId.AXE), true);
      assertEqual(artifactData.getLevel(ArtifactId.AXE), 3);
      assertEqual(manager.load()?.spiritEssence, 0);
      assertEqual(artifactData.upgrade(ArtifactId.AXE), false);
    },
  },
  {
    name: '初始英雄和章节解锁英雄、法宝按文档推进',
    run: () => {
      resetRuntime();
      const heroData = HeroData.getInstance();
      heroData.ensureDefaults();

      assertEqual(heroData.get('zhubajie').unlocked, true);
      assertEqual(heroData.get('bailongma').unlocked, true);
      assertEqual(heroData.get('taishanglaojun').unlocked, true);
      assertEqual(heroData.get('heixiongjing').unlocked, true);
      assertEqual(heroData.get('tuotatianwang').unlocked, true);
      assertEqual(heroData.get('sunwukong').unlocked, false);

      assertEqual(heroData.awardChapterClear(1), 'sunwukong');
      assertEqual(heroData.awardChapterClear(2), 'shawujing');
      assertEqual(heroData.awardChapterClear(9), 'nezha');

      const artifactData = ArtifactData.getInstance();
      assertEqual(artifactData.awardChapterClear(1), ArtifactId.HEADBAND);
      assertEqual(artifactData.awardChapterClear(2), ArtifactId.SKULL_BEADS);
      assertEqual(artifactData.awardChapterClear(9), ArtifactId.KASAYA);
      assertEqual(getArtifactCarrySlotCount(0), 3);
      assertEqual(getArtifactCarrySlotCount(3), 4);
      assertEqual(getArtifactCarrySlotCount(6), 5);
      assertEqual(getArtifactCarrySlotCount(9), 6);
    },
  },
  {
    name: 'Defense 段位只由最高波次决定',
    run: () => {
      assertEqual(getDefenseRankByWave(0).name, '凡修');
      assertEqual(getDefenseRankByWave(5).name, '天兵');
      assertEqual(getDefenseRankByWave(10).name, '天将');
      assertEqual(getDefenseRankByWave(20).name, '散仙');
      assertEqual(getDefenseRankByWave(25).name, '真君');
      assertEqual(getDefenseRankByWave(30).name, '金仙');
      assertEqual(getDefenseRankByWave(35).name, '天尊');
      assertEqual(getDefenseRankByWave(40).name, '大圣');
      assertEqual(getDefenseRankByWave(50).name, '天帝');
    },
  },
  {
    name: 'Defense 排行榜按波次、击杀和时间排序',
    run: () => {
      const a: DefenseRecord = { bestWave: 20, bestKills: 100, achievedAt: 3000 };
      const b: DefenseRecord = { bestWave: 21, bestKills: 1, achievedAt: 4000 };
      const c: DefenseRecord = { bestWave: 20, bestKills: 120, achievedAt: 5000 };
      const d: DefenseRecord = { bestWave: 20, bestKills: 100, achievedAt: 1000 };

      assertOk(compareDefenseRecords(b, a) < 0);
      assertOk(compareDefenseRecords(c, a) < 0);
      assertOk(compareDefenseRecords(d, a) < 0);
      assertEqual(isBetterDefenseRecord(a, b), false);

      resetRuntime();
      const service = LeaderboardService.getInstance();
      service.updatePersonalDefenseRecord(10, 50, 3000);
      service.updatePersonalDefenseRecord(10, 40, 1000);
      assertEqual(service.getPersonalRecord().bestKills, 50);
      service.updatePersonalDefenseRecord(10, 60, 5000);
      assertEqual(service.getPersonalRecord().bestKills, 60);
    },
  },
  {
    name: '9 套棋盘模板路径连续，初始开放 5-6 格并靠近出兵口',
    run: () => {
      assertEqual(BOARD_TEMPLATES.length, 9);
      for (const template of BOARD_TEMPLATES) {
        const pathKeys = new Set(template.path.map(cell => `${cell.row},${cell.col}`));
        const lockedKeys = getLockedCellsForTemplate(template).map(([row, col]) => `${row},${col}`);
        const openCells = getInitialOpenCells(template);
        const earlyPath = template.path.slice(0, 4);
        const rowSpan = Math.max(...template.path.map(cell => cell.row)) - Math.min(...template.path.map(cell => cell.row)) + 1;
        const colSpan = Math.max(...template.path.map(cell => cell.col)) - Math.min(...template.path.map(cell => cell.col)) + 1;

        assertEqual(pathKeys.size, template.path.length, `${template.id} 路径不能重复经过同一格`);
        assertOk(getMaxDistanceToPath(template) <= 4, `${template.id} 所有可用格到路径的曼哈顿距离必须 <= 4`);
        assertOk(isContinuousPath(template.path), `${template.id} 路径必须连续`);
        assertOk(openCells.length === 5 || openCells.length === 6, `${template.id} 初始开放格数量应为 5-6`);
        assertOk(rowSpan >= Math.ceil(template.rows * 0.6) || colSpan >= Math.ceil(template.cols * 0.6), `${template.id} 路径跨度不足`);
        for (const cell of template.path) {
          assertOk(cell.row >= 0 && cell.row < template.rows && cell.col >= 0 && cell.col < template.cols, `${template.id} 路径越界`);
        }
        for (const cell of openCells) {
          assertOk(!pathKeys.has(`${cell.row},${cell.col}`), `${template.id} 开放格不能压路径`);
          const nearEntrance = earlyPath.some(pathCell => Math.abs(pathCell.row - cell.row) + Math.abs(pathCell.col - cell.col) <= 2);
          assertOk(nearEntrance, `${template.id} 开放格应靠近出兵口`);
        }
        for (const lockedKey of lockedKeys) {
          assertOk(!pathKeys.has(lockedKey), `锁定格 ${lockedKey} 不应压在妖怪路线上`);
        }
      }
    },
  },
  {
    name: '小兵合成会升级保留格并移除相邻同名同阶小兵',
    run: () => {
      resetRuntime();
      const cells = createCells(2, 2);
      const kept = occupy(cells[0][0], { type: 'monkey', rank: SoldierRank.WHITE });
      const removed = occupy(cells[0][1], { type: 'monkey', rank: SoldierRank.WHITE });
      let upgradedCell: CellData | null = null;
      let upgradedRank = 0;
      let removedCell: CellData | null = null;

      const merged = MergeSystem.getInstance().checkMerge(
        cells,
        0,
        0,
        cell => cell.occupant as { type: string; rank: number } | null,
        (cell, newRank) => {
          upgradedCell = cell;
          upgradedRank = newRank;
        },
        cell => {
          removedCell = cell;
        },
      );

      assertEqual(merged, true);
      assertEqual(upgradedCell, kept);
      assertEqual(upgradedRank, SoldierRank.GREEN);
      assertEqual(removedCell, removed);
    },
  },
  {
    name: '小兵最高阶不会继续合成',
    run: () => {
      const cells = createCells(1, 2);
      occupy(cells[0][0], { type: 'monkey', rank: SoldierRank.ORANGE });
      occupy(cells[0][1], { type: 'monkey', rank: SoldierRank.ORANGE });
      let callbackCalled = false;

      const merged = MergeSystem.getInstance().checkMerge(
        cells,
        0,
        0,
        cell => cell.occupant as { type: string; rank: number } | null,
        () => { callbackCalled = true; },
        () => { callbackCalled = true; },
      );

      assertEqual(merged, false);
      assertEqual(callbackCalled, false);
    },
  },
  {
    name: '一格攻击范围会覆盖相邻格中心距离',
    run: () => {
      const cellSize = 80;
      const gap = 3;
      const adjacentCenterDistance = getCellStep(cellSize, gap);
      const meleeRange = getAttackRangePixels(1, cellSize, gap);

      assertOk(meleeRange >= adjacentCenterDistance);
    },
  },
  {
    name: '经验分配区分击杀、助攻和光环经验',
    run: () => {
      const expSystem = ExperienceSystem.getInstance();
      expSystem.clear();

      const killer = new FakeHero('sunwukong');
      const assist = new FakeHero('zhubajie');
      const support = new FakeHero('guanyin', true);
      expSystem.registerHero(killer);
      expSystem.registerHero(assist);
      expSystem.registerHero(support);

      expSystem.distribute(100, 40, 20, killer, [killer, assist]);

      assertEqual(killer.exp, 100);
      assertEqual(assist.exp, 40);
      assertEqual(support.exp, 20);
      expSystem.clear();
    },
  },
  {
    name: '存档可写入、读取，并刷新版本和最后游玩时间',
    run: () => {
      platformStorage.removeItem(SAVE_KEY);
      const manager = SaveManager.getInstance();
      const save = manager.createDefault();
      const before = Date.now();
      save.spiritEssence = 88;
      save.defenseRecord = { bestWave: 12, bestKills: 88, achievedAt: before };

      manager.save(save);
      const loaded = manager.load();

      assertOk(loaded);
      assertEqual(loaded.spiritEssence, 88);
      assertEqual(loaded.defenseRecord.bestKills, 88);
      assertEqual(loaded.defenseRecord.bestWave, 12);
      assertOk(loaded.artifacts.unlocked.includes(ArtifactId.AXE));
      assertEqual(loaded.version, 3);
      assertOk(loaded.lastPlayTime >= before);
    },
  },
  {
    name: '关闭游戏后重新加载会保留关卡和英雄进度',
    run: () => {
      platformStorage.removeItem(SAVE_KEY);

      const levelData = LevelData.getInstance();
      levelData.currentLevel = 1;
      levelData.levelStars = new Map();
      levelData.clearedLevels = new Set();

      const heroData = HeroData.getInstance();
      (heroData as unknown as { _heroes: Map<string, HeroRuntimeData> })._heroes = new Map();

      levelData.onLevelCleared(1, 3);
      heroData.addShards('sunwukong', 5);
      assertOk(heroData.upgradeStar('sunwukong'));

      levelData.currentLevel = 1;
      levelData.levelStars = new Map();
      levelData.clearedLevels = new Set();
      (heroData as unknown as { _heroes: Map<string, HeroRuntimeData> })._heroes = new Map();

      levelData.loadFromSave();
      heroData.loadFromSave();

      const reloadedHero = heroData.get('sunwukong');
      assertEqual(levelData.currentLevel, 2);
      assertEqual(levelData.getStars(1), 3);
      assertEqual(levelData.isCleared(1), true);
      assertEqual(reloadedHero.shardCount, 5);
      assertEqual(reloadedHero.starLevel, 2);
    },
  },
  {
    name: '关卡星级只升不降，3 星后允许扫荡并解锁下一关',
    run: () => {
      platformStorage.removeItem(SAVE_KEY);
      const levelData = LevelData.getInstance();
      levelData.currentLevel = 1;
      levelData.levelStars = new Map();
      levelData.clearedLevels = new Set();

      levelData.onLevelCleared(1, 2);
      assertEqual(levelData.currentLevel, 2);
      assertEqual(levelData.getStars(1), 2);
      assertEqual(levelData.canSweep(1), false);

      levelData.onLevelCleared(1, 1);
      assertEqual(levelData.getStars(1), 2);

      levelData.onLevelCleared(1, 3);
      assertEqual(levelData.getStars(1), 3);
      assertEqual(levelData.canSweep(1), true);
      assertEqual(levelData.isUnlocked(2), true);
    },
  },
  {
    name: '八十一难配置包含 81 关并按每 9 难切换章节 BOSS',
    run: () => {
      assertEqual(JOURNEY_LEVELS.length, 81);
      const ninth = getJourneyLevel(9);
      const eighteenth = getJourneyLevel(18);
      const eightyFirst = getJourneyLevel(81);

      assertOk(ninth);
      assertOk(eighteenth);
      assertOk(eightyFirst);
      assertEqual(ninth.chapter, 1);
      assertEqual(eighteenth.chapter, 2);
      assertEqual(eightyFirst.chapter, 9);
      assertOk(ninth.waves.some(wave => wave.enemies.some(enemy => enemy.enemyId.startsWith('boss_'))));
      assertOk(eighteenth.waves.some(wave => wave.enemies.some(enemy => enemy.enemyId.startsWith('boss_'))));
      assertOk(eightyFirst.waves.some(wave => wave.enemies.some(enemy => enemy.enemyId.startsWith('boss_'))));
    },
  },
  {
    name: '八十一难章节 Boss 覆盖 7 个 Boss 且精英覆盖 4 种能力',
    run: () => {
      const expectedBossIds = [
        'boss_heixiongjing',
        'boss_jinjiao',
        'boss_honghaier',
        'boss_baigufuren',
        'boss_qingshi',
        'boss_baixiang',
        'boss_dapengjinchi',
      ];
      const expectedEliteIds = ['elite_huangfeng', 'elite_huli', 'elite_kuangtou', 'elite_dapeng'];
      const bossIds = new Set(
        JOURNEY_LEVELS
          .filter(level => level.levelId % 9 === 0)
          .flatMap(level => level.waves.flatMap(wave => wave.enemies.map(enemy => enemy.enemyId)))
          .filter(enemyId => enemyId.startsWith('boss_')),
      );
      const eliteIds = new Set(
        JOURNEY_LEVELS
          .flatMap(level => level.waves.flatMap(wave => wave.enemies.map(enemy => enemy.enemyId)))
          .filter(enemyId => enemyId.startsWith('elite_')),
      );

      for (const bossId of expectedBossIds) {
        assertOk(bossIds.has(bossId), `八十一难 Boss 轮换应包含 ${bossId}`);
      }
      for (const eliteId of expectedEliteIds) {
        assertOk(eliteIds.has(eliteId), `八十一难精英轮换应包含 ${eliteId}`);
      }
    },
  },
  {
    name: '八十一难后期用章节倍率替代堆怪数量',
    run: () => {
      const eightyFirst = getJourneyLevel(81);
      assertOk(eightyFirst);

      const firstGroup = eightyFirst.waves[0].enemies[0];
      const maxGroupCount = Math.max(...eightyFirst.waves.flatMap(wave => wave.enemies).map(enemy => enemy.count));

      assertEqual(firstGroup.count, 12);
      assertEqual(firstGroup.hpMultiplier, 3.6);
      assertOk(Math.abs((firstGroup.attackMultiplier ?? 0) - 1.91) < 0.001);
      assertOk(maxGroupCount <= 15);
    },
  },
  {
    name: 'Defense 无尽模式精英和 Boss 会完整轮换',
    run: () => {
      const expectedEliteIds = ['elite_huangfeng', 'elite_huli', 'elite_kuangtou', 'elite_dapeng'];
      const expectedBossIds = [
        'boss_heixiongjing',
        'boss_jinjiao',
        'boss_honghaier',
        'boss_baigufuren',
        'boss_qingshi',
        'boss_baixiang',
        'boss_dapengjinchi',
      ];
      const eliteIds = new Set(
        Array.from({ length: 16 }, (_, index) => createEndlessWave(21 + index))
          .flatMap(wave => wave.enemies.map(enemy => enemy.enemyId))
          .filter(enemyId => enemyId.startsWith('elite_')),
      );
      const bossIds = new Set(
        Array.from({ length: expectedBossIds.length }, (_, index) => createEndlessWave(30 + index * 10))
          .flatMap(wave => wave.enemies.map(enemy => enemy.enemyId))
          .filter(enemyId => enemyId.startsWith('boss_')),
      );

      for (const eliteId of expectedEliteIds) {
        assertOk(eliteIds.has(eliteId), `无尽精英轮换应包含 ${eliteId}`);
      }
      assertEqual(JSON.stringify(Array.from(bossIds)), JSON.stringify(expectedBossIds));
    },
  },
  {
    name: '守护模式会在 20 波后进入无尽波次',
    run: () => {
      const mainSource = readRepoFile('src/main.ts');
      assertOk(mainSource.includes('this.waveSystem?.start(true);'), '守护模式应启动无尽波次');
      assertEqual(mainSource.includes('this.waveSystem?.start(false);'), false);
    },
  },
  {
    name: '敌人配置声明的精英和 Boss 技能都有代码分支承接',
    run: () => {
      const enemySource = readRepoFile('src/entities/Enemy.ts');
      const battleSource = readRepoFile('src/systems/BattleSystem.ts');
      const expectedAbilityIds = [
        'stun_attack',
        'dodge',
        'trample',
        'speed_aura',
        'summon_minions',
        'transform',
        'fear_roar',
        'charge',
        'trample_aoe',
        'damage_resist',
        'flight_speed',
        'wind_slash',
      ];

      for (const abilityId of expectedAbilityIds) {
        const handled = enemySource.includes(`abilities.includes('${abilityId}')`) || battleSource.includes(`abilities.includes('${abilityId}')`);
        assertOk(handled, `${abilityId} 应有战斗逻辑分支`);
      }
      assertOk(enemySource.includes('finalAmount * 0.72'), '白象 damage_resist 应降低受到的伤害');
      assertOk(enemySource.includes("abilities.includes('trample_aoe')"), '白象 trample_aoe 应触发范围伤害');
      assertOk(enemySource.includes("if (this._isTransformed) return;"), '白骨夫人变形期间应不可被攻击');
    },
  },
  {
    name: '唐僧回血和攻击光环按全图覆盖，不再按距离裁剪',
    run: () => {
      const source = readRepoFile('src/entities/TangMonk.ts');
      const updateAuraBody = source.slice(source.indexOf('updateAura'), source.indexOf('boostAura'));

      assertOk(updateAuraBody.includes('for (const ally of allies)'), '唐僧光环应遍历全部友方');
      assertOk(updateAuraBody.includes('ally.heal'), '唐僧光环应全图回血');
      assertOk(updateAuraBody.includes('ally.applyAttackBonus'), '唐僧攻击光环应全图加攻');
      assertEqual(updateAuraBody.includes('Math.sqrt'), false, '唐僧光环不应在 updateAura 中按距离裁剪');
      assertEqual(updateAuraBody.includes('auraRadius'), false, '唐僧光环不应在 updateAura 中计算半径');
      assertOk(source.includes('missingRatio * 0.018'), '唐僧回血应保留当前动态缺血倍率公式');
    },
  },
  {
    name: '同名英雄只能低等级拖到高等级上并且只升一级',
    run: () => {
      const low = { heroId: 'sunwukong', level: 1, maxLevel: 15 };
      const high = { heroId: 'sunwukong', level: 7, maxLevel: 15 };
      const six = { heroId: 'sunwukong', level: 6, maxLevel: 15 };
      const other = { heroId: 'zhubajie', level: 1, maxLevel: 10 };
      const maxed = { heroId: 'sunwukong', level: 15, maxLevel: 15 };

      assertEqual(canMergeHeroForUpgrade(low, high), true);
      assertEqual(getMergedHeroLevel(low, high), 8);
      assertEqual(canMergeHeroForUpgrade(high, low), false);
      assertEqual(canMergeHeroForUpgrade(six, high), true);
      assertEqual(getMergedHeroLevel(six, high), 8);
      assertEqual(canMergeHeroForUpgrade(other, high), false);
      assertEqual(canMergeHeroForUpgrade(low, maxed), false);
    },
  },
];

function resetRuntime(): void {
  eventMgr.clear();
  platformStorage.removeItem(SAVE_KEY);
  const levelData = LevelData.getInstance();
  levelData.currentLevel = 1;
  levelData.levelStars = new Map();
  levelData.clearedLevels = new Set();
  (HeroData.getInstance() as unknown as { _heroes: Map<string, HeroRuntimeData> })._heroes = new Map();
  ArtifactData.getInstance().loadFromSave();
}

let passed = 0;
for (const test of tests) {
  test.run();
  passed++;
  console.log(`✓ ${test.name}`);
}

console.log(`\n${passed}/${tests.length} tests passed`);
