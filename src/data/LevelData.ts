/**
 * 关卡进度管理（八十一难模式）
 */
import { SaveManager } from './SaveManager';
import { HeroData } from './HeroData';
import { ArtifactData } from './ArtifactData';

export class LevelData {
  private static _instance: LevelData;
  static getInstance(): LevelData {
    if (!this._instance) this._instance = new LevelData();
    return this._instance;
  }

  currentLevel: number = 1;
  levelStars: Map<number, number> = new Map();
  clearedLevels: Set<number> = new Set();

  loadFromSave(): void {
    const save = SaveManager.getInstance().load();
    if (save?.journeyProgress) {
      this.currentLevel = save.journeyProgress.currentLevel;
      this.levelStars = new Map(Object.entries(save.journeyProgress.levelStars).map(([k, v]) => [Number(k), v]));
      this.clearedLevels = new Set(save.journeyProgress.clearedLevels);
    }
  }

  saveToDisk(): void {
    const save = SaveManager.getInstance().load() || SaveManager.getInstance().createDefault();
    save.journeyProgress = {
      currentLevel: this.currentLevel,
      levelStars: Object.fromEntries(this.levelStars),
      clearedLevels: Array.from(this.clearedLevels),
    };
    SaveManager.getInstance().save(save);
  }

  isUnlocked(levelId: number): boolean { return levelId <= this.currentLevel; }
  isCleared(levelId: number): boolean { return this.clearedLevels.has(levelId); }
  getStars(levelId: number): number { return this.levelStars.get(levelId) || 0; }
  canSweep(levelId: number): boolean { return this.getStars(levelId) >= 3; }

  onLevelCleared(levelId: number, stars: number): void {
    const cur = this.levelStars.get(levelId) || 0;
    this.levelStars.set(levelId, Math.max(cur, stars));
    this.clearedLevels.add(levelId);
    if (levelId >= this.currentLevel) this.currentLevel = levelId + 1;
    const chapter = Math.ceil(levelId / 9);
    if (this._isChapterCleared(chapter)) {
      HeroData.getInstance().awardChapterClear(chapter);
      ArtifactData.getInstance().awardChapterClear(chapter);
    }
    this.saveToDisk();
  }

  private _isChapterCleared(chapter: number): boolean {
    const start = (chapter - 1) * 9 + 1;
    const end = chapter * 9;
    for (let levelId = start; levelId <= end; levelId++) {
      if (!this.clearedLevels.has(levelId)) return false;
    }
    return true;
  }
}
