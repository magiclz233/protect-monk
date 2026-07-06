import { ARTIFACT_CONFIGS, getArtifactConfig } from '../config/ArtifactConfig';
import { ArtifactData } from '../data/ArtifactData';
import { GridManager } from '../grid/GridManager';
import { ArtifactId, ArtifactLevel, CellState } from '../types';

export interface ArtifactUseResult {
  success: boolean;
  message: string;
}

export class ArtifactSystem {
  private readonly _cooldowns = new Map<ArtifactId, number>();
  private readonly _loadout: ArtifactId[];

  constructor(private readonly gridMgr: GridManager) {
    const artifactData = ArtifactData.getInstance();
    artifactData.loadFromSave();
    artifactData.ensureDefaults();
    this._loadout = artifactData.getLoadout();
    for (const artifactId of this._loadout) {
      this._cooldowns.set(artifactId, 0);
    }
  }

  update(dt: number): void {
    for (const [artifactId, cooldown] of this._cooldowns) {
      this._cooldowns.set(artifactId, Math.max(0, cooldown - dt));
    }
  }

  get loadout(): ArtifactId[] {
    return this._loadout;
  }

  getCooldown(artifactId: ArtifactId): number {
    return this._cooldowns.get(artifactId) ?? 0;
  }

  isReady(artifactId: ArtifactId): boolean {
    return this.getCooldown(artifactId) <= 0;
  }

  getLevel(artifactId: ArtifactId): ArtifactLevel {
    return ArtifactData.getInstance().getLevel(artifactId);
  }

  use(artifactId: ArtifactId, row?: number, col?: number): ArtifactUseResult {
    if (!this._loadout.includes(artifactId)) {
      return { success: false, message: '未携带该法宝' };
    }
    if (!this.isReady(artifactId)) {
      return { success: false, message: '法宝冷却中' };
    }

    if (artifactId === ArtifactId.AXE) {
      return this._useAxe(row, col);
    }

    return { success: false, message: '该法宝效果后续接入' };
  }

  private _useAxe(row?: number, col?: number): ArtifactUseResult {
    if (row === undefined || col === undefined) {
      return { success: false, message: '请选择锁定格' };
    }

    const cell = this.gridMgr.getCell(row, col);
    if (!cell || cell.state !== CellState.LOCKED) {
      return { success: false, message: '开山斧需要锁定格' };
    }

    const level = this.getLevel(ArtifactId.AXE);
    const unlocked = this._unlockCellsFrom(row, col, level >= 3 ? 2 : 1);
    if (unlocked <= 0) {
      return { success: false, message: '没有可解锁格' };
    }

    this._cooldowns.set(ArtifactId.AXE, level >= 2 ? 50 : getArtifactConfig(ArtifactId.AXE)?.cooldown ?? 60);
    return { success: true, message: `开山斧解锁 ${unlocked} 格` };
  }

  private _unlockCellsFrom(row: number, col: number, count: number): number {
    const candidates: Array<{ row: number; col: number; distance: number }> = [];
    for (let r = 0; r < this.gridMgr.rows; r++) {
      for (let c = 0; c < this.gridMgr.cols; c++) {
        const cell = this.gridMgr.getCell(r, c);
        if (!cell || cell.state !== CellState.LOCKED) continue;
        candidates.push({ row: r, col: c, distance: Math.abs(row - r) + Math.abs(col - c) });
      }
    }

    let unlocked = 0;
    for (const target of candidates.sort((a, b) => a.distance - b.distance || a.row - b.row || a.col - b.col).slice(0, count)) {
      if (this.gridMgr.unlockCell(target.row, target.col)) {
        unlocked++;
      }
    }
    return unlocked;
  }
}

export function getArtifactDisplayName(artifactId: ArtifactId): string {
  return ARTIFACT_CONFIGS.find(config => config.artifactId === artifactId)?.name ?? artifactId;
}
