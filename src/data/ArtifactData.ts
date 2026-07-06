import {
  ARTIFACT_CONFIGS,
  createDefaultArtifactSaveData,
  getArtifactConfig,
  getArtifactUpgradeCost,
  getChapterArtifact,
  normalizeArtifactSaveData,
} from '../config/ArtifactConfig';
import { ArtifactId, ArtifactLevel, ArtifactSaveData } from '../types';
import { SaveManager } from './SaveManager';

export class ArtifactData {
  private static _instance: ArtifactData;
  static getInstance(): ArtifactData {
    if (!this._instance) this._instance = new ArtifactData();
    return this._instance;
  }

  private _data: ArtifactSaveData = createDefaultArtifactSaveData();

  loadFromSave(): void {
    const save = SaveManager.getInstance().load();
    this._data = normalizeArtifactSaveData(save?.artifacts);
  }

  ensureDefaults(): void {
    this._data = normalizeArtifactSaveData(this._data);
    this.saveToDisk();
  }

  saveToDisk(): void {
    const manager = SaveManager.getInstance();
    const save = manager.load() ?? manager.createDefault();
    save.artifacts = normalizeArtifactSaveData(this._data);
    manager.save(save);
  }

  isUnlocked(artifactId: ArtifactId): boolean {
    return this._data.unlocked.includes(artifactId);
  }

  getLevel(artifactId: ArtifactId): ArtifactLevel {
    return this._data.levels[artifactId] ?? 1;
  }

  getUnlockedArtifacts(): ArtifactId[] {
    return ARTIFACT_CONFIGS
      .map(config => config.artifactId)
      .filter(artifactId => this.isUnlocked(artifactId));
  }

  getLoadout(): ArtifactId[] {
    return this._data.loadout.filter(artifactId => this.isUnlocked(artifactId));
  }

  setLoadout(loadout: ArtifactId[], slotLimit: number): void {
    const deduped: ArtifactId[] = [];
    for (const artifactId of loadout) {
      if (!this.isUnlocked(artifactId) || deduped.includes(artifactId)) continue;
      deduped.push(artifactId);
      if (deduped.length >= slotLimit) break;
    }
    this._data.loadout = deduped;
    this.saveToDisk();
  }

  unlock(artifactId: ArtifactId): boolean {
    if (!getArtifactConfig(artifactId) || this.isUnlocked(artifactId)) return false;
    this._data.unlocked.push(artifactId);
    this.saveToDisk();
    return true;
  }

  awardChapterClear(chapter: number): ArtifactId | null {
    const config = getChapterArtifact(chapter);
    if (!config || this.isUnlocked(config.artifactId)) return null;
    this._data.unlocked.push(config.artifactId);
    this.saveToDisk();
    return config.artifactId;
  }

  upgrade(artifactId: ArtifactId): boolean {
    if (!this.isUnlocked(artifactId)) return false;
    const currentLevel = this.getLevel(artifactId);
    const cost = getArtifactUpgradeCost(currentLevel);
    if (cost === null) return false;

    const manager = SaveManager.getInstance();
    const save = manager.load() ?? manager.createDefault();
    if (save.spiritEssence < cost) return false;

    save.spiritEssence -= cost;
    this._data.levels[artifactId] = (currentLevel + 1) as ArtifactLevel;
    save.artifacts = normalizeArtifactSaveData(this._data);
    manager.save(save);
    return true;
  }
}
