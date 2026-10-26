import Phaser from 'phaser';
import { getHeroConfig } from '../config/HeroConfig';
import { HERO_VISUALS } from '../config/VisualConfig';
import { createCjkText } from '../core/TextStyles';
import { GridManager } from '../grid/GridManager';
import { heroShardKey } from '../render/AssetKeys';
import { HeroRarity } from '../types';

export class HeroShard {
  readonly heroId: string;
  readonly displayName: string;
  readonly needed: number;
  readonly sprite: Phaser.GameObjects.Container;

  gridRow: number = -1;
  gridCol: number = -1;
  count: number = 1;

  private readonly _bodyGfx: Phaser.GameObjects.Graphics | null;
  private readonly _countBadge: Phaser.GameObjects.Graphics | null;
  private readonly _countText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, heroId: string, count: number = 1) {
    const config = getHeroConfig(heroId);
    this.heroId = heroId;
    this.displayName = config?.name ?? heroId;
    this.needed = config?.shardsNeeded ?? 2;
    this.count = Math.max(1, Math.min(count, this.needed));
    this.sprite = scene.add.container(0, 0);

    const hasTexture = scene.textures.exists(heroShardKey(heroId));
    this._bodyGfx = hasTexture ? null : scene.add.graphics();
    this._drawBody(scene, hasTexture);

    this._countBadge = hasTexture ? scene.add.graphics() : null;
    if (this._countBadge) {
      this._countBadge.fillStyle(0x101826, 0.9);
      this._countBadge.fillRoundedRect(7, 18, 26, 15, 6);
      this._countBadge.lineStyle(1, 0xffdd88, 0.65);
      this._countBadge.strokeRoundedRect(7, 18, 26, 15, 6);
      this.sprite.add(this._countBadge);
    }

    this._countText = createCjkText(scene, hasTexture ? 20 : 0, hasTexture ? 25 : 8, '', {
      fontSize: hasTexture ? '10px' : '13px',
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

  private _drawBody(scene: Phaser.Scene, hasTexture: boolean): void {
    if (hasTexture) {
      const image = scene.add.image(0, 0, heroShardKey(this.heroId));
      image.setDisplaySize(60, 60);
      this.sprite.add(image);
      return;
    }

    const config = getHeroConfig(this.heroId);
    const visual = HERO_VISUALS[this.heroId];
    const isCore = config?.rarity === HeroRarity.CORE;
    const bodyGfx = this._bodyGfx;
    if (!bodyGfx) return;

    bodyGfx.fillStyle(isCore ? 0x7a2d22 : 0x245f56, 0.95);
    bodyGfx.fillRoundedRect(-24, -24, 48, 48, 8);
    bodyGfx.lineStyle(isCore ? 3 : 2, visual?.stroke ?? 0xfff0a6, isCore ? 0.9 : 0.75);
    bodyGfx.strokeRoundedRect(-24, -24, 48, 48, 8);
    bodyGfx.fillStyle(visual?.accent ?? 0xfff0a6, 0.85);
    bodyGfx.fillTriangle(-12, -10, 13, -4, -2, 14);
    this.sprite.add(bodyGfx);

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
