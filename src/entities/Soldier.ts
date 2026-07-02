/**
 * 小兵 - 二合一合成，最高5阶
 */
import Phaser from 'phaser';
import { Unit } from './Unit';
import { SoldierType, SoldierRank, AttackType, UnitSide } from '../types';
import { SoldierConfigItem } from '../types';
import { GridManager } from '../grid/GridManager';
import { MathUtils } from '../utils/MathUtils';

export class Soldier extends Unit {
  soldierType: SoldierType;
  rank: SoldierRank;

  private static TYPE_COLORS: Record<SoldierType, number> = {
    [SoldierType.MONKEY]: 0xe8b84b,
    [SoldierType.SOLDIER]: 0x4b8be8,
    [SoldierType.RIDER]: 0x8b4be8,
    [SoldierType.ARCHER]: 0x4be88b,
  };

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

  private _drawBody(scene: Phaser.Scene): void {
    const scale = Soldier.RANK_SCALES[this.rank] || 0.6;
    const color = Soldier.TYPE_COLORS[this.soldierType] || 0xffffff;

    this._bodyGfx = scene.add.graphics();
    // 身体
    this._bodyGfx.fillStyle(color);
    this._bodyGfx.fillRoundedRect(-24 * scale, -24 * scale, 48 * scale, 48 * scale, 6 * scale);
    // 边框
    this._bodyGfx.lineStyle(2, 0xffffff, 0.3);
    this._bodyGfx.strokeRoundedRect(-24 * scale, -24 * scale, 48 * scale, 48 * scale, 6 * scale);

    // 攻击范围指示
    if (this.attackRange > 1) {
      const cellSize = GridManager.getInstance().cellSize;
      this._bodyGfx.lineStyle(1, 0xffffff, 0.1);
      this._bodyGfx.strokeCircle(0, 0, this.attackRange * cellSize);
    }

    this.sprite.addAt(this._bodyGfx, 0);

    // 阶数标签
    const rankColors = ['', '#ffffff', '#44ff44', '#4488ff', '#cc44ff', '#ffaa44'];
    this._rankText = scene.add.text(0, 28 * scale, this.rank === SoldierRank.ORANGE ? '满' : `阶${this.rank}`, {
      fontSize: '10px', color: rankColors[this.rank] || '#ffffff',
    });
    this._rankText.setOrigin(0.5);
    this.sprite.add(this._rankText);
  }

  upgrade(): boolean {
    if (this.rank >= SoldierRank.ORANGE) return false;
    this.rank++;
    this.maxHp = Math.round(this.maxHp * 1.6);
    this.currentHp = this.maxHp;
    this.attack = Math.round(this.attack * 1.8);
    this.attackSpeed = Number((this.attackSpeed * 0.92).toFixed(3));
    this._attackCooldown = 1 / this.attackSpeed;

    // 重绘
    this._bodyGfx.destroy();
    this._rankText.destroy();
    const scene = this.sprite.scene as Phaser.Scene;
    this._drawBody(scene);

    return true;
  }

  protected performAttack(): void {
    if (!this._target || this._target.currentHp <= 0) return;
    const dmg = MathUtils.damageVariance(this.attack);
    this._target.takeDamage(dmg);
  }

  protected onDeath(): void {
    this.sprite.setVisible(false);
    if (this.gridRow >= 0 && this.gridCol >= 0) {
      GridManager.getInstance().removeUnit(this.gridRow, this.gridCol);
    }
  }
}
