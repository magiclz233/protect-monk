import { CardData, CardType, ItemId, SoldierType, SummonResult } from '../types';
import { gameMgr } from '../core/GameManager';
import { eventMgr, GameEvent } from '../core/EventManager';
import { HeroData } from '../data/HeroData';

export const SUMMON_COST = 30;
export const SUMMON_COST_STEP = 10;
export const SUMMON_COST_CAP = 160;
export const SUMMON_CARD_COUNT = 5;
export const SUMMON_SOLDIER_RATE = 0.66;
export const SUMMON_SHARD_RATE = 0.22;
export const SUMMON_AXE_RATE = 0.12;
export const SELECTED_HERO_SHARD_WEIGHT = 5;
export const AXE_CARD_PITY = 12;

const SOLDIER_NAMES: Record<SoldierType, string> = {
  [SoldierType.MONKEY]: '灵猴兵',
  [SoldierType.SOLDIER]: '天兵甲士',
  [SoldierType.RIDER]: '妖王骑兵',
  [SoldierType.ARCHER]: '道法弓手',
};

const HERO_NAMES: Record<string, string> = {
  sunwukong: '孙悟空',
  guanyin: '观音菩萨',
  niumowang: '牛魔王',
  honghaier: '红孩儿',
  erlangshen: '二郎神',
  nezha: '哪吒',
  taishanglaojun: '太上老君',
  zhubajie: '猪八戒',
  shawujing: '沙悟净',
  bailongma: '白龙马',
  heixiongjing: '黑熊精',
  baigufuren: '白骨夫人',
  zhizhujing: '蜘蛛精',
  tuotatianwang: '托塔天王',
};

export class SummonSystem {
  private static _instance: SummonSystem;

  static getInstance(): SummonSystem {
    if (!this._instance) this._instance = new SummonSystem();
    return this._instance;
  }

  private _paidSummonCount: number = 0;
  private _axeSeenInPaidSummon: boolean = false;
  private _nonAxeCardCounter: number = 0;
  private _wukongShardGuaranteed: boolean = false;

  summon(): SummonResult | null {
    const cost = this.currentCost;
    if (!gameMgr.consumePeach(cost)) return null;

    const cards = this._drawCards(true);
    eventMgr.emit(GameEvent.SUMMON_REFRESH, cards);
    return { cards, cost };
  }

  summonFree(): SummonResult {
    const cards = this._drawCards(false);
    eventMgr.emit(GameEvent.SUMMON_REFRESH, cards);
    return { cards, cost: 0 };
  }

  createUniversalShardCard(): CardData {
    return {
      type: CardType.ITEM,
      itemId: ItemId.UNIVERSAL_SHARD,
      displayName: '通用碎片',
    };
  }

  reset(): void {
    this._paidSummonCount = 0;
    this._axeSeenInPaidSummon = false;
    this._nonAxeCardCounter = 0;
    this._wukongShardGuaranteed = false;
  }

  get currentCost(): number {
    return Math.min(SUMMON_COST_CAP, SUMMON_COST + this._paidSummonCount * SUMMON_COST_STEP);
  }

  private _drawCards(isPaid: boolean): CardData[] {
    const cards: CardData[] = [];
    while (cards.length < SUMMON_CARD_COUNT) {
      cards.push(this._drawCard());
    }

    if (isPaid) {
      this._paidSummonCount++;
      this._applyPaidGuarantees(cards);
    }
    return cards;
  }

  private _drawCard(): CardData {
    if (this._nonAxeCardCounter >= AXE_CARD_PITY) {
      return this._drawAxe();
    }

    const r = Math.random();
    if (r < SUMMON_SOLDIER_RATE) return this._trackNonAxe(this._drawSoldier());
    if (r < SUMMON_SOLDIER_RATE + SUMMON_SHARD_RATE) return this._trackNonAxe(this._drawShard());
    return this._drawAxe();
  }

  private _drawSoldier(): CardData {
    const pool = [
      { type: SoldierType.MONKEY, weight: 30 },
      { type: SoldierType.SOLDIER, weight: 25 },
      { type: SoldierType.RIDER, weight: 25 },
      { type: SoldierType.ARCHER, weight: 20 },
    ];
    const total = pool.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;

    for (const item of pool) {
      roll -= item.weight;
      if (roll <= 0) {
        return {
          type: CardType.SOLDIER,
          soldierType: item.type,
          soldierRank: 1,
          displayName: SOLDIER_NAMES[item.type],
        };
      }
    }

    const fallback = pool[pool.length - 1];
    return {
      type: CardType.SOLDIER,
      soldierType: fallback.type,
      soldierRank: 1,
      displayName: SOLDIER_NAMES[fallback.type],
    };
  }

  private _drawShard(): CardData {
    const heroData = HeroData.getInstance();
    heroData.loadFromSave();
    heroData.ensureDefaults();
    const heroIds = Object.keys(HERO_NAMES).filter(heroId => heroData.get(heroId).unlocked);
    const selected = new Set(gameMgr.selectedHeroes);
    const weights = heroIds.map(heroId => selected.has(heroId) ? SELECTED_HERO_SHARD_WEIGHT : 1);
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = Math.random() * total;
    let heroId = heroIds[0];
    for (let i = 0; i < heroIds.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        heroId = heroIds[i];
        break;
      }
    }
    return this._createShard(heroId);
  }

  private _createShard(heroId: string): CardData {
    return {
      type: CardType.HERO_SHARD,
      heroId,
      shardCount: 1,
      displayName: `${HERO_NAMES[heroId] ?? heroId}碎片`,
    };
  }

  private _drawAxe(): CardData {
    this._nonAxeCardCounter = 0;
    return { type: CardType.ITEM, itemId: ItemId.AXE, displayName: '开山斧' };
  }

  private _trackNonAxe(card: CardData): CardData {
    this._nonAxeCardCounter++;
    return card;
  }

  private _applyPaidGuarantees(cards: CardData[]): void {
    if (cards.some(card => card.type === CardType.ITEM && card.itemId === ItemId.AXE)) {
      this._axeSeenInPaidSummon = true;
    }

    const heroData = HeroData.getInstance();
    heroData.loadFromSave();
    heroData.ensureDefaults();
    if (
      !this._wukongShardGuaranteed
      && this._paidSummonCount <= 3
      && heroData.get('sunwukong').unlocked
      && !cards.some(card => card.type === CardType.HERO_SHARD && card.heroId === 'sunwukong')
    ) {
      cards[0] = this._createShard('sunwukong');
      this._wukongShardGuaranteed = true;
    }

    if (!this._axeSeenInPaidSummon && this._paidSummonCount >= 4) {
      cards[cards.length - 1] = this._drawAxe();
      this._axeSeenInPaidSummon = true;
    }
  }
}
