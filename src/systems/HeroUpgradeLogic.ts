export interface HeroMergeLike {
  heroId: string;
  level: number;
  maxLevel: number;
}

export function canMergeHeroForUpgrade(source: HeroMergeLike, target: HeroMergeLike): boolean {
  return source.heroId === target.heroId
    && source.level < target.level
    && target.level < target.maxLevel;
}

export function getMergedHeroLevel(source: HeroMergeLike, target: HeroMergeLike): number {
  return canMergeHeroForUpgrade(source, target) ? target.level + 1 : target.level;
}
