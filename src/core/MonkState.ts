/**
 * 唐僧血量状态 — 封装 HP 管理、无敌计时、强化和复活逻辑
 */
import { eventMgr, GameEvent } from './EventManager';

export interface MonkDamageResult {
  hp: number;
  died: boolean;
}

export class MonkState {
  private _hp: number = 3;
  private _maxHp: number = 3;
  private _invincibleTimer: number = 0;

  // ==================== 访问器 ====================

  get hp(): number { return this._hp; }
  get maxHp(): number { return this._maxHp; }
  get isInvincible(): boolean { return this._invincibleTimer > 0; }
  get invincibleRemaining(): number { return this._invincibleTimer; }

  // ==================== 操作 ====================

  canFortify(maxHpLimit: number = 7): boolean {
    return this._maxHp < maxHpLimit || this._hp < this._maxHp;
  }

  fortify(amount: number = 2, maxHpLimit: number = 7): boolean {
    if (!this.canFortify(maxHpLimit)) return false;

    const maxIncrease = Math.max(0, Math.min(amount, maxHpLimit - this._maxHp));
    this._maxHp += maxIncrease;
    this._hp = Math.min(this._maxHp, this._hp + amount);
    eventMgr.emit(GameEvent.MONK_DAMAGED, this._hp);
    return true;
  }

  /** 受到伤害，返回 { hp, died } */
  damage(dmg: number = 1): MonkDamageResult {
    if (this._invincibleTimer > 0) return { hp: this._hp, died: false };
    this._hp = Math.max(0, this._hp - dmg);
    eventMgr.emit(GameEvent.MONK_DAMAGED, this._hp);
    return { hp: this._hp, died: this._hp <= 0 };
  }

  revive(hp: number = 1): boolean {
    if (this._hp > 0) return false;
    this._hp = Math.max(1, Math.min(this._maxHp, hp));
    eventMgr.emit(GameEvent.MONK_DAMAGED, this._hp);
    return true;
  }

  applyInvincible(duration: number): void {
    this._invincibleTimer = Math.max(this._invincibleTimer, duration);
  }

  /** 每帧 tick 无敌计时器 */
  update(dt: number): void {
    this._invincibleTimer = Math.max(0, this._invincibleTimer - dt);
  }

  reset(hp: number = 3, maxHp: number = 3): void {
    this._hp = hp;
    this._maxHp = maxHp;
    this._invincibleTimer = 0;
  }
}
