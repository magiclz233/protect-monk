import Phaser from 'phaser';
import { BoardTemplate, CellData, CellState, Waypoint } from '../types';
import { eventMgr, GameEvent } from '../core/EventManager';
import { createCjkText } from '../core/TextStyles';
import { DEFENSE_DEFAULT_TEMPLATE } from '../data/DefenseBoardData';
import { BATTLE_UI, drawBattlePanel } from '../ui/BattleUiPrimitives';

export const DESIGN_W = 750;
export const DESIGN_H = 1334;

export class GridManager {
  private static _instance: GridManager;
  static getInstance(): GridManager { return this._instance; }

  scene: Phaser.Scene;

  cellSize: number = 80;
  gap: number = 3;
  gridX: number = 0;
  gridY: number = 196;
  rows: number = DEFENSE_DEFAULT_TEMPLATE.rows;
  cols: number = DEFENSE_DEFAULT_TEMPLATE.cols;

  gridContainer: Phaser.GameObjects.Container;
  unitContainer: Phaser.GameObjects.Container;
  enemyContainer: Phaser.GameObjects.Container;
  pathContainer: Phaser.GameObjects.Container;

  private _cells: CellData[][] = [];
  private _bgGraphics: Phaser.GameObjects.Graphics | null = null;
  private _legendContainer: Phaser.GameObjects.Container | null = null;
  private _monkCell: Waypoint = DEFENSE_DEFAULT_TEMPLATE.monkEndCell;

  private _pathPoints: { x: number; y: number }[] = [];
  private _pathCells: Set<string> = new Set();

  constructor(scene: Phaser.Scene) {
    GridManager._instance = this;
    this.scene = scene;

    this.pathContainer = scene.add.container(0, 0);
    this.gridContainer = scene.add.container(0, 0);
    this.enemyContainer = scene.add.container(0, 0);
    this.unitContainer = scene.add.container(0, 0);

    this.gridContainer.setDepth(10);
    this.pathContainer.setDepth(15);
    this.enemyContainer.setDepth(30);
    this.unitContainer.setDepth(40);
  }

  init(templateOrCellSize: BoardTemplate | number = DEFENSE_DEFAULT_TEMPLATE): void {
    const template = typeof templateOrCellSize === 'number' ? DEFENSE_DEFAULT_TEMPLATE : templateOrCellSize;
    const requestedCellSize = typeof templateOrCellSize === 'number' ? templateOrCellSize : 80;

    this.rows = template.rows;
    this.cols = template.cols;
    this._monkCell = template.monkEndCell;
    this.cellSize = this._fitCellSize(requestedCellSize, this.cols);
    this.gridX = (DESIGN_W - this._boardWidth()) / 2;
    this._initCells();
    this.setPath(template.path);
  }

  private _fitCellSize(requested: number, cols: number): number {
    const maxBoardWidth = DESIGN_W - 48;
    const maxCellSize = Math.floor((maxBoardWidth + this.gap) / cols - this.gap);
    return Math.min(requested, maxCellSize);
  }

  private _initCells(): void {
    this._cells = [];
    for (let row = 0; row < this.rows; row++) {
      this._cells[row] = [];
      for (let col = 0; col < this.cols; col++) {
        this._cells[row][col] = { row, col, state: CellState.EMPTY, occupant: null };
      }
    }
  }

  private _drawBackground(): void {
    if (this._bgGraphics) {
      this._bgGraphics.destroy();
    }
    if (this._legendContainer) {
      this._legendContainer.destroy(true);
      this._legendContainer = null;
    }
    this._bgGraphics = this.scene.add.graphics();

    const boardW = this._boardWidth();
    const boardH = this._boardHeight();
    drawBattlePanel(this._bgGraphics, this.gridX - 16, this.gridY - 64, boardW + 32, boardH + 84, {
      fill: 0x0d1424,
      fillAlpha: 0.98,
      stroke: BATTLE_UI.gold,
      strokeAlpha: 0.46,
      radius: 12,
      shadow: true,
    });
    this._bgGraphics.fillStyle(0x0a1020, 0.46);
    this._bgGraphics.fillRoundedRect(this.gridX - 6, this.gridY - 6, boardW + 12, boardH + 12, 8);

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const pos = this._cellToWorld(row, col);
        const cell = this._cells[row][col];
        const isPath = this.isPathCell(row, col);
        const isLocked = cell.state === CellState.LOCKED;
        const isBuildable = !isPath && !isLocked;

        const color = isLocked ? 0x51483f : isPath ? 0x3f1e2c : 0x123d39;
        const borderColor = isLocked ? 0xd2a24a : isPath ? BATTLE_UI.cinnabarLight : BATTLE_UI.jadeLight;
        this._bgGraphics.fillStyle(color, isLocked ? 0.98 : 0.9);
        this._bgGraphics.lineStyle(1.5, borderColor, isBuildable ? 0.72 : 0.58);
        this._bgGraphics.fillRoundedRect(pos.x, pos.y, this.cellSize, this.cellSize, 4);
        this._bgGraphics.strokeRoundedRect(pos.x, pos.y, this.cellSize, this.cellSize, 4);

        if (isBuildable) {
          this._drawBuildCellMarkers(pos.x, pos.y);
        } else if (isPath) {
          this._drawPathCellBase(pos.x, pos.y);
        } else if (isLocked) {
          this._drawLockedCell(pos.x, pos.y);
        }
      }
    }
    this.gridContainer.add(this._bgGraphics);
    this._drawLegend(boardW);
  }

  setLockedCells(locked: Array<[number, number]>): void {
    for (const row of this._cells) {
      for (const cell of row) {
        if (cell.state === CellState.LOCKED) {
          cell.state = CellState.EMPTY;
        }
      }
    }

    for (const [r, c] of locked) {
      if (this._cells[r]?.[c] && !this.isPathCell(r, c)) {
        this._cells[r][c].state = CellState.LOCKED;
      }
    }
    this._drawBackground();
  }

  unlockCell(row: number, col: number): boolean {
    const cell = this._cells[row]?.[col];
    if (!cell || cell.state !== CellState.LOCKED) return false;
    cell.state = CellState.EMPTY;
    this._drawBackground();
    return true;
  }

  setPath(waypoints: Waypoint[]): void {
    this._pathCells = new Set(waypoints.map(wp => this._cellKey(wp.row, wp.col)));
    this._pathPoints = waypoints.map(wp => this._cellCenter(wp.row, wp.col));
    this._drawBackground();
    this._drawPath();
  }

  get pathPoints(): { x: number; y: number }[] {
    return this._pathPoints;
  }

  private _drawPath(): void {
    this.pathContainer.removeAll(true);
    if (this._pathPoints.length < 2) return;

    const g = this.scene.add.graphics();
    g.lineStyle(Math.max(22, this.cellSize * 0.38), 0x281321, 0.84);
    g.beginPath();
    g.moveTo(this._pathPoints[0].x, this._pathPoints[0].y);
    for (let i = 1; i < this._pathPoints.length; i++) {
      g.lineTo(this._pathPoints[i].x, this._pathPoints[i].y);
    }
    g.strokePath();
    g.lineStyle(Math.max(15, this.cellSize * 0.27), 0x9e3345, 0.76);
    g.beginPath();
    g.moveTo(this._pathPoints[0].x, this._pathPoints[0].y);
    for (let i = 1; i < this._pathPoints.length; i++) {
      g.lineTo(this._pathPoints[i].x, this._pathPoints[i].y);
    }
    g.strokePath();
    g.lineStyle(4, BATTLE_UI.goldLight, 0.88);
    g.beginPath();
    g.moveTo(this._pathPoints[0].x, this._pathPoints[0].y);
    for (let i = 1; i < this._pathPoints.length; i++) {
      g.lineTo(this._pathPoints[i].x, this._pathPoints[i].y);
    }
    g.strokePath();
    for (let i = 0; i < this._pathPoints.length - 1; i++) {
      this._drawPathArrow(g, this._pathPoints[i], this._pathPoints[i + 1]);
    }

    const start = this._pathPoints[0];
    const end = this._pathPoints[this._pathPoints.length - 1];
    const startText = createCjkText(this.scene, start.x, start.y, '妖', {
      fontSize: '20px',
      color: '#fff2b8',
      fontStyle: 'bold',
      stroke: '#5a1826',
      strokeThickness: 4,
    });
    startText.setOrigin(0.5);
    const endText = createCjkText(this.scene, end.x, end.y, '终', {
      fontSize: '20px',
      color: '#fff2b8',
      fontStyle: 'bold',
      stroke: '#5a1826',
      strokeThickness: 4,
    });
    endText.setOrigin(0.5);
    this.pathContainer.add([g, startText, endText]);
  }

  getMonkCell(): { row: number; col: number } {
    return { row: this._monkCell.row, col: this._monkCell.col };
  }

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
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const pos = this._cellToWorld(r, c);
        if (px >= pos.x && px < pos.x + this.cellSize && py >= pos.y && py < pos.y + this.cellSize) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  getCell(row: number, col: number): CellData | null {
    return this._cells[row]?.[col] ?? null;
  }

  isPathCell(row: number, col: number): boolean {
    return this._pathCells.has(this._cellKey(row, col));
  }

  canPlaceUnit(row: number, col: number): boolean {
    const cell = this._cells[row]?.[col];
    return !!cell && cell.state === CellState.EMPTY && !this.isPathCell(row, col);
  }

  placeUnit(row: number, col: number, occupant: any): boolean {
    const cell = this._cells[row]?.[col];
    if (!cell || !this.canPlaceUnit(row, col)) return false;
    cell.state = CellState.OCCUPIED;
    cell.occupant = occupant;
    eventMgr.emit(GameEvent.UNIT_PLACED, row, col, occupant);
    return true;
  }

  moveUnit(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    const from = this._cells[fromRow]?.[fromCol];
    const to = this._cells[toRow]?.[toCol];
    if (!from || !to || from.state !== CellState.OCCUPIED || !this.canPlaceUnit(toRow, toCol)) return false;

    to.state = CellState.OCCUPIED;
    to.occupant = from.occupant;
    from.state = CellState.EMPTY;
    from.occupant = null;
    eventMgr.emit(GameEvent.UNIT_REMOVED, fromRow, fromCol);
    eventMgr.emit(GameEvent.UNIT_PLACED, toRow, toCol, to.occupant);
    return true;
  }

  swapUnits(aRow: number, aCol: number, bRow: number, bCol: number): boolean {
    const a = this._cells[aRow]?.[aCol];
    const b = this._cells[bRow]?.[bCol];
    if (!a || !b || a.state !== CellState.OCCUPIED || b.state !== CellState.OCCUPIED) return false;
    if (this.isPathCell(aRow, aCol) || this.isPathCell(bRow, bCol)) return false;

    const temp = a.occupant;
    a.occupant = b.occupant;
    b.occupant = temp;
    eventMgr.emit(GameEvent.UNIT_PLACED, aRow, aCol, a.occupant);
    eventMgr.emit(GameEvent.UNIT_PLACED, bRow, bCol, b.occupant);
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

  private _cellKey(row: number, col: number): string {
    return `${row},${col}`;
  }

  private _boardWidth(): number {
    return this.cols * (this.cellSize + this.gap) - this.gap;
  }

  private _boardHeight(): number {
    return this.rows * (this.cellSize + this.gap) - this.gap;
  }

  private _drawBuildCellMarkers(x: number, y: number): void {
    const inset = Math.max(6, this.cellSize * 0.1);
    const len = Math.max(10, this.cellSize * 0.16);
    this._bgGraphics?.lineStyle(2, 0x7ff0c5, 0.42);
    this._bgGraphics?.beginPath();
    this._bgGraphics?.moveTo(x + inset, y + inset + len);
    this._bgGraphics?.lineTo(x + inset, y + inset);
    this._bgGraphics?.lineTo(x + inset + len, y + inset);
    this._bgGraphics?.moveTo(x + this.cellSize - inset - len, y + this.cellSize - inset);
    this._bgGraphics?.lineTo(x + this.cellSize - inset, y + this.cellSize - inset);
    this._bgGraphics?.lineTo(x + this.cellSize - inset, y + this.cellSize - inset - len);
    this._bgGraphics?.strokePath();
  }

  private _drawPathCellBase(x: number, y: number): void {
    const inset = Math.max(6, this.cellSize * 0.1);
    this._bgGraphics?.fillStyle(0xff695f, 0.12);
    this._bgGraphics?.fillRoundedRect(x + inset, y + inset, this.cellSize - inset * 2, this.cellSize - inset * 2, 5);
  }

  private _drawLockedCell(x: number, y: number): void {
    const centerX = x + this.cellSize / 2;
    const centerY = y + this.cellSize / 2;
    const inset = Math.max(12, this.cellSize * 0.18);
    this._bgGraphics?.fillStyle(0x786b5f, 0.95);
    this._bgGraphics?.fillRoundedRect(x + inset, y + inset, this.cellSize - inset * 2, this.cellSize - inset * 2, 8);
    this._bgGraphics?.lineStyle(3, 0xf2d18a, 0.72);
    this._bgGraphics?.strokeCircle(centerX, centerY - 3, this.cellSize * 0.15);
    this._bgGraphics?.fillStyle(0xd2a24a, 0.9);
    this._bgGraphics?.fillRoundedRect(centerX - 13, centerY, 26, 20, 4);
  }

  private _drawPathArrow(g: Phaser.GameObjects.Graphics, from: { x: number; y: number }, to: { x: number; y: number }): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 8) return;

    const ux = dx / length;
    const uy = dy / length;
    const px = -uy;
    const py = ux;
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const tipX = midX + ux * 11;
    const tipY = midY + uy * 11;
    const baseX = midX - ux * 9;
    const baseY = midY - uy * 9;

    g.fillStyle(0xffe08a, 0.92);
    g.fillTriangle(
      tipX, tipY,
      baseX + px * 7, baseY + py * 7,
      baseX - px * 7, baseY - py * 7,
    );
  }

  private _drawLegend(boardW: number): void {
    const y = this.gridY - 48;
    const x = this.gridX + 10;
    const container = this.scene.add.container(0, 0);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, 0.055);
    bg.fillRoundedRect(x, y, boardW - 20, 34, 8);
    container.add(bg);

    const title = createCjkText(this.scene, x + 18, y + 17, '阵线', {
      fontSize: '17px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    title.setOrigin(0, 0.5);
    container.add(title);

    this._drawLegendItem(container, x + 92, y + 17, 0x123d39, BATTLE_UI.jadeLight, '可布阵');
    this._drawLegendItem(container, x + boardW * 0.39, y + 17, 0x9e3345, BATTLE_UI.goldLight, '妖怪路线');
    this._drawLegendItem(container, x + boardW * 0.71, y + 17, 0x51483f, BATTLE_UI.gold, '山石锁定');

    this._legendContainer = container;
    this.gridContainer.add(container);
  }

  private _drawLegendItem(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    fillColor: number,
    strokeColor: number,
    label: string,
  ): void {
    const icon = this.scene.add.graphics();
    icon.fillStyle(fillColor, 1);
    icon.fillRoundedRect(x, y - 10, 20, 20, 4);
    icon.lineStyle(2, strokeColor, 0.9);
    icon.strokeRoundedRect(x, y - 10, 20, 20, 4);

    const text = createCjkText(this.scene, x + 30, y, label, {
      fontSize: '15px',
      color: '#f7f1d0',
      fontStyle: 'bold',
    });
    text.setOrigin(0, 0.5);
    container.add([icon, text]);
  }
}
