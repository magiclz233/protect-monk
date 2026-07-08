import Phaser from 'phaser';
import { AttackType, SoldierConfigItem, SoldierRank, SoldierType, UnitSide } from '../types';
import { ATTACK_EFFECT_VISUALS, RANK_VISUALS, SOLDIER_VISUALS } from '../config/VisualConfig';
import { GridManager } from '../grid/GridManager';
import { soldierKey } from '../render/AssetKeys';
import { drawSoldierBody } from '../render/VisualPainter';
import { EffectSystem } from '../systems/EffectSystem';
import { MathUtils } from '../utils/MathUtils';
import { Unit } from './Unit';

export class Soldier extends Unit {
  soldierType: SoldierType;
  rank: SoldierRank;

  private static RANK_SCALES = [0, 0.6, 0.72, 0.84, 0.95, 1.08];

  private _rankPips!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, config: SoldierConfigItem) {
    super(scene);
    this.side = UnitSide.ALLY;
    this.soldierType = config.type;
    this.rank = config.rank;
    this.unitName = config.name;
    this.maxHp = config.hp;
    this.currentHp = config.hp;
    this.attack = config.attack;
    this.defense = config.defense;
    this.attackSpeed = config.attackSpeed;
    this.attackRange = config.attackRange;
    this.attackType = config.attackType;

    this._drawBody(scene);
    // _bodyImage 在 _drawBody 中赋值，_captureBodyRef 记录基准 scale
    this._captureBodyRef();
    this._startIdleAnim();
  }

  upgrade(): boolean {
    if (this.rank >= SoldierRank.ORANGE) return false;
    this.rank++;
    this.maxHp = Math.round(this.maxHp * 1.6);
    this.currentHp = this.maxHp;
    this.attack = Math.round(this.attack * 1.8);
    this.attackSpeed = Number((this.attackSpeed * 0.92).toFixed(3));
    this._attackCooldown = 1 / this.attackSpeed;

    // 播放合成动画
    this.playMergeGlow();

    // 延迟重绘（让光效先播完）
    const scene = this.sprite.scene as Phaser.Scene;
    this._rankPips.destroy();
    this.sprite.removeAll(true);
    this._hpBar = scene.add.graphics();
    this.sprite.add(this._hpBar);
    this._drawBody(scene);
    this._updateHpBar();

    // 延迟更新身体引用并启动新 idle
    scene.time.delayedCall(180, () => {
      this.refreshBody();
    });

    return true;
  }

  /** 放置到格子时播放出场动画 */
  place(row: number, col: number): void {
    super.place(row, col);
    this.playSpawnAnim();
  }

  protected performAttack(): void {
    if (!this._target || this._target.currentHp <= 0) return;
    const damage = MathUtils.damageVariance(this.effectiveAttack);
    const effect = EffectSystem.forScene(this.sprite.scene as Phaser.Scene);
    const attackVisual = ATTACK_EFFECT_VISUALS[this.attackType];
    const color = attackVisual?.color ?? SOLDIER_VISUALS[this.soldierType].stroke;

    // 攻击动画：朝向目标前冲
    this.playAttackAnim(this._target.sprite.x, this._target.sprite.y);

    if (this.attackType === AttackType.RANGED || this.attackType === AttackType.MID_RANGE) {
      effect.playProjectile(this.sprite.x, this.sprite.y, this._target.sprite.x, this._target.sprite.y, {
        color,
        radius: attackVisual.projectileRadius,
        hitRadius: attackVisual.hitRadius,
        duration: this.attackType === AttackType.RANGED ? 140 : 105,
      });
    } else {
      effect.playAttackLine(this.sprite.x, this.sprite.y, this._target.sprite.x, this._target.sprite.y, {
        color,
        lineWidth: attackVisual.lineWidth,
      });
    }

    if (this.attackType === AttackType.AOE) {
      this._performAreaAttack(damage, color);
      return;
    }

    this._target.takeDamage(damage);
  }

  protected onDeath(): void {
    this.playDeathAnim(() => {
      if (this.gridRow >= 0 && this.gridCol >= 0) {
        GridManager.getInstance().removeUnit(this.gridRow, this.gridCol);
      }
    });
  }

  private _drawBody(scene: Phaser.Scene): void {
    const scale = Soldier.RANK_SCALES[this.rank] || 0.6;

    // 使用图片素材代替程序化绘制
    const textureKey = soldierKey(this.soldierType, this.rank);
    if (scene.textures.exists(textureKey)) {
      const img = scene.add.image(0, 0, textureKey);
      img.setScale(scale);
      this.sprite.addAt(img, 0);
      this._bodyImage = img;
    } else {
      // 降级：如果图片不存在，保持旧的 Graphics 方式
      const gfx = scene.add.graphics();
      drawSoldierBody(gfx, this.soldierType, this.rank, scale);
      this.sprite.addAt(gfx, 0);
      this._bodyImage = gfx;
    }

    if (this.attackRange > 1) {
      const rangeGfx = scene.add.graphics();
      const cellSize = GridManager.getInstance().cellSize;
      rangeGfx.lineStyle(1, 0xffffff, 0.1);
      rangeGfx.strokeCircle(0, 0, this.attackRange * cellSize);
      this.sprite.add(rangeGfx);
    }

    // 阶级宝石点（替代 Lv 文字）
    const pipGfx = scene.add.graphics();
    const pipCount = 5;
    const pipSize = 3.5;
    const pipSpacing = 8;
    const totalWidth = (pipCount - 1) * pipSpacing;
    const startX = -totalWidth / 2;
    const pipY = -16;

    for (let i = 0; i < pipCount; i++) {
      const cx = startX + i * pipSpacing;
      const filled = i < this.rank;
      if (filled) {
        const rankColor = RANK_VISUALS[(i + 1) as SoldierRank].color;
        pipGfx.fillStyle(rankColor, 0.92);
      } else {
        pipGfx.fillStyle(0xffffff, 0.18);
      }
      pipGfx.fillPoints([
        new Phaser.Geom.Point(cx, pipY - pipSize),
        new Phaser.Geom.Point(cx + pipSize, pipY),
        new Phaser.Geom.Point(cx, pipY + pipSize),
        new Phaser.Geom.Point(cx - pipSize, pipY),
      ], true);
    }
    this.sprite.add(pipGfx);
    this._rankPips = pipGfx;
  }

  private _performAreaAttack(damage: number, color: number): void {
    const gridMgr = GridManager.getInstance();
    const radius = gridMgr.cellSize * 1.05;
    const targetX = this._target.sprite.x;
    const targetY = this._target.sprite.y;
    let hitCount = 0;

    for (const enemy of this._targetCandidates) {
      if (!enemy.alive || enemy.currentHp <= 0) continue;
      const dx = enemy.sprite.x - targetX;
      const dy = enemy.sprite.y - targetY;
      if (Math.sqrt(dx * dx + dy * dy) > radius) continue;

      enemy.takeDamage(enemy === this._target ? damage : Math.round(damage * 0.6));
      hitCount++;
    }

    if (hitCount <= 0) return;
    EffectSystem.forScene(this.sprite.scene as Phaser.Scene).playRing(targetX, targetY, {
      radius,
      color,
      alpha: 0.62,
      lineWidth: 3,
      depth: 88,
      scaleTo: 1.18,
      duration: 180,
    });
  }
}
