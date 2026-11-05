import Phaser from 'phaser';
import { eventMgr, GameEvent } from '../core/EventManager';
import { createCjkText } from '../core/TextStyles';
import { gameMgr } from '../core/GameManager';
import { Hero } from '../entities/Hero';
import { ExperienceSystem } from '../systems/ExperienceSystem';
import { drawLacquerPanel, UI_TOKENS , UI_TYPE } from './DesignTokens';

export class HeroPanelView {
  readonly container: Phaser.GameObjects.Container;

  private _selectedHero: Hero | null = null;
  private readonly _nameText: Phaser.GameObjects.Text;
  private readonly _statsText: Phaser.GameObjects.Text;
  private readonly _rangeText: Phaser.GameObjects.Text;
  private readonly _mergeText: Phaser.GameObjects.Text;
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
    // 半层面板上移到棋盘下方、召唤栏上方，避免把朱砂召唤主按钮切成两半
    drawLacquerPanel(bg, 24, 838, 702, 168, { radius: 12 });

    this._nameText = createCjkText(scene, 48, 862, '', {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textGoldOnDark,
      fontStyle: 'bold',
    });

    this._statsText = createCjkText(scene, 48, 892, '', {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textOnDark,
      lineSpacing: 4,
    });

    this._rangeText = createCjkText(scene, 48, 948, '', {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textOnDark,
    });

    this._mergeText = createCjkText(scene, 48, 978, '', {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textMutedOnDark,
    });

    this._upgradeBg = scene.add.graphics();
    this._upgradeText = createCjkText(scene, 626, 894, '', {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textOnPaper,
      fontStyle: 'bold',
      align: 'center',
    });
    this._upgradeText.setOrigin(0.5);
    this._upgradeText.setInteractive({ useHandCursor: true });
    this._upgradeText.on('pointerdown', () => this._tryUpgrade());

    this._tipText = createCjkText(scene, 458, 934, '', {
      fontSize: UI_TYPE.small,
      color: '#e88a65',
    });
    this._tipText.setOrigin(0.5);

    this._closeBg = scene.add.graphics();
    this._closeBg.fillStyle(UI_TOKENS.pine900, 0.96);
    this._closeBg.fillRoundedRect(680, 848, 34, 34, 8);
    this._closeBg.lineStyle(1.5, UI_TOKENS.gold, 0.6);
    this._closeBg.strokeRoundedRect(680, 848, 34, 34, 8);

    this._closeText = createCjkText(scene, 697, 865, '×', {
      fontSize: UI_TYPE.label,
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
    });
    this._closeText.setOrigin(0.5);
    this._closeText.setInteractive({ useHandCursor: true });
    this._closeText.on('pointerdown', () => this.hide());

    this.container.add([
      bg,
      this._nameText,
      this._statsText,
      this._rangeText,
      this._mergeText,
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
    const hero = this._selectedHero;
    if (!hero) return;
    if (hero.level >= hero.maxLevel) {
      this._showTip('已达满级');
      return;
    }
    const cost = ExperienceSystem.getInstance().getPeachCost(hero.level);
    if (gameMgr.consumePeach(cost)) {
      hero.levelUp();
      this._showTip(`消耗 ${cost} 仙桃，升级成功`);
    } else {
      this._showTip(`仙桃不足，升级需要 ${cost}`);
    }
  }

  private _refresh(): void {
    const hero = this._selectedHero;
    if (!hero) return;

    this._nameText.setText(`${hero.unitName}  Lv${hero.level}/${hero.maxLevel}`);
    this._statsText.setText(`攻击 ${hero.attack}  攻速 ${hero.attackSpeed.toFixed(2)}\n经验 ${hero.exp}`);

    // 两行说明只取实体已有属性，取不到时给文字兜底，不编造数值
    const range = Number.isFinite(hero.attackRange) ? `${hero.attackRange} 格` : '未提供';
    this._rangeText.setText(`攻击范围：${range}`);

    const maxLevel = Number.isFinite(hero.maxLevel) ? hero.maxLevel : null;
    const reachedMax = maxLevel !== null && Number.isFinite(hero.level) && hero.level >= maxLevel;
    let mergeTarget: string;
    if (maxLevel === null) {
      mergeTarget = '与同名英雄相邻可合成';
    } else if (reachedMax) {
      mergeTarget = `已达上限 Lv${maxLevel}，无需合成`;
    } else {
      mergeTarget = `与同名英雄合成升级（上限 Lv${maxLevel}）`;
    }
    this._mergeText.setText(`合成目标：${mergeTarget}`);

    const canUpgrade = hero.level < hero.maxLevel;
    this._upgradeBg.clear();
    this._upgradeBg.fillStyle(canUpgrade ? UI_TOKENS.gold : 0x8a8375, canUpgrade ? 1 : 0.72);
    this._upgradeBg.fillRoundedRect(552, 862, 148, 64, 8);
    this._upgradeBg.lineStyle(2, canUpgrade ? UI_TOKENS.goldLight : 0xa79e8c, canUpgrade ? 0.7 : 0.5);
    this._upgradeBg.strokeRoundedRect(552, 862, 148, 64, 8);
    this._upgradeText.setAlpha(canUpgrade ? 1 : 0.65);
    this._upgradeText.setText(
      hero.level >= hero.maxLevel ? '满级' : `仙桃\n${ExperienceSystem.getInstance().getPeachCost(hero.level)}`,
    );
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
