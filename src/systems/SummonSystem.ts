/**
 * 召唤系统 - 消耗仙桃刷新卡池
 */
import { CardData, CardType, SoldierType, SummonResult } from '../types';
import { gameMgr } from '../core/GameManager';
import { eventMgr, GameEvent } from '../core/EventManager';

export const SUMMON_COST = 30;

const SOLDIER_NAMES: Record<SoldierType, string> = {
  [SoldierType.MONKEY]: '灵猴兵', [SoldierType.SOLDIER]: '天兵甲士',
  [SoldierType.RIDER]: '妖王骑', [SoldierType.ARCHER]: '道法弓手',
};

const HERO_NAMES: Record<string, string> = {
  sunwukong: '孙悟空', guanyin: '观音菩萨', niumowang: '牛魔王', honghaier: '红孩儿',
  erlangshen: '二郎神', nezha: '哪吒', taishanglaojun: '太上老君',
  zhubajie: '猪八戒', shawujing: '沙悟净', bailongma: '白龙马',
  heixiongjing: '黑熊精', baigufuren: '白骨夫人', zhizhujing: '蜘蛛精', tuotatianwang: '托塔天王',
};

export class SummonSystem {
  private static _instance: SummonSystem;
  static getInstance(): SummonSystem {
    if (!this._instance) this._instance = new SummonSystem();
    return this._instance;
  }

  private _summonCount: number = 0;

  summon(): SummonResult | null {
    const gm = gameMgr;
    if (!gm.consumePeach(SUMMON_COST)) return null;

    const cards: CardData[] = [];
    for (let i = 0; i < 5; i++) cards.push(this._drawCard());
    this._summonCount++;
    eventMgr.emit(GameEvent.SUMMON_REFRESH, cards);
    return { cards, cost: SUMMON_COST };
  }

  private _drawCard(): CardData {
    // 新手保底
    if (this._summonCount < 4) return { type: CardType.HERO_SHARD, heroId: 'sunwukong', displayName: '孙悟空碎片' };

    const r = Math.random();
    if (r < 0.70) return this._drawSoldier();
    if (r < 0.90) return this._drawShard();
    return this._drawItem();
  }

  private _drawSoldier(): CardData {
    const pool = [
      { type: SoldierType.MONKEY, w: 30 }, { type: SoldierType.SOLDIER, w: 25 },
      { type: SoldierType.RIDER, w: 25 }, { type: SoldierType.ARCHER, w: 20 },
    ];
    const total = pool.reduce((s, p) => s + p.w, 0);
    let r = Math.random() * total;
    for (const p of pool) { r -= p.w; if (r <= 0) return { type: CardType.SOLDIER, soldierType: p.type, displayName: SOLDIER_NAMES[p.type] }; }
    const last = pool[pool.length - 1];
    return { type: CardType.SOLDIER, soldierType: last.type, displayName: SOLDIER_NAMES[last.type] };
  }

  private _drawShard(): CardData {
    const heroIds = Object.keys(HERO_NAMES);
    const id = heroIds[Math.floor(Math.random() * heroIds.length)];
    return { type: CardType.HERO_SHARD, heroId: id, displayName: HERO_NAMES[id] + '碎片' };
  }

  private _drawItem(): CardData {
    const items = ['开山斧', '九转仙丹', '通用碎片', '紧箍咒'];
    const name = items[Math.floor(Math.random() * items.length)];
    return { type: CardType.ITEM, displayName: name };
  }

  reset(): void { this._summonCount = 0; }
}
