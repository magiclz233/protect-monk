import { ARTIFACT_CONFIGS, getArtifactConfig } from '../config/ArtifactConfig';
import { gameMgr } from '../core/GameManager';
import { ArtifactData } from '../data/ArtifactData';
import { Enemy } from '../entities/Enemy';
import { TangMonk } from '../entities/TangMonk';
import { Unit } from '../entities/Unit';
import { GridManager } from '../grid/GridManager';
import { ArtifactId, ArtifactLevel, CellState, EnemyType } from '../types';
import { BattleSystem } from './BattleSystem';

export interface ArtifactUseResult {
  success: boolean;
  message: string;
}

export interface ArtifactTarget {
  row?: number;
  col?: number;
  ally?: Unit | null;
  enemy?: Enemy | null;
}

const DIAMOND_SNARE_SOURCE = 'artifact_diamond_snare';

export class ArtifactSystem {
  private readonly _cooldowns = new Map<ArtifactId, number>();
  private readonly _loadout: ArtifactId[];
  private _returnCharges = 0;
  private readonly _endpointHandler = (enemy: Enemy): boolean => this._tryReturnEnemy(enemy);

  constructor(
    private readonly gridMgr: GridManager,
    private readonly battleSystem: BattleSystem,
    private readonly tangMonk: TangMonk,
  ) {
    const artifactData = ArtifactData.getInstance();
    artifactData.loadFromSave();
    artifactData.ensureDefaults();
    this._loadout = artifactData.getLoadout();
    for (const artifactId of this._loadout) {
      this._cooldowns.set(artifactId, 0);
    }
    const handlers = (this.gridMgr.scene.registry.get('enemyEndpointHandlers') as Array<(enemy: Enemy) => boolean> | undefined) ?? [];
    handlers.push(this._endpointHandler);
    this.gridMgr.scene.registry.set('enemyEndpointHandlers', handlers);
  }

  destroy(): void {
    const handlers = (this.gridMgr.scene.registry.get('enemyEndpointHandlers') as Array<(enemy: Enemy) => boolean> | undefined) ?? [];
    this.gridMgr.scene.registry.set('enemyEndpointHandlers', handlers.filter(handler => handler !== this._endpointHandler));
  }

  update(dt: number): void {
    for (const [artifactId, cooldown] of this._cooldowns) {
      this._cooldowns.set(artifactId, Math.max(0, cooldown - dt));
    }
  }

  get loadout(): ArtifactId[] {
    return this._loadout;
  }

  getCooldown(artifactId: ArtifactId): number {
    return this._cooldowns.get(artifactId) ?? 0;
  }

  isReady(artifactId: ArtifactId): boolean {
    return this.getCooldown(artifactId) <= 0;
  }

  getLevel(artifactId: ArtifactId): ArtifactLevel {
    return ArtifactData.getInstance().getLevel(artifactId);
  }

  getAliveEnemies(): Enemy[] {
    return this._aliveEnemies();
  }

  reduceCooldown(artifactId: ArtifactId, seconds: number): void {
    this._cooldowns.set(artifactId, Math.max(0, this.getCooldown(artifactId) - seconds));
  }

  use(artifactId: ArtifactId, targetOrRow?: ArtifactTarget | number, col?: number): ArtifactUseResult {
    if (!this._loadout.includes(artifactId)) {
      return { success: false, message: '未携带该法宝' };
    }
    if (!this.isReady(artifactId)) {
      return { success: false, message: '法宝冷却中' };
    }

    const target = typeof targetOrRow === 'number' ? { row: targetOrRow, col } : targetOrRow ?? {};
    const result = this._useReadyArtifact(artifactId, target);
    if (result.success) {
      this._startCooldown(artifactId);
    }
    return result;
  }

  private _useReadyArtifact(artifactId: ArtifactId, target: ArtifactTarget): ArtifactUseResult {
    switch (artifactId) {
      case ArtifactId.AXE:
        return this._useAxe(target.row, target.col);
      case ArtifactId.RETURN_TALISMAN:
        return this._useReturnTalisman();
      case ArtifactId.WILLOW_DEW:
        return this._useWillowDew();
      case ArtifactId.HEADBAND:
        return this._useHeadband();
      case ArtifactId.SKULL_BEADS:
        return this._useSkullBeads();
      case ArtifactId.DEMON_MIRROR:
        return this._useDemonMirror();
      case ArtifactId.FIRE_COVER:
        return this._useFireCover(target.ally ?? null);
      case ArtifactId.PLANTAIN_FAN:
        return this._usePlantainFan();
      case ArtifactId.TURTLE_ARMOR:
        return this._useTurtleArmor(target.ally ?? null);
      case ArtifactId.CLEANSING_DEW:
        return this._useCleansingDew();
      case ArtifactId.DIAMOND_SNARE:
        return this._useDiamondSnare(target.enemy ?? null);
      case ArtifactId.KASAYA:
        return this._useKasaya();
      default:
        return { success: false, message: '未知法宝' };
    }
  }

  private _useAxe(row?: number, col?: number): ArtifactUseResult {
    if (row === undefined || col === undefined) {
      return { success: false, message: '请选择锁定格' };
    }

    const cell = this.gridMgr.getCell(row, col);
    if (!cell || cell.state !== CellState.LOCKED) {
      return { success: false, message: '开山斧需要锁定格' };
    }

    const level = this.getLevel(ArtifactId.AXE);
    const unlocked = this._unlockCellsFrom(row, col, level >= 3 ? 2 : 1);
    if (unlocked <= 0) {
      return { success: false, message: '没有可解锁格' };
    }
    return { success: true, message: `开山斧解锁 ${unlocked} 格` };
  }

  private _useReturnTalisman(): ArtifactUseResult {
    const level = this.getLevel(ArtifactId.RETURN_TALISMAN);
    this._returnCharges += level === 1 ? 2 : level === 2 ? 3 : 4;
    return { success: true, message: `回山符准备弹回 ${this._returnCharges} 次漏怪` };
  }

  private _useWillowDew(): ArtifactUseResult {
    const level = this.getLevel(ArtifactId.WILLOW_DEW);
    const rate = level === 1 ? 0.2 : level === 2 ? 0.25 : 0.3;
    for (const ally of this.battleSystem.allies) {
      ally.heal(Math.max(1, Math.round(ally.maxHp * rate)));
      if (level >= 3) ally.cleanse();
    }
    return { success: true, message: `杨枝甘露回复全体 ${Math.round(rate * 100)}% HP` };
  }

  private _useHeadband(): ArtifactUseResult {
    const level = this.getLevel(ArtifactId.HEADBAND);
    const multiplier = level === 1 ? 0.6 : level === 2 ? 0.5 : 0.4;
    const duration = level === 1 ? 4 : level === 2 ? 5 : 6;
    for (const enemy of this._aliveEnemies()) {
      enemy.applySlow(multiplier, duration);
    }
    return { success: true, message: '紧箍咒压制全体敌人' };
  }

  private _useSkullBeads(): ArtifactUseResult {
    const level = this.getLevel(ArtifactId.SKULL_BEADS);
    const slow = level === 1 ? 0.75 : level === 2 ? 0.65 : 0.55;
    const vulnerable = level === 1 ? 0.15 : level === 2 ? 0.25 : 0.35;
    const duration = level === 1 ? 4 : level === 2 ? 6 : 8;
    for (const enemy of this._aliveEnemies()) {
      enemy.applySlow(slow, duration);
      enemy.applyVulnerability('artifact_skull_beads', vulnerable, duration);
    }
    return { success: true, message: '骷髅念珠令敌人减速并易伤' };
  }

  private _useDemonMirror(): ArtifactUseResult {
    const level = this.getLevel(ArtifactId.DEMON_MIRROR);
    const vulnerable = level === 1 ? 0.4 : level === 2 ? 0.6 : 0.8;
    const duration = level === 1 ? 8 : level === 2 ? 10 : 12;
    let count = 0;
    for (const enemy of this._aliveEnemies()) {
      if (enemy.enemyType === EnemyType.NORMAL) continue;
      enemy.applyVulnerability('artifact_demon_mirror', vulnerable, duration);
      count++;
    }
    return { success: count > 0, message: count > 0 ? '照妖镜照破精英与 Boss' : '当前没有精英或 Boss' };
  }

  private _useFireCover(ally: Unit | null): ArtifactUseResult {
    if (!ally || ally.currentHp <= 0) return { success: false, message: '请选择友方单位' };
    const level = this.getLevel(ArtifactId.FIRE_COVER);
    const reduction = level >= 2 ? 0.4 : 0.3;
    const duration = level >= 2 ? 8 : 6;
    ally.applyDamageReduction('artifact_fire_cover', reduction, duration);
    if (level >= 3) {
      ally.applyInvincible('artifact_fire_cover', 2);
    }
    return { success: true, message: '避火罩保护友方单位' };
  }

  private _usePlantainFan(): ArtifactUseResult {
    const level = this.getLevel(ArtifactId.PLANTAIN_FAN);
    const steps = level === 1 ? 2 : level === 2 ? 3 : 4;
    const stun = level === 1 ? 0 : level === 2 ? 1 : 1.5;
    for (const enemy of this._aliveEnemies()) {
      enemy.knockBack(steps);
      if (stun > 0) enemy.applyStun(stun);
    }
    return { success: true, message: `芭蕉扇吹退全体敌人 ${steps} 格` };
  }

  private _useTurtleArmor(ally: Unit | null): ArtifactUseResult {
    if (!ally || ally.currentHp <= 0) return { success: false, message: '请选择友方单位' };
    const level = this.getLevel(ArtifactId.TURTLE_ARMOR);
    ally.applyInvincible('artifact_turtle_armor', level + 1);
    return { success: true, message: `老鼋甲无敌 ${level + 1} 秒` };
  }

  private _useCleansingDew(): ArtifactUseResult {
    const level = this.getLevel(ArtifactId.CLEANSING_DEW);
    const rate = level === 1 ? 0.02 : level === 2 ? 0.03 : 0.04;
    const duration = level === 1 ? 6 : level === 2 ? 8 : 10;
    for (const ally of this.battleSystem.allies) {
      ally.applyHealOverTime('artifact_cleansing_dew', rate, duration);
      if (level >= 2) ally.cleanse();
    }
    return { success: true, message: '甘露净露持续恢复全体友方' };
  }

  private _useDiamondSnare(enemy: Enemy | null): ArtifactUseResult {
    if (!enemy || !enemy.alive || enemy.currentHp <= 0) return { success: false, message: '请选择敌人' };
    const level = this.getLevel(ArtifactId.DIAMOND_SNARE);
    const vulnerable = level === 1 ? 0.6 : level === 2 ? 0.8 : 1;
    const duration = level === 1 ? 4 : level === 2 ? 5 : 6;
    enemy.applyVulnerability(DIAMOND_SNARE_SOURCE, vulnerable, duration);
    if (level >= 3) {
      const scene = this.gridMgr.scene;
      const timer = scene.time.addEvent({
        delay: 120,
        loop: true,
        callback: () => {
          if (!enemy.alive || enemy.currentHp <= 0) {
            this.reduceCooldown(ArtifactId.DIAMOND_SNARE, (getArtifactConfig(ArtifactId.DIAMOND_SNARE)?.cooldown ?? 95) / 2);
            timer.remove(false);
          }
        },
      });
      scene.time.delayedCall(duration * 1000, () => timer.remove(false));
    }
    return { success: true, message: '金刚琢锁定单体敌人' };
  }

  private _useKasaya(): ArtifactUseResult {
    const level = this.getLevel(ArtifactId.KASAYA);
    const duration = level === 1 ? 5 : level === 2 ? 8 : 10;
    gameMgr.applyMonkInvincible(duration);
    if (level >= 2) {
      this.tangMonk.boostAura(level === 2 ? 2 : 3, duration);
    }
    return { success: true, message: '锦斓袈裟护住唐僧' };
  }

  private _tryReturnEnemy(enemy: Enemy): boolean {
    if (this._returnCharges <= 0) return false;
    this._returnCharges--;
    enemy.rewindToStart();
    return true;
  }

  private _aliveEnemies(): Enemy[] {
    return this.battleSystem.enemies.filter(enemy => enemy.alive && enemy.currentHp > 0);
  }

  private _startCooldown(artifactId: ArtifactId): void {
    if (artifactId === ArtifactId.AXE && this.getLevel(ArtifactId.AXE) >= 2) {
      this._cooldowns.set(artifactId, 50);
      return;
    }
    this._cooldowns.set(artifactId, getArtifactConfig(artifactId)?.cooldown ?? 60);
  }

  private _unlockCellsFrom(row: number, col: number, count: number): number {
    const candidates: Array<{ row: number; col: number; distance: number }> = [];
    for (let r = 0; r < this.gridMgr.rows; r++) {
      for (let c = 0; c < this.gridMgr.cols; c++) {
        const cell = this.gridMgr.getCell(r, c);
        if (!cell || cell.state !== CellState.LOCKED) continue;
        candidates.push({ row: r, col: c, distance: Math.abs(row - r) + Math.abs(col - c) });
      }
    }

    let unlocked = 0;
    for (const target of candidates.sort((a, b) => a.distance - b.distance || a.row - b.row || a.col - b.col).slice(0, count)) {
      if (this.gridMgr.unlockCell(target.row, target.col)) {
        unlocked++;
      }
    }
    return unlocked;
  }
}

export function getArtifactDisplayName(artifactId: ArtifactId): string {
  return ARTIFACT_CONFIGS.find(config => config.artifactId === artifactId)?.name ?? artifactId;
}
