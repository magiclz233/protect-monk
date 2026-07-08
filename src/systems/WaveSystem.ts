import { gameMgr } from '../core/GameManager';
import { DEFENSE_WAVES, MAX_ALIVE_ENEMIES, createEndlessWave } from '../data/DefenseWaveData';
import { WaveConfig } from '../types';
import { BattleSystem } from './BattleSystem';

type WavePhase = 'idle' | 'countdown' | 'spawning' | 'waiting_clear' | 'complete';

interface WaveStartOptions {
  waves?: WaveConfig[];
  endless?: boolean;
  transformWave?: (wave: WaveConfig) => WaveConfig;
  /** 每波开始时的回调（传入波次号，从 1 开始） */
  onWaveStart?: (waveNumber: number) => void;
}

export class WaveSystem {
  private _phase: WavePhase = 'idle';
  private _nextWaveIndex: number = 0;
  private _countdown: number = 0;
  private _currentWave: WaveConfig | null = null;
  private _groupIndex: number = 0;
  private _remainingInGroup: number = 0;
  private _spawnTimer: number = 0;
  private _endless: boolean = false;
  private _waves: WaveConfig[] = DEFENSE_WAVES;
  private _transformWave: ((wave: WaveConfig) => WaveConfig) | null = null;
  private _onWaveStart: ((waveNumber: number) => void) | null = null;

  constructor(private readonly battleSystem: BattleSystem) {}

  start(options: WaveStartOptions | boolean = false): void {
    const normalized = typeof options === 'boolean' ? { endless: options } : options;
    this._waves = normalized.waves ?? DEFENSE_WAVES;
    this._endless = normalized.endless ?? false;
    this._transformWave = normalized.transformWave ?? null;
    this._onWaveStart = normalized.onWaveStart ?? null;
    this._nextWaveIndex = 0;
    this._phase = 'countdown';
    this._countdown = this._waves[0]?.startDelay ?? 0;
  }

  update(dt: number): void {
    if (!gameMgr.isPlaying || this._phase === 'complete' || this._phase === 'idle') return;

    if (this._phase === 'countdown') {
      this._countdown -= dt;
      if (this._countdown <= 0) {
        this._startNextWave();
      }
      return;
    }

    if (this._phase === 'spawning') {
      this._updateSpawning(dt);
      return;
    }

    if (this._phase === 'waiting_clear' && !this.battleSystem.hasAliveEnemies) {
      this._onWaveClear();
    }
  }

  get phase(): WavePhase {
    return this._phase;
  }

  get countdown(): number {
    return Math.max(0, Math.ceil(this._countdown));
  }

  private _startNextWave(): void {
    const waveNumber = this._nextWaveIndex + 1;
    this._currentWave = this._getWaveConfig(waveNumber);
    this._groupIndex = 0;
    this._remainingInGroup = this._currentWave.enemies[0]?.count ?? 0;
    this._spawnTimer = 0;
    this._phase = 'spawning';

    gameMgr.nextWave();
    this._onWaveStart?.(waveNumber);
    this.battleSystem.beginWave();
  }

  private _updateSpawning(dt: number): void {
    if (!this._currentWave) return;
    if (this.battleSystem.enemies.length >= MAX_ALIVE_ENEMIES) return;

    this._spawnTimer -= dt;
    if (this._spawnTimer > 0) return;

    const group = this._currentWave.enemies[this._groupIndex];
    if (!group) {
      this._phase = 'waiting_clear';
      this.battleSystem.finishWaveSpawning();
      return;
    }

    this.battleSystem.spawnEnemy(group.enemyId, {
      hpMultiplier: group.hpMultiplier,
      attackMultiplier: group.attackMultiplier,
      speedMultiplier: group.speedMultiplier,
    });
    this._remainingInGroup--;

    if (this._remainingInGroup <= 0) {
      this._groupIndex++;
      this._remainingInGroup = this._currentWave.enemies[this._groupIndex]?.count ?? 0;
    }

    this._spawnTimer = group.interval;
  }

  private _onWaveClear(): void {
    this._nextWaveIndex++;

    if (!this._endless && this._nextWaveIndex >= this._waves.length) {
      this._phase = 'complete';
      gameMgr.win();
      return;
    }

    const nextWave = this._getWaveConfig(this._nextWaveIndex + 1);
    this._countdown = nextWave.startDelay;
    this._phase = 'countdown';
  }

  private _getWaveConfig(waveNumber: number): WaveConfig {
    const wave = this._waves[waveNumber - 1] ?? createEndlessWave(waveNumber);
    return this._transformWave ? this._transformWave(wave) : wave;
  }
}
