/**
 * 单位基类 - 棋盘上的友方单位（小兵/英雄）
 * 纯逻辑 + Phaser Container 渲染 + 角色动画系统
 */
import Phaser from 'phaser';
import { AttackType, UnitSide } from '../types';
import { GridManager } from '../grid/GridManager';
import { getAttackRangePixels } from '../grid/GridMetrics';
import { getGlobalHealMultiplier } from '../systems/MechanicState';

export abstract class Unit {
  // ---- 属性 ----
  side: UnitSide = UnitSide.ALLY;
  attackType: AttackType = AttackType.MELEE;
  unitName: string = '';

  maxHp: number = 100;
  currentHp: number = 100;
  attack: number = 10;
  defense: number = 0;
  attackSpeed: number = 1;
  attackRange: number = 1;
  critRate: number = 0;

  // ---- 格子位置 ----
  gridRow: number = -1;
  gridCol: number = -1;

  // ---- 渲染 ----
  sprite: Phaser.GameObjects.Container;
  protected _hpBar: Phaser.GameObjects.Graphics;

  // ---- 攻击计时 ----
  protected _attackTimer: number = 0;
  protected _attackCooldown: number = 1;

  // ---- 目标 ----
  protected _target: any = null;
  protected _targetCandidates: any[] = [];

  // ---- 动画状态 ----
  private _idleTween: Phaser.Tweens.Tween | null = null;
  private _isDead: boolean = false;
  /** 身体图像的引用 — 子类在 _drawBody() 中直接赋值 */
  protected _bodyImage: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics | null = null;
  /** 身体图像的原始 scale（用于动画恢复） */
  private _bodyBaseScaleX: number = 1;
  private _bodyBaseScaleY: number = 1;

  private _attackBuffs = new Map<string, { bonus: number; remaining: number }>();
  private _damageReductionBuffs = new Map<string, { reduction: number; remaining: number }>();
  private _invincibleBuffs = new Map<string, number>();
  private _shieldBuffs = new Map<string, { amount: number; remaining: number }>();
  private _hotEffects = new Map<string, { rate: number; remaining: number; tickTimer: number }>();
  private _stunTimer: number = 0;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.container(0, 0);
    this._hpBar = scene.add.graphics();
    this.sprite.add(this._hpBar);
  }

  /** 放置到指定格子 */
  place(row: number, col: number): void {
    this.gridRow = row;
    this.gridCol = col;
    const center = GridManager.getInstance().cellCenter(row, col);
    this.sprite.x = center.x;
    this.sprite.y = center.y;
    this._attackCooldown = 1 / this.attackSpeed;
    this._updateHpBar();
  }

  /** 子类在 _drawBody 中设置身体引用后调用，记录原始 scale */
  protected _captureBodyRef(): void {
    if (this._bodyImage) {
      this._bodyBaseScaleX = this._bodyImage.scaleX;
      this._bodyBaseScaleY = this._bodyImage.scaleY;
    }
  }

  // ==================== 角色动画系统 ====================

  /** 出场动画：从上方掉落弹入 */
  playSpawnAnim(delay: number = 0): void {
    if (this._isDead) return;
    const scene = this.sprite.scene as Phaser.Scene;
    const body = this._bodyImage;
    if (!body) return;

    // 记住目标 scale，然后设置初始状态
    const targetScaleX = this._bodyBaseScaleX;
    const targetScaleY = this._bodyBaseScaleY;
    body.setScale(targetScaleX * 0.3, targetScaleY * 0.3);
    body.y = -40;
    body.setAlpha(0.3);
    this.sprite.setAlpha(0.5);

    // 弹出到目标 scale
    scene.tweens.add({
      targets: body,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      y: 0,
      alpha: 1,
      duration: 320,
      ease: 'Back.Out',
      delay,
      onComplete: () => {
        this._startIdleAnim();
      },
    });

    scene.tweens.add({
      targets: this.sprite,
      alpha: 1,
      duration: 280,
      ease: 'Cubic.Out',
      delay,
    });

    // 落地环特效
    this._playLandingRing(delay);
  }

  /** 启动待机呼吸动画 */
  protected _startIdleAnim(): void {
    if (this._isDead) return;
    const body = this._bodyImage;
    if (!body) return;

    this._idleTween?.stop();

    // 轻微上下浮动 + 呼吸感
    this._idleTween = (this.sprite.scene as Phaser.Scene).tweens.add({
      targets: body,
      y: { from: body.y, to: body.y - 3 },
      duration: 1400 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  /** 攻击动画：短暂前冲 + 回弹 */
  playAttackAnim(targetX: number, targetY: number): void {
    if (this._isDead) return;
    const body = this._bodyImage;
    if (!body) return;
    const scene = this.sprite.scene as Phaser.Scene;

    // 计算攻击方向
    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const lungeX = dist > 0 ? (dx / dist) * 6 : 4;
    const lungeY = dist > 0 ? (dy / dist) * 6 : 0;

    // 前冲 → 回弹
    scene.tweens.add({
      targets: body,
      x: lungeX,
      y: lungeY,
      scaleX: this._bodyBaseScaleX * 1.1,
      scaleY: this._bodyBaseScaleY * 1.1,
      duration: 80,
      ease: 'Power2.Out',
      yoyo: true,
      hold: 30,
      onComplete: () => {
        // 确保恢复到基准 scale
        body.setScale(this._bodyBaseScaleX, this._bodyBaseScaleY);
        body.x = 0;
        body.y = 0;
      },
    });
  }

  /** 受击动画：闪白 + 抖动 */
  playHitAnim(): void {
    if (this._isDead) return;
    const body = this._bodyImage;
    if (!body) return;
    const scene = this.sprite.scene as Phaser.Scene;

    // 闪白
    if (body instanceof Phaser.GameObjects.Image) {
      body.setTintFill(0xffffff);
      scene.time.delayedCall(60, () => {
        if (!this._isDead && body.active) body.clearTint();
      });
    }

    // 抖动
    const origX = this.sprite.x;
    scene.tweens.add({
      targets: this.sprite,
      x: origX - 3,
      duration: 40,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.InOut',
      onComplete: () => {
        if (!this._isDead) this.sprite.x = origX;
      },
    });
  }

  /** 治疗动画：绿色光晕 */
  playHealAnim(): void {
    if (this._isDead) return;
    const body = this._bodyImage;
    if (!body) return;
    const scene = this.sprite.scene as Phaser.Scene;

    // 绿光闪现
    if (body instanceof Phaser.GameObjects.Image) {
      body.setTint(0x88ff88);
      scene.time.delayedCall(120, () => {
        if (!this._isDead && body.active) body.clearTint();
      });
    }

    // 微微弹起
    scene.tweens.add({
      targets: body,
      scaleX: this._bodyBaseScaleX * 1.08,
      scaleY: this._bodyBaseScaleY * 1.08,
      duration: 150,
      yoyo: true,
      ease: 'Back.Out',
      onComplete: () => {
        body.setScale(this._bodyBaseScaleX, this._bodyBaseScaleY);
      },
    });
  }

  /** 死亡动画：缩小 + 淡出 + 粒子感 */
  playDeathAnim(onComplete?: () => void): void {
    if (this._isDead) {
      onComplete?.();
      return;
    }
    this._isDead = true;
    this._idleTween?.stop();
    this._idleTween = null;

    const scene = this.sprite.scene as Phaser.Scene;
    const body = this._bodyImage;

    // 身体缩小 + 上浮 + 淡出
    if (body) {
      scene.tweens.add({
        targets: body,
        scaleX: this._bodyBaseScaleX * 0.1,
        scaleY: this._bodyBaseScaleY * 0.1,
        y: -20,
        alpha: 0,
        duration: 280,
        ease: 'Cubic.In',
      });
    }

    // 整体淡出
    scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 250,
      ease: 'Cubic.In',
      onComplete: () => {
        this.sprite.setVisible(false);
        this.sprite.setAlpha(1);
        onComplete?.();
      },
    });

    // 消散粒子（小光点）
    this._playDeathParticles();
  }

  /** 合成/升级动画：金色爆发 */
  playMergeGlow(): void {
    if (this._isDead) return;
    const scene = this.sprite.scene as Phaser.Scene;
    const body = this._bodyImage;
    if (!body) return;

    // 放大回弹
    scene.tweens.add({
      targets: body,
      scaleX: this._bodyBaseScaleX * 1.35,
      scaleY: this._bodyBaseScaleY * 1.35,
      duration: 150,
      yoyo: true,
      ease: 'Back.Out',
      onComplete: () => {
        body.setScale(this._bodyBaseScaleX, this._bodyBaseScaleY);
      },
    });

    // 金色光芒
    const glow = scene.add.graphics();
    glow.fillStyle(0xf0c15a, 0.7);
    glow.fillCircle(0, 0, 30);
    glow.setAlpha(0);
    this.sprite.addAt(glow, 0);

    scene.tweens.add({
      targets: glow,
      alpha: { from: 0.8, to: 0 },
      scaleX: { from: 0.6, to: 1.8 },
      scaleY: { from: 0.6, to: 1.8 },
      duration: 350,
      ease: 'Cubic.Out',
      onComplete: () => glow.destroy(),
    });

    // 环特效
    const gfx = scene.add.graphics();
    gfx.lineStyle(2, 0xf0c15a, 0.9);
    gfx.strokeCircle(0, 0, 12);
    gfx.setAlpha(0);
    this.sprite.add(gfx);
    scene.tweens.add({
      targets: gfx,
      alpha: { from: 0.9, to: 0 },
      scaleX: { from: 0.5, to: 2 },
      scaleY: { from: 0.5, to: 2 },
      duration: 300,
      ease: 'Cubic.Out',
      onComplete: () => gfx.destroy(),
    });
  }

  /** 升级/合成后更新身体引用并重启 idle */
  refreshBody(): void {
    if (this._bodyImage) {
      this._bodyBaseScaleX = this._bodyImage.scaleX;
      this._bodyBaseScaleY = this._bodyImage.scaleY;
    }
    this._startIdleAnim();
  }

  // ==================== 内部动画细节 ====================

  private _playLandingRing(delay: number): void {
    const scene = this.sprite.scene as Phaser.Scene;
    const gfx = scene.add.graphics();
    gfx.lineStyle(2.5, 0xffd36a, 0.7);
    gfx.strokeCircle(0, 0, 10);
    gfx.setAlpha(0);
    this.sprite.add(gfx);

    scene.tweens.add({
      targets: gfx,
      alpha: { from: 0.7, to: 0 },
      scaleX: { from: 0.6, to: 1.6 },
      scaleY: { from: 0.6, to: 1.6 },
      duration: 280,
      ease: 'Cubic.Out',
      delay,
      onComplete: () => gfx.destroy(),
    });
  }

  private _playDeathParticles(): void {
    const scene = this.sprite.scene as Phaser.Scene;
    for (let i = 0; i < 4; i++) {
      const dot = scene.add.graphics();
      dot.fillStyle(0xffd36a, 0.8);
      dot.fillCircle(0, 0, 2 + Math.random() * 2);
      dot.setPosition(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
      );
      this.sprite.add(dot);

      scene.tweens.add({
        targets: dot,
        x: dot.x + (Math.random() - 0.5) * 40,
        y: dot.y - 15 - Math.random() * 20,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 300 + Math.random() * 150,
        ease: 'Cubic.Out',
        delay: Math.random() * 80,
        onComplete: () => dot.destroy(),
      });
    }
  }

  // ==================== 每帧更新 ====================

  update(dt: number): void {
    if (this._isDead) return;
    this.updateTimedStatuses(dt);
    if (this._stunTimer > 0) return;
    this._attackTimer += dt;
    if (this._attackTimer >= this._attackCooldown && this._target) {
      this._attackTimer = 0;
      this.performAttack();
    }
  }

  /** 受到伤害 */
  takeDamage(amount: number): void {
    if (this.isInvincible) return;

    const reduced = Math.round(amount * (1 - this.damageReduction));
    let actualDmg = Math.max(1, reduced - this.defense);
    actualDmg = this._absorbWithShields(actualDmg);
    if (actualDmg <= 0) {
      this._updateHpBar();
      return;
    }

    this.currentHp = Math.max(0, this.currentHp - actualDmg);
    this._updateHpBar();
    this.playHitAnim();
    if (this.currentHp <= 0) {
      this.onDeath();
    }
  }

  heal(amount: number): void {
    if (this.currentHp <= 0) return;
    const mult = getGlobalHealMultiplier();
    const effectiveAmount = Math.max(1, Math.round(amount * mult));
    this.currentHp = Math.min(this.maxHp, this.currentHp + effectiveAmount);
    this._updateHpBar();
    this.playHealAnim();
  }

  get effectiveAttack(): number {
    return Math.max(1, Math.round(this.attack * (1 + this.attackBonus)));
  }

  get attackBonus(): number {
    let bonus = 0;
    for (const buff of this._attackBuffs.values()) {
      bonus += buff.bonus;
    }
    return bonus;
  }

  get damageReduction(): number {
    let reduction = 0;
    for (const buff of this._damageReductionBuffs.values()) {
      reduction = Math.max(reduction, buff.reduction);
    }
    return Math.max(0, Math.min(0.95, reduction));
  }

  get isInvincible(): boolean {
    return this._invincibleBuffs.size > 0;
  }

  applyAttackBonus(source: string, bonus: number, duration: number): void {
    if (duration <= 0 || bonus <= 0) return;
    this._attackBuffs.set(source, { bonus, remaining: duration });
  }

  applyDamageReduction(source: string, reduction: number, duration: number): void {
    if (duration <= 0 || reduction <= 0) return;
    this._damageReductionBuffs.set(source, { reduction: Math.min(0.95, reduction), remaining: duration });
  }

  applyInvincible(source: string, duration: number): void {
    if (duration <= 0) return;
    this._invincibleBuffs.set(source, duration);
  }

  applyShield(source: string, amount: number, duration: number): void {
    if (duration <= 0 || amount <= 0) return;
    const current = this._shieldBuffs.get(source);
    this._shieldBuffs.set(source, {
      amount: Math.max(current?.amount ?? 0, Math.round(amount)),
      remaining: Math.max(current?.remaining ?? 0, duration),
    });
  }

  applyStun(duration: number): void {
    if (duration <= 0) return;
    this._stunTimer = Math.max(this._stunTimer, duration);
  }

  applyHealOverTime(source: string, hpRatePerSecond: number, duration: number): void {
    if (duration <= 0 || hpRatePerSecond <= 0) return;
    this._hotEffects.set(source, { rate: hpRatePerSecond, remaining: duration, tickTimer: 0 });
  }

  cleanse(): void {
    this._stunTimer = 0;
  }

  findTarget(enemies: any[]): void {
    if (enemies.length === 0) {
      this._target = null;
      this._targetCandidates = [];
      return;
    }
    let nearest: any = null;
    let minDist = Infinity;
    const gridMgr = GridManager.getInstance();
    const myCenter = gridMgr.cellCenter(this.gridRow, this.gridCol);
    const maxRange = getAttackRangePixels(this.attackRange, gridMgr.cellSize, gridMgr.gap);
    const candidates: any[] = [];
    for (const enemy of enemies) {
      if (!enemy.sprite || enemy.currentHp <= 0) continue;
      if ((enemy as { isTransformed?: boolean }).isTransformed) continue;
      const dx = enemy.sprite.x - myCenter.x;
      const dy = enemy.sprite.y - myCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxRange) continue;
      candidates.push(enemy);
      if (dist < minDist) { minDist = dist; nearest = enemy; }
    }
    this._targetCandidates = candidates;
    this._target = nearest;
  }

  protected abstract performAttack(): void;
  protected abstract onDeath(): void;

  protected updateTimedStatuses(dt: number): void {
    this._stunTimer = Math.max(0, this._stunTimer - dt);
    this._tickTimedMap(this._attackBuffs, dt);
    this._tickTimedMap(this._damageReductionBuffs, dt);
    this._tickTimedMap(this._shieldBuffs, dt);

    for (const [source, remaining] of this._invincibleBuffs) {
      const next = remaining - dt;
      if (next <= 0) {
        this._invincibleBuffs.delete(source);
      } else {
        this._invincibleBuffs.set(source, next);
      }
    }

    for (const [source, effect] of this._hotEffects) {
      effect.remaining -= dt;
      effect.tickTimer += dt;
      while (effect.tickTimer >= 1 && effect.remaining > 0) {
        effect.tickTimer -= 1;
        this.heal(Math.max(1, Math.round(this.maxHp * effect.rate)));
      }
      if (effect.remaining <= 0) {
        this._hotEffects.delete(source);
      }
    }
  }

  private _tickTimedMap<T extends { remaining: number }>(map: Map<string, T>, dt: number): void {
    for (const [source, value] of map) {
      value.remaining -= dt;
      if (value.remaining <= 0) {
        map.delete(source);
      }
    }
  }

  private _absorbWithShields(damage: number): number {
    let remaining = damage;
    for (const [source, shield] of this._shieldBuffs) {
      const absorbed = Math.min(remaining, shield.amount);
      shield.amount -= absorbed;
      remaining -= absorbed;
      if (shield.amount <= 0) {
        this._shieldBuffs.delete(source);
      }
      if (remaining <= 0) return 0;
    }
    return remaining;
  }

  protected _updateHpBar(): void {
    this._hpBar.clear();
    const ratio = this.maxHp > 0 ? Math.max(0, this.currentHp / this.maxHp) : 0;
    const barW = 60;
    const barH = 6;
    const x = -barW / 2;
    const y = -30;

    this._hpBar.fillStyle(0x333333);
    this._hpBar.fillRect(x, y, barW, barH);

    const color = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xcccc44 : 0xcc4444;
    this._hpBar.fillStyle(color);
    this._hpBar.fillRect(x, y, barW * ratio, barH);
  }
}
