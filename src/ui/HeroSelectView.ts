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
import { heroKey } from '../render/AssetKeys';
import {
  UI_TOKENS, drawLacquerPanel, drawPaperPanel,
  createUiButton, playUiPress,
} from './DesignTokens';

interface HeroOptionView {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  nameText: Phaser.GameObjects.Text;
  roleText: Phaser.GameObjects.Text;
  metaText: Phaser.GameObjects.Text;
  selectedMark: Phaser.GameObjects.Text;
  coreBadge: Phaser.GameObjects.Text;
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
  private _summaryAvatarObjects: Phaser.GameObjects.GameObject[] = [];
  private _heroCountLabel: Phaser.GameObjects.Text | null = null;
  private _artifactCountLabel: Phaser.GameObjects.Text | null = null;
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
      fontSize: '22px',
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
      align: 'center',
      backgroundColor: 'rgba(16,45,39,0.92)',
      padding: { x: 14, y: 8 },
      wordWrap: { width: 580, useAdvancedWrap: true },
    });
    this._tipText.setOrigin(0.5);
    this._tipText.setDepth(242);
    this._tipText.setVisible(false);
    this._draw();
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private static readonly PANEL_X = 26;
  private static readonly PANEL_W = 698;
  private static readonly SHEET_Y = 318;       // 宣纸大面板顶部
  private static readonly SHEET_H = 846;       // 宣纸大面板高度（到 footer 上沿）
  private static readonly HERO_HEADER_Y = 356;
  private static readonly HERO_START_Y = 400;
  private static readonly HERO_CARD_W = 302;
  private static readonly HERO_CARD_H = 96;
  private static readonly HERO_COL_GAP = 16;
  private static readonly HERO_ROW_GAP = 12;
  private static readonly ARTIFACT_HEADER_Y = 760;
  private static readonly ARTIFACT_START_Y = 800;
  private static readonly ARTIFACT_CARD_W = 198;
  private static readonly ARTIFACT_CARD_H = 64;
  private static readonly ARTIFACT_COL_GAP = 16;
  private static readonly ARTIFACT_ROW_GAP = 14;
  private static readonly TIP_Y = 1138;
  private static readonly BTN_Y = 1218;
  private static readonly FOOTER_Y = 1164;     // 底部纸色 footer 顶边

  private _draw(): void {
    // 深松绿整页背景（设计稿 prepare-bg：var(--pine-950)）
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(UI_TOKENS.pine950, 1);
    overlay.fillRect(0, 0, 750, 1334);
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, 750, 1334),
      Phaser.Geom.Rectangle.Contains,
    );

    // 顶部标题区：金色眉标 + 页面标题
    const eyebrow = createCjkText(this.scene, 375, 88, this.level ? '八十一难 · 出战准备' : '守护模式 · 出战准备', {
      fontSize: '22px',
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
    eyebrow.setOrigin(0.5);

    const title = createCjkText(this.scene, 375, 140, this.level?.name ?? '守护唐僧', {
      fontSize: '44px',
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    this.container.add([overlay, eyebrow, title, this._tipText]);
    this._drawLoadoutSummary();
    this._drawPaperSheet();
    this._drawHeroes();
    this._drawArtifacts();
    this._refreshSummaryAvatars();
    this._drawFooter();
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

  /** 顶部阵容摘要条（设计稿 loadout-summary：漆面板 + 已选英雄头像圈） */
  private _drawLoadoutSummary(): void {
    const x = 40, y = 218, w = 670, h = 76;
    const g = this.scene.add.graphics();
    drawLacquerPanel(g, x, y, w, h, { radius: 18, shadow: false });
    this.container.add(g);

    const label = createCjkText(this.scene, x + 288, y + 26, '出战阵容', {
      fontSize: '24px',
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
    });
    label.setOrigin(0, 0.5);
    const sub = createCjkText(this.scene, x + 288, y + 56, '点卡片调整出战英雄', {
      fontSize: '21px',
      color: UI_TOKENS.textMutedOnDark,
    });
    sub.setOrigin(0, 0.5);
    this.container.add([label, sub]);
    this._refreshSummaryAvatars();
  }

  /** 摘要条头像：跟随当前选中状态重建（最多 4 个） */
  private _refreshSummaryAvatars(): void {
    for (const obj of this._summaryAvatarObjects) obj.destroy();
    this._summaryAvatarObjects = [];

    const x = 40, y = 218, h = 76;
    const selectedIds = Array.from(this._selectedIds).slice(0, 4);
    selectedIds.forEach((heroId, i) => {
      const ax = x + 46 + i * 56;
      if (this.scene.textures.exists(heroKey(heroId))) {
        const avatar = this.scene.add.image(ax, y + h / 2, heroKey(heroId));
        avatar.setDisplaySize(52, 52);
        this._summaryAvatarObjects.push(avatar);
      }
      const ring = this.scene.add.graphics();
      ring.lineStyle(3, UI_TOKENS.gold, 0.9);
      ring.strokeCircle(ax, y + h / 2, 28);
      this._summaryAvatarObjects.push(ring);
    });
    const emptySlots = Math.max(0, 4 - selectedIds.length);
    for (let i = 0; i < emptySlots; i++) {
      const ax = x + 46 + (selectedIds.length + i) * 56;
      const ring = this.scene.add.graphics();
      ring.fillStyle(UI_TOKENS.pine800, 0.8);
      ring.fillCircle(ax, y + h / 2, 26);
      ring.lineStyle(2, UI_TOKENS.gold, 0.35);
      ring.strokeCircle(ax, y + h / 2, 28);
      this._summaryAvatarObjects.push(ring);
    }
    if (this._summaryAvatarObjects.length > 0) {
      this.container.add(this._summaryAvatarObjects);
    }
  }

  /** 宣纸大面板（设计稿 prepare-panel）：承载英雄/法宝选择区 */
  private _drawPaperSheet(): void {
    const g = this.scene.add.graphics();
    drawPaperPanel(g, HeroSelectView.PANEL_X, HeroSelectView.SHEET_Y, HeroSelectView.PANEL_W, HeroSelectView.SHEET_H, { radius: 24 });
    this.container.add(g);

    const hint = createCjkText(this.scene, 375, HeroSelectView.SHEET_Y + HeroSelectView.SHEET_H - 34,
      '点卡片调整出战 · 点星级碎片区升星', {
      fontSize: '20px',
      color: UI_TOKENS.textMutedOnPaper,
    });
    hint.setOrigin(0.5);
    this.container.add(hint);
  }

  /** 底部纸色 footer（设计稿 prepare-footer）：返回 + 开始 */
  private _drawFooter(): void {
    const g = this.scene.add.graphics();
    g.fillStyle(0xefe1bf, 1);
    g.fillRect(0, HeroSelectView.FOOTER_Y, 750, 1334 - HeroSelectView.FOOTER_Y);
    g.lineStyle(3, 0xb99b65, 1);
    g.beginPath();
    g.moveTo(0, HeroSelectView.FOOTER_Y + 1.5);
    g.lineTo(750, HeroSelectView.FOOTER_Y + 1.5);
    g.strokePath();
    this.container.add(g);

    this.container.add(createUiButton(this.scene, {
      x: 74,
      y: HeroSelectView.BTN_Y,
      width: 218,
      height: 76,
      label: '返回地图',
      secondary: true,
      fontSize: '26px',
      onClick: this.onCancel,
    }));
    this.container.add(createUiButton(this.scene, {
      x: 458,
      y: HeroSelectView.BTN_Y,
      width: 218,
      height: 76,
      label: this.level ? '开始挑战' : '开始守护',
      primary: true,
      fontSize: '28px',
      onClick: () => this._startBattle(),
    }));
  }

  /** 区头（宣纸面板内）：淡金底条 + 墨字 + 朱砂计数 */
  private _drawSectionHeader(y: number, label: string, countLabel: string): Phaser.GameObjects.Text {
    const g = this.scene.add.graphics();
    g.fillStyle(0xe3d3af, 0.75);
    g.fillRoundedRect(HeroSelectView.PANEL_X + 30, y - 24, HeroSelectView.PANEL_W - 60, 48, 14);
    g.lineStyle(1.5, 0xb89b65, 0.6);
    g.strokeRoundedRect(HeroSelectView.PANEL_X + 30, y - 24, HeroSelectView.PANEL_W - 60, 48, 14);

    const title = createCjkText(this.scene, HeroSelectView.PANEL_X + 52, y, label, {
      fontSize: '26px',
      color: '#173f35',
      fontStyle: 'bold',
    });
    title.setOrigin(0, 0.5);

    const count = createCjkText(this.scene, HeroSelectView.PANEL_X + HeroSelectView.PANEL_W - 52, y, countLabel, {
      fontSize: '24px',
      color: '#8e2f25',
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

    const availableIds = new Set(heroes.map(hero => hero.heroId));
    const previousIds = gameMgr.selectedHeroes.filter(heroId => availableIds.has(heroId)).slice(0, 4);
    const initialIds = previousIds.length > 0 ? previousIds : heroes.slice(0, 4).map(hero => hero.heroId);
    initialIds.forEach(heroId => this._selectedIds.add(heroId));
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
    icon.setPosition(44, 48);
    drawHeroBody(icon, hero.heroId, hero.rarity);
    icon.setScale(1.05);

    // 核心角标：金底深棕（设计稿 .hero-card.core::before）
    const coreBadge = createCjkText(this.scene, 2, 2, '核心', {
      fontSize: '17px',
      color: '#5f3b13',
      fontStyle: 'bold',
      backgroundColor: '#f2d484',
      padding: { x: 8, y: 2 },
    });
    coreBadge.setOrigin(0, 0.5);

    const nameText = createCjkText(this.scene, 112, 28, hero.name, {
      fontSize: '25px',
      color: '#173f35',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0, 0.5);

    const roleText = createCjkText(this.scene, 112, 60, hero.role, {
      fontSize: '19px',
      color: '#776a56',
    });
    roleText.setOrigin(0, 0.5);

    const metaText = createCjkText(this.scene, HeroSelectView.HERO_CARD_W - 16, 76, `${'★'.repeat(heroData.starLevel)}  碎片 ${heroData.shardCount}`, {
      fontSize: '18px',
      color: '#ae7529',
      fontStyle: 'bold',
    });
    metaText.setOrigin(1, 0.5);

    // 选中标记：玉绿圆底白勾（设计稿 .hero-check）
    const selectedMark = createCjkText(this.scene, HeroSelectView.HERO_CARD_W - 24, 24, '✓', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#3e8e75',
      padding: { x: 7, y: 3 },
    });
    selectedMark.setOrigin(0.5);

    const hit = this.scene.add.zone(HeroSelectView.HERO_CARD_W / 2, HeroSelectView.HERO_CARD_H / 2, HeroSelectView.HERO_CARD_W, HeroSelectView.HERO_CARD_H);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      playUiPress(this.scene, container);
      // 点击右上角星级/碎片数字区 → 升星；其余区域 → 选中/取消
      if (metaText.getBounds().contains(pointer.worldX, pointer.worldY)) {
        this._tryUpgradeStar(hero.heroId);
      } else {
        this._toggleHero(hero.heroId);
      }
    });

    container.add([bg, icon, coreBadge, nameText, roleText, metaText, selectedMark, hit]);
    return { container, bg, nameText, roleText, metaText, selectedMark, coreBadge, hero };
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
  }

  private _createArtifactCard(config: ArtifactConfigItem, x: number, y: number): ArtifactOptionView {
    const container = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();
    const level = ArtifactData.getInstance().getLevel(config.artifactId);

    const iconBg = this.scene.add.graphics();
    iconBg.fillStyle(0x245a49, 1);
    iconBg.fillRoundedRect(12, 14, 36, 36, 9);
    iconBg.lineStyle(1.5, UI_TOKENS.goldLight, 0.55);
    iconBg.strokeRoundedRect(12, 14, 36, 36, 9);

    const iconText = createCjkText(this.scene, 30, 32, ARTIFACT_MARKS[config.artifactId], {
      fontSize: '19px',
      color: '#f2d484',
      fontStyle: 'bold',
    });
    iconText.setOrigin(0.5);

    const nameText = createCjkText(this.scene, 58, 22, config.name, {
      fontSize: '20px',
      color: '#173f35',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0, 0.5);

    const effectText = createCjkText(this.scene, 58, 46, config.levelDescriptions[level], {
      fontSize: '15px',
      color: '#776a56',
      wordWrap: { width: 98, useAdvancedWrap: true },
    });
    effectText.setOrigin(0, 0.5);

    const metaText = createCjkText(this.scene, HeroSelectView.ARTIFACT_CARD_W - 14, 46, `Lv${level}`, {
      fontSize: '17px',
      color: '#ae7529',
      fontStyle: 'bold',
    });
    metaText.setOrigin(1, 0.5);

    const selectedMark = createCjkText(this.scene, HeroSelectView.ARTIFACT_CARD_W - 16, 16, '✓', {
      fontSize: '19px',
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#3e8e75',
      padding: { x: 5, y: 2 },
    });
    selectedMark.setOrigin(0.5);

    const hit = this.scene.add.zone(HeroSelectView.ARTIFACT_CARD_W / 2, HeroSelectView.ARTIFACT_CARD_H / 2, HeroSelectView.ARTIFACT_CARD_W, HeroSelectView.ARTIFACT_CARD_H);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      playUiPress(this.scene, container);
      this._toggleArtifact(config.artifactId);
    });

    container.add([bg, iconBg, iconText, nameText, effectText, metaText, selectedMark, hit]);
    return { container, bg, nameText, effectText, metaText, selectedMark, config };
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

  /** 点击卡片右上角星级/碎片数字区 → 消耗同名碎片升星 */
  private _tryUpgradeStar(heroId: string): void {
    const data = HeroData.getInstance().get(heroId);
    const result = HeroData.getInstance().upgradeStar(heroId);
    if (result === 'ok') {
      this._refreshHeroMeta(heroId);
      this._showTip(`升星成功，当前 ${data.starLevel} 星`);
    } else if (result === 'no_shard') {
      this._showTip(`碎片不足，升到 ${data.starLevel + 1} 星需要 ${data.starLevel} 个同名碎片`);
    } else {
      this._showTip('已达 5 星上限');
    }
  }

  private _refreshHeroMeta(heroId: string): void {
    const view = this._heroViews.get(heroId);
    if (!view) return;
    const data = HeroData.getInstance().get(heroId);
    view.metaText.setText(`${'★'.repeat(data.starLevel)}  碎片 ${data.shardCount}`);
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
      const core = view.hero.rarity === HeroRarity.CORE;
      this._paintOptionBg(view.bg, HeroSelectView.HERO_CARD_W, HeroSelectView.HERO_CARD_H, selected, core);
      view.nameText.setColor('#173f35');
      view.roleText.setColor(selected ? '#4c5148' : '#776a56');
      view.metaText.setAlpha(selected ? 1 : 0.74);
      view.selectedMark.setVisible(selected);
      view.coreBadge.setVisible(core);
    }
    this._heroCountLabel?.setText(`英雄 ${this._selectedIds.size}/4`);
    this._refreshSummaryAvatars();
  }

  private _refreshArtifactViews(): void {
    for (const [artifactId, view] of this._artifactViews) {
      const selected = this._selectedArtifacts.has(artifactId);
      this._paintOptionBg(view.bg, HeroSelectView.ARTIFACT_CARD_W, HeroSelectView.ARTIFACT_CARD_H, selected, false);
      view.nameText.setColor('#173f35');
      view.effectText.setColor(selected ? '#4c5148' : '#776a56');
      view.metaText.setAlpha(selected ? 1 : 0.74);
      view.selectedMark.setVisible(selected);
    }
    this._artifactCountLabel?.setText(`法宝 ${this._selectedArtifacts.size}/${this._artifactSlotLimit}`);
  }

  private _paintOptionBg(
    bg: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    selected: boolean,
    core: boolean,
  ): void {
    // 宣纸卡体系（设计稿 .hero-card）：未选中暖纸底，选中玉绿描边 + 浅玉底
    bg.clear();
    bg.fillStyle(0x3f301d, 0.18);
    bg.fillRoundedRect(0, 4, width, height, 11);
    bg.fillStyle(selected ? 0xe4edd8 : 0xf1e4c7, 1);
    bg.fillRoundedRect(0, 0, width, height, 11);
    bg.lineStyle(selected ? 3 : 1.5, selected ? 0x3e8e75 : 0xc4b28e, selected ? 1 : 0.9);
    bg.strokeRoundedRect(0, 0, width, height, 11);
    if (selected) {
      bg.fillStyle(0x3e8e75, 0.1);
      bg.fillRoundedRect(4, 4, width - 8, height - 8, 8);
    }
    if (core && !selected) {
      // 核心英雄卡：左侧金色细条提示
      bg.fillStyle(0xf2d484, 0.9);
      bg.fillRect(0, 6, 4, height - 12);
    }
  }

  private _showTip(text: string): void {
    this.scene.tweens.killTweensOf(this._tipText);
    this._tipText.setText(text);
    this._tipText.setAlpha(1);
    this._tipText.setVisible(true);
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
