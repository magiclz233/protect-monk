/**
 * 敌人类 - 妖怪沿路径移动
 */
import Phaser from 'phaser';
import { EnemyConfig, EnemyType } from '../types';
import { GridManager } from '../grid/GridManager';
import { gameMgr } from '../core/GameManager';
import { eventMgr, GameEvent } from '../core/EventManager';

export class Enemy {
  enemyId: string;
  name: string;
  enemyType: EnemyType;

  maxHp: number;
  currentHp: number;
  attack: number;
  moveSpeed: number;
  killExp: number;
  assistExp: number;
  auraExp: number;
  abilities: string[];
  expDistributed: boolean = false;

  sprite: Phaser.GameObjects.Container;
  private _hpBar: Phaser.GameObjects.Graphics;
  private _bodyGfx!: Phaser.GameObjects.Graphics;

  private _pathIndex: number = 0;
  private _pathDone: boolean = false;
  private _alive: boolean = true;

  damagedByHeroes: Set<any> = new Set();
  attackTargetedHeroes: Set<any> = new Set();

  private static TYPE_COLORS: Record<EnemyType, number> = {
    [EnemyType.NORMAL]: 0xcc5544,
    [EnemyType.ELITE]: 0xcc44cc,
    [EnemyType.BOSS]: 0xff2222,
  };

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
    this.moveSpeed = config.speed * 60;
    this.killExp = config.killExp;
    this.assistExp = config.assistExp;
    this.auraExp = config.auraExp;
    this.abilities = config.abilities;

    this.sprite = scene.add.container(0, 0);
    this._hpBar = scene.add.graphics();
    this.sprite.add(this._hpBar);
    this._drawBody(scene);
    this._updateHpBar();
  }

  private _drawBody(scene: Phaser.Scene): void {
    const scale = Enemy.TYPE_SCALES[this.enemyType];
    const color = Enemy.TYPE_COLORS[this.enemyType];

    this._bodyGfx = scene.add.graphics();

    if (this.enemyType === EnemyType.BOSS) {
      // BOSS：六边形
      this._bodyGfx.fillStyle(color);
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        pts.push({ x: Math.cos(angle) * 26 * scale, y: Math.sin(angle) * 26 * scale });
      }
      this._bodyGfx.fillPoints(pts, true);
      this._bodyGfx.lineStyle(2, 0xffdd44, 0.8);
      this._bodyGfx.strokePoints(pts, true);
    } else {
      this._bodyGfx.fillStyle(color);
      this._bodyGfx.fillCircle(0, 0, 22 * scale);
      this._bodyGfx.lineStyle(1.5, this.enemyType === EnemyType.ELITE ? 0xff88ff : 0xffffff, 0.4);
      this._bodyGfx.strokeCircle(0, 0, 22 * scale);
    }

    this.sprite.addAt(this._bodyGfx, 0);
  }

  initOnPath(): void {
    const pp = GridManager.getInstance().pathPoints;
    if (pp.length > 0) {
      this.sprite.x = pp[0].x;
      this.sprite.y = pp[0].y;
      this._pathIndex = 1;
    }
  }

  update(dt: number): void {
    if (!this._alive || this._pathDone) return;

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

  takeDamage(amount: number, attacker?: any): void {
    if (!this._alive) return;
    this.currentHp = Math.max(0, this.currentHp - amount);
    if (attacker) this.damagedByHeroes.add(attacker);
    this._updateHpBar();

    if (this.currentHp <= 0) {
      eventMgr.emit(GameEvent.ENEMY_KILLED, this, attacker);
      gameMgr.addKill();
      this._die();
    }
  }

  getAllAssistHeroes(): any[] {
    const all = new Set<any>();
    this.damagedByHeroes.forEach(h => all.add(h));
    this.attackTargetedHeroes.forEach(h => all.add(h));
    return Array.from(all);
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
