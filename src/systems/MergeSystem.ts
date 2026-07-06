/**
 * 合成系统 - 核心二合一合成逻辑
 */
import { CellData, SoldierType, SoldierRank } from '../types';
import { eventMgr, GameEvent } from '../core/EventManager';
import { Soldier } from '../entities/Soldier';
import { GridManager } from '../grid/GridManager';
import { BattleSystem } from './BattleSystem';
import { EffectSystem } from './EffectSystem';

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

  tryMergeSoldier(gridMgr: GridManager, battleSystem: BattleSystem, row: number, col: number): boolean {
    let merged = false;
    let currentRow = row;
    let currentCol = col;

    while (this._mergeOnce(gridMgr, battleSystem, currentRow, currentCol)) {
      merged = true;
      const cell = gridMgr.getCell(currentRow, currentCol);
      if (!(cell?.occupant instanceof Soldier) || cell.occupant.rank >= SoldierRank.ORANGE) {
        break;
      }
    }

    return merged;
  }

  tryMergeSoldierCard(gridMgr: GridManager, row: number, col: number, soldierType: SoldierType, rank: SoldierRank): boolean {
    const occupant = gridMgr.getCell(row, col)?.occupant;
    if (!(occupant instanceof Soldier)) return false;
    if (occupant.soldierType !== soldierType || occupant.rank !== rank || occupant.rank >= SoldierRank.ORANGE) return false;

    const oldRank = occupant.rank;
    occupant.upgrade();
    this._playMergeEffect(gridMgr, row, col);
    eventMgr.emit(GameEvent.UNIT_MERGED, occupant.soldierType, oldRank + 1);
    return true;
  }

  tryMergeDraggedSoldier(gridMgr: GridManager, battleSystem: BattleSystem, from: Soldier, to: Soldier): boolean {
    if (from === to) return false;
    if (from.soldierType !== to.soldierType || from.rank !== to.rank || to.rank >= SoldierRank.ORANGE) return false;

    const oldRank = to.rank;
    const fromRow = from.gridRow;
    const fromCol = from.gridCol;
    battleSystem.removeAlly(from);
    gridMgr.removeUnit(fromRow, fromCol);
    from.sprite.destroy();
    to.upgrade();
    this._playMergeEffect(gridMgr, to.gridRow, to.gridCol);
    eventMgr.emit(GameEvent.UNIT_MERGED, to.soldierType, oldRank + 1);
    return true;
  }

  private _mergeOnce(gridMgr: GridManager, battleSystem: BattleSystem, row: number, col: number): boolean {
    const cell = gridMgr.getCell(row, col);
    const soldier = cell?.occupant;
    if (!(soldier instanceof Soldier) || soldier.rank >= SoldierRank.ORANGE) return false;

    const match = gridMgr.getAdjacentOccupied(row, col).find(adjacent => {
      const other = adjacent.occupant;
      return other instanceof Soldier
        && other.soldierType === soldier.soldierType
        && other.rank === soldier.rank;
    });

    if (!match || !(match.occupant instanceof Soldier)) return false;

    const oldRank = soldier.rank;
    const removedSoldier = match.occupant;
    battleSystem.removeAlly(removedSoldier);
    removedSoldier.sprite.destroy();
    gridMgr.removeUnit(match.row, match.col);

    soldier.upgrade();
    this._playMergeEffect(gridMgr, row, col);
    eventMgr.emit(GameEvent.UNIT_MERGED, soldier.soldierType, oldRank + 1);
    return true;
  }

  private _playMergeEffect(gridMgr: GridManager, row: number, col: number): void {
    const center = gridMgr.cellCenter(row, col);
    EffectSystem.forScene(gridMgr.scene).playRing(center.x, center.y, {
      radius: gridMgr.cellSize * 0.42,
      color: 0xffd36a,
      alpha: 0.95,
      lineWidth: 4,
      depth: 85,
      scaleTo: 1.45,
      duration: 320,
    });
  }
}
