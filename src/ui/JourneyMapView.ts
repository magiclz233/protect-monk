import Phaser from 'phaser';
import { ARTIFACT_CONFIGS, getArtifactCarrySlotCount, getArtifactUpgradeCost } from '../config/ArtifactConfig';
import { DEFENSE_RANKS, getDefenseRankByWave } from '../config/DefenseRankConfig';
import { ArtifactData } from '../data/ArtifactData';
import { HeroData } from '../data/HeroData';
import { LevelData } from '../data/LevelData';
import { SaveManager } from '../data/SaveManager';
import { createCjkText } from '../core/TextStyles';
import { AdSystem } from '../systems/AdSystem';
import { LeaderboardService } from '../systems/LeaderboardService';
import { LevelConfig } from '../types';
import { ChapterSelectView } from './ChapterSelectView';
import { LevelGridView } from './LevelGridView';
import { createJourneyBackButton, playPageEnter } from './JourneyUiPrimitives';

type HomeViewMode = 'home' | 'chapters' | 'levels' | 'artifacts' | 'leaderboard';
type TransitionDirection = 'forward' | 'back';

export class JourneyMapView {
  readonly container: Phaser.GameObjects.Container;
  private readonly _tipText: Phaser.GameObjects.Text;
  private _mode: HomeViewMode = 'home';
  private _selectedChapterId = 1;
  private _transitionDirection: TransitionDirection = 'forward';
  private _chapterView?: ChapterSelectView;
  private _levelGridView?: LevelGridView;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onStartDefense: () => void,
    private readonly onSelectLevel: (level: LevelConfig) => void,
  ) {
    LevelData.getInstance().loadFromSave();
    HeroData.getInstance().loadFromSave();
    HeroData.getInstance().ensureDefaults();
    ArtifactData.getInstance().loadFromSave();
    ArtifactData.getInstance().ensureDefaults();

    this.container = scene.add.container(0, 0);
    this.container.setDepth(220);
    this._tipText = createCjkText(scene, 375, 1248, '', {
      fontSize: '20px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    this._tipText.setOrigin(0.5);
    this._tipText.setDepth(241);
    this._draw();
    void AdSystem.getInstance().showBanner('home');
  }

  destroy(): void {
    AdSystem.getInstance().hideBanner('home');
    this._destroySubViews();
    this._tipText.destroy();
    this.container.destroy(true);
  }

  private _draw(): void {
    this._destroySubViews();
    this._tipText.setText('');
    this.container.removeAll(true);
    this._drawBackground();
    if (this._mode === 'home') {
      this._drawHome();
    } else if (this._mode === 'chapters') {
      this._chapterView = new ChapterSelectView(
        this.scene,
        chapterId => {
          this._selectedChapterId = chapterId;
          this._transitionDirection = 'forward';
          this._mode = 'levels';
          this._draw();
        },
        () => {
          this._transitionDirection = 'back';
          this._mode = 'home';
          this._draw();
        },
        text => this._showTip(text),
      );
      this.container.add(this._chapterView.container);
      playPageEnter(this.scene, this._chapterView.container, this._transitionDirection);
    } else if (this._mode === 'levels') {
      this._levelGridView = new LevelGridView(
        this.scene,
        this._selectedChapterId,
        this.onSelectLevel,
        () => {
          this._transitionDirection = 'back';
          this._mode = 'chapters';
          this._draw();
        },
        text => this._showTip(text),
      );
      this.container.add(this._levelGridView.container);
      playPageEnter(this.scene, this._levelGridView.container, this._transitionDirection);
    } else {
      if (this._mode === 'artifacts') {
        this._drawArtifactUpgrade();
      } else {
        this._drawLeaderboard();
      }
    }
  }

  private _destroySubViews(): void {
    if (this._chapterView) this.container.remove(this._chapterView.container);
    this._chapterView?.destroy();
    this._chapterView = undefined;
    if (this._levelGridView) this.container.remove(this._levelGridView.container);
    this._levelGridView?.destroy();
    this._levelGridView = undefined;
  }

  private _drawBackground(): void {
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x121527, 1);
    bg.fillRect(0, 0, 750, 1334);
    bg.fillStyle(0x0e1324, 0.58);
    bg.fillRect(0, 0, 750, 196);
    bg.fillStyle(0xd2a24a, 0.16);
    bg.fillTriangle(64, 206, 218, 92, 364, 206);
    bg.fillTriangle(344, 206, 522, 70, 698, 206);
    bg.lineStyle(3, 0xd2a24a, 0.18);
    bg.beginPath();
    bg.moveTo(56, 206);
    bg.lineTo(220, 104);
    bg.lineTo(372, 206);
    bg.lineTo(522, 88);
    bg.lineTo(704, 206);
    bg.strokePath();

    bg.fillStyle(0x173c36, 0.9);
    bg.fillRoundedRect(34, 220, 682, 792, 14);
    bg.lineStyle(2, 0xd2a24a, 0.35);
    bg.strokeRoundedRect(34, 220, 682, 792, 14);
    bg.fillStyle(0x0d1020, 0.92);
    bg.fillRoundedRect(34, 1032, 682, 190, 14);
    bg.lineStyle(2, 0xd2a24a, 0.28);
    bg.strokeRoundedRect(34, 1032, 682, 190, 14);
    this.container.add(bg);
  }

  private _drawHome(): void {
    const title = createCjkText(this.scene, 375, 96, '守护唐僧', {
      fontSize: '52px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const subTitle = createCjkText(this.scene, 375, 154, '合成布阵，守住取经路', {
      fontSize: '23px',
      color: '#d8edd9',
      fontStyle: 'bold',
    });
    subTitle.setOrigin(0.5);
    this.container.add([title, subTitle]);

    this._drawHomePreview();

    this._drawModeButton({
      x: 92,
      y: 604,
      width: 566,
      height: 128,
      title: '守护模式',
      desc: '直接开局，抽卡布阵，冲击最高波次',
      fill: 0xf1c24f,
      textColor: '#101826',
      onClick: this.onStartDefense,
    });

    this._drawModeButton({
      x: 92,
      y: 770,
      width: 566,
      height: 128,
      title: '八十一难',
      desc: '九章取经，挑战 Boss 解锁英雄与法宝',
      fill: 0x35b58f,
      textColor: '#071d17',
      onClick: () => {
        this._transitionDirection = 'forward';
        this._mode = 'chapters';
        this._draw();
      },
    });

    this._drawHomeSummary();
  }

  private _drawHomePreview(): void {
    const g = this.scene.add.graphics();
    const x = 72;
    const y = 244;
    const w = 606;
    const h = 310;

    g.fillStyle(0x0d1b24, 0.96);
    g.fillRoundedRect(x, y, w, h, 12);
    g.lineStyle(2, 0xf0c15a, 0.42);
    g.strokeRoundedRect(x, y, w, h, 12);
    g.fillStyle(0x122f2b, 1);
    g.fillRoundedRect(x + 22, y + 22, w - 44, h - 88, 10);

    const path = [
      { x: x + 74, y: y + 96 },
      { x: x + 246, y: y + 96 },
      { x: x + 246, y: y + 178 },
      { x: x + 462, y: y + 178 },
    ];
    g.lineStyle(26, 0x3a1d2c, 0.92);
    this._drawPreviewRoute(g, path);
    g.lineStyle(16, 0x9e3345, 0.9);
    this._drawPreviewRoute(g, path);
    g.lineStyle(4, 0xffc45d, 0.95);
    this._drawPreviewRoute(g, path);

    [
      { x: x + 102, y: y + 170 },
      { x: x + 338, y: y + 92 },
      { x: x + 422, y: y + 92 },
    ].forEach(pos => {
      g.fillStyle(0x143b34, 0.98);
      g.fillRoundedRect(pos.x - 30, pos.y - 30, 60, 60, 8);
      g.lineStyle(2, 0x49d3a6, 0.72);
      g.strokeRoundedRect(pos.x - 30, pos.y - 30, 60, 60, 8);
    });

    [
      { x: x + 496, y: y + 92 },
      { x: x + 170, y: y + 170 },
    ].forEach(pos => {
      g.fillStyle(0x5c5046, 0.96);
      g.fillRoundedRect(pos.x - 30, pos.y - 30, 60, 60, 8);
      g.fillStyle(0xd2a24a, 0.95);
      g.fillRoundedRect(pos.x - 12, pos.y - 2, 24, 18, 4);
      g.lineStyle(3, 0xf2d18a, 0.78);
      g.strokeCircle(pos.x, pos.y - 8, 13);
    });

    g.fillStyle(0xf0c15a, 1);
    g.fillCircle(x + 462, y + 178, 22);
    g.lineStyle(4, 0xfff0a6, 0.88);
    g.strokeCircle(x + 462, y + 178, 22);
    g.fillStyle(0xb83f35, 1);
    g.fillCircle(x + 92, y + 96, 16);
    g.fillCircle(x + 136, y + 96, 12);
    this.container.add(g);

    const monk = createCjkText(this.scene, x + 462, y + 211, '唐僧', {
      fontSize: '17px',
      color: '#fff2b8',
      fontStyle: 'bold',
    });
    monk.setOrigin(0.5);
    const enemy = createCjkText(this.scene, x + 112, y + 124, '妖路', {
      fontSize: '15px',
      color: '#ffb8b8',
      fontStyle: 'bold',
    });
    enemy.setOrigin(0.5);

    const title = createCjkText(this.scene, x + 32, y + 250, '拖卡上阵，沿路拦截', {
      fontSize: '21px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    const desc = createCjkText(this.scene, x + 32, y + 278, '青玉格布阵，朱砂线预警，金色卡牌召唤援手', {
      fontSize: '16px',
      color: '#d8edd9',
    });
    this.container.add([monk, enemy, title, desc]);

    this._drawPreviewCard(x + 394, y + 244, '小兵', 'Lv2', 0x2f8f74);
    this._drawPreviewCard(x + 486, y + 244, '英雄', '碎片', 0x9b5832);
  }

  private _drawPreviewRoute(g: Phaser.GameObjects.Graphics, points: Array<{ x: number; y: number }>): void {
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x, points[i].y);
    }
    g.strokePath();
  }

  private _drawPreviewCard(x: number, y: number, title: string, label: string, fill: number): void {
    const g = this.scene.add.graphics();
    g.fillStyle(fill, 0.98);
    g.fillRoundedRect(x, y, 72, 54, 8);
    g.lineStyle(2, 0xfff0a6, 0.58);
    g.strokeRoundedRect(x, y, 72, 54, 8);
    const text = createCjkText(this.scene, x + 36, y + 27, `${title}\n${label}`, {
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 2,
    });
    text.setOrigin(0.5);
    this.container.add([g, text]);
  }

  private _drawHomeSummary(): void {
    const save = SaveManager.getInstance().load() ?? SaveManager.getInstance().createDefault();
    const record = LeaderboardService.getInstance().getPersonalRecord();
    const rank = getDefenseRankByWave(record.bestWave);
    const title = createCjkText(this.scene, 74, 1068, '当前进度', {
      fontSize: '20px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    this.container.add(title);

    this._drawStatChip(76, 1106, 142, '灵蕴', `${save.spiritEssence}`, 0xf0c15a);
    this._drawStatChip(232, 1106, 154, '段位', rank.name, 0x8f6fd1);
    this._drawStatChip(400, 1106, 244, '最佳', `${record.bestWave} 波 / ${record.bestKills} 杀`, 0x4f95d8);

    this._drawModeButton({
      x: 92,
      y: 1162,
      width: 252,
      height: 58,
      title: '法宝',
      desc: '',
      fill: 0x8f6fd1,
      textColor: '#101826',
      onClick: () => {
        this._mode = 'artifacts';
        this._draw();
      },
    });

    this._drawModeButton({
      x: 406,
      y: 1162,
      width: 252,
      height: 58,
      title: '排行榜',
      desc: '',
      fill: 0x4f95d8,
      textColor: '#07131d',
      onClick: () => {
        this._mode = 'leaderboard';
        this._draw();
      },
    });
  }

  private _drawModeButton(options: {
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    desc: string;
    fill: number;
    textColor: string;
    onClick: () => void;
  }): void {
    const bg = this.scene.add.graphics();
    bg.fillStyle(options.fill, 1);
    bg.fillRoundedRect(options.x, options.y, options.width, options.height, 12);
    bg.lineStyle(3, 0xfff0a6, 0.46);
    bg.strokeRoundedRect(options.x, options.y, options.width, options.height, 12);

    const titleY = options.desc ? options.y + 54 : options.y + options.height / 2;
    const title = createCjkText(this.scene, options.x + 38, titleY, options.title, {
      fontSize: options.desc ? '34px' : '30px',
      color: options.textColor,
      fontStyle: 'bold',
    });
    title.setOrigin(0, 0.5);

    const desc = createCjkText(this.scene, options.x + 38, options.y + 106, options.desc, {
      fontSize: '20px',
      color: options.textColor,
    });
    desc.setOrigin(0, 0.5);

    const arrow = createCjkText(this.scene, options.x + options.width - 52, options.y + options.height / 2, '›', {
      fontSize: options.desc ? '52px' : '44px',
      color: options.textColor,
      fontStyle: 'bold',
    });
    arrow.setOrigin(0.5);

    const hit = this.scene.add.zone(options.x + options.width / 2, options.y + options.height / 2, options.width, options.height);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      bg.setAlpha(0.82);
      title.setY(title.y + 1);
      if (desc.text) desc.setY(desc.y + 1);
      arrow.setY(arrow.y + 1);
      options.onClick();
    });
    this.container.add(options.desc ? [bg, title, desc, arrow, hit] : [bg, title, arrow, hit]);
  }

  private _drawStatChip(x: number, y: number, width: number, label: string, value: string, accent: number): void {
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x172033, 0.96);
    bg.fillRoundedRect(x, y, width, 38, 8);
    bg.lineStyle(1.5, accent, 0.54);
    bg.strokeRoundedRect(x, y, width, 38, 8);

    const labelText = createCjkText(this.scene, x + 12, y + 19, label, {
      fontSize: '14px',
      color: '#a7bed6',
      fontStyle: 'bold',
    });
    labelText.setOrigin(0, 0.5);

    const valueText = createCjkText(this.scene, x + width - 12, y + 19, value, {
      fontSize: '16px',
      color: '#f7f1d0',
      fontStyle: 'bold',
      align: 'right',
    });
    valueText.setOrigin(1, 0.5);
    this.container.add([bg, labelText, valueText]);
  }

  private _drawBackButton(): void {
    this.container.add(createJourneyBackButton(this.scene, () => {
      this._transitionDirection = 'back';
      this._mode = 'home';
      this._draw();
    }));
  }

  private _drawArtifactUpgrade(): void {
    const artifactData = ArtifactData.getInstance();
    artifactData.loadFromSave();
    const save = SaveManager.getInstance().load() ?? SaveManager.getInstance().createDefault();
    const clearedChapter = this._getClearedChapter();
    const slotLimit = getArtifactCarrySlotCount(clearedChapter);

    const title = createCjkText(this.scene, 375, 96, '法宝升级', {
      fontSize: '46px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    const subTitle = createCjkText(this.scene, 375, 150, `灵蕴 ${save.spiritEssence} ✦    携带槽 ${slotLimit}`, {
      fontSize: '22px',
      color: '#d8edd9',
      fontStyle: 'bold',
    });
    subTitle.setOrigin(0.5);
    this.container.add([title, subTitle]);
    this._drawBackButton();

    ARTIFACT_CONFIGS.forEach((config, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 72 + col * 318;
      const y = 244 + row * 112;
      const unlocked = artifactData.isUnlocked(config.artifactId);
      const level = artifactData.getLevel(config.artifactId);
      const cost = getArtifactUpgradeCost(level);

      const bg = this.scene.add.graphics();
      bg.fillStyle(unlocked ? 0x1d2f43 : 0x29303a, 0.96);
      bg.fillRoundedRect(x, y, 286, 92, 8);
      bg.lineStyle(2, unlocked ? 0xf0c15a : 0x6f7785, unlocked ? 0.62 : 0.38);
      bg.strokeRoundedRect(x, y, 286, 92, 8);

      const name = createCjkText(this.scene, x + 16, y + 18, `${config.name}  Lv${level}`, {
        fontSize: '20px',
        color: unlocked ? '#ffd36a' : '#b8bec9',
        fontStyle: 'bold',
      });
      const desc = createCjkText(this.scene, x + 16, y + 48, unlocked ? config.levelDescriptions[level] : `通关 Ch${config.unlockChapter} 解锁`, {
        fontSize: '14px',
        color: '#f7f1d0',
        wordWrap: { width: 178, useAdvancedWrap: true },
      });

      const buttonText = !unlocked ? '未解锁' : cost === null ? '满级' : `${cost} ✦`;
      const button = createCjkText(this.scene, x + 235, y + 46, buttonText, {
        fontSize: '16px',
        color: unlocked && cost !== null ? '#101826' : '#ffffff',
        fontStyle: 'bold',
        backgroundColor: unlocked && cost !== null ? '#f0c15a' : '#667080',
        padding: { x: 10, y: 8 },
      });
      button.setOrigin(0.5);
      if (unlocked && cost !== null) {
        button.setInteractive({ useHandCursor: true });
        button.on('pointerdown', () => {
          const success = ArtifactData.getInstance().upgrade(config.artifactId);
          this._showTip(success ? `${config.name} 已升级` : '灵蕴不足');
          this._draw();
        });
      }

      this.container.add([bg, name, desc, button]);
    });

    this._drawArtifactFooter(save.spiritEssence, slotLimit, clearedChapter, artifactData);
  }

  private _drawArtifactFooter(spiritEssence: number, slotLimit: number, clearedChapter: number, artifactData: ArtifactData): void {
    const unlockedCount = ARTIFACT_CONFIGS.filter(config => artifactData.isUnlocked(config.artifactId)).length;
    const nextArtifact = ARTIFACT_CONFIGS.find(config => !artifactData.isUnlocked(config.artifactId));
    const title = createCjkText(this.scene, 76, 1068, '法宝策略', {
      fontSize: '22px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    const detail = createCjkText(
      this.scene,
      76,
      1104,
      `灵蕴 ${spiritEssence}   携带槽 ${slotLimit}   已解锁 ${unlockedCount}/${ARTIFACT_CONFIGS.length}`,
      {
        fontSize: '18px',
        color: '#f7f1d0',
        fontStyle: 'bold',
      },
    );
    const nextText = nextArtifact
      ? `下一目标：通关第 ${nextArtifact.unlockChapter} 章解锁 ${nextArtifact.name}`
      : `九章法宝已齐，继续升级主力法宝`;
    const next = createCjkText(this.scene, 76, 1140, nextText, {
      fontSize: '17px',
      color: '#d8edd9',
    });
    const hint = createCjkText(this.scene, 76, 1176, `建议优先升级开山斧和回山符，先解决布阵空间和漏怪压力。`, {
      fontSize: '16px',
      color: clearedChapter >= 3 ? '#b8f4de' : '#cfd8e3',
      wordWrap: { width: 580, useAdvancedWrap: true },
    });
    this.container.add([title, detail, next, hint]);
  }

  private _drawLeaderboard(): void {
    const record = LeaderboardService.getInstance().getPersonalRecord();
    const rank = getDefenseRankByWave(record.bestWave);
    const title = createCjkText(this.scene, 375, 96, '排行榜', {
      fontSize: '46px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    const subTitle = createCjkText(this.scene, 375, 150, 'Defense 竞技记录', {
      fontSize: '22px',
      color: '#d8edd9',
      fontStyle: 'bold',
    });
    subTitle.setOrigin(0.5);
    this.container.add([title, subTitle]);
    this._drawBackButton();

    const panel = this.scene.add.graphics();
    panel.fillStyle(0x101826, 0.94);
    panel.fillRoundedRect(92, 306, 566, 328, 10);
    panel.lineStyle(2, 0xf0c15a, 0.48);
    panel.strokeRoundedRect(92, 306, 566, 328, 10);
    this.container.add(panel);

    const lines = [
      `当前段位：${rank.name}`,
      `视觉标识：${rank.frame}`,
      `最高波次：${record.bestWave}`,
      `最高击杀：${record.bestKills}`,
      `达成时间：${this._formatRecordTime(record.achievedAt)}`,
      '排序规则：波次 > 击杀 > 时间',
    ];
    const text = createCjkText(this.scene, 132, 354, lines, {
      fontSize: '24px',
      color: '#f7f1d0',
      lineSpacing: 16,
    });
    this.container.add(text);

    const currentRankIndex = DEFENSE_RANKS.findIndex(item => item.id === rank.id);
    const nextRank = DEFENSE_RANKS[currentRankIndex + 1] ?? null;
    const neededWave = nextRank ? Math.max(0, nextRank.minWave - record.bestWave) : 0;
    const footerTitle = createCjkText(this.scene, 76, 1068, '段位进度', {
      fontSize: '22px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    const progress = createCjkText(this.scene, 76, 1106, nextRank
      ? `下一段位 ${nextRank.name}：还差 ${neededWave} 波`
      : '已达到最高段位，继续刷新极限纪录', {
        fontSize: '20px',
        color: '#f7f1d0',
        fontStyle: 'bold',
      });
    const hint = createCjkText(this.scene, 76, 1144, '排序优先比较波次，其次击杀数；守护模式成绩会刷新这里。', {
      fontSize: '17px',
      color: '#d8edd9',
      wordWrap: { width: 590, useAdvancedWrap: true },
    });
    this.container.add([footerTitle, progress, hint]);
  }

  private _getClearedChapter(): number {
    return LevelData.getInstance().getClearedChapterCount();
  }

  private _formatRecordTime(timestamp: number): string {
    if (timestamp <= 0) return '暂无';
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  private _showTip(text: string): void {
    this._tipText.setText(text);
    this.scene.time.delayedCall(1800, () => {
      if (this._tipText.text === text) {
        this._tipText.setText('');
      }
    });
  }
}
