/**
 * 敌人类 - 妖怪沿路径移动
 */
import Phaser from 'phaser';
import { EnemyConfig, EnemyType } from '../types';
import { GridManager } from '../grid/GridManager';
import { drawEnemyBody } from '../render/VisualPainter';
import { gameMgr } from '../core/GameManager';
import { eventMgr, GameEvent } from '../core/EventManager';
import { Unit } from './Unit';

export class Enemy {
  enemyId: string;
  name: string;
  enemyType: EnemyType;

  maxHp: number;
  currentHp: number;
  attack: number;
  moveSpeed: number;
  baseMoveSpeed: number;
  killExp: number;
  assistExp: number;
  auraExp: number;
  abilities: string[];
  expDistributed: boolean = false;
  lastAttacker: any = null;

  sprite: Phaser.GameObjects.Container;
  private _hpBar: Phaser.GameObjects.Graphics;
  private _bodyGfx!: Phaser.GameObjects.Graphics;

  private _pathIndex: number = 0;
  private _pathDone: boolean = false;
  private _alive: boolean = true;
  private _attackTarget: any = null;
  private _attackTimer: number = 0;
  private _attackCooldown: number = 1.2;
  private _bossSkillTimer: number = 0;
  private _auraTimer: number = 0;
  private _shieldTimer: number = 0;
  private _statusVersion: number = 0;
  private _normalAttackTargets: Set<any> = new Set();

  damagedByHeroes: Set<any> = new Set();
  attackTargetedHeroes: Set<any> = new Set();

  private static TYPE_SCALES: Record<EnemyType, number> = {
    [EnemyType.NORMAL]: 0.8,
    [EnemyType.ELITE]: 1.1,
    [EnemyType.BOSS]: 1.4,
  };

  constructor(scene: Phaser.Scene, config: EnemyConfig) {
    this.enemyId = config.enemyId;
    this.name = config.name;
    this.enemyType = config.type;
    this.maxHp = config.hp;
    this.currentHp = config.hp;
    this.attack = config.attack;
    this.baseMoveSpeed = config.speed * 60;
    this.moveSpeed = this.baseMoveSpeed;
    this.killExp = config.killExp;
    this.assistExp = config.assistExp;
    this.auraExp = config.auraExp;
    this.abilities = config.abilities;

    this.sprite = scene.add.container(0, 0);
    this._hpBar = scene.add.graphics();
    this._bodyGfx = scene.add.graphics();
    this.sprite.add(this._hpBar);
    this.sprite.addAt(this._bodyGfx, 0);
    this._drawBody();
    this._updateHpBar();
  }

  private _drawBody(): void {
    const scale = Enemy.TYPE_SCALES[this.enemyType];

    this._bodyGfx.clear();
    drawEnemyBody(this._bodyGfx, this.enemyId, this.enemyType, scale);
  }

  initOnPath(): void {
    const pp = GridManager.getInstance().pathPoints;
    if (pp.length > 0) {
      this.sprite.x = pp[0].x;
      this.sprite.y = pp[0].y;
      this._pathIndex = 1;
    }
  }

  reset(config: EnemyConfig): void {
    this.enemyId = config.enemyId;
    this.name = config.name;
    this.enemyType = config.type;
    this.maxHp = config.hp;
    this.currentHp = config.hp;
    this.attack = config.attack;
    this.baseMoveSpeed = config.speed * 60;
    this.moveSpeed = this.baseMoveSpeed;
    this.killExp = config.killExp;
    this.assistExp = config.assistExp;
    this.auraExp = config.auraExp;
    this.abilities = config.abilities;
    this.expDistributed = false;
    this.lastAttacker = null;
    this._pathIndex = 0;
    this._pathDone = false;
    this._alive = true;
    this._attackTarget = null;
    this._attackTimer = 0;
    this._bossSkillTimer = 0;
    this._auraTimer = 0;
    this._shieldTimer = 0;
    this._statusVersion++;
    this.damagedByHeroes.clear();
    this.attackTargetedHeroes.clear();
    this._normalAttackTargets.clear();
    this._drawBody();
    this.sprite.setVisible(true);
    this.sprite.setActive(true);
    this._updateHpBar();
  }

  recycle(): void {
    this._alive = false;
    this._pathDone = true;
    this._attackTarget = null;
    this._attackTimer = 0;
    this._bossSkillTimer = 0;
    this._auraTimer = 0;
    this._shieldTimer = 0;
    this._statusVersion++;
    this.expDistributed = false;
    this.lastAttacker = null;
    this.damagedByHeroes.clear();
    this.attackTargetedHeroes.clear();
    this._normalAttackTargets.clear();
    this.moveSpeed = this.baseMoveSpeed;
    this.currentHp = this.maxHp;
    this.sprite.setVisible(false);
    this.sprite.setActive(false);
    this._updateHpBar();
  }

  update(dt: number, allies: Unit[] = []): void {
    if (!this._alive || this._pathDone) return;

    this._updateBossSkills(dt, allies);

    if (this._tryAttackTarget(dt)) return;

    const pp = GridManager.getInstance().pathPoints;

    if (this._pathIndex >= pp.length) {
      this._pathDone = true;
      gameMgr.damageMonk(1);
      this._die();
      return;
    }

    const target = pp[this._pathIndex];
    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const moveStep = this.moveSpeed * dt;

    if (dist <= moveStep) {
      this.sprite.x = target.x;
      this.sprite.y = target.y;
      this._pathIndex++;
    } else {
      this.sprite.x += (dx / dist) * moveStep;
      this.sprite.y += (dy / dist) * moveStep;
    }
  }

  setAttackTarget(target: any | null): void {
    this._attackTarget = target;
  }

  takeDamage(amount: number, attacker?: any): void {
    if (!this._alive) return;
    let finalAmount = amount;
    if (this._shieldTimer > 0 && this.abilities.includes('damage_reflect')) {
      finalAmount = Math.max(1, Math.round(amount * 0.7));
      if (attacker && typeof attacker.takeDamage === 'function') {
        attacker.takeDamage(Math.max(1, Math.round(amount * 0.18)));
      }
    }
    this.currentHp = Math.max(0, this.currentHp - finalAmount);
    if (attacker) {
      this.lastAttacker = attacker;
      this.damagedByHeroes.add(attacker);
    }
    this._updateHpBar();

    if (this.currentHp <= 0) {
      eventMgr.emit(GameEvent.ENEMY_KILLED, this, attacker);
      gameMgr.addKill();
      this._die();
    }
  }

  applySlow(multiplier: number, duration: number): void {
    if (!this._alive) return;
    const version = this._statusVersion;
    this.moveSpeed = this.baseMoveSpeed * multiplier;
    this.sprite.scene.time.delayedCall(duration * 1000, () => {
      if (this._alive && this._statusVersion === version) {
        this.moveSpeed = this.baseMoveSpeed;
      }
    });
  }

  getAllAssistHeroes(): any[] {
    const all = new Set<any>();
    this.damagedByHeroes.forEach(h => all.add(h));
    this.attackTargetedHeroes.forEach(h => all.add(h));
    return Array.from(all);
  }

  private _tryAttackTarget(dt: number): boolean {
    const target = this._attackTarget;
    if (!target || target.currentHp <= 0 || !target.sprite) {
      this._attackTarget = null;
      return false;
    }
    if (this.enemyType === EnemyType.NORMAL && this._normalAttackTargets.has(target)) {
      return false;
    }

    const attackRange = GridManager.getInstance().cellSize * 1.15;
    const dx = target.sprite.x - this.sprite.x;
    const dy = target.sprite.y - this.sprite.y;
    if (Math.sqrt(dx * dx + dy * dy) > attackRange) {
      return false;
    }

    this._attackTimer += dt;
    if (this._attackTimer >= this._attackCooldown) {
      this._attackTimer = 0;
      target.takeDamage(this.attack);
      if (target.heroId === 'heixiongjing') {
        this.takeDamage(Math.max(1, Math.round(this.attack * 0.25)), target);
      }
      this._recordAttackTarget(target);
      if (this.enemyType === EnemyType.NORMAL) {
        this._normalAttackTargets.add(target);
      }
    }

    return this.enemyType !== EnemyType.NORMAL;
  }

  private _updateBossSkills(dt: number, allies: Unit[]): void {
    if (this.enemyType !== EnemyType.BOSS) return;

    this._shieldTimer = Math.max(0, this._shieldTimer - dt);
    this._auraTimer += dt;
    if (this._auraTimer >= 1) {
      this._auraTimer = 0;
      if (this.abilities.includes('burn_aura')) {
        this._damageUnitsInRadius(allies, GridManager.getInstance().cellSize * 1.45, Math.max(1, Math.round(this.attack * 0.25)));
      }
      if (this.abilities.includes('damage_aura')) {
        this._damageUnitsInRadius(allies, GridManager.getInstance().cellSize * 1.25, Math.max(1, Math.round(this.attack * 0.18)));
      }
    }

    this._bossSkillTimer += dt;
    if (this._bossSkillTimer < 8) return;
    this._bossSkillTimer = 0;

    if (this.abilities.includes('hp_regen')) {
      this._heal(Math.max(1, Math.round(this.maxHp * 0.06)));
    }
    if (this.abilities.includes('damage_reflect')) {
      this._shieldTimer = 3;
    }
    if (this.abilities.includes('absorb_unit')) {
      const target = this._nearestLivingUnit(allies, GridManager.getInstance().cellSize * 2.5);
      if (target) {
        target.takeDamage(Math.max(1, Math.round(this.attack * 1.35)));
        this._recordAttackTarget(target);
      }
    }
    if (this.abilities.includes('fireball')) {
      const target = this._nearestLivingUnit(allies);
      if (target) {
        this._damageUnitsAround(target, allies, GridManager.getInstance().cellSize * 1.15, Math.max(1, Math.round(this.attack * 0.85)));
      }
    }
  }

  private _nearestLivingUnit(allies: Unit[], radius: number = Infinity): Unit | null {
    let nearest: Unit | null = null;
    let minDist = Infinity;
    for (const unit of allies) {
      if (unit.currentHp <= 0 || !unit.sprite) continue;
      const dx = unit.sprite.x - this.sprite.x;
      const dy = unit.sprite.y - this.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius && dist < minDist) {
        minDist = dist;
        nearest = unit;
      }
    }
    return nearest;
  }

  private _damageUnitsInRadius(allies: Unit[], radius: number, damage: number): void {
    for (const unit of allies) {
      if (unit.currentHp <= 0 || !unit.sprite) continue;
      const dx = unit.sprite.x - this.sprite.x;
      const dy = unit.sprite.y - this.sprite.y;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) {
        unit.takeDamage(damage);
        this._recordAttackTarget(unit);
      }
    }
  }

  private _damageUnitsAround(center: Unit, allies: Unit[], radius: number, damage: number): void {
    for (const unit of allies) {
      if (unit.currentHp <= 0 || !unit.sprite) continue;
      const dx = unit.sprite.x - center.sprite.x;
      const dy = unit.sprite.y - center.sprite.y;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) {
        unit.takeDamage(unit === center ? damage : Math.round(damage * 0.65));
        this._recordAttackTarget(unit);
      }
    }
  }

  private _recordAttackTarget(target: any): void {
    if (target.attackedByEnemies instanceof Set) {
      target.attackedByEnemies.add(this);
    }
    this.attackTargetedHeroes.add(target);
  }

  private _heal(amount: number): void {
    if (!this._alive || this.currentHp <= 0) return;
    this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
    this._updateHpBar();
  }

  private _die(): void {
    this._alive = false;
    this.sprite.setVisible(false);
  }

  private _updateHpBar(): void {
    this._hpBar.clear();
    const ratio = this.maxHp > 0 ? Math.max(0, this.currentHp / this.maxHp) : 0;
    const barW = 50;
    const barH = 5;
    const x = -barW / 2;
    const y = -32;

    this._hpBar.fillStyle(0x333333);
    this._hpBar.fillRect(x, y, barW, barH);

    const color = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xcccc44 : 0xcc4444;
    this._hpBar.fillStyle(color);
    this._hpBar.fillRect(x, y, barW * ratio, barH);
  }

  get alive(): boolean { return this._alive; }
}
