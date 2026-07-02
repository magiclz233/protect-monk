/**
 * 经验分配系统 - 击杀/助攻/光环三类经验
 */
import { GameEvent, eventMgr } from '../core/EventManager';

export interface IExperienceTarget {
  heroId: string;
  level: number;
  maxLevel: number;
  exp: number;
  addExp(amount: number): void;
  isSupport?: boolean; // 辅助英雄标记
}

export class ExperienceSystem {
  private static _instance: ExperienceSystem;
  static getInstance(): ExperienceSystem {
    if (!this._instance) this._instance = new ExperienceSystem();
    return this._instance;
  }

  private _allHeroes: Set<IExperienceTarget> = new Set();

  registerHero(hero: IExperienceTarget): void {
    this._allHeroes.add(hero);
  }

  unregisterHero(hero: IExperienceTarget): void {
    this._allHeroes.delete(hero);
  }

  clear(): void {
    this._allHeroes.clear();
  }

  /** 怪物死亡时分配经验 */
  distribute(killExp: number, assistExp: number, auraExp: number,
    killer: IExperienceTarget | null,
    assistHeroes: IExperienceTarget[],
  ): void {
    // 1) 击杀经验
    if (killer) killer.addExp(killExp);

    // 2) 助攻经验
    for (const hero of assistHeroes) {
      if (hero !== killer) hero.addExp(assistExp);
    }

    // 3) 光环经验
    for (const hero of this._allHeroes) {
      if (hero.isSupport) hero.addExp(auraExp);
    }
  }

  /** 仙桃升级消耗 */
  getPeachCost(currentLevel: number): number {
    const costs = [0, 15, 30, 50, 80, 120, 170, 230, 300, 380, 470, 570, 680, 800, 930];
    if (currentLevel < costs.length) return costs[currentLevel];
    return Math.round(costs[costs.length - 1] * 1.15 ** (currentLevel - costs.length + 1));
  }
}
