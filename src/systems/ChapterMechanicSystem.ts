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
import type Phaser from 'phaser';

// ==================== 火焰格子追踪 ====================

export interface ActiveFireCell {
  row: number;
  col: number;
  remaining: number;   // 剩余燃烧时间（秒）
  warnRemaining: number; // 预警剩余时间（秒）
  tickTimer: number; // 每秒伤害计时
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
  private _fireOverlay?: Phaser.GameObjects.Graphics;

  /** 复活处理是否已注册 */
  private _respawnRegistered: boolean = false;
  private _respawnHandler: ((enemy: Enemy, killer?: any) => void) | null = null;
  private _respawnAttemptedWave: number = -1;

  constructor(mechanic: ChapterMechanic, battle: BattleSystem, grid: GridManager) {
    this._mechanic = mechanic;
    this._battle = battle;
    this._grid = grid;

    this._setup();
  }

  /** 根据机制类型做一次性初始化 */
  private _setup(): void {
    const m = this._mechanic;

    switch (m.type) {
      case 'respawn':
        this._registerRespawn();
        break;
      case 'fire_zone':
        this._ensureFireOverlay();
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
    if (this._mechanic.type === 'burn_all') {
      setGlobalHealMultiplier(1);
    }
    if (this._mechanic.type === 'slow') {
      setGlobalSpeedMultiplier(1);
    }
    this._slowApplied = false;
    this._respawnAttemptedWave = -1;
    this.activeFireCells = [];
    this._fireOverlay?.destroy();
    this._fireOverlay = undefined;
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
      if (enemy.currentHp > 0) return;
      if (this._respawnAttemptedWave === gameMgr.waveNumber) return;
      this._respawnAttemptedWave = gameMgr.waveNumber;
      if (Math.random() >= chance) return;

      // 在敌人死亡位置复活，HP 减半
      const spawned = this._battle.spawnEnemy(enemy.enemyId, {
        hpMultiplier: 0.5,
        attackMultiplier: 1,
        speedMultiplier: 0.9,
      });
      if (spawned) {
        spawned.sprite.x = enemy.sprite.x;
        spawned.sprite.y = enemy.sprite.y;
        spawned.syncPathProgressFromPosition();
        eventMgr.emit(GameEvent.ITEM_USED, 'bone_respawn', enemy.enemyId);
      }
    };

    eventMgr.on(GameEvent.ENEMY_KILLED, this._respawnHandler);
    this._respawnRegistered = true;
  }

  // ---- 三昧火灼：随机格喷火 ----
  private _updateFireZone(dt: number, interval: number, fireDuration: number, dmgPercent: number): void {
    // 倒计时
    for (const f of this.activeFireCells) {
      if (f.warnRemaining > 0) {
        f.warnRemaining -= dt;
        if (f.warnRemaining <= 0) {
          // 预警结束，开始燃烧
          f.warnRemaining = 0;
          f.remaining = fireDuration;
          f.tickTimer = 0;
        }
        continue;
      }
      if (f.remaining <= 0) continue;
      const activeDt = Math.min(dt, f.remaining);
      f.remaining = Math.max(0, f.remaining - dt);
      f.tickTimer += activeDt;
      while (f.tickTimer >= 1) {
        f.tickTimer -= 1;
        this._damageAlliesAt(f.row, f.col, dmgPercent);
      }
    }

    this.activeFireCells = this.activeFireCells.filter(f => f.remaining > 0 || f.warnRemaining > 0);
    this._renderFireCells();

    // 定时触发新火焰
    if (this._timer < interval) return;
    this._timer = 0;
    this._spawnFireZone(fireDuration);
  }

  private _spawnFireZone(fireDuration: number): void {
    const eligibleCells = this._getFireEligibleCells();
    if (eligibleCells.length === 0) return;

    // 随机选 2 个（或更少）
    const count = Math.min(2, eligibleCells.length);
    const selected = this._pickRandom(eligibleCells, count);

    for (const cell of selected) {
      this.activeFireCells.push({
        row: cell.row,
        col: cell.col,
        remaining: 0,
        warnRemaining: 1, // 1 秒预警
        tickTimer: 0,
      });
    }
    this._renderFireCells();
    eventMgr.emit(GameEvent.ITEM_USED, 'fire_zone', selected.length);
  }

  // ---- 烈焰灼烧：全队持续扣血 ----
  private _updateBurnAll(dt: number, dmgPercent: number): void {
    this._burnTickTimer += dt;
    while (this._burnTickTimer >= 1) {
      this._burnTickTimer -= 1;
      for (const unit of this._getDeployedAllies()) {
        if (unit.isFireImmune) continue;
        unit.takeDamage(Math.max(1, Math.round(unit.maxHp * dmgPercent / 100)));
      }
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

  /** 获取可喷火格子，包含已有单位的开放格。 */
  private _getFireEligibleCells(): Array<{ row: number; col: number }> {
    const result: Array<{ row: number; col: number }> = [];
    const activeKeys = new Set(this.activeFireCells.map(f => `${f.row},${f.col}`));
    for (let row = 0; row < this._grid.rows; row++) {
      for (let col = 0; col < this._grid.cols; col++) {
        const cell = this._grid.getCell(row, col);
        if (
          cell
          && cell.state !== CellState.LOCKED
          && !this._grid.isPathCell(row, col)
          && !activeKeys.has(`${row},${col}`)
        ) {
          result.push({ row, col });
        }
      }
    }
    return result;
  }

  private _damageAlliesAt(row: number, col: number, dmgPercent: number): void {
    for (const unit of this._getDeployedAllies()) {
      if (unit.gridRow !== row || unit.gridCol !== col) continue;
      if (unit.isFireImmune) continue;
      unit.takeDamage(Math.max(1, Math.round(unit.maxHp * dmgPercent / 100)));
    }
  }

  private _ensureFireOverlay(): void {
    if (this._fireOverlay) return;
    this._fireOverlay = this._grid.scene.add.graphics();
    this._fireOverlay.setDepth(45);
  }

  private _renderFireCells(): void {
    this._ensureFireOverlay();
    const overlay = this._fireOverlay!;
    overlay.clear();
    const size = Math.max(12, this._grid.cellSize - 8);

    for (const fire of this.activeFireCells) {
      const center = this._grid.cellCenter(fire.row, fire.col);
      const x = center.x - size / 2;
      const y = center.y - size / 2;
      if (fire.warnRemaining > 0) {
        overlay.fillStyle(0xffc247, 0.2);
        overlay.fillRoundedRect(x, y, size, size, 6);
        overlay.lineStyle(3, 0xffd36a, 0.9);
        overlay.strokeRoundedRect(x, y, size, size, 6);
      } else {
        overlay.fillStyle(0xd63b28, 0.3);
        overlay.fillRoundedRect(x, y, size, size, 6);
        overlay.fillStyle(0xff7a32, 0.68);
        overlay.fillCircle(center.x - size * 0.18, center.y + size * 0.14, size * 0.12);
        overlay.fillCircle(center.x + size * 0.12, center.y - size * 0.06, size * 0.17);
      }
    }
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
    setGlobalSpeedMultiplier(1);
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
    setGlobalSpeedMultiplier(1);
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
