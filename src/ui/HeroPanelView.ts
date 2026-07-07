import Phaser from 'phaser';
import { eventMgr, GameEvent } from '../core/EventManager';
import { createCjkText } from '../core/TextStyles';
import { Hero } from '../entities/Hero';

export class HeroPanelView {
  readonly container: Phaser.GameObjects.Container;

  private _selectedHero: Hero | null = null;
  private readonly _nameText: Phaser.GameObjects.Text;
  private readonly _statsText: Phaser.GameObjects.Text;
  private readonly _upgradeBg: Phaser.GameObjects.Graphics;
  private readonly _upgradeText: Phaser.GameObjects.Text;
  private readonly _tipText: Phaser.GameObjects.Text;
  private readonly _closeBg: Phaser.GameObjects.Graphics;
  private readonly _closeText: Phaser.GameObjects.Text;

  private readonly _heroSelectedHandler = (hero: Hero): void => this.selectHero(hero);
  private readonly _heroLevelHandler = (hero: Hero): void => {
    if (hero === this._selectedHero) this._refresh();
  };

  constructor(private readonly scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(95);
    this.container.setVisible(false);

    const bg = scene.add.graphics();
    bg.fillStyle(0x101826, 0.92);
    bg.fillRoundedRect(24, 988, 702, 114, 8);
    bg.lineStyle(2, 0xf0c15a, 0.4);
    bg.strokeRoundedRect(24, 988, 702, 114, 8);

    this._nameText = createCjkText(scene, 48, 1012, '', {
      fontSize: '22px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });

    this._statsText = createCjkText(scene, 48, 1046, '', {
      fontSize: '18px',
      color: '#f7f1d0',
      lineSpacing: 8,
    });

    this._upgradeBg = scene.add.graphics();
    this._upgradeText = createCjkText(scene, 626, 1044, '', {
      fontSize: '20px',
      color: '#101826',
      fontStyle: 'bold',
      align: 'center',
    });
    this._upgradeText.setOrigin(0.5);
    this._upgradeText.setInteractive({ useHandCursor: true });
    this._upgradeText.on('pointerdown', () => this._tryUpgrade());

    this._tipText = createCjkText(scene, 458, 1084, '', {
      fontSize: '16px',
      color: '#ffb0b0',
    });
    this._tipText.setOrigin(0.5);

    this._closeBg = scene.add.graphics();
    this._closeBg.fillStyle(0x31496c, 0.96);
    this._closeBg.fillRoundedRect(680, 998, 34, 34, 8);
    this._closeBg.lineStyle(1.5, 0xb8d8ff, 0.55);
    this._closeBg.strokeRoundedRect(680, 998, 34, 34, 8);

    this._closeText = createCjkText(scene, 697, 1015, '×', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this._closeText.setOrigin(0.5);
    this._closeText.setInteractive({ useHandCursor: true });
    this._closeText.on('pointerdown', () => this.hide());

    this.container.add([
      bg,
      this._nameText,
      this._statsText,
      this._upgradeBg,
      this._upgradeText,
      this._tipText,
      this._closeBg,
      this._closeText,
    ]);

    eventMgr.on(GameEvent.HERO_SELECTED, this._heroSelectedHandler);
    eventMgr.on(GameEvent.HERO_LEVEL_UP, this._heroLevelHandler);
  }

  destroy(): void {
    eventMgr.off(GameEvent.HERO_SELECTED, this._heroSelectedHandler);
    eventMgr.off(GameEvent.HERO_LEVEL_UP, this._heroLevelHandler);
    this.container.destroy(true);
  }

  selectHero(hero: Hero): void {
    this._selectedHero = hero;
    this.container.setVisible(true);
    this._refresh();
  }

  hide(): void {
    this.container.setVisible(false);
    this._selectedHero = null;
  }

  private _tryUpgrade(): void {
    this._showTip('英雄只通过战斗经验升级');
  }

  private _refresh(): void {
    const hero = this._selectedHero;
    if (!hero) return;

    this._nameText.setText(`${hero.unitName}  Lv${hero.level}/${hero.maxLevel}`);
    this._statsText.setText(`攻击 ${hero.attack}  攻速 ${hero.attackSpeed.toFixed(2)}  范围 ${hero.attackRange}\n经验 ${hero.exp}`);

    const canUpgrade = false;
    this._upgradeBg.clear();
    this._upgradeBg.fillStyle(canUpgrade ? 0xf0c15a : 0x667080, canUpgrade ? 1 : 0.72);
    this._upgradeBg.fillRoundedRect(552, 1012, 148, 64, 8);
    this._upgradeText.setAlpha(canUpgrade ? 1 : 0.65);
    this._upgradeText.setText(hero.level >= hero.maxLevel ? '满级' : '经验\n升级');
  }

  private _showTip(text: string): void {
    this._tipText.setText(text);
    this.scene.time.delayedCall(1400, () => {
      if (this._tipText.text === text) {
        this._tipText.setText('');
      }
    });
  }
}
