import { LevelData } from '../data/LevelData';
import { HeroData } from '../data/HeroData';
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
  /** 守护无尽模式碎片宝箱奖励（每个条目一个宝箱，count 为该宝箱碎片数） */
  shardRewards: Array<{ heroId: string; count: number }>;
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
    return { stars, spiritEssenceReward, shardRewards: [] };
  }

  LeaderboardService.getInstance().updatePersonalDefenseRecord(input.waveNumber, input.totalKills);

  const shardRewards = awardDefenseEndlessBoxes(input.waveNumber);
  return { stars: 0, spiritEssenceReward: 0, shardRewards };
}

/**
 * 守护模式无尽碎片宝箱：30 波起每 10 波一个宝箱，每个宝箱发放 3 枚随机已解锁英雄碎片
 */
export function awardDefenseEndlessBoxes(waveNumber: number): Array<{ heroId: string; count: number }> {
  const boxes = waveNumber >= 30 ? Math.floor((waveNumber - 20) / 10) : 0;
  if (boxes <= 0) return [];

  const heroData = HeroData.getInstance();
  heroData.loadFromSave();
  heroData.ensureDefaults();

  const rewards: Array<{ heroId: string; count: number }> = [];
  for (let i = 0; i < boxes; i++) {
    const heroId = heroData.addRandomShard(); // +1
    heroData.addShards(heroId, 2); // 合计每个宝箱 3 枚
    const existing = rewards.find(r => r.heroId === heroId);
    if (existing) existing.count += 3;
    else rewards.push({ heroId, count: 3 });
  }
  return rewards;
}
