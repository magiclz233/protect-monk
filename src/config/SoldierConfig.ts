/**
 * 小兵数值配置表
 * 4兵种 × 5阶 = 20条配置
 */
import { SoldierType, SoldierRank, SoldierConfigItem, AttackType } from '../types';

const BASE: Record<SoldierType, { hp: number; atk: number; range: number; type: AttackType }> = {
  [SoldierType.MONKEY]:  { hp: 80,  atk: 15, range: 1, type: AttackType.MELEE },
  [SoldierType.SOLDIER]: { hp: 120, atk: 10, range: 2, type: AttackType.MID_RANGE },
  [SoldierType.RIDER]:   { hp: 100, atk: 12, range: 1, type: AttackType.AOE },
  [SoldierType.ARCHER]:  { hp: 60,  atk: 20, range: 4, type: AttackType.RANGED },
};

const RANK_NAMES: Record<number, string> = {
  1: '阶·白', 2: '阶·绿', 3: '阶·蓝', 4: '阶·紫', 5: '阶·橙',
};

const TYPE_NAMES: Record<SoldierType, string> = {
  [SoldierType.MONKEY]: '灵猴兵',
  [SoldierType.SOLDIER]: '天兵甲士',
  [SoldierType.RIDER]: '妖王骑',
  [SoldierType.ARCHER]: '道法弓手',
};

function scale(rank: number): { dmg: number; hp: number; spd: number } {
  const m = { dmg: Math.pow(1.8, rank - 1), hp: Math.pow(1.6, rank - 1), spd: Math.pow(0.92, rank - 1) };
  return { dmg: Number(m.dmg.toFixed(2)), hp: Number(m.hp.toFixed(2)), spd: Number(m.spd.toFixed(3)) };
}

let _cache: SoldierConfigItem[] | null = null;

export function generateSoldierConfig(): SoldierConfigItem[] {
  if (_cache) return _cache;
  const configs: SoldierConfigItem[] = [];
  const types = [SoldierType.MONKEY, SoldierType.SOLDIER, SoldierType.RIDER, SoldierType.ARCHER];

  for (const type of types) {
    const base = BASE[type];
    for (let rank = 1; rank <= 5; rank++) {
      const s = scale(rank);
      configs.push({
        type,
        rank: rank as SoldierRank,
        name: `${TYPE_NAMES[type]}${RANK_NAMES[rank]}`,
        hp: Math.round(base.hp * s.hp),
        attack: Math.round(base.atk * s.dmg),
        defense: Math.round(rank * 2),
        attackSpeed: Number((1 * s.spd).toFixed(3)),
        attackRange: base.range,
        attackType: base.type,
      });
    }
  }
  _cache = configs;
  return configs;
}

export function getSoldierConfig(type: SoldierType, rank: SoldierRank): SoldierConfigItem {
  const all = generateSoldierConfig();
  return all.find(c => c.type === type && c.rank === rank)!;
}
