import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { ARTIFACT_CONFIGS, getArtifactCarrySlotCount } from '../config/ArtifactConfig';
import { getUnlockedHeroes, HeroConfigItem } from '../config/HeroConfig';
import { ArtifactData } from '../data/ArtifactData';
import { HeroData } from '../data/HeroData';
import { LevelData } from '../data/LevelData';
import { createCjkText } from '../core/TextStyles';
import { ArtifactId, LevelConfig } from '../types';

export class HeroSelectView {
  readonly container: Phaser.GameObjects.Container;

  private readonly _selectedIds: Set<string> = new Set();
  private readonly _selectedArtifacts: Set<ArtifactId> = new Set();
  private readonly _heroTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private readonly _artifactTexts: Map<ArtifactId, Phaser.GameObjects.Text> = new Map();
  private readonly _heroConfigs: Map<string, HeroConfigItem> = new Map();
  private readonly _tipText: Phaser.GameObjects.Text;
  private _heroCountLabel: Phaser.GameObjects.Text | null = null;
  private _artifactCountLabel: Phaser.GameObjects.Text | null = null;
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
    this._tipText = createCjkText(scene, 375, HeroSelectView.TIP_Y, '', {
      fontSize: '18px',
      color: '#ffb0b0',
      fontStyle: 'bold',
    });
    this._tipText.setOrigin(0.5);
    this._tipText.setDepth(242);
    this._draw();
  }

  destroy(): void {
    this.container.destroy(true);
  }

  // 布局常量
  private static readonly PANEL_X = 60;
  private static readonly PANEL_Y = 160;
  private static readonly PANEL_W = 630;
  private static readonly PANEL_H = 970;
  private static readonly TITLE_Y = 212;
  private static readonly DESC_Y = 258;
  private static readonly HERO_ZONE_Y = 294;
  private static readonly HERO_ROW_H = 54;
  private static readonly DIVIDER_Y = 686;
  private static readonly ARTIFACT_ZONE_Y = 718;
  private static readonly ARTIFACT_ROW_H = 42;
  private static readonly TIP_Y = 982;
  private static readonly BTN_Y = 1034;

  private _draw(): void {
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x05070d, 0.82);
    overlay.fillRect(0, 0, 750, 1334);

    const panel = this.scene.add.graphics();
    panel.fillStyle(0x172033, 0.98);
    panel.fillRoundedRect(
      HeroSelectView.PANEL_X, HeroSelectView.PANEL_Y,
      HeroSelectView.PANEL_W, HeroSelectView.PANEL_H, 10,
    );
    panel.lineStyle(3, 0xf0c15a, 0.75);
    panel.strokeRoundedRect(
      HeroSelectView.PANEL_X, HeroSelectView.PANEL_Y,
      HeroSelectView.PANEL_W, HeroSelectView.PANEL_H, 10,
    );

    const title = createCjkText(this.scene, 375, HeroSelectView.TITLE_Y, this.level?.name ?? '守护模式', {
      fontSize: '32px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const desc = createCjkText(this.scene, 375, HeroSelectView.DESC_Y, '选择英雄与出战法宝', {
      fontSize: '20px',
      color: '#f7f1d0',
    });
    desc.setOrigin(0.5);

    this.container.add([overlay, panel, title, desc, this._tipText]);
    this._drawHeroes();
    this._drawDivider();
    this._drawArtifacts();
    this._drawButtons();
  }

  private _drawDivider(): void {
    const g = this.scene.add.graphics();
    g.lineStyle(1, 0xf0c15a, 0.28);
    g.beginPath();
    g.moveTo(HeroSelectView.PANEL_X + 24, HeroSelectView.DIVIDER_Y);
    g.lineTo(HeroSelectView.PANEL_X + HeroSelectView.PANEL_W - 24, HeroSelectView.DIVIDER_Y);
    g.strokePath();
    this.container.add(g);
  }

  private _drawHeroes(): void {
    const heroData = HeroData.getInstance();
    const heroes = getUnlockedHeroes(this.level?.chapter ?? 9)
      .filter(hero => heroData.get(hero.heroId).unlocked)
      .slice(0, 14);

    heroes.slice(0, 4).forEach(hero => this._selectedIds.add(hero.heroId));

    this._heroCountLabel = createCjkText(
      this.scene,
      HeroSelectView.PANEL_X + 22, HeroSelectView.HERO_ZONE_Y,
      `英雄 ${this._selectedIds.size}/4`,
      { fontSize: '16px', color: '#8ab4d8', fontStyle: 'bold' },
    );
    this.container.add(this._heroCountLabel);

    const startY = HeroSelectView.HERO_ZONE_Y + 26;
    heroes.forEach((hero, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = HeroSelectView.PANEL_X + 34 + col * 286;
      const y = startY + row * HeroSelectView.HERO_ROW_H;

      const bg = this.scene.add.graphics();
      bg.fillStyle(0x223048, 0.96);
      bg.fillRoundedRect(x, y, 248, 46, 8);
      bg.lineStyle(2, 0xffffff, 0.16);
      bg.strokeRoundedRect(x, y, 248, 46, 8);

      const text = createCjkText(this.scene, x + 124, y + 23, this._heroLabel(hero), {
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 4,
      });
      text.setOrigin(0.5);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this._toggleHero(hero.heroId));

      const hit = this.scene.add.zone(x + 124, y + 23, 248, 46);
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

    this._artifactCountLabel = createCjkText(
      this.scene,
      HeroSelectView.PANEL_X + 22, HeroSelectView.ARTIFACT_ZONE_Y,
      `法宝 ${this._selectedArtifacts.size}/${this._artifactSlotLimit}`,
      { fontSize: '16px', color: '#c8a868', fontStyle: 'bold' },
    );
    this.container.add(this._artifactCountLabel);

    const startY = HeroSelectView.ARTIFACT_ZONE_Y + 30;
    unlocked.forEach((config, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = HeroSelectView.PANEL_X + 30 + col * 196;
      const y = startY + row * HeroSelectView.ARTIFACT_ROW_H;

      const bg = this.scene.add.graphics();
      bg.fillStyle(0x213449, 0.96);
      bg.fillRoundedRect(x, y, 174, 36, 8);
      bg.lineStyle(2, 0xffffff, 0.14);
      bg.strokeRoundedRect(x, y, 174, 36, 8);

      const text = createCjkText(this.scene, x + 87, y + 18, this._artifactLabel(config.artifactId), {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
      });
      text.setOrigin(0.5);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this._toggleArtifact(config.artifactId));

      const hit = this.scene.add.zone(x + 87, y + 18, 174, 36);
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this._toggleArtifact(config.artifactId));

      this._artifactTexts.set(config.artifactId, text);
      this.container.add([bg, text, hit]);
    });
    this._refreshArtifactTexts();
  }

  private _drawButtons(): void {
    const cancelText = this._createButton(210, HeroSelectView.BTN_Y, '返回地图', 0x667080);
    cancelText.on('pointerdown', () => this.onCancel());

    const startText = this._createButton(540, HeroSelectView.BTN_Y, '开始挑战', 0xf0c15a);
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
    const text = createCjkText(this.scene, x, y, label, {
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
    if (this._heroCountLabel) {
      this._heroCountLabel.setText(`英雄 ${this._selectedIds.size}/4`);
    }
  }

  private _refreshArtifactTexts(): void {
    for (const [artifactId, text] of this._artifactTexts) {
      text.setText(this._artifactLabel(artifactId));
      text.setColor(this._selectedArtifacts.has(artifactId) ? '#ffd36a' : '#ffffff');
    }
    if (this._artifactCountLabel) {
      this._artifactCountLabel.setText(`法宝 ${this._selectedArtifacts.size}/${this._artifactSlotLimit}`);
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
