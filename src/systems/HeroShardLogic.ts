export function canUseUniversalShardCount(count: number, needed: number): boolean {
  return count > 0 && count < needed;
}
