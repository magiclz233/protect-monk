export interface DefenseRankConfigItem {
  id: string;
  name: string;
  minWave: number;
  frame: string;
  description: string;
}

export const DEFENSE_RANKS: DefenseRankConfigItem[] = [
  { id: 'fanxiu', name: '凡修', minWave: 0, frame: '无框', description: '初入守护' },
  { id: 'tianbing', name: '天兵', minWave: 5, frame: '铁框', description: '小有历练' },
  { id: 'tianjiang', name: '天将', minWave: 10, frame: '铜框', description: '独当一面' },
  { id: 'xingjun', name: '星君', minWave: 15, frame: '银框', description: '星辰之力' },
  { id: 'sanxian', name: '散仙', minWave: 20, frame: '金框', description: '超越凡尘' },
  { id: 'zhenjun', name: '真君', minWave: 25, frame: '紫金框', description: '一方霸主' },
  { id: 'jinxian', name: '金仙', minWave: 30, frame: '赤金框', description: '金身不坏' },
  { id: 'tianzun', name: '天尊', minWave: 35, frame: '七彩框', description: '天界至尊' },
  { id: 'dasheng', name: '大圣', minWave: 40, frame: '烈焰框', description: '齐天大圣' },
  { id: 'tiandi', name: '天帝', minWave: 50, frame: '至尊框', description: '三界之主' },
];

export function getDefenseRankByWave(wave: number): DefenseRankConfigItem {
  const normalizedWave = Math.max(0, Math.floor(wave));
  return DEFENSE_RANKS
    .slice()
    .reverse()
    .find(rank => normalizedWave >= rank.minWave) ?? DEFENSE_RANKS[0];
}
