/**
 * 拖放中介器 — 消除 UI 视图之间的直接引用
 *
 * 视图不再互相 import，而是向 Mediator 注册"我是拖放源/目标"。
 * Mediator 负责路由拖放事件。一个 adapter 是假设的 seam，两个 adapter
 * （InventoryBarView + SummonPanel）证明它是真实的 seam。
 */
import { CardData } from '../types';

/** UI 区域可以接收拖放过来的卡牌（存储到仓库槽位） */
export interface InventoryDropTarget {
  containsPoint(x: number, y: number): boolean;
  addCard(card: CardData): boolean;
}

/** UI 区域可以接收拖放过来的卡牌（放置到指定卡槽位置） */
export interface CardSlotDropTarget {
  containsPoint(x: number, y: number): boolean;
  addCardAtPoint(card: CardData, x: number, y: number): boolean;
}

/**
 * 单位可操控性委托 — 替代直接 BoardUnitControlView 类型引用。
 * 当新单位/碎片放置到棋盘上后，Mediator 调用此委托使其可拖拽。
 */
export interface UnitControlDelegate {
  makeControllable(occupant: object): void;
}

export class DragMediator {
  private inventoryTargets: InventoryDropTarget[] = [];
  private cardSlotTargets: CardSlotDropTarget[] = [];
  private unitControlDelegate: UnitControlDelegate | null = null;

  // ==================== 注册 ====================

  registerInventoryTarget(target: InventoryDropTarget): void {
    if (!this.inventoryTargets.includes(target)) {
      this.inventoryTargets.push(target);
    }
  }

  registerCardSlotTarget(target: CardSlotDropTarget): void {
    if (!this.cardSlotTargets.includes(target)) {
      this.cardSlotTargets.push(target);
    }
  }

  setUnitControlDelegate(delegate: UnitControlDelegate): void {
    this.unitControlDelegate = delegate;
  }

  unregister(target: InventoryDropTarget | CardSlotDropTarget): void {
    this.inventoryTargets = this.inventoryTargets.filter(t => t !== target);
    this.cardSlotTargets = this.cardSlotTargets.filter(t => t !== target);
  }

  // ==================== 查询 ====================

  findInventoryTarget(x: number, y: number): InventoryDropTarget | null {
    return this.inventoryTargets.find(t => t.containsPoint(x, y)) ?? null;
  }

  findCardSlotTarget(x: number, y: number): CardSlotDropTarget | null {
    return this.cardSlotTargets.find(t => t.containsPoint(x, y)) ?? null;
  }

  isOverInventory(x: number, y: number): boolean {
    return this.inventoryTargets.some(t => t.containsPoint(x, y));
  }

  isOverCardSlot(x: number, y: number): boolean {
    return this.cardSlotTargets.some(t => t.containsPoint(x, y));
  }

  /** 让新放置的棋盘单位可拖拽 */
  makeControllable(occupant: object): void {
    this.unitControlDelegate?.makeControllable(occupant);
  }

  // ==================== 清理 ====================

  clear(): void {
    this.inventoryTargets.length = 0;
    this.cardSlotTargets.length = 0;
    this.unitControlDelegate = null;
  }
}
