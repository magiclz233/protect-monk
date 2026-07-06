import { getBoardTemplateForLevel, getLockedCellsForTemplate } from './DefenseBoardData';
import { LevelConfig, WaveConfig } from '../types';

const CHAPTER_ENEMY_SCALE = [1.0, 1.15, 1.35, 1.6, 1.9, 2.25, 2.65, 3.1, 3.6];

function scaledEnemy(enemyId: string, count: number, interval: number, scale: number): WaveConfig['enemies'][number] {
  return {
    enemyId,
    count,
    interval,
    hpMultiplier: scale,
    attackMultiplier: 1 + (scale - 1) * 0.35,
  };
}

function makeWaves(level: number): WaveConfig[] {
  const chapter = Math.ceil(level / 9);
  const countBase = 4 + Math.min(Math.ceil(level / 5), 8);
  const levelScale = CHAPTER_ENEMY_SCALE[chapter - 1] ?? 1;
  const normalId = chapter <= 3 ? 'xiaoyao_1' : chapter <= 6 ? 'xiaoyao_5' : 'xiaoyao_8';
  const altId = chapter <= 3 ? 'xiaoyao_2' : chapter <= 6 ? 'xiaoyao_7' : 'xiaoyao_10';
  const eliteId = chapter % 2 === 0 ? 'elite_huli' : 'elite_huangfeng';
  const bossId = chapter >= 7 ? 'boss_jinjiao' : chapter >= 4 ? 'boss_honghaier' : 'boss_heixiongjing';
  const waves: WaveConfig[] = [
    { startDelay: 2, enemies: [scaledEnemy(normalId, countBase, 0.85, levelScale)] },
    { startDelay: 3, enemies: [scaledEnemy(normalId, countBase + 2, 0.78, levelScale), scaledEnemy(altId, Math.ceil(level / 9), 0.9, levelScale)] },
  ];

  if (level % 3 === 0) {
    waves.push({ startDelay: 4, enemies: [scaledEnemy(altId, countBase + 3, 0.7, levelScale), scaledEnemy(eliteId, 1, 1, levelScale)] });
  }

  if (level % 9 === 0) {
    waves.push({ startDelay: 5, enemies: [scaledEnemy(eliteId, 1 + Math.floor(chapter / 3), 1.1, levelScale), scaledEnemy(bossId, 1, 1, levelScale)] });
  }

  return waves;
}

function makeLevel(levelId: number): LevelConfig {
  const chapter = Math.ceil(levelId / 9);
  const template = getBoardTemplateForLevel(levelId);
  return {
    levelId,
    chapter,
    name: `第${levelId}难`,
    monsterPath: template.path,
    lockedCells: getLockedCellsForTemplate(template),
    boardTemplateId: template.id,
    waves: makeWaves(levelId),
  };
}

export const JOURNEY_LEVELS: LevelConfig[] = Array.from({ length: 81 }, (_, index) => makeLevel(index + 1));

export function getJourneyLevel(levelId: number): LevelConfig | undefined {
  return JOURNEY_LEVELS.find(level => level.levelId === levelId);
}
