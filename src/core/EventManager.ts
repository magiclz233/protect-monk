/**
 * 事件管理器 - 全局消息总线
 * 纯 TS，零引擎依赖
 */

export enum GameEvent {
  GAME_START = 'game_start',
  GAME_OVER = 'game_over',
  BATTLE_WIN = 'battle_win',
  BATTLE_LOSE = 'battle_lose',
  MONK_DAMAGED = 'monk_damaged',

  UNIT_PLACED = 'unit_placed',
  UNIT_MERGED = 'unit_merged',
  UNIT_REMOVED = 'unit_removed',
  HERO_ACTIVATED = 'hero_activated',
  HERO_LEVEL_UP = 'hero_level_up',

  ENEMY_SPAWNED = 'enemy_spawned',
  ENEMY_KILLED = 'enemy_killed',
  WAVE_START = 'wave_start',
  WAVE_CLEAR = 'wave_clear',

  PEACH_CHANGED = 'peach_changed',
  ITEM_USED = 'item_used',

  SUMMON_REFRESH = 'summon_refresh',
  CARD_SELECTED = 'card_selected',
}

class EventManager {
  private static _instance: EventManager;
  private _handlers: Map<string, Array<(...args: any[]) => void>> = new Map();

  static getInstance(): EventManager {
    if (!this._instance) {
      this._instance = new EventManager();
    }
    return this._instance;
  }

  on(event: GameEvent | string, handler: (...args: any[]) => void): void {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, []);
    }
    this._handlers.get(event)!.push(handler);
  }

  off(event: GameEvent | string, handler: (...args: any[]) => void): void {
    const handlers = this._handlers.get(event);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx !== -1) handlers.splice(idx, 1);
    }
  }

  emit(event: GameEvent | string, ...args: any[]): void {
    const handlers = this._handlers.get(event);
    if (handlers) {
      for (let i = 0; i < handlers.length; i++) handlers[i](...args);
    }
  }

  clear(): void {
    this._handlers.clear();
  }
}

export const eventMgr = EventManager.getInstance();
