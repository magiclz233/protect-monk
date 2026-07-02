/**
 * 英雄数据持久化
 */
import { SaveManager } from './SaveManager';

export interface HeroRuntimeData {
  heroId: string;
  unlocked: boolean;
  starLevel: number;
  shardCount: number;
}

export class HeroData {
  private static _instance: HeroData;
  static getInstance(): HeroData {
    if (!this._instance) this._instance = new HeroData();
    return this._instance;
  }

  private _heroes: Map<string, HeroRuntimeData> = new Map();

  loadFromSave(): void {
    const save = SaveManager.getInstance().load();
    if (!save) return;
    for (const [heroId, data] of Object.entries(save.heroStars)) {
      this._heroes.set(heroId, { ...data });
    }
  }

  saveToDisk(): void {
    const save = SaveManager.getInstance().load() || SaveManager.getInstance().createDefault();
    save.heroStars = {};
    this._heroes.forEach((v, k) => { save.heroStars[k] = { ...v }; });
    SaveManager.getInstance().save(save);
  }

  get(heroId: string): HeroRuntimeData {
    if (!this._heroes.has(heroId)) {
      this._heroes.set(heroId, { heroId, unlocked: false, starLevel: 1, shardCount: 0 });
    }
    return this._heroes.get(heroId)!;
  }

  unlock(heroId: string): void {
    this.get(heroId).unlocked = true;
    this.saveToDisk();
  }

  addShards(heroId: string, count: number): void {
    this.get(heroId).shardCount += count;
    this.saveToDisk();
  }

  upgradeStar(heroId: string): boolean {
    const data = this.get(heroId);
    if (data.starLevel >= 5) return false;
    data.starLevel++;
    this.saveToDisk();
    return true;
  }

  /** 八十一难模式英雄星级加成：初始等级+starLevel-1 */
  getStarBonus(heroId: string): number {
    return this.get(heroId).starLevel - 1;
  }
}
