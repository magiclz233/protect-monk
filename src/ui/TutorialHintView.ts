import Phaser from 'phaser';
import { eventMgr, GameEvent } from '../core/EventManager';
import { createCjkText } from '../core/TextStyles';
import { CardData, CardType, ItemId } from '../types';
import { BATTLE_UI } from './BattleUiPrimitives';

const ITEM_HINTS: Partial<Record<ItemId, string>> = {
  [ItemId.AXE]: '开山斧拖到灰色山石锁定格，可解锁新布阵位置。',
  [ItemId.ELIXIR]: '九转仙丹拖到英雄身上，可直接提升英雄等级。',
  [ItemId.UNIVERSAL_SHARD]: '通用碎片拖到棋盘上已有英雄碎片堆，可补 1 片并触发合成。',
  [ItemId.HEADBAND]: '紧箍咒拖到棋盘上，可让场上妖怪减速。',
  [ItemId.VASE]: '玉净瓶拖到棋盘上，可让唐僧最大血量和当前血量各加 2。',
};

export class TutorialHintView {
  readonly container: Phaser.GameObjects.Container;

  private readonly _text: Phaser.GameObjects.Text;
  private _summoned = false;
  private _placed = false;
  private _merged = false;
  private _heroActivated = false;
  private _itemUsed = false;
  private _hideEvent: Phaser.Time.TimerEvent | null = null;

  private readonly _summonHandler = (cards: CardData[]): void => this._onSummon(cards);
  private readonly _unitPlacedHandler = (): void => this._onUnitPlaced();
  private readonly _unitMergedHandler = (): void => this._onUnitMerged();
  private readonly _heroActivatedHandler = (): void => this._onHeroActivated();
  private readonly _itemUsedHandler = (): void => this._onItemUsed();
  private readonly _waveStartHandler = (wave: number): void => this._onWaveStart(wave);

  constructor(private readonly scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(105);

    const bg = scene.add.graphics();
    bg.fillStyle(0x0d1424, 0.94);
    bg.fillRoundedRect(58, 790, 634, 44, 10);
    bg.lineStyle(2, BATTLE_UI.jadeLight, 0.42);
    bg.strokeRoundedRect(58, 790, 634, 44, 10);

    this._text = createCjkText(scene, 375, 812, '点击「召唤」，再把小兵卡拖到青绿色可布阵格。', {
      fontSize: '18px',
      color: '#f7f1d0',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 590, useAdvancedWrap: true },
    });
    this._text.setOrigin(0.5);

    this.container.add([bg, this._text]);

    eventMgr.on(GameEvent.SUMMON_REFRESH, this._summonHandler);
    eventMgr.on(GameEvent.UNIT_PLACED, this._unitPlacedHandler);
    eventMgr.on(GameEvent.UNIT_MERGED, this._unitMergedHandler);
    eventMgr.on(GameEvent.HERO_ACTIVATED, this._heroActivatedHandler);
    eventMgr.on(GameEvent.ITEM_USED, this._itemUsedHandler);
    eventMgr.on(GameEvent.WAVE_START, this._waveStartHandler);
    this._scheduleHide(5600);
  }

  destroy(): void {
    eventMgr.off(GameEvent.SUMMON_REFRESH, this._summonHandler);
    eventMgr.off(GameEvent.UNIT_PLACED, this._unitPlacedHandler);
    eventMgr.off(GameEvent.UNIT_MERGED, this._unitMergedHandler);
    eventMgr.off(GameEvent.HERO_ACTIVATED, this._heroActivatedHandler);
    eventMgr.off(GameEvent.ITEM_USED, this._itemUsedHandler);
    eventMgr.off(GameEvent.WAVE_START, this._waveStartHandler);
    this._hideEvent?.remove(false);
    this.container.destroy(true);
  }

  private _onSummon(cards: CardData[]): void {
    this._summoned = true;
    const soldierCount = cards.filter(card => card.type === CardType.SOLDIER).length;
    const shardCount = cards.filter(card => card.type === CardType.HERO_SHARD).length;
    const item = cards.find(card => card.type === CardType.ITEM && card.itemId);

    if (soldierCount >= 2) {
      this._setText('优先把同名同级小兵拖到同一个格子，两个会合成升一级。');
      return;
    }
    if (shardCount > 0) {
      this._setText('道具和英雄碎片会先进仓库；拖英雄碎片到空格，数量够就直接合成英雄。');
      return;
    }
    if (item?.itemId) {
      this._setText(ITEM_HINTS[item.itemId] ?? '道具卡拖到对应目标格即可生效。');
      return;
    }

    this._setText('把卡牌拖到青绿色可布阵格；红金色路线和灰色山石不能放置。');
  }

  private _onUnitPlaced(): void {
    if (this._placed) return;
    this._placed = true;
    this._setText('放置成功！继续召唤同名同级小兵，拖到它身上就能合成。');
  }

  private _onUnitMerged(): void {
    if (this._merged) return;
    this._merged = true;
    this._setText('合成成功！高阶小兵攻击更强，继续合成能稳住后面波次。');
  }

  private _onHeroActivated(): void {
    if (this._heroActivated) return;
    this._heroActivated = true;
    this._setText('英雄激活！英雄会攻击并通过战斗经验升级。');
  }

  private _onItemUsed(): void {
    if (this._itemUsed) return;
    this._itemUsed = true;
    this._setText('道具已生效。后续可用开山斧扩地、紧箍咒控场、玉净瓶守护唐僧。');
  }

  private _onWaveStart(wave: number): void {
    if (wave === 2 && !this._merged) {
      this._setText('第 2 波开始了：尽量把同名同级小兵拖到同格，尽快合成 Lv2。');
    }
    if (wave === 3 && !this._heroActivated) {
      this._setText('第 3 波前争取凑齐悟空碎片，从仓库拖到空格即可合成上阵。');
    }
  }

  private _setText(text: string): void {
    this._text.setText(text);
    this.scene.tweens.killTweensOf(this.container);
    this.container.setAlpha(1);
    this.container.setVisible(true);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0.88,
      duration: 160,
      yoyo: true,
    });
    this._scheduleHide();
  }

  private _scheduleHide(delay = 4200): void {
    this._hideEvent?.remove(false);
    this._hideEvent = this.scene.time.delayedCall(delay, () => {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        duration: 260,
        onComplete: () => this.container.setVisible(false),
      });
    });
  }
}
