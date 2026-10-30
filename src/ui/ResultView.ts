import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { eventMgr, GameEvent } from '../core/EventManager';
import { createCjkText } from '../core/TextStyles';
import { getDefenseRankByWave } from '../config/DefenseRankConfig';
import { AdSystem } from '../systems/AdSystem';
import { LeaderboardService } from '../systems/LeaderboardService';
import { settleBattleResult } from '../systems/SettlementSystem';
import { getHeroConfig } from '../config/HeroConfig';
import { GameMode, GameState } from '../types';
import { heroShardKey, itemKey, uiIconKey } from '../render/AssetKeys';
import { UI_TOKENS, drawPaperPanel, drawLacquerPanel, createUiButton } from './DesignTokens';

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

  private readonly _winHandler = (): void => this._show(true);
  private readonly _loseHandler = (): void => this._show(false);

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onDefenseRestart: () => void,
    private readonly onReturnMap: () => void,
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

    // ---- 卷轴面板 + 上下轴头（设计稿 result-panel） ----
    const panelX = 76, panelY = 356, panelW = 598, panelH = 672;
    const panel = scene.add.graphics();
    drawPaperPanel(panel, panelX, panelY, panelW, panelH, { radius: 14 });
    // 轴头
    panel.fillStyle(0x9f7c42, 1);
    panel.fillRoundedRect(panelX - 10, panelY - 10, panelW + 20, 20, 8);
    panel.fillStyle(0xd8bd86, 1);
    panel.fillRoundedRect(panelX - 10, panelY - 8, panelW + 20, 14, 7);
    panel.fillStyle(0x9f7c42, 1);
    panel.fillRoundedRect(panelX - 10, panelY + panelH - 10, panelW + 20, 20, 8);
    panel.fillStyle(0xd8bd86, 1);
    panel.fillRoundedRect(panelX - 10, panelY + panelH - 8, panelW + 20, 14, 7);

    // ---- 朱砂印章 + 标题 ----
    // 金色同心光环（设计稿 result-rays）
    const rays = scene.add.graphics();
    rays.lineStyle(2, 0xf2d484, 0.22);
    rays.strokeCircle(375, panelY + 200, 110);
    rays.lineStyle(2, 0xf2d484, 0.06);
    rays.strokeCircle(375, panelY + 200, 154);
    rays.lineStyle(2, 0xf2d484, 0.04);
    rays.strokeCircle(375, panelY + 200, 198);

    const seal = createCjkText(scene, panelX + 92, panelY + 62, victory ? '捷' : '挫', {
      fontSize: '40px',
      color: victory ? '#c84a36' : '#776a56',
      fontStyle: 'bold',
      align: 'center',
    });
    seal.setOrigin(0.5);
    seal.setAngle(-6);
    // 印章边框
    const sealG = scene.add.graphics();
    sealG.lineStyle(3, victory ? 0xc84a36 : 0x9a8d76, 0.9);
    sealG.strokeRect(panelX + 62, panelY + 30, 60, 62);

    const title = createCjkText(scene, 375, panelY + 66, victory ? this._winTitle() : this._loseTitle(), {
      fontSize: '52px',
      color: '#173f35',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const sub = createCjkText(scene, 375, panelY + 124, victory ? '斩妖除魔 · 功德无量' : '妖势汹涌 · 再整旗鼓', {
      fontSize: '23px',
      color: '#776a56',
    });
    sub.setOrigin(0.5);

    this.container.add([overlay, panel, rays, sealG, seal, title, sub]);

    // ---- 星级（八十一难模式：星级图片 + 中央星放大，设计稿 result-stars） ----
    let statsY = panelY + 208;
    if (gameMgr.mode === GameMode.JOURNEY) {
      const starTex = uiIconKey('star');
      const starCount = settlement.stars;
      for (let i = 0; i < 3; i++) {
        const middle = i === 1;
        const size = middle ? 112 : 92;
        const sx = 375 + (i - 1) * 108;
        const sy = panelY + 196 - (middle ? 14 : 0);
        const star = scene.add.image(sx, sy, starTex);
        star.setDisplaySize(size, size);
        if (i >= starCount) star.setAlpha(0.22);
        else star.setTint(0xd8a64a);
      }
      statsY = panelY + 288;
    } else {
      statsY = panelY + 196;
    }

    // ---- 三列数据网格（设计稿 result-stats：数字朱砂 + 标签灰） ----
    const stats: Array<{ value: string; label: string }> = [
      { value: `${gameMgr.waveNumber}`, label: '到达波次' },
      { value: `${gameMgr.totalKills}`, label: '击杀妖怪' },
      { value: `${gameMgr.monkHp}/${gameMgr.maxMonkHp}`, label: '剩余血量' },
    ];

    const divider = scene.add.graphics();
    divider.lineStyle(2, 0x403423, 0.26);
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
      divider.lineStyle(1.5, 0x403423, 0.18);
      divider.beginPath();
      divider.moveTo(cx, statsY + 2);
      divider.lineTo(cx, statsY + 96);
      divider.strokePath();
    }

    stats.forEach((stat, i) => {
      const cx = panelX + colW * i + colW / 2;
      const value = createCjkText(scene, cx, statsY + 34, stat.value, {
        fontSize: '44px',
        color: '#8e2f25',
        fontStyle: 'bold',
      });
      value.setOrigin(0.5);
      const label = createCjkText(scene, cx, statsY + 86, stat.label, {
        fontSize: '21px',
        color: '#776a56',
      });
      label.setOrigin(0.5);
      this.container.add([value, label]);
    });
    this.container.add(divider);

    // ---- 奖励区（设计稿 reward-cards：宣纸小卡 图标+名+数量） ----
    const rewardY = 772;
    const rewardLabel = createCjkText(scene, panelX + 48, rewardY, '战斗收获', {
      fontSize: '23px',
      color: '#173f35',
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
      g.fillStyle(0xeddcba, 1);
      g.fillRoundedRect(cx, cardTop, cardW, cardH, 12);
      g.lineStyle(1.5, 0xc0a16c, 0.9);
      g.strokeRoundedRect(cx, cardTop, cardW, cardH, 12);

      const icon = scene.add.image(cx + cardW / 2, cardTop + 46, reward.icon);
      icon.setDisplaySize(64, 64);
      const name = createCjkText(scene, cx + cardW / 2, cardTop + 90, reward.name, {
        fontSize: '20px',
        color: '#252a26',
        fontStyle: 'bold',
      });
      name.setOrigin(0.5);
      const amount = createCjkText(scene, cx + cardW / 2, cardTop + 114, reward.amount, {
        fontSize: '21px',
        color: '#8e2f25',
        fontStyle: 'bold',
      });
      amount.setOrigin(0.5);
      this.container.add([g, icon, name, amount]);
    });

    // ---- 按钮区：返回/重开 + 复活 ----
    const restart = (): void => {
      this._invalidateReviveRequest();
      if (gameMgr.mode === GameMode.JOURNEY) {
        this.onReturnMap();
      } else {
        this.onDefenseRestart();
      }
    };

    const btnY = panelY + panelH - 92;
    const showRevive = !victory && AdSystem.getInstance().hasRewardedVideo('revive');
    if (showRevive) {
      // 失败：复活（漆面深绿）+ 重来（朱砂主按钮）
      const reviveBtn = this._createReviveButton(96, btnY, 260, 76);
      this.container.add(reviveBtn);
      this.container.add(createUiButton(scene, {
        x: 396, y: btnY, width: 258, height: 76,
        label: gameMgr.mode === GameMode.JOURNEY ? '返回地图' : '重新开始',
        primary: true,
        fontSize: '27px',
        onClick: restart,
      }));
    } else {
      this.container.add(createUiButton(scene, {
        x: 96, y: btnY, width: 558, height: 80,
        label: gameMgr.mode === GameMode.JOURNEY ? '返回地图' : '重新开始',
        primary: true,
        fontSize: '29px',
        onClick: restart,
      }));
    }

    // 结算说明
    const note = createCjkText(scene, 375, panelY + panelH + 34, gameMgr.mode === GameMode.JOURNEY
      ? '返回地图可继续挑战后续关卡'
      : '重新开始将继承段位与英雄养成', {
      fontSize: '22px',
      color: '#d7cba6',
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

    const text = createCjkText(scene, 0, 0, '看广告复活', {
      fontSize: '27px',
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
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
    if (this._destroyed || this._revivePending || gameMgr.state !== GameState.RESULT) return;

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
      return;
    }

    if (!this.container.visible || gameMgr.state !== GameState.RESULT) return;

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

  private _winTitle(): string {
    return gameMgr.mode === GameMode.JOURNEY ? '取经通关' : '守护成功';
  }

  private _loseTitle(): string {
    return gameMgr.mode === GameMode.JOURNEY ? '取经受阻' : '守护失败';
  }
}
