import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { getArtifactConfig } from '../config/ArtifactConfig';
import { createCjkText } from '../core/TextStyles';
import { artifactKey } from '../render/AssetKeys';
import { Unit } from '../entities/Unit';
import { GridManager } from '../grid/GridManager';
import { ArtifactSystem, getArtifactDisplayName } from '../systems/ArtifactSystem';
import { ArtifactId, CellState } from '../types';
import { UI_TOKENS, drawLacquerPanel } from './DesignTokens';

const BAR_X = 32;
const BAR_Y = 828;
const BAR_W = 686;
const BAR_H = 96;
const SLOT_W = 86;
const SLOT_H = 76;
const SLOT_GAP = 8;
const ENEMY_HIT_PADDING = 16;

type TargetedArtifactType = 'cell' | 'ally' | 'enemy';

interface TargetSelection {
  artifactId: ArtifactId;
  targetType: TargetedArtifactType;
}

export class ArtifactBarView {
  readonly container: Phaser.GameObjects.Container;

  private readonly _tipText: Phaser.GameObjects.Text;
  private _redrawTimer = 0;
  private _destroyed = false;
  private _targetSelection: TargetSelection | null = null;
  private _targetBindEvent: Phaser.Time.TimerEvent | null = null;
  private _targetListenerAttached = false;
  private _tipHideEvent: Phaser.Time.TimerEvent | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly gridMgr: GridManager,
    private readonly artifactSystem: ArtifactSystem,
  ) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(89);
    this._tipText = createCjkText(scene, 375, 604, '', {
      fontSize: '23px',
      color: '#252a26',
      fontStyle: 'bold',
      backgroundColor: '#fff5da',
      padding: { x: 22, y: 10 },
    });
    this._tipText.setOrigin(0.5);
    this._tipText.setDepth(300);
    this._tipText.setAlpha(0);
    this._redraw();
    scene.events.on(Phaser.Scenes.Events.UPDATE, this._updateHandler);
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this._updateHandler);
    this._cancelTargetSelection();
    this._tipHideEvent?.remove(false);
    this._tipHideEvent = null;
    this.scene.tweens.killTweensOf(this._tipText);
    this._tipText.destroy();
    this.container.destroy(true);
  }

  private readonly _updateHandler = (_time: number, delta: number): void => {
    if (gameMgr.isPlaying) {
      this.artifactSystem.update(delta / 1000);
    } else if (this._targetSelection) {
      this._cancelTargetSelection();
      this._redrawTimer = 0;
      this._redraw();
      return;
    }
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
    drawLacquerPanel(bg, BAR_X, BAR_Y, BAR_W, BAR_H, {
      fill: UI_TOKENS.pine950,
      strokeAlpha: 0.5,
      radius: 16,
    });

    const title = createCjkText(this.scene, BAR_X + 20, BAR_Y + BAR_H / 2, '法\n宝', {
      fontSize: '24px',
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 6,
    });
    title.setOrigin(0.5);

    this.container.add([bg, title]);
    this._tipText.setText(tip);

    this.artifactSystem.loadout.forEach((artifactId, index) => {
      this._drawArtifactButton(artifactId, BAR_X + 94 + index * (SLOT_W + SLOT_GAP), BAR_Y + 10);
    });
  }

  private _drawArtifactButton(artifactId: ArtifactId, x: number, y: number): void {
    const ready = this.artifactSystem.isReady(artifactId);
    const cooldown = Math.ceil(this.artifactSystem.getCooldown(artifactId));
    const level = this.artifactSystem.getLevel(artifactId);
    const selectingTarget = this._targetSelection?.artifactId === artifactId;

    // 宣纸槽位（设计稿 artifact-slot）+ 底部厚度
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x3f301d, 0.3);
    bg.fillRoundedRect(x, y + 4, SLOT_W, SLOT_H, 12);
    bg.fillStyle(selectingTarget ? 0xf7e6b8 : 0xfff5da, ready || selectingTarget ? 0.96 : 0.62);
    bg.fillRoundedRect(x, y, SLOT_W, SLOT_H, 12);
    bg.lineStyle(selectingTarget ? 3 : 2, selectingTarget ? UI_TOKENS.gold : ready ? 0xb28e50 : 0xc4b28e, selectingTarget ? 1 : ready ? 0.9 : 0.5);
    bg.strokeRoundedRect(x, y, SLOT_W, SLOT_H, 12);

    // 真实法宝图标
    const icon = this.scene.add.image(x + SLOT_W / 2, y + 28, artifactKey(artifactId));
    icon.setDisplaySize(44, 44);
    if (!ready) icon.setAlpha(0.45);

    // 冷却进度条（底部）
    if (!ready) {
      const ratio = Phaser.Math.Clamp(cooldown / Math.max(1, getArtifactConfig(artifactId)?.cooldown ?? cooldown), 0, 1);
      bg.fillStyle(0x5f2a23, 0.85);
      bg.fillRoundedRect(x + 6, y + SLOT_H - 12, SLOT_W - 12, 6, 3);
      bg.fillStyle(UI_TOKENS.goldLight, 1);
      bg.fillRoundedRect(x + 6, y + SLOT_H - 12, (SLOT_W - 12) * (1 - ratio), 6, 3);
    }

    // 状态角标：Lv / 冷却秒数 / 选目标
    const badgeText = selectingTarget ? '选目标' : ready ? `Lv${level}` : `${cooldown}s`;
    const badge = createCjkText(this.scene, x + SLOT_W / 2, y + SLOT_H - 22, badgeText, {
      fontSize: '20px',
      color: selectingTarget ? '#8e2f25' : ready ? '#ae7529' : '#776a56',
      fontStyle: 'bold',
    });
    badge.setOrigin(0.5);

    const hit = this.scene.add.zone(x + SLOT_W / 2, y + SLOT_H / 2, SLOT_W, SLOT_H);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this._selectArtifact(artifactId));
    this.container.add([bg, icon, badge, hit]);
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

    if (this._targetSelection?.artifactId === artifactId) {
      this._cancelTargetSelection();
      this._showTip('已取消法宝目标选择');
      this._redraw();
      return;
    }

    const config = getArtifactConfig(artifactId);
    if (!config) {
      this._showTip('未知法宝');
      return;
    }

    if (config.targetType === 'global' || config.targetType === 'monk') {
      this._cancelTargetSelection();
      const result = this.artifactSystem.use(artifactId);
      this._showTip(result.message);
      this._redraw();
      return;
    }

    this._beginTargetSelection(artifactId, config.targetType);
  }

  private _beginTargetSelection(artifactId: ArtifactId, targetType: TargetedArtifactType): void {
    this._cancelTargetSelection();
    this._targetSelection = { artifactId, targetType };
    const prompt = targetType === 'cell' ? '选择锁定格' : targetType === 'ally' ? '选择友方单位' : '选择敌人';
    this._showTip(`${prompt}，再次点击法宝可取消`);
    this._redraw();

    // 延后一帧绑定，避免选择法宝的这次 pointerdown 被当成目标。
    this._targetBindEvent = this.scene.time.delayedCall(0, () => {
      this._targetBindEvent = null;
      if (this._destroyed || !this._targetSelection || !gameMgr.isPlaying) {
        this._cancelTargetSelection();
        return;
      }
      this.scene.input.on('pointerdown', this._targetPointerHandler);
      this._targetListenerAttached = true;
    });
  }

  private readonly _targetPointerHandler = (pointer: Phaser.Input.Pointer): void => {
    const selection = this._targetSelection;
    if (!selection || this._destroyed) return;
    if (!gameMgr.isPlaying) {
      this._cancelTargetSelection();
      this._redraw();
      return;
    }

    const x = pointer.worldX ?? pointer.x;
    const y = pointer.worldY ?? pointer.y;
    if (this._isInsideArtifactBar(x, y)) return;
    if (!this.artifactSystem.isReady(selection.artifactId)) {
      this._cancelTargetSelection();
      this._showTip('法宝冷却中');
      this._redraw();
      return;
    }

    const result = this._useTargetedArtifact(selection.artifactId, selection.targetType, pointer);
    this._showTip(result.message);
    if (result.success) {
      this._cancelTargetSelection();
    }
    this._redraw();
  };

  private _cancelTargetSelection(): void {
    this._targetBindEvent?.remove(false);
    this._targetBindEvent = null;
    if (this._targetListenerAttached) {
      this.scene.input.off('pointerdown', this._targetPointerHandler);
      this._targetListenerAttached = false;
    }
    this._targetSelection = null;
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
      const ally = data?.state === CellState.OCCUPIED && data.occupant instanceof Unit ? data.occupant : null;
      return this.artifactSystem.use(artifactId, { ally });
    }

    if (targetType === 'enemy') {
      const x = pointer.worldX ?? pointer.x;
      const y = pointer.worldY ?? pointer.y;
      const enemy = this.artifactSystem.getAliveEnemies()
        .filter(item => this._isEnemyHit(item.sprite, x, y))
        .sort((a, b) => this._distanceSq(a.sprite.x, a.sprite.y, x, y) - this._distanceSq(b.sprite.x, b.sprite.y, x, y))[0] ?? null;
      return this.artifactSystem.use(artifactId, { enemy });
    }

    return this.artifactSystem.use(artifactId);
  }

  private _isInsideArtifactBar(x: number, y: number): boolean {
    return x >= BAR_X && x <= BAR_X + BAR_W && y >= BAR_Y && y <= BAR_Y + BAR_H;
  }

  private _isEnemyHit(sprite: Phaser.GameObjects.Container, x: number, y: number): boolean {
    const bounds = sprite.getBounds();
    return x >= bounds.left - ENEMY_HIT_PADDING
      && x <= bounds.right + ENEMY_HIT_PADDING
      && y >= bounds.top - ENEMY_HIT_PADDING
      && y <= bounds.bottom + ENEMY_HIT_PADDING;
  }

  private _distanceSq(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }

  private _showTip(text: string): void {
    if (this._destroyed) return;
    this._tipHideEvent?.remove(false);
    this.scene.tweens.killTweensOf(this._tipText);
    this._tipText.setText(text);
    this._tipText.setAlpha(1);
    this._tipHideEvent = this.scene.time.delayedCall(1800, () => {
      this._tipHideEvent = null;
      if (this._destroyed) return;
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
