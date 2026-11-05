import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { eventMgr, GameEvent } from '../core/EventManager';
import { getSoldierConfig } from '../config/SoldierConfig';
import { getHeroConfig } from '../config/HeroConfig';
import { Hero } from '../entities/Hero';
import { Soldier } from '../entities/Soldier';
import { GridManager } from '../grid/GridManager';
import { AdSystem } from '../systems/AdSystem';
import { BattleSystem } from '../systems/BattleSystem';
import { createHeroFromCard, createSoldierFromCard } from '../systems/BoardCardUtils';
import {
  canPlaceHeroShardOnCell,
  canUseUniversalShardOnCell,
  placeHeroShardOnBoard,
  placeUniversalShardOnBoard,
} from '../systems/HeroShardMergeSystem';
import { canMergeHeroForUpgrade } from '../systems/HeroUpgradeLogic';
import { ItemSystem } from '../systems/ItemSystem';
import { MergeSystem } from '../systems/MergeSystem';
import { SummonSystem } from '../systems/SummonSystem';
import { AttackType, CardData, CardType, CellState, HeroRarity, ItemId, SoldierRank } from '../types';
import { createCjkText } from '../core/TextStyles';
import { DragMediator, CardSlotDropTarget, InventoryDropTarget } from './DragMediator';
import { UI_TOKENS, UI_TYPE, drawLacquerPanel, playUiPress } from './DesignTokens';
import { createCardIconImage } from './CardIconFactory';
import { FEEDBACK_TEXT } from './FeedbackOverlay';
import { uiIconKey } from '../render/AssetKeys';
import { isReducedMotionEnabled } from './JourneyRewardIcons';

interface CardView {
  card: CardData;
  container: Phaser.GameObjects.Container;
  hitZone: Phaser.GameObjects.Zone;
  slotIndex: number;
  homeX: number;
  homeY: number;
  dragOffsetX: number;
  dragOffsetY: number;
  selectedRing: Phaser.GameObjects.Graphics;
  dragged: boolean;
}

const SLOT_COUNT = 5;
const CARD_W = 100;
// 卡面需容纳：真实图标 + 主名 + 第二行用途小字（字号 ≥22px）
const CARD_H = 148;
const SLOT_GAP = 10;
const PANEL_X = 16;
const PANEL_Y = 1090;
const PANEL_W = 718;
const PANEL_H = 178;
const SUMMON_BUTTON_X = 604;
const SUMMON_BUTTON_Y = PANEL_Y + 22;
const SUMMON_BUTTON_W = 116;
// 主按钮需容纳：仙桃图标 + 「召唤」+ 费用／还差仙桃小字
const SUMMON_BUTTON_H = 116;

// 卡槽 / 仓库满的统一提示文案（与 InventoryBarView 保持一致）
const TIP_CARD_SLOT_FULL = '卡槽已满，先上阵或入库';
const TIP_INVENTORY_FULL = '仓库已满，先扩容或腾出空位';

export class SummonPanel implements CardSlotDropTarget {
  readonly container: Phaser.GameObjects.Container;

  private readonly _cards: Array<CardView | null> = Array(SLOT_COUNT).fill(null);
  private readonly _slotPositions: Array<{ x: number; y: number }> = [];
  private readonly _highlight: Phaser.GameObjects.Graphics;
  private readonly _panelHighlight: Phaser.GameObjects.Graphics;
  private readonly _buttonBox: Phaser.GameObjects.Container;
  private readonly _buttonBg: Phaser.GameObjects.Graphics;
  private readonly _buttonText: Phaser.GameObjects.Text;
  private readonly _buttonCostText: Phaser.GameObjects.Text;
  private readonly _peachIcon: Phaser.GameObjects.Image | null;
  private readonly _tipText: Phaser.GameObjects.Text;
  private readonly _showAdButtons: boolean;
  private _destroyed = false;
  private _rewardPending = false;
  private _rewardRequestId = 0;
  private _summonEnabled = true;
  private _tipTimer?: Phaser.Time.TimerEvent;
  private _lastTipAt = -1000;
  private _selectedCardView: CardView | null = null;
  private readonly _reducedMotion = isReducedMotionEnabled();

  private readonly _summonRefreshHandler = (cards: CardData[]): void => this._renderCards(cards);
  private readonly _boardPointerHandler = (pointer: Phaser.Input.Pointer): void => this._handleBoardPointer(pointer);
  private readonly _peachHandler = (): void => this._refreshButtonState();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly gridMgr: GridManager,
    private readonly battleSystem: BattleSystem,
    private readonly dragMediator: DragMediator,
  ) {
    const adSystem = AdSystem.getInstance();
    this._showAdButtons = adSystem.hasRewardedVideo('extraSummon') || adSystem.hasRewardedVideo('universalShard');
    this.container = scene.add.container(0, 0);
    this.container.setDepth(90);

    // 向 Mediator 注册为卡槽放置目标
    this.dragMediator.registerCardSlotTarget(this);

    this._highlight = scene.add.graphics();
    this._highlight.setDepth(80);
    this._highlight.setVisible(false);
    // 卡槽区域高亮：仓库 / 卡槽满时提示「卡还在卡槽」
    this._panelHighlight = scene.add.graphics();
    this._panelHighlight.setDepth(95);
    this._panelHighlight.setVisible(false);

    this._drawPanel();
    // 召唤主按钮：朱砂主按钮（容器居中，便于统一按压反馈）
    this._buttonBox = this.scene.add.container(
      SUMMON_BUTTON_X + SUMMON_BUTTON_W / 2,
      SUMMON_BUTTON_Y + SUMMON_BUTTON_H / 2,
    );
    this._buttonBg = this.scene.add.graphics();
    this._peachIcon = this._createPeachIcon();
    this._buttonText = this._createSummonButtonText();
    this._buttonCostText = this._createSummonCostText();
    const buttonParts: Phaser.GameObjects.GameObject[] = [this._buttonBg, this._buttonText, this._buttonCostText];
    if (this._peachIcon) buttonParts.splice(1, 0, this._peachIcon);
    this._buttonBox.add(buttonParts);
    // 提示横幅：屏幕中央浮动 Toast，不跟底部 UI 竞争空间
    this._tipText = createCjkText(scene, 375, 620, '', {
      fontSize: UI_TYPE.small,
      color: '#252a26',
      fontStyle: 'bold',
      backgroundColor: '#d8a64a',
      padding: { x: 24, y: 12 },
    });
    this._tipText.setOrigin(0.5);
    this._tipText.setDepth(300);
    this._tipText.setAlpha(0);
    this.container.add([this._buttonBox, this._tipText]);
    this.container.add(this._createButtonHitArea(
      SUMMON_BUTTON_X,
      SUMMON_BUTTON_Y,
      SUMMON_BUTTON_W,
      SUMMON_BUTTON_H,
      () => playUiPress(this.scene, this._buttonBox, () => this._summon()),
    ));
    if (this._showAdButtons) {
      this._drawAdRewardButtons();
    }

    eventMgr.on(GameEvent.SUMMON_REFRESH, this._summonRefreshHandler);
    eventMgr.on(GameEvent.PEACH_CHANGED, this._peachHandler);
    this.scene.input.on('pointerdown', this._boardPointerHandler);
    this._refreshButtonState();
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._rewardPending = false;
    this._rewardRequestId++;
    this._tipTimer?.remove(false);
    this._tipTimer = undefined;
    this.scene.tweens.killTweensOf(this._tipText);
    this.scene.tweens.killTweensOf(this._panelHighlight);
    this.scene.input.off('pointerdown', this._boardPointerHandler);
    this.dragMediator.unregister(this);
    eventMgr.off(GameEvent.SUMMON_REFRESH, this._summonRefreshHandler);
    eventMgr.off(GameEvent.PEACH_CHANGED, this._peachHandler);
    this._highlight.destroy();
    this._panelHighlight.destroy();
    this.container.destroy(true);
  }

  setSummonEnabled(enabled: boolean): void {
    this._summonEnabled = enabled;
    this._refreshButtonState();
  }

  /** 点选卡牌后，再点棋盘即可上阵/合成/使用。 */
  private _handleBoardPointer(pointer: Phaser.Input.Pointer): void {
    const selected = this._selectedCardView;
    if (!selected || this._destroyed || this._isInteractionLocked()) return;

    const x = pointer.worldX ?? pointer.x;
    const y = pointer.worldY ?? pointer.y;
    if (this.containsPoint(x, y)) return;
    if (this._cards.some(view => view && view.hitZone.getBounds().contains(x, y))) return;

    const placed = this._tryPlaceCard(selected, x, y);
    if (placed) this._setSelectedCard(null);
  }

  private _setSelectedCard(cardView: CardView | null): void {
    if (this._selectedCardView && this._selectedCardView !== cardView) {
      this._selectedCardView.selectedRing.clear();
      this._selectedCardView.container.setScale(1);
    }
    this._selectedCardView = cardView;
    if (cardView) {
      const g = cardView.selectedRing;
      g.clear();
      g.lineStyle(4, UI_TOKENS.goldLight, 0.98);
      g.strokeRoundedRect(-3, -3, CARD_W + 6, CARD_H + 6, 12);
      cardView.container.setScale(1.04);
      this._showTip('已选中卡牌，点击棋盘格上阵；再次点卡取消');
    }
  }

  containsPoint(x: number, y: number): boolean {
    return x >= PANEL_X && x <= PANEL_X + PANEL_W && y >= PANEL_Y - 22 && y <= PANEL_Y - 22 + PANEL_H;
  }

  addCard(card: CardData): boolean {
    const slotIndex = this._cards.findIndex(slot => slot === null);
    if (slotIndex < 0) {
      this._showTip(TIP_CARD_SLOT_FULL);
      this._flashPanelHighlight();
      return false;
    }
    this._setCardAtSlot(card, slotIndex);
    this._showTip('卡牌已放入卡槽');
    return true;
  }

  addCardAtPoint(card: CardData, x: number, y: number): boolean {
    const slotIndex = this._getSlotIndexAtPoint(x, y);
    if (slotIndex >= 0 && this._putCardIntoSlot(card, slotIndex)) {
      return true;
    }
    if (this.containsPoint(x, y)) {
      return this.addCard(card);
    }
    return false;
  }

  private _drawPanel(): void {
    const bg = this.scene.add.graphics();
    // 深松绿漆面 dock 承载层
    drawLacquerPanel(bg, PANEL_X, PANEL_Y - 22, PANEL_W, PANEL_H, { radius: 16 });
    bg.fillStyle(UI_TOKENS.gold, 0.06);
    bg.fillRoundedRect(30, PANEL_Y - 8, 560, CARD_H + 16, 10);
    this.container.add(bg);

    const startX = 40;
    for (let i = 0; i < SLOT_COUNT; i++) {
      const x = startX + i * (CARD_W + SLOT_GAP);
      const y = PANEL_Y;
      this._slotPositions.push({ x, y });

      // 空卡槽：比漆面更深的内嵌 + 淡鎏金描边
      const slot = this.scene.add.graphics();
      slot.fillStyle(0x0a231e, 0.9);
      slot.fillRoundedRect(x, y, CARD_W, CARD_H, 10);
      slot.lineStyle(2, UI_TOKENS.gold, 0.25);
      slot.strokeRoundedRect(x, y, CARD_W, CARD_H, 10);
      this.container.add(slot);
    }
  }

  private _createPeachIcon(): Phaser.GameObjects.Image | null {
    const key = uiIconKey('peach');
    if (!this.scene.textures.exists(key)) return null;
    const icon = this.scene.add.image(0, -34, key);
    icon.setDisplaySize(24, 24);
    return icon;
  }

  private _createSummonButtonText(): Phaser.GameObjects.Text {
    const text = createCjkText(this.scene, 0, -8, '召唤', {
      fontSize: UI_TYPE.bodyS,
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
      align: 'center',
    });
    text.setOrigin(0.5);
    return text;
  }

  private _createSummonCostText(): Phaser.GameObjects.Text {
    const text = createCjkText(this.scene, 0, 30, '', {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: SUMMON_BUTTON_W - 8, useAdvancedWrap: true },
      lineSpacing: 2,
    });
    text.setOrigin(0.5);
    return text;
  }

  /** 仓库 / 卡槽满时闪烁高亮当前卡槽区域，明确「卡还留在卡槽」 */
  private _flashPanelHighlight(): void {
    const g = this._panelHighlight;
    g.clear();
    g.fillStyle(UI_TOKENS.cinnabar, 0.1);
    g.fillRoundedRect(PANEL_X, PANEL_Y - 22, PANEL_W, PANEL_H, 16);
    g.lineStyle(4, UI_TOKENS.goldLight, 0.95);
    g.strokeRoundedRect(PANEL_X, PANEL_Y - 22, PANEL_W, PANEL_H, 16);
    g.setAlpha(0);
    g.setVisible(true);
    this.scene.tweens.killTweensOf(g);
    this.scene.tweens.add({
      targets: g,
      alpha: 1,
      duration: 160,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (!this._destroyed) g.setVisible(false);
      },
    });
  }

  private _drawAdRewardButtons(): void {
    if (AdSystem.getInstance().hasRewardedVideo('extraSummon')) {
      this._createAdButton(PANEL_Y + 52, '广告召唤', () => void this._summonByAd());
    }
    if (AdSystem.getInstance().hasRewardedVideo('universalShard')) {
      this._createAdButton(PANEL_Y + 100, '广告碎片', () => void this._grantUniversalShardByAd());
    }
  }

  private _createAdButton(y: number, label: string, onClick: () => void): void {
    const bg = this.scene.add.graphics();
    bg.fillStyle(UI_TOKENS.pine900, 0.96);
    bg.fillRoundedRect(604, y, 116, 38, 8);
    bg.lineStyle(1.5, UI_TOKENS.gold, 0.6);
    bg.strokeRoundedRect(604, y, 116, 38, 8);

    const text = createCjkText(this.scene, 662, y + 19, label, {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
      align: 'center',
    });
    text.setOrigin(0.5);
    const hitArea = this._createButtonHitArea(604, y, 116, 38, onClick);
    this.container.add([bg, text, hitArea]);
  }

  private _summon(): void {
    if (this._isInteractionLocked()) {
      this._showTip('暂停中不能召唤');
      return;
    }
    if (!this._summonEnabled) {
      this._showTip('唐僧进场中，先整理这 5 张卡');
      return;
    }
    const cost = SummonSystem.getInstance().currentCost;
    const missing = Math.max(0, cost - gameMgr.peach);
    if (missing > 0) {
      this._showTip(`还差 ${missing} 仙桃`);
      return;
    }

    const result = SummonSystem.getInstance().summon();
    if (!result) {
      this._showTip(`还差 ${Math.max(0, SummonSystem.getInstance().currentCost - gameMgr.peach)} 仙桃`);
    }
  }

  private async _summonByAd(): Promise<void> {
    if (this._destroyed || this._rewardPending) return;
    if (this._isInteractionLocked()) {
      this._showTip('暂停中不能召唤');
      return;
    }
    if (!this._summonEnabled) {
      this._showTip('唐僧进场中，先整理这 5 张卡');
      return;
    }

    this._rewardPending = true;
    const requestId = ++this._rewardRequestId;
    const ok = await AdSystem.getInstance().showRewardedVideo('extraSummon');
    if (this._destroyed || requestId !== this._rewardRequestId) return;

    this._rewardPending = false;
    if (!ok) {
      this._showTip(FEEDBACK_TEXT.adUnavailable);
      return;
    }
    if (this._isInteractionLocked()) {
      this._showTip('当前状态不能召唤');
      return;
    }
    if (!this._summonEnabled) {
      this._showTip('唐僧进场中，先整理这 5 张卡');
      return;
    }

    SummonSystem.getInstance().summonFree();
    this._showTip('额外召唤完成');
  }

  private async _grantUniversalShardByAd(): Promise<void> {
    if (this._destroyed || this._rewardPending) return;
    if (this._isInteractionLocked()) {
      this._showTip('暂停中不能领取');
      return;
    }
    if (!this._summonEnabled) {
      this._showTip('唐僧进场中，先整理这 5 张卡');
      return;
    }
    if (this._cards.every(card => card !== null)) {
      this._showTip(TIP_CARD_SLOT_FULL);
      return;
    }

    this._rewardPending = true;
    const requestId = ++this._rewardRequestId;
    const ok = await AdSystem.getInstance().showRewardedVideo('universalShard');
    if (this._destroyed || requestId !== this._rewardRequestId) return;

    this._rewardPending = false;
    if (!ok) {
      this._showTip(FEEDBACK_TEXT.adUnavailable);
      return;
    }
    if (this._isInteractionLocked()) {
      this._showTip('当前状态不能领取');
      return;
    }
    if (!this._summonEnabled) {
      this._showTip('唐僧进场中，先整理这 5 张卡');
      return;
    }

    const slotIndex = this._cards.findIndex(card => card === null);
    if (slotIndex < 0) {
      this._showTip(TIP_CARD_SLOT_FULL);
      return;
    }

    const card = SummonSystem.getInstance().createUniversalShardCard();
    this._setCardAtSlot(card, slotIndex);
    this._showTip('获得通用碎片');
  }

  private _renderCards(cards: CardData[]): void {
    this._clearCards();
    cards.slice(0, SLOT_COUNT).forEach((card, index) => {
      this._setCardAtSlot(card, index, true);
    });
    this._showTip('拖拽上阵，或点卡后点棋盘格');
  }

  private _setCardAtSlot(card: CardData, slotIndex: number, animate = false): void {
    const pos = this._slotPositions[slotIndex];
    if (this._cards[slotIndex] === this._selectedCardView) this._selectedCardView = null;
    this._cards[slotIndex]?.container.destroy();
    const cardView = this._createCardView(card, slotIndex, pos.x, pos.y);
    this._cards[slotIndex] = cardView;
    this.container.add(cardView.container);

    if (animate && !this._reducedMotion) {
      cardView.container.setAlpha(0);
      cardView.container.setScale(0.72);
      cardView.container.setAngle(-10);
      this.scene.tweens.add({
        targets: cardView.container,
        alpha: 1,
        scale: 1,
        angle: 0,
        duration: 220,
        delay: slotIndex * 55,
        ease: 'Back.Out',
      });
    }
  }

  private _getSlotIndexAtPoint(x: number, y: number): number {
    return this._slotPositions.findIndex(pos => (
      x >= pos.x && x <= pos.x + CARD_W && y >= pos.y && y <= pos.y + CARD_H
    ));
  }

  private _putCardIntoSlot(card: CardData, slotIndex: number): boolean {
    const target = this._cards[slotIndex];
    if (!target) {
      this._setCardAtSlot(card, slotIndex);
      this._showTip('卡牌已放入卡槽');
      return true;
    }

    if (this._tryMergeCards(card, target)) {
      this._showTip('卡槽内已合成');
      return true;
    }

    this._showTip('该卡槽不能合成');
    return false;
  }

  private _tryMergeCards(source: CardData, target: CardView): boolean {
    if (source.type !== CardType.SOLDIER || target.card.type !== CardType.SOLDIER) return false;
    if (source.soldierType !== target.card.soldierType) return false;

    const sourceRank = source.soldierRank ?? SoldierRank.WHITE;
    const targetRank = target.card.soldierRank ?? SoldierRank.WHITE;
    if (sourceRank !== targetRank || targetRank >= SoldierRank.ORANGE) return false;

    const newRank = (targetRank + 1) as SoldierRank;
    const config = getSoldierConfig(target.card.soldierType!, newRank);
    target.card = {
      ...target.card,
      soldierRank: newRank,
      displayName: config.name,
    };
    this._setCardAtSlot(target.card, target.slotIndex);
    return true;
  }

  private _dropCardViewIntoSlot(cardView: CardView, targetSlotIndex: number): boolean {
    const target = this._cards[targetSlotIndex];
    if (!target) {
      this._cards[cardView.slotIndex] = null;
      this._setCardAtSlot(cardView.card, targetSlotIndex);
      cardView.container.destroy();
      this._showTip('卡牌已移动');
      return true;
    }

    if (this._tryMergeCards(cardView.card, target)) {
      this._removeCard(cardView);
      this._showTip('卡槽内已合成');
      return true;
    }

    const sourceSlotIndex = cardView.slotIndex;
    const targetCard = target.card;
    this._setCardAtSlot(cardView.card, targetSlotIndex);
    this._setCardAtSlot(targetCard, sourceSlotIndex);
    this._showTip('卡牌已交换');
    return true;
  }

  private _createCardView(card: CardData, slotIndex: number, x: number, y: number): CardView {
    const view = this.scene.add.container(x, y);
    // 宣纸卡面：底部厚度阴影 → 纸白主体 → 金褐描边（英雄卡用鎏金）
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x3f301d, 0.35);
    bg.fillRoundedRect(0, 4, CARD_W, CARD_H, 10);
    bg.fillStyle(UI_TOKENS.paperLight, 1);
    bg.fillRoundedRect(0, 0, CARD_W, CARD_H, 10);
    if (card.type === CardType.HERO) {
      bg.lineStyle(2.5, UI_TOKENS.gold, 0.95);
    } else {
      bg.lineStyle(2, 0xb2935b, 0.9);
    }
    bg.strokeRoundedRect(0, 0, CARD_W, CARD_H, 10);

    const icon = createCardIconImage(this.scene, card, 54, 48, 48);
    icon.setPosition(CARD_W / 2, 28);

    // 左上角单字角标：兵 / 魂 / 具（通用碎片为金色「通」），朱砂小字
    const mark = this._getCardTypeMark(card);
    const typeMark = createCjkText(this.scene, 5, 2, mark.text, {
      fontSize: UI_TYPE.small,
      color: mark.color,
      fontStyle: 'bold',
    });
    typeMark.setOrigin(0, 0);

    // 卡面主名必须单行：100px 宽的卡放不下「猪八戒碎片」五个 22px 汉字，
    // 换行会直接压到下方用途小字上。碎片类型已有「魂」角标 + 用途进度，
    // 这里只保留英雄本体名。
    const shortName = card.type === CardType.HERO_SHARD
      ? card.displayName.replace(/碎片$/, '')
      : card.displayName;
    const name = createCjkText(this.scene, CARD_W / 2, 62, shortName, {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textOnPaper,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: CARD_W - 4, useAdvancedWrap: true },
    });
    name.setOrigin(0.5);

    // 第二行用途小字：阶数 / 射程、碎片进度或道具用途（同样保持单行）
    const usage = createCjkText(this.scene, CARD_W / 2, 94, this._getCardUsage(card), {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textMutedOnPaper,
      align: 'center',
      wordWrap: { width: CARD_W - 8, useAdvancedWrap: true },
    });
    usage.setOrigin(0.5, 0);

    const hitZone = this.scene.add.zone(CARD_W / 2, CARD_H / 2, CARD_W, CARD_H);
    hitZone.setOrigin(0.5);
    hitZone.setInteractive({ useHandCursor: true });
    this.scene.input.setDraggable(hitZone);

    const selectedRing = this.scene.add.graphics();
    view.add([bg, icon, typeMark, name, usage, selectedRing, hitZone]);
    view.setSize(CARD_W, CARD_H);

    const cardView: CardView = {
      card,
      container: view,
      hitZone,
      slotIndex,
      homeX: x,
      homeY: y,
      dragOffsetX: 0,
      dragOffsetY: 0,
      selectedRing,
      dragged: false,
    };
    hitZone.on('pointerup', () => {
      if (cardView.dragged) return;
      if (this._isInteractionLocked()) {
        this._showTip('暂停中不能操作卡牌');
        return;
      }
      this._setSelectedCard(this._selectedCardView === cardView ? null : cardView);
    });
    this._bindDrag(cardView);
    return cardView;
  }

  private _bindDrag(cardView: CardView): void {
    cardView.hitZone.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      cardView.dragged = false;
      if (this._isInteractionLocked()) {
        cardView.container.setPosition(cardView.homeX, cardView.homeY);
        this._showTip('暂停中不能操作卡牌');
        return;
      }
      const pointerWorld = this._getPointerWorld(pointer);
      cardView.dragOffsetX = pointerWorld.x - cardView.container.x;
      cardView.dragOffsetY = pointerWorld.y - cardView.container.y;
      this.container.bringToTop(cardView.container);
      cardView.container.setScale(1.04);
    });

    cardView.hitZone.on('drag', (pointer: Phaser.Input.Pointer) => {
      if (this._isInteractionLocked()) return;
      cardView.dragged = true;
      const dropPoint = this._getPointerWorld(pointer);
      cardView.container.setPosition(dropPoint.x - cardView.dragOffsetX, dropPoint.y - cardView.dragOffsetY);
      this._updateHighlight(cardView.card, dropPoint.x, dropPoint.y);
    });

    cardView.hitZone.on('dragend', (pointer: Phaser.Input.Pointer) => {
      this._highlight.setVisible(false);
      if (this._isInteractionLocked()) {
        cardView.container.setScale(1);
        cardView.container.setPosition(cardView.homeX, cardView.homeY);
        this._showTip('暂停中不能操作卡牌');
        return;
      }
      const dropPoint = this._getPointerWorld(pointer);
      cardView.container.setScale(1);
      const placed = this._tryPlaceCard(cardView, dropPoint.x, dropPoint.y);
      if (!placed) {
        cardView.container.setPosition(cardView.homeX, cardView.homeY);
        // 回弹必须有文字反馈：本次放置若未给出具体原因，补一条兜底提示
        if (this.scene.time.now - this._lastTipAt > 80) {
          this._showTip('这里不能放置，请拖到可布阵格或仓库');
        }
      }
    });
  }

  private _getPointerWorld(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    return {
      x: pointer.worldX ?? pointer.x,
      y: pointer.worldY ?? pointer.y,
    };
  }

  private _createButtonHitArea(x: number, y: number, width: number, height: number, onClick: () => void): Phaser.GameObjects.Zone {
    const hitArea = this.scene.add.zone(x + width / 2, y + height / 2, width, height);
    hitArea.setOrigin(0.5);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', onClick);
    return hitArea;
  }

  private _updateHighlight(card: CardData, worldX: number, worldY: number): void {
    const cell = this.gridMgr.worldToCell(worldX, worldY);
    this._highlight.clear();

    if (!cell) {
      this._highlight.setVisible(false);
      return;
    }

    const center = this.gridMgr.cellCenter(cell.row, cell.col);
    const action = this._getCellAction(card, cell.row, cell.col);
    const fill = action === 'merge' ? UI_TOKENS.gold : action === 'place' ? UI_TOKENS.jade : UI_TOKENS.danger;
    const stroke = action === 'merge' ? UI_TOKENS.goldLight : action === 'place' ? UI_TOKENS.jadeLight : UI_TOKENS.cinnabarEdge;
    this._highlight.fillStyle(fill, action === 'invalid' ? 0.18 : 0.28);
    this._highlight.lineStyle(3, stroke, 0.92);
    this._highlight.fillRect(
      center.x - this.gridMgr.cellSize / 2,
      center.y - this.gridMgr.cellSize / 2,
      this.gridMgr.cellSize,
      this.gridMgr.cellSize,
    );
    this._highlight.strokeRect(
      center.x - this.gridMgr.cellSize / 2,
      center.y - this.gridMgr.cellSize / 2,
      this.gridMgr.cellSize,
      this.gridMgr.cellSize,
    );
    this._highlight.setVisible(true);
  }

  private _tryPlaceCard(cardView: CardView, worldX: number, worldY: number): boolean {
    if (this._isInteractionLocked()) {
      this._showTip('暂停中不能操作卡牌');
      return false;
    }

    const slotIndex = this._getSlotIndexAtPoint(worldX, worldY);
    if (slotIndex >= 0 && slotIndex !== cardView.slotIndex) {
      return this._dropCardViewIntoSlot(cardView, slotIndex);
    }

    const inventoryTarget = this.dragMediator.findInventoryTarget(worldX, worldY);
    if (inventoryTarget) {
      if (!inventoryTarget.addCard(cardView.card)) {
        // 仓库已满：卡留在卡槽不清空，统一文案 + 高亮当前卡槽区域
        this._showTip(TIP_INVENTORY_FULL);
        this._flashPanelHighlight();
        return false;
      }
      this._removeCard(cardView);
      this._showTip('卡牌已入库');
      return true;
    }

    const cell = this.gridMgr.worldToCell(worldX, worldY);

    if (cardView.card.type === CardType.ITEM) {
      return this._useItemCard(cardView, cell);
    }

    if (!cell) {
      this._showTip('请拖到棋盘的可布阵格');
      return false;
    }

    if (cardView.card.type === CardType.SOLDIER && cardView.card.soldierType) {
      return this._placeSoldierCard(cardView, cell.row, cell.col);
    }

    if (cardView.card.type === CardType.HERO && cardView.card.heroId) {
      return this._placeHeroCard(cardView, cell.row, cell.col);
    }

    if (cardView.card.type === CardType.HERO_SHARD && cardView.card.heroId) {
      return this._placeHeroShardCard(cardView, cell.row, cell.col);
    }

    this._showTip('这张卡不能放到这里');
    return false;
  }

  private _placeSoldierCard(cardView: CardView, row: number, col: number): boolean {
    if (!cardView.card.soldierType) return false;
    const rank = cardView.card.soldierRank ?? SoldierRank.WHITE;

    const target = this.gridMgr.getCell(row, col)?.occupant;
    if (target instanceof Soldier) {
      const merged = MergeSystem.getInstance().tryMergeSoldierCard(
        this.gridMgr,
        row,
        col,
        cardView.card.soldierType,
        rank,
      );
      if (!merged) {
        this._showTip('只能和同名同级小兵合成');
        return false;
      }

      this._removeCard(cardView);
      this._showTip('小兵已合成');
      return true;
    }

    if (!this.gridMgr.canPlaceUnit(row, col)) {
      this._showTip(this._getCellBlockReason(row, col));
      return false;
    }

    const soldier = createSoldierFromCard(this.scene, cardView.card);
    if (!soldier) return false;
    if (!this.gridMgr.placeUnit(row, col, soldier)) {
      soldier.sprite.destroy();
      this._showTip(this._getCellBlockReason(row, col));
      return false;
    }

    soldier.place(row, col);
    this.gridMgr.unitContainer.add(soldier.sprite);
    this.battleSystem.addAlly(soldier);
    this.dragMediator.makeControllable(soldier);
    this._removeCard(cardView);
    this._showTip('小兵已上阵');
    return true;
  }

  private _placeHeroShardCard(cardView: CardView, row: number, col: number): boolean {
    if (!cardView.card.heroId) return false;

    const result = placeHeroShardOnBoard(
      this.scene,
      this.gridMgr,
      this.battleSystem,
      this.dragMediator,
      cardView.card.heroId,
      row,
      col,
      cardView.card.shardCount ?? 1,
    );
    if (!result) {
      this._showTip(this._getShardPlaceFailTip(row, col));
      return false;
    }

    this._removeCard(cardView);
    this._showTip(result === 'activated' ? '英雄已合成' : '英雄碎片已放置');
    return true;
  }

  private _placeHeroCard(cardView: CardView, row: number, col: number): boolean {
    const target = this.gridMgr.getCell(row, col)?.occupant;
    if (target instanceof Hero) {
      const source = {
        heroId: cardView.card.heroId!,
        level: cardView.card.heroLevel ?? 1,
        maxLevel: target.maxLevel,
      };
      if (!canMergeHeroForUpgrade(source, target)) {
        this._showTip('只能低等级同名英雄合入高等级英雄');
        return false;
      }
      target.levelUp();
      this._removeCard(cardView);
      this._showTip('英雄已升级');
      return true;
    }

    if (!this.gridMgr.canPlaceUnit(row, col)) {
      this._showTip(this._getCellBlockReason(row, col));
      return false;
    }

    const hero = createHeroFromCard(this.scene, cardView.card);
    if (!hero) return false;
    if (!this.gridMgr.placeUnit(row, col, hero)) {
      hero.sprite.destroy();
      this._showTip(this._getCellBlockReason(row, col));
      return false;
    }

    hero.place(row, col);
    this.gridMgr.unitContainer.add(hero.sprite);
    this.battleSystem.addAlly(hero);
    this.dragMediator.makeControllable(hero);
    this._removeCard(cardView);
    this._showTip('英雄已上阵');
    return true;
  }

  private _useItemCard(cardView: CardView, cell: { row: number; col: number } | null): boolean {
    if (!cardView.card.itemId) return false;
    if (cardView.card.itemId === ItemId.UNIVERSAL_SHARD) {
      if (!cell) {
        this._showTip('通用碎片请拖到已有英雄碎片上');
        return false;
      }

      const result = placeUniversalShardOnBoard(
        this.scene,
        this.gridMgr,
        this.battleSystem,
        this.dragMediator,
        cell.row,
        cell.col,
      );
      if (!result) {
        this._showTip(this._getUniversalShardFailTip(cell.row, cell.col));
        return false;
      }

      this._removeCard(cardView);
      this._showTip(result === 'activated' ? '英雄已合成' : '通用碎片已补位');
      return true;
    }

    const success = ItemSystem.getInstance().use(cardView.card.itemId, {
      gridMgr: this.gridMgr,
      battleSystem: this.battleSystem,
      row: cell?.row,
      col: cell?.col,
    });

    if (!success) {
      this._showTip(this._getItemFailTip(cardView.card.itemId));
      return false;
    }

    this._removeCard(cardView);
    this._showTip(`${cardView.card.displayName}已生效`);
    return true;
  }

  private _getCellAction(card: CardData, row: number, col: number): 'place' | 'merge' | 'invalid' {
    if (card.type === CardType.SOLDIER) {
      const occupant = this.gridMgr.getCell(row, col)?.occupant;
      const rank = card.soldierRank ?? SoldierRank.WHITE;
      const canMerge = occupant instanceof Soldier
        && occupant.soldierType === card.soldierType
        && occupant.rank === rank
        && occupant.rank < SoldierRank.ORANGE;
      if (canMerge) return 'merge';
      return this.gridMgr.canPlaceUnit(row, col) ? 'place' : 'invalid';
    }

    if (card.type === CardType.HERO) {
      const occupant = this.gridMgr.getCell(row, col)?.occupant;
      const canMerge = occupant instanceof Hero
        && !!card.heroId
        && canMergeHeroForUpgrade({
          heroId: card.heroId,
          level: card.heroLevel ?? 1,
          maxLevel: occupant.maxLevel,
        }, occupant);
      if (canMerge) return 'merge';
      return this.gridMgr.canPlaceUnit(row, col) ? 'place' : 'invalid';
    }

    return this._canUseCardOnCell(card, row, col) ? 'place' : 'invalid';
  }

  private _canUseCardOnCell(card: CardData, row: number, col: number): boolean {
    if (card.type === CardType.SOLDIER) {
      const occupant = this.gridMgr.getCell(row, col)?.occupant;
      const rank = card.soldierRank ?? SoldierRank.WHITE;
      return this.gridMgr.canPlaceUnit(row, col)
        || (occupant instanceof Soldier
          && occupant.soldierType === card.soldierType
          && occupant.rank === rank
          && occupant.rank < SoldierRank.ORANGE);
    }

    if (card.type === CardType.HERO) {
      const occupant = this.gridMgr.getCell(row, col)?.occupant;
      return this.gridMgr.canPlaceUnit(row, col)
        || (occupant instanceof Hero
          && !!card.heroId
          && canMergeHeroForUpgrade({
            heroId: card.heroId,
            level: card.heroLevel ?? 1,
            maxLevel: occupant.maxLevel,
          }, occupant));
    }

    if (card.type === CardType.HERO_SHARD) {
      return !!card.heroId && canPlaceHeroShardOnCell(this.gridMgr, card.heroId, row, col);
    }

    switch (card.itemId) {
      case ItemId.AXE:
        return this.gridMgr.getCell(row, col)?.state === CellState.LOCKED;
      case ItemId.ELIXIR:
        return this.gridMgr.getCell(row, col)?.occupant instanceof Hero;
      case ItemId.UNIVERSAL_SHARD:
        return canUseUniversalShardOnCell(this.gridMgr, row, col);
      case ItemId.HEADBAND:
        return this.battleSystem.enemies.some(enemy => enemy.alive);
      case ItemId.VASE:
        return gameMgr.canFortifyMonk();
      default:
        return false;
    }
  }

  private _getItemFailTip(itemId: ItemId): string {
    switch (itemId) {
      case ItemId.AXE:
        return '开山斧需要拖到锁定格';
      case ItemId.ELIXIR:
        return '九转仙丹需要拖到英雄身上';
      case ItemId.UNIVERSAL_SHARD:
        return '通用碎片请拖到已有英雄碎片上';
      case ItemId.HEADBAND:
        return '当前没有可减速的妖怪';
      case ItemId.VASE:
        return '唐僧血量已到上限';
      default:
        return '道具使用失败';
    }
  }

  private _removeCard(cardView: CardView): void {
    if (this._selectedCardView === cardView) this._selectedCardView = null;
    this._cards[cardView.slotIndex] = null;
    cardView.container.destroy();
  }

  private _clearCards(): void {
    this._selectedCardView = null;
    for (let i = 0; i < this._cards.length; i++) {
      this._cards[i]?.container.destroy();
      this._cards[i] = null;
    }
  }

  private _refreshButtonState(): void {
    const cost = SummonSystem.getInstance().currentCost;
    const missing = Math.max(0, cost - gameMgr.peach);
    const enough = this._summonEnabled && gameMgr.isPlaying && missing === 0;
    const w = SUMMON_BUTTON_W;
    const h = SUMMON_BUTTON_H;
    const x = -w / 2;
    const y = -h / 2;
    this._buttonBg.clear();
    if (enough) {
      // 朱砂主按钮：底部厚度 + 亮描边 + 内衬白环
      this._buttonBg.fillStyle(UI_TOKENS.cinnabarDark, 1);
      this._buttonBg.fillRoundedRect(x, y + 5, w, h, 12);
      this._buttonBg.fillStyle(UI_TOKENS.cinnabar, 1);
      this._buttonBg.fillRoundedRect(x, y, w, h, 12);
      this._buttonBg.lineStyle(2.5, UI_TOKENS.cinnabarEdge, 0.9);
      this._buttonBg.strokeRoundedRect(x, y, w, h, 12);
      this._buttonBg.lineStyle(2, 0xfff0c6, 0.24);
      this._buttonBg.strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, 8);
    } else {
      // 禁用：灰陶色
      this._buttonBg.fillStyle(0x5c564b, 0.8);
      this._buttonBg.fillRoundedRect(x, y + 5, w, h, 12);
      this._buttonBg.fillStyle(0x8a8375, 0.9);
      this._buttonBg.fillRoundedRect(x, y, w, h, 12);
      this._buttonBg.lineStyle(2, 0xa79e8c, 0.5);
      this._buttonBg.strokeRoundedRect(x, y, w, h, 12);
    }
    this._buttonText.setAlpha(enough ? 1 : 0.72);
    this._buttonCostText.setAlpha(enough ? 1 : 0.82);
    if (this._peachIcon) this._peachIcon.setAlpha(enough ? 1 : 0.72);
    // 禁用态说明缺少的资源：优先显示还差多少仙桃
    if (missing > 0) {
      // 按钮只有 116px 宽，完整「还差 N 仙桃」会折成三行溢出按钮
      this._buttonCostText.setText(`还差${missing}桃`);
    } else if (!this._summonEnabled) {
      this._buttonCostText.setText('整理卡牌中');
    } else if (!gameMgr.isPlaying) {
      this._buttonCostText.setText('暂不可召唤');
    } else {
      this._buttonCostText.setText(`${cost} 仙桃`);
    }
  }

  private _isInteractionLocked(): boolean {
    return !gameMgr.isPlaying;
  }

  private _showTip(text: string): void {
    if (this._destroyed) return;
    this._lastTipAt = this.scene.time.now;
    this._tipTimer?.remove(false);
    this.scene.tweens.killTweensOf(this._tipText);
    this._tipText.setText(text);
    this._tipText.setAlpha(1);
    this._tipTimer = this.scene.time.delayedCall(1800, () => {
      this._tipTimer = undefined;
      if (!this._destroyed && this._tipText.text === text) {
        const tipText = this._tipText;
        this.scene.tweens.add({
          targets: tipText,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            if (!this._destroyed && tipText.text === text) {
              tipText.setText('');
            }
          },
        });
      }
    });
  }

  /** 左上角单字角标：兵 / 魂 / 具，通用碎片用金色「通」区分 */
  private _getCardTypeMark(card: CardData): { text: string; color: string } {
    if (card.itemId === ItemId.UNIVERSAL_SHARD) {
      return { text: '通', color: UI_TOKENS.textGoldOnDark };
    }
    const color = UI_TOKENS.textCinnabarOnPaper;
    if (card.type === CardType.SOLDIER) return { text: '兵', color };
    if (card.type === CardType.HERO_SHARD) return { text: '魂', color };
    if (card.type === CardType.ITEM) return { text: '具', color };
    return { text: '英', color };
  }

  /**
   * 第二行用途小字：阶数射程 / 碎片进度 / 道具用途。
   * 卡片只有 100px 宽、字号下限 22px，带「·」和空格会折成两行并互相挤压，
   * 因此这里用紧凑写法（例：1阶群攻 / 碎片1/2 / 解锁山石）保证单行。
   */
  private _getCardUsage(card: CardData): string {
    if (card.type === CardType.SOLDIER) {
      const rank = card.soldierRank ?? SoldierRank.WHITE;
      const config = card.soldierType ? getSoldierConfig(card.soldierType, rank) : undefined;
      const rangeLabel = this._getRangeLabel(config?.attackType);
      return rangeLabel ? `${rank}阶${rangeLabel}` : `${rank}阶`;
    }
    if (card.type === CardType.HERO_SHARD) {
      const config = card.heroId ? getHeroConfig(card.heroId) : undefined;
      const need = config?.shardsNeeded ?? 2;
      const count = Math.min(card.shardCount ?? 1, need);
      const kind = config?.rarity === HeroRarity.CORE ? '核心' : '碎片';
      return `${kind}${count}/${need}`;
    }
    if (card.type === CardType.HERO) {
      return `Lv${card.heroLevel ?? 1}上阵`;
    }
    return this._getItemUsage(card.itemId);
  }

  private _getRangeLabel(type?: AttackType): string {
    switch (type) {
      case AttackType.MELEE: return '近战';
      case AttackType.MID_RANGE: return '中距';
      case AttackType.RANGED: return '远程';
      case AttackType.AOE: return '群攻';
      default: return '';
    }
  }

  private _getItemUsage(itemId?: ItemId): string {
    switch (itemId) {
      case ItemId.AXE: return '解锁山石';
      case ItemId.ELIXIR: return '英雄升级';
      case ItemId.UNIVERSAL_SHARD: return '万能碎片';
      case ItemId.HEADBAND: return '减速妖怪';
      case ItemId.VASE: return '增加血量';
      default: return '战斗道具';
    }
  }

  /** 区分不可放置原因：路径格 / 山石锁定 / 已有单位 */
  private _getCellBlockReason(row: number, col: number): string {
    if (this.gridMgr.isPathCell(row, col)) return '妖怪路径格不能布阵';
    const cell = this.gridMgr.getCell(row, col);
    if (cell?.state === CellState.LOCKED) return '山石锁定，用开山斧解锁';
    if (cell?.occupant) return '该格已有单位';
    return '此格状态不允许布阵';
  }

  /** 英雄碎片放置失败原因：路径 / 山石 / 已有单位 / 碎片已集满 / 碎片不足 */
  private _getShardPlaceFailTip(row: number, col: number): string {
    if (this.gridMgr.isPathCell(row, col)) return '妖怪路径格不能放置碎片';
    const cell = this.gridMgr.getCell(row, col);
    if (cell?.state === CellState.LOCKED) return '山石锁定，用开山斧解锁';
    const occupant = cell?.occupant as { isComplete?: () => boolean } | null | undefined;
    if (occupant?.isComplete?.()) return '该英雄碎片已集满';
    if (cell?.occupant) return '该格已有单位，碎片只能叠加同英雄碎片';
    return '碎片不足，先放到空格累积';
  }

  /** 通用碎片补位失败原因：路径 / 山石 / 已集满 / 碎片不足 */
  private _getUniversalShardFailTip(row: number, col: number): string {
    if (this.gridMgr.isPathCell(row, col)) return '妖怪路径格没有英雄碎片';
    const cell = this.gridMgr.getCell(row, col);
    if (cell?.state === CellState.LOCKED) return '山石锁定，用开山斧解锁';
    const occupant = cell?.occupant as { isComplete?: () => boolean } | null | undefined;
    if (occupant?.isComplete?.()) return '该英雄碎片已集满，无需补位';
    return '碎片不足，先放置英雄碎片再补位';
  }
}
