/**
 * 合成系统 - 核心二合一合成逻辑
 */
import { CellData, SoldierType, SoldierRank } from '../types';
import { eventMgr, GameEvent } from '../core/EventManager';

export const GRID_ROWS = 6;
export const GRID_COLS = 8;

export class MergeSystem {
  private static _instance: MergeSystem;
  static getInstance(): MergeSystem {
    if (!this._instance) this._instance = new MergeSystem();
    return this._instance;
  }

  /**
   * 检测相邻单位是否可合成
   * 返回合成结果：{ merged: true, keptCell, removedCell } 或 null
   */
  checkMerge(
    cells: CellData[][],
    row: number, col: number,
    getUnitData: (cell: CellData) => { type: string; rank: number; rarity?: string } | null,
    onUpgrade: (cell: CellData, newRank: number) => void,
    onRemove: (cell: CellData) => void,
  ): boolean {
    const cell = cells[row]?.[col];
    if (!cell || cell.state !== 'occupied') return false;

    const adj = [
      [row - 1, col], [row + 1, col],
      [row, col - 1], [row, col + 1],
    ];

    for (const [r, c] of adj) {
      const nb = cells[r]?.[c];
      if (!nb || nb.state !== 'occupied') continue;

      const aData = getUnitData(cell);
      const bData = getUnitData(nb);
      if (!aData || !bData) continue;
      if (aData.type !== bData.type) continue;

      // 小兵合成
      if (aData.rank === bData.rank && aData.rank < 5) {
        // 在cell位置保留升级，nb回收
        onUpgrade(cell, aData.rank + 1);
        onRemove(nb);
        eventMgr.emit(GameEvent.UNIT_MERGED, aData.type, aData.rank + 1);
        return true;
      }

      // 碎片激活检测由SummonSystem处理
    }
    return false;
  }
}
