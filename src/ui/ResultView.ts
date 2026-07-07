import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { eventMgr, GameEvent } from '../core/EventManager';
import { createCjkText } from '../core/TextStyles';
import { getDefenseRankByWave } from '../config/DefenseRankConfig';
import { AdSystem } from '../systems/AdSystem';
import { LeaderboardService } from '../systems/LeaderboardService';
import { settleBattleResult } from '../systems/SettlementSystem';
import { GameMode } from '../types';

export class ResultView {
  readonly container: Phaser.GameObjects.Container;

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
    eventMgr.off(GameEvent.BATTLE_WIN, this._winHandler);
    eventMgr.off(GameEvent.BATTLE_LOSE, this._loseHandler);
    this.container.destroy(true);
  }

  private _show(victory: boolean): void {
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

    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x05070d, 0.78);
    overlay.fillRect(0, 0, 750, 1334);

    const panel = this.scene.add.graphics();
    panel.fillStyle(0x172033, 0.98);
    panel.fillRoundedRect(90, 356, 570, 460, 8);
    panel.lineStyle(3, victory ? 0xf0c15a : 0xd95b5b, 0.9);
    panel.strokeRoundedRect(90, 356, 570, 460, 8);

    const title = createCjkText(this.scene, 375, 420, victory ? this._winTitle() : this._loseTitle(), {
      fontSize: '44px',
      color: victory ? '#ffd36a' : '#ff8a8a',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    const lines = [
      `到达波次：${gameMgr.waveNumber}`,
      `击杀妖怪：${gameMgr.totalKills}`,
      `唐僧血量：${gameMgr.monkHp}/${gameMgr.maxMonkHp}`,
    ];
    if (gameMgr.mode === GameMode.JOURNEY) {
      lines.push(`通关星级：${settlement.stars > 0 ? '★'.repeat(settlement.stars) : '未通关'}`);
      lines.push(`获得灵蕴：${settlement.spiritEssenceReward} ✦`);
    } else {
      const record = LeaderboardService.getInstance().getPersonalRecord();
      const rank = getDefenseRankByWave(record.bestWave);
      lines.push(`当前段位：${rank.name}`);
      lines.push(`最佳纪录：${record.bestWave} 波 / ${record.bestKills} 杀`);
    }

    const content = createCjkText(this.scene, 375, 546, lines, {
      fontSize: '26px',
      color: '#f7f1d0',
      align: 'center',
      lineSpacing: 16,
    });
    content.setOrigin(0.5);

    const label = gameMgr.mode === GameMode.JOURNEY ? '返回地图' : '重新开始';

    const restartBg = this.scene.add.graphics();
    restartBg.fillStyle(0xf0c15a, 1);
    restartBg.fillRoundedRect(265, 704, 220, 72, 8);

    const restartText = createCjkText(this.scene, 375, 740, label, {
      fontSize: '28px',
      color: '#101826',
      fontStyle: 'bold',
    });
    restartText.setOrigin(0.5);
    restartText.setInteractive({ useHandCursor: true });
    restartText.on('pointerdown', () => {
      if (gameMgr.mode === GameMode.JOURNEY) {
        this.onReturnMap();
      } else {
        this.onDefenseRestart();
      }
    });

    this.container.add([overlay, panel, title, content, restartBg, restartText]);
    if (!victory && AdSystem.getInstance().hasRewardedVideo('revive')) {
      this._drawReviveButton();
    }
  }

  private _drawReviveButton(): void {
    const reviveBg = this.scene.add.graphics();
    reviveBg.fillStyle(0x31496c, 0.98);
    reviveBg.fillRoundedRect(265, 626, 220, 58, 8);
    reviveBg.lineStyle(2, 0xb8d8ff, 0.7);
    reviveBg.strokeRoundedRect(265, 626, 220, 58, 8);

    const reviveText = createCjkText(this.scene, 375, 655, '看广告复活', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    reviveText.setOrigin(0.5);
    reviveText.setInteractive({ useHandCursor: true });
    reviveText.on('pointerdown', () => void this._tryRevive());
    this.container.add([reviveBg, reviveText]);
  }

  private async _tryRevive(): Promise<void> {
    const ok = await AdSystem.getInstance().showRewardedVideo('revive');
    if (!ok) return;

    gameMgr.reviveMonk(1);
    this.container.setVisible(false);
    this.container.removeAll(true);
  }

  private _winTitle(): string {
    return gameMgr.mode === GameMode.JOURNEY ? '取经通关' : '守护成功';
  }

  private _loseTitle(): string {
    return gameMgr.mode === GameMode.JOURNEY ? '取经受阻' : '守护失败';
  }
}
