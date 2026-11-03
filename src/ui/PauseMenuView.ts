import Phaser from 'phaser';
import { createCjkText } from '../core/TextStyles';
import { UI_TOKENS, createUiButton, drawPaperPanel } from './DesignTokens';

export interface PauseMenuCallbacks {
  onResume: () => void;
  onRestart: () => void;
  onReturnMap: () => void;
}

/** 战斗暂停菜单：深底遮罩 + 宣纸面板，操作闭环完整。 */
export class PauseMenuView {
  readonly container: Phaser.GameObjects.Container;

  private readonly _overlay: Phaser.GameObjects.Graphics;
  private _destroyed = false;

  constructor(private readonly scene: Phaser.Scene, private readonly callbacks: PauseMenuCallbacks) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(260);
    this.container.setAlpha(0);

    this._overlay = scene.add.graphics();
    this._overlay.fillStyle(0x0a1e19, 0.72);
    this._overlay.fillRect(0, 0, 750, 1334);
    this._overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, 750, 1334), Phaser.Geom.Rectangle.Contains);

    const panel = scene.add.graphics();
    drawPaperPanel(panel, 118, 410, 514, 438, { radius: 24 });

    const eyebrow = createCjkText(scene, 375, 462, '暂 停', {
      fontSize: '24px', color: UI_TOKENS.textCinnabarOnPaper, fontStyle: 'bold',
    });
    eyebrow.setOrigin(0.5);
    const title = createCjkText(scene, 375, 516, '且住神通', {
      fontSize: '46px', color: UI_TOKENS.textOnPaper, fontStyle: 'bold',
      fontFamily: 'SimSun, Microsoft YaHei, serif',
    });
    title.setOrigin(0.5);
    const sub = createCjkText(scene, 375, 566, '战局已暂停，唐僧安危仍在顷刻之间', {
      fontSize: '22px', color: UI_TOKENS.textMutedOnPaper,
    });
    sub.setOrigin(0.5);

    const close = scene.add.container(594, 450);
    const closeBg = scene.add.graphics();
    closeBg.fillStyle(UI_TOKENS.pine800, 0.92);
    closeBg.fillCircle(0, 0, 24);
    closeBg.lineStyle(2, UI_TOKENS.goldLight, 0.72);
    closeBg.strokeCircle(0, 0, 24);
    const closeText = createCjkText(scene, 0, 0, '×', {
      fontSize: '34px', color: '#fff5da', fontStyle: 'bold',
    });
    closeText.setOrigin(0.5);
    const closeHit = scene.add.zone(0, 0, 58, 58);
    closeHit.setOrigin(0.5);
    closeHit.setInteractive({ useHandCursor: true });
    closeHit.on('pointerdown', () => this.callbacks.onResume());
    close.add([closeBg, closeText, closeHit]);

    this.container.add([
      this._overlay,
      panel,
      eyebrow,
      title,
      sub,
      close,
      createUiButton(scene, {
        x: 188, y: 618, width: 374, height: 72,
        label: '继续守护', primary: true, fontSize: '28px',
        onClick: () => this.callbacks.onResume(),
      }),
      createUiButton(scene, {
        x: 188, y: 704, width: 374, height: 66,
        label: '重新开始', secondary: true, fontSize: '26px',
        onClick: () => this.callbacks.onRestart(),
      }),
      createUiButton(scene, {
        x: 188, y: 772, width: 374, height: 56,
        label: '返回地图', secondary: true, fontSize: '24px',
        onClick: () => this.callbacks.onReturnMap(),
      }),
    ]);

    scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 160,
      ease: 'Cubic.Out',
    });
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.scene.tweens.killTweensOf(this.container);
    this.container.destroy(true);
  }
}
