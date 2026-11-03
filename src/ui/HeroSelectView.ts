import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { ARTIFACT_CONFIGS, ArtifactConfigItem, getArtifactCarrySlotCount, getArtifactUpgradeCost } from '../config/ArtifactConfig';
import { getUnlockedHeroes, HeroConfigItem } from '../config/HeroConfig';
import { ArtifactData } from '../data/ArtifactData';
import { HeroData } from '../data/HeroData';
import { LevelData } from '../data/LevelData';
import { SaveManager } from '../data/SaveManager';
import { createCjkText } from '../core/TextStyles';
import { artifactKey, heroKey } from '../render/AssetKeys';
import { ArtifactId, Faction, HeroRarity, LevelConfig } from '../types';
import {
  UI_TOKENS, drawLacquerPanel, drawPaperPanel,
  createUiButton, playUiPress,
} from './DesignTokens';
import { isReducedMotionEnabled } from './JourneyRewardIcons';

type PrepareTab = 'heroes' | 'artifacts';
type HeroFilter = 'all' | 'core' | 'normal';

type PressedTarget =
  | { type: 'hero'; id: string; x: number; y: number }
  | { type: 'artifact'; id: ArtifactId; x: number; y: number }
  | null;

const FACTION_LABELS: Record<Faction, string> = {
  [Faction.SHITU]: '师徒',
  [Faction.XIANFO]: '仙佛',
  [Faction.YAOWANG]: '妖王',
};

const SHEET = { x: 26, y: 326, w: 698, h: 814 };
const CONTENT = { x: 54, y: 452, w: 642, h: 566 };
const HERO_CARD = { w: 306, h: 136, gapX: 16, gapY: 14 };
const ARTIFACT_CARD = { w: 306, h: 126, gapX: 16, gapY: 14 };
const FOOTER_Y = 1164;
const BUTTON_Y = 1218;

export class HeroSelectView {
  readonly container: Phaser.GameObjects.Container;

  private readonly _selectedIds: Set<string> = new Set();
  private readonly _selectedArtifacts: Set<ArtifactId> = new Set();
  private readonly _reducedMotion = isReducedMotionEnabled();

  private _tab: PrepareTab = 'heroes';
  private _heroFilter: HeroFilter = 'all';
  private _artifactSlotLimit = 3;
  private _scrollY = 0;
  private _maxScroll = 0;
  private _scrollTween?: Phaser.Tweens.Tween;
  private _dragging = false;
  private _dragStartY = 0;
  private _scrollStartY = 0;
  private _dragDistance = 0;
  private _pressedTarget: PressedTarget = null;
  private _detailType: 'hero' | 'artifact' | null = null;
  private _detailId: string | null = null;
  private _scrollIndicator?: Phaser.GameObjects.Graphics;

  private readonly _onPointerDown = (pointer: Phaser.Input.Pointer): void => this._handlePointerDown(pointer);
  private readonly _onPointerMove = (pointer: Phaser.Input.Pointer): void => this._handlePointerMove(pointer);
  private readonly _onPointerUp = (pointer: Phaser.Input.Pointer): void => this._handlePointerUp(pointer);

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
    this._initializeSelection();

    this.container = scene.add.container(0, 0);
    this.container.setDepth(240);
    this._draw();

    scene.input.on('pointerdown', this._onPointerDown);
    scene.input.on('pointermove', this._onPointerMove);
    scene.input.on('pointerup', this._onPointerUp);
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this._onPointerDown);
    this.scene.input.off('pointermove', this._onPointerMove);
    this.scene.input.off('pointerup', this._onPointerUp);
    this._scrollTween?.stop();
    this.scene.tweens.killTweensOf(this.container);
    this.container.destroy(true);
  }

  private _initializeSelection(): void {
    const availableHeroes = this._getAvailableHeroes().map(hero => hero.heroId);
    const previousIds = gameMgr.selectedHeroes.filter(heroId => availableHeroes.includes(heroId)).slice(0, 4);
    const initialIds = previousIds.length > 0 ? previousIds : availableHeroes.slice(0, 4);
    initialIds.forEach(heroId => this._selectedIds.add(heroId));

    this._artifactSlotLimit = this._getArtifactSlotLimit();
    const loadout = ArtifactData.getInstance().getLoadout().slice(0, this._artifactSlotLimit);
    loadout.forEach(artifactId => this._selectedArtifacts.add(artifactId));
    if (this._selectedArtifacts.size <= 0) {
      this._getAvailableArtifacts()
        .slice(0, this._artifactSlotLimit)
        .forEach(config => this._selectedArtifacts.add(config.artifactId));
    }
  }

  private _draw(): void {
    this._scrollTween?.stop();
    this._scrollTween = undefined;
    this.scene.tweens.killTweensOf(this.container);
    this.container.removeAll(true);
    this._scrollIndicator = undefined;

    this._drawBackdrop();
    this._drawHeader();
    this._drawSheet();
    this._drawTabs();
    if (this._tab === 'heroes') this._drawHeroTools();
    this._drawContent();
    this._drawFooter();

    this.container.setAlpha(0);
    this.container.setScale(0.985);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scale: 1,
      duration: this._reducedMotion ? 0 : 180,
      ease: 'Cubic.Out',
    });

    if (this._detailType && this._detailId) this._drawDetail();
  }

  // ==================== 页面骨架 ====================

  private _drawBackdrop(): void {
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(UI_TOKENS.pine950, 1);
    overlay.fillRect(0, 0, 750, 1334);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, 750, 1334), Phaser.Geom.Rectangle.Contains);
    this.container.add(overlay);
  }

  private _drawHeader(): void {
    this.container.add(createUiButton(this.scene, {
      x: 46, y: 58, width: 112, height: 52,
      label: '‹ 返回', secondary: true, fontSize: '23px',
      onClick: () => {
        if (this._detailType) {
          this._closeDetail();
        } else {
          this.onCancel();
        }
      },
    }));

    const eyebrow = createCjkText(this.scene, 418, 62, this.level ? '八十一难 · 出战准备' : '守护模式 · 出战准备', {
      fontSize: '22px',
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
    eyebrow.setOrigin(0, 0.5);

    const title = createCjkText(this.scene, 418, 112, this.level?.name ?? '出战准备', {
      fontSize: '44px',
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
      fontFamily: 'SimSun, Microsoft YaHei, serif',
    });
    title.setOrigin(0, 0.5);

    this._drawLoadoutSummary();
    this.container.add([eyebrow, title]);
  }

  private _drawLoadoutSummary(): void {
    const x = 46, y = 184, w = 658, h = 112;
    const g = this.scene.add.graphics();
    drawLacquerPanel(g, x, y, w, h, { radius: 20, shadow: false });
    this.container.add(g);

    const selectedHeroes = Array.from(this._selectedIds).slice(0, 4);
    selectedHeroes.forEach((heroId, index) => {
      const cx = x + 52 + index * 70;
      const cy = y + h / 2;
      const ring = this.scene.add.graphics();
      ring.fillStyle(UI_TOKENS.pine800, 0.95);
      ring.fillCircle(cx, cy, 31);
      ring.lineStyle(3, UI_TOKENS.gold, 0.9);
      ring.strokeCircle(cx, cy, 31);
      this.container.add(ring);

      if (this.scene.textures.exists(heroKey(heroId))) {
        const avatar = this.scene.add.image(cx, cy, heroKey(heroId));
        const fit = 54 / Math.max(avatar.width, avatar.height);
        avatar.setDisplaySize(avatar.width * fit, avatar.height * fit);
        this.container.add(avatar);
      }
    });
    for (let index = selectedHeroes.length; index < 4; index++) {
      const cx = x + 52 + index * 70;
      const cy = y + h / 2;
      const empty = this.scene.add.graphics();
      empty.fillStyle(UI_TOKENS.pine900, 0.75);
      empty.fillCircle(cx, cy, 31);
      empty.lineStyle(2, UI_TOKENS.gold, 0.35);
      empty.strokeCircle(cx, cy, 31);
      this.container.add(empty);
    }

    const coreCount = selectedHeroes.filter(heroId => getUnlockedHeroes(9).find(hero => hero.heroId === heroId)?.rarity === HeroRarity.CORE).length;
    const label = createCjkText(this.scene, x + 324, y + 42, '阵容已成形', {
      fontSize: '27px',
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
    });
    label.setOrigin(0, 0.5);
    const sub = createCjkText(this.scene, x + 324, y + 80, `${coreCount} 核心 · ${selectedHeroes.length - coreCount} 普通 · 法宝 ${this._selectedArtifacts.size}/${this._artifactSlotLimit}`, {
      fontSize: '22px',
      color: UI_TOKENS.textMutedOnDark,
    });
    sub.setOrigin(0, 0.5);
    this.container.add([label, sub]);
  }

  private _drawSheet(): void {
    const g = this.scene.add.graphics();
    drawPaperPanel(g, SHEET.x, SHEET.y, SHEET.w, SHEET.h, { radius: 24 });
    this.container.add(g);

    const mask = this.scene.add.graphics();
    mask.fillStyle(0xffffff, 1);
    mask.fillRect(CONTENT.x, CONTENT.y, CONTENT.w, CONTENT.h);
    mask.setVisible(false);
    this.container.add(mask);
    this._contentMask = mask.createGeometryMask();
  }

  private _contentMask?: Phaser.Display.Masks.GeometryMask;

  private _drawTabs(): void {
    const y = 372;
    const tabs: Array<{ id: PrepareTab; label: string }> = [
      { id: 'heroes', label: `选择英雄 ${this._selectedIds.size}/4` },
      { id: 'artifacts', label: `携带法宝 ${this._selectedArtifacts.size}/${this._artifactSlotLimit}` },
    ];

    tabs.forEach((tab, index) => {
      const x = 70 + index * 214;
      const w = 198;
      const active = this._tab === tab.id;
      const g = this.scene.add.graphics();
      g.fillStyle(active ? UI_TOKENS.cinnabar : 0xdfd0ad, active ? 1 : 0.78);
      g.fillRoundedRect(x, y, w, 54, 14);
      g.lineStyle(2, active ? UI_TOKENS.cinnabarEdge : 0xb99b65, active ? 0.95 : 0.7);
      g.strokeRoundedRect(x, y, w, 54, 14);
      const text = createCjkText(this.scene, x + w / 2, y + 27, tab.label, {
        fontSize: '23px',
        color: active ? '#fff5da' : '#4c5148',
        fontStyle: 'bold',
      });
      text.setOrigin(0.5);
      const hit = this.scene.add.zone(x + w / 2, y + 27, w, 54);
      hit.setOrigin(0.5);
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        if (this._tab !== tab.id) playUiPress(this.scene, [g, text], () => {
          this._tab = tab.id;
          this._scrollY = 0;
          this._draw();
        });
      });
      this.container.add([g, text, hit]);
    });
  }

  private _drawHeroTools(): void {
    const filters: Array<{ id: HeroFilter; label: string }> = [
      { id: 'all', label: '全部' },
      { id: 'core', label: '核心' },
      { id: 'normal', label: '普通' },
    ];
    const unlockedCount = this._getAvailableHeroes().length;
    const count = createCjkText(this.scene, CONTENT.x + 6, 430, `已解锁 ${unlockedCount} 名英雄`, {
      fontSize: '21px',
      color: UI_TOKENS.textMutedOnPaper,
      fontStyle: 'bold',
    });
    count.setOrigin(0, 0.5);

    filters.forEach((filter, index) => {
      const x = CONTENT.x + CONTENT.w - 244 + index * 84;
      const active = this._heroFilter === filter.id;
      const g = this.scene.add.graphics();
      g.fillStyle(active ? UI_TOKENS.pine800 : 0xe8dab7, active ? 1 : 0.72);
      g.fillRoundedRect(x, 410, 74, 40, 12);
      const text = createCjkText(this.scene, x + 37, 430, filter.label, {
        fontSize: '21px',
        color: active ? '#fff5da' : UI_TOKENS.textMutedOnPaper,
        fontStyle: 'bold',
      });
      text.setOrigin(0.5);
      const hit = this.scene.add.zone(x + 37, 430, 74, 40);
      hit.setOrigin(0.5);
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        this._heroFilter = filter.id;
        this._scrollY = 0;
        this._draw();
      });
      this.container.add([g, text, hit]);
    });
    this.container.add(count);
  }

  // ==================== 内容列表 ====================

  private _drawContent(): void {
    const content = this.scene.add.container(0, 0);
    if (this._contentMask) content.setMask(this._contentMask);
    this.container.add(content);

    if (this._tab === 'heroes') {
      this._drawHeroCards(content);
    } else {
      this._drawArtifactCards(content);
    }

    this._scrollY = Phaser.Math.Clamp(this._scrollY, 0, this._maxScroll);
    content.setY(-this._scrollY);
    this._content = content;
    this._drawScrollIndicator();
  }

  private _content?: Phaser.GameObjects.Container;

  private _drawHeroCards(content: Phaser.GameObjects.Container): void {
    const heroes = this._getAvailableHeroes().filter(hero => {
      if (this._heroFilter === 'core') return hero.rarity === HeroRarity.CORE;
      if (this._heroFilter === 'normal') return hero.rarity === HeroRarity.NORMAL;
      return true;
    });

    heroes.forEach((hero, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = CONTENT.x + col * (HERO_CARD.w + HERO_CARD.gapX);
      const y = CONTENT.y + 6 + row * (HERO_CARD.h + HERO_CARD.gapY);
      content.add(this._createHeroCard(hero, x, y));
    });

    const rows = Math.max(1, Math.ceil(heroes.length / 2));
    this._maxScroll = Math.max(0, rows * (HERO_CARD.h + HERO_CARD.gapY) - CONTENT.h);
    if (heroes.length === 0) {
      content.add(createCjkText(this.scene, 375, 650, '当前筛选没有已解锁英雄', {
        fontSize: '24px', color: UI_TOKENS.textMutedOnPaper,
      }).setOrigin(0.5));
    }
  }

  private _createHeroCard(hero: HeroConfigItem, x: number, y: number): Phaser.GameObjects.Container {
    const selected = this._selectedIds.has(hero.heroId);
    const core = hero.rarity === HeroRarity.CORE;
    const data = HeroData.getInstance().get(hero.heroId);
    const card = this.scene.add.container(x, y);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x3f301d, 0.18);
    bg.fillRoundedRect(0, 4, HERO_CARD.w, HERO_CARD.h, 14);
    bg.fillStyle(selected ? 0xe4edd8 : 0xf4e8cb, 1);
    bg.fillRoundedRect(0, 0, HERO_CARD.w, HERO_CARD.h, 14);
    bg.lineStyle(selected ? 3 : 2, selected ? UI_TOKENS.jade : core ? UI_TOKENS.gold : 0xc4b28e, selected || core ? 0.95 : 0.8);
    bg.strokeRoundedRect(0, 0, HERO_CARD.w, HERO_CARD.h, 14);
    if (core) {
      bg.fillStyle(UI_TOKENS.gold, 0.95);
      bg.fillRoundedRect(0, 18, 5, HERO_CARD.h - 36, 3);
    }

    const portrait = this.scene.add.image(58, HERO_CARD.h / 2, heroKey(hero.heroId));
    const fit = 92 / Math.max(portrait.width, portrait.height);
    portrait.setDisplaySize(portrait.width * fit, portrait.height * fit);
    const portraitBg = this.scene.add.graphics();
    portraitBg.fillStyle(core ? 0x4d2c18 : UI_TOKENS.pine800, 0.16);
    portraitBg.fillCircle(58, HERO_CARD.h / 2, 47);
    portraitBg.lineStyle(2, core ? UI_TOKENS.gold : 0xb99b65, 0.55);
    portraitBg.strokeCircle(58, HERO_CARD.h / 2, 47);

    const name = createCjkText(this.scene, 122, 26, hero.name, {
      fontSize: '25px', color: UI_TOKENS.textOnPaper, fontStyle: 'bold',
    });
    name.setOrigin(0, 0.5);
    const role = createCjkText(this.scene, 122, 56, `${hero.role} · ${FACTION_LABELS[hero.faction]}`, {
      fontSize: '21px', color: UI_TOKENS.textMutedOnPaper,
    });
    role.setOrigin(0, 0.5);
    const stars = createCjkText(this.scene, 122, 86, `${'★'.repeat(data.starLevel)}${'☆'.repeat(5 - data.starLevel)}`, {
      fontSize: '21px', color: '#ae7529', fontStyle: 'bold',
    });
    stars.setOrigin(0, 0.5);
    const shards = createCjkText(this.scene, 122, 114, `碎片 ${data.shardCount}/${data.starLevel >= 5 ? '满星' : data.starLevel}`, {
      fontSize: '21px', color: UI_TOKENS.textMutedOnPaper, fontStyle: 'bold',
    });
    shards.setOrigin(0, 0.5);

    if (selected) {
      const checkBg = this.scene.add.graphics();
      checkBg.fillStyle(UI_TOKENS.jade, 1);
      checkBg.fillCircle(HERO_CARD.w - 24, 24, 17);
      const check = createCjkText(this.scene, HERO_CARD.w - 24, 24, '✓', {
        fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
      });
      check.setOrigin(0.5);
      card.add([checkBg, check]);
    }

    const info = this._createInfoButton(HERO_CARD.w - 27, HERO_CARD.h - 28);
    card.add([bg, portraitBg, portrait, name, role, stars, shards, info]);

    const hit = this.scene.add.zone(HERO_CARD.w / 2, HERO_CARD.h / 2, HERO_CARD.w, HERO_CARD.h);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const local = Phaser.Display.Color.ValueToColor(0xffffff); // 保留局部变量结构，避免交互闭包误用 pointer 世界坐标。
      void local;
      this._pressedTarget = { type: 'hero', id: hero.heroId, x: pointer.worldX ?? pointer.x, y: pointer.worldY ?? pointer.y };
      const infoBounds = info.getBounds();
      const worldX = pointer.worldX ?? pointer.x;
      const worldY = pointer.worldY ?? pointer.y;
      if (infoBounds.contains(worldX, worldY)) {
        this._pressedTarget = { type: 'hero', id: hero.heroId, x: worldX, y: worldY };
        (this._pressedTarget as any).openDetail = true;
      }
      playUiPress(this.scene, card);
    });
    card.add(hit);
    return card;
  }

  private _drawArtifactCards(content: Phaser.GameObjects.Container): void {
    const artifacts = this._getAvailableArtifacts();
    artifacts.forEach((config, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = CONTENT.x + col * (ARTIFACT_CARD.w + ARTIFACT_CARD.gapX);
      const y = CONTENT.y + 6 + row * (ARTIFACT_CARD.h + ARTIFACT_CARD.gapY);
      content.add(this._createArtifactCard(config, x, y));
    });

    const rows = Math.max(1, Math.ceil(artifacts.length / 2));
    this._maxScroll = Math.max(0, rows * (ARTIFACT_CARD.h + ARTIFACT_CARD.gapY) - CONTENT.h);
    if (artifacts.length === 0) {
      content.add(createCjkText(this.scene, 375, 650, '尚未解锁法宝', {
        fontSize: '24px', color: UI_TOKENS.textMutedOnPaper,
      }).setOrigin(0.5));
    }
  }

  private _createArtifactCard(config: ArtifactConfigItem, x: number, y: number): Phaser.GameObjects.Container {
    const selected = this._selectedArtifacts.has(config.artifactId);
    const level = ArtifactData.getInstance().getLevel(config.artifactId);
    const card = this.scene.add.container(x, y);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x3f301d, 0.18);
    bg.fillRoundedRect(0, 4, ARTIFACT_CARD.w, ARTIFACT_CARD.h, 14);
    bg.fillStyle(selected ? 0xe4edd8 : 0xf4e8cb, 1);
    bg.fillRoundedRect(0, 0, ARTIFACT_CARD.w, ARTIFACT_CARD.h, 14);
    bg.lineStyle(selected ? 3 : 2, selected ? UI_TOKENS.jade : 0xc4b28e, selected ? 0.95 : 0.8);
    bg.strokeRoundedRect(0, 0, ARTIFACT_CARD.w, ARTIFACT_CARD.h, 14);

    const iconBg = this.scene.add.graphics();
    iconBg.fillStyle(UI_TOKENS.pine800, 0.16);
    iconBg.fillRoundedRect(18, 25, 76, 76, 16);
    iconBg.lineStyle(2, UI_TOKENS.gold, 0.5);
    iconBg.strokeRoundedRect(18, 25, 76, 76, 16);
    const icon = this.scene.add.image(56, 63, artifactKey(config.artifactId));
    const fit = 58 / Math.max(icon.width, icon.height);
    icon.setDisplaySize(icon.width * fit, icon.height * fit);

    const name = createCjkText(this.scene, 112, 25, `${config.name}  Lv${level}`, {
      fontSize: '24px', color: UI_TOKENS.textOnPaper, fontStyle: 'bold',
    });
    name.setOrigin(0, 0.5);
    const effect = createCjkText(this.scene, 112, 58, config.levelDescriptions[level], {
      fontSize: '21px', color: UI_TOKENS.textMutedOnPaper,
      wordWrap: { width: ARTIFACT_CARD.w - 154, useAdvancedWrap: true },
    });
    effect.setOrigin(0, 0.5);
    const target = createCjkText(this.scene, 112, 96, `冷却 ${config.cooldown}s`, {
      fontSize: '21px', color: '#ae7529', fontStyle: 'bold',
    });
    target.setOrigin(0, 0.5);

    if (selected) {
      const checkBg = this.scene.add.graphics();
      checkBg.fillStyle(UI_TOKENS.jade, 1);
      checkBg.fillCircle(ARTIFACT_CARD.w - 24, 24, 17);
      const check = createCjkText(this.scene, ARTIFACT_CARD.w - 24, 24, '✓', {
        fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
      });
      check.setOrigin(0.5);
      card.add([checkBg, check]);
    }

    const info = this._createInfoButton(ARTIFACT_CARD.w - 27, ARTIFACT_CARD.h - 28);
    card.add([bg, iconBg, icon, name, effect, target, info]);

    const hit = this.scene.add.zone(ARTIFACT_CARD.w / 2, ARTIFACT_CARD.h / 2, ARTIFACT_CARD.w, ARTIFACT_CARD.h);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const worldX = pointer.worldX ?? pointer.x;
      const worldY = pointer.worldY ?? pointer.y;
      this._pressedTarget = { type: 'artifact', id: config.artifactId, x: worldX, y: worldY };
      if (info.getBounds().contains(worldX, worldY)) (this._pressedTarget as any).openDetail = true;
      playUiPress(this.scene, card);
    });
    card.add(hit);
    return card;
  }

  private _createInfoButton(x: number, y: number): Phaser.GameObjects.Container {
    const button = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();
    bg.fillStyle(UI_TOKENS.pine800, 0.92);
    bg.fillCircle(0, 0, 16);
    bg.lineStyle(1.5, UI_TOKENS.goldLight, 0.7);
    bg.strokeCircle(0, 0, 16);
    const text = createCjkText(this.scene, 0, 0, 'i', {
      fontSize: '21px', color: UI_TOKENS.textGoldOnDark, fontStyle: 'bold',
    });
    text.setOrigin(0.5);
    button.add([bg, text]);
    return button;
  }

  // ==================== 滚动 ====================

  private _drawScrollIndicator(): void {
    this._scrollIndicator?.destroy();
    if (this._maxScroll <= 0) return;
    const trackHeight = CONTENT.h - 24;
    const thumbHeight = Math.max(64, trackHeight * (CONTENT.h / (CONTENT.h + this._maxScroll)));
    const thumbY = CONTENT.y + 12 + (trackHeight - thumbHeight) * (this._scrollY / this._maxScroll);
    const g = this.scene.add.graphics();
    g.fillStyle(UI_TOKENS.line, 0.18);
    g.fillRoundedRect(704, CONTENT.y + 12, 6, trackHeight, 3);
    g.fillStyle(UI_TOKENS.gold, 0.82);
    g.fillRoundedRect(704, thumbY, 6, thumbHeight, 3);
    this._scrollIndicator = g;
    this.container.add(g);
  }

  private _handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this._detailType) return;
    if (!this._isInsideContent(pointer.x, pointer.y)) return;
    this._scrollTween?.stop();
    this._dragging = true;
    this._dragStartY = pointer.y;
    this._scrollStartY = this._scrollY;
    this._dragDistance = 0;
  }

  private _handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this._dragging || !pointer.isDown) return;
    const deltaY = pointer.y - this._dragStartY;
    this._dragDistance = Math.max(this._dragDistance, Math.abs(deltaY));
    if (this._dragDistance <= 6) return;
    this._scrollY = Phaser.Math.Clamp(this._scrollStartY - deltaY, 0, this._maxScroll);
    this._content?.setY(-this._scrollY);
    this._drawScrollIndicator();
  }

  private _handlePointerUp(pointer: Phaser.Input.Pointer): void {
    const pressed = this._pressedTarget;
    this._pressedTarget = null;
    if (pressed && this._dragDistance <= 6) {
      if ((pressed as any).openDetail) {
        this._openDetail(pressed.type, pressed.id);
        return;
      }
      if (pressed.type === 'hero') this._toggleHero(pressed.id);
      else this._toggleArtifact(pressed.id);
    }

    if (!this._dragging) return;
    this._dragging = false;
    if (this._dragDistance <= 6) return;
    this._scrollTween = this.scene.tweens.addCounter({
      from: this._scrollY,
      to: this._clampScroll(this._scrollY),
      duration: this._reducedMotion ? 0 : 160,
      onUpdate: tween => {
        this._scrollY = tween.getValue();
        this._content?.setY(-this._scrollY);
        this._drawScrollIndicator();
      },
      onComplete: () => { this._scrollTween = undefined; },
    });
  }

  private _isInsideContent(x: number, y: number): boolean {
    return x >= CONTENT.x && x <= CONTENT.x + CONTENT.w && y >= CONTENT.y && y <= CONTENT.y + CONTENT.h;
  }

  private _clampScroll(value: number): number {
    return Phaser.Math.Clamp(value, 0, this._maxScroll);
  }

  // ==================== 详情 ====================

  private _openDetail(type: 'hero' | 'artifact', id: string): void {
    this._detailType = type;
    this._detailId = id;
    this._draw();
  }

  private _closeDetail(): void {
    this._detailType = null;
    this._detailId = null;
    this._draw();
  }

  private _drawDetail(): void {
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x0a1e19, 0.78);
    overlay.fillRect(0, 0, 750, 1334);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, 750, 1334), Phaser.Geom.Rectangle.Contains);
    overlay.on('pointerdown', () => this._closeDetail());
    this.container.add(overlay);

    const panel = this.scene.add.graphics();
    drawPaperPanel(panel, 58, 176, 634, 920, { radius: 24 });
    this.container.add(panel);

    if (this._detailType === 'hero') this._drawHeroDetail(this._detailId!);
    else this._drawArtifactDetail(this._detailId! as ArtifactId);
  }

  private _drawHeroDetail(heroId: string): void {
    const hero = this._getAvailableHeroes().find(item => item.heroId === heroId)
      ?? this._getAllUnlockedHeroes().find(item => item.heroId === heroId);
    if (!hero) return this._closeDetail();
    const data = HeroData.getInstance().get(heroId);
    const core = hero.rarity === HeroRarity.CORE;

    const close = this._createDetailClose();
    this.container.add(close);

    const portrait = this.scene.add.image(190, 358, heroKey(hero.heroId));
    const fit = 190 / Math.max(portrait.width, portrait.height);
    portrait.setDisplaySize(portrait.width * fit, portrait.height * fit);
    const portraitBg = this.scene.add.graphics();
    portraitBg.fillStyle(core ? 0x4d2c18 : UI_TOKENS.pine800, 0.16);
    portraitBg.fillCircle(190, 358, 105);
    portraitBg.lineStyle(3, core ? UI_TOKENS.gold : UI_TOKENS.jade, 0.72);
    portraitBg.strokeCircle(190, 358, 105);

    const name = createCjkText(this.scene, 342, 276, hero.name, {
      fontSize: '40px', color: UI_TOKENS.textOnPaper, fontStyle: 'bold',
      fontFamily: 'SimSun, Microsoft YaHei, serif',
    });
    name.setOrigin(0, 0.5);
    const role = createCjkText(this.scene, 342, 322, `${core ? '核心英雄' : '普通英雄'} · ${FACTION_LABELS[hero.faction]} · ${hero.role}`, {
      fontSize: '23px', color: core ? '#8e2f25' : UI_TOKENS.textMutedOnPaper, fontStyle: 'bold',
    });
    role.setOrigin(0, 0.5);
    const stars = createCjkText(this.scene, 342, 366, `${'★'.repeat(data.starLevel)}${'☆'.repeat(5 - data.starLevel)}`, {
      fontSize: '27px', color: '#ae7529', fontStyle: 'bold',
    });
    stars.setOrigin(0, 0.5);
    const shards = createCjkText(this.scene, 342, 410, data.starLevel >= 5 ? '碎片 已满星' : `升星碎片 ${data.shardCount}/${data.starLevel}`, {
      fontSize: '23px', color: UI_TOKENS.textMutedOnPaper, fontStyle: 'bold',
    });
    shards.setOrigin(0, 0.5);

    const stats = [
      `生命  ${Math.round(hero.baseHp * (1 + 0.14 * (data.starLevel - 1)))}`,
      `攻击  ${Math.round(hero.baseAttack * (1 + 0.14 * (data.starLevel - 1)))}`,
      `射程  ${hero.attackRange} 格`,
      `攻速  ${hero.attackSpeed.toFixed(1)} 次/秒`,
    ];
    const statsPanel = this.scene.add.graphics();
    drawLacquerPanel(statsPanel, 106, 500, 538, 142, { radius: 16, shadow: false, fillAlpha: 0.9 });
    stats.forEach((line, index) => {
      const text = createCjkText(this.scene, 138 + (index % 2) * 268, 532 + Math.floor(index / 2) * 58, line, {
        fontSize: '23px', color: UI_TOKENS.textOnDark, fontStyle: 'bold',
      });
      text.setOrigin(0, 0.5);
      this.container.add(text);
    });

    const passiveTitle = createCjkText(this.scene, 108, 686, '被动 · ' + hero.passive.split('，')[0], {
      fontSize: '24px', color: UI_TOKENS.textOnPaper, fontStyle: 'bold',
    });
    passiveTitle.setOrigin(0, 0.5);
    const passive = createCjkText(this.scene, 108, 730, hero.passive, {
      fontSize: '23px', color: UI_TOKENS.textMutedOnPaper,
      wordWrap: { width: 534, useAdvancedWrap: true },
    });
    passive.setOrigin(0, 0.5);
    const desc = createCjkText(this.scene, 108, 800, hero.description, {
      fontSize: '23px', color: UI_TOKENS.textMutedOnPaper, fontStyle: 'bold',
    });
    desc.setOrigin(0, 0.5);

    const canUpgrade = data.starLevel < 5;
    const upgradeLabel = !canUpgrade ? '已满星' : data.shardCount >= data.starLevel ? `升星 · 消耗 ${data.starLevel} 碎片` : `碎片不足 · 需 ${data.starLevel}`;
    this.container.add(createUiButton(this.scene, {
      x: 104, y: 890, width: 256, height: 76,
      label: this._selectedIds.has(heroId) ? '移出阵容' : '加入阵容',
      secondary: true, fontSize: '25px',
      onClick: () => { this._toggleHero(heroId); this._draw(); },
    }));
    this.container.add(createUiButton(this.scene, {
      x: 388, y: 890, width: 256, height: 76,
      label: upgradeLabel,
      primary: canUpgrade && data.shardCount >= data.starLevel,
      secondary: !canUpgrade || data.shardCount < data.starLevel,
      enabled: canUpgrade && data.shardCount >= data.starLevel,
      fontSize: '25px',
      onClick: () => {
        const result = HeroData.getInstance().upgradeStar(heroId);
        if (result === 'ok') this._draw();
      },
    }));

    this.container.add([portraitBg, portrait, name, role, stars, shards, statsPanel, passiveTitle, passive, desc]);
  }

  private _drawArtifactDetail(artifactId: ArtifactId): void {
    const config = getArtifactConfigSafe(artifactId);
    if (!config) return this._closeDetail();
    const artifactData = ArtifactData.getInstance();
    const level = artifactData.getLevel(artifactId);
    const cost = getArtifactUpgradeCost(level);
    const save = SaveManager.getInstance().load() ?? SaveManager.getInstance().createDefault();

    this.container.add(this._createDetailClose());
    const icon = this.scene.add.image(190, 360, artifactKey(artifactId));
    const fit = 170 / Math.max(icon.width, icon.height);
    icon.setDisplaySize(icon.width * fit, icon.height * fit);
    const iconBg = this.scene.add.graphics();
    iconBg.fillStyle(UI_TOKENS.pine800, 0.16);
    iconBg.fillRoundedRect(108, 278, 164, 164, 22);
    iconBg.lineStyle(3, UI_TOKENS.gold, 0.7);
    iconBg.strokeRoundedRect(108, 278, 164, 164, 22);

    const name = createCjkText(this.scene, 318, 286, `${config.name}  Lv${level}`, {
      fontSize: '38px', color: UI_TOKENS.textOnPaper, fontStyle: 'bold',
      fontFamily: 'SimSun, Microsoft YaHei, serif',
    });
    name.setOrigin(0, 0.5);
    const target = createCjkText(this.scene, 318, 334, `冷却 ${config.cooldown}s · 目标 ${targetText(config.targetType)}`, {
      fontSize: '23px', color: UI_TOKENS.textMutedOnPaper, fontStyle: 'bold',
    });
    target.setOrigin(0, 0.5);
    const effect = createCjkText(this.scene, 318, 390, config.levelDescriptions[level], {
      fontSize: '24px', color: UI_TOKENS.textOnPaper, fontStyle: 'bold',
      wordWrap: { width: 320, useAdvancedWrap: true },
    });
    effect.setOrigin(0, 0.5);

    const panel = this.scene.add.graphics();
    drawLacquerPanel(panel, 106, 500, 538, 212, { radius: 16, shadow: false, fillAlpha: 0.9 });
    const current = createCjkText(this.scene, 140, 544, `当前  Lv${level}\n${config.levelDescriptions[level]}`, {
      fontSize: '23px', color: UI_TOKENS.textOnDark, lineSpacing: 10,
      wordWrap: { width: 470, useAdvancedWrap: true },
    });
    const nextText = cost === null ? '已满级：法宝效果已达上限' : `下一级  Lv${level + 1} · 消耗 ${cost} 灵蕴\n${config.levelDescriptions[(level + 1) as 2 | 3]}${save.spiritEssence < (cost ?? 0) ? '\n灵蕴不足' : ''}`;
    const next = createCjkText(this.scene, 140, 626, nextText, {
      fontSize: '23px', color: UI_TOKENS.textGoldOnDark, lineSpacing: 10,
      wordWrap: { width: 470, useAdvancedWrap: true },
    });
    this.container.add([iconBg, icon, name, target, effect, panel, current, next]);

    this.container.add(createUiButton(this.scene, {
      x: 104, y: 890, width: 256, height: 76,
      label: this._selectedArtifacts.has(artifactId) ? '移出携带' : '加入携带',
      secondary: true, fontSize: '25px',
      onClick: () => { this._toggleArtifact(artifactId); this._draw(); },
    }));
    this.container.add(createUiButton(this.scene, {
      x: 388, y: 890, width: 256, height: 76,
      label: cost === null ? '已满级' : `升级 · ${cost} 灵蕴`,
      primary: cost !== null && save.spiritEssence >= cost,
      secondary: cost === null || save.spiritEssence < cost,
      enabled: cost !== null && save.spiritEssence >= cost,
      fontSize: '25px',
      onClick: () => {
        if (artifactData.upgrade(artifactId)) this._draw();
      },
    }));
  }

  private _createDetailClose(): Phaser.GameObjects.Container {
    const close = this.scene.add.container(646, 216);
    const bg = this.scene.add.graphics();
    bg.fillStyle(UI_TOKENS.pine800, 0.94);
    bg.fillCircle(0, 0, 24);
    bg.lineStyle(2, UI_TOKENS.goldLight, 0.75);
    bg.strokeCircle(0, 0, 24);
    const text = createCjkText(this.scene, 0, 0, '×', {
      fontSize: '34px', color: '#fff5da', fontStyle: 'bold',
    });
    text.setOrigin(0.5);
    const hit = this.scene.add.zone(0, 0, 56, 56);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this._closeDetail());
    close.add([bg, text, hit]);
    return close;
  }

  // ==================== 底部与行为 ====================

  private _drawFooter(): void {
    const g = this.scene.add.graphics();
    g.fillStyle(0xefe1bf, 1);
    g.fillRect(0, FOOTER_Y, 750, 1334 - FOOTER_Y);
    g.lineStyle(3, 0xb99b65, 1);
    g.beginPath();
    g.moveTo(0, FOOTER_Y + 1.5);
    g.lineTo(750, FOOTER_Y + 1.5);
    g.strokePath();
    this.container.add(g);

    this.container.add(createUiButton(this.scene, {
      x: 70, y: BUTTON_Y, width: 230, height: 76,
      label: '返回地图',
      secondary: true,
      fontSize: '26px',
      onClick: this.onCancel,
    }));
    this.container.add(createUiButton(this.scene, {
      x: 450, y: BUTTON_Y, width: 230, height: 76,
      label: this.level ? '开始挑战' : '开始守护',
      primary: true,
      fontSize: '28px',
      onClick: () => this._startBattle(),
    }));

    const hint = createCjkText(this.scene, 375, SHEET.y + SHEET.h - 34, '点卡片调整出战 · 点 i 查看技能、碎片与升星', {
      fontSize: '22px',
      color: UI_TOKENS.textMutedOnPaper,
    });
    hint.setOrigin(0.5);
    this.container.add(hint);
  }

  private _startBattle(): void {
    if (this._selectedIds.size <= 0) return;
    gameMgr.setSelectedHeroes(Array.from(this._selectedIds).slice(0, 4));
    ArtifactData.getInstance().setLoadout(Array.from(this._selectedArtifacts), this._artifactSlotLimit);
    this.onStart();
  }

  private _toggleHero(heroId: string): void {
    if (this._selectedIds.has(heroId)) {
      this._selectedIds.delete(heroId);
    } else if (this._selectedIds.size < 4) {
      this._selectedIds.add(heroId);
    } else {
      this._draw();
      return;
    }
    this._draw();
  }

  private _toggleArtifact(artifactId: ArtifactId): void {
    if (this._selectedArtifacts.has(artifactId)) {
      this._selectedArtifacts.delete(artifactId);
    } else if (this._selectedArtifacts.size < this._artifactSlotLimit) {
      this._selectedArtifacts.add(artifactId);
    }
    this._draw();
  }

  private _getArtifactSlotLimit(): number {
    const levelData = LevelData.getInstance();
    levelData.loadFromSave();
    const clearedChapter = this.level ? levelData.getClearedChapterCount() : 9;
    return getArtifactCarrySlotCount(clearedChapter);
  }

  private _getAvailableHeroes(): HeroConfigItem[] {
    const heroData = HeroData.getInstance();
    return getUnlockedHeroes(this.level?.chapter ?? 9)
      .filter(hero => heroData.get(hero.heroId).unlocked)
      .slice(0, 14);
  }

  private _getAllUnlockedHeroes(): HeroConfigItem[] {
    const heroData = HeroData.getInstance();
    return getUnlockedHeroes(9).filter(hero => heroData.get(hero.heroId).unlocked);
  }

  private _getAvailableArtifacts(): ArtifactConfigItem[] {
    const artifactData = ArtifactData.getInstance();
    return ARTIFACT_CONFIGS.filter(config => artifactData.isUnlocked(config.artifactId));
  }
}

function getArtifactConfigSafe(artifactId: ArtifactId): ArtifactConfigItem | undefined {
  return ARTIFACT_CONFIGS.find(config => config.artifactId === artifactId);
}

function targetText(targetType: ArtifactConfigItem['targetType']): string {
  switch (targetType) {
    case 'cell': return '锁定格';
    case 'ally': return '友方单位';
    case 'enemy': return '敌人';
    case 'monk': return '唐僧';
    default: return '全场';
  }
}
