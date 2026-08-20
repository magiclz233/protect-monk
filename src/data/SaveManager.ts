/**
 * 本地存档管理器 - MVP纯单机，后续接入微信云开发
 */
import { createDefaultArtifactSaveData, normalizeArtifactSaveData } from '../config/ArtifactConfig';
import { getHeroConfig } from '../config/HeroConfig';
import { DefenseRecord, SaveData } from '../types';
import { platformStorage } from '../platform/PlatformStorage';

const SAVE_KEY = 'guard_monk_save';
const SAVE_VERSION = 3;
const MAX_JOURNEY_LEVEL = 81;
const MAX_CHAPTER = 9;
const DEFAULT_DEFENSE_RECORD: DefenseRecord = { bestWave: 0, bestKills: 0, achievedAt: 0 };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeInteger(value: unknown, fallback: number, min: number, max: number = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function normalizeIntegerArray(value: unknown, min: number, max: number): number[] {
  if (!Array.isArray(value)) return [];
  const normalized = value.filter((entry): entry is number => (
    typeof entry === 'number'
    && Number.isFinite(entry)
    && Number.isInteger(entry)
    && entry >= min
    && entry <= max
  ));
  return Array.from(new Set(normalized)).sort((a, b) => a - b);
}

function normalizeLevelStars(value: unknown): Record<number, number> {
  if (!isRecord(value)) return {};
  const normalized: Record<number, number> = {};
  for (const [rawLevel, rawStars] of Object.entries(value)) {
    const level = Number(rawLevel);
    if (!Number.isSafeInteger(level) || level < 1 || level > MAX_JOURNEY_LEVEL) continue;
    if (typeof rawStars !== 'number' || !Number.isFinite(rawStars)) continue;
    normalized[level] = Math.max(0, Math.min(3, Math.floor(rawStars)));
  }
  return normalized;
}

function normalizeLoopLevelStars(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const normalized: Record<string, number> = {};
  for (const [rawKey, rawStars] of Object.entries(value)) {
    const match = /^(\d+):(\d+)$/.exec(rawKey);
    if (!match || typeof rawStars !== 'number' || !Number.isFinite(rawStars)) continue;
    const loop = Number(match[1]);
    const level = Number(match[2]);
    if (!Number.isSafeInteger(loop) || loop < 1) continue;
    if (!Number.isSafeInteger(level) || level < 1 || level > MAX_JOURNEY_LEVEL) continue;
    normalized[`${loop}:${level}`] = Math.max(0, Math.min(3, Math.floor(rawStars)));
  }
  return normalized;
}

function normalizeHeroStars(value: unknown): SaveData['heroStars'] {
  if (!isRecord(value)) return {};
  const normalized: SaveData['heroStars'] = {};
  for (const [heroId, rawHero] of Object.entries(value)) {
    if (!getHeroConfig(heroId) || !isRecord(rawHero)) continue;
    normalized[heroId] = {
      heroId,
      starLevel: normalizeInteger(rawHero.starLevel, 1, 1, 5),
      shardCount: normalizeInteger(rawHero.shardCount, 0, 0),
      unlocked: rawHero.unlocked === true,
    };
  }
  return normalized;
}

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
      const data: unknown = JSON.parse(raw);
      if (!isRecord(data)) return null;
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
      journeyProgress: {
        currentLevel: 1,
        currentLoop: 1,
        highestClearedLoop: 0,
        levelStars: {},
        loopLevelStars: {},
        clearedLevels: [],
        revealedChapterRewards: [],
      },
      heroStars: {},
      defenseRecord: { ...DEFAULT_DEFENSE_RECORD },
      defenseHighScore: 0,
      defenseBestWave: 0,
    };
  }

  private migrate(data: unknown): SaveData {
    const migrated = this.normalize(data);
    migrated.version = SAVE_VERSION;
    this.save(migrated);
    return migrated;
  }

  private normalize(value: unknown): SaveData {
    const defaults = this.createDefault();
    const data = isRecord(value) ? value : {};
    const journeyProgress = isRecord(data.journeyProgress) ? data.journeyProgress : {};
    const rawDefenseRecord = isRecord(data.defenseRecord) ? data.defenseRecord : {};
    const oldBestWave = normalizeInteger(data.defenseBestWave, 0, 0);
    const oldBestKills = normalizeInteger(data.defenseHighScore, 0, 0);
    const bestWave = normalizeInteger(rawDefenseRecord.bestWave, oldBestWave, 0);
    const bestKills = normalizeInteger(rawDefenseRecord.bestKills, oldBestKills, 0);
    const lastPlayTime = normalizeInteger(data.lastPlayTime, defaults.lastPlayTime, 0);

    return {
      version: SAVE_VERSION,
      lastPlayTime,
      spiritEssence: normalizeInteger(data.spiritEssence, defaults.spiritEssence, 0),
      artifacts: normalizeArtifactSaveData(data.artifacts),
      journeyProgress: {
        currentLevel: normalizeInteger(journeyProgress.currentLevel, defaults.journeyProgress.currentLevel, 1, MAX_JOURNEY_LEVEL),
        currentLoop: normalizeInteger(journeyProgress.currentLoop, defaults.journeyProgress.currentLoop, 1),
        highestClearedLoop: normalizeInteger(journeyProgress.highestClearedLoop, defaults.journeyProgress.highestClearedLoop, 0),
        levelStars: normalizeLevelStars(journeyProgress.levelStars),
        loopLevelStars: normalizeLoopLevelStars(journeyProgress.loopLevelStars),
        clearedLevels: normalizeIntegerArray(journeyProgress.clearedLevels, 1, MAX_JOURNEY_LEVEL),
        revealedChapterRewards: normalizeIntegerArray(journeyProgress.revealedChapterRewards, 1, MAX_CHAPTER),
      },
      heroStars: normalizeHeroStars(data.heroStars),
      defenseRecord: {
        bestWave,
        bestKills,
        achievedAt: normalizeInteger(rawDefenseRecord.achievedAt, lastPlayTime, 0),
      },
      defenseHighScore: Math.max(oldBestKills, bestKills),
      defenseBestWave: Math.max(oldBestWave, bestWave),
    };
  }
}
