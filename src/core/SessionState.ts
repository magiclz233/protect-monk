/**
 * 对局元数据状态 — 封装模式、波次、击杀、关卡和英雄选择
 */
import { GameState, GameMode } from '../types';
import { eventMgr, GameEvent } from './EventManager';

export class SessionState {
  private _state: GameState = GameState.IDLE;
  private _mode: GameMode = GameMode.DEFENSE;
  private _waveNumber: number = 0;
  private _totalKills: number = 0;
  private _currentLevel: number = 1;
  private _currentLoop: number = 1;
  private _selectedHeroes: string[] = [];

  // ==================== 访问器 ====================

  get state(): GameState { return this._state; }
  get mode(): GameMode { return this._mode; }
  get isPlaying(): boolean { return this._state === GameState.PLAYING; }
  get waveNumber(): number { return this._waveNumber; }
  get totalKills(): number { return this._totalKills; }
  get currentLevel(): number { return this._currentLevel; }
  get currentLoop(): number { return this._currentLoop; }
  get selectedHeroes(): string[] { return this._selectedHeroes; }

  // ==================== 修改 ====================

  setState(s: GameState): void {
    this._state = s;
    if (s === GameState.PLAYING) eventMgr.emit(GameEvent.GAME_START);
  }

  setMode(m: GameMode): void { this._mode = m; }

  setCurrentLevel(lv: number): void { this._currentLevel = lv; }

  setCurrentLoop(loop: number): void { this._currentLoop = Math.max(1, Math.floor(loop)); }

  setSelectedHeroes(ids: string[]): void { this._selectedHeroes = ids; }

  nextWave(): void {
    this._waveNumber++;
    eventMgr.emit(GameEvent.WAVE_START, this._waveNumber);
  }

  addKill(): void {
    this._totalKills++;
    eventMgr.emit(GameEvent.KILL_CHANGED, this._totalKills);
  }

  /** 初始化新一局 */
  startNewGame(mode: GameMode): void {
    this._state = GameState.PLAYING;
    this._mode = mode;
    this._waveNumber = 0;
    this._totalKills = 0;
    eventMgr.emit(GameEvent.GAME_START, mode);
  }

  /** 胜利结算 */
  win(): void {
    this._state = GameState.RESULT;
    eventMgr.emit(GameEvent.BATTLE_WIN, this._waveNumber, this._totalKills);
  }

  /** 失败结算 */
  lose(): void {
    this._state = GameState.RESULT;
    eventMgr.emit(GameEvent.BATTLE_LOSE, this._waveNumber);
  }
}
