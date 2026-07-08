/**
 * 章节特殊机制系统
 * 实现九章各自的特殊规则，支持守护模式机制混搭
 */
import { CellState } from '../types';
import { gameMgr } from '../core/GameManager';
import { eventMgr, GameEvent } from '../core/EventManager';
import { ChapterMechanic, MechanicType } from '../config/ChapterConfig';
import { BattleSystem } from './BattleSystem';
import { GridManager } from '../grid/GridManager';
import { Enemy } from '../entities/Enemy';
import { setGlobalHealMultiplier, setGlobalSpeedMultiplier } from './MechanicState';

// ==================== 火焰格子追踪 ====================

export interface ActiveFireCell {
  row: number;
  col: number;
  remaining: number;   // 剩余燃烧时间（秒）
  warnRemaining: number; // 预警剩余时间（秒）
}

// ==================== 机制系统 ====================

export class ChapterMechanicSystem {
  private _mechanic: ChapterMechanic;
  private _timer: number = 0;
  private _battle: BattleSystem;
  private _grid: GridManager;

  /** 当前激活的火焰格子 */
  activeFireCells: ActiveFireCell[] = [];

  /** 是否已应用全局减速 */
  private _slowApplied: boolean = false;

  /** 烈焰灼烧 tick 计时器 */
  private _burnTickTimer: number = 0;

  /** 复活处理是否已注册 */
  private _respawnRegistered: boolean = false;
  private _respawnHandler: ((enemy: Enemy, killer?: any) => void) | null = null;

  constructor(mechanic: ChapterMechanic, battle: BattleSystem, grid: GridManager) {
    this._mechanic = mechanic;
    this._battle = battle;
    this._grid = grid;

    // 重置全局状态
    setGlobalHealMultiplier(1);
    setGlobalSpeedMultiplier(1);

    this._setup();
  }

  /** 根据机制类型做一次性初始化 */
  private _setup(): void {
    const m = this._mechanic;

    switch (m.type) {
      case 'respawn':
        this._registerRespawn();
        break;
      case 'burn_all':
        setGlobalHealMultiplier(0.5);
        break;
      case 'slow':
        this._applySlow();
        break;
      case 'stats_boost':
        // stats_boost 在外部通过 spawn modifiers 实现
        break;
      default:
        break;
    }
  }

  get mechanic(): ChapterMechanic {
    return this._mechanic;
  }

  /** 动态切换机制（守护模式波次递增时使用） */
  setMechanic(mechanic: ChapterMechanic): void {
    this._cleanupCurrentMechanic();
    this._mechanic = mechanic;
    this._timer = 0;
    this._setup();
  }

  /** 叠加一个额外机制（守护模式多机制并行） */
  addMechanic(mechanic: ChapterMechanic): void {
    // 简单实现：如果需要多机制并行，创建子系统的数组
    // 当前设计：守护模式通过多个 ChapterMechanicSystem 实例并行运行
  }

  private _cleanupCurrentMechanic(): void {
    if (this._respawnHandler) {
      eventMgr.off(GameEvent.ENEMY_KILLED, this._respawnHandler);
      this._respawnHandler = null;
      this._respawnRegistered = false;
    }
    setGlobalHealMultiplier(1);
    setGlobalSpeedMultiplier(1);
    this._slowApplied = false;
    this.activeFireCells = [];
  }

  update(dt: number): void {
    if (!gameMgr.isPlaying) return;

    const m = this._mechanic;
    this._timer += dt;

    switch (m.type) {
      case 'none':
        break;
      case 'silence':
        this._updateTimerEffect(dt, m.interval ?? 15, () => this._triggerSilence(m.duration ?? 3));
        break;
      case 'fire_zone':
        this._updateFireZone(dt, m.interval ?? 10, m.duration ?? 3, m.value ?? 5);
        break;
      case 'burn_all':
        this._updateBurnAll(dt, m.value ?? 1);
        break;
      case 'root':
        this._updateTimerEffect(dt, m.interval ?? 12, () => this._triggerRoot(m.duration ?? 3));
        break;
      case 'shield_stack':
        this._updateTimerEffect(dt, m.interval ?? 20, () => this._triggerShieldStack(m.value ?? 10));
        break;
      case 'respawn':
      case 'slow':
      case 'stats_boost':
        // 这些在 _setup() 中一次性处理，update 无需操作
        break;
    }
  }

  destroy(): void {
    this._cleanupCurrentMechanic();
    this.activeFireCells = [];
  }

  // ==================== 机制实现 ====================

  /** 通用定时触发 */
  private _updateTimerEffect(dt: number, interval: number, trigger: () => void): void {
    if (this._timer < interval) return;
    this._timer = 0;
    trigger();
  }

  // ---- 流沙陷足：随机单位沉默 ----
  private _triggerSilence(duration: number): void {
    const deployed = this._getDeployedAllies();
    if (deployed.length === 0) return;
    const target = deployed[Math.floor(Math.random() * deployed.length)];
    target.applyStun(duration);
    eventMgr.emit(GameEvent.ITEM_USED, 'quicksand_silence', target.gridRow, target.gridCol);
  }

  // ---- 白骨复生：击杀后概率复活 ----
  private _registerRespawn(): void {
    if (this._respawnRegistered) return;
    const chance = (this._mechanic.value ?? 30) / 100;

    this._respawnHandler = (enemy: Enemy) => {
      if (Math.random() >= chance) return;
      if (!enemy.alive && enemy.currentHp <= 0) {
        // 在敌人死亡位置复活，HP 减半
        const spawned = this._battle.spawnEnemy(enemy.enemyId, {
          hpMultiplier: 0.5,
          attackMultiplier: 1,
          speedMultiplier: 0.9,
        });
        if (spawned) {
          // 设置位置为死亡敌人最后位置
          spawned.sprite.x = enemy.sprite.x;
          spawned.sprite.y = enemy.sprite.y;
          eventMgr.emit(GameEvent.ITEM_USED, 'bone_respawn', enemy.enemyId);
        }
      }
    };

    eventMgr.on(GameEvent.ENEMY_KILLED, this._respawnHandler);
    this._respawnRegistered = true;
  }

  // ---- 三昧火灼：随机格喷火 ----
  private _updateFireZone(dt: number, interval: number, fireDuration: number, dmgPercent: number): void {
    // 清理过期火焰
    this.activeFireCells = this.activeFireCells.filter(f => f.remaining > 0 || f.warnRemaining > 0);

    // 倒计时
    for (const f of this.activeFireCells) {
      if (f.warnRemaining > 0) {
        f.warnRemaining -= dt;
        if (f.warnRemaining <= 0) {
          // 预警结束，开始燃烧
          f.remaining = fireDuration;
        }
        continue;
      }
      f.remaining -= dt;
    }

    // 对燃烧格上的单位扣血
    for (const f of this.activeFireCells) {
      if (f.remaining <= 0) continue;
      const deployed = this._getDeployedAllies();
      for (const unit of deployed) {
        if (unit.gridRow === f.row && unit.gridCol === f.col) {
          unit.takeDamage(Math.max(1, Math.round(unit.maxHp * dmgPercent / 100)));
        }
      }
    }

    // 定时触发新火焰
    if (this._timer < interval) return;
    this._timer = 0;
    this._spawnFireZone(fireDuration);
  }

  private _spawnFireZone(fireDuration: number): void {
    const buildable = this._getBuildableCells();
    if (buildable.length === 0) return;

    // 随机选 2 个（或更少）
    const count = Math.min(2, buildable.length);
    const selected = this._pickRandom(buildable, count);

    for (const cell of selected) {
      this.activeFireCells.push({
        row: cell.row,
        col: cell.col,
        remaining: 0,
        warnRemaining: 1, // 1 秒预警
      });
    }
    eventMgr.emit(GameEvent.ITEM_USED, 'fire_zone', selected.length);
  }

  // ---- 烈焰灼烧：全队持续扣血 ----
  private _updateBurnAll(dt: number, dmgPercent: number): void {
    this._burnTickTimer += dt;
    if (this._burnTickTimer < 1) return;
    this._burnTickTimer = 0;

    const deployed = this._getDeployedAllies();
    for (const unit of deployed) {
      // 避火罩持有者免疫灼烧
      if ((unit as any)._hasFireImmunity) continue;
      unit.takeDamage(Math.max(1, Math.round(unit.maxHp * dmgPercent / 100)));
    }
  }

  // ---- 激流缓行：全局减速 ----
  private _applySlow(): void {
    if (this._slowApplied) return;
    setGlobalSpeedMultiplier(1 - (this._mechanic.value ?? 20) / 100);
    this._slowApplied = true;
  }

  // ---- 蛛网缠绕：随机定身 ----
  private _triggerRoot(duration: number): void {
    const deployed = this._getDeployedAllies();
    if (deployed.length === 0) return;
    const target = deployed[Math.floor(Math.random() * deployed.length)];
    target.applyStun(duration);
    eventMgr.emit(GameEvent.ITEM_USED, 'spider_root', target.gridRow, target.gridCol);
  }

  // ---- 佛光庇护：敌人叠盾 ----
  private _triggerShieldStack(dmgReduction: number): void {
    const enemies = this._battle.enemies.filter(e => e.alive && e.currentHp > 0);
    for (const enemy of enemies) {
      const currentStacks = enemy.chapterShieldStacks ?? 0;
      if (currentStacks >= 3) continue;
      enemy.chapterShieldStacks = currentStacks + 1;
      enemy.applyVulnerability(
        'buddha_shield',
        -(dmgReduction / 100) * enemy.chapterShieldStacks, // 负易伤 = 减伤
        999, // 永久持续（直到被清除或波次结束）
      );
    }
    eventMgr.emit(GameEvent.ITEM_USED, 'buddha_shield', enemies.length);
  }

  // ==================== 辅助方法 ====================

  /** 获取所有已布阵且存活的友方单位 */
  private _getDeployedAllies() {
    return this._battle.allies.filter(u => u.currentHp > 0 && u.gridRow >= 0);
  }

  /** 获取所有可布阵（空）格子的坐标 */
  private _getBuildableCells(): Array<{ row: number; col: number }> {
    const result: Array<{ row: number; col: number }> = [];
    for (let row = 0; row < this._grid.rows; row++) {
      for (let col = 0; col < this._grid.cols; col++) {
        const cell = this._grid.getCell(row, col);
        if (cell && cell.state === CellState.EMPTY && !this._grid.isPathCell(row, col)) {
          result.push({ row, col });
        }
      }
    }
    return result;
  }

  /** 从数组中随机选 n 个不重复元素 */
  private _pickRandom<T>(arr: T[], n: number): T[] {
    const pool = [...arr];
    const result: T[] = [];
    for (let i = 0; i < n && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      result.push(pool.splice(idx, 1)[0]);
    }
    return result;
  }
}

// ==================== 多机制并行管理器（守护模式用） ====================

/**
 * 守护模式多机制并行管理器
 * 支持同时运行多个章节机制，按波次递增叠加
 */
export class CompositeMechanicManager {
  private _systems: ChapterMechanicSystem[] = [];
  private _battle: BattleSystem;
  private _grid: GridManager;

  constructor(battle: BattleSystem, grid: GridManager) {
    this._battle = battle;
    this._grid = grid;
    // 重置全局状态
    setGlobalHealMultiplier(1);
  }

  get systems(): readonly ChapterMechanicSystem[] {
    return this._systems;
  }

  /** 添加一个新机制 */
  addMechanic(mechanic: ChapterMechanic): void {
    // 避免重复机制
    if (this._systems.some(s => s.mechanic.type === mechanic.type)) return;

    const system = new ChapterMechanicSystem(mechanic, this._battle, this._grid);
    this._systems.push(system);
    console.log(`[GuardMonk] 守护模式激活机制：${mechanic.type}`);
  }

  /** 清空所有机制 */
  clearAll(): void {
    for (const sys of this._systems) {
      sys.destroy();
    }
    this._systems = [];
    setGlobalHealMultiplier(1);
  }

  update(dt: number): void {
    for (const sys of this._systems) {
      sys.update(dt);
    }
  }

  /** 获取当前激活火焰格子的合集 */
  get activeFireCells(): ActiveFireCell[] {
    return this._systems.flatMap(s => s.activeFireCells);
  }

  destroy(): void {
    this.clearAll();
  }
}
