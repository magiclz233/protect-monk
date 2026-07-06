import { BoardTemplate, Waypoint } from '../types';

function wp(row: number, col: number): Waypoint {
  return { row, col };
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: 'chapter_1_gate',
    chapter: 1,
    rows: 6,
    cols: 8,
    initialOpenCount: 6,
    path: [wp(0, 0), wp(0, 1), wp(0, 2), wp(0, 3), wp(1, 3), wp(2, 3), wp(2, 2), wp(3, 2), wp(4, 2), wp(5, 2), wp(5, 3), wp(5, 4), wp(5, 5)],
    monkEndCell: wp(5, 5),
  },
  {
    id: 'chapter_2_river',
    chapter: 2,
    rows: 6,
    cols: 8,
    initialOpenCount: 5,
    path: [wp(0, 7), wp(0, 6), wp(0, 5), wp(0, 4), wp(1, 4), wp(1, 5), wp(2, 5), wp(2, 6), wp(3, 6), wp(4, 6), wp(4, 5), wp(4, 4), wp(4, 3), wp(4, 2), wp(5, 2)],
    monkEndCell: wp(5, 2),
  },
  {
    id: 'chapter_3_forest',
    chapter: 3,
    rows: 7,
    cols: 7,
    initialOpenCount: 5,
    path: [wp(0, 0), wp(0, 1), wp(1, 1), wp(2, 1), wp(2, 2), wp(2, 3), wp(1, 3), wp(1, 4), wp(2, 4), wp(3, 4), wp(4, 4), wp(4, 3), wp(5, 3), wp(6, 3)],
    monkEndCell: wp(6, 3),
  },
  {
    id: 'chapter_4_cliff',
    chapter: 4,
    rows: 7,
    cols: 8,
    initialOpenCount: 5,
    path: [wp(0, 7), wp(0, 6), wp(0, 5), wp(0, 4), wp(1, 4), wp(2, 4), wp(2, 3), wp(3, 3), wp(4, 3), wp(4, 2), wp(5, 2), wp(6, 2), wp(6, 3), wp(6, 4), wp(6, 5)],
    monkEndCell: wp(6, 5),
  },
  {
    id: 'chapter_5_stone',
    chapter: 5,
    rows: 8,
    cols: 8,
    initialOpenCount: 5,
    path: [wp(0, 0), wp(0, 1), wp(0, 2), wp(0, 3), wp(1, 3), wp(2, 3), wp(2, 2), wp(2, 1), wp(3, 1), wp(4, 1), wp(4, 2), wp(4, 3), wp(3, 3), wp(3, 4), wp(4, 4), wp(5, 4), wp(6, 4), wp(6, 5), wp(7, 5)],
    monkEndCell: wp(7, 5),
  },
  {
    id: 'chapter_6_marsh',
    chapter: 6,
    rows: 7,
    cols: 9,
    initialOpenCount: 5,
    path: [wp(0, 8), wp(0, 7), wp(0, 6), wp(0, 5), wp(0, 4), wp(1, 4), wp(2, 4), wp(3, 4), wp(3, 3), wp(4, 3), wp(4, 4), wp(4, 5), wp(4, 6), wp(5, 6), wp(5, 5), wp(5, 4), wp(5, 3), wp(6, 3)],
    monkEndCell: wp(6, 3),
  },
  {
    id: 'chapter_7_sand',
    chapter: 7,
    rows: 8,
    cols: 9,
    initialOpenCount: 5,
    path: [wp(0, 0), wp(0, 1), wp(0, 2), wp(0, 3), wp(1, 3), wp(1, 4), wp(1, 5), wp(1, 6), wp(2, 6), wp(3, 6), wp(4, 6), wp(5, 6), wp(5, 5), wp(5, 4), wp(6, 4), wp(6, 3), wp(7, 3)],
    monkEndCell: wp(7, 3),
  },
  {
    id: 'chapter_8_cloud',
    chapter: 8,
    rows: 8,
    cols: 8,
    initialOpenCount: 5,
    path: [wp(0, 7), wp(0, 6), wp(0, 5), wp(0, 4), wp(1, 4), wp(1, 5), wp(2, 5), wp(2, 6), wp(3, 6), wp(4, 6), wp(4, 5), wp(4, 4), wp(3, 4), wp(3, 3), wp(4, 3), wp(5, 3), wp(6, 3), wp(7, 3)],
    monkEndCell: wp(7, 3),
  },
  {
    id: 'chapter_9_final',
    chapter: 9,
    rows: 8,
    cols: 9,
    initialOpenCount: 5,
    path: [wp(0, 0), wp(0, 1), wp(0, 2), wp(0, 3), wp(0, 4), wp(1, 4), wp(2, 4), wp(3, 4), wp(3, 3), wp(3, 2), wp(4, 2), wp(5, 2), wp(5, 3), wp(5, 4), wp(5, 5), wp(6, 5), wp(7, 5)],
    monkEndCell: wp(7, 5),
  },
];

export function getBoardTemplateForChapter(chapter: number): BoardTemplate {
  return BOARD_TEMPLATES[Math.max(0, Math.min(BOARD_TEMPLATES.length - 1, chapter - 1))];
}

export function getBoardTemplateForLevel(levelId: number): BoardTemplate {
  return getBoardTemplateForChapter(Math.ceil(levelId / 9));
}

export function getInitialOpenCells(template: BoardTemplate): Waypoint[] {
  const pathKeys = new Set(template.path.map(cellKey));
  const earlyPath = template.path.slice(0, 4);
  const start = template.path[0];
  const centerRow = (template.rows - 1) / 2;
  const centerCol = (template.cols - 1) / 2;
  const candidates: Array<Waypoint & { score: number }> = [];

  for (let row = 0; row < template.rows; row++) {
    for (let col = 0; col < template.cols; col++) {
      const cell = wp(row, col);
      if (pathKeys.has(cellKey(cell))) continue;

      const minEarlyDistance = Math.min(...earlyPath.map(pathCell => manhattan(cell, pathCell)));
      const touchesPath = template.path.some(pathCell => manhattan(cell, pathCell) === 1) ? 0 : 3;
      const startDistance = manhattan(cell, start);
      const centerDistance = Math.abs(row - centerRow) + Math.abs(col - centerCol);
      candidates.push({
        ...cell,
        score: minEarlyDistance * 100 + touchesPath * 50 + startDistance * 10 + centerDistance,
      });
    }
  }

  return candidates
    .sort((a, b) => a.score - b.score || a.row - b.row || a.col - b.col)
    .slice(0, template.initialOpenCount)
    .map(({ row, col }) => ({ row, col }));
}

export function getLockedCellsForTemplate(template: BoardTemplate): Array<[number, number]> {
  const pathKeys = new Set(template.path.map(cellKey));
  const openKeys = new Set(getInitialOpenCells(template).map(cellKey));
  const locked: Array<[number, number]> = [];

  for (let row = 0; row < template.rows; row++) {
    for (let col = 0; col < template.cols; col++) {
      const key = `${row},${col}`;
      if (!pathKeys.has(key) && !openKeys.has(key)) {
        locked.push([row, col]);
      }
    }
  }

  return locked;
}

export function isContinuousPath(path: Waypoint[]): boolean {
  return path.every((cell, index) => index === 0 || manhattan(cell, path[index - 1]) === 1);
}

function cellKey(cell: Waypoint): string {
  return `${cell.row},${cell.col}`;
}

function manhattan(a: Waypoint, b: Waypoint): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

export const DEFENSE_DEFAULT_TEMPLATE = BOARD_TEMPLATES[0];
export const DEFENSE_DEFAULT_PATH = DEFENSE_DEFAULT_TEMPLATE.path;
export const DEFENSE_DEFAULT_LOCKED_CELLS = getLockedCellsForTemplate(DEFENSE_DEFAULT_TEMPLATE);
