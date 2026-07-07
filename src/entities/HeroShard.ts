import Phaser from 'phaser';
import { getHeroConfig } from '../config/HeroConfig';
import { HERO_VISUALS } from '../config/VisualConfig';
import { createCjkText } from '../core/TextStyles';
import { GridManager } from '../grid/GridManager';
import { HeroRarity } from '../types';

export class HeroShard {
  readonly heroId: string;
  readonly displayName: string;
  readonly needed: number;
  readonly sprite: Phaser.GameObjects.Container;

  gridRow: number = -1;
  gridCol: number = -1;
  count: number = 1;

  private readonly _bodyGfx: Phaser.GameObjects.Graphics;
  private readonly _countText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, heroId: string, count: number = 1) {
    const config = getHeroConfig(heroId);
    this.heroId = heroId;
    this.displayName = config?.name ?? heroId;
    this.needed = config?.shardsNeeded ?? 2;
    this.count = Math.max(1, Math.min(count, this.needed));
    this.sprite = scene.add.container(0, 0);

    this._bodyGfx = scene.add.graphics();
    this._drawBody(scene);
    this._countText = createCjkText(scene, 0, 8, '', {
      fontSize: '13px',
      color: '#fff4c2',
      fontStyle: 'bold',
      stroke: '#101826',
      strokeThickness: 3,
    });
    this._countText.setOrigin(0.5);
    this.sprite.add(this._countText);
    this._refreshCountText();
  }

  place(row: number, col: number): void {
    this.gridRow = row;
    this.gridCol = col;
    const center = GridManager.getInstance().cellCenter(row, col);
    this.sprite.x = center.x;
    this.sprite.y = center.y;
  }

  canStack(heroId: string): boolean {
    return this.heroId === heroId && this.count < this.needed;
  }

  addShard(amount: number = 1): boolean {
    if (this.count >= this.needed) return false;
    this.count = Math.min(this.needed, this.count + amount);
    this._refreshCountText();
    return true;
  }

  isComplete(): boolean {
    return this.count >= this.needed;
  }

  destroy(): void {
    this.sprite.destroy();
  }

  private _drawBody(scene: Phaser.Scene): void {
    const config = getHeroConfig(this.heroId);
    const visual = HERO_VISUALS[this.heroId];
    const isCore = config?.rarity === HeroRarity.CORE;

    this._bodyGfx.fillStyle(isCore ? 0x7a2d22 : 0x245f56, 0.95);
    this._bodyGfx.fillRoundedRect(-24, -24, 48, 48, 8);
    this._bodyGfx.lineStyle(isCore ? 3 : 2, visual?.stroke ?? 0xfff0a6, isCore ? 0.9 : 0.75);
    this._bodyGfx.strokeRoundedRect(-24, -24, 48, 48, 8);
    this._bodyGfx.fillStyle(visual?.accent ?? 0xfff0a6, 0.85);
    this._bodyGfx.fillTriangle(-12, -10, 13, -4, -2, 14);
    this.sprite.add(this._bodyGfx);

    const shardText = createCjkText(scene, 0, -10, '碎', {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    shardText.setOrigin(0.5);
    this.sprite.add(shardText);

    const nameText = createCjkText(scene, 0, 25, this.displayName.slice(0, 2), {
      fontSize: '10px',
      color: '#fff4c2',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0.5);
    this.sprite.add(nameText);
  }

  private _refreshCountText(): void {
    this._countText.setText(`${this.count}/${this.needed}`);
  }
}
