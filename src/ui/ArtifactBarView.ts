import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { ArtifactSystem, getArtifactDisplayName } from '../systems/ArtifactSystem';
import { ArtifactId } from '../types';
import { GridManager } from '../grid/GridManager';

const BAR_X = 42;
const BAR_Y = 850;
const BAR_W = 666;
const BAR_H = 78;
const SLOT_W = 96;
const SLOT_H = 52;
const SLOT_GAP = 10;

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
    this._tipText = scene.add.text(BAR_X + BAR_W - 172, BAR_Y + 60, '', {
      fontSize: '13px',
      color: '#ffd36a',
      fontStyle: 'bold',
      wordWrap: { width: 156, useAdvancedWrap: true },
    });
    this._tipText.setOrigin(0, 0.5);
    this._tipText.setDepth(90);
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
    bg.fillStyle(0x101826, 0.94);
    bg.fillRoundedRect(BAR_X, BAR_Y, BAR_W, BAR_H, 10);
    bg.lineStyle(2, 0xf0c15a, 0.34);
    bg.strokeRoundedRect(BAR_X, BAR_Y, BAR_W, BAR_H, 10);

    const title = this.scene.add.text(BAR_X + 18, BAR_Y + 26, '法宝', {
      fontSize: '18px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    title.setOrigin(0, 0.5);

    this.container.add([bg, title]);
    this._tipText.setText(tip);

    this.artifactSystem.loadout.forEach((artifactId, index) => {
      this._drawArtifactButton(artifactId, BAR_X + 84 + index * (SLOT_W + SLOT_GAP), BAR_Y + 13);
    });
  }

  private _drawArtifactButton(artifactId: ArtifactId, x: number, y: number): void {
    const ready = this.artifactSystem.isReady(artifactId);
    const cooldown = Math.ceil(this.artifactSystem.getCooldown(artifactId));
    const level = this.artifactSystem.getLevel(artifactId);

    const bg = this.scene.add.graphics();
    bg.fillStyle(ready ? 0x284b52 : 0x303848, ready ? 0.98 : 0.78);
    bg.fillRoundedRect(x, y, SLOT_W, SLOT_H, 8);
    bg.lineStyle(2, ready ? 0x9effd6 : 0x8a93a6, ready ? 0.72 : 0.38);
    bg.strokeRoundedRect(x, y, SLOT_W, SLOT_H, 8);

    const label = ready ? `${getArtifactDisplayName(artifactId)}\nLv${level}` : `${getArtifactDisplayName(artifactId)}\n${cooldown}s`;
    const text = this.scene.add.text(x + SLOT_W / 2, y + SLOT_H / 2, label, {
      fontSize: '13px',
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
    if (artifactId !== ArtifactId.AXE) {
      this._showTip('该法宝效果后续接入');
      return;
    }

    this._showTip('选择锁定格');
    this.scene.time.delayedCall(0, () => {
      this.scene.input.once('pointerdown', (pointer: Phaser.Input.Pointer) => {
        const cell = this.gridMgr.worldToCell(pointer.worldX ?? pointer.x, pointer.worldY ?? pointer.y);
        const result = this.artifactSystem.use(artifactId, cell?.row, cell?.col);
        this._showTip(result.message);
        this._redraw();
      });
    });
  }

  private _showTip(text: string): void {
    this._tipText.setText(text);
    this.scene.time.delayedCall(1500, () => {
      if (this._tipText.text === text) {
        this._tipText.setText('');
      }
    });
  }
}
