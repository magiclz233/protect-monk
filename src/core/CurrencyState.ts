/**
 * 仙桃货币状态 — 封装仙桃收支逻辑
 */
import { eventMgr, GameEvent } from './EventManager';

export class CurrencyState {
  private _peach: number = 0;

  get peach(): number {
    return this._peach;
  }

  add(amount: number): void {
    this._peach += amount;
    eventMgr.emit(GameEvent.PEACH_CHANGED, this._peach);
  }

  consume(amount: number): boolean {
    if (this._peach < amount) return false;
    this._peach -= amount;
    eventMgr.emit(GameEvent.PEACH_CHANGED, this._peach);
    return true;
  }

  reset(initial: number): void {
    this._peach = initial;
  }
}
