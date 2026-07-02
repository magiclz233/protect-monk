/**
 * 道具系统
 */
import { ItemId } from '../types';
import { eventMgr, GameEvent } from '../core/EventManager';

export class ItemSystem {
  private static _instance: ItemSystem;
  static getInstance(): ItemSystem {
    if (!this._instance) this._instance = new ItemSystem();
    return this._instance;
  }

  /** 使用道具，返回是否成功 */
  use(itemId: ItemId, target?: any): boolean {
    switch (itemId) {
      case ItemId.AXE: return this._useAxe();
      case ItemId.ELIXIR: return this._useElixir(target);
      case ItemId.HEADBAND: return this._useHeadband();
      case ItemId.VASE: return this._useVase();
      default: return false;
    }
  }

  private _useAxe(): boolean {
    // 由GridManager检测并解锁山石格
    eventMgr.emit(GameEvent.ITEM_USED, ItemId.AXE);
    return true;
  }

  private _useElixir(hero: any): boolean {
    if (!hero || hero.level >= hero.maxLevel) return false;
    hero.levelUp();
    eventMgr.emit(GameEvent.HERO_LEVEL_UP, hero);
    eventMgr.emit(GameEvent.ITEM_USED, ItemId.ELIXIR);
    return true;
  }

  private _useHeadband(): boolean {
    eventMgr.emit(GameEvent.ITEM_USED, ItemId.HEADBAND);
    return true;
  }

  private _useVase(): boolean {
    eventMgr.emit(GameEvent.ITEM_USED, ItemId.VASE);
    return true;
  }
}
