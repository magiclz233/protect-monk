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
  currentLoop: number = 1;
  highestClearedLoop: number = 0;
  levelStars: Map<number, number> = new Map();
  loopLevelStars: Map<string, number> = new Map();
  clearedLevels: Set<number> = new Set();
  revealedChapterRewards: Set<number> = new Set();

  loadFromSave(): void {
    const save = SaveManager.getInstance().load();
    if (save?.journeyProgress) {
      this.currentLevel = save.journeyProgress.currentLevel;
      this.currentLoop = save.journeyProgress.currentLoop;
      this.highestClearedLoop = save.journeyProgress.highestClearedLoop;
      this.levelStars = new Map(Object.entries(save.journeyProgress.levelStars).map(([k, v]) => [Number(k), v]));
      this.loopLevelStars = new Map(Object.entries(save.journeyProgress.loopLevelStars ?? {}));
      this.clearedLevels = new Set(save.journeyProgress.clearedLevels);
      this.revealedChapterRewards = new Set(save.journeyProgress.revealedChapterRewards ?? []);
    }
  }

  saveToDisk(): void {
    const save = SaveManager.getInstance().load() || SaveManager.getInstance().createDefault();
    save.journeyProgress = {
      currentLevel: this.currentLevel,
      currentLoop: this.currentLoop,
      highestClearedLoop: this.highestClearedLoop,
      levelStars: Object.fromEntries(this.levelStars),
      loopLevelStars: Object.fromEntries(this.loopLevelStars),
      clearedLevels: Array.from(this.clearedLevels),
      revealedChapterRewards: Array.from(this.revealedChapterRewards),
    };
    SaveManager.getInstance().save(save);
  }

  isUnlocked(levelId: number): boolean { return levelId <= this.currentLevel; }
  isCleared(levelId: number): boolean { return this.clearedLevels.has(levelId); }
  getStars(levelId: number): number { return this.levelStars.get(levelId) || 0; }
  getLoopStars(loop: number, levelId: number): number { return this.loopLevelStars.get(this._loopKey(loop, levelId)) || 0; }
  canSweep(levelId: number): boolean { return this.getStars(levelId) >= 3; }
  hasRevealedChapterReward(chapterId: number): boolean { return this.revealedChapterRewards.has(chapterId); }

  markChapterRewardRevealed(chapterId: number): void {
    this.revealedChapterRewards.add(chapterId);
    this.saveToDisk();
  }

  getChapterClearedCount(chapterId: number): number {
    const start = (chapterId - 1) * 9 + 1;
    const end = chapterId * 9;
    let count = 0;
    for (let levelId = start; levelId <= end; levelId++) {
      if (this.clearedLevels.has(levelId)) count++;
    }
    return count;
  }

  isChapterBossCleared(chapterId: number): boolean {
    return this.clearedLevels.has(chapterId * 9);
  }

  getClearedChapterCount(): number {
    let count = 0;
    for (let chapterId = 1; chapterId <= 9; chapterId++) {
      if (this.isChapterBossCleared(chapterId)) count++;
    }
    return count;
  }

  onLevelCleared(levelId: number, stars: number): void {
    const loop = this.currentLoop;
    const loopKey = this._loopKey(loop, levelId);
    const loopCur = this.loopLevelStars.get(loopKey) || 0;
    this.loopLevelStars.set(loopKey, Math.max(loopCur, stars));

    if (loop === 1) {
      const cur = this.levelStars.get(levelId) || 0;
      this.levelStars.set(levelId, Math.max(cur, stars));
      this.clearedLevels.add(levelId);
      const chapter = Math.ceil(levelId / 9);
      if (this._isChapterCleared(chapter)) {
        HeroData.getInstance().awardChapterClear(chapter);
        ArtifactData.getInstance().awardChapterClear(chapter);
      }
    }

    if (levelId >= this.currentLevel) {
      if (levelId >= 81) {
        this.highestClearedLoop = Math.max(this.highestClearedLoop, loop);
        this.currentLoop = loop + 1;
        this.currentLevel = 1;
      } else {
        this.currentLevel = levelId + 1;
      }
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

  private _loopKey(loop: number, levelId: number): string {
    return `${loop}:${levelId}`;
  }
}

export function getJourneyLoopDifficulty(loop: number): { hpMultiplier: number; attackMultiplier: number; speedMultiplier: number; intervalMultiplier: number } {
  const cappedLoop = Math.max(1, Math.min(9, Math.floor(loop)));
  const t = (cappedLoop - 1) / 8;
  return {
    hpMultiplier: Number((1 + 5.2 * t).toFixed(3)),
    attackMultiplier: Number((1 + 2.6 * t).toFixed(3)),
    speedMultiplier: Number((1 + 0.25 * t).toFixed(3)),
    intervalMultiplier: Number((1 - 0.32 * t).toFixed(3)),
  };
}
