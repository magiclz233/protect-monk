import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { eventMgr, GameEvent } from '../core/EventManager';
import { getHeroConfig } from '../config/HeroConfig';
import { getSoldierConfig } from '../config/SoldierConfig';
import { Hero } from '../entities/Hero';
import { Soldier } from '../entities/Soldier';
import { GridManager } from '../grid/GridManager';
import { drawCardIcon } from '../render/VisualPainter';
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
import { CardData, CardType, CellState, ItemId, SoldierRank } from '../types';
import { createCjkText } from '../core/TextStyles';
import { BoardUnitControlView } from './BoardUnitControlView';
import { InventoryBarView } from './InventoryBarView';

interface CardView {
  card: CardData;
  container: Phaser.GameObjects.Container;
  hitZone: Phaser.GameObjects.Zone;
  slotIndex: number;
  homeX: number;
  homeY: number;
  dragOffsetX: number;
  dragOffsetY: number;
}

const SLOT_COUNT = 5;
const CARD_W = 100;
const CARD_H = 124;
const SLOT_GAP = 10;
const PANEL_X = 20;
const PANEL_Y = 1090;
const SUMMON_BUTTON_X = 604;
const SUMMON_BUTTON_Y = PANEL_Y + 22;
const SUMMON_BUTTON_W = 116;
const SUMMON_BUTTON_H = 98;

const CARD_COLORS: Record<CardType, number> = {
  [CardType.SOLDIER]: 0x2f8f74,
  [CardType.HERO]: 0x9b5832,
  [CardType.HERO_SHARD]: 0xb7782f,
  [CardType.ITEM]: 0x6d58a8,
};

export class SummonPanel {
  readonly container: Phaser.GameObjects.Container;

  private readonly _cards: Array<CardView | null> = Array(SLOT_COUNT).fill(null);
  private readonly _slotPositions: Array<{ x: number; y: number }> = [];
  private readonly _highlight: Phaser.GameObjects.Graphics;
  private readonly _buttonBg: Phaser.GameObjects.Graphics;
  private readonly _buttonText: Phaser.GameObjects.Text;
  private readonly _tipText: Phaser.GameObjects.Text;
  private readonly _showAdButtons: boolean;
  private _summonEnabled = true;

  private readonly _summonRefreshHandler = (cards: CardData[]): void => this._renderCards(cards);
  private readonly _peachHandler = (): void => this._refreshButtonState();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly gridMgr: GridManager,
    private readonly battleSystem: BattleSystem,
    private readonly inventoryBarView?: InventoryBarView,
    private readonly boardControl?: BoardUnitControlView,
  ) {
    const adSystem = AdSystem.getInstance();
    this._showAdButtons = adSystem.hasRewardedVideo('extraSummon') || adSystem.hasRewardedVideo('universalShard');
    this.container = scene.add.container(0, 0);
    this.container.setDepth(90);

    this._highlight = scene.add.graphics();
    this._highlight.setDepth(80);
    this._highlight.setVisible(false);

    this._drawPanel();
    this._buttonBg = this._createSummonButtonBg();
    this._buttonText = this._createSummonButtonText();
    // 提示横幅：屏幕中央浮动 Toast，不跟底部 UI 竞争空间
    this._tipText = createCjkText(scene, 375, 620, '', {
      fontSize: '22px',
      color: '#101826',
      fontStyle: 'bold',
      backgroundColor: '#f0c15a',
      padding: { x: 24, y: 12 },
    });
    this._tipText.setOrigin(0.5);
    this._tipText.setDepth(300);
    this._tipText.setAlpha(0);
    this.container.add([this._buttonBg, this._buttonText, this._tipText]);
    this.container.add(this._createButtonHitArea(
      SUMMON_BUTTON_X,
      SUMMON_BUTTON_Y,
      SUMMON_BUTTON_W,
      SUMMON_BUTTON_H,
      () => this._summon(),
    ));
    if (this._showAdButtons) {
      this._drawAdRewardButtons();
    }

    eventMgr.on(GameEvent.SUMMON_REFRESH, this._summonRefreshHandler);
    eventMgr.on(GameEvent.PEACH_CHANGED, this._peachHandler);
    this._refreshButtonState();
  }

  destroy(): void {
    eventMgr.off(GameEvent.SUMMON_REFRESH, this._summonRefreshHandler);
    eventMgr.off(GameEvent.PEACH_CHANGED, this._peachHandler);
    this._highlight.destroy();
    this.container.destroy(true);
  }

  setSummonEnabled(enabled: boolean): void {
    this._summonEnabled = enabled;
    this._refreshButtonState();
  }

  containsPoint(x: number, y: number): boolean {
    return x >= PANEL_X && x <= PANEL_X + 710 && y >= PANEL_Y - 22 && y <= PANEL_Y + 156;
  }

  addCard(card: CardData): boolean {
    const slotIndex = this._cards.findIndex(slot => slot === null);
    if (slotIndex < 0) {
      this._showTip('卡槽已满');
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
    bg.fillStyle(0x101826, 0.94);
    bg.fillRoundedRect(PANEL_X, PANEL_Y - 22, 710, 178, 10);
    bg.lineStyle(2, 0xf0c15a, 0.38);
    bg.strokeRoundedRect(PANEL_X, PANEL_Y - 22, 710, 178, 10);
    bg.fillStyle(0xffffff, 0.05);
    bg.fillRoundedRect(32, PANEL_Y - 8, 558, CARD_H + 16, 10);
    this.container.add(bg);

    const startX = 42;
    for (let i = 0; i < SLOT_COUNT; i++) {
      const x = startX + i * (CARD_W + SLOT_GAP);
      const y = PANEL_Y;
      this._slotPositions.push({ x, y });

      const slot = this.scene.add.graphics();
      slot.fillStyle(0x1c2636, 0.88);
      slot.fillRoundedRect(x, y, CARD_W, CARD_H, 8);
      slot.lineStyle(2, 0xffffff, 0.18);
      slot.strokeRoundedRect(x, y, CARD_W, CARD_H, 8);
      this.container.add(slot);
    }
  }

  private _createSummonButtonBg(): Phaser.GameObjects.Graphics {
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xf0c15a);
    bg.fillRoundedRect(SUMMON_BUTTON_X, SUMMON_BUTTON_Y, SUMMON_BUTTON_W, SUMMON_BUTTON_H, 10);
    bg.lineStyle(2, 0xfff0a6, 0.52);
    bg.strokeRoundedRect(SUMMON_BUTTON_X, SUMMON_BUTTON_Y, SUMMON_BUTTON_W, SUMMON_BUTTON_H, 10);
    return bg;
  }

  private _createSummonButtonText(): Phaser.GameObjects.Text {
    const text = createCjkText(this.scene, SUMMON_BUTTON_X + SUMMON_BUTTON_W / 2, SUMMON_BUTTON_Y + SUMMON_BUTTON_H / 2, '召唤\n30', {
      fontSize: '22px',
      color: '#101826',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 8,
    });
    text.setOrigin(0.5);
    return text;
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
    bg.fillStyle(0x31496c, 0.96);
    bg.fillRoundedRect(604, y, 116, 38, 8);
    bg.lineStyle(1.5, 0xb8d8ff, 0.55);
    bg.strokeRoundedRect(604, y, 116, 38, 8);

    const text = createCjkText(this.scene, 662, y + 19, label, {
      fontSize: '14px',
      color: '#ffffff',
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
    if (gameMgr.peach < SummonSystem.getInstance().currentCost) {
      this._showTip('仙桃不足');
      return;
    }

    const result = SummonSystem.getInstance().summon();
    if (!result) {
      this._showTip('仙桃不足');
    }
  }

  private async _summonByAd(): Promise<void> {
    if (this._isInteractionLocked()) {
      this._showTip('暂停中不能召唤');
      return;
    }
    if (!this._summonEnabled) {
      this._showTip('唐僧进场中，先整理这 5 张卡');
      return;
    }
    const ok = await AdSystem.getInstance().showRewardedVideo('extraSummon');
    if (!ok) {
      this._showTip('广告未完成');
      return;
    }

    SummonSystem.getInstance().summonFree();
    this._showTip('额外召唤完成');
  }

  private async _grantUniversalShardByAd(): Promise<void> {
    if (this._isInteractionLocked()) {
      this._showTip('暂停中不能领取');
      return;
    }
    if (!this._summonEnabled) {
      this._showTip('唐僧进场中，先整理这 5 张卡');
      return;
    }
    const slotIndex = this._cards.findIndex(card => card === null);
    if (slotIndex < 0) {
      this._showTip('卡槽已满');
      return;
    }

    const ok = await AdSystem.getInstance().showRewardedVideo('universalShard');
    if (!ok) {
      this._showTip('广告未完成');
      return;
    }

    const pos = this._slotPositions[slotIndex];
    const card = SummonSystem.getInstance().createUniversalShardCard();
    const cardView = this._createCardView(card, slotIndex, pos.x, pos.y);
    this._cards[slotIndex] = cardView;
    this.container.add(cardView.container);
    this._showTip('获得通用碎片');
  }

  private _renderCards(cards: CardData[]): void {
    this._clearCards();
    cards.slice(0, SLOT_COUNT).forEach((card, index) => {
      this._setCardAtSlot(card, index);
    });
    this._showTip('拖卡上阵，或拖到仓库暂存');
  }

  private _setCardAtSlot(card: CardData, slotIndex: number): void {
    const pos = this._slotPositions[slotIndex];
    this._cards[slotIndex]?.container.destroy();
    const cardView = this._createCardView(card, slotIndex, pos.x, pos.y);
    this._cards[slotIndex] = cardView;
    this.container.add(cardView.container);
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
    const bg = this.scene.add.graphics();
    bg.fillStyle(CARD_COLORS[card.type], 0.96);
    bg.fillRoundedRect(0, 0, CARD_W, CARD_H, 8);
    bg.lineStyle(2, 0xfff3c0, 0.65);
    bg.strokeRoundedRect(0, 0, CARD_W, CARD_H, 8);

    const icon = this.scene.add.graphics();
    icon.setPosition(CARD_W / 2 - 26, 10);
    drawCardIcon(icon, {
      card,
      size: 52,
      heroRarity: card.heroId ? getHeroConfig(card.heroId)?.rarity : undefined,
    });

    const typeText = createCjkText(this.scene, CARD_W / 2, 68, this._getCardTypeName(card.type), {
      fontSize: '15px',
      color: '#fff4c2',
    });
    typeText.setOrigin(0.5);

    const name = createCjkText(this.scene, CARD_W / 2, 96, this._getCardDisplayName(card), {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: CARD_W - 14, useAdvancedWrap: true },
    });
    name.setOrigin(0.5);

    const hitZone = this.scene.add.zone(CARD_W / 2, CARD_H / 2, CARD_W, CARD_H);
    hitZone.setOrigin(0.5);
    hitZone.setInteractive({ useHandCursor: true });
    this.scene.input.setDraggable(hitZone);

    view.add([bg, icon, typeText, name, hitZone]);
    view.setSize(CARD_W, CARD_H);

    const cardView = { card, container: view, hitZone, slotIndex, homeX: x, homeY: y, dragOffsetX: 0, dragOffsetY: 0 };
    this._bindDrag(cardView);
    return cardView;
  }

  private _bindDrag(cardView: CardView): void {
    cardView.hitZone.on('dragstart', (pointer: Phaser.Input.Pointer) => {
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
    const valid = this._canUseCardOnCell(card, cell.row, cell.col);
    this._highlight.fillStyle(valid ? 0x63d471 : 0xff5b5b, 0.26);
    this._highlight.lineStyle(3, valid ? 0x9effa6 : 0xff8888, 0.9);
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

    if (this.inventoryBarView?.containsPoint(worldX, worldY)) {
      if (!this.inventoryBarView.addCard(cardView.card)) return false;
      this._removeCard(cardView);
      this._showTip('卡牌已入库');
      return true;
    }

    const cell = this.gridMgr.worldToCell(worldX, worldY);

    if (cardView.card.type === CardType.ITEM) {
      return this._useItemCard(cardView, cell);
    }

    if (!cell) {
      this._showTip('请选择可放置格');
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
      this._showTip('该格不能放置');
      return false;
    }

    const soldier = createSoldierFromCard(this.scene, cardView.card);
    if (!soldier) return false;
    if (!this.gridMgr.placeUnit(row, col, soldier)) {
      soldier.sprite.destroy();
      this._showTip('该格不能放置');
      return false;
    }

    soldier.place(row, col);
    this.gridMgr.unitContainer.add(soldier.sprite);
    this.battleSystem.addAlly(soldier);
    this.boardControl?.makeControllable(soldier);
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
      this.boardControl,
      cardView.card.heroId,
      row,
      col,
      cardView.card.shardCount ?? 1,
    );
    if (!result) {
      this._showTip('只能放到空格或同英雄碎片上');
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
      this._showTip('该格不能放置');
      return false;
    }

    const hero = createHeroFromCard(this.scene, cardView.card);
    if (!hero) return false;
    if (!this.gridMgr.placeUnit(row, col, hero)) {
      hero.sprite.destroy();
      return false;
    }

    hero.place(row, col);
    this.gridMgr.unitContainer.add(hero.sprite);
    this.battleSystem.addAlly(hero);
    this.boardControl?.makeControllable(hero);
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
        this.boardControl,
        cell.row,
        cell.col,
      );
      if (!result) {
        this._showTip('通用碎片只能补已有英雄碎片');
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
    this._cards[cardView.slotIndex] = null;
    cardView.container.destroy();
  }

  private _clearCards(): void {
    for (let i = 0; i < this._cards.length; i++) {
      this._cards[i]?.container.destroy();
      this._cards[i] = null;
    }
  }

  private _refreshButtonState(): void {
    const cost = SummonSystem.getInstance().currentCost;
    const enough = this._summonEnabled && gameMgr.isPlaying && gameMgr.peach >= cost;
    this._buttonBg.clear();
    this._buttonBg.fillStyle(enough ? 0xf0c15a : 0x667080, enough ? 1 : 0.72);
    this._buttonBg.fillRoundedRect(SUMMON_BUTTON_X, SUMMON_BUTTON_Y, SUMMON_BUTTON_W, SUMMON_BUTTON_H, 10);
    this._buttonBg.lineStyle(2, enough ? 0xfff0a6 : 0xb8c0cd, 0.52);
    this._buttonBg.strokeRoundedRect(SUMMON_BUTTON_X, SUMMON_BUTTON_Y, SUMMON_BUTTON_W, SUMMON_BUTTON_H, 10);
    this._buttonText.setAlpha(enough ? 1 : 0.65);
    this._buttonText.setText(`召唤\n${cost}`);
  }

  private _isInteractionLocked(): boolean {
    return !gameMgr.isPlaying;
  }

  private _showTip(text: string): void {
    this._tipText.setText(text);
    this._tipText.setAlpha(1);
    this.scene.time.delayedCall(1800, () => {
      if (this._tipText.text === text) {
        this.scene.tweens.add({
          targets: this._tipText,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            if (this._tipText.text === text) {
              this._tipText.setText('');
            }
          },
        });
      }
    });
  }

  private _getCardTypeName(type: CardType): string {
    if (type === CardType.SOLDIER) return '小兵';
    if (type === CardType.HERO) return '英雄';
    if (type === CardType.HERO_SHARD) return '英雄碎片';
    return '道具';
  }

  private _getCardDisplayName(card: CardData): string {
    if (card.type === CardType.SOLDIER) {
      return `${card.displayName}\nLv${card.soldierRank ?? 1}`;
    }
    if (card.type === CardType.HERO) {
      return `${card.displayName}\nLv${card.heroLevel ?? 1}`;
    }
    if (card.type === CardType.HERO_SHARD && (card.shardCount ?? 1) > 1) {
      return `${card.displayName}\nx${card.shardCount}`;
    }
    return card.displayName;
  }
}
