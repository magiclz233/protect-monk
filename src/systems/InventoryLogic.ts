import { CardData, CardType, ItemId } from '../types';

export const INITIAL_INVENTORY_SLOT_LIMIT = 5;
export const MAX_INVENTORY_SLOT_LIMIT = 8;

export type InventorySlot = CardData | null;

export function canStoreInInventory(card: CardData): boolean {
  return card.type === CardType.ITEM
    || card.type === CardType.HERO_SHARD
    || card.type === CardType.SOLDIER
    || card.type === CardType.HERO;
}

export function getHeroShardNeed(maxLevel: number): number {
  return maxLevel >= 15 ? 3 : 2;
}

export function countHeroShards(slots: readonly InventorySlot[], heroId: string): number {
  return slots.filter(card => card?.type === CardType.HERO_SHARD && card.heroId === heroId).length;
}

export function countUniversalShards(slots: readonly InventorySlot[]): number {
  return slots.filter(card => card?.type === CardType.ITEM && card.itemId === ItemId.UNIVERSAL_SHARD).length;
}

export function pickHeroShardConsumption(
  slots: readonly InventorySlot[],
  heroId: string,
  needed: number,
  preferredIndex: number,
): number[] | null {
  const preferred = slots[preferredIndex];
  if (preferred?.type !== CardType.HERO_SHARD || preferred.heroId !== heroId) return null;

  const sameHeroIndexes = slots
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card?.type === CardType.HERO_SHARD && card.heroId === heroId)
    .map(({ index }) => index)
    .sort((a, b) => (a === preferredIndex ? -1 : b === preferredIndex ? 1 : a - b));

  const picked = sameHeroIndexes.slice(0, needed);
  if (picked.length >= needed) return picked;

  const universalIndexes = slots
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card?.type === CardType.ITEM && card.itemId === ItemId.UNIVERSAL_SHARD)
    .map(({ index }) => index);

  for (const index of universalIndexes) {
    if (picked.length >= needed) break;
    picked.push(index);
  }

  return picked.length >= needed ? picked : null;
}
