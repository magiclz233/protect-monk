/**
 * 英雄 - 碎片激活+经验升级
 */
import Phaser from 'phaser';
import { Unit } from './Unit';
import { HeroRarity, Faction } from '../types';
import { HeroConfigItem, getHeroConfig } from '../config/HeroConfig';
import { GridManager } from '../grid/GridManager';
import { ExperienceSystem, IExperienceTarget } from '../systems/ExperienceSystem';
import { MathUtils } from '../utils/MathUtils';

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

  /** 被本英雄攻击过的怪物 */
  attackedEnemies: Set<any> = new Set();
  /** 攻击本英雄的怪物（肉盾助攻） */
  attackedByEnemies: Set<any> = new Set();

  private static RARITY_COLORS: Record<HeroRarity, number> = {
    [HeroRarity.NORMAL]: 0x44aa88,
    [HeroRarity.CORE]: 0xddaa44,
  };

  constructor(scene: Phaser.Scene, config: HeroConfigItem) {
    super(scene);
    this._config = config;
    this.heroId = config.heroId;
    this.rarity = config.rarity;
    this.faction = config.faction;
    this.maxLevel = config.maxLevel;
    this.shardsNeeded = config.shardsNeeded;
    this.unitName = config.name;
    this.isSupport = config.role === '治疗辅助';

    this.applyLevelStats();
    ExperienceSystem.getInstance().registerHero(this);
    this._drawBody(scene);
  }

  applyLevelStats(): void {
    const cfg = this._config ?? getHeroConfig(this.heroId);
    if (!cfg) return;

    const levelMult = 1 + (this.level - 1) * 0.15;
    this.maxHp = Math.round(cfg.baseHp * levelMult);
    this.currentHp = this.maxHp;
    this.attack = Math.round(cfg.baseAttack * levelMult);
    this.attackRange = cfg.attackRange;
    this.attackSpeed = cfg.attackSpeed * (1 + (this.level - 1) * 0.03);
    this._attackCooldown = 1 / this.attackSpeed;
  }

  addExp(amount: number): void {
    this.exp += amount;
    const needed = this._expToNext();
    while (this.exp >= needed && this.level < this.maxLevel) {
      this.exp -= needed;
      this.level++;
      this.applyLevelStats();
      this._lvText.setText(`Lv${this.level}`);
    }
  }

  levelUp(): boolean {
    if (this.level >= this.maxLevel) return false;
    this.level++;
    this.applyLevelStats();
    this._lvText.setText(`Lv${this.level}`);
    return true;
  }

  private _expToNext(): number {
    const curve = [0, 20, 45, 80, 125, 185, 260, 350, 460, 590, 740, 910, 1100, 1320, 1580, 1880];
    if (this.level < curve.length) return curve[this.level];
    return Math.round(curve[curve.length - 1] * 1.1 ** (this.level - curve.length + 1));
  }

  upgradeStar(): boolean {
    if (this._starLevel >= 5) return false;
    this._starLevel++;
    this.applyLevelStats();
    return true;
  }

  get starLevel(): number { return this._starLevel; }

  protected performAttack(): void {
    if (!this._target || this._target.currentHp <= 0) return;
    let dmg = MathUtils.damageVariance(this.attack);

    if (this.heroId === 'sunwukong' && this._target.enemyType === 'boss') {
      dmg = Math.round(dmg * 1.5);
    }
    if (this.heroId === 'erlangshen') {
      dmg = Math.round(dmg * 1.4);
    }
    if (MathUtils.roll(this.critRate)) {
      dmg = Math.round(dmg * 1.5);
    }

    this._target.takeDamage(dmg);
    this.attackedEnemies.add(this._target);
  }

  protected onDeath(): void {
    this.sprite.setVisible(false);
    ExperienceSystem.getInstance().unregisterHero(this);
    if (this.gridRow >= 0 && this.gridCol >= 0) {
      GridManager.getInstance().removeUnit(this.gridRow, this.gridCol);
    }
  }

  private _drawBody(scene: Phaser.Scene): void {
    const color = Hero.RARITY_COLORS[this.rarity];
    const scale = 0.8;

    this._bodyGfx = scene.add.graphics();
    this._bodyGfx.fillStyle(color);
    this._bodyGfx.fillRoundedRect(-28 * scale, -28 * scale, 56 * scale, 56 * scale, 8 * scale);
    this._bodyGfx.lineStyle(2, 0xffdd88, 0.6);
    this._bodyGfx.strokeRoundedRect(-28 * scale, -28 * scale, 56 * scale, 56 * scale, 8 * scale);
    this.sprite.addAt(this._bodyGfx, 0);

    this._nameText = scene.add.text(0, 0, this.unitName.slice(0, 2), {
      fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
    });
    this._nameText.setOrigin(0.5);
    this.sprite.add(this._nameText);

    this._lvText = scene.add.text(0, 20 * scale, `Lv${this.level}`, {
      fontSize: '8px', color: '#ffffaa',
    });
    this._lvText.setOrigin(0.5);
    this.sprite.add(this._lvText);
  }
}
