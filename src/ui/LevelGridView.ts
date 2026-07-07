import Phaser from 'phaser';
import { getArtifactConfig } from '../config/ArtifactConfig';
import { getChapterConfig } from '../config/ChapterConfig';
import { getHeroConfig } from '../config/HeroConfig';
import { VISUAL_PALETTE } from '../config/VisualConfig';
import { ArtifactData } from '../data/ArtifactData';
import { HeroData } from '../data/HeroData';
import { JOURNEY_LEVELS } from '../data/JourneyLevelData';
import { LevelData } from '../data/LevelData';
import { createCjkText } from '../core/TextStyles';
import { LevelConfig } from '../types';
import { createArtifactRewardIcon, createHeroRewardIcon, isReducedMotionEnabled } from './JourneyRewardIcons';
import { createJourneyBackButton, createJourneyButton } from './JourneyUiPrimitives';

interface NodePosition {
  x: number;
  y: number;
}

export class LevelGridView {
  readonly container: Phaser.GameObjects.Container;
  private readonly _animatedObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly _reducedMotion = isReducedMotionEnabled();
  private _selectedLevelId: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly chapterId: number,
    private readonly onSelectLevel: (level: LevelConfig) => void,
    private readonly onBack: () => void,
    private readonly onShowTip: (text: string) => void,
  ) {
    this.container = scene.add.container(0, 0);
    this._selectedLevelId = this._getInitialSelectedLevelId();
    this._draw();
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this._animatedObjects);
    this.scene.tweens.killTweensOf(this.container);
    this.container.destroy(true);
  }

  private _draw(): void {
    this.scene.tweens.killTweensOf(this._animatedObjects);
    this._animatedObjects.length = 0;
    this.container.removeAll(true);
    this._drawNavigation();
    this._drawChapterHeader();
    this._drawLevelNodes();
    this._drawLevelDetail();
    this._drawFooter();
  }

  private _drawNavigation(): void {
    this.container.add(createJourneyBackButton(this.scene, this.onBack));
  }

  private _drawChapterHeader(): void {
    const chapter = this._getChapter();
    const title = createCjkText(this.scene, 375, 94, `${chapter.name}  Ch${chapter.chapterId}`, {
      fontSize: '42px',
      color: this._toCssColor(chapter.themeColor),
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    const subTitle = createCjkText(this.scene, 375, 148, `${chapter.subtitle} · 第 ${chapter.levelRange[0]}-${chapter.levelRange[1]} 难`, {
      fontSize: '20px',
      color: '#d8edd9',
      fontStyle: 'bold',
    });
    subTitle.setOrigin(0.5);

    const decor = this.scene.add.graphics();
    decor.fillStyle(chapter.themeColorDark, 0.48);
    decor.fillRoundedRect(118, 166, 514, 24, 12);
    const cleared = LevelData.getInstance().getChapterClearedCount(chapter.chapterId);
    if (cleared > 0) {
      decor.fillStyle(chapter.themeColor, 0.7);
      decor.fillRoundedRect(118, 166, 514 * (cleared / 9), 24, 12);
    }

    const progress = createCjkText(this.scene, 375, 178, `${cleared}/9 关`, {
      fontSize: '15px',
      color: '#f7f1d0',
      fontStyle: 'bold',
    });
    progress.setOrigin(0.5);
    this.container.add([title, subTitle, decor, progress]);
  }

  private _drawLevelNodes(): void {
    const chapter = this._getChapter();
    const levels = this._getChapterLevels();
    const positions = this._getNodePositions();
    const route = this.scene.add.graphics();
    route.lineStyle(8, 0x081018, 0.72);
    this._drawRouteLine(route, positions);
    route.lineStyle(3, chapter.themeColor, 0.78);
    this._drawRouteLine(route, positions);
    this.container.add(route);

    levels.forEach((level, index) => {
      const pos = positions[index];
      const unlocked = LevelData.getInstance().isUnlocked(level.levelId);
      const cleared = LevelData.getInstance().isCleared(level.levelId);
      const selected = this._selectedLevelId === level.levelId;
      const boss = level.levelId === chapter.bossLevelId;
      this._drawLevelNode(level, pos, unlocked, cleared, selected, boss, chapter.themeColor);
    });
  }

  private _drawLevelNode(
    level: LevelConfig,
    pos: NodePosition,
    unlocked: boolean,
    cleared: boolean,
    selected: boolean,
    boss: boolean,
    themeColor: number,
  ): void {
    if (boss && unlocked && !cleared) {
      this._drawBossGlow(pos);
    }

    const graphics = this.scene.add.graphics();
    if (boss) this._drawStar(graphics, pos.x, pos.y, selected ? 34 : 30, cleared ? VISUAL_PALETTE.gold : themeColor);

    const radius = selected ? 21 : 18;
    const fill = selected ? VISUAL_PALETTE.jade : cleared ? VISUAL_PALETTE.gold : unlocked ? 0x35b58f : 0x49505f;
    const stroke = selected ? 0xe7fff3 : cleared ? 0xfff0a6 : unlocked ? 0xb8f4de : 0x7a8394;
    graphics.fillStyle(fill, unlocked || cleared ? 1 : 0.92);
    graphics.fillCircle(pos.x, pos.y, radius);
    graphics.lineStyle(selected ? 5 : 3, stroke, 0.95);
    graphics.strokeCircle(pos.x, pos.y, radius);

    const localNo = ((level.levelId - 1) % 9) + 1;
    const label = createCjkText(this.scene, pos.x, pos.y, `${localNo}`, {
      fontSize: '15px',
      color: unlocked || cleared ? '#101826' : '#d5d8dd',
      fontStyle: 'bold',
    });
    label.setOrigin(0.5);

    const stars = LevelData.getInstance().getStars(level.levelId);
    const starText = createCjkText(this.scene, pos.x, pos.y + 25, stars > 0 ? '*'.repeat(stars) : '', {
      fontSize: '12px',
      color: '#fff3a0',
      fontStyle: 'bold',
    });
    starText.setOrigin(0.5);

    const hit = this.scene.add.zone(pos.x, pos.y, 46, 46);
    hit.setOrigin(0.5);
    if (unlocked) {
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        this._selectedLevelId = level.levelId;
        this._draw();
      });
    }

    this.container.add([graphics, label, starText, hit]);
    if (boss) this._drawBossRewardStrip(pos.x, pos.y + 48, cleared || LevelData.getInstance().isChapterBossCleared(level.chapter));
  }

  private _drawBossGlow(pos: NodePosition): void {
    const glow = this.scene.add.container(pos.x, pos.y);
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(VISUAL_PALETTE.gold, 0.34);
    graphics.fillCircle(0, 0, 40);
    glow.add(graphics);
    this.container.add(glow);
    this._animatedObjects.push(glow);
    if (!this._reducedMotion) {
      this.scene.tweens.add({
        targets: glow,
        alpha: { from: 0.42, to: 0.82 },
        scale: { from: 1, to: 1.12 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }
  }

  private _drawBossRewardStrip(x: number, y: number, owned: boolean): void {
    const chapter = this._getChapter();
    const hero = getHeroConfig(chapter.unlockHeroId);
    const artifact = getArtifactConfig(chapter.unlockArtifactId);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x172033, owned ? 0.96 : 0.74);
    bg.fillRoundedRect(x - 42, y - 20, 84, 40, 7);
    bg.lineStyle(1.5, owned ? VISUAL_PALETTE.gold : 0x6f7785, owned ? 0.68 : 0.5);
    bg.strokeRoundedRect(x - 42, y - 20, 84, 40, 7);

    const heroIcon = createHeroRewardIcon(this.scene, x - 16, y, 20, hero, owned, chapter.themeColor, false);
    const artifactIcon = createArtifactRewardIcon(this.scene, x + 17, y, 20, artifact, owned, false);
    this.container.add([bg, heroIcon, artifactIcon]);
  }

  private _drawLevelDetail(): void {
    const chapter = this._getChapter();
    const level = this._getSelectedLevel();
    const unlocked = LevelData.getInstance().isUnlocked(level.levelId);
    const canSweep = LevelData.getInstance().canSweep(level.levelId);
    const boss = level.levelId === chapter.bossLevelId;
    const panel = this.scene.add.graphics();
    panel.fillStyle(0x101826, 0.96);
    panel.fillRoundedRect(54, 614, 642, 390, 14);
    panel.lineStyle(2.5, boss ? VISUAL_PALETTE.gold : chapter.themeColor, boss ? 0.68 : 0.52);
    panel.strokeRoundedRect(54, 614, 642, 390, 14);
    this.container.add(panel);

    const titlePrefix = boss ? 'Boss 关' : '关卡情报';
    const title = createCjkText(this.scene, 82, 648, `${titlePrefix} · 第 ${level.levelId} 难`, {
      fontSize: '27px',
      color: unlocked ? '#ffd36a' : '#aeb7c8',
      fontStyle: 'bold',
    });
    const status = createCjkText(this.scene, 82, 688, this._formatLevelState(level), {
      fontSize: '18px',
      color: unlocked ? '#f7f1d0' : '#c9ced8',
      fontStyle: 'bold',
    });
    this.container.add([title, status]);

    this._drawRewardDetail(92, 736, boss ? '通关奖励' : '本章 Boss 奖励');

    const meta = createCjkText(this.scene, 82, 902, `波次 ${level.waves.length}   锁定格 ${level.lockedCells.length}   路径点 ${level.monsterPath.length}`, {
      fontSize: '17px',
      color: '#d8edd9',
    });
    this.container.add(meta);

    this.container.add(createJourneyButton(this.scene, {
      x: 82,
      y: 934,
      width: 166,
      height: 50,
      label: canSweep ? '扫荡领奖' : '扫荡未开启',
      enabled: canSweep,
      onClick: () => this._sweep(level),
    }));
    this.container.add(createJourneyButton(this.scene, {
      x: 474,
      y: 928,
      width: 194,
      height: 62,
      label: unlocked ? '开始挑战' : '未解锁',
      enabled: unlocked,
      primary: true,
      onClick: () => this.onSelectLevel(level),
    }));
  }

  private _drawRewardDetail(x: number, y: number, title: string): void {
    const chapter = this._getChapter();
    const hero = getHeroConfig(chapter.unlockHeroId);
    const artifact = getArtifactConfig(chapter.unlockArtifactId);
    const completed = LevelData.getInstance().isChapterBossCleared(chapter.chapterId);
    const heroOwned = HeroData.getInstance().get(chapter.unlockHeroId).unlocked || completed;
    const artifactOwned = ArtifactData.getInstance().isUnlocked(chapter.unlockArtifactId) || completed;

    const titleText = createCjkText(this.scene, x, y, title, {
      fontSize: '20px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    this.container.add(titleText);

    const heroIcon = createHeroRewardIcon(this.scene, x + 54, y + 74, 82, hero, heroOwned, chapter.themeColor);
    const artifactIcon = createArtifactRewardIcon(this.scene, x + 310, y + 74, 82, artifact, artifactOwned);
    this.container.add([heroIcon, artifactIcon]);

    this._drawRewardText(x + 112, y + 50, hero?.name ?? '章节英雄', hero?.role ?? '通关解锁', heroOwned);
    this._drawRewardText(x + 368, y + 50, artifact?.name ?? '章节法宝', artifact?.levelDescriptions[1] ?? '通关解锁', artifactOwned);
  }

  private _drawRewardText(x: number, y: number, name: string, desc: string, owned: boolean): void {
    const nameText = createCjkText(this.scene, x, y, name, {
      fontSize: '21px',
      color: '#f7f1d0',
      fontStyle: 'bold',
    });
    const descText = createCjkText(this.scene, x, y + 34, desc, {
      fontSize: '15px',
      color: '#d8edd9',
      wordWrap: { width: 178, useAdvancedWrap: true },
    });
    const stateText = createCjkText(this.scene, x, y + 84, owned ? '已解锁' : `通关第 ${this._getChapter().bossLevelId} 难解锁`, {
      fontSize: '14px',
      color: owned ? '#b8f4de' : '#cfd8e3',
      fontStyle: 'bold',
    });
    this.container.add([nameText, descText, stateText]);
  }

  private _drawFooter(): void {
    const chapter = this._getChapter();
    const bossCleared = LevelData.getInstance().isChapterBossCleared(chapter.chapterId);
    const title = createCjkText(this.scene, 76, 1068, '章节策略', {
      fontSize: '22px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    const target = createCjkText(this.scene, 76, 1106, bossCleared
      ? `${chapter.name} 已通关，可回刷三星关卡积累英雄碎片。`
      : `目标：推进到第 ${chapter.bossLevelId} 难，解锁 ${getHeroConfig(chapter.unlockHeroId)?.name ?? '英雄'} 与 ${getArtifactConfig(chapter.unlockArtifactId)?.name ?? '法宝'}。`, {
        fontSize: '18px',
        color: '#f7f1d0',
        fontStyle: 'bold',
        wordWrap: { width: 590, useAdvancedWrap: true },
      });
    const hint = createCjkText(this.scene, 76, 1152, '绿色节点可挑战，金色节点已通关；三星后开启扫荡。', {
      fontSize: '17px',
      color: '#d8edd9',
    });
    this.container.add([title, target, hint]);
  }

  private _sweep(level: LevelConfig): void {
    const chapter = this._getChapter();
    const hero = getHeroConfig(chapter.unlockHeroId);
    HeroData.getInstance().addShards(chapter.unlockHeroId, 2);
    this.onShowTip(`${level.name} 扫荡完成，获得 ${hero?.name ?? chapter.unlockHeroId} 碎片 x2`);
  }

  private _formatLevelState(level: LevelConfig): string {
    const levelData = LevelData.getInstance();
    if (!levelData.isUnlocked(level.levelId)) return '尚未解锁，先通过前置关卡';
    const stars = levelData.getStars(level.levelId);
    if (stars <= 0) return '未通关';
    return `已通关 ${'*'.repeat(stars)}`;
  }

  private _getInitialSelectedLevelId(): number {
    const chapter = this._getChapter();
    const currentLevel = LevelData.getInstance().currentLevel;
    if (currentLevel >= chapter.levelRange[0] && currentLevel <= chapter.levelRange[1]) return currentLevel;

    const firstUnlockedUncleared = this._getChapterLevels().find(level => LevelData.getInstance().isUnlocked(level.levelId) && !LevelData.getInstance().isCleared(level.levelId));
    return firstUnlockedUncleared?.levelId ?? chapter.bossLevelId;
  }

  private _getSelectedLevel(): LevelConfig {
    return this._getChapterLevels().find(level => level.levelId === this._selectedLevelId) ?? this._getChapterLevels()[0];
  }

  private _getChapterLevels(): LevelConfig[] {
    return JOURNEY_LEVELS.filter(level => level.chapter === this.chapterId);
  }

  private _getChapter() {
    return getChapterConfig(this.chapterId) ?? getChapterConfig(1)!;
  }

  private _getNodePositions(): NodePosition[] {
    return [
      { x: 148, y: 306 },
      { x: 375, y: 306 },
      { x: 602, y: 306 },
      { x: 602, y: 398 },
      { x: 375, y: 398 },
      { x: 148, y: 398 },
      { x: 148, y: 490 },
      { x: 375, y: 490 },
      { x: 602, y: 490 },
    ];
  }

  private _drawRouteLine(graphics: Phaser.GameObjects.Graphics, positions: NodePosition[]): void {
    graphics.beginPath();
    graphics.moveTo(positions[0].x, positions[0].y);
    for (let index = 1; index < positions.length; index++) {
      graphics.lineTo(positions[index].x, positions[index].y);
    }
    graphics.strokePath();
  }

  private _drawStar(graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, color: number): void {
    const points: Array<{ x: number; y: number }> = [];
    for (let index = 0; index < 10; index++) {
      const pointRadius = index % 2 === 0 ? radius : radius * 0.48;
      const angle = -Math.PI / 2 + index * Math.PI / 5;
      points.push({ x: x + Math.cos(angle) * pointRadius, y: y + Math.sin(angle) * pointRadius });
    }
    graphics.fillStyle(color, 0.8);
    graphics.fillPoints(points, true);
    graphics.lineStyle(2, 0xfff0a6, 0.72);
    graphics.strokePoints(points, true);
  }

  private _toCssColor(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
}
