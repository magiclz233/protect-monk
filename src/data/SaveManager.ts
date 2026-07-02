/**
 * 本地存档管理器 - MVP纯单机，后续接入微信云开发
 */
import { SaveData } from '../types';

const SAVE_KEY = 'guard_monk_save';
const SAVE_VERSION = 1;

export class SaveManager {
  private static _instance: SaveManager;
  static getInstance(): SaveManager {
    if (!this._instance) this._instance = new SaveManager();
    return this._instance;
  }

  load(): SaveData | null {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      const data: SaveData = JSON.parse(raw);
      if (data.version !== SAVE_VERSION) return this.migrate(data);
      return data;
    } catch {
      return null;
    }
  }

  save(data: SaveData): void {
    data.version = SAVE_VERSION;
    data.lastPlayTime = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  createDefault(): SaveData {
    return {
      version: SAVE_VERSION,
      lastPlayTime: Date.now(),
      journeyProgress: { currentLevel: 1, levelStars: {}, clearedLevels: [] },
      heroStars: {},
      defenseHighScore: 0,
      defenseBestWave: 0,
    };
  }

  private migrate(data: SaveData): SaveData {
    return data; // 等未来版本迁移逻辑
  }
}
