import Phaser from 'phaser';
import { eventMgr, GameEvent } from '../core/EventManager';
import { gameMgr } from '../core/GameManager';
import { createCjkText } from '../core/TextStyles';
import { EnemyType, Faction, HeroRarity } from '../types';
import { HeroConfigItem, getHeroConfig } from '../config/HeroConfig';
import { HERO_VISUALS } from '../config/VisualConfig';
import { GridManager } from '../grid/GridManager';
import { heroKey } from '../render/AssetKeys';
import { drawHeroBody } from '../render/VisualPainter';
import { EffectSystem } from '../systems/EffectSystem';
import { ExperienceSystem, IExperienceTarget } from '../systems/ExperienceSystem';
import { FactionSystem } from '../systems/FactionSystem';
import { MathUtils } from '../utils/MathUtils';
import { Unit } from './Unit';

export class Hero extends Unit implements IExperienceTarget {
  heroId: string;
  rarity: HeroRarity;
  faction: Faction;
  isSupport: boolean = false;

  level: number = 1;
  maxLevel: number;
  exp: number = 0;
  shardsNeeded: number;

  private _starLevel: number = 1;
  private _config: HeroConfigItem | null = null;
  private _bodyGfx!: Phaser.GameObjects.Graphics;
  private _nameText!: Phaser.GameObjects.Text;
  private _lvText!: Phaser.GameObjects.Text;
  private _attackContext: any[] = [];
  private _passiveTimer: number = 0;
  private _skillTimer: number = 0;

  attackedEnemies: Set<any> = new Set();
  attackedByEnemies: Set<any> = new Set();

  constructor(scene: Phaser.Scene, config: HeroConfigItem) {
    super(scene);
    this._config = config;
    this.heroId = config.heroId;
    this.rarity = config.rarity;
    this.faction = config.faction;
    this.maxLevel = config.maxLevel;
    this.shardsNeeded = config.shardsNeeded;
    this.unitName = config.name;
    this.isSupport = config.heroId === 'guanyin';

    this.applyLevelStats();
    ExperienceSystem.getInstance().registerHero(this);
    this._drawBody(scene);
    // _bodyImage 在 _drawBody 中赋值，_captureBodyRef 记录基准 scale
    this._captureBodyRef();
    this._startIdleAnim();

    this.sprite.setSize(56, 56);
    this.sprite.setInteractive(new Phaser.Geom.Rectangle(-28, -28, 56, 56), Phaser.Geom.Rectangle.Contains);
    this.sprite.on('pointerdown', () => {
      if (!gameMgr.isPlaying) return;
      eventMgr.emit(GameEvent.HERO_SELECTED, this);
    });
  }

  /** 放置到格子时播放出场动画 */
  place(row: number, col: number): void {
    super.place(row, col);
    this.playSpawnAnim();
  }

  applyLevelStats(): void {
    const cfg = this._config ?? getHeroConfig(this.heroId);
    if (!cfg) return;

    const hpRatio = this.maxHp > 0 ? this.currentHp / this.maxHp : 1;
    const levelMult = 1 + (this.level - 1) * 0.15;
    const buff = FactionSystem.getInstance().getActiveBuffsForHero(this.heroId);

    this.maxHp = Math.round(cfg.baseHp * levelMult * (1 + buff.maxHpBonus));
    this.currentHp = Math.max(1, Math.min(this.maxHp, Math.round(this.maxHp * hpRatio)));
    this.attack = Math.round(cfg.baseAttack * levelMult);
    this.defense = Math.round(buff.defenseBonus * 100);
    this.attackRange = cfg.attackRange;
    this.attackSpeed = cfg.attackSpeed * (1 + (this.level - 1) * 0.03) * (1 + buff.attackSpeedBonus);
    this.critRate = buff.critRateBonus;

    if (this.heroId === 'sunwukong') {
      this.critRate += 0.3;
    }
    if (this.heroId === 'shawujing') {
      this.defense += 20;
    }
    if (this.heroId === 'zhubajie') {
      this.maxHp = Math.round(this.maxHp * 1.35);
      this.currentHp = Math.min(this.maxHp, Math.round(this.currentHp * 1.35));
      this.defense += 15;
    }

    this._attackCooldown = 1 / this.attackSpeed;
  }

  addExp(amount: number): void {
    this.exp += amount;
    let leveled = false;
    while (this.exp >= this._expToNext() && this.level < this.maxLevel) {
      this.exp -= this._expToNext();
      this.level++;
      leveled = true;
    }

    if (leveled) {
      this.applyLevelStats();
      this._refreshLevelText();
      this.playMergeGlow(); // 升级光效
      eventMgr.emit(GameEvent.HERO_LEVEL_UP, this);
    }
  }

  levelUp(): boolean {
    if (this.level >= this.maxLevel) return false;
    this.level++;
    this.applyLevelStats();
    this._refreshLevelText();
    this.playMergeGlow(); // 升级光效
    eventMgr.emit(GameEvent.HERO_LEVEL_UP, this);
    return true;
  }

  setAttackContext(enemies: any[]): void {
    this._attackContext = enemies;
  }

  findTarget(enemies: any[]): void {
    super.findTarget(enemies);
    if (this.heroId !== 'erlangshen' || this._targetCandidates.length <= 0) return;

    this._target = this._targetCandidates
      .slice()
      .sort((a, b) => this._targetPriority(b) - this._targetPriority(a))[0];
  }

  updatePassive(dt: number, allies: Unit[]): void {
    this._skillTimer += dt;
    this._tryCastSkill(allies);

    this._passiveTimer += dt;
    if (this._passiveTimer < 1) return;
    this._passiveTimer = 0;

    const buff = FactionSystem.getInstance().getActiveBuffsForHero(this.heroId);
    if (buff.hpRegenRate > 0) {
      this.heal(Math.max(1, Math.round(this.maxHp * buff.hpRegenRate)));
    }
    if (this.heroId === 'niumowang' && this.currentHp <= this.maxHp * 0.3) {
      this.applyDamageReduction('hero_niumowang_low_hp', 0.25, 1.15);
    }

    if (this.heroId === 'zhizhujing') {
      for (const enemy of this._attackContext) {
        if (enemy.currentHp <= 0 || !enemy.alive || typeof enemy.applySlow !== 'function') continue;
        if (this._distanceTo(enemy) <= GridManager.getInstance().cellSize * 3) {
          enemy.applySlow(0.7, 1.1);
        }
      }
    }

    if (this.heroId === 'guanyin') {
      for (const ally of allies) {
        if (ally.currentHp <= 0 || ally.currentHp >= ally.maxHp) continue;
        const dist = this._distanceTo(ally);
        if (dist <= GridManager.getInstance().cellSize * 2) {
          ally.heal(Math.max(1, Math.round(ally.maxHp * 0.05)));
        }
      }
    }

    if (this.heroId === 'baigufuren') {
      this._trySummonClone();
    }
  }

  private _cloneTimer: number = 0;
  private _trySummonClone(): void {
    this._cloneTimer++;
    if (this._cloneTimer < 15) return;
    this._cloneTimer = 0;

    const cellSize = GridManager.getInstance().cellSize;
    const cloneDamage = Math.max(1, Math.round(this.effectiveAttack * 0.3));
    let hitCount = 0;
    for (const enemy of this._attackContext) {
      if (!this._canHitEnemy(enemy)) continue;
      if (this._distanceTo(enemy) <= cellSize * 2.5) {
        enemy.takeDamage(cloneDamage, this);
        this.attackedEnemies.add(enemy);
        hitCount++;
        if (hitCount >= 3) break;
      }
    }

    if (hitCount > 0) {
      EffectSystem.forScene(this.sprite.scene as Phaser.Scene).playRing(this.sprite.x, this.sprite.y, {
        radius: cellSize * 1.6,
        color: 0xcc88ff,
        alpha: 0.42,
        lineWidth: 3,
        duration: 300,
      });
    }
  }

  upgradeStar(): boolean {
    if (this._starLevel >= 5) return false;
    this._starLevel++;
    this.applyLevelStats();
    this.playMergeGlow();
    return true;
  }

  get starLevel(): number { return this._starLevel; }

  protected performAttack(): void {
    if (!this._target || this._target.currentHp <= 0) return;
    if (!this._canHitEnemy(this._target)) return;

    // 攻击动画
    this.playAttackAnim(this._target.sprite.x, this._target.sprite.y);

    if (this.heroId === 'nezha') {
      this._attackMultiple(3, 1);
      return;
    }

    if (this.heroId === 'bailongma') {
      this._attackMultiple(3, 0.85);
      return;
    }

    const damage = this._calculateDamage(this._target);
    this._playAttackFeedback(this._target);
    this._target.takeDamage(damage, this);
    this.attackedEnemies.add(this._target);

    if (this.heroId === 'taishanglaojun') {
      this._applyBurn(this._target, Math.max(1, Math.round(damage * 0.18)), 3);
    }

    if (this.heroId === 'shawujing' && typeof this._target.applySlow === 'function') {
      this._target.applySlow(0.7, 1.5);
      EffectSystem.forScene(this.sprite.scene as Phaser.Scene).playRing(this._target.sprite.x, this._target.sprite.y, {
        radius: GridManager.getInstance().cellSize * 0.35,
        color: 0x8fd8ff,
        alpha: 0.5,
        lineWidth: 2,
        duration: 220,
      });
    }

    if (this.heroId === 'honghaier') {
      this._splashAroundTarget(this._target, Math.round(damage * 0.45));
    }

    if (this.heroId === 'tuotatianwang' && typeof this._target.applySlow === 'function' && MathUtils.roll(0.15)) {
      this._target.applySlow(0, 1.5);
    }
  }

  protected onDeath(): void {
    ExperienceSystem.getInstance().unregisterHero(this);
    this.playDeathAnim(() => {
      if (this.gridRow >= 0 && this.gridCol >= 0) {
        GridManager.getInstance().removeUnit(this.gridRow, this.gridCol);
      }
    });
  }

  private _attackMultiple(count: number, damageScale: number): void {
    const targets = this._attackContext
      .filter(enemy => this._canHitEnemy(enemy))
      .filter(enemy => this._distanceTo(enemy) <= this.attackRange * GridManager.getInstance().cellSize)
      .sort((a, b) => this._distanceTo(a) - this._distanceTo(b))
      .slice(0, count);

    for (const target of targets) {
      const damage = Math.round(this._calculateDamage(target) * damageScale);
      this._playAttackFeedback(target);
      target.takeDamage(damage, this);
      this.attackedEnemies.add(target);
    }
  }

  private _splashAroundTarget(target: any, damage: number): void {
    for (const enemy of this._attackContext) {
      if (enemy === target || !this._canHitEnemy(enemy)) continue;
      const dx = enemy.sprite.x - target.sprite.x;
      const dy = enemy.sprite.y - target.sprite.y;
      if (Math.sqrt(dx * dx + dy * dy) <= GridManager.getInstance().cellSize * 1.15) {
        enemy.takeDamage(damage, this);
        this.attackedEnemies.add(enemy);
      }
    }
    EffectSystem.forScene(this.sprite.scene as Phaser.Scene).playRing(target.sprite.x, target.sprite.y, {
      radius: GridManager.getInstance().cellSize * 1.05,
      color: HERO_VISUALS[this.heroId]?.accent ?? 0xff7a32,
      alpha: 0.5,
      lineWidth: 3,
      duration: 210,
    });
  }

  private _calculateDamage(target: any): number {
    const buff = FactionSystem.getInstance().getActiveBuffsForHero(this.heroId);
    let damage = MathUtils.damageVariance(this.effectiveAttack);
    damage = Math.round(damage * (1 + buff.damageBonus));

    if (this.heroId === 'sunwukong' && target.enemyType === EnemyType.BOSS) {
      damage = Math.round(damage * 1.5);
    }
    if (this.heroId === 'erlangshen') {
      damage = Math.round(damage * 1.4);
    }
    if (this.heroId === 'niumowang' && this.currentHp <= this.maxHp * 0.3) {
      damage = Math.round(damage * 2);
    }
    if (MathUtils.roll(this.critRate)) {
      damage = Math.round(damage * 1.5);
    }

    return damage;
  }

  private _distanceTo(target: any): number {
    const dx = target.sprite.x - this.sprite.x;
    const dy = target.sprite.y - this.sprite.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private _tryCastSkill(allies: Unit[]): void {
    const cooldown = this._skillCooldown();
    if (cooldown <= 0 || this._skillTimer < cooldown) return;

    if (this.heroId === 'guanyin') {
      const target = this._lowestHpAlly(allies);
      if (!target) return;
      this._skillTimer = 0;
      // 技能施放动画
      this.playMergeGlow();
      target.heal(Math.max(1, Math.round(target.maxHp * 0.12 + this.attack)));
      target.applyShield('hero_guanyin_skill', Math.max(1, Math.round(target.maxHp * 0.18 + this.attack)), 5);
      EffectSystem.forScene(this.sprite.scene as Phaser.Scene).playRing(target.sprite.x, target.sprite.y, {
        radius: GridManager.getInstance().cellSize * 0.7,
        color: HERO_VISUALS[this.heroId]?.accent ?? 0x8fffd2,
        alpha: 0.45,
        lineWidth: 3,
        duration: 240,
      });
      return;
    }

    if (this.heroId === 'sunwukong') {
      const target = this._highestHpEnemyInSkillRange(enemy => enemy.enemyType === EnemyType.BOSS);
      if (!target) return;
      this._skillTimer = 0;
      this.playAttackAnim(target.sprite.x, target.sprite.y);
      target.applyVulnerability?.('hero_sunwukong_break', 0.25, 3);
      this._attackTargetWithSkill(target, 2.2);
      return;
    }

    if (this.heroId === 'erlangshen') {
      const target = this._highestHpEnemyInSkillRange();
      if (!target) return;
      this._skillTimer = 0;
      this.playAttackAnim(target.sprite.x, target.sprite.y);
      this._attackTargetWithSkill(target, 1.9);
      return;
    }

    if (this.heroId === 'nezha') {
      const targets = this._enemiesInSkillRange().slice(0, 5);
      if (targets.length <= 0) return;
      this._skillTimer = 0;
      for (const target of targets) {
        this._attackTargetWithSkill(target, 0.75);
      }
      return;
    }

    if (this.heroId === 'honghaier') {
      const target = this._highestHpEnemyInSkillRange();
      if (!target) return;
      this._skillTimer = 0;
      this._damageEnemiesAround(target, Math.max(1, Math.round(this._calculateDamage(target) * 0.9)), GridManager.getInstance().cellSize * 1.35, true);
    }
  }

  private _skillCooldown(): number {
    switch (this.heroId) {
      case 'sunwukong': return 10;
      case 'guanyin':
      case 'honghaier': return 8;
      case 'erlangshen': return 9;
      case 'nezha': return 7;
      default: return 0;
    }
  }

  private _enemiesInSkillRange(predicate: (enemy: any) => boolean = () => true): any[] {
    const range = Math.max(this.attackRange, 2) * GridManager.getInstance().cellSize;
    return this._attackContext
      .filter(enemy => this._canHitEnemy(enemy) && predicate(enemy))
      .filter(enemy => this._distanceTo(enemy) <= range)
      .sort((a, b) => this._distanceTo(a) - this._distanceTo(b));
  }

  private _highestHpEnemyInSkillRange(predicate: (enemy: any) => boolean = () => true): any | null {
    const enemies = this._enemiesInSkillRange(predicate);
    if (enemies.length <= 0) return null;
    return enemies.sort((a, b) => this._targetPriority(b) - this._targetPriority(a))[0];
  }

  private _lowestHpAlly(allies: Unit[]): Unit | null {
    return allies
      .filter(ally => ally.currentHp > 0 && ally.currentHp < ally.maxHp)
      .sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp))[0] ?? null;
  }

  private _attackTargetWithSkill(target: any, damageScale: number): void {
    if (!this._canHitEnemy(target)) return;
    const damage = Math.max(1, Math.round(this._calculateDamage(target) * damageScale));
    this._playAttackFeedback(target);
    target.takeDamage(damage, this);
    this.attackedEnemies.add(target);
  }

  private _damageEnemiesAround(center: any, damage: number, radius: number, applyBurn: boolean = false): void {
    for (const enemy of this._attackContext) {
      if (!this._canHitEnemy(enemy)) continue;
      const dx = enemy.sprite.x - center.sprite.x;
      const dy = enemy.sprite.y - center.sprite.y;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) {
        const finalDamage = enemy === center ? damage : Math.round(damage * 0.7);
        enemy.takeDamage(finalDamage, this);
        if (applyBurn) {
          this._applyBurn(enemy, Math.max(1, Math.round(finalDamage * 0.25)), 3);
        }
        this.attackedEnemies.add(enemy);
      }
    }
    EffectSystem.forScene(this.sprite.scene as Phaser.Scene).playRing(center.sprite.x, center.sprite.y, {
      radius,
      color: HERO_VISUALS[this.heroId]?.accent ?? 0xff7a32,
      alpha: 0.45,
      lineWidth: 3,
      duration: 240,
    });
  }

  private _applyBurn(target: any, damagePerTick: number, ticks: number): void {
    for (let i = 1; i <= ticks; i++) {
      this.sprite.scene.time.delayedCall(i * 1000, () => {
        if (target.currentHp > 0 && target.alive) {
          target.takeDamage(damagePerTick, this);
          this.attackedEnemies.add(target);
        }
      });
    }
  }

  private _canHitEnemy(enemy: any): boolean {
    return enemy?.currentHp > 0 && enemy?.alive && !enemy.isTransformed;
  }

  private _targetPriority(enemy: any): number {
    const typeBonus = enemy.enemyType === EnemyType.BOSS ? 100000 : enemy.enemyType === EnemyType.ELITE ? 50000 : 0;
    return typeBonus + enemy.currentHp;
  }

  private _playAttackFeedback(target: any): void {
    if (!target?.sprite) return;

    const effect = EffectSystem.forScene(this.sprite.scene as Phaser.Scene);
    const visual = HERO_VISUALS[this.heroId];
    const color = visual?.accent ?? visual?.stroke ?? 0xffd36a;
    const targetX = target.sprite.x;
    const targetY = target.sprite.y;

    if (this.attackRange > 1) {
      effect.playProjectile(this.sprite.x, this.sprite.y, targetX, targetY, {
        color,
        radius: this.heroId === 'honghaier' ? 5 : 4,
        hitRadius: this.heroId === 'nezha' || this.heroId === 'bailongma' ? 13 : 16,
        duration: this.heroId === 'erlangshen' ? 95 : 125,
      });
      return;
    }

    effect.playAttackLine(this.sprite.x, this.sprite.y, targetX, targetY, {
      color,
      lineWidth: 4,
      duration: 110,
    });
  }

  private _expToNext(): number {
    const curve = [0, 20, 45, 80, 125, 185, 260, 350, 460, 590, 740, 910, 1100, 1320, 1580, 1880];
    if (this.level < curve.length) return curve[this.level];
    return Math.round(curve[curve.length - 1] * 1.1 ** (this.level - curve.length + 1));
  }

  private _refreshLevelText(): void {
    if (this._lvText) {
      this._lvText.setText(`Lv${this.level}`);
    }
  }

  private _drawBody(scene: Phaser.Scene): void {
    const textureKey = heroKey(this.heroId);
    if (scene.textures.exists(textureKey)) {
      const img = scene.add.image(0, 0, textureKey);
      this.sprite.addAt(img, 0);
      this._bodyImage = img;
    } else {
      const gfx = scene.add.graphics();
      drawHeroBody(gfx, this.heroId, this.rarity);
      this.sprite.addAt(gfx, 0);
      this._bodyImage = gfx;
    }

    const nameBg = scene.add.graphics();
    nameBg.fillStyle(0x101826, 0.9);
    nameBg.fillRoundedRect(-26, -41, 52, 18, 6);
    nameBg.lineStyle(1.5, 0xffdd88, 0.72);
    nameBg.strokeRoundedRect(-26, -41, 52, 18, 6);
    this.sprite.add(nameBg);

    this._nameText = createCjkText(scene, 0, 0, this.unitName.slice(0, 2), {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this._nameText.setOrigin(0.5);
    this.sprite.add(this._nameText);

    this._lvText = createCjkText(scene, 0, -32, `Lv${this.level}`, {
      fontSize: '14px',
      color: '#ffffaa',
      fontStyle: 'bold',
      stroke: '#101826',
      strokeThickness: 3,
    });
    this._lvText.setOrigin(0.5);
    this.sprite.add(this._lvText);
  }
}
