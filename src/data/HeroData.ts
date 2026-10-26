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
    this._heroes.clear();
    const save = SaveManager.getInstance().load();
    if (!save) return;
    for (const [heroId, data] of Object.entries(save.heroStars)) {
      this._heroes.set(heroId, { ...data });
    }
  }

  ensureDefaults(): void {
    const defaultHeroIds = ['zhubajie', 'bailongma', 'taishanglaojun', 'heixiongjing', 'tuotatianwang'];
    let changed = false;
    for (const heroId of defaultHeroIds) {
      const data = this.get(heroId);
      if (data.unlocked) continue;
      data.unlocked = true;
      changed = true;
    }
    if (changed) this.saveToDisk();
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
    const data = this.get(heroId);
    if (data.unlocked) return;
    data.unlocked = true;
    this.saveToDisk();
  }

  addShards(heroId: string, count: number): void {
    const amount = Math.max(0, Math.floor(count));
    if (amount <= 0) return;
    this.get(heroId).shardCount += amount;
    this.saveToDisk();
  }

  /** 随机发放 1 个已解锁英雄碎片，返回英雄 ID（每日祈愿用） */
  addRandomShard(): string {
    this.loadFromSave();
    this.ensureDefaults();
    const unlocked = Array.from(this._heroes.entries())
      .filter(([, data]) => data.unlocked)
      .map(([heroId]) => heroId);
    const heroId = unlocked.length > 0
      ? unlocked[Math.floor(Math.random() * unlocked.length)]
      : 'zhubajie';
    this.addShards(heroId, 1);
    return heroId;
  }

  /**
   * 消耗同名碎片提升星级（升到下一星需当前星数碎片：1→2 需 1 片，…4→5 需 4 片）
   * @returns 'ok' 成功 / 'no_shard' 碎片不足 / 'max' 已达 5 星上限
   */
  upgradeStar(heroId: string): 'ok' | 'no_shard' | 'max' {
    const data = this.get(heroId);
    if (data.starLevel >= 5) return 'max';
    const cost = data.starLevel;
    if (data.shardCount < cost) return 'no_shard';
    data.shardCount -= cost;
    data.starLevel++;
    this.saveToDisk();
    return 'ok';
  }

  /** 八十一难模式英雄星级加成：初始等级+starLevel-1 */
  getStarBonus(heroId: string): number {
    return this.get(heroId).starLevel - 1;
  }

  awardChapterClear(chapter: number): string | null {
    const unlocks: Record<number, string> = {
      1: 'sunwukong',
      2: 'shawujing',
      3: 'baigufuren',
      4: 'honghaier',
      5: 'niumowang',
      6: 'guanyin',
      7: 'zhizhujing',
      8: 'erlangshen',
      9: 'nezha',
    };
    const heroId = unlocks[chapter];
    if (!heroId) return null;
    const data = this.get(heroId);
    if (data.unlocked) return null;
    data.unlocked = true;
    this.saveToDisk();
    return heroId;
  }
}
