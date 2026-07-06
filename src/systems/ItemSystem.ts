import { eventMgr, GameEvent } from '../core/EventManager';
import { ITEM_FEEDBACK_CONFIGS } from '../config/ItemFeedbackConfig';
import { gameMgr } from '../core/GameManager';
import { Hero } from '../entities/Hero';
import { GridManager } from '../grid/GridManager';
import { ItemId } from '../types';
import { BattleSystem } from './BattleSystem';
import { EffectSystem } from './EffectSystem';

export interface ItemUseContext {
  gridMgr: GridManager;
  battleSystem: BattleSystem;
  row?: number;
  col?: number;
}

export class ItemSystem {
  private static _instance: ItemSystem;

  static getInstance(): ItemSystem {
    if (!this._instance) this._instance = new ItemSystem();
    return this._instance;
  }

  use(itemId: ItemId, context: ItemUseContext): boolean {
    switch (itemId) {
      case ItemId.AXE:
        return this._useAxe(context);
      // 以下道具已从抽卡池移除（设计方案 §2.2），保留供后续广告奖励/活动使用
      case ItemId.ELIXIR:
        return this._useElixir(context);
      case ItemId.UNIVERSAL_SHARD:
        return this._useUniversalShard(context);
      case ItemId.HEADBAND:
        return this._useHeadband(context);
      case ItemId.VASE:
        return this._useVase(context);
      default:
        return false;
    }
  }

  private _useAxe(context: ItemUseContext): boolean {
    const { gridMgr, row, col } = context;
    if (row === undefined || col === undefined) return false;
    const success = gridMgr.unlockCell(row, col);
    if (success) {
      this._playCellFeedback(ItemId.AXE, context, row, col);
      eventMgr.emit(GameEvent.ITEM_USED, ItemId.AXE, row, col);
    }
    return success;
  }

  private _useElixir(context: ItemUseContext): boolean {
    const hero = this._getCellOccupant(context) as Hero | null;
    if (!(hero instanceof Hero) || !hero.levelUp()) return false;
    this._playSpriteFeedback(ItemId.ELIXIR, context, hero.sprite.x, hero.sprite.y);
    eventMgr.emit(GameEvent.HERO_LEVEL_UP, hero);
    eventMgr.emit(GameEvent.ITEM_USED, ItemId.ELIXIR, hero);
    return true;
  }

  private _useUniversalShard(context: ItemUseContext): boolean {
    void context;
    return false;
  }

  private _useHeadband(context: ItemUseContext): boolean {
    let affected = 0;
    for (const enemy of context.battleSystem.enemies) {
      if (!enemy.alive) continue;
      enemy.applySlow(0.5, 5);
      affected++;
    }

    if (affected <= 0) return false;
    this._playGroupFeedback(ItemId.HEADBAND, context, affected);
    eventMgr.emit(GameEvent.ITEM_USED, ItemId.HEADBAND, affected);
    return true;
  }

  private _useVase(context: ItemUseContext): boolean {
    if (!gameMgr.fortifyMonk(2, 7)) return false;
    this._playGroupFeedback(ItemId.VASE, context, 2);
    eventMgr.emit(GameEvent.ITEM_USED, ItemId.VASE, gameMgr.monkHp, gameMgr.maxMonkHp);
    return true;
  }

  private _getCellOccupant(context: ItemUseContext): unknown {
    if (context.row === undefined || context.col === undefined) return null;
    return context.gridMgr.getCell(context.row, context.col)?.occupant ?? null;
  }

  private _playCellFeedback(itemId: ItemId, context: ItemUseContext, row: number, col: number): void {
    const center = context.gridMgr.cellCenter(row, col);
    this._playSpriteFeedback(itemId, context, center.x, center.y);
  }

  private _playGroupFeedback(itemId: ItemId, context: ItemUseContext, amount: number): void {
    const gridMgr = context.gridMgr;
    const monk = gridMgr.getMonkCell();
    const center = gridMgr.cellCenter(monk.row, monk.col);
    this._playSpriteFeedback(itemId, context, center.x, center.y, amount);
  }

  private _playSpriteFeedback(itemId: ItemId, context: ItemUseContext, x: number, y: number, amount?: number): void {
    const config = ITEM_FEEDBACK_CONFIGS[itemId];
    const effect = EffectSystem.forScene(context.gridMgr.scene);
    const radius = Math.round(context.gridMgr.cellSize * config.radiusScale);
    const label = amount === undefined ? config.label : `${config.label}×${amount}`;

    effect.playRing(x, y, {
      radius,
      color: config.color,
      alpha: 0.76,
      lineWidth: 4,
      depth: 96,
      scaleTo: 1.28,
      duration: 260,
    });
    effect.playFloatText(x, y - 16, label, {
      color: '#fff1a8',
      fontSize: '18px',
      depth: 122,
      rise: 30,
      duration: 760,
    });
  }
}
