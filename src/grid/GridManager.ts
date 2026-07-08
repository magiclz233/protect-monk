import Phaser from 'phaser';
import { BoardTemplate, CellData, CellState, Waypoint } from '../types';
import { eventMgr, GameEvent } from '../core/EventManager';
import { createCjkText } from '../core/TextStyles';
import { DEFENSE_DEFAULT_TEMPLATE } from '../data/DefenseBoardData';
import { drawBattlePanel } from '../ui/BattleUiPrimitives';
import { ChapterBoardColors, DEFAULT_BOARD_COLORS, getChapterConfig } from '../config/ChapterConfig';

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
  private _lockImages: Phaser.GameObjects.Image[] = [];
  private _monkCell: Waypoint = DEFENSE_DEFAULT_TEMPLATE.monkEndCell;

  private _pathPoints: { x: number; y: number }[] = [];
  private _pathCells: Set<string> = new Set();

  /** 当前章节 ID（undefined = 默认配色） */
  private _chapterId: number | undefined;
  /** 当前使用的棋盘配色 */
  private _boardColors: ChapterBoardColors = DEFAULT_BOARD_COLORS;

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

  init(templateOrCellSize: BoardTemplate | number = DEFENSE_DEFAULT_TEMPLATE, chapterId?: number): void {
    const template = typeof templateOrCellSize === 'number' ? DEFENSE_DEFAULT_TEMPLATE : templateOrCellSize;
    const requestedCellSize = typeof templateOrCellSize === 'number' ? templateOrCellSize : 80;

    this.rows = template.rows;
    this.cols = template.cols;
    this._monkCell = template.monkEndCell;
    this._chapterId = chapterId;
    this._boardColors = chapterId
      ? (getChapterConfig(chapterId)?.boardColors ?? DEFAULT_BOARD_COLORS)
      : DEFAULT_BOARD_COLORS;

    this.cellSize = this._fitCellSize(requestedCellSize, this.cols);
    this.gridX = (DESIGN_W - this._boardWidth()) / 2;
    this._initCells();
    this.setPath(template.path);
  }

  /** 获取当前章节 ID（供外部查询） */
  get chapterId(): number | undefined {
    return this._chapterId;
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
    // 清理旧的锁定格图片
    for (const img of this._lockImages) {
      img.destroy();
    }
    this._lockImages = [];
    this._bgGraphics = this.scene.add.graphics();

    const colors = this._boardColors;
    const boardW = this._boardWidth();
    const boardH = this._boardHeight();

    drawBattlePanel(this._bgGraphics, this.gridX - 16, this.gridY - 64, boardW + 32, boardH + 84, {
      fill: 0x1a1814,
      fillAlpha: 0.98,
      stroke: colors.panelStroke,
      strokeAlpha: 0.42,
      radius: 12,
      shadow: true,
    });
    this._bgGraphics.fillStyle(0x0f0e0b, 0.5);
    this._bgGraphics.fillRoundedRect(this.gridX - 6, this.gridY - 6, boardW + 12, boardH + 12, 8);

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const pos = this._cellToWorld(row, col);
        const cell = this._cells[row][col];
        const isPath = this.isPathCell(row, col);
        const isLocked = cell.state === CellState.LOCKED;
        const isBuildable = !isPath && !isLocked;

        const color = isLocked ? colors.lockedFill : isPath ? colors.pathFill : colors.buildableFill;
        const borderColor = isLocked ? colors.lockedBorder : isPath ? colors.pathBorder : colors.buildableBorder;
        const borderAlpha = isLocked ? 0.65 : isPath ? 0.5 : 0.55;
        this._bgGraphics.fillStyle(color, isLocked ? 0.98 : 0.9);
        this._bgGraphics.lineStyle(1.5, borderColor, borderAlpha);
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
    // 将所有锁定格图片添加到容器
    for (const img of this._lockImages) {
      this.gridContainer.add(img);
    }
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

    const colors = this._boardColors;
    const g = this.scene.add.graphics();

    // 路径宽线（外层）
    g.lineStyle(Math.max(22, this.cellSize * 0.38), colors.pathWideLine, 0.84);
    g.beginPath();
    g.moveTo(this._pathPoints[0].x, this._pathPoints[0].y);
    for (let i = 1; i < this._pathPoints.length; i++) {
      g.lineTo(this._pathPoints[i].x, this._pathPoints[i].y);
    }
    g.strokePath();

    // 路径中线
    g.lineStyle(Math.max(15, this.cellSize * 0.27), colors.pathMidLine, 0.76);
    g.beginPath();
    g.moveTo(this._pathPoints[0].x, this._pathPoints[0].y);
    for (let i = 1; i < this._pathPoints.length; i++) {
      g.lineTo(this._pathPoints[i].x, this._pathPoints[i].y);
    }
    g.strokePath();

    // 路径金线（统一鎏金不变）
    g.lineStyle(4, 0xf0c15a, 0.88);
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
      stroke: '#6b1a1a',
      strokeThickness: 4,
    });
    startText.setOrigin(0.5);
    const endText = createCjkText(this.scene, end.x, end.y, '终', {
      fontSize: '20px',
      color: '#fff2b8',
      fontStyle: 'bold',
      stroke: '#6b1a1a',
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
    this._bgGraphics?.lineStyle(2, 0xc9a44a, 0.4);
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
    this._bgGraphics?.fillStyle(this._boardColors.pathWideLine, 0.15);
    this._bgGraphics?.fillRoundedRect(x + inset, y + inset, this.cellSize - inset * 2, this.cellSize - inset * 2, 5);
  }

  private _drawLockedCell(x: number, y: number): void {
    const inset = Math.max(6, this.cellSize * 0.08);

    // 优先使用章节专属障碍物图片
    if (this._chapterId) {
      const config = getChapterConfig(this._chapterId);
      if (config && this.scene.textures.exists(config.lockedCellImage)) {
        const img = this.scene.add.image(
          x + this.cellSize / 2,
          y + this.cellSize / 2,
          config.lockedCellImage,
        );
        img.setDisplaySize(this.cellSize - inset * 2, this.cellSize - inset * 2);
        this._lockImages.push(img);
        return;
      }
    }

    // 回退：使用通用符印封石图片
    if (this.scene.textures.exists('五行山-符印封石')) {
      const img = this.scene.add.image(
        x + this.cellSize / 2,
        y + this.cellSize / 2,
        '五行山-符印封石',
      );
      img.setDisplaySize(this.cellSize - inset * 2, this.cellSize - inset * 2);
      this._lockImages.push(img);
      return;
    }

    // 最终回退：代码绘制锁定标记
    this._drawGenericLockIcon(x, y, inset);
  }

  /** 代码绘制通用锁图标（无素材时回退） */
  private _drawGenericLockIcon(x: number, y: number, inset: number): void {
    const cx = x + this.cellSize / 2;
    const cy = y + this.cellSize / 2;
    const size = (this.cellSize - inset * 2) * 0.35;
    const g = this._bgGraphics!;

    // 锁体
    g.fillStyle(0x8b7355, 0.8);
    g.fillRoundedRect(cx - size * 0.55, cy - size * 0.15, size * 1.1, size * 0.9, 3);
    // 锁环
    g.lineStyle(3, 0x8b7355, 0.8);
    g.beginPath();
    g.arc(cx, cy - size * 0.3, size * 0.45, -2.8, -0.3, false);
    g.strokePath();
    // 锁孔
    g.fillStyle(0x3a2a14, 0.9);
    g.fillCircle(cx, cy + size * 0.2, size * 0.15);
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

    g.fillStyle(0xf0c15a, 0.92);
    g.fillTriangle(
      tipX, tipY,
      baseX + px * 7, baseY + py * 7,
      baseX - px * 7, baseY - py * 7,
    );
  }

  private _drawLegend(boardW: number): void {
    const colors = this._boardColors;
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

    this._drawLegendItem(container, x + 92, y + 17, colors.buildableFill, 0xc9a44a, '可布阵');
    this._drawLegendItem(container, x + boardW * 0.39, y + 17, colors.pathMidLine, 0xf0c15a, '妖怪路线');
    this._drawLegendItem(container, x + boardW * 0.71, y + 17, colors.lockedFill, colors.lockedBorder, '山石锁定');

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
