/**
 * 单位基类 - 棋盘上的友方单位（小兵/英雄）
 * 纯逻辑 + Phaser Container 渲染
 */
import Phaser from 'phaser';
import { AttackType, UnitSide } from '../types';
import { GridManager } from '../grid/GridManager';

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
  private _hpBar: Phaser.GameObjects.Graphics;

  // ---- 攻击计时 ----
  protected _attackTimer: number = 0;
  protected _attackCooldown: number = 1;

  // ---- 目标 ----
  protected _target: any = null;

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
    this._attackTimer += dt;
    if (this._attackTimer >= this._attackCooldown && this._target) {
      this._attackTimer = 0;
      this.performAttack();
    }
  }

  /** 受到伤害 */
  takeDamage(amount: number): void {
    const actualDmg = Math.max(1, amount - this.defense);
    this.currentHp = Math.max(0, this.currentHp - actualDmg);
    this._updateHpBar();
    if (this.currentHp <= 0) {
      this.onDeath();
    }
  }

  /** 寻找最近敌人 */
  findTarget(enemies: any[]): void {
    if (enemies.length === 0) { this._target = null; return; }
    let nearest: any = null;
    let minDist = Infinity;
    const myCenter = GridManager.getInstance().cellCenter(this.gridRow, this.gridCol);
    for (const enemy of enemies) {
      if (!enemy.sprite || enemy.currentHp <= 0) continue;
      const dx = enemy.sprite.x - myCenter.x;
      const dy = enemy.sprite.y - myCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) { minDist = dist; nearest = enemy; }
    }
    this._target = nearest;
  }

  /** 执行攻击 */
  protected abstract performAttack(): void;

  /** 死亡回调 */
  protected abstract onDeath(): void;

  private _updateHpBar(): void {
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
