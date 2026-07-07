import Phaser from 'phaser';
import { AttackType, SoldierConfigItem, SoldierRank, SoldierType, UnitSide } from '../types';
import { ATTACK_EFFECT_VISUALS, RANK_VISUALS, SOLDIER_VISUALS } from '../config/VisualConfig';
import { createCjkText } from '../core/TextStyles';
import { GridManager } from '../grid/GridManager';
import { drawSoldierBody } from '../render/VisualPainter';
import { EffectSystem } from '../systems/EffectSystem';
import { MathUtils } from '../utils/MathUtils';
import { Unit } from './Unit';

export class Soldier extends Unit {
  soldierType: SoldierType;
  rank: SoldierRank;

  private static RANK_SCALES = [0, 0.6, 0.72, 0.84, 0.95, 1.08];

  private _bodyGfx!: Phaser.GameObjects.Graphics;
  private _rankText!: Phaser.GameObjects.Text;

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
  }

  upgrade(): boolean {
    if (this.rank >= SoldierRank.ORANGE) return false;
    this.rank++;
    this.maxHp = Math.round(this.maxHp * 1.6);
    this.currentHp = this.maxHp;
    this.attack = Math.round(this.attack * 1.8);
    this.attackSpeed = Number((this.attackSpeed * 0.92).toFixed(3));
    this._attackCooldown = 1 / this.attackSpeed;

    this._bodyGfx.destroy();
    this._rankText.destroy();
    this._drawBody(this.sprite.scene as Phaser.Scene);
    return true;
  }

  protected performAttack(): void {
    if (!this._target || this._target.currentHp <= 0) return;
    const damage = MathUtils.damageVariance(this.effectiveAttack);
    const effect = EffectSystem.forScene(this.sprite.scene as Phaser.Scene);
    const attackVisual = ATTACK_EFFECT_VISUALS[this.attackType];
    const color = attackVisual?.color ?? SOLDIER_VISUALS[this.soldierType].stroke;

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
    this.sprite.setVisible(false);
    if (this.gridRow >= 0 && this.gridCol >= 0) {
      GridManager.getInstance().removeUnit(this.gridRow, this.gridCol);
    }
  }

  private _drawBody(scene: Phaser.Scene): void {
    const scale = Soldier.RANK_SCALES[this.rank] || 0.6;

    this._bodyGfx = scene.add.graphics();
    drawSoldierBody(this._bodyGfx, this.soldierType, this.rank, scale);

    if (this.attackRange > 1) {
      const cellSize = GridManager.getInstance().cellSize;
      this._bodyGfx.lineStyle(1, 0xffffff, 0.1);
      this._bodyGfx.strokeCircle(0, 0, this.attackRange * cellSize);
    }

    this._bodyGfx.fillStyle(0x101826, 0.9);
    this._bodyGfx.fillRoundedRect(-25, -39, 50, 18, 6);
    this._bodyGfx.lineStyle(1.5, 0xffffff, 0.45);
    this._bodyGfx.strokeRoundedRect(-25, -39, 50, 18, 6);
    this.sprite.addAt(this._bodyGfx, 0);

    const rankLabel = this.rank >= SoldierRank.ORANGE ? 'MAX' : `Lv${this.rank}`;
    this._rankText = createCjkText(scene, 0, -30, rankLabel, {
      fontSize: '15px',
      color: RANK_VISUALS[this.rank].labelColor,
      fontStyle: 'bold',
      stroke: '#101826',
      strokeThickness: 3,
    });
    this._rankText.setOrigin(0.5);
    this.sprite.add(this._rankText);
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
