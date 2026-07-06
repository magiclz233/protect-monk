import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { getUnlockedHeroes, HeroConfigItem } from '../config/HeroConfig';
import { HeroData } from '../data/HeroData';
import { LevelConfig } from '../types';

export class HeroSelectView {
  readonly container: Phaser.GameObjects.Container;

  private readonly _selectedIds: Set<string> = new Set();
  private readonly _heroTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private readonly _heroConfigs: Map<string, HeroConfigItem> = new Map();
  private readonly _tipText: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly level: LevelConfig,
    private readonly onStart: () => void,
    private readonly onCancel: () => void,
  ) {
    HeroData.getInstance().loadFromSave();
    HeroData.getInstance().ensureDefaults();
    this.container = scene.add.container(0, 0);
    this.container.setDepth(240);
    this._tipText = scene.add.text(375, 842, '', {
      fontSize: '18px',
      color: '#ffb0b0',
      fontStyle: 'bold',
    });
    this._tipText.setOrigin(0.5);
    this._draw();
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private _draw(): void {
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x05070d, 0.82);
    overlay.fillRect(0, 0, 750, 1334);

    const panel = this.scene.add.graphics();
    panel.fillStyle(0x172033, 0.98);
    panel.fillRoundedRect(70, 210, 610, 780, 8);
    panel.lineStyle(3, 0xf0c15a, 0.75);
    panel.strokeRoundedRect(70, 210, 610, 780, 8);

    const title = this.scene.add.text(375, 275, this.level.name, {
      fontSize: '32px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const desc = this.scene.add.text(375, 324, '选择最多 4 名出战英雄，出战碎片概率提升', {
      fontSize: '20px',
      color: '#f7f1d0',
    });
    desc.setOrigin(0.5);

    this.container.add([overlay, panel, title, desc, this._tipText]);
    this._drawHeroes();
    this._drawButtons();
  }

  private _drawHeroes(): void {
    const heroData = HeroData.getInstance();
    const heroes = getUnlockedHeroes(this.level.chapter)
      .filter(hero => heroData.get(hero.heroId).unlocked)
      .slice(0, 14);

    heroes.slice(0, 4).forEach(hero => this._selectedIds.add(hero.heroId));

    heroes.forEach((hero, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 124 + col * 274;
      const y = 384 + row * 90;

      const bg = this.scene.add.graphics();
      bg.fillStyle(0x223048, 0.96);
      bg.fillRoundedRect(x, y, 228, 70, 8);
      bg.lineStyle(2, 0xffffff, 0.16);
      bg.strokeRoundedRect(x, y, 228, 70, 8);

      const text = this.scene.add.text(x + 114, y + 35, this._heroLabel(hero), {
        fontSize: '17px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 4,
      });
      text.setOrigin(0.5);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this._toggleHero(hero.heroId));

      const hit = this.scene.add.zone(x + 114, y + 35, 228, 70);
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this._toggleHero(hero.heroId));

      this._heroConfigs.set(hero.heroId, hero);
      this._heroTexts.set(hero.heroId, text);
      this.container.add([bg, text, hit]);
    });
    this._refreshHeroTexts();
  }

  private _drawButtons(): void {
    const cancelText = this._createButton(205, 902, '返回地图', 0x667080);
    cancelText.on('pointerdown', () => this.onCancel());

    const startText = this._createButton(545, 902, '开始挑战', 0xf0c15a);
    startText.on('pointerdown', () => {
      if (this._selectedIds.size <= 0) {
        this._showTip('至少选择 1 名英雄');
        return;
      }
      gameMgr.setSelectedHeroes(Array.from(this._selectedIds));
      this.onStart();
    });
  }

  private _createButton(x: number, y: number, label: string, color: number): Phaser.GameObjects.Text {
    const bg = this.scene.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(x - 110, y - 34, 220, 68, 8);
    const text = this.scene.add.text(x, y, label, {
      fontSize: '26px',
      color: color === 0xf0c15a ? '#101826' : '#ffffff',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);
    text.setInteractive({ useHandCursor: true });
    this.container.add([bg, text]);
    return text;
  }

  private _toggleHero(heroId: string): void {
    if (this._selectedIds.has(heroId)) {
      this._selectedIds.delete(heroId);
    } else if (this._selectedIds.size < 4) {
      this._selectedIds.add(heroId);
    } else {
      this._showTip('最多选择 4 名英雄');
    }
    this._refreshHeroTexts();
  }

  private _refreshHeroTexts(): void {
    for (const [heroId, text] of this._heroTexts) {
      const hero = this._heroConfigs.get(heroId);
      if (hero) {
        text.setText(this._heroLabel(hero));
      }
      text.setColor(this._selectedIds.has(heroId) ? '#ffd36a' : '#ffffff');
    }
  }

  private _heroLabel(hero: HeroConfigItem): string {
    const data = HeroData.getInstance().get(hero.heroId);
    const selected = this._selectedIds.has(hero.heroId) ? '✓' : '';
    return `${selected}${hero.name}  ${'★'.repeat(data.starLevel)}\n碎片 ${data.shardCount}  概率 x5`;
  }

  private _showTip(text: string): void {
    this._tipText.setText(text);
    this.scene.time.delayedCall(1600, () => {
      if (this._tipText.text === text) {
        this._tipText.setText('');
      }
    });
  }
}
