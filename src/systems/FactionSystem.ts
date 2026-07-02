/**
 * 阵营羁绊系统
 */
import { Faction, FactionBuff } from '../types';

const FACTION_BUFFS: Record<Faction, FactionBuff> = {
  [Faction.SHITU]:   { damageBonus: 0.20, attackSpeedBonus: 0.15, defenseBonus: 0, hpRegenRate: 0, maxHpBonus: 0, critRateBonus: 0 },
  [Faction.XIANFO]:  { damageBonus: 0, attackSpeedBonus: 0, defenseBonus: 0.15, hpRegenRate: 0.02, maxHpBonus: 0, critRateBonus: 0 },
  [Faction.YAOWANG]: { damageBonus: 0, attackSpeedBonus: 0, defenseBonus: 0, hpRegenRate: 0, maxHpBonus: 0.30, critRateBonus: 0.20 },
};

export const HERO_FACTION: Record<string, Faction> = {
  sunwukong: Faction.SHITU, zhubajie: Faction.SHITU, shawujing: Faction.SHITU, bailongma: Faction.SHITU,
  guanyin: Faction.XIANFO, tuotatianwang: Faction.XIANFO, erlangshen: Faction.XIANFO,
  taishanglaojun: Faction.XIANFO, nezha: Faction.XIANFO,
  niumowang: Faction.YAOWANG, honghaier: Faction.YAOWANG, heixiongjing: Faction.YAOWANG,
  baigufuren: Faction.YAOWANG, zhizhujing: Faction.YAOWANG,
};

export class FactionSystem {
  private static _instance: FactionSystem;
  static getInstance(): FactionSystem {
    if (!this._instance) this._instance = new FactionSystem();
    return this._instance;
  }

  private _activeBuffs: Set<Faction> = new Set();

  /** 根据场上英雄ID列表计算羁绊 */
  update(heroIds: string[]): void {
    this._activeBuffs.clear();
    const count: Record<string, number> = {};
    for (const id of heroIds) {
      const f = this.getFaction(id);
      if (f) count[f] = (count[f] || 0) + 1;
    }
    for (const [faction, n] of Object.entries(count)) {
      if (n >= 3) this._activeBuffs.add(faction as Faction);
    }
  }

  getFaction(heroId: string): Faction | null {
    return HERO_FACTION[heroId] ?? null;
  }

  /** 获取某个阵营的当前加成 */
  getBuff(faction: Faction): FactionBuff | null {
    return this._activeBuffs.has(faction) ? FACTION_BUFFS[faction] : null;
  }

  /** 获取英雄实际生效的加成（合并所有激活阵营） */
  getActiveBuffsForHero(heroId: string): FactionBuff {
    const faction = this.getFaction(heroId);
    const result: FactionBuff = { damageBonus: 0, attackSpeedBonus: 0, defenseBonus: 0, hpRegenRate: 0, maxHpBonus: 0, critRateBonus: 0 };
    this._activeBuffs.forEach(f => {
      const b = FACTION_BUFFS[f];
      result.damageBonus += b.damageBonus;
      result.attackSpeedBonus += b.attackSpeedBonus;
      result.defenseBonus += b.defenseBonus;
      result.hpRegenRate += b.hpRegenRate;
      result.maxHpBonus += b.maxHpBonus;
      result.critRateBonus += b.critRateBonus;
    });
    return result;
  }
}
