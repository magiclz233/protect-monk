import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { ARTIFACT_CONFIGS, ArtifactConfigItem, getArtifactCarrySlotCount } from '../config/ArtifactConfig';
import { getUnlockedHeroes, HeroConfigItem } from '../config/HeroConfig';
import { ArtifactData } from '../data/ArtifactData';
import { HeroData } from '../data/HeroData';
import { LevelData } from '../data/LevelData';
import { createCjkText } from '../core/TextStyles';
import { drawHeroBody } from '../render/VisualPainter';
import { ArtifactId, HeroRarity, LevelConfig } from '../types';
import { BATTLE_UI, createBattleButton, drawBattlePanel, playBattlePress } from './BattleUiPrimitives';

interface HeroOptionView {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  nameText: Phaser.GameObjects.Text;
  roleText: Phaser.GameObjects.Text;
  metaText: Phaser.GameObjects.Text;
  selectedMark: Phaser.GameObjects.Text;
  hero: HeroConfigItem;
}

interface ArtifactOptionView {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  nameText: Phaser.GameObjects.Text;
  effectText: Phaser.GameObjects.Text;
  metaText: Phaser.GameObjects.Text;
  selectedMark: Phaser.GameObjects.Text;
  config: ArtifactConfigItem;
}

const ARTIFACT_MARKS: Record<ArtifactId, string> = {
  [ArtifactId.AXE]: '斧',
  [ArtifactId.RETURN_TALISMAN]: '符',
  [ArtifactId.WILLOW_DEW]: '露',
  [ArtifactId.HEADBAND]: '箍',
  [ArtifactId.SKULL_BEADS]: '珠',
  [ArtifactId.DEMON_MIRROR]: '镜',
  [ArtifactId.FIRE_COVER]: '罩',
  [ArtifactId.PLANTAIN_FAN]: '扇',
  [ArtifactId.TURTLE_ARMOR]: '甲',
  [ArtifactId.CLEANSING_DEW]: '净',
  [ArtifactId.DIAMOND_SNARE]: '琢',
  [ArtifactId.KASAYA]: '裟',
};

export class HeroSelectView {
  readonly container: Phaser.GameObjects.Container;

  private readonly _selectedIds: Set<string> = new Set();
  private readonly _selectedArtifacts: Set<ArtifactId> = new Set();
  private readonly _heroViews: Map<string, HeroOptionView> = new Map();
  private readonly _artifactViews: Map<ArtifactId, ArtifactOptionView> = new Map();
  private readonly _tipText: Phaser.GameObjects.Text;
  private _heroCountLabel: Phaser.GameObjects.Text | null = null;
  private _artifactCountLabel: Phaser.GameObjects.Text | null = null;
  private _summaryHeroText: Phaser.GameObjects.Text | null = null;
  private _summaryArtifactText: Phaser.GameObjects.Text | null = null;
  private _artifactSlotLimit: number = 3;
  private _artifactHeaderY = HeroSelectView.ARTIFACT_HEADER_Y;
  private _artifactStartY = HeroSelectView.ARTIFACT_START_Y;

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
      color: '#ffcf86',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 580, useAdvancedWrap: true },
    });
    this._tipText.setOrigin(0.5);
    this._tipText.setDepth(242);
    this._tipText.setAlpha(0);
    this._draw();
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private static readonly PANEL_X = 26;
  private static readonly PANEL_Y = 74;
  private static readonly PANEL_W = 698;
  private static readonly PANEL_H = 1178;
  private static readonly TITLE_Y = 136;
  private static readonly DESC_Y = 182;
  private static readonly HERO_HEADER_Y = 246;
  private static readonly HERO_START_Y = 294;
  private static readonly HERO_CARD_W = 302;
  private static readonly HERO_CARD_H = 60;
  private static readonly HERO_COL_GAP = 16;
  private static readonly HERO_ROW_GAP = 8;
  private static readonly ARTIFACT_HEADER_Y = 800;
  private static readonly ARTIFACT_START_Y = 840;
  private static readonly ARTIFACT_CARD_W = 198;
  private static readonly ARTIFACT_CARD_H = 56;
  private static readonly ARTIFACT_COL_GAP = 16;
  private static readonly ARTIFACT_ROW_GAP = 10;
  private static readonly TIP_Y = 1138;
  private static readonly BTN_Y = 1180;

  private _draw(): void {
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x05070d, 0.86);
    overlay.fillRect(0, 0, 750, 1334);

    const panel = this.scene.add.graphics();
    drawBattlePanel(panel, HeroSelectView.PANEL_X, HeroSelectView.PANEL_Y, HeroSelectView.PANEL_W, HeroSelectView.PANEL_H, {
      fill: BATTLE_UI.surfaceHigh,
      fillAlpha: 0.98,
      stroke: BATTLE_UI.gold,
      strokeAlpha: 0.62,
      radius: 14,
      lineWidth: 3,
      shadow: true,
    });
    panel.fillStyle(0xffffff, 0.045);
    panel.fillRoundedRect(HeroSelectView.PANEL_X + 18, HeroSelectView.PANEL_Y + 18, HeroSelectView.PANEL_W - 36, 138, 12);

    const title = createCjkText(this.scene, 375, HeroSelectView.TITLE_Y, this.level?.name ?? '守护模式', {
      fontSize: '34px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const desc = createCjkText(this.scene, 375, HeroSelectView.DESC_Y, '调整出战阵容，带上最顺手的法宝', {
      fontSize: '19px',
      color: BATTLE_UI.mutedText,
    });
    desc.setOrigin(0.5);

    this.container.add([overlay, panel, title, desc, this._tipText]);
    this._drawHeroes();
    this._drawArtifacts();
    this._drawButtons();
    this.container.setAlpha(0);
    this.container.setScale(0.985);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scale: 1,
      duration: 180,
      ease: 'Cubic.Out',
    });
  }

  private _drawSectionHeader(y: number, label: string, countLabel: string, accent: number): Phaser.GameObjects.Text {
    const g = this.scene.add.graphics();
    g.fillStyle(accent, 0.13);
    g.fillRoundedRect(HeroSelectView.PANEL_X + 30, y - 18, HeroSelectView.PANEL_W - 60, 36, 9);
    g.lineStyle(1.5, accent, 0.42);
    g.strokeRoundedRect(HeroSelectView.PANEL_X + 30, y - 18, HeroSelectView.PANEL_W - 60, 36, 9);

    const title = createCjkText(this.scene, HeroSelectView.PANEL_X + 50, y, label, {
      fontSize: '19px',
      color: '#f7f1d0',
      fontStyle: 'bold',
    });
    title.setOrigin(0, 0.5);

    const count = createCjkText(this.scene, HeroSelectView.PANEL_X + HeroSelectView.PANEL_W - 52, y, countLabel, {
      fontSize: '17px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    count.setOrigin(1, 0.5);
    this.container.add([g, title, count]);
    return count;
  }

  private _drawHeroes(): void {
    const heroData = HeroData.getInstance();
    const heroes = getUnlockedHeroes(this.level?.chapter ?? 9)
      .filter(hero => heroData.get(hero.heroId).unlocked)
      .slice(0, 14);

    heroes.slice(0, 4).forEach(hero => this._selectedIds.add(hero.heroId));
    const heroRows = Math.max(1, Math.ceil(heroes.length / 2));
    this._artifactHeaderY = Math.max(
      560,
      HeroSelectView.HERO_START_Y + heroRows * (HeroSelectView.HERO_CARD_H + HeroSelectView.HERO_ROW_GAP) + 32,
    );
    this._artifactStartY = this._artifactHeaderY + 40;

    this._heroCountLabel = this._drawSectionHeader(
      HeroSelectView.HERO_HEADER_Y,
      '选择英雄',
      `英雄 ${this._selectedIds.size}/4`,
      BATTLE_UI.jade,
    );

    heroes.forEach((hero, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = HeroSelectView.PANEL_X + 34 + col * (HeroSelectView.HERO_CARD_W + HeroSelectView.HERO_COL_GAP);
      const y = HeroSelectView.HERO_START_Y + row * (HeroSelectView.HERO_CARD_H + HeroSelectView.HERO_ROW_GAP);
      const card = this._createHeroCard(hero, x, y);
      this._heroViews.set(hero.heroId, card);
      this.container.add(card.container);
    });
    this._refreshHeroViews();
  }

  private _createHeroCard(hero: HeroConfigItem, x: number, y: number): HeroOptionView {
    const heroData = HeroData.getInstance().get(hero.heroId);
    const container = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();

    const icon = this.scene.add.graphics();
    icon.setPosition(36, 30);
    drawHeroBody(icon, hero.heroId, hero.rarity);
    icon.setScale(0.78);

    const rarityText = createCjkText(this.scene, 74, 17, hero.rarity === HeroRarity.CORE ? '核心' : '普通', {
      fontSize: '12px',
      color: hero.rarity === HeroRarity.CORE ? '#ffd36a' : '#9fd3ff',
      fontStyle: 'bold',
    });
    rarityText.setOrigin(0, 0.5);

    const nameText = createCjkText(this.scene, 114, 17, hero.name, {
      fontSize: '17px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0, 0.5);

    const roleText = createCjkText(this.scene, 74, 41, hero.role, {
      fontSize: '13px',
      color: BATTLE_UI.mutedText,
    });
    roleText.setOrigin(0, 0.5);

    const metaText = createCjkText(this.scene, HeroSelectView.HERO_CARD_W - 14, 39, `${'★'.repeat(heroData.starLevel)}  碎片 ${heroData.shardCount}`, {
      fontSize: '12px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    metaText.setOrigin(1, 0.5);

    const selectedMark = createCjkText(this.scene, HeroSelectView.HERO_CARD_W - 18, 16, '✓', {
      fontSize: '18px',
      color: '#101826',
      fontStyle: 'bold',
      backgroundColor: '#ffd36a',
      padding: { x: 5, y: 0 },
    });
    selectedMark.setOrigin(0.5);

    const hit = this.scene.add.zone(HeroSelectView.HERO_CARD_W / 2, HeroSelectView.HERO_CARD_H / 2, HeroSelectView.HERO_CARD_W, HeroSelectView.HERO_CARD_H);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      playBattlePress(this.scene, container);
      this._toggleHero(hero.heroId);
    });

    container.add([bg, icon, rarityText, nameText, roleText, metaText, selectedMark, hit]);
    return { container, bg, nameText, roleText, metaText, selectedMark, hero };
  }

  private _drawArtifacts(): void {
    const artifactData = ArtifactData.getInstance();
    const levelData = LevelData.getInstance();
    levelData.loadFromSave();
    const clearedChapter = this.level ? levelData.getClearedChapterCount() : 9;
    this._artifactSlotLimit = getArtifactCarrySlotCount(clearedChapter);
    const unlocked = ARTIFACT_CONFIGS.filter(config => artifactData.isUnlocked(config.artifactId));
    const loadout = artifactData.getLoadout().slice(0, this._artifactSlotLimit);
    loadout.forEach(artifactId => this._selectedArtifacts.add(artifactId));
    if (this._selectedArtifacts.size <= 0) {
      unlocked.slice(0, this._artifactSlotLimit).forEach(config => this._selectedArtifacts.add(config.artifactId));
    }

    this._artifactCountLabel = this._drawSectionHeader(
      this._artifactHeaderY,
      '携带法宝',
      `法宝 ${this._selectedArtifacts.size}/${this._artifactSlotLimit}`,
      BATTLE_UI.gold,
    );

    unlocked.forEach((config, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = HeroSelectView.PANEL_X + 34 + col * (HeroSelectView.ARTIFACT_CARD_W + HeroSelectView.ARTIFACT_COL_GAP);
      const y = this._artifactStartY + row * (HeroSelectView.ARTIFACT_CARD_H + HeroSelectView.ARTIFACT_ROW_GAP);
      const card = this._createArtifactCard(config, x, y);
      this._artifactViews.set(config.artifactId, card);
      this.container.add(card.container);
    });
    this._refreshArtifactViews();
    this._drawSummary(Math.max(1, Math.ceil(unlocked.length / 3)));
  }

  private _createArtifactCard(config: ArtifactConfigItem, x: number, y: number): ArtifactOptionView {
    const container = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();
    const level = ArtifactData.getInstance().getLevel(config.artifactId);

    const iconBg = this.scene.add.graphics();
    iconBg.fillStyle(0x2f3a4f, 1);
    iconBg.fillRoundedRect(12, 10, 36, 36, 9);
    iconBg.lineStyle(1.5, BATTLE_UI.goldLight, 0.46);
    iconBg.strokeRoundedRect(12, 10, 36, 36, 9);

    const iconText = createCjkText(this.scene, 30, 28, ARTIFACT_MARKS[config.artifactId], {
      fontSize: '17px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    iconText.setOrigin(0.5);

    const nameText = createCjkText(this.scene, 58, 18, config.name, {
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0, 0.5);

    const effectText = createCjkText(this.scene, 58, 39, config.levelDescriptions[level], {
      fontSize: '11px',
      color: BATTLE_UI.mutedText,
      wordWrap: { width: 98, useAdvancedWrap: true },
    });
    effectText.setOrigin(0, 0.5);

    const metaText = createCjkText(this.scene, HeroSelectView.ARTIFACT_CARD_W - 14, 38, `Lv${level}`, {
      fontSize: '13px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    metaText.setOrigin(1, 0.5);

    const selectedMark = createCjkText(this.scene, HeroSelectView.ARTIFACT_CARD_W - 16, 16, '✓', {
      fontSize: '16px',
      color: '#101826',
      fontStyle: 'bold',
      backgroundColor: '#ffd36a',
      padding: { x: 4, y: 0 },
    });
    selectedMark.setOrigin(0.5);

    const hit = this.scene.add.zone(HeroSelectView.ARTIFACT_CARD_W / 2, HeroSelectView.ARTIFACT_CARD_H / 2, HeroSelectView.ARTIFACT_CARD_W, HeroSelectView.ARTIFACT_CARD_H);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      playBattlePress(this.scene, container);
      this._toggleArtifact(config.artifactId);
    });

    container.add([bg, iconBg, iconText, nameText, effectText, metaText, selectedMark, hit]);
    return { container, bg, nameText, effectText, metaText, selectedMark, config };
  }

  private _drawButtons(): void {
    this.container.add(createBattleButton(this.scene, {
      x: 74,
      y: HeroSelectView.BTN_Y,
      width: 218,
      height: 64,
      label: '返回地图',
      onClick: this.onCancel,
    }));
    this.container.add(createBattleButton(this.scene, {
      x: 458,
      y: HeroSelectView.BTN_Y,
      width: 218,
      height: 64,
      label: this.level ? '开始挑战' : '开始守护',
      primary: true,
      onClick: () => this._startBattle(),
    }));
  }

  private _drawSummary(artifactRows: number): void {
    const y = this._artifactStartY + artifactRows * (HeroSelectView.ARTIFACT_CARD_H + HeroSelectView.ARTIFACT_ROW_GAP) + 34;
    if (y > 1018) return;

    const g = this.scene.add.graphics();
    drawBattlePanel(g, HeroSelectView.PANEL_X + 30, y, HeroSelectView.PANEL_W - 60, 220, {
      fill: 0x121d31,
      fillAlpha: 0.9,
      stroke: BATTLE_UI.strokeSoft,
      strokeAlpha: 0.5,
      radius: 12,
    });
    g.fillStyle(0xffffff, 0.045);
    g.fillRoundedRect(HeroSelectView.PANEL_X + 48, y + 54, HeroSelectView.PANEL_W - 96, 54, 9);
    g.fillRoundedRect(HeroSelectView.PANEL_X + 48, y + 132, HeroSelectView.PANEL_W - 96, 54, 9);

    const title = createCjkText(this.scene, HeroSelectView.PANEL_X + 54, y + 30, '出战预览', {
      fontSize: '19px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    title.setOrigin(0, 0.5);

    const heroLabel = createCjkText(this.scene, HeroSelectView.PANEL_X + 66, y + 81, '英雄', {
      fontSize: '15px',
      color: '#7ff0c5',
      fontStyle: 'bold',
    });
    heroLabel.setOrigin(0, 0.5);

    const artifactLabel = createCjkText(this.scene, HeroSelectView.PANEL_X + 66, y + 159, '法宝', {
      fontSize: '15px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    artifactLabel.setOrigin(0, 0.5);

    this._summaryHeroText = createCjkText(this.scene, HeroSelectView.PANEL_X + 132, y + 81, '', {
      fontSize: '16px',
      color: '#f7f1d0',
      fontStyle: 'bold',
      wordWrap: { width: 500, useAdvancedWrap: true },
    });
    this._summaryHeroText.setOrigin(0, 0.5);

    this._summaryArtifactText = createCjkText(this.scene, HeroSelectView.PANEL_X + 132, y + 159, '', {
      fontSize: '16px',
      color: '#f7f1d0',
      fontStyle: 'bold',
      wordWrap: { width: 500, useAdvancedWrap: true },
    });
    this._summaryArtifactText.setOrigin(0, 0.5);

    this.container.add([g, title, heroLabel, artifactLabel, this._summaryHeroText, this._summaryArtifactText]);
    this._refreshSummary();
  }

  private _startBattle(): void {
    if (this._selectedIds.size <= 0) {
      this._showTip('至少选择 1 名英雄');
      return;
    }
    gameMgr.setSelectedHeroes(Array.from(this._selectedIds));
    ArtifactData.getInstance().setLoadout(Array.from(this._selectedArtifacts), this._artifactSlotLimit);
    this.onStart();
  }

  private _toggleHero(heroId: string): void {
    if (this._selectedIds.has(heroId)) {
      this._selectedIds.delete(heroId);
    } else if (this._selectedIds.size < 4) {
      this._selectedIds.add(heroId);
    } else {
      this._showTip('最多选择 4 名英雄');
    }
    this._refreshHeroViews();
  }

  private _toggleArtifact(artifactId: ArtifactId): void {
    if (this._selectedArtifacts.has(artifactId)) {
      this._selectedArtifacts.delete(artifactId);
    } else if (this._selectedArtifacts.size < this._artifactSlotLimit) {
      this._selectedArtifacts.add(artifactId);
    } else {
      this._showTip(`最多携带 ${this._artifactSlotLimit} 件法宝`);
    }
    this._refreshArtifactViews();
  }

  private _refreshHeroViews(): void {
    for (const [heroId, view] of this._heroViews) {
      const selected = this._selectedIds.has(heroId);
      this._paintOptionBg(view.bg, HeroSelectView.HERO_CARD_W, HeroSelectView.HERO_CARD_H, selected, view.hero.rarity === HeroRarity.CORE);
      view.nameText.setColor(selected ? '#fff7cc' : '#ffffff');
      view.roleText.setColor(selected ? '#d7f7e8' : BATTLE_UI.mutedText);
      view.metaText.setAlpha(selected ? 1 : 0.74);
      view.selectedMark.setVisible(selected);
    }
    this._heroCountLabel?.setText(`英雄 ${this._selectedIds.size}/4`);
    this._refreshSummary();
  }

  private _refreshArtifactViews(): void {
    for (const [artifactId, view] of this._artifactViews) {
      const selected = this._selectedArtifacts.has(artifactId);
      this._paintOptionBg(view.bg, HeroSelectView.ARTIFACT_CARD_W, HeroSelectView.ARTIFACT_CARD_H, selected, false);
      view.nameText.setColor(selected ? '#fff7cc' : '#ffffff');
      view.effectText.setColor(selected ? '#d7f7e8' : BATTLE_UI.mutedText);
      view.metaText.setAlpha(selected ? 1 : 0.74);
      view.selectedMark.setVisible(selected);
    }
    this._artifactCountLabel?.setText(`法宝 ${this._selectedArtifacts.size}/${this._artifactSlotLimit}`);
    this._refreshSummary();
  }

  private _refreshSummary(): void {
    if (this._summaryHeroText) {
      const heroNames = Array.from(this._selectedIds)
        .map(heroId => this._heroViews.get(heroId)?.hero.name)
        .filter((name): name is string => !!name);
      this._summaryHeroText.setText(heroNames.length > 0 ? heroNames.join(' / ') : '至少选择 1 名英雄');
    }

    if (this._summaryArtifactText) {
      const artifactNames = Array.from(this._selectedArtifacts)
        .map(artifactId => this._artifactViews.get(artifactId)?.config.name)
        .filter((name): name is string => !!name);
      this._summaryArtifactText.setText(artifactNames.length > 0 ? artifactNames.join(' / ') : '不携带法宝');
    }
  }

  private _paintOptionBg(
    bg: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    selected: boolean,
    core: boolean,
  ): void {
    bg.clear();
    bg.fillStyle(selected ? 0x214b48 : 0x202b3d, selected ? 0.98 : 0.9);
    bg.fillRoundedRect(0, 0, width, height, 10);
    bg.lineStyle(selected ? 2.4 : 1.5, selected ? (core ? BATTLE_UI.goldLight : BATTLE_UI.jadeLight) : 0xffffff, selected ? 0.78 : 0.14);
    bg.strokeRoundedRect(0, 0, width, height, 10);
    if (selected) {
      bg.fillStyle(core ? BATTLE_UI.gold : BATTLE_UI.jade, 0.12);
      bg.fillRoundedRect(5, 5, width - 10, height - 10, 8);
    }
  }

  private _showTip(text: string): void {
    this.scene.tweens.killTweensOf(this._tipText);
    this._tipText.setText(text);
    this._tipText.setAlpha(1);
    this.scene.time.delayedCall(1600, () => {
      if (this._tipText.text === text) {
        this.scene.tweens.add({
          targets: this._tipText,
          alpha: 0,
          duration: 180,
        });
      }
    });
  }
}
