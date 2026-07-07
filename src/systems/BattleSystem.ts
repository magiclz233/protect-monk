import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { eventMgr, GameEvent } from '../core/EventManager';
import { ObjectPool } from '../core/ObjectPool';
import { ENEMY_CONFIGS, getEnemyConfig } from '../config/EnemyConfig';
import { getKillPeachReward } from '../data/EnemyRewardData';
import { Enemy } from '../entities/Enemy';
import { Hero } from '../entities/Hero';
import { TangMonk } from '../entities/TangMonk';
import { Unit } from '../entities/Unit';
import { GridManager } from '../grid/GridManager';
import { EnemyConfig } from '../types';
import { ExperienceSystem, IExperienceTarget } from './ExperienceSystem';
import { FactionSystem } from './FactionSystem';

const NORMAL_THREAT_RADIUS = 1.15;
const BAJIE_TAUNT_RADIUS = 2.35;
const NIU_TAUNT_RADIUS = 1.85;
const ALLY_TARGET_SCAN_INTERVAL = 0.15;
const ENEMY_THREAT_SCAN_INTERVAL = 0.2;

export interface EnemySpawnModifiers {
  hpMultiplier?: number;
  attackMultiplier?: number;
  speedMultiplier?: number;
}

export class BattleSystem {
  readonly enemies: Enemy[] = [];
  readonly allies: Unit[] = [];

  private _waveAlive: boolean = false;
  private _waveSpawning: boolean = false;
  private _allyTargetScanTimer: number = ALLY_TARGET_SCAN_INTERVAL;
  private _enemyThreatScanTimer: number = ENEMY_THREAT_SCAN_INTERVAL;
  private readonly _enemyPool: ObjectPool<Enemy>;

  constructor(private readonly scene: Phaser.Scene, private readonly tangMonk?: TangMonk) {
    const fallbackConfig = ENEMY_CONFIGS[0];
    this._enemyPool = new ObjectPool<Enemy>(
      () => new Enemy(this.scene, fallbackConfig),
      enemy => enemy.recycle(),
      8,
    );

    // 注册 Boss 召唤小兵的回调（白骨夫人 summon_minions）
    if (!scene.registry.has('bossSummonHandler')) {
      scene.registry.set('bossSummonHandler', (boss: Enemy) => {
        for (let i = 0; i < 3; i++) {
          this.spawnEnemy('xiaoyao_1', {
            hpMultiplier: 0.4,
            attackMultiplier: 0.5,
            speedMultiplier: 0.9,
          });
        }
      });
    }
  }

  addAlly(unit: Unit): void {
    if (!this.allies.includes(unit)) {
      this.allies.push(unit);
      this._refreshFactionBuffs();
      this._requestTargetScan();
    }
  }

  removeAlly(unit: Unit): void {
    const index = this.allies.indexOf(unit);
    if (index >= 0) {
      this.allies.splice(index, 1);
      this._refreshFactionBuffs();
    }
  }

  beginWave(): void {
    this._waveAlive = true;
    this._waveSpawning = true;
    this._requestTargetScan();
  }

  finishWaveSpawning(): void {
    this._waveSpawning = false;
    this._checkWaveClear();
  }

  spawnEnemy(enemyId: string, modifiers: EnemySpawnModifiers = {}): Enemy | null {
    const config = getEnemyConfig(enemyId);
    if (!config) {
      console.warn(`[BattleSystem] 未找到敌人配置：${enemyId}`);
      return null;
    }

    const enemy = this._enemyPool.get();
    enemy.reset(this._applySpawnModifiers(config, modifiers));
    const enemyContainer = GridManager.getInstance().enemyContainer;
    if (enemy.sprite.parentContainer !== enemyContainer) {
      enemyContainer.add(enemy.sprite);
    }
    enemy.initOnPath();
    this.enemies.push(enemy);
    this._waveAlive = true;
    this._requestTargetScan();

    eventMgr.emit(GameEvent.ENEMY_SPAWNED, enemy);
    return enemy;
  }

  update(dt: number): void {
    if (!gameMgr.isPlaying) return;

    if (this._shouldRefreshEnemyThreats(dt)) {
      this._assignEnemyAttackTargets();
    }

    this._applyEnemyAuras();
    for (const enemy of this.enemies) {
      enemy.update(dt, this.allies);
    }

    const activeEnemies = this._getActiveEnemies();
    this.tangMonk?.updateAura(dt, this.allies);
    const shouldRefreshAllyTargets = this._shouldRefreshAllyTargets(dt);
    for (const ally of this.allies) {
      if (ally.currentHp <= 0) continue;
      if (ally instanceof Hero) {
        ally.updatePassive(dt, this.allies);
      }
      if (shouldRefreshAllyTargets) {
        if (ally instanceof Hero) {
          ally.setAttackContext(activeEnemies);
        }
        ally.findTarget(activeEnemies);
      }
      ally.update(dt);
    }

    this._cleanupEnemies();
    this._cleanupAllies();
    this._checkWaveClear();
  }

  get hasAliveEnemies(): boolean {
    return this.enemies.some(enemy => enemy.alive);
  }

  private _cleanupEnemies(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.alive) continue;

      if (enemy.currentHp <= 0) {
        this._settleKilledEnemy(enemy);
      }

      this.enemies.splice(i, 1);
      this._enemyPool.put(enemy);
    }
  }

  private _cleanupAllies(): void {
    let changed = false;
    for (let i = this.allies.length - 1; i >= 0; i--) {
      if (this.allies[i].currentHp > 0) continue;
      this.allies.splice(i, 1);
      changed = true;
    }
    if (changed) {
      this._refreshFactionBuffs();
    }
  }

  private _settleKilledEnemy(enemy: Enemy): void {
    if (enemy.expDistributed) return;
    enemy.expDistributed = true;

    gameMgr.addPeach(getKillPeachReward(enemy.enemyType));

    const killer = this._findKiller(enemy);
    const assists = enemy
      .getAllAssistHeroes()
      .filter((hero): hero is IExperienceTarget => this._isExperienceTarget(hero));

    // 太上老君：击杀灼烧目标有 25% 概率返还仙桃
    if (killer?.heroId === 'taishanglaojun' && Math.random() < 0.25) {
      gameMgr.addPeach(Math.max(1, Math.round(getKillPeachReward(enemy.enemyType) * 0.5)));
    }

    ExperienceSystem.getInstance().distribute(
      enemy.killExp,
      enemy.assistExp,
      enemy.auraExp,
      killer,
      assists,
    );
  }

  private _getActiveEnemies(): Enemy[] {
    return this.enemies.filter(enemy => enemy.alive && enemy.currentHp > 0);
  }

  private _requestTargetScan(): void {
    this._allyTargetScanTimer = ALLY_TARGET_SCAN_INTERVAL;
    this._enemyThreatScanTimer = ENEMY_THREAT_SCAN_INTERVAL;
  }

  private _shouldRefreshAllyTargets(dt: number): boolean {
    this._allyTargetScanTimer += dt;
    if (this._allyTargetScanTimer < ALLY_TARGET_SCAN_INTERVAL) return false;
    this._allyTargetScanTimer = 0;
    return true;
  }

  private _shouldRefreshEnemyThreats(dt: number): boolean {
    this._enemyThreatScanTimer += dt;
    if (this._enemyThreatScanTimer < ENEMY_THREAT_SCAN_INTERVAL) return false;
    this._enemyThreatScanTimer = 0;
    return true;
  }

  private _findKiller(enemy: Enemy): IExperienceTarget | null {
    const lastAttacker = (enemy as Enemy & { lastAttacker?: unknown }).lastAttacker;
    return this._isExperienceTarget(lastAttacker) ? lastAttacker : null;
  }

  private _isExperienceTarget(value: unknown): value is IExperienceTarget {
    return value instanceof Hero;
  }

  private _assignEnemyAttackTargets(): void {
    const units = this.allies.filter(ally => ally.currentHp > 0);
    const heroes = units.filter((ally): ally is Hero => ally instanceof Hero);
    const cellSize = GridManager.getInstance().cellSize;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const bajie = this._nearestHeroInRadius(enemy, heroes.filter(hero => hero.heroId === 'zhubajie'), BAJIE_TAUNT_RADIUS * cellSize);
      if (bajie) {
        enemy.setAttackTarget(bajie);
        continue;
      }

      const niumowang = this._nearestHeroInRadius(enemy, heroes.filter(hero => hero.heroId === 'niumowang'), NIU_TAUNT_RADIUS * cellSize);
      if (niumowang) {
        enemy.setAttackTarget(niumowang);
        continue;
      }

      enemy.setAttackTarget(this._nearestUnitInRadius(enemy, units, NORMAL_THREAT_RADIUS * cellSize));
    }
  }

  private _nearestHeroInRadius(enemy: Enemy, heroes: Hero[], radius: number): Hero | null {
    let nearest: Hero | null = null;
    let minDist = Infinity;
    for (const hero of heroes) {
      const dx = hero.sprite.x - enemy.sprite.x;
      const dy = hero.sprite.y - enemy.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius && dist < minDist) {
        minDist = dist;
        nearest = hero;
      }
    }
    return nearest;
  }

  private _nearestUnitInRadius(enemy: Enemy, units: Unit[], radius: number): Unit | null {
    let nearest: Unit | null = null;
    let minDist = Infinity;
    for (const unit of units) {
      const dx = unit.sprite.x - enemy.sprite.x;
      const dy = unit.sprite.y - enemy.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius && dist < minDist) {
        minDist = dist;
        nearest = unit;
      }
    }
    return nearest;
  }

  private _applyEnemyAuras(): void {
    const cellSize = GridManager.getInstance().cellSize;
    const speedAuraEnemies = this.enemies.filter(enemy => enemy.alive && enemy.abilities.includes('speed_aura'));
    if (speedAuraEnemies.length <= 0) return;

    for (const source of speedAuraEnemies) {
      for (const enemy of this.enemies) {
        if (!enemy.alive || enemy === source) continue;
        const dx = enemy.sprite.x - source.sprite.x;
        const dy = enemy.sprite.y - source.sprite.y;
        if (Math.sqrt(dx * dx + dy * dy) <= cellSize * 3) {
          enemy.applySpeedBoost(1.25, 0.35);
        }
      }
    }
  }

  private _applySpawnModifiers(config: EnemyConfig, modifiers: EnemySpawnModifiers): EnemyConfig {
    return {
      ...config,
      hp: Math.max(1, Math.round(config.hp * (modifiers.hpMultiplier ?? 1))),
      attack: Math.max(1, Math.round(config.attack * (modifiers.attackMultiplier ?? 1))),
      speed: Number((config.speed * (modifiers.speedMultiplier ?? 1)).toFixed(3)),
    };
  }

  private _refreshFactionBuffs(): void {
    const heroes = this.allies.filter((ally): ally is Hero => ally instanceof Hero);
    FactionSystem.getInstance().update(heroes.map(hero => hero.heroId));
    for (const hero of heroes) {
      hero.applyLevelStats();
    }
  }

  private _checkWaveClear(): void {
    if (!this._waveAlive || this._waveSpawning || this.enemies.length > 0) return;
    this._waveAlive = false;
    eventMgr.emit(GameEvent.WAVE_CLEAR, gameMgr.waveNumber);
  }
}
