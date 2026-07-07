import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { createCjkText } from '../core/TextStyles';
import { GridManager } from '../grid/GridManager';
import { MONK_KEY } from '../render/AssetKeys';
import { Unit } from './Unit';

export const MONK_AURA_SOURCE = 'tangmonk_aura';

export class TangMonk {
  sprite: Phaser.GameObjects.Container;
  hp: number = 3;
  maxHp: number = 3;

  private _hearts: Phaser.GameObjects.Graphics;
  private _auraGfx: Phaser.GameObjects.Graphics;
  private _introTween: Phaser.Tweens.Tween | Phaser.Tweens.TweenChain | null = null;
  private _auraTimer: number = 0;
  private _auraMultiplier: number = 1;
  private _auraMultiplierTimer: number = 0;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.container(0, 0);
    this._auraGfx = scene.add.graphics();
    this._hearts = scene.add.graphics();
    this.sprite.add(this._auraGfx);
    this.sprite.add(this._hearts);
    this._draw(scene);
    this.place();
  }

  private _draw(scene: Phaser.Scene): void {
    // 使用唐僧图片素材
    if (scene.textures.exists(MONK_KEY)) {
      const img = scene.add.image(0, 0, MONK_KEY);
      img.setScale(0.5); // 96×96 图片缩放到合适大小
      this.sprite.addAt(img, 0);
    } else {
      // 降级：程序化绘制
      const g = scene.add.graphics();
      g.fillStyle(0xddaa44);
      g.fillRoundedRect(-20, -20, 40, 40, 8);
      g.lineStyle(2, 0xffdd88, 0.9);
      g.strokeRoundedRect(-20, -20, 40, 40, 8);
      this.sprite.addAt(g, 0);
    }

    const text = createCjkText(scene, 0, 26, '唐僧', {
      fontSize: '12px',
      color: '#fff5e0',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);
    this.sprite.add(text);
  }

  private _drawHearts(): void {
    this._hearts.clear();
    this.maxHp = gameMgr.maxMonkHp;
    const gap = this.maxHp > 5 ? 11 : 14;
    for (let i = 0; i < this.maxHp; i++) {
      const x = (i - (this.maxHp - 1) / 2) * gap;
      if (i < this.hp) {
        this._hearts.fillStyle(0xff4444);
        this._hearts.fillCircle(x, -34, 5);
      } else {
        this._hearts.lineStyle(2, 0xff7777, 0.72);
        this._hearts.strokeCircle(x, -34, 5);
      }
    }
  }

  place(): void {
    const grid = GridManager.getInstance();
    const monk = grid.getMonkCell();
    const center = grid.cellCenter(monk.row, monk.col);
    this.sprite.x = center.x;
    this.sprite.y = center.y;
    this._drawHearts();
  }

  playIntro(pathPoints: Array<{ x: number; y: number }>, onComplete: () => void): void {
    this._introTween?.stop();
    if (pathPoints.length < 2) {
      this.place();
      onComplete();
      return;
    }

    const start = pathPoints[0];
    this.sprite.setPosition(start.x, start.y);
    this._drawHearts();

    const tweens = pathPoints.slice(1).map(point => ({
      x: point.x,
      y: point.y,
      duration: 120,
      ease: 'Sine.easeInOut',
    }));

    this._introTween = this.sprite.scene.tweens.chain({
      targets: this.sprite,
      tweens,
      onComplete: () => {
        this._introTween = null;
        this.place();
        onComplete();
      },
    });
  }

  updateHp(hp: number): void {
    this.hp = hp;
    this.maxHp = gameMgr.maxMonkHp;
    this._drawHearts();
    this._drawAura();
  }

  updateAura(dt: number, allies: Unit[]): void {
    this.maxHp = gameMgr.maxMonkHp;
    this._auraMultiplierTimer = Math.max(0, this._auraMultiplierTimer - dt);
    if (this._auraMultiplierTimer <= 0) {
      this._auraMultiplier = 1;
    }

    this._auraTimer += dt;
    if (this._auraTimer < 1) return;
    this._auraTimer = 0;

    const attackBonus = this.attackAuraBonus * this._auraMultiplier;
    const regenRate = this.globalRegenRate * this._auraMultiplier;

    for (const ally of allies) {
      if (ally.currentHp <= 0) continue;
      if (regenRate > 0) {
        ally.heal(Math.max(1, Math.round(ally.maxHp * regenRate)));
      }
      if (attackBonus > 0) {
        ally.applyAttackBonus(MONK_AURA_SOURCE, attackBonus, 1.15);
      }
    }
  }

  boostAura(multiplier: number, duration: number): void {
    this._auraMultiplier = Math.max(this._auraMultiplier, multiplier);
    this._auraMultiplierTimer = Math.max(this._auraMultiplierTimer, duration);
    this._drawAura();
  }

  get attackAuraRangeCells(): number {
    const ratio = this.maxHp > 0 ? this.hp / this.maxHp : 0;
    if (ratio >= 0.67) return 2;
    if (ratio >= 0.34) return 1;
    return 0;
  }

  get attackAuraBonus(): number {
    const ratio = this.maxHp > 0 ? this.hp / this.maxHp : 0;
    if (ratio >= 0.67) return 0.1;
    if (ratio >= 0.34) return 0.05;
    return 0;
  }

  get globalRegenRate(): number {
    const maxHp = Math.max(1, this.maxHp);
    const missingRatio = Math.max(0, (maxHp - this.hp) / maxHp);
    const maxHpPressure = Math.max(0, Math.min(1, (maxHp - 3) / 4));
    return Math.min(0.03, 0.003 + missingRatio * 0.018 + missingRatio * maxHpPressure * 0.011);
  }

  private _drawAura(): void {
    this._auraGfx.clear();
    const range = this.attackAuraRangeCells;
    if (range <= 0) return;
    const grid = GridManager.getInstance();
    const radius = range * (grid.cellSize + grid.gap) + grid.cellSize * 0.25;
    this._auraGfx.fillStyle(0xffdd88, 0.08 * this._auraMultiplier);
    this._auraGfx.fillCircle(0, 0, radius);
    this._auraGfx.lineStyle(2, 0xffdd88, 0.22 * this._auraMultiplier);
    this._auraGfx.strokeCircle(0, 0, radius);
  }
}
