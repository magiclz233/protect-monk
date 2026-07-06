import { LevelData } from '../data/LevelData';
import { GameMode } from '../types';
import { LeaderboardService } from './LeaderboardService';
import { SaveManager } from '../data/SaveManager';

export interface BattleSettlementInput {
  mode: GameMode;
  victory: boolean;
  currentLevel: number;
  monkHp: number;
  totalKills: number;
  waveNumber: number;
}

export interface BattleSettlementResult {
  stars: number;
  spiritEssenceReward: number;
}

export function calculateSpiritEssenceReward(levelId: number, stars: number): number {
  if (stars <= 0) return 0;

  const base = Math.max(1, Math.floor(levelId)) * 2;
  const starBonus = stars >= 3 ? 50 : stars >= 2 ? 20 : 0;
  const bossBonus = levelId % 9 === 0 ? 30 : 0;
  return base + starBonus + bossBonus;
}

export function calculateJourneyStars(victory: boolean, monkHp: number): number {
  if (!victory) return 0;
  return Math.max(1, Math.min(3, monkHp));
}

export function settleBattleResult(input: BattleSettlementInput): BattleSettlementResult {
  if (input.mode === GameMode.JOURNEY) {
    const stars = calculateJourneyStars(input.victory, input.monkHp);
    const spiritEssenceReward = input.victory
      ? calculateSpiritEssenceReward(input.currentLevel, stars)
      : 0;

    if (input.victory) {
      LevelData.getInstance().onLevelCleared(input.currentLevel, stars);

      const manager = SaveManager.getInstance();
      const save = manager.load() ?? manager.createDefault();
      save.spiritEssence += spiritEssenceReward;
      manager.save(save);
    }
    return { stars, spiritEssenceReward };
  }

  LeaderboardService.getInstance().updatePersonalDefenseRecord(input.waveNumber, input.totalKills);

  return { stars: 0, spiritEssenceReward: 0 };
}
