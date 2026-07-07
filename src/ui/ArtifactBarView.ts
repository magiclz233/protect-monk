import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { getArtifactConfig } from '../config/ArtifactConfig';
import { createCjkText } from '../core/TextStyles';
import { ArtifactSystem, getArtifactDisplayName } from '../systems/ArtifactSystem';
import { ArtifactId, CellState } from '../types';
import { GridManager } from '../grid/GridManager';
import { BATTLE_UI, drawBattlePanel } from './BattleUiPrimitives';

const BAR_X = 32;
const BAR_Y = 842;
const BAR_W = 686;
const BAR_H = 72;
const SLOT_W = 86;
const SLOT_H = 48;
const SLOT_GAP = 8;

export class ArtifactBarView {
  readonly container: Phaser.GameObjects.Container;

  private readonly _tipText: Phaser.GameObjects.Text;
  private _redrawTimer = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly gridMgr: GridManager,
    private readonly artifactSystem: ArtifactSystem,
  ) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(89);
    this._tipText = createCjkText(scene, 375, 604, '', {
      fontSize: '20px',
      color: '#101826',
      fontStyle: 'bold',
      backgroundColor: '#f0c15a',
      padding: { x: 22, y: 10 },
    });
    this._tipText.setOrigin(0.5);
    this._tipText.setDepth(300);
    this._tipText.setAlpha(0);
    this._redraw();
    scene.events.on(Phaser.Scenes.Events.UPDATE, this._updateHandler);
  }

  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this._updateHandler);
    this._tipText.destroy();
    this.container.destroy(true);
  }

  private readonly _updateHandler = (_time: number, delta: number): void => {
    this.artifactSystem.update(delta / 1000);
    this._redrawTimer += delta / 1000;
    if (this._redrawTimer >= 0.25) {
      this._redrawTimer = 0;
      this._redraw();
    }
  };

  private _redraw(): void {
    const tip = this._tipText.text;
    this.container.removeAll(true);

    const bg = this.scene.add.graphics();
    drawBattlePanel(bg, BAR_X, BAR_Y, BAR_W, BAR_H, {
      fill: BATTLE_UI.surface,
      stroke: BATTLE_UI.gold,
      strokeAlpha: 0.32,
      radius: 10,
      shadow: true,
    });
    bg.fillStyle(0xffffff, 0.045);
    bg.fillRoundedRect(BAR_X + 82, BAR_Y + 10, BAR_W - 100, BAR_H - 20, 8);

    const title = createCjkText(this.scene, BAR_X + 18, BAR_Y + 26, '法宝', {
      fontSize: '18px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    title.setOrigin(0, 0.5);

    this.container.add([bg, title]);
    this._tipText.setText(tip);

    this.artifactSystem.loadout.forEach((artifactId, index) => {
      this._drawArtifactButton(artifactId, BAR_X + 94 + index * (SLOT_W + SLOT_GAP), BAR_Y + 12);
    });
  }

  private _drawArtifactButton(artifactId: ArtifactId, x: number, y: number): void {
    const ready = this.artifactSystem.isReady(artifactId);
    const cooldown = Math.ceil(this.artifactSystem.getCooldown(artifactId));
    const level = this.artifactSystem.getLevel(artifactId);

    const bg = this.scene.add.graphics();
    bg.fillStyle(ready ? 0x214d46 : 0x293142, ready ? 0.98 : 0.78);
    bg.fillRoundedRect(x, y, SLOT_W, SLOT_H, 8);
    bg.lineStyle(2, ready ? BATTLE_UI.jadeLight : 0x8a93a6, ready ? 0.72 : 0.38);
    bg.strokeRoundedRect(x, y, SLOT_W, SLOT_H, 8);
    if (!ready) {
      const ratio = Phaser.Math.Clamp(cooldown / Math.max(1, getArtifactConfig(artifactId)?.cooldown ?? cooldown), 0, 1);
      bg.fillStyle(0x05070d, 0.32);
      bg.fillRoundedRect(x + 5, y + SLOT_H - 9, (SLOT_W - 10) * ratio, 4, 2);
    }

    const label = ready ? `${getArtifactDisplayName(artifactId)}\nLv${level}` : `${getArtifactDisplayName(artifactId)}\n${cooldown}s`;
    const text = createCjkText(this.scene, x + SLOT_W / 2, y + SLOT_H / 2, label, {
      fontSize: '12px',
      color: ready ? '#f7f1d0' : '#cfd8e3',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 4,
    });
    text.setOrigin(0.5);

    const hit = this.scene.add.zone(x + SLOT_W / 2, y + SLOT_H / 2, SLOT_W, SLOT_H);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this._selectArtifact(artifactId));
    this.container.add([bg, text, hit]);
  }

  private _selectArtifact(artifactId: ArtifactId): void {
    if (!gameMgr.isPlaying) {
      this._showTip('暂停中不能使用法宝');
      return;
    }
    if (!this.artifactSystem.isReady(artifactId)) {
      this._showTip('法宝冷却中');
      return;
    }
    const config = getArtifactConfig(artifactId);
    if (!config) {
      this._showTip('未知法宝');
      return;
    }

    if (config.targetType === 'global' || config.targetType === 'monk') {
      const result = this.artifactSystem.use(artifactId);
      this._showTip(result.message);
      this._redraw();
      return;
    }

    this._showTip(config.targetType === 'cell' ? '选择锁定格' : config.targetType === 'ally' ? '选择友方单位' : '选择敌人');
    this.scene.time.delayedCall(0, () => {
      this.scene.input.once('pointerdown', (pointer: Phaser.Input.Pointer) => {
        const result = this._useTargetedArtifact(artifactId, config.targetType, pointer);
        this._showTip(result.message);
        this._redraw();
      });
    });
  }

  private _useTargetedArtifact(
    artifactId: ArtifactId,
    targetType: 'cell' | 'ally' | 'enemy' | 'global' | 'monk',
    pointer: Phaser.Input.Pointer,
  ): { success: boolean; message: string } {
    if (targetType === 'cell') {
      const cell = this.gridMgr.worldToCell(pointer.worldX ?? pointer.x, pointer.worldY ?? pointer.y);
      return this.artifactSystem.use(artifactId, cell?.row, cell?.col);
    }

    if (targetType === 'ally') {
      const cell = this.gridMgr.worldToCell(pointer.worldX ?? pointer.x, pointer.worldY ?? pointer.y);
      const data = cell ? this.gridMgr.getCell(cell.row, cell.col) : null;
      const ally = data?.state === CellState.OCCUPIED ? data.occupant : null;
      return this.artifactSystem.use(artifactId, { ally });
    }

    if (targetType === 'enemy') {
      const x = pointer.worldX ?? pointer.x;
      const y = pointer.worldY ?? pointer.y;
      const enemy = this.artifactSystem.getAliveEnemies()
        .sort((a, b) => this._distanceSq(a.sprite.x, a.sprite.y, x, y) - this._distanceSq(b.sprite.x, b.sprite.y, x, y))[0] ?? null;
      return this.artifactSystem.use(artifactId, { enemy });
    }

    return this.artifactSystem.use(artifactId);
  }

  private _distanceSq(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }

  private _showTip(text: string): void {
    this._tipText.setText(text);
    this._tipText.setAlpha(1);
    this.scene.time.delayedCall(1800, () => {
      if (this._tipText.text === text) {
        this.scene.tweens.add({
          targets: this._tipText,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            if (this._tipText.text === text) {
              this._tipText.setText('');
            }
          },
        });
      }
    });
  }
}
