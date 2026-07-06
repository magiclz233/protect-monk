import Phaser from 'phaser';
import { getHeroConfig } from '../config/HeroConfig';
import { getSoldierConfig } from '../config/SoldierConfig';
import { Hero } from '../entities/Hero';
import { HeroShard } from '../entities/HeroShard';
import { Soldier } from '../entities/Soldier';
import { CardData, CardType, SoldierRank } from '../types';

export function createCardFromBoardOccupant(occupant: Soldier | Hero | HeroShard): CardData {
  if (occupant instanceof Soldier) {
    return {
      type: CardType.SOLDIER,
      soldierType: occupant.soldierType,
      soldierRank: occupant.rank,
      displayName: occupant.unitName,
    };
  }

  if (occupant instanceof Hero) {
    return {
      type: CardType.HERO,
      heroId: occupant.heroId,
      heroLevel: occupant.level,
      displayName: occupant.unitName,
    };
  }

  return {
    type: CardType.HERO_SHARD,
    heroId: occupant.heroId,
    shardCount: occupant.count,
    displayName: `${occupant.displayName}碎片`,
  };
}

export function createSoldierFromCard(scene: Phaser.Scene, card: CardData): Soldier | null {
  if (card.type !== CardType.SOLDIER || !card.soldierType) return null;
  const rank = card.soldierRank ?? SoldierRank.WHITE;
  return new Soldier(scene, getSoldierConfig(card.soldierType, rank));
}

export function createHeroFromCard(scene: Phaser.Scene, card: CardData): Hero | null {
  if (card.type !== CardType.HERO || !card.heroId) return null;
  const config = getHeroConfig(card.heroId);
  if (!config) return null;

  const hero = new Hero(scene, config);
  const targetLevel = Math.max(1, Math.min(card.heroLevel ?? 1, hero.maxLevel));
  while (hero.level < targetLevel) {
    hero.levelUp();
  }
  return hero;
}
