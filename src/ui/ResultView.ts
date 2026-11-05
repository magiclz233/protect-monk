import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { eventMgr, GameEvent } from '../core/EventManager';
import { createCjkText } from '../core/TextStyles';
import { getDefenseRankByWave } from '../config/DefenseRankConfig';
import { AdSystem } from '../systems/AdSystem';
import { LevelData } from '../data/LevelData';
import { LeaderboardService } from '../systems/LeaderboardService';
import { settleBattleResult } from '../systems/SettlementSystem';
import { getHeroConfig } from '../config/HeroConfig';
import { GameMode, GameState } from '../types';
import { heroShardKey, itemKey, uiIconKey } from '../render/AssetKeys';
import { UI_TOKENS, UI_TYPE, drawPaperPanel, drawLacquerPanel, createUiButton } from './DesignTokens';
import { FEEDBACK_TEXT } from './FeedbackOverlay';

/**
 * 战斗结算（设计稿 result）：
 * 卷轴式宣纸面板（上下轴头）+ 朱砂印章 + 星级 + 战报数据 + 双按钮。
 */
export class ResultView {
  readonly container: Phaser.GameObjects.Container;

  private _destroyed = false;
  private _revivePending = false;
  private _reviveRequestId = 0;
  private _reviveText?: Phaser.GameObjects.Text;
  private _hasRevived = false;

  private readonly _winHandler = (): void => this._show(true);
  private readonly _loseHandler = (): void => this._show(false);

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onDefenseRestart: () => void,
    private readonly onReturnMap: () => void,
    private readonly onJourneyRestart: () => void = onReturnMap,
    private readonly onNextLevel: () => void = onReturnMap,
  ) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(200);
    this.container.setVisible(false);

    eventMgr.on(GameEvent.BATTLE_WIN, this._winHandler);
    eventMgr.on(GameEvent.BATTLE_LOSE, this._loseHandler);
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._invalidateReviveRequest();
    eventMgr.off(GameEvent.BATTLE_WIN, this._winHandler);
    eventMgr.off(GameEvent.BATTLE_LOSE, this._loseHandler);
    this.container.destroy(true);
  }

  private _show(victory: boolean): void {
    if (this._destroyed || this.container.visible) return;
    this._invalidateReviveRequest();
    this._hasRevived = false;
    void AdSystem.getInstance().showInterstitial('result');
    const settlement = settleBattleResult({
      mode: gameMgr.mode,
      victory,
      currentLevel: gameMgr.currentLevel,
      monkHp: gameMgr.monkHp,
      totalKills: gameMgr.totalKills,
      waveNumber: gameMgr.waveNumber,
    });
    this.container.removeAll(true);
    this.container.setVisible(true);

    const scene = this.scene;

    // ---- 遮罩 ----
    const overlay = scene.add.graphics();
    overlay.fillStyle(0x0a1e19, 0.8);
    overlay.fillRect(0, 0, 750, 1334);

    // ---- 卷轴面板（胜利）/ 残页（失败）：两者共享后续战报、奖励与按钮结构 ----
    const panelX = 76, panelY = 356, panelW = 598, panelH = 672;
    const panel = scene.add.graphics();
    if (victory) {
      drawPaperPanel(panel, panelX, panelY, panelW, panelH, { radius: 14 });
      // 完整上下轴头
      panel.fillStyle(0x9f7c42, 1);
      panel.fillRoundedRect(panelX - 10, panelY - 10, panelW + 20, 20, 8);
      panel.fillStyle(0xd8bd86, 1);
      panel.fillRoundedRect(panelX - 10, panelY - 8, panelW + 20, 14, 7);
      panel.fillStyle(0x9f7c42, 1);
      panel.fillRoundedRect(panelX - 10, panelY + panelH - 10, panelW + 20, 20, 8);
      panel.fillStyle(0xd8bd86, 1);
      panel.fillRoundedRect(panelX - 10, panelY + panelH - 8, panelW + 20, 14, 7);
    } else {
      // 失败：焦褐残页，撕边与缺口均为程序绘制
      this._drawTornPage(panel, panelX, panelY, panelW, panelH);
    }

    // ---- 朱砂印章 + 标题 ----
    // 金色同心光环只属于胜利卷轴；失败残页留白，不叠加庆贺光效
    const rays = scene.add.graphics();
    if (victory) {
      rays.lineStyle(2, UI_TOKENS.goldLight, 0.22);
      rays.strokeCircle(375, panelY + 200, 110);
      rays.lineStyle(2, UI_TOKENS.goldLight, 0.06);
      rays.strokeCircle(375, panelY + 200, 154);
      rays.lineStyle(2, UI_TOKENS.goldLight, 0.04);
      rays.strokeCircle(375, panelY + 200, 198);
    }

    const seal = createCjkText(scene, panelX + 96, panelY + 62, victory ? '难关已渡' : '再接再厉', {
      fontSize: UI_TYPE.small,
      color: victory ? '#c84a36' : UI_TOKENS.textMutedOnPaper,
      fontStyle: 'bold',
      fontFamily: 'SimSun, Microsoft YaHei, serif',
      align: 'center',
      lineSpacing: 2,
    });
    seal.setOrigin(0.5);
    seal.setAngle(-6);
    // 印章边框
    const sealG = scene.add.graphics();
    sealG.lineStyle(3, victory ? UI_TOKENS.cinnabar : 0x6b4a28, 0.9);
    sealG.strokeRect(panelX + 58, panelY + 30, 76, 66);

    const title = createCjkText(scene, 375, panelY + 66, victory ? this._winTitle() : this._loseTitle(), {
      fontSize: UI_TYPE.displaySm,
      color: victory ? UI_TOKENS.textOnPaper : '#5a3a1c',
      fontStyle: 'bold',
      fontFamily: 'SimSun, Microsoft YaHei, serif',
    });
    title.setOrigin(0.5);

    const sub = createCjkText(scene, 375, panelY + 124, gameMgr.mode === GameMode.JOURNEY
      ? `第 ${gameMgr.currentLevel} 难 · ${victory ? '斩妖除魔，功德无量' : '妖势汹涌，再整旗鼓'}`
      : victory ? '斩妖除魔 · 功德无量' : '妖势汹涌 · 再整旗鼓', {
      fontSize: UI_TYPE.label,
      color: UI_TOKENS.textMutedOnPaper,
    });
    sub.setOrigin(0.5);

    this.container.add([overlay, panel, rays, sealG, seal, title, sub]);

    // ---- 星级：胜负共用同一结构；防守模式胜利按剩余血量给 1~3 星（仅视觉） ----
    const starTex = uiIconKey('star');
    const starCount = gameMgr.mode === GameMode.JOURNEY
      ? settlement.stars
      : (victory ? this._defenseVisualStars() : 0);
    for (let i = 0; i < 3; i++) {
      const middle = i === 1;
      const size = middle ? 112 : 92;
      const sx = 375 + (i - 1) * 108;
      const sy = panelY + 196 - (middle ? 14 : 0);
      const star = scene.add.image(sx, sy, starTex);
      star.setDisplaySize(size, size);
      if (i >= starCount) {
        // 未点亮必须一眼看出是「熄灭」：只降 alpha 时，亮金色星材质叠在
        // 浅色宣纸／焦褐残页上仍会显得像已获得，这里同时压暗色相。
        star.setTint(0x5a4a32);
        star.setAlpha(0.3);
      } else {
        star.setTint(UI_TOKENS.gold);
        star.setAlpha(1);
      }
      this.container.add(star);
    }
    const statsY = panelY + 288;

    // ---- 三列数据网格（设计稿 result-stats：数字朱砂 + 标签灰） ----
    const stats: Array<{ value: string; label: string }> = [
      { value: `${gameMgr.waveNumber}`, label: '到达波次' },
      { value: `${gameMgr.totalKills}`, label: '击杀妖怪' },
      { value: `${gameMgr.monkHp}/${gameMgr.maxMonkHp}`, label: '剩余血量' },
    ];

    const divider = scene.add.graphics();
    divider.lineStyle(2, UI_TOKENS.line, 0.26);
    divider.beginPath();
    divider.moveTo(panelX + 40, statsY - 18);
    divider.lineTo(panelX + panelW - 40, statsY - 18);
    divider.moveTo(panelX + 40, statsY + 118);
    divider.lineTo(panelX + panelW - 40, statsY + 118);
    divider.strokePath();
    // 列分隔
    const colW = panelW / 3;
    for (let i = 1; i < 3; i++) {
      const cx = panelX + colW * i;
      divider.lineStyle(1.5, UI_TOKENS.line, 0.18);
      divider.beginPath();
      divider.moveTo(cx, statsY + 2);
      divider.lineTo(cx, statsY + 96);
      divider.strokePath();
    }

    stats.forEach((stat, i) => {
      const cx = panelX + colW * i + colW / 2;
      const value = createCjkText(scene, cx, statsY + 34, stat.value, {
        fontSize: UI_TYPE.title,
        color: UI_TOKENS.textCinnabarOnPaper,
        fontStyle: 'bold',
      });
      value.setOrigin(0.5);
      const label = createCjkText(scene, cx, statsY + 86, stat.label, {
        fontSize: UI_TYPE.small,
        color: UI_TOKENS.textMutedOnPaper,
      });
      label.setOrigin(0.5);
      this.container.add([value, label]);
    });
    this.container.add(divider);

    // ---- 奖励区（设计稿 reward-cards：宣纸小卡 图标+名+数量） ----
    const rewardY = 772;
    const rewardLabel = createCjkText(scene, panelX + 48, rewardY, '战斗收获', {
      fontSize: UI_TYPE.label,
      color: UI_TOKENS.textOnPaper,
      fontStyle: 'bold',
    });
    rewardLabel.setOrigin(0, 0.5);
    this.container.add(rewardLabel);

    const rewards: Array<{ icon: string; name: string; amount: string }> = [];
    if (gameMgr.mode === GameMode.JOURNEY) {
      rewards.push({ icon: uiIconKey('spirit'), name: '灵蕴', amount: `+${settlement.spiritEssenceReward}` });
      for (const r of settlement.shardRewards.slice(0, 2)) {
        const config = getHeroConfig(r.heroId);
        rewards.push({
          icon: heroShardKey(r.heroId),
          name: `${config?.name ?? '英雄'}碎片`,
          amount: `+${r.count}`,
        });
      }
    } else {
      const record = LeaderboardService.getInstance().getPersonalRecord();
      const rank = getDefenseRankByWave(record.bestWave);
      rewards.push({ icon: uiIconKey('star'), name: '最佳波次', amount: `${record.bestWave}` });
      rewards.push({ icon: uiIconKey('kill'), name: '当前段位', amount: rank.name });
      const shardTotal = settlement.shardRewards.reduce((sum, r) => sum + r.count, 0);
      if (shardTotal > 0) {
        rewards.push({ icon: itemKey('tongyongsuipian'), name: '英雄碎片', amount: `+${shardTotal}` });
      }
    }

    const cardW = 150, cardH = 128, cardGap = 14;
    const totalW = rewards.length * cardW + (rewards.length - 1) * cardGap;
    const startX = 375 - totalW / 2;
    rewards.forEach((reward, i) => {
      const cx = startX + i * (cardW + cardGap);
      const cardTop = rewardY + 24;
      const g = scene.add.graphics();
      g.fillStyle(0x3f301d, 0.14);
      g.fillRoundedRect(cx, cardTop + 4, cardW, cardH, 12);
      g.fillStyle(UI_TOKENS.paperDeep, 1);
      g.fillRoundedRect(cx, cardTop, cardW, cardH, 12);
      g.lineStyle(1.5, 0xc0a16c, 0.9);
      g.strokeRoundedRect(cx, cardTop, cardW, cardH, 12);

      const icon = scene.add.image(cx + cardW / 2, cardTop + 46, reward.icon);
      icon.setDisplaySize(64, 64);
      const name = createCjkText(scene, cx + cardW / 2, cardTop + 90, reward.name, {
        fontSize: UI_TYPE.small,
        color: UI_TOKENS.textOnPaper,
        fontStyle: 'bold',
      });
      name.setOrigin(0.5);
      const amount = createCjkText(scene, cx + cardW / 2, cardTop + 114, reward.amount, {
        fontSize: UI_TYPE.small,
        color: UI_TOKENS.textCinnabarOnPaper,
        fontStyle: 'bold',
      });
      amount.setOrigin(0.5);
      this.container.add([g, icon, name, amount]);
    });

    // ---- 按钮区：胜利给下一步，失败给重试/返回/一次性复活 ----
    const retry = (): void => {
      this._invalidateReviveRequest();
      if (gameMgr.mode === GameMode.JOURNEY) this.onJourneyRestart();
      else this.onDefenseRestart();
    };
    const backToMap = (): void => {
      this._invalidateReviveRequest();
      this.onReturnMap();
    };

    const isJourney = gameMgr.mode === GameMode.JOURNEY;
    if (victory && isJourney) {
      const nextLevelId = gameMgr.currentLevel + 1;
      const canNext = gameMgr.currentLevel >= 81 || LevelData.getInstance().isUnlocked(nextLevelId);
      const nextLabel = gameMgr.currentLevel >= 81
        ? '再启轮回'
        : `挑战第 ${nextLevelId} 难`;
      this.container.add(createUiButton(scene, {
        minHit: false,
        x: 96, y: panelY + panelH - 92, width: 240, height: 72,
        label: '返回地图', secondary: true, fontSize: UI_TYPE.bodyS,
        onClick: backToMap,
      }));
      this.container.add(createUiButton(scene, {
        minHit: false,
        x: 366, y: panelY + panelH - 96, width: 288, height: 78,
        label: nextLabel, primary: canNext, secondary: !canNext, enabled: canNext, fontSize: UI_TYPE.body,
        onClick: () => { this._invalidateReviveRequest(); this.onNextLevel(); },
      }));
    } else if (victory) {
      this.container.add(createUiButton(scene, {
        minHit: false,
        x: 96, y: panelY + panelH - 92, width: 240, height: 72,
        label: '返回地图', secondary: true, fontSize: UI_TYPE.bodyS,
        onClick: backToMap,
      }));
      this.container.add(createUiButton(scene, {
        minHit: false,
        x: 366, y: panelY + panelH - 96, width: 288, height: 78,
        label: '再次守护', primary: true, fontSize: UI_TYPE.body,
        onClick: retry,
      }));
    } else {
      const showRevive = !this._hasRevived && AdSystem.getInstance().hasRewardedVideo('revive');
      if (showRevive) {
        const reviveBtn = this._createReviveButton(96, panelY + panelH - 126, 260, 66);
        this.container.add(reviveBtn);
        this.container.add(createUiButton(scene, {
          minHit: false,
          x: 396, y: panelY + panelH - 128, width: 258, height: 68,
          label: isJourney ? '重新挑战' : '重新开始', primary: true, fontSize: UI_TYPE.bodyS,
          onClick: retry,
        }));
        this.container.add(createUiButton(scene, {
          minHit: false,
          x: 96, y: panelY + panelH - 50, width: 558, height: 46,
          label: '返回地图', secondary: true, fontSize: UI_TYPE.small,
          onClick: backToMap,
        }));
      } else {
        this.container.add(createUiButton(scene, {
          minHit: false,
          x: 96, y: panelY + panelH - 94, width: 268, height: 72,
          label: isJourney ? '重新挑战' : '重新开始', primary: true, fontSize: UI_TYPE.bodyS,
          onClick: retry,
        }));
        this.container.add(createUiButton(scene, {
          minHit: false,
          x: 398, y: panelY + panelH - 92, width: 256, height: 70,
          label: '返回地图', secondary: true, fontSize: UI_TYPE.bodyS,
          onClick: backToMap,
        }));
      }
    }

    // 结算说明
    const note = createCjkText(scene, 375, panelY + panelH + 34, gameMgr.mode === GameMode.JOURNEY
      ? (victory && gameMgr.currentLevel >= 81 ? '八十一难已通，新的轮回正在开启' : '奖励已自动入包，可继续挑战后续关卡')
      : '重新开始将继承段位与英雄养成', {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textMutedOnDark,
    });
    note.setOrigin(0.5);
    this.container.add(note);
  }

  /** 复活按钮：漆面深绿（次要动作） */
  private _createReviveButton(x: number, y: number, w: number, h: number): Phaser.GameObjects.Container {
    const scene = this.scene;
    const container = scene.add.container(x + w / 2, y + h / 2);

    const g = scene.add.graphics();
    drawLacquerPanel(g, -w / 2, -h / 2, w, h, { radius: 18, shadow: false });

    const text = createCjkText(scene, 0, -4, '看广告复活', {
      fontSize: UI_TYPE.label,
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
    const meta = createCjkText(scene, 0, 22, '恢复 1 点血量 · 本局 1 次', {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textMutedOnDark,
    });
    meta.setOrigin(0.5);
    container.add(meta);
    text.setOrigin(0.5);
    text.setName('reviveLabel');

    const hit = scene.add.zone(0, 0, w, h);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => void this._tryRevive());

    container.add([g, text, hit]);
    return container;
  }

  private async _tryRevive(): Promise<void> {
    if (this._destroyed || this._revivePending || this._hasRevived || gameMgr.state !== GameState.RESULT) return;

    this._revivePending = true;
    const requestId = ++this._reviveRequestId;
    this._reviveText = this.container.getByName('reviveLabel') as Phaser.GameObjects.Text | undefined;
    this._reviveText?.disableInteractive();
    this._reviveText?.setText('广告播放中');

    const ok = await AdSystem.getInstance().showRewardedVideo('revive');
    if (this._destroyed || requestId !== this._reviveRequestId) return;

    this._revivePending = false;
    if (!ok) {
      this._reviveText?.setText('看广告复活');
      this._reviveText?.setInteractive({ useHandCursor: true });
      // 广告失败提示统一使用 FEEDBACK_TEXT 文案
      this._showAdFailureTip();
      return;
    }

    if (!this.container.visible || gameMgr.state !== GameState.RESULT) return;

    this._hasRevived = true;
    gameMgr.reviveMonk(1);
    if (gameMgr.monkHp <= 0) return;

    gameMgr.setState(GameState.PLAYING);
    this._reviveText = undefined;
    this.container.setVisible(false);
    this.container.removeAll(true);
  }

  private _invalidateReviveRequest(): void {
    this._reviveRequestId++;
    this._revivePending = false;
    this._reviveText = undefined;
  }

  /** 广告失败提示：统一 FEEDBACK_TEXT 文案，短暂上浮后消失 */
  private _showAdFailureTip(): void {
    const tip = createCjkText(this.scene, 375, 1032, FEEDBACK_TEXT.adUnavailable, {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
      backgroundColor: '#0a1e19',
      padding: { x: 14, y: 8 },
    });
    tip.setOrigin(0.5);
    tip.setAlpha(0);
    this.container.add(tip);
    this.scene.tweens.add({
      targets: tip,
      alpha: 1,
      y: 1006,
      duration: 180,
      yoyo: true,
      hold: 1400,
      onComplete: () => { if (tip.scene) tip.destroy(); },
    });
  }

  /** 防守模式胜利星级：仅按剩余血量做视觉分级，不参与奖励与存档计算 */
  private _defenseVisualStars(): number {
    const ratio = gameMgr.maxMonkHp > 0 ? gameMgr.monkHp / gameMgr.maxMonkHp : 0;
    if (ratio >= 0.75) return 3;
    if (ratio >= 0.4) return 2;
    return 1;
  }

  /** 失败残页：焦褐纸 + 锯齿撕边 + 烧穿缺口，全部程序绘制且不动结算结构 */
  private _drawTornPage(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
  ): void {
    const points: Array<{ x: number; y: number }> = [];
    const seg = 18;
    // 确定性抖动，避免每次重绘撕边形状跳变
    const jitter = (i: number): number => ((i * 41) % 13) - 6;
    for (let i = 0; i <= seg; i++) {
      points.push({ x: x + w * i / seg, y: y + Math.abs(jitter(i)) * 1.1 });
    }
    for (let i = 1; i <= seg; i++) {
      points.push({ x: x + w - Math.abs(jitter(i + 5)) * 1.1, y: y + h * i / seg });
    }
    for (let i = seg - 1; i >= 0; i--) {
      points.push({ x: x + w * i / seg, y: y + h - Math.abs(jitter(i + 9)) * 1.1 });
    }
    for (let i = seg - 1; i >= 1; i--) {
      points.push({ x: x + Math.abs(jitter(i + 13)) * 1.1, y: y + h * i / seg });
    }

    // 纸面投影
    g.fillStyle(0x2a1d10, 0.35);
    g.fillPoints(points.map(p => ({ x: p.x, y: p.y + 8 })), true);
    // 焦褐纸面与焦褐撕边
    g.fillStyle(0xc9a878, 1);
    g.fillPoints(points, true);
    g.lineStyle(3, 0x6b4a28, 0.9);
    g.strokePoints(points, true);
    // 上下内缘焦晕
    g.fillStyle(0x7a542f, 0.26);
    g.fillRect(x + 4, y + 4, w - 8, 16);
    g.fillRect(x + 4, y + h - 20, w - 8, 16);
    // 烧穿缺口：深色不规则小块
    g.fillStyle(0x3a2817, 0.92);
    const holes: Array<[number, number, number]> = [
      [x + w - 34, y + 42, 15],
      [x + 20, y + h - 60, 12],
      [x + w - 72, y + h - 28, 9],
    ];
    for (const [hx, hy, hr] of holes) {
      g.fillCircle(hx, hy, hr);
      g.fillTriangle(hx, hy - hr, hx + hr * 1.4, hy + hr * 0.5, hx - hr * 1.4, hy + hr * 0.5);
    }
    // 断裂轴头：上下各留两小段，呼应胜利卷轴但残缺
    g.fillStyle(0x7a542f, 1);
    g.fillRoundedRect(x - 10, y - 10, w * 0.34, 18, 8);
    g.fillRoundedRect(x + w - w * 0.3, y - 10, w * 0.3 + 10, 18, 8);
    g.fillRoundedRect(x - 10, y + h - 8, w * 0.28, 18, 8);
    g.fillRoundedRect(x + w - w * 0.36, y + h - 8, w * 0.36 + 10, 18, 8);
  }

  private _winTitle(): string {
    return gameMgr.mode === GameMode.JOURNEY ? '取经通关' : '守护成功';
  }

  private _loseTitle(): string {
    return gameMgr.mode === GameMode.JOURNEY ? '取经受阻' : '守护失败';
  }
}
