/**
 * 唐僧 - 保护目标
 */
import Phaser from 'phaser';
import { GridManager } from '../grid/GridManager';

export class TangMonk {
  sprite: Phaser.GameObjects.Container;
  hp: number = 3;
  maxHp: number = 3;

  private _hearts: Phaser.GameObjects.Graphics;

  private static _monkCount = 0;

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
      fontSize: '12px', color: '#fff5e0', fontStyle: 'bold',
    });
    text.setOrigin(0.5);
    this.sprite.add(text);
  }

  private _drawHearts(): void {
    this._hearts.clear();
    for (let i = 0; i < this.hp; i++) {
      const x = -20 + i * 16;
      this._hearts.fillStyle(0xff4444);
      this._hearts.fillCircle(x, -34, 5);
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

  updateHp(hp: number): void {
    this.hp = hp;
    this._drawHearts();
  }
}
