import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { GridManager } from '../grid/GridManager';

export class TangMonk {
  sprite: Phaser.GameObjects.Container;
  hp: number = 3;
  maxHp: number = 3;

  private _hearts: Phaser.GameObjects.Graphics;
  private _introTween: Phaser.Tweens.Tween | Phaser.Tweens.TweenChain | null = null;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.container(0, 0);
    this._hearts = scene.add.graphics();
    this.sprite.add(this._hearts);
    this._draw(scene);
    this.place();
  }

  private _draw(scene: Phaser.Scene): void {
    const g = scene.add.graphics();
    g.fillStyle(0xddaa44);
    g.fillRoundedRect(-20, -20, 40, 40, 8);
    g.lineStyle(2, 0xffdd88, 0.9);
    g.strokeRoundedRect(-20, -20, 40, 40, 8);
    this.sprite.addAt(g, 0);

    const text = scene.add.text(0, 26, '唐僧', {
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
  }
}
