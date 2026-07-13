/**
 * 游戏全局管理器 — 聚合根，组合三个专注的状态模块
 *
 * 保持向后兼容的扁平 API，同时暴露子状态供新代码直接使用：
 *   gameMgr.currency.peach
 *   gameMgr.monk.hp
 *   gameMgr.session.waveNumber
 */
import { GameState, GameMode } from '../types';
import { CurrencyState } from './CurrencyState';
import { MonkState } from './MonkState';
import { SessionState } from './SessionState';

export class GameManager {
  private static _instance: GameManager;

  /** 仙桃货币子状态 */
  readonly currency = new CurrencyState();
  /** 唐僧血量子状态 */
  readonly monk = new MonkState();
  /** 对局元数据子状态 */
  readonly session = new SessionState();

  static getInstance(): GameManager {
    if (!this._instance) this._instance = new GameManager();
    return this._instance;
  }

  static createInstance(): GameManager {
    this._instance = new GameManager();
    return this._instance;
  }

  // ==================== 状态（委托到 session） ====================

  get state(): GameState { return this.session.state; }
  get mode(): GameMode { return this.session.mode; }
  get isPlaying(): boolean { return this.session.isPlaying; }

  setState(s: GameState): void { this.session.setState(s); }
  setMode(m: GameMode): void { this.session.setMode(m); }

  // ==================== 仙桃（委托到 currency） ====================

  get peach(): number { return this.currency.peach; }

  addPeach(amount: number): void { this.currency.add(amount); }

  consumePeach(amount: number): boolean { return this.currency.consume(amount); }

  // ==================== 唐僧血量（委托到 monk） ====================

  get monkHp(): number { return this.monk.hp; }
  get maxMonkHp(): number { return this.monk.maxHp; }

  canFortifyMonk(maxHpLimit: number = 7): boolean { return this.monk.canFortify(maxHpLimit); }

  fortifyMonk(amount: number = 2, maxHpLimit: number = 7): boolean {
    return this.monk.fortify(amount, maxHpLimit);
  }

  damageMonk(dmg: number = 1): void {
    const result = this.monk.damage(dmg);
    if (result.died) {
      this.session.lose();
    }
  }

  reviveMonk(hp: number = 1): void { this.monk.revive(hp); }

  applyMonkInvincible(duration: number): void { this.monk.applyInvincible(duration); }

  get monkInvincibleRemaining(): number { return this.monk.invincibleRemaining; }

  // ==================== 波次/击杀（委托到 session） ====================

  get waveNumber(): number { return this.session.waveNumber; }
  get totalKills(): number { return this.session.totalKills; }

  nextWave(): void { this.session.nextWave(); }
  addKill(): void { this.session.addKill(); }

  // ==================== 八十一难（委托到 session） ====================

  get currentLevel(): number { return this.session.currentLevel; }
  setCurrentLevel(lv: number): void { this.session.setCurrentLevel(lv); }

  get currentLoop(): number { return this.session.currentLoop; }
  setCurrentLoop(loop: number): void { this.session.setCurrentLoop(loop); }

  get selectedHeroes(): string[] { return this.session.selectedHeroes; }
  setSelectedHeroes(ids: string[]): void { this.session.setSelectedHeroes(ids); }

  // ==================== 生命周期 ====================

  /** 初始化新一局 */
  startNewGame(mode: GameMode): void {
    this.currency.reset(50);
    this.monk.reset(3, 3);
    this.session.startNewGame(mode);
  }

  /** 胜利结算 */
  win(): void { this.session.win(); }

  /** 每帧 tick */
  update(dt: number): void { this.monk.update(dt); }
}

export const gameMgr = GameManager.createInstance();
