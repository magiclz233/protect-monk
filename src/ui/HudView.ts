import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { eventMgr, GameEvent } from '../core/EventManager';
import { createCjkText } from '../core/TextStyles';
import { uiIconKey } from '../render/AssetKeys';
import { Enemy } from '../entities/Enemy';
import { EnemyType, Faction, GameState } from '../types';
import { UI_TOKENS, drawLacquerPanel, createRoundIconButton, playUiPress } from './DesignTokens';

const FACTION_NAMES: Record<Faction, string> = {
  [Faction.SHITU]: '师徒羁绊',
  [Faction.XIANFO]: '仙佛羁绊',
  [Faction.YAOWANG]: '妖王羁绊',
};

/**
 * 战斗 HUD（设计稿 battle-hud）：
 * 顶部一行 = 仙桃 / 血量 / 波次胶囊 + 暂停圆钮；
 * 第二行 = 羁绊状态胶囊 + 击杀数。棋盘不再被大面板遮挡。
 */
export class HudView {
  readonly container: Phaser.GameObjects.Container;

  private readonly _peachText: Phaser.GameObjects.Text;
  private readonly _hpText: Phaser.GameObjects.Text;
  private readonly _waveText: Phaser.GameObjects.Text;
  private readonly _killText: Phaser.GameObjects.Text;
  private readonly _factionText: Phaser.GameObjects.Text;
  private readonly _pauseIcon: Phaser.GameObjects.Image;
  private readonly _bossContainer: Phaser.GameObjects.Container;
  private readonly _bossBarBg: Phaser.GameObjects.Graphics;
  private readonly _bossBarFill: Phaser.GameObjects.Graphics;
  private readonly _bossNameText: Phaser.GameObjects.Text;
  private readonly _bossHpText: Phaser.GameObjects.Text;
  private _bossEnemy: Enemy | null = null;

  private readonly _peachHandler = (peach: number): void => {
    this._peachText.setText(`${peach}`);
  };
  private readonly _hpHandler = (hp: number): void => {
    this._hpText.setText(`${hp}/${gameMgr.maxMonkHp}`);
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

    // ---- 顶部一行：三个资源胶囊 ----
    const peachChip = this._createResourceChip(20, 20, uiIconKey('peach'), `${gameMgr.peach}`, 'default');
    const hpChip = this._createResourceChip(196, 20, uiIconKey('hp'), `${gameMgr.monkHp}/${gameMgr.maxMonkHp}`, 'hp');
    this._peachText = peachChip.getByName('chipValue') as Phaser.GameObjects.Text;
    this._hpText = hpChip.getByName('chipValue') as Phaser.GameObjects.Text;

    // 波次胶囊：深绿底金字（设计稿 wave-chip）
    const waveG = scene.add.graphics();
    waveG.fillStyle(0x051512, 0.35);
    waveG.fillRoundedRect(370, 23, 158, 56, 28);
    waveG.fillStyle(UI_TOKENS.pine900, 0.94);
    waveG.fillRoundedRect(370, 20, 158, 56, 28);
    waveG.lineStyle(2, UI_TOKENS.gold, 0.85);
    waveG.strokeRoundedRect(370, 20, 158, 56, 28);
    const waveIcon = scene.add.image(402, 48, uiIconKey('wave'));
    waveIcon.setDisplaySize(40, 40);
    this._waveText = createCjkText(scene, 430, 48, `第 ${gameMgr.waveNumber} 波`, {
      fontSize: '24px',
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
    });
    this._waveText.setOrigin(0, 0.5);

    // ---- 暂停圆钮（设计稿 round-icon） ----
    const pauseButton = createRoundIconButton(scene, 690, 48, uiIconKey('pause'), 62, () => this._togglePause());
    this._pauseIcon = pauseButton.getByName('roundIcon') as Phaser.GameObjects.Image;
    this.container.add([peachChip, hpChip, waveG, waveIcon, this._waveText, pauseButton]);

    // ---- 第二行：羁绊 pill + 击杀 ----
    const pillG = scene.add.graphics();
    pillG.fillStyle(UI_TOKENS.pine950, 0.82);
    pillG.fillRoundedRect(20, 92, 240, 44, 22);
    this._factionText = createCjkText(scene, 44, 114, '羁绊 未激活', {
      fontSize: '21px',
      color: UI_TOKENS.textOnDark,
    });
    this._factionText.setOrigin(0, 0.5);

    this._killText = createCjkText(scene, 730, 114, `击杀 ${gameMgr.totalKills}`, {
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this._killText.setOrigin(1, 0.5);
    this._killText.setShadow(0, 2, '#173f35', 2, true, true);

    this.container.add([pillG, this._factionText, this._killText]);

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

  /** 资源胶囊：纸白底 + 图标 + 数值（设计稿 hud-chip） */
  private _createResourceChip(x: number, y: number, iconKey: string, value: string, variant: 'default' | 'hp'): Phaser.GameObjects.Container {
    const w = 160, h = 56;
    const container = this.scene.add.container(0, 0);
    const g = this.scene.add.graphics();
    g.fillStyle(0x3f301d, 0.25);
    g.fillRoundedRect(x, y + 3, w, h, h / 2);
    g.fillStyle(UI_TOKENS.paperLight, 0.95);
    g.fillRoundedRect(x, y, w, h, h / 2);
    g.lineStyle(2, 0xaa8b54, 0.9);
    g.strokeRoundedRect(x, y, w, h, h / 2);

    const icon = this.scene.add.image(x + 32, y + h / 2, iconKey);
    icon.setDisplaySize(42, 42);

    const text = createCjkText(this.scene, x + 60, y + h / 2, value, {
      fontSize: '25px',
      fontStyle: 'bold',
      color: variant === 'hp' ? '#8e2f25' : '#252a26',
    });
    text.setOrigin(0, 0.5);
    text.setName('chipValue');

    container.add([g, icon, text]);
    return container;
  }

  private _togglePause(): void {
    if (gameMgr.state === GameState.PAUSED) {
      gameMgr.setState(GameState.PLAYING);
      this._pauseIcon?.setTexture(uiIconKey('pause'));
      return;
    }

    if (gameMgr.state === GameState.PLAYING) {
      gameMgr.setState(GameState.PAUSED);
      this._pauseIcon?.setTexture(uiIconKey('play'));
    }
  }

  private _createBossBar(): Phaser.GameObjects.Container {    const container = this.scene.add.container(0, 0);

    const panel = this.scene.add.graphics();
    drawLacquerPanel(panel, 92, 150, 566, 62, {
      fill: 0x2a1512,
      stroke: UI_TOKENS.goldLight,
      strokeAlpha: 0.7,
      radius: 14,
    });

    const nameText = createCjkText(this.scene, 118, 162, '妖王来袭', {
      fontSize: '23px',
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });
    nameText.setName('bossName');
    const hpText = createCjkText(this.scene, 634, 162, '0/0', {
      fontSize: '21px',
      color: '#ffe9a8',
      fontStyle: 'bold',
    });
    hpText.setOrigin(1, 0);
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
      color: UI_TOKENS.textGoldOnDark,
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
    const y = 194;
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
