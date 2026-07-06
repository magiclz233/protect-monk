import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { getHeroConfig } from '../config/HeroConfig';
import { ITEM_VISUALS } from '../config/VisualConfig';
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
import {
  canStoreInInventory,
  INITIAL_INVENTORY_SLOT_LIMIT,
  InventorySlot,
  MAX_INVENTORY_SLOT_LIMIT,
} from '../systems/InventoryLogic';
import { ItemSystem } from '../systems/ItemSystem';
import { MergeSystem } from '../systems/MergeSystem';
import { CardData, CardType, CellState, HeroRarity, ItemId, SoldierRank } from '../types';
import { BoardUnitControlView } from './BoardUnitControlView';

interface CardSlotDropTarget {
  containsPoint(x: number, y: number): boolean;
  addCardAtPoint(card: CardData, x: number, y: number): boolean;
}

interface InventorySlotView {
  card: CardData;
  container: Phaser.GameObjects.Container;
  hitZone: Phaser.GameObjects.Zone;
  slotIndex: number;
  homeX: number;
  homeY: number;
  dragOffsetX: number;
  dragOffsetY: number;
}

const BAR_X = 42;
const BAR_Y = 946;
const BAR_W = 666;
const BAR_H = 92;
const SLOT_SIZE = 56;
const SLOT_GAP = 7;
const SLOT_START_X = 146;
const SLOT_Y = BAR_Y + 18;

export class InventoryBarView {
  readonly container: Phaser.GameObjects.Container;

  private readonly _slots: InventorySlot[] = Array(MAX_INVENTORY_SLOT_LIMIT).fill(null);
  private readonly _slotPositions: Array<{ x: number; y: number }> = [];
  private readonly _slotViews: Array<InventorySlotView | null> = Array(MAX_INVENTORY_SLOT_LIMIT).fill(null);
  private readonly _highlight: Phaser.GameObjects.Graphics;
  private _tipText: Phaser.GameObjects.Text | null = null;
  private _tipValue = '';
  private _slotLimit = INITIAL_INVENTORY_SLOT_LIMIT;
  private _cardSlotDropTarget: CardSlotDropTarget | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly gridMgr: GridManager,
    private readonly battleSystem: BattleSystem,
    private readonly boardControl: BoardUnitControlView,
  ) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(88);

    this._highlight = scene.add.graphics();
    this._highlight.setDepth(82);
    this._highlight.setVisible(false);

    this._redraw();
  }

  destroy(): void {
    this._highlight.destroy();
    this.container.destroy(true);
  }

  containsPoint(x: number, y: number): boolean {
    return x >= BAR_X && x <= BAR_X + BAR_W && y >= BAR_Y && y <= BAR_Y + BAR_H;
  }

  setCardSlotDropTarget(target: CardSlotDropTarget): void {
    this._cardSlotDropTarget = target;
  }

  addCard(card: CardData): boolean {
    if (!canStoreInInventory(card)) return false;

    const slotIndex = this._slots.findIndex((slot, index) => index < this._slotLimit && slot === null);
    if (slotIndex < 0) {
      this._showTip('仓库已满');
      return false;
    }

    this._slots[slotIndex] = card;
    this._showTip(`${card.displayName} 已入库`);
    this._redraw();
    return true;
  }

  get slotLimit(): number {
    return this._slotLimit;
  }

  get storedCount(): number {
    return this._slots.slice(0, this._slotLimit).filter(Boolean).length;
  }

  private _redraw(): void {
    this.container.removeAll(true);
    this._slotPositions.length = 0;
    this._slotViews.fill(null);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x101826, 0.94);
    bg.fillRoundedRect(BAR_X, BAR_Y, BAR_W, BAR_H, 10);
    bg.lineStyle(2, 0xf0c15a, 0.34);
    bg.strokeRoundedRect(BAR_X, BAR_Y, BAR_W, BAR_H, 10);

    const title = this.scene.add.text(BAR_X + 18, BAR_Y + 26, '仓库栏', {
      fontSize: '18px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    title.setOrigin(0, 0.5);

    const hint = this.scene.add.text(BAR_X + 18, BAR_Y + 58, '卡牌暂存', {
      fontSize: '13px',
      color: '#cfd8e3',
    });
    hint.setOrigin(0, 0.5);

    this._tipText = this.scene.add.text(BAR_X + BAR_W - 176, BAR_Y + 76, this._tipValue, {
      fontSize: '14px',
      color: '#ffd36a',
      fontStyle: 'bold',
      wordWrap: { width: 150, useAdvancedWrap: true },
    });
    this._tipText.setOrigin(0, 0.5);

    this.container.add([bg, title, hint, this._tipText]);

    for (let i = 0; i < this._slotLimit; i++) {
      const x = SLOT_START_X + i * (SLOT_SIZE + SLOT_GAP);
      const y = SLOT_Y;
      this._slotPositions[i] = { x, y };
      this.container.add(this._createSlotBg(x, y));
      if (this._slots[i]) {
        this._renderCard(i);
      }
    }

    if (this._slotLimit < MAX_INVENTORY_SLOT_LIMIT) {
      this._renderExpandButton();
    }
  }

  private _createSlotBg(x: number, y: number): Phaser.GameObjects.Graphics {
    const slot = this.scene.add.graphics();
    slot.fillStyle(0x1c2636, 0.9);
    slot.fillRoundedRect(x, y, SLOT_SIZE, SLOT_SIZE, 8);
    slot.lineStyle(2, 0xffffff, 0.16);
    slot.strokeRoundedRect(x, y, SLOT_SIZE, SLOT_SIZE, 8);
    return slot;
  }

  private _renderCard(slotIndex: number): void {
    const card = this._slots[slotIndex];
    const pos = this._slotPositions[slotIndex];
    if (!card || !pos) return;

    const view = this.scene.add.container(pos.x, pos.y);
    const visual = this._getCardVisual(card);

    const bg = this.scene.add.graphics();
    bg.fillStyle(visual.fill, 0.98);
    bg.fillRoundedRect(0, 0, SLOT_SIZE, SLOT_SIZE, 8);
    bg.lineStyle(visual.lineWidth, visual.stroke, visual.alpha);
    bg.strokeRoundedRect(0, 0, SLOT_SIZE, SLOT_SIZE, 8);
    if (visual.glow) {
      bg.lineStyle(3, 0xffe08a, 0.28);
      bg.strokeRoundedRect(-3, -3, SLOT_SIZE + 6, SLOT_SIZE + 6, 10);
    }

    const icon = this.scene.add.graphics();
    icon.setPosition(10, 3);
    drawCardIcon(icon, {
      card,
      size: 36,
      heroRarity: card.heroId ? getHeroConfig(card.heroId)?.rarity : undefined,
    });

    const name = this.scene.add.text(SLOT_SIZE / 2, 39, visual.label, {
      fontSize: '11px',
      color: '#fff4c2',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: SLOT_SIZE - 6, useAdvancedWrap: true },
    });
    name.setOrigin(0.5);

    const hitZone = this.scene.add.zone(SLOT_SIZE / 2, SLOT_SIZE / 2, SLOT_SIZE, SLOT_SIZE);
    hitZone.setOrigin(0.5);
    hitZone.setInteractive({ useHandCursor: true });
    this.scene.input.setDraggable(hitZone);

    view.add([bg, icon, name, hitZone]);
    this.container.add(view);

    const slotView: InventorySlotView = {
      card,
      container: view,
      hitZone,
      slotIndex,
      homeX: pos.x,
      homeY: pos.y,
      dragOffsetX: 0,
      dragOffsetY: 0,
    };
    this._slotViews[slotIndex] = slotView;
    this._bindDrag(slotView);
  }

  private _renderExpandButton(): void {
    const x = BAR_X + BAR_W - 72;
    const y = BAR_Y + 18;
    const label = AdSystem.getInstance().hasRewardedVideo('extraSummon') ? '广告\n扩容' : '免费\n扩容';

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x31496c, 0.96);
    bg.fillRoundedRect(x, y, 54, 56, 8);
    bg.lineStyle(1.5, 0xb8d8ff, 0.55);
    bg.strokeRoundedRect(x, y, 54, 56, 8);

    const text = this.scene.add.text(x + 27, y + 28, label, {
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 2,
    });
    text.setOrigin(0.5);

    const hit = this.scene.add.zone(x + 27, y + 28, 54, 56);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => void this._expandSlot());
    this.container.add([bg, text, hit]);
  }

  private _bindDrag(slotView: InventorySlotView): void {
    slotView.hitZone.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      if (this._isInteractionLocked()) {
        slotView.container.setPosition(slotView.homeX, slotView.homeY);
        this._showTip('暂停中不能操作仓库');
        return;
      }
      const pointerWorld = this._getPointerWorld(pointer);
      slotView.dragOffsetX = pointerWorld.x - slotView.container.x;
      slotView.dragOffsetY = pointerWorld.y - slotView.container.y;
      this.container.setDepth(132);
      this.container.bringToTop(slotView.container);
    });

    slotView.hitZone.on('drag', (pointer: Phaser.Input.Pointer) => {
      if (this._isInteractionLocked()) return;
      const point = this._getPointerWorld(pointer);
      slotView.container.setPosition(point.x - slotView.dragOffsetX, point.y - slotView.dragOffsetY);
      this._updateHighlight(slotView.card, point.x, point.y);
    });

    slotView.hitZone.on('dragend', (pointer: Phaser.Input.Pointer) => {
      this._highlight.setVisible(false);
      if (this._isInteractionLocked()) {
        this.container.setDepth(88);
        slotView.container.setPosition(slotView.homeX, slotView.homeY);
        this._showTip('暂停中不能操作仓库');
        return;
      }
      const point = this._getPointerWorld(pointer);
      const used = this._tryUseSlot(slotView, point.x, point.y);
      this.container.setDepth(88);
      if (!used) {
        slotView.container.setPosition(slotView.homeX, slotView.homeY);
      }
    });
  }

  private _tryUseSlot(slotView: InventorySlotView, worldX: number, worldY: number): boolean {
    if (this._isInteractionLocked()) {
      this._showTip('暂停中不能操作仓库');
      return false;
    }

    if (this._cardSlotDropTarget?.containsPoint(worldX, worldY)) {
      if (!this._cardSlotDropTarget.addCardAtPoint(slotView.card, worldX, worldY)) return false;
      this._clearSlots([slotView.slotIndex]);
      this._showTip('卡牌已放入卡槽');
      this._redraw();
      return true;
    }

    if (slotView.card.type === CardType.SOLDIER && slotView.card.soldierType) {
      return this._tryUseSoldier(slotView, worldX, worldY);
    }

    if (slotView.card.type === CardType.HERO_SHARD && slotView.card.heroId) {
      return this._tryUseHeroShard(slotView, worldX, worldY);
    }

    if (slotView.card.type === CardType.HERO && slotView.card.heroId) {
      return this._tryUseHero(slotView, worldX, worldY);
    }

    if (slotView.card.type === CardType.ITEM && slotView.card.itemId) {
      return this._tryUseItem(slotView, worldX, worldY);
    }

    return false;
  }

  private _tryUseSoldier(slotView: InventorySlotView, worldX: number, worldY: number): boolean {
    const soldierType = slotView.card.soldierType;
    if (!soldierType) return false;
    const rank = slotView.card.soldierRank ?? SoldierRank.WHITE;

    const cell = this.gridMgr.worldToCell(worldX, worldY);
    if (!cell) {
      this._showTip('请拖到棋盘格');
      return false;
    }

    const target = this.gridMgr.getCell(cell.row, cell.col)?.occupant;
    if (target instanceof Soldier) {
      const merged = MergeSystem.getInstance().tryMergeSoldierCard(
        this.gridMgr,
        cell.row,
        cell.col,
        soldierType,
        rank,
      );
      if (!merged) {
        this._showTip('只能和同名同级小兵合成');
        return false;
      }
      this._clearSlots([slotView.slotIndex]);
      this._showTip('小兵已合成');
      this._redraw();
      return true;
    }

    if (!this.gridMgr.canPlaceUnit(cell.row, cell.col)) {
      this._showTip('该格不能放置');
      return false;
    }

    const soldier = createSoldierFromCard(this.scene, slotView.card);
    if (!soldier) return false;
    if (!this.gridMgr.placeUnit(cell.row, cell.col, soldier)) {
      soldier.sprite.destroy();
      return false;
    }

    soldier.place(cell.row, cell.col);
    this.gridMgr.unitContainer.add(soldier.sprite);
    this.battleSystem.addAlly(soldier);
    this.boardControl.makeControllable(soldier);
    this._clearSlots([slotView.slotIndex]);
    this._showTip('小兵已上阵');
    this._redraw();
    return true;
  }

  private _tryUseHeroShard(slotView: InventorySlotView, worldX: number, worldY: number): boolean {
    const heroId = slotView.card.heroId;
    if (!heroId) return false;

    const cell = this.gridMgr.worldToCell(worldX, worldY);
    if (!cell) {
      this._showTip('请拖到棋盘格');
      return false;
    }

    const result = placeHeroShardOnBoard(
      this.scene,
      this.gridMgr,
      this.battleSystem,
      this.boardControl,
      heroId,
      cell.row,
      cell.col,
      slotView.card.shardCount ?? 1,
    );
    if (!result) {
      this._showTip('只能放到空格或同英雄碎片上');
      return false;
    }

    this._clearSlots([slotView.slotIndex]);
    this._showTip(result === 'activated' ? '英雄已合成' : '碎片已放置');
    this._redraw();
    return true;
  }

  private _tryUseHero(slotView: InventorySlotView, worldX: number, worldY: number): boolean {
    const cell = this.gridMgr.worldToCell(worldX, worldY);
    if (!cell) {
      this._showTip('请拖到棋盘格');
      return false;
    }

    const target = this.gridMgr.getCell(cell.row, cell.col)?.occupant;
    if (target instanceof Hero) {
      const source = {
        heroId: slotView.card.heroId!,
        level: slotView.card.heroLevel ?? 1,
        maxLevel: target.maxLevel,
      };
      if (!canMergeHeroForUpgrade(source, target)) {
        this._showTip('只能低等级同名英雄合入高等级英雄');
        return false;
      }
      target.levelUp();
      this._clearSlots([slotView.slotIndex]);
      this._showTip('英雄已升级');
      this._redraw();
      return true;
    }

    if (!this.gridMgr.canPlaceUnit(cell.row, cell.col)) {
      this._showTip('该格不能放置');
      return false;
    }

    const hero = createHeroFromCard(this.scene, slotView.card);
    if (!hero) return false;
    if (!this.gridMgr.placeUnit(cell.row, cell.col, hero)) {
      hero.sprite.destroy();
      return false;
    }

    hero.place(cell.row, cell.col);
    this.gridMgr.unitContainer.add(hero.sprite);
    this.battleSystem.addAlly(hero);
    this.boardControl.makeControllable(hero);
    this._clearSlots([slotView.slotIndex]);
    this._showTip('英雄已上阵');
    this._redraw();
    return true;
  }

  private _tryUseItem(slotView: InventorySlotView, worldX: number, worldY: number): boolean {
    const itemId = slotView.card.itemId;
    if (!itemId) return false;

    if (itemId === ItemId.UNIVERSAL_SHARD) {
      const cell = this.gridMgr.worldToCell(worldX, worldY);
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

      this._clearSlots([slotView.slotIndex]);
      this._showTip(result === 'activated' ? '英雄已合成' : '通用碎片已补位');
      this._redraw();
      return true;
    }

    const cell = this.gridMgr.worldToCell(worldX, worldY);
    const success = ItemSystem.getInstance().use(itemId, {
      gridMgr: this.gridMgr,
      battleSystem: this.battleSystem,
      row: cell?.row,
      col: cell?.col,
    });

    if (!success) {
      this._showTip(this._getItemFailTip(itemId));
      return false;
    }

    this._clearSlots([slotView.slotIndex]);
    this._showTip(`${slotView.card.displayName}已生效`);
    this._redraw();
    return true;
  }

  private _clearSlots(indexes: number[]): void {
    for (const index of indexes) {
      this._slots[index] = null;
      this._slotViews[index]?.container.destroy();
      this._slotViews[index] = null;
    }
  }

  private async _expandSlot(): Promise<void> {
    if (this._isInteractionLocked()) {
      this._showTip('暂停中不能扩容');
      return;
    }
    if (this._slotLimit >= MAX_INVENTORY_SLOT_LIMIT) return;

    if (AdSystem.getInstance().hasRewardedVideo('extraSummon')) {
      const ok = await AdSystem.getInstance().showRewardedVideo('extraSummon');
      if (!ok) {
        this._showTip('广告未完成');
        return;
      }
    }

    this._slotLimit++;
    this._showTip('仓库已扩容');
    this._redraw();
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

    if (!card.itemId) return false;
    return this._canUseItemOnCell(card.itemId, row, col);
  }

  private _canUseItemOnCell(itemId: ItemId, row: number, col: number): boolean {
    switch (itemId) {
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

  private _getCardVisual(card: CardData): {
    fill: number;
    stroke: number;
    alpha: number;
    lineWidth: number;
    label: string;
    glow: boolean;
  } {
    if (card.type === CardType.SOLDIER) {
      return {
        fill: 0x2f8f74,
        stroke: 0xb7f4de,
        alpha: 0.62,
        lineWidth: 2,
        label: `${card.displayName.slice(0, 2)} Lv${card.soldierRank ?? 1}`,
        glow: false,
      };
    }

    if (card.type === CardType.HERO && card.heroId) {
      const config = getHeroConfig(card.heroId);
      const isCore = config?.rarity === HeroRarity.CORE;
      return {
        fill: isCore ? 0x7a2d22 : 0x2f7866,
        stroke: isCore ? 0xffd36a : 0xb8f4de,
        alpha: isCore ? 0.92 : 0.68,
        lineWidth: isCore ? 3 : 2,
        label: `${(config?.name ?? card.heroId).slice(0, 2)} Lv${card.heroLevel ?? 1}`,
        glow: isCore,
      };
    }

    if (card.type === CardType.HERO_SHARD && card.heroId) {
      const config = getHeroConfig(card.heroId);
      const isCore = config?.rarity === HeroRarity.CORE || (config?.maxLevel ?? 0) >= 15;
      return {
        fill: isCore ? 0x7a2d22 : 0x245f56,
        stroke: isCore ? 0xffd36a : 0xb7f4de,
        alpha: isCore ? 0.92 : 0.62,
        lineWidth: isCore ? 3 : 2,
        label: `${(config?.name ?? card.heroId).slice(0, 2)}碎`,
        glow: isCore,
      };
    }

    const itemId = card.itemId;
    const itemVisual = itemId ? ITEM_VISUALS[itemId] : null;
    return {
      fill: itemVisual?.fill ?? 0x6d58a8,
      stroke: itemVisual?.stroke ?? 0xfff3c0,
      alpha: 0.62,
      lineWidth: 2,
      label: card.displayName,
      glow: false,
    };
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

  private _showTip(text: string): void {
    this._tipValue = text;
    this._tipText?.setText(text);
    this.scene.time.delayedCall(1500, () => {
      if (this._tipValue === text) {
        this._tipValue = '';
        this._tipText?.setText('');
      }
    });
  }

  private _isInteractionLocked(): boolean {
    return !gameMgr.isPlaying;
  }

  private _getPointerWorld(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    return {
      x: pointer.worldX ?? pointer.x,
      y: pointer.worldY ?? pointer.y,
    };
  }
}
