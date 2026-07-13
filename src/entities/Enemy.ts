/**
 * 敌人类 - 妖怪沿路径移动
 */
import Phaser from 'phaser';
import { EnemyConfig, EnemyType } from '../types';
import { GridManager } from '../grid/GridManager';
import { enemyKey } from '../render/AssetKeys';
import { drawEnemyBody } from '../render/VisualPainter';
import { gameMgr } from '../core/GameManager';
import { eventMgr, GameEvent } from '../core/EventManager';
import { Unit } from './Unit';

export class Enemy {
  enemyId: string;
  name: string;
  enemyType: EnemyType;

  maxHp: number;
  currentHp: number;
  attack: number;
  moveSpeed: number;
  baseMoveSpeed: number;
  killExp: number;
  assistExp: number;
  auraExp: number;
  abilities: string[];
  expDistributed: boolean = false;
  lastAttacker: any = null;

  sprite: Phaser.GameObjects.Container;
  private _hpBar: Phaser.GameObjects.Graphics;
  private _bodyGfx!: Phaser.GameObjects.Graphics;

  private _pathIndex: number = 0;
  private _pathDone: boolean = false;
  private _alive: boolean = true;
  private _attackTarget: any = null;
  private _attackTimer: number = 0;
  private _attackCooldown: number = 1.2;
  private _bossSkillTimer: number = 0;
  private _auraTimer: number = 0;
  private _shieldTimer: number = 0;
  private _statusVersion: number = 0;
  private _normalAttackTargets: Set<any> = new Set();
  private _vulnerabilityBuffs = new Map<string, { bonus: number; remaining: number }>();
  private _stunTimer: number = 0;
  private _summonTriggered: boolean = false;
  private _flightSpeedTimer: number = 0;
  private _transformTimer: number = 0;
  private _isTransformed: boolean = false;
  private _windSlashTimer: number = 0;
  private _speedBoostTimer: number = 0;
  private _speedBoostMultiplier: number = 1;
  private _slowTimer: number = 0;
  private _slowMultiplier: number = 1;

  // — 新 Boss 技能计时 —
  private _knockbackTimer: number = 0;   // 铁扇公主 wind_knockback
  private _captureTimer: number = 0;     // 黄眉怪 golden_capture

  /** 章节机制：佛光庇护层数 */
  chapterShieldStacks: number = 0;

  damagedByHeroes: Set<any> = new Set();
  attackTargetedHeroes: Set<any> = new Set();

  private static TYPE_SCALES: Record<EnemyType, number> = {
    [EnemyType.NORMAL]: 0.8,
    [EnemyType.ELITE]: 1.1,
    [EnemyType.BOSS]: 1.4,
  };

  constructor(scene: Phaser.Scene, config: EnemyConfig) {
    this.enemyId = config.enemyId;
    this.name = config.name;
    this.enemyType = config.type;
    this.maxHp = config.hp;
    this.currentHp = config.hp;
    this.attack = config.attack;
    this.baseMoveSpeed = config.speed * 60;
    this.moveSpeed = this.baseMoveSpeed;
    this.killExp = config.killExp;
    this.assistExp = config.assistExp;
    this.auraExp = config.auraExp;
    this.abilities = config.abilities;

    this.sprite = scene.add.container(0, 0);
    this._hpBar = scene.add.graphics();
    this._bodyGfx = scene.add.graphics();
    this.sprite.add(this._hpBar);
    this.sprite.addAt(this._bodyGfx, 0);
    this._drawBody();
    this._updateHpBar();
  }

  private _drawBody(): void {
    const scale = Enemy.TYPE_SCALES[this.enemyType];
    const scene = this.sprite.scene as Phaser.Scene;

    // 清除旧的 body 绘制
    this._bodyGfx.clear();

    // 使用图片素材代替程序化绘制
    const textureKey = enemyKey(this.enemyId);
    if (scene.textures.exists(textureKey)) {
      const img = scene.add.image(0, 0, textureKey);
      img.setScale(scale);
      // 把图片放到 container 最底层（在 HP 条之下）
      this.sprite.addAt(img, 0);
    } else {
      // 降级：如果图片不存在，保持旧的 Graphics 方式
      drawEnemyBody(this._bodyGfx, this.enemyId, this.enemyType, scale);
    }
  }

  initOnPath(): void {
    const pp = GridManager.getInstance().pathPoints;
    if (pp.length > 0) {
      this.sprite.x = pp[0].x;
      this.sprite.y = pp[0].y;
      this._pathIndex = 1;
    }
  }

  reset(config: EnemyConfig): void {
    this.enemyId = config.enemyId;
    this.name = config.name;
    this.enemyType = config.type;
    this.maxHp = config.hp;
    this.currentHp = config.hp;
    this.attack = config.attack;
    this.baseMoveSpeed = config.speed * 60;
    this.moveSpeed = this.baseMoveSpeed;
    this.killExp = config.killExp;
    this.assistExp = config.assistExp;
    this.auraExp = config.auraExp;
    this.abilities = config.abilities;
    this.expDistributed = false;
    this.lastAttacker = null;
    this._pathIndex = 0;
    this._pathDone = false;
    this._alive = true;
    this._attackTarget = null;
    this._attackTimer = 0;
    this._bossSkillTimer = 0;
    this._auraTimer = 0;
    this._shieldTimer = 0;
    this._stunTimer = 0;
    this._summonTriggered = false;
    this._flightSpeedTimer = 0;
    this._transformTimer = 0;
    this._isTransformed = false;
    this._windSlashTimer = 0;
    this._speedBoostTimer = 0;
    this._speedBoostMultiplier = 1;
    this._slowTimer = 0;
    this._slowMultiplier = 1;
    this.chapterShieldStacks = 0;
    this._statusVersion++;
    this._vulnerabilityBuffs.clear();
    this.damagedByHeroes.clear();
    this.attackTargetedHeroes.clear();
    this._normalAttackTargets.clear();
    this._drawBody();
    this.sprite.setVisible(true);
    this.sprite.setActive(true);
    this._updateHpBar();
  }

  recycle(): void {
    this._alive = false;
    this._pathDone = true;
    this._attackTarget = null;
    this._attackTimer = 0;
    this._bossSkillTimer = 0;
    this._auraTimer = 0;
    this._shieldTimer = 0;
    this._stunTimer = 0;
    this._summonTriggered = false;
    this._flightSpeedTimer = 0;
    this._transformTimer = 0;
    this._isTransformed = false;
    this._windSlashTimer = 0;
    this._speedBoostTimer = 0;
    this._speedBoostMultiplier = 1;
    this._slowTimer = 0;
    this._slowMultiplier = 1;
    this.chapterShieldStacks = 0;
    this._statusVersion++;
    this._vulnerabilityBuffs.clear();
    this.expDistributed = false;
    this.lastAttacker = null;
    this.damagedByHeroes.clear();
    this.attackTargetedHeroes.clear();
    this._normalAttackTargets.clear();
    this.moveSpeed = this.baseMoveSpeed;
    this.currentHp = this.maxHp;
    this.sprite.setVisible(false);
    this.sprite.setActive(false);
    this._updateHpBar();
  }

  update(dt: number, allies: Unit[] = []): void {
    if (!this._alive || this._pathDone) return;

    this._updateStatuses(dt);
    this._updateBossSkills(dt, allies);

    if (this._stunTimer > 0) return;

    if (this._tryAttackTarget(dt, allies)) return;

    const pp = GridManager.getInstance().pathPoints;

    if (this._pathIndex >= pp.length) {
      const handlers = this.sprite.scene.registry.get('enemyEndpointHandlers') as Array<(enemy: Enemy) => boolean> | undefined;
      if (handlers?.some(handler => handler(this))) {
        return;
      }
      this._pathDone = true;
      gameMgr.damageMonk(1);
      this._die();
      return;
    }

    const target = pp[this._pathIndex];
    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const moveStep = this.moveSpeed * dt;

    if (dist <= moveStep) {
      this.sprite.x = target.x;
      this.sprite.y = target.y;
      this._pathIndex++;
    } else {
      this.sprite.x += (dx / dist) * moveStep;
      this.sprite.y += (dy / dist) * moveStep;
    }
  }

  setAttackTarget(target: any | null): void {
    this._attackTarget = target;
  }

  takeDamage(amount: number, attacker?: any): void {
    if (!this._alive) return;
    if (this._isTransformed) return;
    if (this._shieldTimer > 0 && this.abilities.includes('summon_minions')) return;
    if (this.abilities.includes('dodge') && Math.random() < 0.22) return;

    let finalAmount = amount;
    finalAmount = Math.max(1, Math.round(finalAmount * (1 + this.vulnerabilityBonus)));
    if (this.abilities.includes('damage_resist')) {
      finalAmount = Math.max(1, Math.round(finalAmount * 0.72));
    }
    if (this._shieldTimer > 0 && this.abilities.includes('damage_reflect')) {
      finalAmount = Math.max(1, Math.round(amount * 0.7));
      if (attacker && typeof attacker.takeDamage === 'function') {
        attacker.takeDamage(Math.max(1, Math.round(amount * 0.18)));
      }
    }
    this.currentHp = Math.max(0, this.currentHp - finalAmount);
    if (attacker) {
      this.lastAttacker = attacker;
      this.damagedByHeroes.add(attacker);
    }
    this._updateHpBar();

    if (this.currentHp <= 0) {
      eventMgr.emit(GameEvent.ENEMY_KILLED, this, attacker);
      gameMgr.addKill();
      this._die();
    }
  }

  applySlow(multiplier: number, duration: number): void {
    if (!this._alive) return;
    this._slowMultiplier = Math.min(this._slowTimer > 0 ? this._slowMultiplier : 1, Math.max(0, multiplier));
    this._slowTimer = Math.max(this._slowTimer, duration);
    this._refreshMoveSpeed();
  }

  applySpeedBoost(multiplier: number, duration: number): void {
    if (!this._alive || multiplier <= 1 || duration <= 0) return;
    this._speedBoostMultiplier = Math.max(this._speedBoostMultiplier, multiplier);
    this._speedBoostTimer = Math.max(this._speedBoostTimer, duration);
    this._refreshMoveSpeed();
  }

  applyVulnerability(source: string, bonus: number, duration: number): void {
    if (!this._alive || duration <= 0 || bonus <= 0) return;
    this._vulnerabilityBuffs.set(source, { bonus, remaining: duration });
  }

  applyStun(duration: number): void {
    if (!this._alive || duration <= 0) return;
    this._stunTimer = Math.max(this._stunTimer, duration);
  }

  knockBack(steps: number): void {
    if (!this._alive || steps <= 0) return;
    const pp = GridManager.getInstance().pathPoints;
    const nearestIndex = this._nearestPathIndex();
    const targetIndex = Math.max(0, nearestIndex - steps);
    const target = pp[targetIndex];
    if (!target) return;
    this.sprite.x = target.x;
    this.sprite.y = target.y;
    this._pathIndex = Math.min(pp.length, targetIndex + 1);
  }

  rewindToStart(): void {
    if (!this._alive) return;
    const pp = GridManager.getInstance().pathPoints;
    if (pp.length <= 0) return;
    this.sprite.x = pp[0].x;
    this.sprite.y = pp[0].y;
    this._pathIndex = 1;
    this._pathDone = false;
  }

  get vulnerabilityBonus(): number {
    let bonus = 0;
    for (const buff of this._vulnerabilityBuffs.values()) {
      bonus += buff.bonus;
    }
    return bonus;
  }

  getAllAssistHeroes(): any[] {
    const all = new Set<any>();
    this.damagedByHeroes.forEach(h => all.add(h));
    this.attackTargetedHeroes.forEach(h => all.add(h));
    return Array.from(all);
  }

  private _tryAttackTarget(dt: number, allies: Unit[]): boolean {
    const target = this._attackTarget;
    if (!target || target.currentHp <= 0 || !target.sprite) {
      this._attackTarget = null;
      return false;
    }
    if (this.enemyType === EnemyType.NORMAL && this._normalAttackTargets.has(target)) {
      return false;
    }

    const attackRange = GridManager.getInstance().cellSize * 1.15;
    const dx = target.sprite.x - this.sprite.x;
    const dy = target.sprite.y - this.sprite.y;
    if (Math.sqrt(dx * dx + dy * dy) > attackRange) {
      return false;
    }

    this._attackTimer += dt;
    if (this._attackTimer >= this._attackCooldown) {
      this._attackTimer = 0;
      target.takeDamage(this.attack);
      if (target.heroId === 'heixiongjing') {
        this.takeDamage(Math.max(1, Math.round(this.attack * 0.25)), target);
      }
      if (target.heroId === 'niumowang') {
        this.takeDamage(Math.max(1, Math.round(this.attack * 0.2)), target);
      }
      if (this.abilities.includes('stun_attack')) {
        target.applyStun(1.2);
      }
      if (this.abilities.includes('trample')) {
        this._damageUnitsAround(target, allies, GridManager.getInstance().cellSize * 1.05, Math.max(1, Math.round(this.attack * 0.55)));
      }
      this._recordAttackTarget(target);
      if (this.enemyType === EnemyType.NORMAL) {
        this._normalAttackTargets.add(target);
      }
    }

    return this.enemyType !== EnemyType.NORMAL;
  }

  private _updateBossSkills(dt: number, allies: Unit[]): void {
    if (this.enemyType !== EnemyType.BOSS) return;

    this._shieldTimer = Math.max(0, this._shieldTimer - dt);
    this._auraTimer += dt;
    if (this._auraTimer >= 1) {
      this._auraTimer = 0;
      if (this.abilities.includes('burn_aura')) {
        this._damageUnitsInRadius(allies, GridManager.getInstance().cellSize * 1.45, Math.max(1, Math.round(this.attack * 0.25)));
      }
      if (this.abilities.includes('damage_aura')) {
        this._damageUnitsInRadius(allies, GridManager.getInstance().cellSize * 1.25, Math.max(1, Math.round(this.attack * 0.18)));
      }
      // 百眼魔君：毒雾光环（每秒持续伤害，范围更大但伤害较低）
      if (this.abilities.includes('poison_aura')) {
        this._damageUnitsInRadius(allies, GridManager.getInstance().cellSize * 1.8, Math.max(1, Math.round(this.attack * 0.12)));
      }
    }

    // 白骨夫人：半血召唤小兵
    this._trySummonMinions(allies);

    // 白骨夫人：周期性变形（不可被攻击）
    this._updateTransform(dt);

    // 大鹏：飞行加速 & 风刃
    this._updateFlightSpeed(dt);
    this._updateWindSlash(dt, allies);

    // 铁扇公主：芭蕉扇击退
    this._updateWindKnockback(dt, allies);

    // 黄眉怪：人种袋捕获
    this._updateGoldenCapture(dt, allies);

    this._bossSkillTimer += dt;
    if (this._bossSkillTimer < 8) return;
    this._bossSkillTimer = 0;

    if (this.abilities.includes('hp_regen')) {
      this._heal(Math.max(1, Math.round(this.maxHp * 0.06)));
    }
    if (this.abilities.includes('damage_reflect')) {
      this._shieldTimer = 3;
    }
    if (this.abilities.includes('absorb_unit')) {
      const target = this._nearestLivingUnit(allies, GridManager.getInstance().cellSize * 2.5);
      if (target) {
        target.applyStun(4);
        target.takeDamage(Math.max(1, Math.round(this.attack * 1.35)));
        this._recordAttackTarget(target);
      }
    }
    if (this.abilities.includes('fireball')) {
      const target = this._nearestLivingUnit(allies);
      if (target) {
        this._damageUnitsAround(target, allies, GridManager.getInstance().cellSize * 1.15, Math.max(1, Math.round(this.attack * 0.85)));
      }
    }
    // — 新 Boss 技能 —
    // 灵感大王：冻结（stun nearby allies）
    if (this.abilities.includes('water_freezing')) {
      this._waterFreezing(allies);
    }
    // 灵感大王：潮汐波（wide AOE damage）
    if (this.abilities.includes('tidal_wave')) {
      this._damageUnitsInRadius(allies, GridManager.getInstance().cellSize * 2.3, Math.max(1, Math.round(this.attack * 0.7)));
    }
    // 铁扇公主：火焰旋风（AOE fire）
    if (this.abilities.includes('fire_tornado')) {
      this._damageUnitsInRadius(allies, GridManager.getInstance().cellSize * 2.0, Math.max(1, Math.round(this.attack * 0.85)));
    }
    // 百眼魔君：千眼致盲（reduce ally attack）
    if (this.abilities.includes('thousand_eyes')) {
      this._thousandEyes(allies);
    }
    // 黄眉怪：假佛光环（AOE debuff）
    if (this.abilities.includes('fake_buddha')) {
      this._fakeBuddhaAura(allies);
    }
  }

  /** 白骨夫人：HP 低于 50% 时召唤小兵并短暂无敌 */
  private _trySummonMinions(allies: Unit[]): void {
    if (!this.abilities.includes('summon_minions') || this._summonTriggered) return;
    if (this.currentHp > this.maxHp * 0.5) return;
    this._summonTriggered = true;

    // 短暂无敌
    this._shieldTimer = 2;
    // 通过 registry 回调通知 BattleSystem 生成小兵
    const handler = this.sprite.scene.registry.get('bossSummonHandler') as ((enemy: Enemy) => void) | undefined;
    if (handler) handler(this);

    // 变形视觉效果
    this._transformTimer = 1.5;
    this._isTransformed = true;
  }

  /** 白骨夫人：周期性变形闪避 */
  private _updateTransform(dt: number): void {
    if (!this.abilities.includes('transform')) return;
    this._transformTimer = Math.max(0, this._transformTimer - dt);
    if (this._transformTimer <= 0 && this._isTransformed) {
      this._isTransformed = false;
    }
    if (this._transformTimer <= 0) {
      this._transformTimer = 12;
      this._isTransformed = true;
      // 变形时短暂不可选中（通过 isTransformed 状态跳过部分攻击判定）
      this.sprite.scene.time.delayedCall(1500, () => {
        if (this._alive) this._isTransformed = false;
      });
    }
  }

  /** 大鹏：周期性飞行加速 */
  private _updateFlightSpeed(dt: number): void {
    if (!this.abilities.includes('flight_speed')) return;
    this._flightSpeedTimer += dt;
    if (this._flightSpeedTimer < 8) return;
    this._flightSpeedTimer = 0;

    this.applySpeedBoost(1.6, 3);
  }

  /** 大鹏：风刃——攻击后排远程单位 */
  private _updateWindSlash(dt: number, allies: Unit[]): void {
    if (!this.abilities.includes('wind_slash')) return;
    this._windSlashTimer += dt;
    if (this._windSlashTimer < 7) return;
    this._windSlashTimer = 0;
    this._tryWindSlash(allies);
  }

  /** 大鹏风刃在 bossSkillTimer 触发时调用 */
  private _tryWindSlash(allies: Unit[]): void {
    if (!this.abilities.includes('wind_slash')) return;
    // 找射程最远的友方单位（后排）
    let backline: Unit | null = null;
    let maxRange = -1;
    for (const unit of allies) {
      if (unit.currentHp <= 0 || !unit.sprite) continue;
      const range = (unit as any).attackRange ?? 1;
      if (range > maxRange) {
        maxRange = range;
        backline = unit;
      }
    }
    if (backline) {
      backline.takeDamage(Math.max(1, Math.round(this.attack * 0.9)));
      this._recordAttackTarget(backline);
    }
  }

  // ==================== 新 Boss 技能实现 ====================

  /** 铁扇公主：芭蕉扇击退 — 周期性击退附近友方单位 */
  private _updateWindKnockback(dt: number, allies: Unit[]): void {
    if (!this.abilities.includes('wind_knockback')) return;
    this._knockbackTimer += dt;
    if (this._knockbackTimer < 12) return;
    this._knockbackTimer = 0;

    const knockbackRadius = GridManager.getInstance().cellSize * 2.2;
    let hit = false;
    for (const unit of allies) {
      if (unit.currentHp <= 0 || !unit.sprite) continue;
      const dx = unit.sprite.x - this.sprite.x;
      const dy = unit.sprite.y - this.sprite.y;
      if (Math.sqrt(dx * dx + dy * dy) <= knockbackRadius) {
        unit.applyStun(1.5);
        unit.takeDamage(Math.max(1, Math.round(this.attack * 0.5)));
        this._recordAttackTarget(unit);
        hit = true;
      }
    }
    if (hit) {
      eventMgr.emit(GameEvent.ITEM_USED, '芭蕉扇', '击退');
    }
  }

  /** 黄眉怪：人种袋捕获 — 周期性捕获并重创一个友方单位 */
  private _updateGoldenCapture(dt: number, allies: Unit[]): void {
    if (!this.abilities.includes('golden_capture')) return;
    this._captureTimer += dt;
    if (this._captureTimer < 15) return;
    this._captureTimer = 0;

    // 优先捕获最强的友方单位
    let target: Unit | null = null;
    let maxAttack = -1;
    for (const unit of allies) {
      if (unit.currentHp <= 0 || !unit.sprite) continue;
      const atk = (unit as any).attack ?? (unit as any).effectiveAttack ?? 10;
      if (atk > maxAttack) {
        maxAttack = atk;
        target = unit;
      }
    }
    if (target) {
      target.applyStun(4);
      target.takeDamage(Math.max(1, Math.round(this.attack * 1.5)));
      this._recordAttackTarget(target);
      eventMgr.emit(GameEvent.ITEM_USED, '人种袋', target.unitName ?? '单位');
    }
  }

  /** 灵感大王：冻结附近友方单位 */
  private _waterFreezing(allies: Unit[]): void {
    const freezeRadius = GridManager.getInstance().cellSize * 1.8;
    let frozen = 0;
    for (const unit of allies) {
      if (unit.currentHp <= 0 || !unit.sprite) continue;
      const dx = unit.sprite.x - this.sprite.x;
      const dy = unit.sprite.y - this.sprite.y;
      if (Math.sqrt(dx * dx + dy * dy) <= freezeRadius) {
        unit.applyStun(2);
        frozen++;
      }
    }
    if (frozen > 0) {
      eventMgr.emit(GameEvent.ITEM_USED, 'water_freezing', frozen);
    }
  }

  /** 百眼魔君：千眼致盲 — 降低附近友方单位攻击力 */
  private _thousandEyes(allies: Unit[]): void {
    const eyeRadius = GridManager.getInstance().cellSize * 2.5;
    let blinded = 0;
    for (const unit of allies) {
      if (unit.currentHp <= 0 || !unit.sprite) continue;
      const dx = unit.sprite.x - this.sprite.x;
      const dy = unit.sprite.y - this.sprite.y;
      if (Math.sqrt(dx * dx + dy * dy) <= eyeRadius) {
        // 通过给一个负的攻击 buff 来模拟致盲（减攻 30%，持续 4s）
        unit.applyAttackBonus('thousand_eyes_blind', -0.3, 4);
        blinded++;
      }
    }
  }

  /** 黄眉怪：假佛光环 — 周期性 AOE 伤害并触发恐惧效果（减攻） */
  private _fakeBuddhaAura(allies: Unit[]): void {
    const auraRadius = GridManager.getInstance().cellSize * 2.0;
    let affected = 0;
    for (const unit of allies) {
      if (unit.currentHp <= 0 || !unit.sprite) continue;
      const dx = unit.sprite.x - this.sprite.x;
      const dy = unit.sprite.y - this.sprite.y;
      if (Math.sqrt(dx * dx + dy * dy) <= auraRadius) {
        unit.takeDamage(Math.max(1, Math.round(this.attack * 0.4)));
        unit.applyAttackBonus('fake_buddha_debuff', -0.2, 5);
        this._recordAttackTarget(unit);
        affected++;
      }
    }
    if (affected > 0) {
      eventMgr.emit(GameEvent.ITEM_USED, '假佛金光', affected);
    }
  }

  /** 是否处于变形/不可选中状态 */
  get isTransformed(): boolean { return this._isTransformed; }

  private _nearestLivingUnit(allies: Unit[], radius: number = Infinity): Unit | null {
    let nearest: Unit | null = null;
    let minDist = Infinity;
    for (const unit of allies) {
      if (unit.currentHp <= 0 || !unit.sprite) continue;
      const dx = unit.sprite.x - this.sprite.x;
      const dy = unit.sprite.y - this.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius && dist < minDist) {
        minDist = dist;
        nearest = unit;
      }
    }
    return nearest;
  }

  private _damageUnitsInRadius(allies: Unit[], radius: number, damage: number): void {
    for (const unit of allies) {
      if (unit.currentHp <= 0 || !unit.sprite) continue;
      const dx = unit.sprite.x - this.sprite.x;
      const dy = unit.sprite.y - this.sprite.y;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) {
        unit.takeDamage(damage);
        this._recordAttackTarget(unit);
      }
    }
  }

  private _damageUnitsAround(center: Unit, allies: Unit[], radius: number, damage: number): void {
    for (const unit of allies) {
      if (unit.currentHp <= 0 || !unit.sprite) continue;
      const dx = unit.sprite.x - center.sprite.x;
      const dy = unit.sprite.y - center.sprite.y;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) {
        unit.takeDamage(unit === center ? damage : Math.round(damage * 0.65));
        this._recordAttackTarget(unit);
      }
    }
  }

  private _recordAttackTarget(target: any): void {
    if (target.attackedByEnemies instanceof Set) {
      target.attackedByEnemies.add(this);
    }
    this.attackTargetedHeroes.add(target);
  }

  private _heal(amount: number): void {
    if (!this._alive || this.currentHp <= 0) return;
    this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
    this._updateHpBar();
  }

  private _updateStatuses(dt: number): void {
    this._stunTimer = Math.max(0, this._stunTimer - dt);
    this._slowTimer = Math.max(0, this._slowTimer - dt);
    this._speedBoostTimer = Math.max(0, this._speedBoostTimer - dt);
    if (this._slowTimer <= 0) {
      this._slowMultiplier = 1;
    }
    if (this._speedBoostTimer <= 0) {
      this._speedBoostMultiplier = 1;
    }
    this._refreshMoveSpeed();
    for (const [source, buff] of this._vulnerabilityBuffs) {
      buff.remaining -= dt;
      if (buff.remaining <= 0) {
        this._vulnerabilityBuffs.delete(source);
      }
    }
  }

  private _refreshMoveSpeed(): void {
    this.moveSpeed = this.baseMoveSpeed * this._slowMultiplier * this._speedBoostMultiplier;
  }

  private _nearestPathIndex(): number {
    const pp = GridManager.getInstance().pathPoints;
    let nearestIndex = 0;
    let minDist = Infinity;
    for (let i = 0; i < pp.length; i++) {
      const dx = pp[i].x - this.sprite.x;
      const dy = pp[i].y - this.sprite.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearestIndex = i;
      }
    }
    return nearestIndex;
  }

  private _die(): void {
    this._alive = false;
    this.sprite.setVisible(false);
  }

  private _updateHpBar(): void {
    this._hpBar.clear();
    const ratio = this.maxHp > 0 ? Math.max(0, this.currentHp / this.maxHp) : 0;
    const barW = 50;
    const barH = 5;
    const x = -barW / 2;
    const y = -32;

    this._hpBar.fillStyle(0x333333);
    this._hpBar.fillRect(x, y, barW, barH);

    const color = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xcccc44 : 0xcc4444;
    this._hpBar.fillStyle(color);
    this._hpBar.fillRect(x, y, barW * ratio, barH);
  }

  get alive(): boolean { return this._alive; }
}
