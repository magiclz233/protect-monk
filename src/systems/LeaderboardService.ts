import { getDefenseRankByWave } from '../config/DefenseRankConfig';
import { DefenseRecord } from '../types';
import { SaveManager } from '../data/SaveManager';

export interface DefenseLeaderboardEntry extends DefenseRecord {
  playerId: string;
  displayName: string;
}

export function compareDefenseRecords(a: DefenseRecord, b: DefenseRecord): number {
  if (a.bestWave !== b.bestWave) return b.bestWave - a.bestWave;
  if (a.bestKills !== b.bestKills) return b.bestKills - a.bestKills;

  const aTime = a.achievedAt || Number.MAX_SAFE_INTEGER;
  const bTime = b.achievedAt || Number.MAX_SAFE_INTEGER;
  return aTime - bTime;
}

export function isBetterDefenseRecord(candidate: DefenseRecord, current: DefenseRecord): boolean {
  return compareDefenseRecords(candidate, current) < 0;
}

export class LeaderboardService {
  private static _instance: LeaderboardService;
  static getInstance(): LeaderboardService {
    if (!this._instance) this._instance = new LeaderboardService();
    return this._instance;
  }

  getPersonalRecord(): DefenseRecord {
    const save = SaveManager.getInstance().load() ?? SaveManager.getInstance().createDefault();
    return save.defenseRecord;
  }

  updatePersonalDefenseRecord(wave: number, kills: number, achievedAt: number = Date.now()): DefenseRecord {
    const manager = SaveManager.getInstance();
    const save = manager.load() ?? manager.createDefault();
    const candidate: DefenseRecord = {
      bestWave: Math.max(0, Math.floor(wave)),
      bestKills: Math.max(0, Math.floor(kills)),
      achievedAt,
    };

    if (isBetterDefenseRecord(candidate, save.defenseRecord)) {
      save.defenseRecord = candidate;
      save.defenseBestWave = candidate.bestWave;
      save.defenseHighScore = candidate.bestKills;
      manager.save(save);
      return candidate;
    }

    return save.defenseRecord;
  }

  getPersonalRankName(): string {
    return getDefenseRankByWave(this.getPersonalRecord().bestWave).name;
  }

  sortEntries(entries: DefenseLeaderboardEntry[]): DefenseLeaderboardEntry[] {
    return entries.slice().sort(compareDefenseRecords);
  }
}
