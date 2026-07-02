/**
 * 网格管理器 - 8列×6行棋盘
 * Phaser Graphics 渲染，纯代码驱动
 */
import Phaser from 'phaser';
import { CellData, CellState, Waypoint } from '../types';
import { gameMgr } from '../core/GameManager';
import { eventMgr, GameEvent } from '../core/EventManager';

export const GRID_ROWS = 6;
export const GRID_COLS = 8;
export const DESIGN_W = 750;
export const DESIGN_H = 1334;

export class GridManager {
  private static _instance: GridManager;
  static getInstance(): GridManager { return this._instance; }

  // ---- 场景引用 ----
  scene: Phaser.Scene;

  // ---- 布局 ----
  cellSize: number = 80;
  gap: number = 4;
  gridX: number = 0;
  gridY: number = 120;

  // ---- 容器 ----
  gridContainer: Phaser.GameObjects.Container;
  unitContainer: Phaser.GameObjects.Container;
  enemyContainer: Phaser.GameObjects.Container;
  pathContainer: Phaser.GameObjects.Container;

  // ---- 数据 ----
  private _cells: CellData[][] = [];
  private _bgGraphics: Phaser.GameObjects.Graphics | null = null;

  /** 妖怪移动路径（世界坐标） */
  private _pathPoints: { x: number; y: number }[] = [];

  constructor(scene: Phaser.Scene) {
    GridManager._instance = this;
    this.scene = scene;

    // 容器层级：路径 → 网格 → 敌人 → 单位
    this.pathContainer = scene.add.container(0, 0);
    this.gridContainer = scene.add.container(0, 0);
    this.enemyContainer = scene.add.container(0, 0);
    this.unitContainer = scene.add.container(0, 0);
  }

  init(cellSize: number = 80): void {
    this.cellSize = cellSize;
    this.gridX = (DESIGN_W - (GRID_COLS * (cellSize + this.gap) - this.gap)) / 2;
    this._initCells();
    this._drawBackground();
  }

  private _initCells(): void {
    this._cells = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      this._cells[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        this._cells[row][col] = { row, col, state: CellState.EMPTY, occupant: null };
      }
    }
  }

  private _drawBackground(): void {
    if (this._bgGraphics) {
      this._bgGraphics.destroy();
    }
    this._bgGraphics = this.scene.add.graphics();

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const pos = this._cellToWorld(row, col);
        const cell = this._cells[row][col];

        const color = cell.state === CellState.LOCKED ? 0x555555 : 0x2a2a3e;
        this._bgGraphics.fillStyle(color, cell.state === CellState.LOCKED ? 0.7 : 0.5);
        this._bgGraphics.lineStyle(1, 0x4a4a6a, 0.6);
        this._bgGraphics.fillRect(pos.x, pos.y, this.cellSize, this.cellSize);
        this._bgGraphics.strokeRect(pos.x, pos.y, this.cellSize, this.cellSize);

        // 锁定标记
        if (cell.state === CellState.LOCKED) {
          this._bgGraphics.fillStyle(0xffffff, 0.4);
          this._bgGraphics.fillCircle(pos.x + this.cellSize / 2, pos.y + this.cellSize / 2, 10);
        }
      }
    }
    this.gridContainer.add(this._bgGraphics);
  }

  /** 设置锁定格子 */
  setLockedCells(locked: Array<[number, number]>): void {
    for (const [r, c] of locked) {
      if (this._cells[r]?.[c]) {
        this._cells[r][c].state = CellState.LOCKED;
      }
    }
    this._drawBackground();
  }

  /** 解锁一个山石格 */
  unlockCell(row: number, col: number): boolean {
    const cell = this._cells[row]?.[col];
    if (!cell || cell.state !== CellState.LOCKED) return false;
    cell.state = CellState.EMPTY;
    this._drawBackground();
    return true;
  }

  /** 设置妖怪移动路径（棋盘坐标转世界坐标） */
  setPath(waypoints: Waypoint[]): void {
    this._pathPoints = waypoints.map(wp => this._cellCenter(wp.row, wp.col));
    this._drawPath();
  }

  get pathPoints(): { x: number; y: number }[] {
    return this._pathPoints;
  }

  private _drawPath(): void {
    this.pathContainer.removeAll(true);
    if (this._pathPoints.length < 2) return;

    const g = this.scene.add.graphics();
    g.lineStyle(3, 0xff4444, 0.15);
    g.beginPath();
    g.moveTo(this._pathPoints[0].x, this._pathPoints[0].y);
    for (let i = 1; i < this._pathPoints.length; i++) {
      g.lineTo(this._pathPoints[i].x, this._pathPoints[i].y);
    }
    g.strokePath();
    this.pathContainer.add(g);
  }

  /** 唐僧位置（棋盘最底部中间） */
  getMonkCell(): { row: number; col: number } {
    return { row: GRID_ROWS - 1, col: Math.floor(GRID_COLS / 2) };
  }

  // ==================== 坐标转换 ====================

  private _cellToWorld(row: number, col: number): { x: number; y: number } {
    return {
      x: this.gridX + col * (this.cellSize + this.gap),
      y: this.gridY + row * (this.cellSize + this.gap),
    };
  }

  private _cellCenter(row: number, col: number): { x: number; y: number } {
    const pos = this._cellToWorld(row, col);
    return { x: pos.x + this.cellSize / 2, y: pos.y + this.cellSize / 2 };
  }

  cellCenter(row: number, col: number): { x: number; y: number } {
    return this._cellCenter(row, col);
  }

  worldToCell(px: number, py: number): { row: number; col: number } | null {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const pos = this._cellToWorld(r, c);
        if (px >= pos.x && px < pos.x + this.cellSize && py >= pos.y && py < pos.y + this.cellSize) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  // ==================== 格子操作 ====================

  getCell(row: number, col: number): CellData | null {
    return this._cells[row]?.[col] ?? null;
  }

  placeUnit(row: number, col: number, occupant: any): boolean {
    const cell = this._cells[row]?.[col];
    if (!cell || cell.state !== CellState.EMPTY) return false;
    cell.state = CellState.OCCUPIED;
    cell.occupant = occupant;
    eventMgr.emit(GameEvent.UNIT_PLACED, row, col, occupant);
    return true;
  }

  removeUnit(row: number, col: number): void {
    const cell = this._cells[row]?.[col];
    if (!cell) return;
    cell.state = CellState.EMPTY;
    cell.occupant = null;
    eventMgr.emit(GameEvent.UNIT_REMOVED, row, col);
  }

  getAdjacentOccupied(row: number, col: number): CellData[] {
    const adj = [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]];
    return adj
      .map(([r, c]) => this._cells[r]?.[c])
      .filter((c): c is CellData => !!c && c.state === CellState.OCCUPIED);
  }

  get cells(): CellData[][] { return this._cells; }
}
