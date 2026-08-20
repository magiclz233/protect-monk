import { gameMgr } from '../src/core/GameManager';
import { eventMgr, GameEvent } from '../src/core/EventManager';
import { platformStorage } from '../src/platform/PlatformStorage';
import { SaveManager } from '../src/data/SaveManager';
import { LevelData } from '../src/data/LevelData';
import { HeroData, HeroRuntimeData } from '../src/data/HeroData';
import { ArtifactData } from '../src/data/ArtifactData';
import { AD_UNIT_IDS } from '../src/config/AdConfig';
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
import { artifactKey, getAllStaticAssets, itemKey } from '../src/render/AssetKeys';
import { HERO_CONFIGS, getHeroConfig, toHeroStats } from '../src/config/HeroConfig';
import { generateSoldierConfig } from '../src/config/SoldierConfig';
import {
  ATTACK_EFFECT_VISUALS,
  ENEMY_VISUALS,
  ENEMY_TYPE_FALLBACK_VISUALS,
  HERO_VISUALS,
  ITEM_VISUALS,
  RANK_VISUALS,
  SOLDIER_VISUALS,
  VISUAL_PALETTE,
} from '../src/config/VisualConfig';
import { ExperienceSystem, IExperienceTarget } from '../src/systems/ExperienceSystem';
import { AdSystem } from '../src/systems/AdSystem';
import { ActiveFireCell, ChapterMechanicSystem, CompositeMechanicManager } from '../src/systems/ChapterMechanicSystem';
import {
  getGlobalHealMultiplier,
  getGlobalSpeedMultiplier,
  setGlobalHealMultiplier,
  setGlobalSpeedMultiplier,
} from '../src/systems/MechanicState';
import {
  canStoreInInventory,
  getHeroShardNeed,
  INITIAL_INVENTORY_SLOT_LIMIT,
  MAX_INVENTORY_SLOT_LIMIT,
  pickHeroShardConsumption,
} from '../src/systems/InventoryLogic';
import { canMergeHeroForUpgrade, getMergedHeroLevel } from '../src/systems/HeroUpgradeLogic';
import { canUseUniversalShardCount } from '../src/systems/InventoryLogic';
import { MergeSystem } from '../src/systems/MergeSystem';
import { WaveSystem } from '../src/systems/WaveSystem';
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
import { Enemy } from '../src/entities/Enemy';
import { Unit } from '../src/entities/Unit';
import { ArtifactId, AttackType, CardType, CellData, CellState, DefenseRecord, EnemyType, GameMode, GameState, ItemId, SoldierRank, SoldierType, WaveConfig } from '../src/types';

declare const require: (id: string) => any;
declare const process: { cwd: () => string; exitCode?: number };

const { existsSync, readFileSync } = require('node:fs') as {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: string) => string;
};
const { join } = require('node:path') as { join: (...parts: string[]) => string };

type TestCase = {
  name: string;
  run: () => void | Promise<void>;
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

function createBareUnit(attack: number = 100): Unit {
  const unit = Object.create(Unit.prototype) as Unit;
  Object.assign(unit, {
    attack,
    _attackBuffs: new Map<string, { bonus: number; remaining: number }>(),
    _damageReductionBuffs: new Map<string, { reduction: number; remaining: number }>(),
    _invincibleBuffs: new Map<string, number>(),
    _fireImmunityBuffs: new Map<string, number>(),
    _shieldBuffs: new Map<string, { amount: number; remaining: number }>(),
    _hotEffects: new Map<string, { rate: number; remaining: number; tickTimer: number }>(),
    _stunTimer: 0,
  });
  return unit;
}

function createBareEnemy(): Enemy {
  const enemy = Object.create(Enemy.prototype) as Enemy;
  Object.assign(enemy, {
    enemyId: 'xiaoyao_1',
    currentHp: 1,
    maxHp: 1,
    abilities: [],
    damagedByHeroes: new Set(),
    attackTargetedHeroes: new Set(),
    lastAttacker: null,
    _alive: true,
    _isTransformed: false,
    _shieldTimer: 0,
    _vulnerabilityBuffs: new Map<string, { bonus: number; remaining: number }>(),
    _updateHpBar: () => undefined,
    sprite: { setVisible: () => undefined },
  });
  return enemy;
}

function createMechanicGrid(cells: CellData[][]) {
  return {
    rows: cells.length,
    cols: cells[0]?.length ?? 0,
    cellSize: 80,
    scene: {
      add: {
        graphics: () => ({
          setDepth() { return this; },
          clear() { return this; },
          fillStyle() { return this; },
          fillRoundedRect() { return this; },
          lineStyle() { return this; },
          strokeRoundedRect() { return this; },
          fillCircle() { return this; },
          destroy() { return undefined; },
        }),
      },
    },
    getCell: (row: number, col: number) => cells[row]?.[col] ?? null,
    isPathCell: () => false,
    cellCenter: (row: number, col: number) => ({ x: col * 80 + 40, y: row * 80 + 40 }),
  };
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
    name: '激励广告请求全局串行并在关闭后释放锁',
    run: async () => {
      type CloseHandler = (res: { isEnded?: boolean }) => void;
      type ErrorHandler = (error: unknown) => void;
      type TestWxApi = {
        createCanvas: () => HTMLCanvasElement;
        createRewardedVideoAd: () => {
          load: () => Promise<void>;
          show: () => Promise<void>;
          onClose: (handler: CloseHandler) => void;
          offClose: (handler: CloseHandler) => void;
          onError: (handler: ErrorHandler) => void;
          offError: (handler: ErrorHandler) => void;
        };
      };

      const runtime = globalThis as typeof globalThis & { wx?: TestWxApi };
      const originalWx = runtime.wx;
      const originalAdUnitId = AD_UNIT_IDS.rewarded.extraSummon;
      const adSystem = AdSystem.getInstance();
      const internals = adSystem as unknown as {
        _rewardedAds: Map<unknown, unknown>;
        _rewardedVideoPending: boolean;
      };
      const handlers: { close: CloseHandler | null; error: ErrorHandler | null } = {
        close: null,
        error: null,
      };
      let createCount = 0;
      const rewardedAd = {
        load: async (): Promise<void> => undefined,
        show: async (): Promise<void> => undefined,
        onClose: (handler: CloseHandler): void => { handlers.close = handler; },
        offClose: (handler: CloseHandler): void => {
          if (handlers.close === handler) handlers.close = null;
        },
        onError: (handler: ErrorHandler): void => { handlers.error = handler; },
        offError: (handler: ErrorHandler): void => {
          if (handlers.error === handler) handlers.error = null;
        },
      };

      try {
        AD_UNIT_IDS.rewarded.extraSummon = 'test-rewarded-ad';
        runtime.wx = {
          createCanvas: () => ({}) as HTMLCanvasElement,
          createRewardedVideoAd: () => {
            createCount++;
            return rewardedAd;
          },
        };
        internals._rewardedAds.clear();
        internals._rewardedVideoPending = false;

        const first = adSystem.showRewardedVideo('extraSummon');
        const concurrent = adSystem.showRewardedVideo('extraSummon');
        assertEqual(await concurrent, false, '并发请求应立即失败');
        assertEqual(createCount, 1, '并发请求不应重复创建广告对象');
        const firstCloseHandler = handlers.close;
        assertOk(firstCloseHandler, '首个请求应注册关闭回调');
        firstCloseHandler({ isEnded: true });
        assertEqual(await first, true);

        const next = adSystem.showRewardedVideo('extraSummon');
        const nextCloseHandler = handlers.close;
        assertOk(nextCloseHandler, '首个请求结束后应允许下一次请求');
        nextCloseHandler({ isEnded: false });
        assertEqual(await next, false, '未完整观看不应发放奖励');
      } finally {
        AD_UNIT_IDS.rewarded.extraSummon = originalAdUnitId;
        if (originalWx) {
          runtime.wx = originalWx;
        } else {
          delete runtime.wx;
        }
        internals._rewardedAds.clear();
        internals._rewardedVideoPending = false;
      }
    },
  },
  {
    name: '广告召唤和碎片回调会校验生命周期并重新寻找空槽',
    run: () => {
      const source = readRepoFile('src/ui/SummonPanel.ts');
      const summonBody = source.slice(
        source.indexOf('private async _summonByAd'),
        source.indexOf('private async _grantUniversalShardByAd'),
      );
      const shardBody = source.slice(
        source.indexOf('private async _grantUniversalShardByAd'),
        source.indexOf('private _renderCards'),
      );
      const destroyBody = source.slice(source.indexOf('destroy(): void'), source.indexOf('setSummonEnabled'));

      const summonAwait = summonBody.indexOf("await AdSystem.getInstance().showRewardedVideo('extraSummon')");
      assertOk(summonBody.includes('this._destroyed || this._rewardPending'), '广告按钮应阻止重复请求');
      assertOk(summonBody.indexOf('requestId !== this._rewardRequestId') > summonAwait, '召唤回调应校验请求令牌');
      assertOk(summonBody.lastIndexOf('this._isInteractionLocked()') > summonAwait, '召唤回调应重新校验游戏状态');
      assertOk(summonBody.indexOf('summonFree()') > summonAwait, '奖励只能在广告完成后发放');

      const shardAwait = shardBody.indexOf("await AdSystem.getInstance().showRewardedVideo('universalShard')");
      const refreshedSlot = shardBody.indexOf('this._cards.findIndex', shardAwait);
      assertOk(shardBody.indexOf('requestId !== this._rewardRequestId') > shardAwait, '碎片回调应校验请求令牌');
      assertOk(refreshedSlot > shardAwait, '碎片回调应重新寻找空槽');
      assertOk(shardBody.indexOf('this._setCardAtSlot', refreshedSlot) > refreshedSlot, '碎片应放入回调时找到的空槽');
      assertOk(destroyBody.includes('this._rewardRequestId++'), '销毁面板应使在途请求过期');
      assertOk(destroyBody.includes('this._tipTimer?.remove(false)'), '销毁面板应清理提示计时器');
    },
  },
  {
    name: '广告扩容防止重复请求并在回调后复核状态',
    run: () => {
      const source = readRepoFile('src/ui/InventoryBarView.ts');
      const expandBody = source.slice(source.indexOf('private async _expandSlot'), source.indexOf('private _updateHighlight'));
      const destroyBody = source.slice(source.indexOf('destroy(): void'), source.indexOf('containsPoint'));
      const adAwait = expandBody.indexOf("await AdSystem.getInstance().showRewardedVideo('extraSummon')");
      const stateRecheck = expandBody.lastIndexOf('this._isInteractionLocked()');
      const limitRecheck = expandBody.lastIndexOf('this._slotLimit >= MAX_INVENTORY_SLOT_LIMIT');
      const increment = expandBody.indexOf('this._slotLimit++');

      assertOk(expandBody.includes('this._destroyed || this._expandPending'), '扩容按钮应阻止重复请求');
      assertOk(expandBody.indexOf('requestId !== this._expandRequestId') > adAwait, '扩容回调应校验请求令牌');
      assertOk(stateRecheck > adAwait && stateRecheck < increment, '扩容前应重新校验游戏状态');
      assertOk(limitRecheck > adAwait && limitRecheck < increment, '扩容前应重新校验槽位上限');
      assertOk(destroyBody.includes('this._expandRequestId++'), '销毁仓库栏应使在途请求过期');
      assertOk(destroyBody.includes('this._tipTimer?.remove(false)'), '销毁仓库栏应清理提示计时器');
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
        const visual = ENEMY_VISUALS[enemy.enemyId] ?? ENEMY_TYPE_FALLBACK_VISUALS[enemy.type];
        assertOk(visual, `${enemy.name} 应有专属或类型回退视觉配置`);
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
    name: '静态素材清单的纹理键唯一且文件全部存在',
    run: () => {
      const assets = getAllStaticAssets();
      const keys = new Set(assets.map(asset => asset.key));

      assertEqual(keys.size, assets.length, '静态素材纹理键不能重复');
      assertOk(itemKey('kaishanfu') !== artifactKey('kaishanfu'), '同名道具和法宝应使用不同纹理键');
      assertOk(itemKey('jinguzhou') !== artifactKey('jinguzhou'), '同名道具和法宝应使用不同纹理键');

      for (const asset of assets) {
        const absolutePath = join(process.cwd(), 'public', asset.path);
        assertOk(existsSync(absolutePath), `静态素材不存在：${asset.path}`);
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
    name: '损坏存档会逐层规范化而不会污染运行时数据',
    run: () => {
      platformStorage.setItem(SAVE_KEY, JSON.stringify({
        version: 3,
        lastPlayTime: '昨天',
        spiritEssence: '很多',
        artifacts: {
          unlocked: 42,
          levels: { kaishanfu: '3', huishanfu: 9, invalid: 2 },
          loadout: ['kaishanfu', 'kaishanfu', 'invalid'],
        },
        journeyProgress: {
          currentLevel: 999,
          currentLoop: -3,
          highestClearedLoop: null,
          levelStars: { 0: 2, 1: 7, 2: -1, 3: '3', 82: 1 },
          loopLevelStars: { '1:1': 8, '2:2': -4, '0:1': 3, '2:82': 3, invalid: 3 },
          clearedLevels: [2, 1, 1, 0, 82, 2.5, '3'],
          revealedChapterRewards: [2, 1, 1, 0, 10, '3'],
        },
        heroStars: {
          sunwukong: { heroId: 'wrong', starLevel: 99, shardCount: -10, unlocked: 'false' },
          guanyin: { heroId: 'wrong', starLevel: 3.9, shardCount: 4.8, unlocked: true },
          zhubajie: null,
          unknown: { heroId: 'unknown', starLevel: 2, shardCount: 1, unlocked: true },
        },
        defenseRecord: { bestWave: '20', bestKills: -4, achievedAt: null },
        defenseHighScore: 12,
        defenseBestWave: 8,
      }));

      const loaded = SaveManager.getInstance().load();

      assertOk(loaded);
      assertEqual(loaded.spiritEssence, 0);
      assertEqual(loaded.journeyProgress.currentLevel, 81);
      assertEqual(loaded.journeyProgress.currentLoop, 1);
      assertEqual(JSON.stringify(loaded.journeyProgress.levelStars), JSON.stringify({ 1: 3, 2: 0 }));
      assertEqual(JSON.stringify(loaded.journeyProgress.loopLevelStars), JSON.stringify({ '1:1': 3, '2:2': 0 }));
      assertEqual(JSON.stringify(loaded.journeyProgress.clearedLevels), JSON.stringify([1, 2]));
      assertEqual(JSON.stringify(loaded.journeyProgress.revealedChapterRewards), JSON.stringify([1, 2]));
      assertEqual(loaded.heroStars.sunwukong.heroId, 'sunwukong');
      assertEqual(loaded.heroStars.sunwukong.starLevel, 5);
      assertEqual(loaded.heroStars.sunwukong.shardCount, 0);
      assertEqual(loaded.heroStars.sunwukong.unlocked, false);
      assertEqual(loaded.heroStars.guanyin.starLevel, 3);
      assertEqual(loaded.heroStars.guanyin.shardCount, 4);
      assertEqual(loaded.heroStars.guanyin.unlocked, true);
      assertEqual('zhubajie' in loaded.heroStars, false);
      assertEqual('unknown' in loaded.heroStars, false);
      assertEqual(loaded.defenseRecord.bestWave, 8);
      assertEqual(loaded.defenseRecord.bestKills, 0);
      assertEqual(loaded.defenseHighScore, 12);
      assertEqual(loaded.artifacts.levels.huishanfu, 3);
      assertEqual(loaded.artifacts.levels.kaishanfu, 1);
      assertEqual(JSON.stringify(loaded.artifacts.loadout), JSON.stringify([ArtifactId.AXE]));
    },
  },
  {
    name: '非对象根存档会被视为不可恢复数据',
    run: () => {
      platformStorage.setItem(SAVE_KEY, 'null');
      assertEqual(SaveManager.getInstance().load(), null);
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
    name: '八十一难章节 Boss 覆盖 9 个 Boss 且精英覆盖 9 种能力',
    run: () => {
      const expectedBossIds = [
        'boss_heixiongjing',
        'boss_linggan',
        'boss_baigufuren',
        'boss_honghaier',
        'boss_tieshan',
        'boss_jinjiao',
        'boss_baiyan',
        'boss_dapengjinchi',
        'boss_huangmei',
      ];
      const expectedEliteIds = [
        'elite_huwei', 'elite_huangfeng', 'elite_huli',
        'elite_huoyun', 'elite_yumian', 'elite_laoyuan',
        'elite_zhuyu', 'elite_kuangtou', 'elite_dapeng',
      ];
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
      const expectedEliteIds = [
        'elite_huwei', 'elite_huangfeng', 'elite_huli',
        'elite_huoyun', 'elite_yumian', 'elite_laoyuan',
        'elite_zhuyu', 'elite_kuangtou', 'elite_dapeng',
      ];
      const expectedBossIds = [
        'boss_heixiongjing',
        'boss_linggan',
        'boss_baigufuren',
        'boss_honghaier',
        'boss_tieshan',
        'boss_jinjiao',
        'boss_baiyan',
        'boss_dapengjinchi',
        'boss_huangmei',
      ];
      const eliteIds = new Set(
        Array.from({ length: 20 }, (_, index) => createEndlessWave(21 + index))
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
      resetRuntime();
      gameMgr.startNewGame(GameMode.DEFENSE);

      const startedWaves: number[] = [];
      const battle = {
        enemies: [],
        hasAliveEnemies: false,
        beginWave: () => undefined,
        finishWaveSpawning: () => undefined,
        spawnEnemy: () => null,
      };
      const waveSystem = new WaveSystem(battle as never);
      waveSystem.start({
        waves: [{ enemies: [], startDelay: 0 }],
        endless: true,
        onWaveStart: waveNumber => startedWaves.push(waveNumber),
      });

      waveSystem.update(0);
      waveSystem.update(0);
      waveSystem.update(0);
      waveSystem.update(999);

      assertEqual(JSON.stringify(startedWaves), JSON.stringify([1, 2]));
      assertEqual(gameMgr.waveNumber, 2);

      const orchestratorSource = readRepoFile('src/core/BattleOrchestrator.ts');
      assertOk(orchestratorSource.includes('endless: true'), '守护模式编排器应显式启用无尽波次');
    },
  },
  {
    name: '敌人配置声明的精英和 Boss 技能都有代码分支承接',
    run: () => {
      const enemySource = readRepoFile('src/entities/Enemy.ts');
      const battleSource = readRepoFile('src/systems/BattleSystem.ts');
      const expectedAbilityIds = new Set(ENEMY_CONFIGS.flatMap(config => config.abilities));

      for (const abilityId of expectedAbilityIds) {
        const handled = enemySource.includes(`abilities.includes('${abilityId}')`) || battleSource.includes(`abilities.includes('${abilityId}')`);
        assertOk(handled, `${abilityId} 应有战斗逻辑分支`);
      }
      assertOk(enemySource.includes('finalAmount * 0.72'), '白象 damage_resist 应降低受到的伤害');
      assertOk(enemySource.includes("abilities.includes('trample')"), '精英 trample 应触发践踏伤害');
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
  {
    name: '暂停期间不会消耗唐僧无敌时间',
    run: () => {
      resetRuntime();
      gameMgr.startNewGame(GameMode.DEFENSE);
      gameMgr.applyMonkInvincible(5);

      gameMgr.setState(GameState.PAUSED);
      gameMgr.update(2);
      assertEqual(gameMgr.monkInvincibleRemaining, 5);

      gameMgr.setState(GameState.PLAYING);
      gameMgr.update(2);
      assertEqual(gameMgr.monkInvincibleRemaining, 3);
    },
  },
  {
    name: '重复胜负判定只会发送一次结算事件',
    run: () => {
      resetRuntime();
      let loseCount = 0;
      let winCount = 0;
      eventMgr.on(GameEvent.BATTLE_LOSE, () => loseCount++);
      eventMgr.on(GameEvent.BATTLE_WIN, () => winCount++);

      gameMgr.startNewGame(GameMode.DEFENSE);
      gameMgr.damageMonk(3);
      gameMgr.damageMonk(1);
      assertEqual(loseCount, 1);

      gameMgr.startNewGame(GameMode.DEFENSE);
      gameMgr.win();
      gameMgr.win();
      assertEqual(winCount, 1);
    },
  },
  {
    name: '广告复活成功后恢复游玩状态再关闭结算层',
    run: () => {
      const source = readRepoFile('src/ui/ResultView.ts');
      const reviveBody = source.slice(source.indexOf('private async _tryRevive'), source.indexOf('private _invalidateReviveRequest'));
      const reviveIndex = reviveBody.indexOf('gameMgr.reviveMonk(1)');
      const playingIndex = reviveBody.indexOf('gameMgr.setState(GameState.PLAYING)');
      const hideIndex = reviveBody.indexOf('this.container.setVisible(false)');

      assertOk(reviveIndex >= 0, '复活流程应恢复唐僧生命');
      assertOk(playingIndex > reviveIndex, '恢复生命后应把对局切回游玩状态');
      assertOk(hideIndex > playingIndex, '恢复游玩状态后再隐藏结算层');
    },
  },
  {
    name: '第八章额外锁格按初始开放格计算并至少保留一格',
    run: () => {
      const template = BOARD_TEMPLATES.find(board => board.chapter === 8);
      assertOk(template);
      const initialOpenCount = getInitialOpenCells(template).length;
      const baseLocked = getLockedCellsForTemplate(template);
      const boostedLocked = getLockedCellsForTemplate(template, 0.3, () => 0);
      const expectedExtra = Math.min(Math.floor(initialOpenCount * 0.3), initialOpenCount - 1);

      assertEqual(boostedLocked.length, baseLocked.length + expectedExtra);
      assertOk(initialOpenCount - expectedExtra >= 1);
      const pathKeys = new Set(template.path.map(cell => `${cell.row},${cell.col}`));
      assertOk(boostedLocked.every(([row, col]) => !pathKeys.has(`${row},${col}`)));
    },
  },
  {
    name: '攻击修正和易伤修正支持受限的负数效果',
    run: () => {
      const unit = createBareUnit();
      unit.applyAttackBonus('blind', -0.3, 4);
      assertEqual(unit.attackBonus, -0.3);
      assertEqual(unit.effectiveAttack, 70);
      unit.applyAttackBonus('invalid', Number.NaN, 4);
      assertEqual(unit.attackBonus, -0.3);

      const enemy = createBareEnemy();
      enemy.applyVulnerability('shield', -0.2, 10);
      assertEqual(enemy.vulnerabilityBonus, -0.2);
      enemy.applyVulnerability('oversized_shield', -5, 10);
      assertEqual(enemy.vulnerabilityBonus, -0.9);
    },
  },
  {
    name: '避火罩免疫会在持续时间内阻止全队灼烧',
    run: () => {
      resetRuntime();
      gameMgr.startNewGame(GameMode.JOURNEY);
      const unit = createBareUnit();
      Object.assign(unit, {
        currentHp: 100,
        maxHp: 100,
        gridRow: 0,
        gridCol: 0,
        takeDamage: (amount: number) => { unit.currentHp -= amount; },
      });
      unit.applyFireImmunity('artifact_fire_cover', 2);

      const system = new ChapterMechanicSystem(
        { type: 'burn_all', value: 5 },
        { allies: [unit], enemies: [] } as never,
        createMechanicGrid([]) as never,
      );
      system.update(1);
      assertEqual(unit.currentHp, 100);

      (unit as unknown as { updateTimedStatuses: (dt: number) => void }).updateTimedStatuses(2);
      assertEqual(unit.isFireImmune, false);
      system.update(1);
      assertEqual(unit.currentHp, 95);
      system.destroy();
    },
  },
  {
    name: '避火罩会阻止火焰格伤害且灼烧会补算跨帧秒数',
    run: () => {
      resetRuntime();
      gameMgr.startNewGame(GameMode.JOURNEY);
      const unit = createBareUnit();
      Object.assign(unit, {
        currentHp: 100,
        maxHp: 100,
        gridRow: 0,
        gridCol: 0,
        takeDamage: (amount: number) => { unit.currentHp -= amount; },
      });
      unit.applyFireImmunity('artifact_fire_cover', 4);

      const fireZone = new ChapterMechanicSystem(
        { type: 'fire_zone', interval: 999, duration: 3, value: 5 },
        { allies: [unit], enemies: [] } as never,
        createMechanicGrid(createCells(1, 1)) as never,
      );
      fireZone.activeFireCells = [{
        row: 0,
        col: 0,
        remaining: 3,
        warnRemaining: 0,
        tickTimer: 0,
      }];
      fireZone.update(1);
      assertEqual(unit.currentHp, 100);
      fireZone.destroy();

      (unit as unknown as { updateTimedStatuses: (dt: number) => void }).updateTimedStatuses(4);
      const burnAll = new ChapterMechanicSystem(
        { type: 'burn_all', value: 5 },
        { allies: [unit], enemies: [] } as never,
        createMechanicGrid([]) as never,
      );
      burnAll.update(2.1);
      assertEqual(unit.currentHp, 90);
      burnAll.destroy();
    },
  },
  {
    name: '敌人击杀事件发生时敌人已经标记死亡',
    run: () => {
      resetRuntime();
      gameMgr.startNewGame(GameMode.DEFENSE);
      const enemy = createBareEnemy();
      let aliveDuringEvent: boolean | null = null;
      eventMgr.on(GameEvent.ENEMY_KILLED, (killed: Enemy) => {
        aliveDuringEvent = killed.alive;
      });

      enemy.takeDamage(1);

      assertEqual(aliveDuringEvent, false);
      assertEqual(enemy.alive, false);
    },
  },
  {
    name: '白骨复生每波只尝试首个死亡敌人',
    run: () => {
      resetRuntime();
      gameMgr.startNewGame(GameMode.JOURNEY);
      gameMgr.nextWave();
      let spawnCount = 0;
      const battle = {
        allies: [],
        enemies: [],
        spawnEnemy: () => {
          spawnCount++;
          return {
            sprite: { x: 0, y: 0 },
            syncPathProgressFromPosition: () => undefined,
          };
        },
      };
      const system = new ChapterMechanicSystem(
        { type: 'respawn', value: 100 },
        battle as never,
        createMechanicGrid([]) as never,
      );
      const deadEnemy = {
        alive: false,
        currentHp: 0,
        enemyId: 'xiaoyao_1',
        sprite: { x: 20, y: 30 },
      } as Enemy;

      eventMgr.emit(GameEvent.ENEMY_KILLED, deadEnemy);
      eventMgr.emit(GameEvent.ENEMY_KILLED, deadEnemy);
      assertEqual(spawnCount, 1);

      gameMgr.nextWave();
      eventMgr.emit(GameEvent.ENEMY_KILLED, deadEnemy);
      assertEqual(spawnCount, 2);
      system.destroy();
    },
  },
  {
    name: '火焰格每秒结算一次伤害而非每帧结算',
    run: () => {
      resetRuntime();
      gameMgr.startNewGame(GameMode.JOURNEY);
      const cells = createCells(1, 1);
      occupy(cells[0][0], {});
      let totalDamage = 0;
      const ally = {
        currentHp: 100,
        maxHp: 100,
        gridRow: 0,
        gridCol: 0,
        takeDamage: (amount: number) => { totalDamage += amount; },
      };
      const system = new ChapterMechanicSystem(
        { type: 'fire_zone', interval: 999, duration: 3, value: 5 },
        { allies: [ally], enemies: [] } as never,
        createMechanicGrid(cells) as never,
      );
      system.activeFireCells = [{
        row: 0,
        col: 0,
        remaining: 3,
        warnRemaining: 0,
        tickTimer: 0,
      } as ActiveFireCell];

      system.update(0.4);
      system.update(0.59);
      assertEqual(totalDamage, 0);
      system.update(0.02);
      assertEqual(totalDamage, 5);
      system.destroy();
    },
  },
  {
    name: '火焰格可以选中已部署单位的非路径开放格',
    run: () => {
      resetRuntime();
      gameMgr.startNewGame(GameMode.JOURNEY);
      const cells = createCells(1, 2);
      occupy(cells[0][0], {});
      cells[0][1].state = CellState.LOCKED;
      const system = new ChapterMechanicSystem(
        { type: 'fire_zone', interval: 1, duration: 3, value: 5 },
        { allies: [], enemies: [] } as never,
        createMechanicGrid(cells) as never,
      );

      system.update(1);

      assertEqual(system.activeFireCells.length, 1);
      assertEqual(system.activeFireCells[0].row, 0);
      assertEqual(system.activeFireCells[0].col, 0);
      system.destroy();
    },
  },
  {
    name: '守护模式新增机制不会重置已经生效的全局倍率',
    run: () => {
      resetRuntime();
      gameMgr.startNewGame(GameMode.DEFENSE);
      setGlobalHealMultiplier(0.2);
      setGlobalSpeedMultiplier(0.2);
      const manager = new CompositeMechanicManager(
        { allies: [], enemies: [] } as never,
        createMechanicGrid([]) as never,
      );

      assertEqual(getGlobalHealMultiplier(), 1);
      assertEqual(getGlobalSpeedMultiplier(), 1);
      manager.addMechanic({ type: 'burn_all', value: 1 });
      assertEqual(getGlobalHealMultiplier(), 0.5);
      manager.addMechanic({ type: 'slow', value: 20 });
      assertEqual(getGlobalHealMultiplier(), 0.5);
      assertEqual(getGlobalSpeedMultiplier(), 0.8);

      manager.destroy();
      assertEqual(getGlobalHealMultiplier(), 1);
      assertEqual(getGlobalSpeedMultiplier(), 1);
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

async function runTests(): Promise<void> {
  let passed = 0;
  let failed = 0;
  for (const test of tests) {
    try {
      await test.run();
      passed++;
      console.log(`✓ ${test.name}`);
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`✗ ${test.name}\n  ${message}`);
    }
  }

  console.log(`\n${passed}/${tests.length} tests passed`);
  if (failed > 0) process.exitCode = 1;
}

void runTests();
