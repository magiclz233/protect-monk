import Phaser from 'phaser';
import { getArtifactConfig } from '../config/ArtifactConfig';
import { CHAPTER_CONFIGS, ChapterConfig, ChapterState, getChapterState } from '../config/ChapterConfig';
import { getHeroConfig } from '../config/HeroConfig';
import { VISUAL_PALETTE } from '../config/VisualConfig';
import { ArtifactData } from '../data/ArtifactData';
import { HeroData } from '../data/HeroData';
import { LevelData } from '../data/LevelData';
import { createCjkText } from '../core/TextStyles';
import { createArtifactRewardIcon, createHeroRewardIcon, isReducedMotionEnabled } from './JourneyRewardIcons';

interface ChapterCardHit {
  chapterId: number;
  container: Phaser.GameObjects.Container;
  y: number;
  height: number;
  state: ChapterState;
}

const VIEWPORT = { x: 34, y: 220, width: 682, height: 792 };
const CARD = { x: 54, y: 244, width: 642, height: 168, gap: 16 };

const STATE_LABELS: Record<ChapterState, string> = {
  completed: '已通关',
  active: '进行中',
  locked: '未解锁',
};

export class ChapterSelectView {
  readonly container: Phaser.GameObjects.Container;
  private readonly _content: Phaser.GameObjects.Container;
  private readonly _cards: ChapterCardHit[] = [];
  private readonly _reducedMotion = isReducedMotionEnabled();
  private _scrollY = 0;
  private _maxScroll = 0;
  private _dragging = false;
  private _dragStartedInViewport = false;
  private _dragStartY = 0;
  private _scrollStartY = 0;
  private _dragDistance = 0;
  private _pressedCard: ChapterCardHit | null = null;
  private _scrollIndicator?: Phaser.GameObjects.Graphics;

  private readonly _onPointerDown = (pointer: Phaser.Input.Pointer): void => this._handlePointerDown(pointer);
  private readonly _onPointerMove = (pointer: Phaser.Input.Pointer): void => this._handlePointerMove(pointer);
  private readonly _onPointerUp = (pointer: Phaser.Input.Pointer): void => this._handlePointerUp(pointer);

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onSelectChapter: (chapterId: number) => void,
    private readonly onBack: () => void,
  ) {
    this.container = scene.add.container(0, 0);
    this._content = scene.add.container(0, 0);
    this.container.add(this._content);

    this._drawNavigation();
    this._drawChapterCards();
    this._drawFooter();

    scene.input.on('pointerdown', this._onPointerDown);
    scene.input.on('pointermove', this._onPointerMove);
    scene.input.on('pointerup', this._onPointerUp);
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this._onPointerDown);
    this.scene.input.off('pointermove', this._onPointerMove);
    this.scene.input.off('pointerup', this._onPointerUp);
    this.container.destroy(true);
  }

  private _drawNavigation(): void {
    const title = createCjkText(this.scene, 375, 94, '八十一难', {
      fontSize: '46px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const subTitle = createCjkText(this.scene, 375, 150, '九章取经路线，通关 Boss 解锁英雄与法宝', {
      fontSize: '20px',
      color: '#d8edd9',
      fontStyle: 'bold',
    });
    subTitle.setOrigin(0.5);
    this.container.add([title, subTitle]);
    this._drawBackButton();
  }

  private _drawBackButton(): void {
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x31496c, 0.96);
    bg.fillRoundedRect(54, 74, 112, 48, 8);
    bg.lineStyle(1.5, 0xb8d8ff, 0.55);
    bg.strokeRoundedRect(54, 74, 112, 48, 8);

    const arrow = createCjkText(this.scene, 82, 98, '‹', {
      fontSize: '26px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    arrow.setOrigin(0.5);

    const text = createCjkText(this.scene, 120, 98, '返回', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);

    const hit = this.scene.add.zone(110, 98, 112, 48);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: [bg, arrow, text],
        alpha: 0.78,
        duration: 80,
        yoyo: true,
        onComplete: this.onBack,
      });
    });
    this.container.add([bg, arrow, text, hit]);
  }

  private _drawChapterCards(): void {
    const maskGraphics = this.scene.add.graphics();
    maskGraphics.fillStyle(0xffffff, 1);
    maskGraphics.fillRect(VIEWPORT.x, VIEWPORT.y, VIEWPORT.width, VIEWPORT.height);
    maskGraphics.setVisible(false);
    this.container.add(maskGraphics);
    this._content.setMask(maskGraphics.createGeometryMask());

    CHAPTER_CONFIGS.forEach((chapter, index) => {
      const y = CARD.y + index * (CARD.height + CARD.gap);
      const state = getChapterState(chapter.chapterId, LevelData.getInstance());
      const card = this._drawChapterCard(chapter, y, state);
      this._cards.push({ chapterId: chapter.chapterId, container: card, y, height: CARD.height, state });
      this._content.add(card);
    });

    const contentHeight = 24 + CHAPTER_CONFIGS.length * CARD.height + (CHAPTER_CONFIGS.length - 1) * CARD.gap;
    this._maxScroll = Math.max(0, contentHeight - VIEWPORT.height);
    const firstActiveIndex = Math.max(0, CHAPTER_CONFIGS.findIndex(chapter => getChapterState(chapter.chapterId, LevelData.getInstance()) === 'active'));
    this._scrollY = this._clampScroll(firstActiveIndex * (CARD.height + CARD.gap) - 48);
    this._drawScrollIndicator();
    this._updateScroll();

    if (!this._reducedMotion) {
      this._cards.forEach((card, index) => {
        card.container.setAlpha(0);
        card.container.x += 72;
        this.scene.tweens.add({
          targets: card.container,
          x: card.container.x - 72,
          alpha: 1,
          duration: 260,
          ease: 'Cubic.Out',
          delay: index * 38,
        });
      });
    }
  }

  private _drawChapterCard(chapter: ChapterConfig, y: number, state: ChapterState): Phaser.GameObjects.Container {
    const card = this.scene.add.container(0, 0);
    const graphics = this.scene.add.graphics();
    const completed = state === 'completed';
    const locked = state === 'locked';
    const bgColor = locked ? 0x29303a : VISUAL_PALETTE.ink;
    const borderColor = completed ? VISUAL_PALETTE.gold : locked ? 0x6f7785 : chapter.themeColor;
    const borderAlpha = completed ? 0.74 : locked ? 0.36 : 0.58;

    graphics.fillStyle(bgColor, locked ? 0.86 : 0.94);
    graphics.fillRoundedRect(CARD.x, y, CARD.width, CARD.height, 14);
    if (completed) {
      graphics.fillStyle(VISUAL_PALETTE.gold, 0.08);
      graphics.fillRoundedRect(CARD.x + 4, y + 4, CARD.width - 8, CARD.height - 8, 12);
    }
    graphics.lineStyle(completed ? 3 : 2, borderColor, borderAlpha);
    graphics.strokeRoundedRect(CARD.x, y, CARD.width, CARD.height, 14);
    card.add(graphics);

    const chapterText = createCjkText(this.scene, CARD.x + 20, y + 20, `Ch${chapter.chapterId} · ${chapter.name}`, {
      fontSize: '26px',
      color: locked ? '#b8bec9' : '#f7f1d0',
      fontStyle: 'bold',
    });
    const subtitle = createCjkText(this.scene, CARD.x + 20, y + 52, chapter.subtitle, {
      fontSize: '17px',
      color: locked ? '#98a1ae' : '#d8edd9',
      fontStyle: 'bold',
    });
    card.add([chapterText, subtitle]);

    this._drawStateBadge(card, CARD.x + CARD.width - 126, y + 18, state, chapter.themeColor);
    this._drawProgress(card, CARD.x + 20, y + 84, CARD.width - 40, chapter, state);

    if (locked) {
      const prev = CHAPTER_CONFIGS[chapter.chapterId - 2];
      const unlock = createCjkText(this.scene, CARD.x + CARD.width / 2, y + 128, `通关【${prev?.name ?? '前一章'}】后解锁`, {
        fontSize: '19px',
        color: '#b8bec9',
        fontStyle: 'bold',
      });
      unlock.setOrigin(0.5);
      card.add(unlock);
      return card;
    }

    this._drawRewardPreview(card, chapter, y, completed);
    return card;
  }

  private _drawStateBadge(container: Phaser.GameObjects.Container, x: number, y: number, state: ChapterState, themeColor: number): void {
    const width = 104;
    const height = 34;
    const graphics = this.scene.add.graphics();
    const fill = state === 'completed' ? VISUAL_PALETTE.jade : state === 'locked' ? 0x424a58 : 0x172033;
    const stroke = state === 'completed' ? 0xb8f4de : state === 'locked' ? 0x6f7785 : themeColor;
    graphics.fillStyle(fill, 0.96);
    graphics.fillRoundedRect(x, y, width, height, 8);
    graphics.lineStyle(1.5, stroke, 0.62);
    graphics.strokeRoundedRect(x, y, width, height, 8);

    if (state === 'completed') {
      graphics.lineStyle(2.5, 0x101826, 0.95);
      graphics.beginPath();
      graphics.moveTo(x + 14, y + 17);
      graphics.lineTo(x + 21, y + 24);
      graphics.lineTo(x + 34, y + 10);
      graphics.strokePath();
    }

    const text = createCjkText(this.scene, x + (state === 'completed' ? 64 : 52), y + 17, STATE_LABELS[state], {
      fontSize: '15px',
      color: state === 'completed' ? '#101826' : '#f7f1d0',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);
    container.add([graphics, text]);
  }

  private _drawProgress(container: Phaser.GameObjects.Container, x: number, y: number, width: number, chapter: ChapterConfig, state: ChapterState): void {
    const cleared = LevelData.getInstance().getChapterClearedCount(chapter.chapterId);
    const progress = Math.max(0, Math.min(1, cleared / 9));
    const trackWidth = width - 92;
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x172033, state === 'locked' ? 0.72 : 0.95);
    graphics.fillRoundedRect(x, y, trackWidth, 10, 5);
    if (progress > 0) {
      graphics.fillStyle(state === 'completed' ? VISUAL_PALETTE.gold : chapter.themeColor, state === 'locked' ? 0.35 : 1);
      graphics.fillRoundedRect(x, y, Math.max(8, trackWidth * progress), 10, 5);
    }

    const label = createCjkText(this.scene, x + trackWidth + 18, y + 4, `${cleared}/9 关`, {
      fontSize: '16px',
      color: state === 'locked' ? '#b8bec9' : '#f7f1d0',
      fontStyle: 'bold',
    });
    label.setOrigin(0, 0.5);
    container.add([graphics, label]);
  }

  private _drawRewardPreview(container: Phaser.GameObjects.Container, chapter: ChapterConfig, y: number, completed: boolean): void {
    const hero = getHeroConfig(chapter.unlockHeroId);
    const artifact = getArtifactConfig(chapter.unlockArtifactId);
    const heroOwned = HeroData.getInstance().get(chapter.unlockHeroId).unlocked || completed;
    const artifactOwned = ArtifactData.getInstance().isUnlocked(chapter.unlockArtifactId) || completed;
    const status = completed ? '已解锁' : `通关第 ${chapter.bossLevelId} 难解锁`;

    this._drawRewardSlot(container, CARD.x + 64, y + 112, '英雄', hero?.name ?? '章节英雄', status, createHeroRewardIcon(
      this.scene,
      0,
      0,
      54,
      hero,
      heroOwned,
      chapter.themeColor,
    ));
    this._drawRewardSlot(container, CARD.x + 366, y + 112, '法宝', artifact?.name ?? '章节法宝', status, createArtifactRewardIcon(
      this.scene,
      0,
      0,
      54,
      artifact,
      artifactOwned,
    ));
  }

  private _drawRewardSlot(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    type: string,
    name: string,
    status: string,
    icon: Phaser.GameObjects.Container,
  ): void {
    icon.setPosition(x, y);
    const typeText = createCjkText(this.scene, x + 44, y - 24, type, {
      fontSize: '13px',
      color: '#9eb6d0',
      fontStyle: 'bold',
    });
    const nameText = createCjkText(this.scene, x + 44, y - 2, name, {
      fontSize: '18px',
      color: '#f7f1d0',
      fontStyle: 'bold',
    });
    const statusText = createCjkText(this.scene, x + 44, y + 23, status, {
      fontSize: '13px',
      color: status === '已解锁' ? '#b8f4de' : '#cfd8e3',
    });
    container.add([icon, typeText, nameText, statusText]);
  }

  private _drawFooter(): void {
    const title = createCjkText(this.scene, 76, 1068, '章节目标', {
      fontSize: '22px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    const active = CHAPTER_CONFIGS.find(chapter => getChapterState(chapter.chapterId, LevelData.getInstance()) === 'active')
      ?? CHAPTER_CONFIGS[CHAPTER_CONFIGS.length - 1];
    const detail = createCjkText(this.scene, 76, 1106, `当前推进：Ch${active.chapterId} ${active.name} · ${active.subtitle}`, {
      fontSize: '19px',
      color: '#f7f1d0',
      fontStyle: 'bold',
    });
    const hintText = CHAPTER_CONFIGS.every(chapter => getChapterState(chapter.chapterId, LevelData.getInstance()) === 'completed')
      ? '取经路已全部走完，可继续挑战更高轮回。'
      : '每章第 9 关是 Boss 关，通关后解锁本章英雄与法宝。';
    const hint = createCjkText(this.scene, 76, 1146, hintText, {
      fontSize: '17px',
      color: '#d8edd9',
      wordWrap: { width: 580, useAdvancedWrap: true },
    });
    this.container.add([title, detail, hint]);
  }

  private _drawScrollIndicator(): void {
    this._scrollIndicator = this.scene.add.graphics();
    this.container.add(this._scrollIndicator);
  }

  private _updateScroll(): void {
    this._content.setY(-this._scrollY);
    if (!this._scrollIndicator) return;

    const trackX = 704;
    const trackY = VIEWPORT.y + 24;
    const trackHeight = VIEWPORT.height - 48;
    const thumbHeight = this._maxScroll <= 0 ? trackHeight : Math.max(62, trackHeight * (VIEWPORT.height / (VIEWPORT.height + this._maxScroll)));
    const thumbY = this._maxScroll <= 0 ? trackY : trackY + (trackHeight - thumbHeight) * (this._scrollY / this._maxScroll);

    this._scrollIndicator.clear();
    this._scrollIndicator.fillStyle(0x0d1020, 0.52);
    this._scrollIndicator.fillRoundedRect(trackX, trackY, 6, trackHeight, 3);
    this._scrollIndicator.fillStyle(0xf0c15a, 0.72);
    this._scrollIndicator.fillRoundedRect(trackX, thumbY, 6, thumbHeight, 3);
  }

  private _handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this._dragStartedInViewport = this._isInsideViewport(pointer.x, pointer.y);
    if (!this._dragStartedInViewport) return;

    this._dragging = true;
    this._dragStartY = pointer.y;
    this._scrollStartY = this._scrollY;
    this._dragDistance = 0;
    this._pressedCard = this._findCardAt(pointer.x, pointer.y);
    if (this._pressedCard && this._pressedCard.state !== 'locked') {
      this._pressedCard.container.setAlpha(0.88);
    }
  }

  private _handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this._dragging || !pointer.isDown) return;

    const deltaY = pointer.y - this._dragStartY;
    this._dragDistance = Math.max(this._dragDistance, Math.abs(deltaY));
    if (this._dragDistance > 8 && this._pressedCard) {
      this._pressedCard.container.setAlpha(1);
      this._pressedCard = null;
    }
    this._scrollY = this._clampScroll(this._scrollStartY - deltaY);
    this._updateScroll();
  }

  private _handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this._dragStartedInViewport) return;

    const pressedCard = this._pressedCard;
    this._dragging = false;
    this._dragStartedInViewport = false;
    this._pressedCard = null;
    pressedCard?.container.setAlpha(1);

    if (this._dragDistance > 8 || !this._isInsideViewport(pointer.x, pointer.y)) return;
    const card = this._findCardAt(pointer.x, pointer.y);
    if (!card || card.state === 'locked') return;
    this.onSelectChapter(card.chapterId);
  }

  private _findCardAt(x: number, y: number): ChapterCardHit | null {
    if (x < CARD.x || x > CARD.x + CARD.width) return null;
    const localY = y + this._scrollY;
    return this._cards.find(card => localY >= card.y && localY <= card.y + card.height) ?? null;
  }

  private _isInsideViewport(x: number, y: number): boolean {
    return x >= VIEWPORT.x && x <= VIEWPORT.x + VIEWPORT.width && y >= VIEWPORT.y && y <= VIEWPORT.y + VIEWPORT.height;
  }

  private _clampScroll(value: number): number {
    return Math.max(0, Math.min(this._maxScroll, value));
  }
}
