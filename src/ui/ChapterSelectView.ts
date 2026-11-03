import Phaser from 'phaser';
import { ArtifactData } from '../data/ArtifactData';
import { HeroData } from '../data/HeroData';
import { getArtifactConfig } from '../config/ArtifactConfig';
import { CHAPTER_CONFIGS, ChapterConfig, ChapterState, getChapterState } from '../config/ChapterConfig';
import { getHeroConfig } from '../config/HeroConfig';
import { SaveManager } from '../data/SaveManager';
import { LevelData } from '../data/LevelData';
import { createCjkText } from '../core/TextStyles';
import { uiIconKey } from '../render/AssetKeys';
import { UI_TOKENS, createHudChip, createUiButton, drawPaperPanel } from './DesignTokens';
import { createArtifactRewardIcon, createHeroRewardIcon, isReducedMotionEnabled } from './JourneyRewardIcons';
import { createJourneyBackButton } from './JourneyUiPrimitives';

interface ChapterNode {
  x: number;
  y: number;
}

/** 设计稿 screen-map：地图即导航，底部固定当前章节详情卡。 */
const NODE_POSITIONS: ChapterNode[] = [
  { x: 382, y: 850 },
  { x: 292, y: 778 },
  { x: 460, y: 724 },
  { x: 586, y: 648 },
  { x: 512, y: 566 },
  { x: 346, y: 510 },
  { x: 214, y: 430 },
  { x: 344, y: 354 },
  { x: 518, y: 282 },
];

const NODE_RADIUS = 30;
const CARD = { x: 42, y: 902, w: 666, h: 292 };
const MAP_KEY = '关卡地图背景';

const STATE_TEXT: Record<ChapterState, string> = {
  completed: '已通关',
  active: '进行中',
  locked: '未解锁',
};

export class ChapterSelectView {
  readonly container: Phaser.GameObjects.Container;

  private _selectedChapterId: number;
  private readonly _reducedMotion = isReducedMotionEnabled();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onSelectChapter: (chapterId: number) => void,
    private readonly onBack: () => void,
    private readonly onShowTip: (text: string) => void,
  ) {
    this.container = scene.add.container(0, 0);
    this._selectedChapterId = this._getInitialChapterId();
    this._draw();
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.container);
    this.container.destroy(true);
  }

  private _draw(): void {
    this.scene.tweens.killTweensOf(this.container);
    this.container.removeAll(true);
    this._drawMapBackground();
    this._drawHeader();
    this._drawRoute();
    CHAPTER_CONFIGS.forEach((chapter, index) => this._drawNode(chapter, NODE_POSITIONS[index], index));
    this._drawChapterCard(this._getChapter(this._selectedChapterId));
  }

  private _drawMapBackground(): void {
    const bg = this.scene.add.image(0, 0, MAP_KEY);
    bg.setOrigin(0, 0);
    const scale = Math.max(750 / bg.width, 1334 / bg.height);
    bg.setScale(scale);
    bg.setPosition((750 - bg.displayWidth) / 2, (1334 - bg.displayHeight) / 2);
    this.container.add(bg);

    // 顶部压深，保证标题与节点在任何地图底色上都清晰。
    const topWash = this.scene.add.graphics();
    topWash.fillStyle(UI_TOKENS.pine950, 0.72);
    topWash.fillRect(0, 0, 750, 178);
    topWash.fillStyle(UI_TOKENS.pine950, 0);
    topWash.fillRect(0, 178, 750, 130);
    topWash.fillStyle(UI_TOKENS.pine950, 0.2);
    topWash.fillRect(0, 850, 750, 484);
    this.container.add(topWash);
  }

  private _drawHeader(): void {
    this.container.add(createJourneyBackButton(this.scene, this.onBack));

    const eyebrow = createCjkText(this.scene, 375, 58, '九 九 八 十 一 难', {
      fontSize: '22px',
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
    eyebrow.setOrigin(0.5);

    const title = createCjkText(this.scene, 375, 106, '西天取经', {
      fontSize: '44px',
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
      fontFamily: 'SimSun, Microsoft YaHei, serif',
    });
    title.setOrigin(0.5);
    title.setShadow(2, 3, '#173f35', 0, true, true);

    const save = SaveManager.getInstance().load() ?? SaveManager.getInstance().createDefault();
    this.container.add(createHudChip(this.scene, {
      x: 548,
      y: 126,
      iconKey: uiIconKey('spirit'),
      text: `${save.spiritEssence}`,
    }));

    this.container.add([eyebrow, title]);
  }

  private _drawRoute(): void {
    const route = this.scene.add.graphics();
    route.lineStyle(13, UI_TOKENS.cinnabarDark, 0.42);
    this._strokeRoute(route);
    route.lineStyle(5, UI_TOKENS.goldLight, 0.9);
    this._strokeRoute(route);
    this.container.add(route);
  }

  private _strokeRoute(route: Phaser.GameObjects.Graphics): void {
    route.beginPath();
    route.moveTo(NODE_POSITIONS[0].x, NODE_POSITIONS[0].y);
    for (let index = 1; index < NODE_POSITIONS.length; index++) {
      route.lineTo(NODE_POSITIONS[index].x, NODE_POSITIONS[index].y);
    }
    route.strokePath();
  }

  private _drawNode(chapter: ChapterConfig, pos: ChapterNode, index: number): void {
    const state = getChapterState(chapter.chapterId, LevelData.getInstance());
    const selected = this._selectedChapterId === chapter.chapterId;
    const active = state === 'active';
    const completed = state === 'completed';
    const locked = state === 'locked';

    const glow = this.scene.add.graphics();
    glow.fillStyle(completed ? UI_TOKENS.gold : active ? UI_TOKENS.cinnabar : UI_TOKENS.pine900, selected ? 0.34 : 0.18);
    glow.fillCircle(pos.x, pos.y, selected ? 48 : 40);
    this.container.add(glow);

    const node = this.scene.add.graphics();
    const fill = completed ? UI_TOKENS.gold : active ? UI_TOKENS.cinnabar : 0x6f746c;
    const stroke = selected ? UI_TOKENS.goldLight : completed ? UI_TOKENS.goldLight : active ? UI_TOKENS.cinnabarEdge : 0xa8aaa1;
    node.fillStyle(fill, locked ? 0.7 : 1);
    node.fillCircle(pos.x, pos.y, selected ? NODE_RADIUS + 4 : NODE_RADIUS);
    node.lineStyle(selected ? 5 : 3, stroke, locked ? 0.55 : 0.96);
    node.strokeCircle(pos.x, pos.y, selected ? NODE_RADIUS + 4 : NODE_RADIUS);

    const label = createCjkText(this.scene, pos.x, pos.y, `${chapter.chapterId}`, {
      fontSize: '28px',
      color: locked ? '#e2ded2' : completed ? '#5f3b13' : '#fff5da',
      fontStyle: 'bold',
    });
    label.setOrigin(0.5);

    const stateLabel = createCjkText(this.scene, pos.x, pos.y + 43, STATE_TEXT[state], {
      fontSize: '20px',
      color: selected ? UI_TOKENS.textGoldOnDark : '#fff5da',
      fontStyle: 'bold',
    });
    stateLabel.setOrigin(0.5);
    stateLabel.setShadow(0, 2, '#102d27', 2, true, true);

    const hit = this.scene.add.zone(pos.x, pos.y, 78, 78);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: !locked });
    hit.on('pointerdown', () => {
      if (state === 'locked') {
        const prev = CHAPTER_CONFIGS[index - 1];
        this.onShowTip(`先通关【${prev?.name ?? '前一章'}】后解锁 ${chapter.name}`);
        this._shakeNode(glow);
        return;
      }
      this._selectedChapterId = chapter.chapterId;
      this._draw();
    });

    this.container.add([node, label, stateLabel, hit]);
    if (!this._reducedMotion && (active || selected)) {
      this.scene.tweens.add({
        targets: glow,
        alpha: { from: 0.18, to: 0.48 },
        scale: { from: 0.96, to: 1.08 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }
  }

  private _shakeNode(target: Phaser.GameObjects.Graphics): void {
    if (this._reducedMotion) return;
    const originalX = target.x;
    this.scene.tweens.killTweensOf(target);
    this.scene.tweens.add({
      targets: target,
      x: originalX + 8,
      duration: 60,
      yoyo: true,
      repeat: 3,
      onComplete: () => target.setX(originalX),
    });
  }

  private _drawChapterCard(chapter: ChapterConfig): void {
    const state = getChapterState(chapter.chapterId, LevelData.getInstance());
    const levelData = LevelData.getInstance();
    const cleared = levelData.getChapterClearedCount(chapter.chapterId);
    const locked = state === 'locked';
    const hero = getHeroConfig(chapter.unlockHeroId);
    const artifact = getArtifactConfig(chapter.unlockArtifactId);
    const heroOwned = HeroData_isUnlocked(chapter.unlockHeroId) || state === 'completed';
    const artifactOwned = ArtifactData_isUnlocked(chapter.unlockArtifactId) || state === 'completed';

    const panel = this.scene.add.graphics();
    drawPaperPanel(panel, CARD.x, CARD.y, CARD.w, CARD.h, { radius: 20 });
    this.container.add(panel);

    const eyebrow = createCjkText(this.scene, CARD.x + 30, CARD.y + 32, `第 ${chapter.chapterId} 章 · ${STATE_TEXT[state]}`, {
      fontSize: '22px',
      color: UI_TOKENS.textMutedOnPaper,
      fontStyle: 'bold',
    });
    eyebrow.setOrigin(0, 0.5);

    const title = createCjkText(this.scene, CARD.x + 30, CARD.y + 76, chapter.name, {
      fontSize: '38px',
      color: UI_TOKENS.textOnPaper,
      fontStyle: 'bold',
      fontFamily: 'SimSun, Microsoft YaHei, serif',
    });
    title.setOrigin(0, 0.5);

    const progressText = createCjkText(this.scene, CARD.x + CARD.w - 32, CARD.y + 58, `${cleared}/9 关`, {
      fontSize: '28px',
      color: UI_TOKENS.textCinnabarOnPaper,
      fontStyle: 'bold',
    });
    progressText.setOrigin(1, 0.5);

    const desc = createCjkText(this.scene, CARD.x + 30, CARD.y + 118, `${chapter.subtitle} · ${this._mechanicText(chapter)}`, {
      fontSize: '22px',
      color: UI_TOKENS.textMutedOnPaper,
      wordWrap: { width: CARD.w - 60, useAdvancedWrap: true },
    });
    desc.setOrigin(0, 0.5);

    // 章末解锁奖励
    const rewardLabel = createCjkText(this.scene, CARD.x + 30, CARD.y + 166, '章末解锁', {
      fontSize: '22px',
      color: UI_TOKENS.textOnPaper,
      fontStyle: 'bold',
    });
    rewardLabel.setOrigin(0, 0.5);

    const heroIcon = createHeroRewardIcon(this.scene, CARD.x + 94, CARD.y + 216, 62, hero, heroOwned, chapter.themeColor);
    const artifactIcon = createArtifactRewardIcon(this.scene, CARD.x + 316, CARD.y + 216, 62, artifact, artifactOwned);
    const heroName = createCjkText(this.scene, CARD.x + 140, CARD.y + 216, hero?.name ?? '章节英雄', {
      fontSize: '22px',
      color: UI_TOKENS.textOnPaper,
      fontStyle: 'bold',
    });
    heroName.setOrigin(0, 0.5);
    const artifactName = createCjkText(this.scene, CARD.x + 360, CARD.y + 216, artifact?.name ?? '章节法宝', {
      fontSize: '22px',
      color: UI_TOKENS.textOnPaper,
      fontStyle: 'bold',
    });
    artifactName.setOrigin(0, 0.5);
    this.container.add([eyebrow, title, progressText, desc, rewardLabel, heroIcon, artifactIcon, heroName, artifactName]);

    const primaryLabel = locked
      ? `通关第 ${chapter.chapterId - 1} 章解锁`
      : this._nextLevel(chapter)
        ? `继续第 ${this._nextLevel(chapter)} 关`
        : '进入本章';
    this.container.add(createUiButton(this.scene, {
      x: CARD.x + CARD.w - 238,
      y: CARD.y + CARD.h - 84,
      width: 206,
      height: 64,
      label: primaryLabel,
      primary: !locked,
      secondary: locked,
      enabled: !locked,
      fontSize: '26px',
      onClick: () => this.onSelectChapter(chapter.chapterId),
    }));
  }

  private _mechanicText(chapter: ChapterConfig): string {
    switch (chapter.specialMechanic.type) {
      case 'silence': return '流沙陷足，随机格短暂沉默';
      case 'respawn': return '白骨复生，击杀敌可能复活';
      case 'fire_zone': return '三昧火灼，随机格喷火';
      case 'burn_all': return '烈焰灼烧，全队持续承压';
      case 'slow': return '激流缓行，全局减速';
      case 'root': return '蛛网缠绕，随机定身';
      case 'stats_boost': return '万妖之岭，敌人数值提升';
      case 'shield_stack': return '佛光庇护，敌人持续叠盾';
      default: return '熟悉合成与英雄布阵';
    }
  }

  private _nextLevel(chapter: ChapterConfig): number | null {
    const levelData = LevelData.getInstance();
    for (let levelId = chapter.levelRange[0]; levelId <= chapter.levelRange[1]; levelId++) {
      if (levelData.isUnlocked(levelId) && !levelData.isCleared(levelId)) return levelId;
    }
    return null;
  }

  private _getInitialChapterId(): number {
    const levelData = LevelData.getInstance();
    const active = CHAPTER_CONFIGS.find(chapter => getChapterState(chapter.chapterId, levelData) === 'active');
    if (active) return active.chapterId;
    const completed = CHAPTER_CONFIGS.filter(chapter => getChapterState(chapter.chapterId, levelData) === 'completed');
    return completed[completed.length - 1]?.chapterId ?? 1;
  }

  private _getChapter(chapterId: number): ChapterConfig {
    return CHAPTER_CONFIGS.find(chapter => chapter.chapterId === chapterId) ?? CHAPTER_CONFIGS[0];
  }
}

// 本视图只读取解锁状态，不修改养成数据。
function ArtifactData_isUnlocked(artifactId: import('../types').ArtifactId): boolean {
  return ArtifactData.getInstance().isUnlocked(artifactId);
}
function HeroData_isUnlocked(heroId: string): boolean {
  return HeroData.getInstance().get(heroId).unlocked;
}
