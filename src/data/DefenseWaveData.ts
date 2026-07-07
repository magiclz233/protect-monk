import { WaveConfig } from '../types';

export const DEFENSE_TOTAL_WAVES = 20;
export const MAX_ALIVE_ENEMIES = 30;
const ENDLESS_ELITE_ROTATION = ['elite_huangfeng', 'elite_huli', 'elite_kuangtou', 'elite_dapeng'];
const ENDLESS_BOSS_ROTATION = [
  'boss_heixiongjing',
  'boss_jinjiao',
  'boss_honghaier',
  'boss_baigufuren',
  'boss_qingshi',
  'boss_baixiang',
  'boss_dapengjinchi',
];

export const DEFENSE_WAVES: WaveConfig[] = [
  { startDelay: 3, enemies: [{ enemyId: 'xiaoyao_1', count: 6, interval: 1.1 }] },
  { startDelay: 4, enemies: [{ enemyId: 'xiaoyao_2', count: 7, interval: 1.0 }] },
  { startDelay: 4, enemies: [{ enemyId: 'xiaoyao_1', count: 5, interval: 0.85 }, { enemyId: 'xiaoyao_3', count: 4, interval: 0.85 }] },
  { startDelay: 4, enemies: [{ enemyId: 'xiaoyao_4', count: 8, interval: 0.9 }] },
  { startDelay: 5, enemies: [{ enemyId: 'xiaoyao_2', count: 7, interval: 0.8 }, { enemyId: 'elite_huangfeng', count: 1, interval: 1.0 }] },
  { startDelay: 4, enemies: [{ enemyId: 'xiaoyao_5', count: 9, interval: 0.8 }] },
  { startDelay: 4, enemies: [{ enemyId: 'xiaoyao_6', count: 10, interval: 0.75 }] },
  { startDelay: 4, enemies: [{ enemyId: 'xiaoyao_3', count: 7, interval: 0.7 }, { enemyId: 'xiaoyao_7', count: 4, interval: 0.8 }] },
  { startDelay: 4, enemies: [{ enemyId: 'xiaoyao_8', count: 11, interval: 0.72 }] },
  { startDelay: 6, enemies: [{ enemyId: 'xiaoyao_4', count: 8, interval: 0.7 }, { enemyId: 'boss_heixiongjing', count: 1, interval: 1.0 }] },
  { startDelay: 4, enemies: [{ enemyId: 'xiaoyao_9', count: 10, interval: 0.7 }] },
  { startDelay: 4, enemies: [{ enemyId: 'xiaoyao_10', count: 12, interval: 0.65 }] },
  { startDelay: 4, enemies: [{ enemyId: 'xiaoyao_5', count: 8, interval: 0.62 }, { enemyId: 'xiaoyao_8', count: 6, interval: 0.7 }] },
  { startDelay: 4, enemies: [{ enemyId: 'xiaoyao_7', count: 14, interval: 0.62 }] },
  { startDelay: 5, enemies: [{ enemyId: 'xiaoyao_6', count: 10, interval: 0.6 }, { enemyId: 'elite_huli', count: 1, interval: 1.0 }] },
  { startDelay: 4, enemies: [{ enemyId: 'xiaoyao_1', count: 8, interval: 0.55 }, { enemyId: 'xiaoyao_10', count: 8, interval: 0.65 }] },
  { startDelay: 4, enemies: [{ enemyId: 'xiaoyao_9', count: 16, interval: 0.58 }] },
  { startDelay: 4, enemies: [{ enemyId: 'xiaoyao_3', count: 10, interval: 0.52 }, { enemyId: 'elite_dapeng', count: 1, interval: 1.0 }] },
  { startDelay: 4, enemies: [{ enemyId: 'xiaoyao_8', count: 18, interval: 0.55 }] },
  { startDelay: 6, enemies: [{ enemyId: 'elite_huangfeng', count: 2, interval: 1.2 }, { enemyId: 'boss_jinjiao', count: 1, interval: 1.0 }] },
];

export function createEndlessWave(waveNumber: number): WaveConfig {
  const scale = Math.max(1, waveNumber - DEFENSE_TOTAL_WAVES);
  const eliteId = ENDLESS_ELITE_ROTATION[(scale - 1) % ENDLESS_ELITE_ROTATION.length];
  const bossWaveIndex = Math.max(0, Math.floor((waveNumber - DEFENSE_TOTAL_WAVES) / 10) - 1);
  const bossId = ENDLESS_BOSS_ROTATION[bossWaveIndex % ENDLESS_BOSS_ROTATION.length];

  return {
    startDelay: 5,
    enemies: [
      { enemyId: 'xiaoyao_10', count: Math.min(24, 14 + scale), interval: Math.max(0.42, 0.58 - scale * 0.01) },
      { enemyId: eliteId, count: Math.min(5, 1 + Math.floor(scale / 4)), interval: 1.1 },
      ...(waveNumber % 10 === 0 ? [{ enemyId: bossId, count: 1, interval: 1.0 }] : []),
    ],
  };
}
