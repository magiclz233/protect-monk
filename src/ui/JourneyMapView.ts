import Phaser from 'phaser';
import { ARTIFACT_CONFIGS, ArtifactConfigItem, getArtifactCarrySlotCount, getArtifactUpgradeCost } from '../config/ArtifactConfig';
import { DEFENSE_RANKS, getDefenseRankByWave } from '../config/DefenseRankConfig';
import { gameMgr } from '../core/GameManager';
import { getHeroConfig } from '../config/HeroConfig';
import { ArtifactData } from '../data/ArtifactData';
import { HeroData } from '../data/HeroData';
import { LevelData } from '../data/LevelData';
import { SaveManager } from '../data/SaveManager';
import { createCjkText } from '../core/TextStyles';
import { artifactKey, heroShardKey, uiIconKey } from '../render/AssetKeys';
import { AdSystem } from '../systems/AdSystem';
import { LeaderboardService } from '../systems/LeaderboardService';
import { ArtifactId, LevelConfig } from '../types';
import { ChapterSelectView } from './ChapterSelectView';
import { LevelGridView } from './LevelGridView';
import { playPageEnter } from './JourneyUiPrimitives';
import {
  UI_TOKENS, UI_TYPE,
  drawLacquerPanel, drawPaperPanel,
  createUiButton, createHudChip, createRoundIconButton,
  createVerticalGradientImage, createTitleText,
} from './DesignTokens';
import {
  FEEDBACK_TEXT, FeedbackOverlay, createEmptyState,
} from './FeedbackOverlay';

type HomeViewMode = 'home' | 'chapters' | 'levels' | 'artifacts' | 'leaderboard';
type TransitionDirection = 'forward' | 'back';
type LeaderboardTab = 'local' | 'friends' | 'global';
type CodexGroup = 'equipped' | 'unlocked' | 'locked';

const BOTTOM_NAV_TABS: Array<{ mode: HomeViewMode; label: string; icon: string }> = [
  { mode: 'home', label: '首页', icon: '血量' },
  { mode: 'chapters', label: '取经', icon: '扫荡' },
  { mode: 'artifacts', label: '法宝', icon: artifactKey('bajiaoshan') },
  { mode: 'leaderboard', label: '排行', icon: '星级' },
];

export class JourneyMapView {
  readonly container: Phaser.GameObjects.Container;
  private readonly _tipText: Phaser.GameObjects.Text;
  private _mode: HomeViewMode = 'home';
  private _selectedChapterId = 1;
  private _transitionDirection: TransitionDirection = 'forward';
  private _chapterView?: ChapterSelectView;
  private _levelGridView?: LevelGridView;
  private _artifactPage = 0;
  private _selectedArtifactId: ArtifactId = ArtifactId.AXE;
  private _codexGroup: CodexGroup = 'equipped';
  private _leaderboardTab: LeaderboardTab = 'local';
  private _activeOverlay?: FeedbackOverlay;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onStartDefense: () => void,
    private readonly onSelectLevel: (level: LevelConfig) => void,
    private readonly onOpenRoster: () => void = () => undefined,
  ) {
    LevelData.getInstance().loadFromSave();
    HeroData.getInstance().loadFromSave();
    HeroData.getInstance().ensureDefaults();
    ArtifactData.getInstance().loadFromSave();
    ArtifactData.getInstance().ensureDefaults();

    this.container = scene.add.container(0, 0);
    this.container.setDepth(220);
    this._tipText = createCjkText(scene, 375, 1200, '', {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
    this._tipText.setOrigin(0.5);
    this._tipText.setDepth(241);
    this._tipText.setBackgroundColor('rgba(16,45,39,0.92)');
    this._tipText.setPadding(14, 8, 14, 8);
    this._tipText.setVisible(false);
    this._draw();
    void AdSystem.getInstance().showBanner('home');
  }

  destroy(): void {
    AdSystem.getInstance().hideBanner('home');
    this._activeOverlay?.close(true);
    this._activeOverlay = undefined;
    this._destroySubViews();
    this._tipText.destroy();
    this.container.destroy(true);
  }

  private _draw(): void {
    // 切页前先收掉浮层，避免遗留已销毁对象导致弹窗无法再次打开
    this._closeWishPanel();
    this._activeOverlay?.close(true);
    this._activeOverlay = undefined;
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
      this._drawBottomNav();
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

  // ==================== 背景 ====================

  private _drawBackground(): void {
    if (this._mode === 'home') {
      this._drawHomeBackdrop();
    } else {
      this._drawPageBackdrop();
    }
  }

  /** 首页：取经小队主视觉铺满（对齐设计稿 object-position 50% 42%）+ 真·线性渐变压暗 */
  private _drawHomeBackdrop(): void {
    const bg = this.scene.add.image(375, 667, '首页主视觉_取经小队');
    const scale = Math.max(750 / bg.width, 1334 / bg.height);
    bg.setScale(scale);
    const scaledH = bg.height * scale;
    // object-position 50% 42%：容器 42% 高度处对齐图片 42% 高度处
    const targetY = 1334 * 0.42 - scaledH * 0.42 + scaledH / 2;
    bg.setPosition(375, targetY);
    this.container.add(bg);

    // 上下渐变 wash（设计稿 home-wash：0.48 → .10 → 0 → .22 → .72）
    const wash = createVerticalGradientImage(this.scene, 'home-wash-gradient', 750, 1334, [
      { offset: 0, color: 0x0d2c24, alpha: 0.5 },
      { offset: 0.23, color: 0x0d2c24, alpha: 0.1 },
      { offset: 0.46, color: 0x0d2c24, alpha: 0 },
      { offset: 0.74, color: 0x0d2c24, alpha: 0.22 },
      { offset: 1, color: 0x0d2c24, alpha: 0.75 },
    ]);
    this.container.add(wash);
  }

  /** 其余页面：宣纸暖底 + 松绿框架 */
  private _drawPageBackdrop(): void {
    const bg = this.scene.add.graphics();
    bg.fillStyle(UI_TOKENS.pine950, 1);
    bg.fillRect(0, 0, 750, 1334);
    bg.fillStyle(UI_TOKENS.pine900, 0.55);
    bg.fillRoundedRect(28, 30, 694, 1150, 22);
    bg.lineStyle(2, UI_TOKENS.gold, 0.4);
    bg.strokeRoundedRect(28, 30, 694, 1150, 22);
    this.container.add(bg);
  }

  // ==================== 首页 ====================

  private _drawHome(): void {
    const save = SaveManager.getInstance().load() ?? SaveManager.getInstance().createDefault();
    const levelData = LevelData.getInstance();
    const clearedChapter = levelData.getClearedChapterCount();
    const currentChapter = Phaser.Math.Clamp(Math.ceil(levelData.currentLevel / 9), 1, 9);
    const chapterCleared = levelData.getChapterClearedCount(currentChapter);
    const loadoutCount = ArtifactData.getInstance().getLoadout().length;
    const slotLimit = getArtifactCarrySlotCount(clearedChapter);

    // ---- 顶部：资源胶囊 + 每日奖励 ----
    this.container.add(createHudChip(this.scene, {
      x: 24, y: 40, iconKey: uiIconKey('spirit'), text: `${save.spiritEssence}`,
    }));
    this.container.add(createRoundIconButton(this.scene, 688, 70, uiIconKey('ad_reward'), 58, () => this._showWishPanel()));

    // ---- 标题组：朱砂印章 + 游戏名（设计稿 home-logo） ----
    const seal = createCjkText(this.scene, 375, 132, '西 游 合 成 塔 防', {
      fontSize: UI_TYPE.small,
      color: '#fff5da',
      fontStyle: 'bold',
      backgroundColor: '#c84a36',
      padding: { x: 18, y: 8 },
    });
    seal.setOrigin(0.5);
    seal.setAngle(-2);
    seal.setStroke('#8e2f25', 2);
    seal.setShadow(2, 4, 'rgba(23,63,53,0.55)', 0, true, true);

    const title = createCjkText(this.scene, 375, 226, '守护唐僧', {
      fontSize: UI_TYPE.display,
      color: '#fff5da',
      fontStyle: 'bold',
      fontFamily: 'SimSun, Microsoft YaHei, serif',
    });
    title.setOrigin(0.5);
    title.setShadow(3, 4, '#4c3325', 0, true, true);
    title.setStroke('#4c3325', 8);

    const sub = createCjkText(this.scene, 375, 292, '合成布阵 · 守住取经路', {
      fontSize: UI_TYPE.label,
      color: '#ffedbe',
      fontStyle: 'bold',
    });
    sub.setOrigin(0.5);
    sub.setStroke('#2b4a3c', 4);
    sub.setShadow(0, 2, 'rgba(26,40,30,0.85)', 2, true, true);

    this.container.add([seal, title, sub]);

    // ---- 主按钮：开始守护（同屏唯一朱砂主按钮） ----
    this.container.add(createUiButton(this.scene, {
      x: 32, y: 856, width: 686, height: 104,
      label: '开始守护',
      meta: gameMgr.selectedHeroes.length > 0
        ? `上次阵容 ${gameMgr.selectedHeroes.length} 名英雄 · 预计 3—8 分钟`
        : '首次出阵 · 先选择英雄与法宝',
      primary: true,
      fontSize: UI_TYPE.body,
      onClick: this.onStartDefense,
    }));

    // ---- 模式卡 ×2 ----
    // 设计稿要求模式卡直接给出可感知的进度与携带数，而不是泛化说明
    this._drawHomeModeCard(32, 988, 334, 128, '壹', '八十一难', `第 ${currentChapter} 章 · ${chapterCleared}/9 关`, () => {
      this._transitionDirection = 'forward';
      this._mode = 'chapters';
      this._draw();
    });
    this._drawHomeModeCard(384, 988, 334, 128, '贰', '调整阵容', `英雄 ${gameMgr.selectedHeroes.length}/4 · 法宝 ${loadoutCount}/${slotLimit}`, () => {
      this.onOpenRoster();
    });

    // ---- 祈愿行 ----
    this._drawWishLine(32, 1144, 686);

    // ---- 底部导航 ----
    this._drawBottomNav();
  }

  /** 首页模式卡：漆面深绿 + 金边 + 金色序号 */
  private _drawHomeModeCard(
    x: number, y: number, w: number, h: number,
    indexChar: string, title: string, desc: string, onClick: () => void,
  ): void {
    const g = this.scene.add.graphics();
    drawLacquerPanel(g, x, y, w, h, { radius: 18, strokeAlpha: 0.55, fillAlpha: 0.86 });
    this.container.add(g);

    const index = createCjkText(this.scene, x + w - 24, y + 30, indexChar, {
      fontSize: UI_TYPE.heading,
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
    index.setOrigin(0.5);
    index.setAlpha(0.6);

    const titleText = createCjkText(this.scene, x + 26, y + 40, title, {
      fontSize: UI_TYPE.bodyL,
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
    });
    titleText.setOrigin(0, 0.5);

    const descText = createCjkText(this.scene, x + 26, y + 88, desc, {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textMutedOnDark,
    });
    descText.setOrigin(0, 0.5);

    const hit = this.scene.add.zone(x + w / 2, y + h / 2, w, h);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: [g, titleText, descText],
        alpha: 0.75,
        duration: 80,
        yoyo: true,
        onComplete: onClick,
      });
    });
    this.container.add([index, titleText, descText, hit]);
  }

  /** 祈愿入口行（设计稿 wish-line） */
  private _drawWishLine(x: number, y: number, w: number): void {
    const free = this._isWishAvailable();
    const g = this.scene.add.graphics();
    g.fillStyle(UI_TOKENS.pine950, 0.8);
    g.fillRoundedRect(x, y, w, 54, 14);
    g.lineStyle(2, UI_TOKENS.gold, 0.45);
    g.strokeRoundedRect(x, y, w, 54, 14);
    this.container.add(g);

    const label = createCjkText(this.scene, x + 24, y + 27, '每日祈愿', {
      fontSize: UI_TYPE.label,
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
    });
    label.setOrigin(0, 0.5);

    const status = createCjkText(this.scene, x + 190, y + 27, free ? '今日可免费 1 次' : '今日已祈愿', {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textGoldOnDark,
    });
    status.setOrigin(0, 0.5);

    const go = createCjkText(this.scene, x + w - 24, y + 27, '前往 ›', {
      fontSize: UI_TYPE.label,
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
    go.setOrigin(1, 0.5);

    const hit = this.scene.add.zone(x + w / 2, y + 27, w, 54);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this._showWishPanel());
    this.container.add([label, status, go, hit]);
  }

  /** 底部导航：宣纸底 + 4 tab（首页/取经/法宝/排行） */
  private _drawBottomNav(): void {
    const navTop = 1224;
    const g = this.scene.add.graphics();
    g.fillStyle(UI_TOKENS.paperLight, 1);
    g.fillRect(0, navTop, 750, 1334 - navTop);
    g.lineStyle(3, UI_TOKENS.gold, 1);
    g.beginPath();
    g.moveTo(0, navTop + 1.5);
    g.lineTo(750, navTop + 1.5);
    g.strokePath();
    this.container.add(g);

    const colW = 750 / BOTTOM_NAV_TABS.length;
    BOTTOM_NAV_TABS.forEach((tab, i) => {
      const cx = colW * i + colW / 2;
      const selected = this._mode === tab.mode || (this._mode === 'levels' && tab.mode === 'chapters');
      const icon = this.scene.add.image(cx, navTop + 42, tab.icon);
      icon.setDisplaySize(48, 48);
      const label = createCjkText(this.scene, cx, navTop + 84, tab.label, {
        fontSize: UI_TYPE.small,
        color: selected ? '#8e2f25' : '#776a56',
        fontStyle: selected ? 'bold' : 'normal',
      });
      label.setOrigin(0.5);

      const hit = this.scene.add.zone(cx, navTop + 55, colW, 110);
      hit.setOrigin(0.5);
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        if (this._mode === tab.mode) return;
        this._transitionDirection = tab.mode === 'home' ? 'back' : 'forward';
        this._mode = tab.mode;
        this._draw();
      });
      this.container.add([icon, label, hit]);
    });
  }

  // ==================== 每日祈愿 ====================

  private _wishElements: Phaser.GameObjects.GameObject[] = [];
  private _wishStatusText: Phaser.GameObjects.Text | null = null;
  private _wishResultText: Phaser.GameObjects.Text | null = null;
  private _wishFreeBtn?: Phaser.GameObjects.Container;
  private _wishAdBtn?: Phaser.GameObjects.Container;
  private _wishAdUsed = false;
  private _wishAnimating = false;
  private _wishTimer?: Phaser.Time.TimerEvent;
  private _wishDeliver?: () => void;

  private _wishTodayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  private _isWishAvailable(): boolean {
    const save = SaveManager.getInstance().load() ?? SaveManager.getInstance().createDefault();
    return save.lastWishDate !== this._wishTodayKey();
  }

  /** 供桌／签筒式轻弹窗：奖励预览、次数清晰、免费与广告分离、抽取可跳过 */
  private _showWishPanel(): void {
    if (this._wishElements.length > 0) return;
    const scene = this.scene;
    const el: Phaser.GameObjects.GameObject[] = [];

    const overlay = scene.add.graphics();
    overlay.fillStyle(0x0a1e19, 0.82);
    overlay.fillRect(0, 0, 750, 1334);
    el.push(overlay);

    const overlayHit = scene.add.zone(375, 667, 750, 1334);
    overlayHit.setOrigin(0.5);
    overlayHit.setInteractive();
    overlayHit.on('pointerdown', () => {
      if (this._wishAnimating) this._skipWishAnimation();
      else this._closeWishPanel();
    });
    el.push(overlayHit);

    const panel = scene.add.graphics();
    drawPaperPanel(panel, 96, 296, 558, 664, { radius: 22 });
    el.push(panel);

    // 上下轴头：与结算卷轴、章节路引保持同一套叙事容器
    const axis = scene.add.graphics();
    axis.fillStyle(0xd8bd86, 1);
    axis.fillRoundedRect(88, 284, 574, 18, 8);
    axis.fillRoundedRect(88, 952, 574, 18, 8);
    axis.lineStyle(2, 0x9f7c42, 1);
    axis.strokeRoundedRect(88, 284, 574, 18, 8);
    axis.strokeRoundedRect(88, 952, 574, 18, 8);
    el.push(axis);

    const title = createTitleText(scene, 375, 352, '每日祈愿', UI_TYPE.title, UI_TOKENS.textOnPaper);
    title.setOrigin(0.5);
    el.push(title);
    const sub = createCjkText(scene, 375, 404, '一签一愿 · 祈得英雄碎片，结果自动入包', {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textMutedOnPaper,
    });
    sub.setOrigin(0.5);
    el.push(sub);

    // 签筒：朱砂筒身 + 三支竹签
    const tube = scene.add.graphics();
    tube.fillStyle(UI_TOKENS.cinnabarDark, 1);
    tube.fillRoundedRect(132, 452, 128, 148, 16);
    tube.fillStyle(UI_TOKENS.cinnabar, 1);
    tube.fillRoundedRect(140, 458, 112, 136, 12);
    tube.lineStyle(3, UI_TOKENS.gold, 0.9);
    tube.strokeRoundedRect(140, 458, 112, 136, 12);
    tube.lineStyle(7, UI_TOKENS.paperLight, 1);
    tube.lineBetween(174, 466, 166, 404);
    tube.lineBetween(196, 466, 200, 396);
    tube.lineBetween(218, 466, 230, 408);
    el.push(tube);

    // 奖励预览：图标 + 名称 + 数量，抽取前即可看到
    const reward = scene.add.graphics();
    drawLacquerPanel(reward, 296, 452, 322, 148, { radius: 16, fillAlpha: 0.9 });
    el.push(reward);
    const shardKey = heroShardKey('sunwukong');
    const shardIcon = scene.add.image(352, 526, scene.textures.exists(shardKey) ? shardKey : uiIconKey('star'));
    shardIcon.setDisplaySize(76, 76);
    el.push(shardIcon);
    const rewardName = createCjkText(scene, 404, 498, '英雄碎片', {
      fontSize: UI_TYPE.bodyS,
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
    });
    rewardName.setOrigin(0, 0.5);
    el.push(rewardName);
    const rewardAmount = createCjkText(scene, 404, 540, '随机 1 枚 · 直接入包', {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textMutedOnDark,
    });
    rewardAmount.setOrigin(0, 0.5);
    el.push(rewardAmount);
    const rewardTag = createCjkText(scene, 604, 472, '奖励预览', {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
    rewardTag.setOrigin(1, 0.5);
    el.push(rewardTag);

    this._wishStatusText = createCjkText(scene, 375, 632, '', {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textCinnabarOnPaper,
      fontStyle: 'bold',
    });
    this._wishStatusText.setOrigin(0.5);
    el.push(this._wishStatusText);

    this._wishResultText = createCjkText(scene, 375, 878, '', {
      fontSize: UI_TYPE.bodyS,
      color: UI_TOKENS.textCinnabarOnPaper,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 470, useAdvancedWrap: true },
    });
    this._wishResultText.setOrigin(0.5);
    el.push(this._wishResultText);

    const skipText = createCjkText(scene, 375, 924, '轻点空白处可跳过动画 / 关闭', {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textMutedOnPaper,
    });
    skipText.setOrigin(0.5);
    el.push(skipText);

    const closeText = createCjkText(scene, 618, 330, '×', {
      fontSize: UI_TYPE.heading,
      color: UI_TOKENS.textMutedOnPaper,
      fontStyle: 'bold',
    });
    closeText.setOrigin(0.5);
    closeText.setInteractive({ useHandCursor: true });
    closeText.on('pointerdown', () => this._closeWishPanel());
    el.push(closeText);

    this._wishElements = el;
    this.container.add(el);
    this._refreshWishStatus();
    this._drawWishButtons();
  }

  /** 免费用唯一朱砂主按钮，广告用宣纸次按钮，避免同屏两个主操作 */
  private _drawWishButtons(): void {
    const freeAvailable = this._isWishAvailable();
    const adAvailable = !this._wishAdUsed && AdSystem.getInstance().hasRewardedVideo('dailyWish');
    this._wishFreeBtn?.destroy();
    this._wishAdBtn?.destroy();

    const free = createUiButton(this.scene, {
      x: 176, y: 676, width: 398, height: 88,
      label: freeAvailable ? '免费祈愿' : '今日已祈愿',
      primary: true,
      enabled: freeAvailable,
      onClick: () => this._doFreeWish(),
    });
    const ad = createUiButton(this.scene, {
      x: 176, y: 782, width: 398, height: 88,
      label: adAvailable ? '看广告再祈愿' : '广告祈愿暂不可用',
      secondary: true,
      enabled: adAvailable,
      onClick: () => void this._doAdWish(),
    });
    this._wishFreeBtn = free;
    this._wishAdBtn = ad;
    this.container.add([free, ad]);
  }

  private _refreshWishStatus(): void {
    if (!this._wishStatusText) return;
    const freeLeft = this._isWishAvailable() ? 1 : 0;
    const adLeft = this._wishAdUsed ? 0 : 1;
    this._wishStatusText.setText(`今日免费 ${freeLeft}/1 次 · 广告 ${adLeft}/1 次`);
  }

  private _showWishResult(text: string): void {
    if (this._wishResultText) this._wishResultText.setText(text);
  }

  private _doFreeWish(): void {
    if (!this._isWishAvailable() || this._wishAnimating) return;
    this._wishAnimating = true;
    this._showWishResult('签筒轻摇…');
    this._wishDeliver = () => {
      if (!this._wishAnimating) return;
      this._wishAnimating = false;
      this._wishDeliver = undefined;
      const heroId = HeroData.getInstance().addRandomShard();
      const name = getHeroConfig(heroId)?.name ?? heroId;
      const save = SaveManager.getInstance().load() ?? SaveManager.getInstance().createDefault();
      save.lastWishDate = this._wishTodayKey();
      SaveManager.getInstance().save(save);
      this._showWishResult(`祈得 ${name} 碎片 ×1 · 已入包`);
      this._drawWishButtons();
      this._refreshWishStatus();
    };
    this._wishTimer = this.scene.time.delayedCall(420, this._wishDeliver);
  }

  /** 抽取动画可跳过，跳过仍会正常发放奖励 */
  private _skipWishAnimation(): void {
    if (!this._wishAnimating || !this._wishDeliver) return;
    this._wishTimer?.remove();
    this._wishTimer = undefined;
    this._wishDeliver();
  }

  private async _doAdWish(): Promise<void> {
    if (this._wishAdUsed || this._wishAnimating) return;
    const ok = await AdSystem.getInstance().showRewardedVideo('dailyWish');
    if (!ok) {
      this._showWishResult(FEEDBACK_TEXT.adUnavailable);
      return;
    }
    this._wishAdUsed = true;
    const heroId = HeroData.getInstance().addRandomShard();
    const name = getHeroConfig(heroId)?.name ?? heroId;
    this._showWishResult(`广告祈愿：${name} 碎片 ×1 · 已入包`);
    this._drawWishButtons();
    this._refreshWishStatus();
  }

  private _closeWishPanel(): void {
    this._wishTimer?.remove();
    this._wishTimer = undefined;
    this._wishDeliver = undefined;
    this._wishAnimating = false;
    this._wishFreeBtn?.destroy();
    this._wishAdBtn?.destroy();
    for (const obj of this._wishElements) obj.destroy();
    this._wishElements = [];
    this._wishStatusText = null;
    this._wishResultText = null;
    this._wishFreeBtn = undefined;
    this._wishAdBtn = undefined;
  }

  // ==================== 法宝图鉴 ====================

  /** 设计稿要求按「已装备 / 已解锁 / 未解锁」分组，而不是只按解锁二分 */
  private _drawCodexTabs(counts: Record<CodexGroup, number>): void {
    const groups: Array<{ id: CodexGroup; label: string }> = [
      { id: 'equipped', label: `已装备 ${counts.equipped}` },
      { id: 'unlocked', label: `已解锁 ${counts.unlocked}` },
      { id: 'locked', label: `未解锁 ${counts.locked}` },
    ];
    groups.forEach((group, index) => {
      this.container.add(createUiButton(this.scene, {
        x: 54 + index * 218, y: 186, width: 200, height: 60,
        label: group.label,
        // 激活态用深漆金边，未激活用宣纸；不使用朱砂以免与升级主按钮争抢
        secondary: this._codexGroup !== group.id,
        fontSize: UI_TYPE.small,
        onClick: () => {
          this._codexGroup = group.id;
          this._artifactPage = 0;
          this._draw();
        },
      }));
    });
  }

  private _drawArtifactUpgrade(): void {
    const artifactData = ArtifactData.getInstance();
    artifactData.loadFromSave();
    const save = SaveManager.getInstance().load() ?? SaveManager.getInstance().createDefault();
    const slotLimit = getArtifactCarrySlotCount(this._getClearedChapter());
    const loadout = artifactData.getLoadout();
    const equipped = ARTIFACT_CONFIGS.filter(config => loadout.includes(config.artifactId));
    const unlocked = ARTIFACT_CONFIGS.filter(config => artifactData.isUnlocked(config.artifactId) && !loadout.includes(config.artifactId));
    const locked = ARTIFACT_CONFIGS.filter(config => !artifactData.isUnlocked(config.artifactId));
    const groupConfigs = this._codexGroup === 'equipped' ? equipped : this._codexGroup === 'unlocked' ? unlocked : locked;
    const pageCount = Math.max(1, Math.ceil(groupConfigs.length / 6));
    this._artifactPage = Phaser.Math.Clamp(this._artifactPage, 0, pageCount - 1);

    if (!artifactData.isUnlocked(this._selectedArtifactId)) {
      this._selectedArtifactId = artifactData.getUnlockedArtifacts()[0] ?? ARTIFACT_CONFIGS[0].artifactId;
    }

    const title = createTitleText(this.scene, 375, 100, '法宝图鉴', UI_TYPE.title, UI_TOKENS.textOnDark);
    title.setOrigin(0.5);
    const subTitle = createCjkText(this.scene, 375, 158, `灵蕴 ${save.spiritEssence} ✦    携带槽 ${slotLimit}    点卡片查看与升级`, {
      fontSize: UI_TYPE.label,
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
    subTitle.setOrigin(0.5);
    this.container.add([title, subTitle]);
    this._drawCodexTabs({ equipped: equipped.length, unlocked: unlocked.length, locked: locked.length });

    if (groupConfigs.length === 0) {
      this.container.add(createEmptyState(this.scene, {
        x: 54, y: 256, width: 642, height: 580,
        title: '此卷暂空',
        message: FEEDBACK_TEXT.emptyCodex,
        actionLabel: '查看已解锁',
        onAction: () => {
          this._codexGroup = 'unlocked';
          this._artifactPage = 0;
          this._draw();
        },
      }));
      return;
    }

    const start = this._artifactPage * 6;
    groupConfigs.slice(start, start + 6).forEach((config, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      this._drawArtifactCard(
        config,
        54 + col * 322,
        256 + row * 204,
        300,
        190,
        artifactData,
        save.spiritEssence,
      );
    });

    this._drawArtifactDetailPanel(save.spiritEssence, pageCount);
  }

  private _drawArtifactCard(
    config: ArtifactConfigItem,
    x: number,
    y: number,
    w: number,
    h: number,
    artifactData: ArtifactData,
    spiritEssence: number,
  ): void {
    const unlocked = artifactData.isUnlocked(config.artifactId);
    const level = artifactData.getLevel(config.artifactId);
    const cost = getArtifactUpgradeCost(level);
    const selected = this._selectedArtifactId === config.artifactId;

    const g = this.scene.add.graphics();
    drawPaperPanel(g, x, y, w, h, {
      radius: 16,
      fill: unlocked ? UI_TOKENS.paperLight : 0xd8cfba,
      fillAlpha: unlocked ? 1 : 0.72,
      stroke: selected ? UI_TOKENS.jade : 0xb99a62,
      strokeAlpha: selected ? 1 : 0.82,
      innerRing: false,
    });
    if (!unlocked) {
      g.fillStyle(0x1b2c27, 0.24);
      g.fillRoundedRect(x, y, w, h, 16);
    }

    const iconBg = this.scene.add.graphics();
    iconBg.fillStyle(unlocked ? UI_TOKENS.pine800 : 0x5c675f, 0.18);
    iconBg.fillRoundedRect(x + 20, y + 28, 78, 78, 16);
    iconBg.lineStyle(2, unlocked ? UI_TOKENS.gold : 0x8c9188, 0.62);
    iconBg.strokeRoundedRect(x + 20, y + 28, 78, 78, 16);
    const icon = this.scene.add.image(x + 59, y + 67, artifactKey(config.artifactId));
    const fit = 58 / Math.max(icon.width, icon.height);
    icon.setDisplaySize(icon.width * fit, icon.height * fit);
    icon.setAlpha(unlocked ? 1 : 0.42);

    // 名称／等级／效果依次下移，避开右上角状态角标，避免文字被压住
    const name = createCjkText(this.scene, x + 116, y + 72, config.name, {
      fontSize: UI_TYPE.bodyS,
      color: UI_TOKENS.textOnPaper,
      fontStyle: 'bold',
      wordWrap: { width: w - 132, useAdvancedWrap: true },
    });
    name.setOrigin(0, 0.5);
    const lv = createCjkText(this.scene, x + 116, y + 106, unlocked ? `Lv${level}` : `通关第 ${config.unlockChapter} 章解锁`, {
      fontSize: UI_TYPE.small,
      color: unlocked ? UI_TOKENS.textCinnabarOnPaper : UI_TOKENS.textMutedOnPaper,
      fontStyle: 'bold',
    });
    lv.setOrigin(0, 0.5);
    const effect = createCjkText(this.scene, x + 22, y + 152, unlocked ? config.levelDescriptions[level] : '通关本章 Boss 后获得', {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textMutedOnPaper,
      wordWrap: { width: w - 44, useAdvancedWrap: true },
    });
    effect.setOrigin(0, 0.5);

    const badgeText = !unlocked ? '未解锁' : cost === null ? '满级' : `${cost} 灵蕴`;
    const badgeW = 124;
    const badge = this.scene.add.graphics();
    badge.fillStyle(!unlocked ? 0x8a8375 : cost !== null && spiritEssence >= cost ? UI_TOKENS.pine800 : 0x6f746c, 0.92);
    badge.fillRoundedRect(x + w - badgeW - 14, y + 14, badgeW, 38, 12);
    const badgeLabel = createCjkText(this.scene, x + w - badgeW / 2 - 14, y + 33, badgeText, {
      fontSize: UI_TYPE.small,
      color: '#fff5da',
      fontStyle: 'bold',
    });
    badgeLabel.setOrigin(0.5);

    const hit = this.scene.add.zone(x + w / 2, y + h / 2, w, h);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      this._selectedArtifactId = config.artifactId;
      this._artifactPage = Math.floor(ARTIFACT_CONFIGS.findIndex(item => item.artifactId === config.artifactId) / 6);
      this._draw();
    });

    this.container.add([g, iconBg, icon, name, lv, effect, badge, badgeLabel, hit]);
  }

  private _drawArtifactDetailPanel(spiritEssence: number, pageCount: number): void {
    const artifactData = ArtifactData.getInstance();
    const config = ARTIFACT_CONFIGS.find(item => item.artifactId === this._selectedArtifactId) ?? ARTIFACT_CONFIGS[0];
    const unlocked = artifactData.isUnlocked(config.artifactId);
    const level = artifactData.getLevel(config.artifactId);
    const cost = getArtifactUpgradeCost(level);
    const canUpgrade = unlocked && cost !== null && spiritEssence >= cost;

    const panel = this.scene.add.graphics();
    drawLacquerPanel(panel, 54, 890, 642, 204, { radius: 18, fillAlpha: 0.9 });
    this.container.add(panel);

    const title = createCjkText(this.scene, 82, 926, `${config.name}  Lv${level}`, {
      fontSize: UI_TYPE.body,
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
    title.setOrigin(0, 0.5);
    const current = createCjkText(this.scene, 82, 970, `当前：${config.levelDescriptions[level]}`, {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textOnDark,
      wordWrap: { width: 410, useAdvancedWrap: true },
    });
    current.setOrigin(0, 0.5);
    const next = createCjkText(
      this.scene,
      82,
      1032,
      cost === null
        ? '已满级：继续携带出征即可发挥全部效果'
        : `下一级：${config.levelDescriptions[(level + 1) as 2 | 3]}（${cost} 灵蕴）`,
      {
        fontSize: UI_TYPE.small,
        color: cost !== null && spiritEssence >= cost ? '#b8f4de' : UI_TOKENS.textMutedOnDark,
        wordWrap: { width: 410, useAdvancedWrap: true },
      },
    );
    next.setOrigin(0, 0.5);
    this.container.add([title, current, next]);

    this.container.add(createUiButton(this.scene, {
      x: 514, y: 930, width: 154, height: 58,
      minHit: false, // 与下方翻页按钮纵向相邻，扩展热区会重叠误触
      label: !unlocked ? '未解锁' : cost === null ? '已满级' : canUpgrade ? `升级 ${cost}` : '灵蕴不足',
      primary: canUpgrade,
      secondary: !canUpgrade,
      enabled: canUpgrade,
      fontSize: UI_TYPE.small,
      onClick: () => {
        const success = artifactData.upgrade(config.artifactId);
        this._showTip(success ? `${config.name} 已升级` : '灵蕴不足');
        this._draw();
      },
    }));

    if (pageCount > 1) {
      const pageText = createCjkText(this.scene, 436, 1036, `${this._artifactPage + 1}/${pageCount}`, {
        fontSize: UI_TYPE.small,
        color: UI_TOKENS.textOnDark,
        fontStyle: 'bold',
      });
      pageText.setOrigin(0.5);
      this.container.add(createUiButton(this.scene, {
        x: 514, y: 1012, width: 64, height: 48, minHit: false,
        label: '‹', secondary: true, enabled: this._artifactPage > 0, fontSize: UI_TYPE.label,
        onClick: () => { this._artifactPage--; this._draw(); },
      }));
      this.container.add(createUiButton(this.scene, {
        x: 604, y: 1012, width: 64, height: 48, minHit: false,
        label: '›', secondary: true, enabled: this._artifactPage < pageCount - 1, fontSize: UI_TYPE.label,
        onClick: () => { this._artifactPage++; this._draw(); },
      }));
      this.container.add(pageText);
    }
  }

  // ==================== 排行榜页 ====================

  private _drawLeaderboardTabs(): void {
    // 未接入的页签直接在标签上标注，玩家不必点进去才发现；说明文字不再
    // 放在页签下方（那里只有 20px 空隙，会与按钮和下方面板重叠）。
    const tabs: Array<{ id: LeaderboardTab; label: string }> = [
      { id: 'local', label: '本机' },
      { id: 'friends', label: '好友 · 待开启' },
      { id: 'global', label: '全服 · 待开启' },
    ];
    tabs.forEach((tab, index) => {
      this.container.add(createUiButton(this.scene, {
        x: 62 + index * 214, y: 186, width: 198, height: 60,
        label: tab.label,
        secondary: this._leaderboardTab !== tab.id,
        fontSize: UI_TYPE.small,
        onClick: () => {
          this._leaderboardTab = tab.id;
          this._draw();
        },
      }));
    });
  }

  private _drawLeaderboard(): void {
    const record = LeaderboardService.getInstance().getPersonalRecord();
    const rank = getDefenseRankByWave(record.bestWave);
    const currentRankIndex = Math.max(0, DEFENSE_RANKS.findIndex(item => item.id === rank.id));
    const nextRank = DEFENSE_RANKS[currentRankIndex + 1] ?? null;
    const previousRank = DEFENSE_RANKS[currentRankIndex] ?? rank;
    const nextThreshold = nextRank?.minWave ?? Math.max(rank.minWave + 5, record.bestWave || 5);
    const span = Math.max(1, nextThreshold - previousRank.minWave);
    const progressRatio = nextRank
      ? Phaser.Math.Clamp((record.bestWave - previousRank.minWave) / span, 0, 1)
      : 1;

    const title = createTitleText(this.scene, 375, 100, '守护排行', UI_TYPE.title, UI_TOKENS.textOnDark);
    title.setOrigin(0.5);
    const subTitle = createCjkText(this.scene, 375, 158, '段位 · 最高波次 · 击杀 三项统一口径', {
      fontSize: UI_TYPE.label,
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
    subTitle.setOrigin(0.5);
    this.container.add([title, subTitle]);
    this._drawLeaderboardTabs();

    // 好友／全服榜：依赖云服务与账号体系，先给明确的空态与重试反馈，不伪装成已接入
    if (this._leaderboardTab !== 'local') {
      const isFriends = this._leaderboardTab === 'friends';
      this.container.add(createEmptyState(this.scene, {
        x: 62, y: 266, width: 626, height: 700,
        title: isFriends ? '好友榜待开启' : '全服榜待开启',
        message: `${FEEDBACK_TEXT.cloudPending}。\n${isFriends ? '好友' : '全服'}榜需要账号体系与云端榜单服务，接入后开放。`,
        actionLabel: '了解详情',
        onAction: () => {
          this._activeOverlay?.close(true);
          this._activeOverlay = new FeedbackOverlay(this.scene, {
            kind: 'info',
            title: '暂未接入云服务',
            message: `${FEEDBACK_TEXT.cloudPending}。\n清除浏览器数据或更换设备会导致进度丢失，建议先完成当前章节。`,
            onClose: () => { this._activeOverlay = undefined; },
          });
        },
      }));
      return;
    }

    // 当前段位卡
    const rankPanel = this.scene.add.graphics();
    drawPaperPanel(rankPanel, 62, 266, 626, 300, { radius: 22 });
    this.container.add(rankPanel);

    const frameColors = [0x8a8375, 0x9a6b43, 0xb0a58f, 0xd8a64a, 0xf2d484, 0xc84a36, 0xff8f3d, 0x9f6df2, 0xffcf5a, 0xff5a4a];
    const frameColor = frameColors[Math.min(currentRankIndex, frameColors.length - 1)];
    const medal = this.scene.add.graphics();
    medal.fillStyle(frameColor, 0.18);
    medal.fillCircle(176, 400, 76);
    medal.lineStyle(5, frameColor, 0.95);
    medal.strokeCircle(176, 400, 68);
    medal.lineStyle(2, UI_TOKENS.goldLight, 0.75);
    medal.strokeCircle(176, 400, 52);
    const rankText = createTitleText(this.scene, 176, 400, rank.name, '42px');
    rankText.setOrigin(0.5);

    const rankName = createCjkText(this.scene, 292, 318, `当前段位 · ${rank.name}`, {
      fontSize: UI_TYPE.bodyL,
      color: UI_TOKENS.textOnPaper,
      fontStyle: 'bold',
    });
    rankName.setOrigin(0, 0.5);
    const rankDesc = createCjkText(this.scene, 292, 360, `${rank.description} · 框色 ${rank.frame}`, {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textMutedOnPaper,
    });
    rankDesc.setOrigin(0, 0.5);

    const stats: Array<{ value: string; label: string }> = [
      { value: `${record.bestWave}`, label: '最高波次' },
      { value: `${record.bestKills}`, label: '最高击杀' },
      { value: this._formatRecordTime(record.achievedAt), label: '达成日期' },
    ];
    stats.forEach((stat, index) => {
      const x = 302 + index * 122;
      const value = createCjkText(this.scene, x, 448, stat.value, {
        fontSize: index === 2 ? UI_TYPE.small : '32px',
        color: UI_TOKENS.textCinnabarOnPaper,
        fontStyle: 'bold',
      });
      value.setOrigin(0.5);
      const label = createCjkText(this.scene, x, 494, stat.label, {
        fontSize: UI_TYPE.small,
        color: UI_TOKENS.textMutedOnPaper,
      });
      label.setOrigin(0.5);
      this.container.add([value, label]);
    });
    this.container.add([medal, rankText, rankName, rankDesc]);

    // 段位进度
    const progressPanel = this.scene.add.graphics();
    drawLacquerPanel(progressPanel, 62, 586, 626, 220, { radius: 20, fillAlpha: 0.9 });
    this.container.add(progressPanel);
    const progressTitle = createCjkText(this.scene, 94, 626, '段位进度', {
      fontSize: UI_TYPE.body,
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
    progressTitle.setOrigin(0, 0.5);
    const progressDesc = createCjkText(this.scene, 94, 668, nextRank
      ? `距离 ${nextRank.name} 还差 ${Math.max(0, nextRank.minWave - record.bestWave)} 波`
      : '已至三界之巅，继续刷新极限纪录', {
        fontSize: UI_TYPE.label,
        color: UI_TOKENS.textOnDark,
        fontStyle: 'bold',
      });
    progressDesc.setOrigin(0, 0.5);

    const barX = 94, barY = 712, barW = 526, barH = 18;
    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x091e19, 0.95);
    barBg.fillRoundedRect(barX, barY, barW, barH, 9);
    barBg.fillStyle(nextRank ? UI_TOKENS.cinnabar : UI_TOKENS.gold, 1);
    barBg.fillRoundedRect(barX, barY, Math.max(18, barW * progressRatio), barH, 9);
    barBg.lineStyle(2, UI_TOKENS.gold, 0.65);
    barBg.strokeRoundedRect(barX, barY, barW, barH, 9);
    const left = createCjkText(this.scene, barX, 752, previousRank.name, {
      fontSize: UI_TYPE.small, color: UI_TOKENS.textMutedOnDark, fontStyle: 'bold',
    });
    left.setOrigin(0, 0.5);
    const right = createCjkText(this.scene, barX + barW, 752, nextRank?.name ?? '巅峰', {
      fontSize: UI_TYPE.small, color: UI_TOKENS.textGoldOnDark, fontStyle: 'bold',
    });
    right.setOrigin(1, 0.5);
    this.container.add([progressTitle, progressDesc, barBg, left, right]);

    // 自己行固定底部：榜单三项与段位卡口径一致
    const selfRow = this.scene.add.graphics();
    drawLacquerPanel(selfRow, 62, 826, 626, 88, { radius: 16, fillAlpha: 0.92, strokeAlpha: 0.9 });
    this.container.add(selfRow);
    const selfRank = createCjkText(this.scene, 102, 870, '第 1 名', {
      fontSize: UI_TYPE.small, color: UI_TOKENS.textGoldOnDark, fontStyle: 'bold',
    });
    selfRank.setOrigin(0, 0.5);
    const selfName = createCjkText(this.scene, 246, 870, '我 · 本机最佳', {
      fontSize: UI_TYPE.bodyS, color: UI_TOKENS.textOnDark, fontStyle: 'bold',
    });
    selfName.setOrigin(0, 0.5);
    const selfWave = createCjkText(this.scene, 496, 870, `${record.bestWave} 波`, {
      fontSize: UI_TYPE.small, color: UI_TOKENS.textOnDark, fontStyle: 'bold',
    });
    selfWave.setOrigin(0, 0.5);
    const selfKills = createCjkText(this.scene, 596, 870, `${record.bestKills} 击杀`, {
      fontSize: UI_TYPE.small, color: UI_TOKENS.textOnDark, fontStyle: 'bold',
    });
    selfKills.setOrigin(0, 0.5);
    this.container.add([selfRank, selfName, selfWave, selfKills]);

    // 本机榜也要说清存档边界，避免误以为成绩已上云
    const saveNotice = createCjkText(this.scene, 375, 948, FEEDBACK_TEXT.cloudPending, {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textMutedOnDark,
    });
    saveNotice.setOrigin(0.5);
    this.container.add(saveNotice);

    this.container.add(createUiButton(this.scene, {
      x: 448, y: 1000, width: 240, height: 72,
      label: '继续守护',
      primary: true,
      fontSize: UI_TYPE.body,
      onClick: this.onStartDefense,
    }));
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
    this._tipText.setDepth(300);
    this._tipText.setVisible(true);
    this.scene.time.delayedCall(1800, () => {
      if (this._tipText.text === text) {
        this._tipText.setText('');
        this._tipText.setVisible(false);
      }
    });
  }
}
