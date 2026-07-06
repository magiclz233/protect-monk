export function getCellStep(cellSize: number, gap: number): number {
  return cellSize + gap;
}

export function getAttackRangePixels(attackRange: number, cellSize: number, gap: number): number {
  return attackRange * getCellStep(cellSize, gap) + cellSize * 0.25;
}
