import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { eventMgr, GameEvent } from '../core/EventManager';
import { createCjkText } from '../core/TextStyles';
import { Enemy } from '../entities/Enemy';
import { EnemyType, Faction, GameState } from '../types';

const FACTION_NAMES: Record<Faction, string> = {
  [Faction.SHITU]: '师徒羁绊',
  [Faction.XIANFO]: '仙佛羁绊',
  [Faction.YAOWANG]: '妖王羁绊',
};

export class HudView {
  readonly container: Phaser.GameObjects.Container;

  private readonly _peachText: Phaser.GameObjects.Text;
  private readonly _hpText: Phaser.GameObjects.Text;
  private readonly _waveText: Phaser.GameObjects.Text;
  private readonly _killText: Phaser.GameObjects.Text;
  private readonly _factionText: Phaser.GameObjects.Text;
  private readonly _pauseText: Phaser.GameObjects.Text;
  private readonly _bossContainer: Phaser.GameObjects.Container;
  private readonly _bossBarBg: Phaser.GameObjects.Graphics;
  private readonly _bossBarFill: Phaser.GameObjects.Graphics;
  private readonly _bossNameText: Phaser.GameObjects.Text;
  private readonly _bossHpText: Phaser.GameObjects.Text;
  private _bossEnemy: Enemy | null = null;

  private readonly _peachHandler = (peach: number): void => {
    this._peachText.setText(`仙桃 ${peach}`);
  };
  private readonly _hpHandler = (hp: number): void => {
    this._hpText.setText(`血量 ${hp}/${gameMgr.maxMonkHp}`);
  };
  private readonly _waveHandler = (wave: number): void => {
    this._waveText.setText(`第 ${wave} 波`);
  };
  private readonly _killHandler = (kills: number): void => {
    this._killText.setText(`击杀 ${kills}`);
  };
  private readonly _factionHandler = (factions: Faction[]): void => {
    this._factionText.setText(factions.length > 0 ? factions.map(f => FACTION_NAMES[f]).join(' / ') : '羁绊 未激活');
  };
  private readonly _enemySpawnedHandler = (enemy: Enemy): void => {
    if (enemy.enemyType !== EnemyType.BOSS) return;
    this._showBoss(enemy);
  };
  private readonly _sceneUpdateHandler = (): void => {
    this._updateBossBar();
  };

  constructor(private readonly scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(100);

    const bg = scene.add.graphics();
    bg.fillStyle(0x101826, 0.94);
    bg.fillRoundedRect(18, 18, 714, 112, 10);
    bg.lineStyle(2, 0xf0c15a, 0.48);
    bg.strokeRoundedRect(18, 18, 714, 112, 10);
    bg.fillStyle(0xffffff, 0.05);
    bg.fillRoundedRect(34, 36, 590, 40, 8);
    bg.fillRoundedRect(34, 82, 590, 30, 8);
    this.container.add(bg);

    this._peachText = this._createText(52, 45, `仙桃 ${gameMgr.peach}`, '#ffd36a', 20);
    this._hpText = this._createText(184, 45, `血量 ${gameMgr.monkHp}/${gameMgr.maxMonkHp}`, '#ff7474', 20);
    this._waveText = this._createText(318, 45, `第 ${gameMgr.waveNumber} 波`, '#f7f1d0', 20);
    this._killText = this._createText(438, 45, `击杀 ${gameMgr.totalKills}`, '#b9e97b', 20);
    this._factionText = this._createText(52, 87, '羁绊 未激活', '#9fd3ff', 17);

    this.container.add([this._peachText, this._hpText, this._waveText, this._killText, this._factionText]);
    this._pauseText = this._createPauseButton();
    this.container.add(this._pauseText);

    this._bossContainer = this._createBossBar();
    this.container.add(this._bossContainer);
    this._bossBarBg = this._bossContainer.getByName('bossBarBg') as Phaser.GameObjects.Graphics;
    this._bossBarFill = this._bossContainer.getByName('bossBarFill') as Phaser.GameObjects.Graphics;
    this._bossNameText = this._bossContainer.getByName('bossName') as Phaser.GameObjects.Text;
    this._bossHpText = this._bossContainer.getByName('bossHp') as Phaser.GameObjects.Text;
    this._bossContainer.setVisible(false);

    eventMgr.on(GameEvent.PEACH_CHANGED, this._peachHandler);
    eventMgr.on(GameEvent.MONK_DAMAGED, this._hpHandler);
    eventMgr.on(GameEvent.WAVE_START, this._waveHandler);
    eventMgr.on(GameEvent.KILL_CHANGED, this._killHandler);
    eventMgr.on(GameEvent.FACTION_CHANGED, this._factionHandler);
    eventMgr.on(GameEvent.ENEMY_SPAWNED, this._enemySpawnedHandler);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this._sceneUpdateHandler);
  }

  destroy(): void {
    eventMgr.off(GameEvent.PEACH_CHANGED, this._peachHandler);
    eventMgr.off(GameEvent.MONK_DAMAGED, this._hpHandler);
    eventMgr.off(GameEvent.WAVE_START, this._waveHandler);
    eventMgr.off(GameEvent.KILL_CHANGED, this._killHandler);
    eventMgr.off(GameEvent.FACTION_CHANGED, this._factionHandler);
    eventMgr.off(GameEvent.ENEMY_SPAWNED, this._enemySpawnedHandler);
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this._sceneUpdateHandler);
    this.container.destroy(true);
  }

  private _createText(x: number, y: number, value: string, color: string, fontSize: number): Phaser.GameObjects.Text {
    return createCjkText(this.scene, x, y, value, {
      fontSize: `${fontSize}px`,
      color,
      fontStyle: 'bold',
    });
  }

  private _createPauseButton(): Phaser.GameObjects.Text {
    const button = createCjkText(this.scene, 678, 74, '暂停', {
      fontSize: '21px',
      color: '#101826',
      fontStyle: 'bold',
      backgroundColor: '#f0c15a',
      padding: { x: 18, y: 12 },
    });
    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => this._togglePause());
    return button;
  }

  private _togglePause(): void {
    if (gameMgr.state === GameState.PAUSED) {
      gameMgr.setState(GameState.PLAYING);
      this._pauseText.setText('暂停');
      return;
    }

    if (gameMgr.state === GameState.PLAYING) {
      gameMgr.setState(GameState.PAUSED);
      this._pauseText.setText('继续');
    }
  }

  private _createBossBar(): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);

    const panel = this.scene.add.graphics();
    panel.fillStyle(0x1b1014, 0.92);
    panel.fillRoundedRect(92, 142, 566, 58, 8);
    panel.lineStyle(2, 0xffd36a, 0.55);
    panel.strokeRoundedRect(92, 142, 566, 58, 8);

    const nameText = this._createText(118, 151, '妖王来袭', '#ffd36a', 20);
    nameText.setName('bossName');
    const hpText = this._createText(540, 151, '0/0', '#ffe9a8', 17);
    hpText.setName('bossHp');

    const barBg = this.scene.add.graphics();
    barBg.setName('bossBarBg');
    const barFill = this.scene.add.graphics();
    barFill.setName('bossBarFill');

    container.add([panel, nameText, hpText, barBg, barFill]);
    return container;
  }

  private _showBoss(enemy: Enemy): void {
    this._bossEnemy = enemy;
    this._bossNameText.setText(`妖王来袭 ${enemy.name}`);
    this._bossContainer.setVisible(true);
    this._bossContainer.setAlpha(1);
    this._bossContainer.setScale(1);
    this._updateBossBar();

    const warning = createCjkText(this.scene, 375, 248, `妖王来袭：${enemy.name}`, {
      fontSize: '44px',
      color: '#ffd36a',
      fontStyle: 'bold',
      stroke: '#4b1111',
      strokeThickness: 8,
    });
    warning.setOrigin(0.5);
    warning.setDepth(220);
    warning.setAlpha(0);
    warning.setScale(0.82);

    this.scene.tweens.add({
      targets: warning,
      alpha: 1,
      scale: 1,
      duration: 220,
      ease: 'Back.Out',
      yoyo: true,
      hold: 760,
      onComplete: () => warning.destroy(),
    });

    this.scene.tweens.add({
      targets: this._bossContainer,
      scaleX: { from: 0.96, to: 1 },
      scaleY: { from: 0.96, to: 1 },
      duration: 240,
      ease: 'Back.Out',
    });
  }

  private _updateBossBar(): void {
    const boss = this._bossEnemy;
    if (!boss || !boss.alive || boss.currentHp <= 0) {
      this._bossEnemy = null;
      this._bossContainer.setVisible(false);
      return;
    }

    const ratio = boss.maxHp > 0 ? Phaser.Math.Clamp(boss.currentHp / boss.maxHp, 0, 1) : 0;
    const x = 118;
    const y = 181;
    const w = 514;
    const h = 10;

    this._bossHpText.setText(`${Math.ceil(boss.currentHp)}/${boss.maxHp}`);
    this._bossBarBg.clear();
    this._bossBarBg.fillStyle(0x351922, 1);
    this._bossBarBg.fillRoundedRect(x, y, w, h, 4);
    this._bossBarFill.clear();
    this._bossBarFill.fillStyle(ratio > 0.35 ? 0xd83b42 : 0xff8f3d, 1);
    this._bossBarFill.fillRoundedRect(x, y, w * ratio, h, 4);
  }
}
