/**
 * 本地存档管理器 - MVP纯单机，后续接入微信云开发
 */
import { createDefaultArtifactSaveData, normalizeArtifactSaveData } from '../config/ArtifactConfig';
import { DefenseRecord, SaveData } from '../types';
import { platformStorage } from '../platform/PlatformStorage';

const SAVE_KEY = 'guard_monk_save';
const SAVE_VERSION = 2;
const DEFAULT_DEFENSE_RECORD: DefenseRecord = { bestWave: 0, bestKills: 0, achievedAt: 0 };

export class SaveManager {
  private static _instance: SaveManager;
  static getInstance(): SaveManager {
    if (!this._instance) this._instance = new SaveManager();
    return this._instance;
  }

  load(): SaveData | null {
    const raw = platformStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      const data: SaveData = JSON.parse(raw);
      if (data.version !== SAVE_VERSION) return this.migrate(data);
      return this.normalize(data);
    } catch {
      return null;
    }
  }

  save(data: SaveData): void {
    const normalized = this.normalize(data);
    normalized.version = SAVE_VERSION;
    normalized.lastPlayTime = Date.now();
    platformStorage.setItem(SAVE_KEY, JSON.stringify(normalized));
  }

  createDefault(): SaveData {
    return {
      version: SAVE_VERSION,
      lastPlayTime: Date.now(),
      spiritEssence: 0,
      artifacts: createDefaultArtifactSaveData(),
      journeyProgress: { currentLevel: 1, levelStars: {}, clearedLevels: [] },
      heroStars: {},
      defenseRecord: { ...DEFAULT_DEFENSE_RECORD },
      defenseHighScore: 0,
      defenseBestWave: 0,
    };
  }

  private migrate(data: SaveData): SaveData {
    const migrated = this.normalize(data);
    migrated.version = SAVE_VERSION;
    this.save(migrated);
    return migrated;
  }

  private normalize(data: Partial<SaveData>): SaveData {
    const defaults = this.createDefault();
    const oldBestWave = typeof data.defenseBestWave === 'number' ? data.defenseBestWave : 0;
    const oldBestKills = typeof data.defenseHighScore === 'number' ? data.defenseHighScore : 0;
    const defenseRecord = data.defenseRecord ?? {
      bestWave: oldBestWave,
      bestKills: oldBestKills,
      achievedAt: data.lastPlayTime ?? 0,
    };

    return {
      ...defaults,
      ...data,
      version: SAVE_VERSION,
      spiritEssence: Math.max(0, Math.floor(data.spiritEssence ?? defaults.spiritEssence)),
      artifacts: normalizeArtifactSaveData(data.artifacts),
      journeyProgress: data.journeyProgress ?? defaults.journeyProgress,
      heroStars: data.heroStars ?? defaults.heroStars,
      defenseRecord: {
        bestWave: Math.max(0, Math.floor(defenseRecord.bestWave ?? 0)),
        bestKills: Math.max(0, Math.floor(defenseRecord.bestKills ?? 0)),
        achievedAt: Math.max(0, Math.floor(defenseRecord.achievedAt ?? 0)),
      },
      defenseHighScore: Math.max(oldBestKills, data.defenseRecord?.bestKills ?? 0),
      defenseBestWave: Math.max(oldBestWave, data.defenseRecord?.bestWave ?? 0),
    };
  }
}
