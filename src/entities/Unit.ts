/**
 * 单位基类 - 棋盘上的友方单位（小兵/英雄）
 * 纯逻辑 + Phaser Container 渲染
 */
import Phaser from 'phaser';
import { AttackType, UnitSide } from '../types';
import { GridManager } from '../grid/GridManager';
import { getAttackRangePixels } from '../grid/GridMetrics';
import { getGlobalHealMultiplier } from '../systems/MechanicState';

export abstract class Unit {
  // ---- 属性 ----
  side: UnitSide = UnitSide.ALLY;
  attackType: AttackType = AttackType.MELEE;
  unitName: string = '';

  maxHp: number = 100;
  currentHp: number = 100;
  attack: number = 10;
  defense: number = 0;
  attackSpeed: number = 1;
  attackRange: number = 1;
  critRate: number = 0;

  // ---- 格子位置 ----
  gridRow: number = -1;
  gridCol: number = -1;

  // ---- 渲染 ----
  sprite: Phaser.GameObjects.Container;
  protected _hpBar: Phaser.GameObjects.Graphics;

  // ---- 攻击计时 ----
  protected _attackTimer: number = 0;
  protected _attackCooldown: number = 1;

  // ---- 目标 ----
  protected _target: any = null;
  protected _targetCandidates: any[] = [];

  private _attackBuffs = new Map<string, { bonus: number; remaining: number }>();
  private _damageReductionBuffs = new Map<string, { reduction: number; remaining: number }>();
  private _invincibleBuffs = new Map<string, number>();
  private _shieldBuffs = new Map<string, { amount: number; remaining: number }>();
  private _hotEffects = new Map<string, { rate: number; remaining: number; tickTimer: number }>();
  private _stunTimer: number = 0;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.container(0, 0);
    this._hpBar = scene.add.graphics();
    this.sprite.add(this._hpBar);
  }

  /** 放置到指定格子 */
  place(row: number, col: number): void {
    this.gridRow = row;
    this.gridCol = col;
    const center = GridManager.getInstance().cellCenter(row, col);
    this.sprite.x = center.x;
    this.sprite.y = center.y;
    this._attackCooldown = 1 / this.attackSpeed;
    this._updateHpBar();
  }

  /** 每帧更新 */
  update(dt: number): void {
    this.updateTimedStatuses(dt);
    if (this._stunTimer > 0) return;
    this._attackTimer += dt;
    if (this._attackTimer >= this._attackCooldown && this._target) {
      this._attackTimer = 0;
      this.performAttack();
    }
  }

  /** 受到伤害 */
  takeDamage(amount: number): void {
    if (this.isInvincible) return;

    const reduced = Math.round(amount * (1 - this.damageReduction));
    let actualDmg = Math.max(1, reduced - this.defense);
    actualDmg = this._absorbWithShields(actualDmg);
    if (actualDmg <= 0) {
      this._updateHpBar();
      return;
    }

    this.currentHp = Math.max(0, this.currentHp - actualDmg);
    this._updateHpBar();
    if (this.currentHp <= 0) {
      this.onDeath();
    }
  }

  heal(amount: number): void {
    if (this.currentHp <= 0) return;
    // 章节机制可能减半治疗（如烈焰灼烧）
    const mult = getGlobalHealMultiplier();
    const effectiveAmount = Math.max(1, Math.round(amount * mult));
    this.currentHp = Math.min(this.maxHp, this.currentHp + effectiveAmount);
    this._updateHpBar();
  }

  get effectiveAttack(): number {
    return Math.max(1, Math.round(this.attack * (1 + this.attackBonus)));
  }

  get attackBonus(): number {
    let bonus = 0;
    for (const buff of this._attackBuffs.values()) {
      bonus += buff.bonus;
    }
    return bonus;
  }

  get damageReduction(): number {
    let reduction = 0;
    for (const buff of this._damageReductionBuffs.values()) {
      reduction = Math.max(reduction, buff.reduction);
    }
    return Math.max(0, Math.min(0.95, reduction));
  }

  get isInvincible(): boolean {
    return this._invincibleBuffs.size > 0;
  }

  applyAttackBonus(source: string, bonus: number, duration: number): void {
    if (duration <= 0 || bonus <= 0) return;
    this._attackBuffs.set(source, { bonus, remaining: duration });
  }

  applyDamageReduction(source: string, reduction: number, duration: number): void {
    if (duration <= 0 || reduction <= 0) return;
    this._damageReductionBuffs.set(source, { reduction: Math.min(0.95, reduction), remaining: duration });
  }

  applyInvincible(source: string, duration: number): void {
    if (duration <= 0) return;
    this._invincibleBuffs.set(source, duration);
  }

  applyShield(source: string, amount: number, duration: number): void {
    if (duration <= 0 || amount <= 0) return;
    const current = this._shieldBuffs.get(source);
    this._shieldBuffs.set(source, {
      amount: Math.max(current?.amount ?? 0, Math.round(amount)),
      remaining: Math.max(current?.remaining ?? 0, duration),
    });
  }

  applyStun(duration: number): void {
    if (duration <= 0) return;
    this._stunTimer = Math.max(this._stunTimer, duration);
  }

  applyHealOverTime(source: string, hpRatePerSecond: number, duration: number): void {
    if (duration <= 0 || hpRatePerSecond <= 0) return;
    this._hotEffects.set(source, { rate: hpRatePerSecond, remaining: duration, tickTimer: 0 });
  }

  cleanse(): void {
    this._stunTimer = 0;
  }

  /** 寻找最近敌人 */
  findTarget(enemies: any[]): void {
    if (enemies.length === 0) {
      this._target = null;
      this._targetCandidates = [];
      return;
    }
    let nearest: any = null;
    let minDist = Infinity;
    const gridMgr = GridManager.getInstance();
    const myCenter = gridMgr.cellCenter(this.gridRow, this.gridCol);
    const maxRange = getAttackRangePixels(this.attackRange, gridMgr.cellSize, gridMgr.gap);
    const candidates: any[] = [];
    for (const enemy of enemies) {
      if (!enemy.sprite || enemy.currentHp <= 0) continue;
      if ((enemy as { isTransformed?: boolean }).isTransformed) continue;
      const dx = enemy.sprite.x - myCenter.x;
      const dy = enemy.sprite.y - myCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxRange) continue;
      candidates.push(enemy);
      if (dist < minDist) { minDist = dist; nearest = enemy; }
    }
    this._targetCandidates = candidates;
    this._target = nearest;
  }

  /** 执行攻击 */
  protected abstract performAttack(): void;

  /** 死亡回调 */
  protected abstract onDeath(): void;

  protected updateTimedStatuses(dt: number): void {
    this._stunTimer = Math.max(0, this._stunTimer - dt);
    this._tickTimedMap(this._attackBuffs, dt);
    this._tickTimedMap(this._damageReductionBuffs, dt);
    this._tickTimedMap(this._shieldBuffs, dt);

    for (const [source, remaining] of this._invincibleBuffs) {
      const next = remaining - dt;
      if (next <= 0) {
        this._invincibleBuffs.delete(source);
      } else {
        this._invincibleBuffs.set(source, next);
      }
    }

    for (const [source, effect] of this._hotEffects) {
      effect.remaining -= dt;
      effect.tickTimer += dt;
      while (effect.tickTimer >= 1 && effect.remaining > 0) {
        effect.tickTimer -= 1;
        this.heal(Math.max(1, Math.round(this.maxHp * effect.rate)));
      }
      if (effect.remaining <= 0) {
        this._hotEffects.delete(source);
      }
    }
  }

  private _tickTimedMap<T extends { remaining: number }>(map: Map<string, T>, dt: number): void {
    for (const [source, value] of map) {
      value.remaining -= dt;
      if (value.remaining <= 0) {
        map.delete(source);
      }
    }
  }

  private _absorbWithShields(damage: number): number {
    let remaining = damage;
    for (const [source, shield] of this._shieldBuffs) {
      const absorbed = Math.min(remaining, shield.amount);
      shield.amount -= absorbed;
      remaining -= absorbed;
      if (shield.amount <= 0) {
        this._shieldBuffs.delete(source);
      }
      if (remaining <= 0) return 0;
    }
    return remaining;
  }

  protected _updateHpBar(): void {
    this._hpBar.clear();
    const ratio = this.maxHp > 0 ? Math.max(0, this.currentHp / this.maxHp) : 0;
    const barW = 60;
    const barH = 6;
    const x = -barW / 2;
    const y = -30;

    this._hpBar.fillStyle(0x333333);
    this._hpBar.fillRect(x, y, barW, barH);

    const color = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xcccc44 : 0xcc4444;
    this._hpBar.fillStyle(color);
    this._hpBar.fillRect(x, y, barW * ratio, barH);
  }
}
