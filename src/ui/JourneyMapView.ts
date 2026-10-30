import Phaser from 'phaser';
import { ARTIFACT_CONFIGS, getArtifactCarrySlotCount, getArtifactUpgradeCost } from '../config/ArtifactConfig';
import { DEFENSE_RANKS, getDefenseRankByWave } from '../config/DefenseRankConfig';
import { getHeroConfig } from '../config/HeroConfig';
import { ArtifactData } from '../data/ArtifactData';
import { HeroData } from '../data/HeroData';
import { LevelData } from '../data/LevelData';
import { SaveManager } from '../data/SaveManager';
import { createCjkText } from '../core/TextStyles';
import { artifactKey, uiIconKey } from '../render/AssetKeys';
import { AdSystem } from '../systems/AdSystem';
import { LeaderboardService } from '../systems/LeaderboardService';
import { LevelConfig } from '../types';
import { ChapterSelectView } from './ChapterSelectView';
import { LevelGridView } from './LevelGridView';
import { playPageEnter } from './JourneyUiPrimitives';
import {
  UI_TOKENS, UI_TYPE,
  drawLacquerPanel, drawPaperPanel,
  createUiButton, createHudChip, createRoundIconButton,
  createVerticalGradientImage,
} from './DesignTokens';

type HomeViewMode = 'home' | 'chapters' | 'levels' | 'artifacts' | 'leaderboard';
type TransitionDirection = 'forward' | 'back';

interface WishButton {
  bg: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  hit: Phaser.GameObjects.Zone;
  enabled: boolean;
}

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
      fontSize: '22px',
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
    const clearedChapter = LevelData.getInstance().getClearedChapterCount();

    // ---- 顶部：资源胶囊 + 每日奖励 ----
    this.container.add(createHudChip(this.scene, {
      x: 24, y: 40, iconKey: uiIconKey('spirit'), text: `${save.spiritEssence}`,
    }));
    this.container.add(createRoundIconButton(this.scene, 688, 70, uiIconKey('ad_reward'), 58));

    // ---- 标题组：朱砂印章 + 游戏名（设计稿 home-logo） ----
    const seal = createCjkText(this.scene, 375, 132, '西 游 合 成 塔 防', {
      fontSize: '22px',
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
    });
    title.setOrigin(0.5);
    title.setShadow(3, 4, '#4c3325', 0, true, true);
    title.setStroke('#4c3325', 8);

    const sub = createCjkText(this.scene, 375, 292, '合成布阵 · 守住取经路', {
      fontSize: '24px',
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
      meta: '守护模式 · 抽卡布阵，冲击最高波次',
      primary: true,
      fontSize: UI_TYPE.body,
      onClick: this.onStartDefense,
    }));

    // ---- 模式卡 ×2 ----
    this._drawHomeModeCard(32, 988, 334, 128, '壹', '八十一难', `九章取经 · 已通 ${clearedChapter} 章`, () => {
      this._transitionDirection = 'forward';
      this._mode = 'chapters';
      this._draw();
    });
    this._drawHomeModeCard(384, 988, 334, 128, '贰', '调整阵容', '英雄 · 法宝出战配置', () => {
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
      fontSize: '34px',
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
    index.setOrigin(0.5);
    index.setAlpha(0.6);

    const titleText = createCjkText(this.scene, x + 26, y + 40, title, {
      fontSize: '32px',
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
    });
    titleText.setOrigin(0, 0.5);

    const descText = createCjkText(this.scene, x + 26, y + 88, desc, {
      fontSize: '22px',
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
      fontSize: '24px',
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
    });
    label.setOrigin(0, 0.5);

    const status = createCjkText(this.scene, x + 190, y + 27, free ? '今日可免费 1 次' : '今日已祈愿', {
      fontSize: '22px',
      color: UI_TOKENS.textGoldOnDark,
    });
    status.setOrigin(0, 0.5);

    const go = createCjkText(this.scene, x + w - 24, y + 27, '前往 ›', {
      fontSize: '24px',
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
    g.fillStyle(0xf8edcf, 1);
    g.fillRect(0, navTop, 750, 1334 - navTop);
    g.lineStyle(3, 0xb3935c, 1);
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
        fontSize: '22px',
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
  private _wishFreeBtn: WishButton | null = null;
  private _wishAdBtn: WishButton | null = null;

  private _wishTodayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  private _isWishAvailable(): boolean {
    const save = SaveManager.getInstance().load() ?? SaveManager.getInstance().createDefault();
    return save.lastWishDate !== this._wishTodayKey();
  }

  private _showWishPanel(): void {
    if (this._wishElements.length > 0) return;
    const scene = this.scene;
    const el: Phaser.GameObjects.GameObject[] = [];

    const overlay = scene.add.graphics();
    overlay.fillStyle(0x0a1e19, 0.82);
    overlay.fillRect(0, 0, 750, 1334);
    el.push(overlay);

    const panel = scene.add.graphics();
    drawPaperPanel(panel, 120, 360, 510, 520, { radius: 22 });
    el.push(panel);

    const title = createCjkText(scene, 375, 418, '每日祈愿', {
      fontSize: '38px',
      color: '#173f35',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    el.push(title);

    const sub = createCjkText(scene, 375, 472, '免费获得 1 枚英雄碎片，看广告可额外祈愿', {
      fontSize: '22px',
      color: '#776a56',
    });
    sub.setOrigin(0.5);
    el.push(sub);

    this._wishStatusText = createCjkText(scene, 375, 518, '', {
      fontSize: '24px',
      color: '#3e8e75',
      fontStyle: 'bold',
    });
    this._wishStatusText.setOrigin(0.5);
    el.push(this._wishStatusText);

    this._wishFreeBtn = this._createWishButton(
      375,
      584,
      this._isWishAvailable() ? '免费祈愿' : '今日已祈愿',
      this._isWishAvailable(),
      () => this._doFreeWish(),
    );
    el.push(this._wishFreeBtn.bg, this._wishFreeBtn.text, this._wishFreeBtn.hit);

    const hasAd = AdSystem.getInstance().hasRewardedVideo('dailyWish');
    this._wishAdBtn = this._createWishButton(375, 672, '看广告祈愿', hasAd, () => void this._doAdWish());
    el.push(this._wishAdBtn.bg, this._wishAdBtn.text, this._wishAdBtn.hit);

    this._wishResultText = createCjkText(scene, 375, 788, '', {
      fontSize: '24px',
      color: '#8e2f25',
      fontStyle: 'bold',
    });
    this._wishResultText.setOrigin(0.5);
    el.push(this._wishResultText);

    const closeText = createCjkText(scene, 592, 398, '×', {
      fontSize: '40px',
      color: '#776a56',
      fontStyle: 'bold',
    });
    closeText.setOrigin(0.5);
    closeText.setInteractive({ useHandCursor: true });
    closeText.on('pointerdown', () => this._closeWishPanel());
    el.push(closeText);

    this._wishElements = el;
    this.container.add(el);
    this._refreshWishStatus();
  }

  private _createWishButton(x: number, y: number, label: string, enabled: boolean, onClick: () => void): WishButton {
    const scene = this.scene;
    const bg = scene.add.graphics();
    const text = createCjkText(scene, x, y, label, {
      fontSize: '26px',
      color: enabled ? '#fff5da' : '#a89d8a',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);

    const hit = scene.add.zone(x, y, 280, 72);
    hit.setOrigin(0.5);
    if (enabled) {
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', onClick);
    }
    this._paintWishButton(bg, enabled);
    return { bg, text, hit, enabled };
  }

  private _paintWishButton(bg: Phaser.GameObjects.Graphics, enabled: boolean): void {
    bg.clear();
    // 底部厚度
    bg.fillStyle(enabled ? 0x8e2f25 : 0x5c564b, enabled ? 1 : 0.6);
    bg.fillRoundedRect(-140, -30, 280, 72, 16);
    // 主体
    bg.fillStyle(enabled ? 0xc84a36 : 0x8a8375, enabled ? 1 : 0.55);
    bg.fillRoundedRect(-140, -36, 280, 72, 16);
    bg.lineStyle(2, enabled ? 0xe88a65 : 0xa79e8c, enabled ? 0.9 : 0.4);
    bg.strokeRoundedRect(-140, -36, 280, 72, 16);
  }

  private _setWishButtonEnabled(btn: WishButton | null, enabled: boolean, label: string): void {
    if (!btn) return;
    btn.enabled = enabled;
    btn.hit.disableInteractive();
    if (enabled) {
      btn.hit.setInteractive({ useHandCursor: true });
      btn.hit.on('pointerdown', () => this._doFreeWish());
    }
    btn.text.setText(label);
    btn.text.setColor(enabled ? '#fff5da' : '#a89d8a');
    this._paintWishButton(btn.bg, enabled);
  }

  private _refreshWishStatus(): void {
    if (!this._wishStatusText) return;
    this._wishStatusText.setText(this._isWishAvailable() ? '今日可免费祈愿' : '今日已祈愿，明天再来');
  }

  private _showWishResult(text: string): void {
    if (this._wishResultText) this._wishResultText.setText(text);
  }

  private _doFreeWish(): void {
    if (!this._isWishAvailable()) return;
    const heroId = HeroData.getInstance().addRandomShard();
    const name = getHeroConfig(heroId)?.name ?? heroId;
    const save = SaveManager.getInstance().load() ?? SaveManager.getInstance().createDefault();
    save.lastWishDate = this._wishTodayKey();
    SaveManager.getInstance().save(save);
    this._showWishResult(`获得 ${name} 碎片 ×1`);
    this._setWishButtonEnabled(this._wishFreeBtn, false, '今日已祈愿');
    this._refreshWishStatus();
  }

  private async _doAdWish(): Promise<void> {
    const ok = await AdSystem.getInstance().showRewardedVideo('dailyWish');
    if (!ok) {
      this._showWishResult('广告未就绪，稍后再试');
      return;
    }
    const heroId = HeroData.getInstance().addRandomShard();
    const name = getHeroConfig(heroId)?.name ?? heroId;
    this._showWishResult(`广告祈愿：获得 ${name} 碎片 ×1`);
  }

  private _closeWishPanel(): void {
    for (const obj of this._wishElements) obj.destroy();
    this._wishElements = [];
    this._wishStatusText = null;
    this._wishResultText = null;
    this._wishFreeBtn = null;
    this._wishAdBtn = null;
  }

  // ==================== 法宝升级页 ====================

  private _drawBackButton(): void {
    // 有底部导航后，法宝/排行页不再需要显式返回按钮；保留方法兼容既有调用。
  }

  private _drawArtifactUpgrade(): void {
    const artifactData = ArtifactData.getInstance();
    artifactData.loadFromSave();
    const save = SaveManager.getInstance().load() ?? SaveManager.getInstance().createDefault();
    const clearedChapter = this._getClearedChapter();
    const slotLimit = getArtifactCarrySlotCount(clearedChapter);

    const title = createCjkText(this.scene, 375, 100, '法宝升级', {
      fontSize: UI_TYPE.title,
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    const subTitle = createCjkText(this.scene, 375, 158, `灵蕴 ${save.spiritEssence} ✦    携带槽 ${slotLimit}`, {
      fontSize: '24px',
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
    subTitle.setOrigin(0.5);
    this.container.add([title, subTitle]);

    ARTIFACT_CONFIGS.forEach((config, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 72 + col * 318;
      const y = 244 + row * 112;
      const unlocked = artifactData.isUnlocked(config.artifactId);
      const level = artifactData.getLevel(config.artifactId);
      const cost = getArtifactUpgradeCost(level);

      const g = this.scene.add.graphics();
      drawLacquerPanel(g, x, y, 286, 92, {
        radius: 14,
        fill: unlocked ? UI_TOKENS.pine800 : 0x1c332c,
        strokeAlpha: unlocked ? 0.65 : 0.25,
        shadow: false,
      });
      this.container.add(g);

      const name = createCjkText(this.scene, x + 16, y + 22, `${config.name}  Lv${level}`, {
        fontSize: '24px',
        color: unlocked ? UI_TOKENS.textGoldOnDark : '#b8bec9',
        fontStyle: 'bold',
      });
      name.setOrigin(0, 0.5);
      const desc = createCjkText(this.scene, x + 16, y + 58, unlocked ? config.levelDescriptions[level] : `通关 Ch${config.unlockChapter} 解锁`, {
        fontSize: '19px',
        color: UI_TOKENS.textMutedOnDark,
        wordWrap: { width: 178, useAdvancedWrap: true },
      });
      desc.setOrigin(0, 0.5);

      const buttonText = !unlocked ? '未解锁' : cost === null ? '满级' : `${cost} ✦`;
      const canUpgrade = unlocked && cost !== null;
      const bg = this.scene.add.graphics();
      const btnW = 104, btnH = 48, btnX = x + 286 - btnW - 14, btnY = y + 22;
      bg.fillStyle(canUpgrade ? UI_TOKENS.cinnabarDark : 0x3a4a44, 1);
      bg.fillRoundedRect(btnX, btnY + 4, btnW, btnH, 12);
      bg.fillStyle(canUpgrade ? UI_TOKENS.cinnabar : 0x5c6e66, canUpgrade ? 1 : 0.8);
      bg.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
      bg.lineStyle(2, canUpgrade ? UI_TOKENS.cinnabarEdge : 0x7d8f88, 0.9);
      bg.strokeRoundedRect(btnX, btnY, btnW, btnH, 12);
      this.container.add(bg);

      const button = createCjkText(this.scene, btnX + btnW / 2, btnY + btnH / 2, buttonText, {
        fontSize: '21px',
        color: canUpgrade ? '#fff5da' : '#c9d2cd',
        fontStyle: 'bold',
      });
      button.setOrigin(0.5);
      if (canUpgrade) {
        const hit = this.scene.add.zone(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH);
        hit.setOrigin(0.5);
        hit.setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
          const success = ArtifactData.getInstance().upgrade(config.artifactId);
          this._showTip(success ? `${config.name} 已升级` : '灵蕴不足');
          this._draw();
        });
        this.container.add(hit);
      }
      this.container.add([name, desc, button]);
    });

    this._drawArtifactFooter(save.spiritEssence, slotLimit, clearedChapter, artifactData);
  }

  private _drawArtifactFooter(spiritEssence: number, slotLimit: number, clearedChapter: number, artifactData: ArtifactData): void {
    const unlockedCount = ARTIFACT_CONFIGS.filter(config => artifactData.isUnlocked(config.artifactId)).length;
    const nextArtifact = ARTIFACT_CONFIGS.find(config => !artifactData.isUnlocked(config.artifactId));
    const title = createCjkText(this.scene, 76, 1010, '法宝策略', {
      fontSize: '26px',
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
    const detail = createCjkText(
      this.scene,
      76,
      1048,
      `灵蕴 ${spiritEssence}   携带槽 ${slotLimit}   已解锁 ${unlockedCount}/${ARTIFACT_CONFIGS.length}`,
      {
        fontSize: '22px',
        color: UI_TOKENS.textOnDark,
        fontStyle: 'bold',
      },
    );
    const nextText = nextArtifact
      ? `下一目标：通关第 ${nextArtifact.unlockChapter} 章解锁 ${nextArtifact.name}`
      : `九章法宝已齐，继续升级主力法宝`;
    const next = createCjkText(this.scene, 76, 1084, nextText, {
      fontSize: '22px',
      color: UI_TOKENS.textMutedOnDark,
    });
    const hint = createCjkText(this.scene, 76, 1120, `建议优先升级开山斧和回山符，先解决布阵空间和漏怪压力。`, {
      fontSize: '21px',
      color: clearedChapter >= 3 ? '#b8f4de' : UI_TOKENS.textMutedOnDark,
      wordWrap: { width: 580, useAdvancedWrap: true },
    });
    this.container.add([title, detail, next, hint]);
  }

  // ==================== 排行榜页 ====================

  private _drawLeaderboard(): void {
    const record = LeaderboardService.getInstance().getPersonalRecord();
    const rank = getDefenseRankByWave(record.bestWave);
    const title = createCjkText(this.scene, 375, 100, '排行榜', {
      fontSize: UI_TYPE.title,
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    const subTitle = createCjkText(this.scene, 375, 158, 'Defense 竞技记录', {
      fontSize: '24px',
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
    subTitle.setOrigin(0.5);
    this.container.add([title, subTitle]);

    const panel = this.scene.add.graphics();
    drawLacquerPanel(panel, 92, 306, 566, 328, { radius: 18 });
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
      fontSize: '26px',
      color: UI_TOKENS.textOnDark,
      lineSpacing: 16,
    });
    this.container.add(text);

    const currentRankIndex = DEFENSE_RANKS.findIndex(item => item.id === rank.id);
    const nextRank = DEFENSE_RANKS[currentRankIndex + 1] ?? null;
    const neededWave = nextRank ? Math.max(0, nextRank.minWave - record.bestWave) : 0;
    const footerTitle = createCjkText(this.scene, 76, 1010, '段位进度', {
      fontSize: '26px',
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
    const progress = createCjkText(this.scene, 76, 1052, nextRank
      ? `下一段位 ${nextRank.name}：还差 ${neededWave} 波`
      : '已达到最高段位，继续刷新极限纪录', {
        fontSize: '24px',
        color: UI_TOKENS.textOnDark,
        fontStyle: 'bold',
      });
    const hint = createCjkText(this.scene, 76, 1096, '排序优先比较波次，其次击杀数；守护模式成绩会刷新这里。', {
      fontSize: '21px',
      color: UI_TOKENS.textMutedOnDark,
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
