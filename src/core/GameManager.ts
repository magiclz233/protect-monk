/**
 * 游戏全局管理器 - 状态、资源、模式控制
 * 纯 TS 单例，无引擎依赖
 */
import { GameState, GameMode, SaveData } from '../types';
import { eventMgr, GameEvent } from './EventManager';

export class GameManager {
  private static _instance: GameManager;

  private _state: GameState = GameState.IDLE;
  private _mode: GameMode = GameMode.DEFENSE;
  private _peach: number = 0;
  private _monkHp: number = 3;
  private _maxMonkHp: number = 3;
  private _waveNumber: number = 0;
  private _totalKills: number = 0;
  private _currentLevel: number = 1;
  private _currentLoop: number = 1;
  private _selectedHeroes: string[] = [];
  private _monkInvincibleTimer: number = 0;

  static getInstance(): GameManager {
    if (!this._instance) this._instance = new GameManager();
    return this._instance;
  }

  static createInstance(): GameManager {
    this._instance = new GameManager();
    return this._instance;
  }

  // ==================== 状态 ====================

  get state(): GameState { return this._state; }
  get mode(): GameMode { return this._mode; }
  get isPlaying(): boolean { return this._state === GameState.PLAYING; }

  setState(s: GameState): void {
    this._state = s;
    if (s === GameState.PLAYING) eventMgr.emit(GameEvent.GAME_START);
  }

  setMode(m: GameMode): void { this._mode = m; }

  // ==================== 仙桃 ====================

  get peach(): number { return this._peach; }

  addPeach(amount: number): void {
    this._peach += amount;
    eventMgr.emit(GameEvent.PEACH_CHANGED, this._peach);
  }

  consumePeach(amount: number): boolean {
    if (this._peach < amount) return false;
    this._peach -= amount;
    eventMgr.emit(GameEvent.PEACH_CHANGED, this._peach);
    return true;
  }

  // ==================== 唐僧血量 ====================

  get monkHp(): number { return this._monkHp; }
  get maxMonkHp(): number { return this._maxMonkHp; }

  canFortifyMonk(maxHpLimit: number = 7): boolean {
    return this._maxMonkHp < maxHpLimit || this._monkHp < this._maxMonkHp;
  }

  fortifyMonk(amount: number = 2, maxHpLimit: number = 7): boolean {
    if (!this.canFortifyMonk(maxHpLimit)) return false;

    const maxIncrease = Math.max(0, Math.min(amount, maxHpLimit - this._maxMonkHp));
    this._maxMonkHp += maxIncrease;
    this._monkHp = Math.min(this._maxMonkHp, this._monkHp + amount);
    eventMgr.emit(GameEvent.MONK_DAMAGED, this._monkHp);
    return true;
  }

  damageMonk(dmg: number = 1): void {
    if (this._monkInvincibleTimer > 0) return;
    this._monkHp = Math.max(0, this._monkHp - dmg);
    eventMgr.emit(GameEvent.MONK_DAMAGED, this._monkHp);
    if (this._monkHp <= 0) {
      this._state = GameState.RESULT;
      eventMgr.emit(GameEvent.BATTLE_LOSE, this._waveNumber);
    }
  }

  reviveMonk(hp: number = 1): void {
    if (this._monkHp > 0) return;
    this._monkHp = Math.max(1, Math.min(this._maxMonkHp, hp));
    this._state = GameState.PLAYING;
    eventMgr.emit(GameEvent.MONK_DAMAGED, this._monkHp);
  }

  applyMonkInvincible(duration: number): void {
    this._monkInvincibleTimer = Math.max(this._monkInvincibleTimer, duration);
  }

  update(dt: number): void {
    this._monkInvincibleTimer = Math.max(0, this._monkInvincibleTimer - dt);
  }

  get monkInvincibleRemaining(): number { return this._monkInvincibleTimer; }

  // ==================== 波次 ====================

  get waveNumber(): number { return this._waveNumber; }
  get totalKills(): number { return this._totalKills; }

  nextWave(): void {
    this._waveNumber++;
    eventMgr.emit(GameEvent.WAVE_START, this._waveNumber);
  }

  addKill(): void {
    this._totalKills++;
    eventMgr.emit(GameEvent.KILL_CHANGED, this._totalKills);
  }

  // ==================== 八十一难 ====================

  get currentLevel(): number { return this._currentLevel; }
  setCurrentLevel(lv: number): void { this._currentLevel = lv; }
  get currentLoop(): number { return this._currentLoop; }
  setCurrentLoop(loop: number): void { this._currentLoop = Math.max(1, Math.floor(loop)); }

  get selectedHeroes(): string[] { return this._selectedHeroes; }
  setSelectedHeroes(ids: string[]): void { this._selectedHeroes = ids; }

  /** 初始化新一局 */
  startNewGame(mode: GameMode): void {
    this._state = GameState.PLAYING;
    this._mode = mode;
    this._peach = 50;
    this._monkHp = 3;
    this._maxMonkHp = 3;
    this._monkInvincibleTimer = 0;
    this._waveNumber = 0;
    this._totalKills = 0;
    eventMgr.emit(GameEvent.GAME_START, mode);
  }

  /** 胜利结算 */
  win(): void {
    this._state = GameState.RESULT;
    eventMgr.emit(GameEvent.BATTLE_WIN, this._waveNumber, this._totalKills);
  }
}

export const gameMgr = GameManager.createInstance();
