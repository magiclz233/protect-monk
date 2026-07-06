import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { ARTIFACT_CONFIGS, getArtifactCarrySlotCount } from '../config/ArtifactConfig';
import { getUnlockedHeroes, HeroConfigItem } from '../config/HeroConfig';
import { ArtifactData } from '../data/ArtifactData';
import { HeroData } from '../data/HeroData';
import { LevelData } from '../data/LevelData';
import { ArtifactId, LevelConfig } from '../types';

export class HeroSelectView {
  readonly container: Phaser.GameObjects.Container;

  private readonly _selectedIds: Set<string> = new Set();
  private readonly _selectedArtifacts: Set<ArtifactId> = new Set();
  private readonly _heroTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private readonly _artifactTexts: Map<ArtifactId, Phaser.GameObjects.Text> = new Map();
  private readonly _heroConfigs: Map<string, HeroConfigItem> = new Map();
  private readonly _tipText: Phaser.GameObjects.Text;
  private _artifactSlotLimit: number = 3;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly level: LevelConfig | null,
    private readonly onStart: () => void,
    private readonly onCancel: () => void,
  ) {
    HeroData.getInstance().loadFromSave();
    HeroData.getInstance().ensureDefaults();
    ArtifactData.getInstance().loadFromSave();
    ArtifactData.getInstance().ensureDefaults();
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
    panel.fillRoundedRect(70, 190, 610, 850, 8);
    panel.lineStyle(3, 0xf0c15a, 0.75);
    panel.strokeRoundedRect(70, 190, 610, 850, 8);

    const title = this.scene.add.text(375, 248, this.level?.name ?? '守护模式', {
      fontSize: '32px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const desc = this.scene.add.text(375, 294, '选择英雄与出战法宝', {
      fontSize: '20px',
      color: '#f7f1d0',
    });
    desc.setOrigin(0.5);

    this.container.add([overlay, panel, title, desc, this._tipText]);
    this._drawHeroes();
    this._drawArtifacts();
    this._drawButtons();
  }

  private _drawHeroes(): void {
    const heroData = HeroData.getInstance();
    const heroes = getUnlockedHeroes(this.level?.chapter ?? 9)
      .filter(hero => heroData.get(hero.heroId).unlocked)
      .slice(0, 14);

    heroes.slice(0, 4).forEach(hero => this._selectedIds.add(hero.heroId));

    heroes.forEach((hero, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 124 + col * 274;
      const y = 344 + row * 62;

      const bg = this.scene.add.graphics();
      bg.fillStyle(0x223048, 0.96);
      bg.fillRoundedRect(x, y, 228, 52, 8);
      bg.lineStyle(2, 0xffffff, 0.16);
      bg.strokeRoundedRect(x, y, 228, 52, 8);

      const text = this.scene.add.text(x + 114, y + 26, this._heroLabel(hero), {
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 4,
      });
      text.setOrigin(0.5);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this._toggleHero(hero.heroId));

      const hit = this.scene.add.zone(x + 114, y + 26, 228, 52);
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this._toggleHero(hero.heroId));

      this._heroConfigs.set(hero.heroId, hero);
      this._heroTexts.set(hero.heroId, text);
      this.container.add([bg, text, hit]);
    });
    this._refreshHeroTexts();
  }

  private _drawArtifacts(): void {
    const artifactData = ArtifactData.getInstance();
    const levelData = LevelData.getInstance();
    levelData.loadFromSave();
    const clearedChapter = this.level ? Math.max(0, Math.floor((levelData.currentLevel - 1) / 9)) : 9;
    this._artifactSlotLimit = getArtifactCarrySlotCount(clearedChapter);
    const unlocked = ARTIFACT_CONFIGS.filter(config => artifactData.isUnlocked(config.artifactId));
    const loadout = artifactData.getLoadout().slice(0, this._artifactSlotLimit);
    loadout.forEach(artifactId => this._selectedArtifacts.add(artifactId));
    if (this._selectedArtifacts.size <= 0) {
      unlocked.slice(0, this._artifactSlotLimit).forEach(config => this._selectedArtifacts.add(config.artifactId));
    }

    const title = this.scene.add.text(124, 790, `法宝 ${this._selectedArtifacts.size}/${this._artifactSlotLimit}`, {
      fontSize: '20px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    this.container.add(title);

    unlocked.forEach((config, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 104 + col * 182;
      const y = 830 + row * 50;

      const bg = this.scene.add.graphics();
      bg.fillStyle(0x213449, 0.96);
      bg.fillRoundedRect(x, y, 162, 40, 8);
      bg.lineStyle(2, 0xffffff, 0.14);
      bg.strokeRoundedRect(x, y, 162, 40, 8);

      const text = this.scene.add.text(x + 81, y + 20, this._artifactLabel(config.artifactId), {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
      });
      text.setOrigin(0.5);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this._toggleArtifact(config.artifactId));

      const hit = this.scene.add.zone(x + 81, y + 20, 162, 40);
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this._toggleArtifact(config.artifactId));

      this._artifactTexts.set(config.artifactId, text);
      this.container.add([bg, text, hit]);
    });
    this._refreshArtifactTexts();
  }

  private _drawButtons(): void {
    const cancelText = this._createButton(205, 964, '返回地图', 0x667080);
    cancelText.on('pointerdown', () => this.onCancel());

    const startText = this._createButton(545, 964, '开始挑战', 0xf0c15a);
    startText.on('pointerdown', () => {
      if (this._selectedIds.size <= 0) {
        this._showTip('至少选择 1 名英雄');
        return;
      }
      gameMgr.setSelectedHeroes(Array.from(this._selectedIds));
      ArtifactData.getInstance().setLoadout(Array.from(this._selectedArtifacts), this._artifactSlotLimit);
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

  private _toggleArtifact(artifactId: ArtifactId): void {
    if (this._selectedArtifacts.has(artifactId)) {
      this._selectedArtifacts.delete(artifactId);
    } else if (this._selectedArtifacts.size < this._artifactSlotLimit) {
      this._selectedArtifacts.add(artifactId);
    } else {
      this._showTip(`最多携带 ${this._artifactSlotLimit} 件法宝`);
    }
    this._refreshArtifactTexts();
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

  private _refreshArtifactTexts(): void {
    for (const [artifactId, text] of this._artifactTexts) {
      text.setText(this._artifactLabel(artifactId));
      text.setColor(this._selectedArtifacts.has(artifactId) ? '#ffd36a' : '#ffffff');
    }
  }

  private _heroLabel(hero: HeroConfigItem): string {
    const data = HeroData.getInstance().get(hero.heroId);
    const selected = this._selectedIds.has(hero.heroId) ? '✓' : '';
    return `${selected}${hero.name} ${'★'.repeat(data.starLevel)}  碎片 ${data.shardCount}`;
  }

  private _artifactLabel(artifactId: ArtifactId): string {
    const config = ARTIFACT_CONFIGS.find(item => item.artifactId === artifactId);
    const selected = this._selectedArtifacts.has(artifactId) ? '✓' : '';
    return `${selected}${config?.name ?? artifactId} Lv${ArtifactData.getInstance().getLevel(artifactId)}`;
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
