import Phaser from 'phaser';
import { ARTIFACT_CONFIGS, getArtifactCarrySlotCount, getArtifactUpgradeCost } from '../config/ArtifactConfig';
import { getDefenseRankByWave } from '../config/DefenseRankConfig';
import { ArtifactData } from '../data/ArtifactData';
import { HeroData } from '../data/HeroData';
import { JOURNEY_LEVELS } from '../data/JourneyLevelData';
import { LevelData } from '../data/LevelData';
import { SaveManager } from '../data/SaveManager';
import { AdSystem } from '../systems/AdSystem';
import { LeaderboardService } from '../systems/LeaderboardService';
import { LevelConfig } from '../types';

type HomeViewMode = 'home' | 'journey' | 'artifacts' | 'leaderboard';

const CHAPTER_SWEEP_REWARD: Record<number, string> = {
  1: 'sunwukong',
  2: 'shawujing',
  3: 'baigufuren',
  4: 'honghaier',
  5: 'niumowang',
  6: 'guanyin',
  7: 'zhizhujing',
  8: 'erlangshen',
  9: 'nezha',
};

const HERO_NAME_BY_ID: Record<string, string> = {
  sunwukong: '孙悟空',
  zhubajie: '猪八戒',
  shawujing: '沙悟净',
  bailongma: '白龙马',
  heixiongjing: '黑熊精',
  baigufuren: '白骨夫人',
  zhizhujing: '蜘蛛精',
  tuotatianwang: '托塔天王',
  nezha: '哪吒',
  honghaier: '红孩儿',
  niumowang: '牛魔王',
  guanyin: '观音菩萨',
  erlangshen: '二郎神',
  taishanglaojun: '太上老君',
};

export class JourneyMapView {
  readonly container: Phaser.GameObjects.Container;
  private readonly _tipText: Phaser.GameObjects.Text;
  private _mode: HomeViewMode = 'home';

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
    this._tipText = scene.add.text(375, 1248, '', {
      fontSize: '20px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    this._tipText.setOrigin(0.5);
    this._draw();
    void AdSystem.getInstance().showBanner('home');
  }

  destroy(): void {
    AdSystem.getInstance().hideBanner('home');
    this.container.destroy(true);
  }

  private _draw(): void {
    this.container.removeAll(true);
    this._drawBackground();
    if (this._mode === 'home') {
      this._drawHome();
    } else {
      if (this._mode === 'journey') {
        this._drawJourneyLevels();
      } else if (this._mode === 'artifacts') {
        this._drawArtifactUpgrade();
      } else {
        this._drawLeaderboard();
      }
    }
    this.container.add(this._tipText);
  }

  private _drawBackground(): void {
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x121527, 1);
    bg.fillRect(0, 0, 750, 1334);
    bg.fillStyle(0x173c36, 0.86);
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
    const title = this.scene.add.text(375, 112, '守护唐僧', {
      fontSize: '52px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const subTitle = this.scene.add.text(375, 174, '合成布阵，守住取经路', {
      fontSize: '23px',
      color: '#d8edd9',
      fontStyle: 'bold',
    });
    subTitle.setOrigin(0.5);
    this.container.add([title, subTitle]);

    this._drawModeButton({
      x: 92,
      y: 328,
      width: 566,
      height: 168,
      title: '守护模式',
      desc: '直接开局，抽卡布阵，守住唐僧',
      fill: 0xf1c24f,
      textColor: '#101826',
      onClick: this.onStartDefense,
    });

    this._drawModeButton({
      x: 92,
      y: 548,
      width: 566,
      height: 168,
      title: '八十一难',
      desc: '选择关卡，挑战九章取经路',
      fill: 0x35b58f,
      textColor: '#071d17',
      onClick: () => {
        this._mode = 'journey';
        this._draw();
      },
    });

    this._drawHomeSummary();
  }

  private _drawHomeSummary(): void {
    const save = SaveManager.getInstance().load() ?? SaveManager.getInstance().createDefault();
    const record = LeaderboardService.getInstance().getPersonalRecord();
    const rank = getDefenseRankByWave(record.bestWave);
    const summary = this.scene.add.text(76, 1076, `灵蕴 ${save.spiritEssence} ✦    段位 ${rank.name}    最佳 ${record.bestWave} 波 / ${record.bestKills} 杀`, {
      fontSize: '18px',
      color: '#f7f1d0',
      fontStyle: 'bold',
      wordWrap: { width: 596, useAdvancedWrap: true },
    });
    summary.setOrigin(0, 0.5);
    this.container.add(summary);

    this._drawModeButton({
      x: 92,
      y: 1122,
      width: 252,
      height: 66,
      title: '法宝升级',
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
      y: 1122,
      width: 252,
      height: 66,
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
    const title = this.scene.add.text(options.x + 38, titleY, options.title, {
      fontSize: '34px',
      color: options.textColor,
      fontStyle: 'bold',
    });
    title.setOrigin(0, 0.5);

    const desc = this.scene.add.text(options.x + 38, options.y + 106, options.desc, {
      fontSize: '20px',
      color: options.textColor,
    });
    desc.setOrigin(0, 0.5);

    const arrow = this.scene.add.text(options.x + options.width - 52, options.y + options.height / 2, '›', {
      fontSize: '52px',
      color: options.textColor,
      fontStyle: 'bold',
    });
    arrow.setOrigin(0.5);

    const hit = this.scene.add.zone(options.x + options.width / 2, options.y + options.height / 2, options.width, options.height);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', options.onClick);
    this.container.add(options.desc ? [bg, title, desc, arrow, hit] : [bg, title, arrow, hit]);
  }

  private _drawJourneyLevels(): void {
    const title = this.scene.add.text(375, 96, '八十一难', {
      fontSize: '46px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const subTitle = this.scene.add.text(375, 150, '每 9 难切换一套棋盘', {
      fontSize: '22px',
      color: '#d8edd9',
      fontStyle: 'bold',
    });
    subTitle.setOrigin(0.5);
    this.container.add([title, subTitle]);
    this._drawBackButton();
    this._drawLevelNodes();
  }

  private _drawBackButton(): void {
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x31496c, 0.96);
    bg.fillRoundedRect(54, 74, 112, 48, 8);
    bg.lineStyle(1.5, 0xb8d8ff, 0.55);
    bg.strokeRoundedRect(54, 74, 112, 48, 8);
    const text = this.scene.add.text(110, 98, '返回', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);
    const hit = this.scene.add.zone(110, 98, 112, 48);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      this._mode = 'home';
      this._draw();
    });
    this.container.add([bg, text, hit]);
  }

  private _drawArtifactUpgrade(): void {
    const artifactData = ArtifactData.getInstance();
    artifactData.loadFromSave();
    const save = SaveManager.getInstance().load() ?? SaveManager.getInstance().createDefault();
    const clearedChapter = this._getClearedChapter();
    const slotLimit = getArtifactCarrySlotCount(clearedChapter);

    const title = this.scene.add.text(375, 96, '法宝升级', {
      fontSize: '46px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    const subTitle = this.scene.add.text(375, 150, `灵蕴 ${save.spiritEssence} ✦    携带槽 ${slotLimit}`, {
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

      const name = this.scene.add.text(x + 16, y + 18, `${config.name}  Lv${level}`, {
        fontSize: '20px',
        color: unlocked ? '#ffd36a' : '#b8bec9',
        fontStyle: 'bold',
      });
      const desc = this.scene.add.text(x + 16, y + 48, unlocked ? config.levelDescriptions[level] : `通关 Ch${config.unlockChapter} 解锁`, {
        fontSize: '14px',
        color: '#f7f1d0',
        wordWrap: { width: 178, useAdvancedWrap: true },
      });

      const buttonText = !unlocked ? '未解锁' : cost === null ? '满级' : `${cost} ✦`;
      const button = this.scene.add.text(x + 235, y + 46, buttonText, {
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
  }

  private _drawLeaderboard(): void {
    const record = LeaderboardService.getInstance().getPersonalRecord();
    const rank = getDefenseRankByWave(record.bestWave);
    const title = this.scene.add.text(375, 96, '排行榜', {
      fontSize: '46px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    const subTitle = this.scene.add.text(375, 150, 'Defense 竞技记录', {
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
    const text = this.scene.add.text(132, 354, lines, {
      fontSize: '24px',
      color: '#f7f1d0',
      lineSpacing: 16,
    });
    this.container.add(text);
  }

  private _getClearedChapter(): number {
    const currentLevel = LevelData.getInstance().currentLevel;
    return Math.max(0, Math.min(9, Math.floor((currentLevel - 1) / 9)));
  }

  private _formatRecordTime(timestamp: number): string {
    if (timestamp <= 0) return '暂无';
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  private _drawLevelNodes(): void {
    const levelData = LevelData.getInstance();
    const positions = this._getNodePositions();
    const route = this.scene.add.graphics();
    route.lineStyle(6, 0x0d1d22, 0.55);
    this._drawRouteLine(route, positions);
    route.lineStyle(2, 0xd9b45d, 0.62);
    this._drawRouteLine(route, positions);
    this.container.add(route);

    JOURNEY_LEVELS.forEach((level, index) => {
      const pos = positions[index];
      if (!pos) return;

      const { x, y } = pos;
      const unlocked = levelData.isUnlocked(level.levelId);
      const stars = levelData.getStars(level.levelId);
      const radius = 20;

      const node = this.scene.add.graphics();
      node.fillStyle(unlocked ? 0xf0c15a : 0x49505f, 1);
      node.fillCircle(x, y, radius);
      node.lineStyle(3, unlocked ? 0xfff0a6 : 0x7a8394, 0.95);
      node.strokeCircle(x, y, radius);

      const idText = this.scene.add.text(x, y, `${level.levelId}`, {
        fontSize: level.levelId >= 10 ? '13px' : '15px',
        color: unlocked ? '#101826' : '#d5d8dd',
        fontStyle: 'bold',
      });
      idText.setOrigin(0.5);

      const starText = this.scene.add.text(x, y + 21, stars > 0 ? '*'.repeat(stars) : '', {
        fontSize: '10px',
        color: '#fff3a0',
      });
      starText.setOrigin(0.5);

      const hit = this.scene.add.zone(x, y, 46, 46);
      if (unlocked) {
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => this.onSelectLevel(level));
      }

      this.container.add([node, idText, starText, hit]);
      if (levelData.canSweep(level.levelId)) {
        this._drawSweepButton(level, x, y + 36);
      }
    });
  }

  private _getNodePositions(): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];
    const startX = 86;
    const startY = 306;
    const gapX = 72;
    const gapY = 76;
    for (let row = 0; row < 9; row++) {
      const cols = Array.from({ length: 9 }, (_, col) => col);
      if (row % 2 === 1) cols.reverse();
      for (const col of cols) {
        positions.push({ x: startX + col * gapX, y: startY + row * gapY });
      }
    }
    return positions;
  }

  private _drawRouteLine(route: Phaser.GameObjects.Graphics, positions: Array<{ x: number; y: number }>): void {
    if (positions.length === 0) return;
    route.beginPath();
    route.moveTo(positions[0].x, positions[0].y);
    for (let i = 1; i < positions.length; i++) {
      route.lineTo(positions[i].x, positions[i].y);
    }
    route.strokePath();
  }

  private _drawSweepButton(level: LevelConfig, x: number, y: number): void {
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x31496c, 0.95);
    bg.fillRoundedRect(x - 28, y - 12, 56, 24, 6);
    const text = this.scene.add.text(x, y, '扫荡', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);
    text.setInteractive({ useHandCursor: true });
    text.on('pointerdown', () => this._sweep(level));
    this.container.add([bg, text]);
  }

  private _sweep(level: LevelConfig): void {
    const heroId = CHAPTER_SWEEP_REWARD[level.chapter] ?? 'sunwukong';
    HeroData.getInstance().addShards(heroId, 2);
    this._showTip(`${level.name} 扫荡完成，获得 ${HERO_NAME_BY_ID[heroId] ?? heroId} 碎片 x2`);
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
