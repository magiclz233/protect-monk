import Phaser from 'phaser';
import { createCjkText } from '../core/TextStyles';

export const BATTLE_UI = {
  bg: 0x15182b,
  surface: 0x101826,
  surfaceHigh: 0x172033,
  surfaceSoft: 0x1c2636,
  stroke: 0x31496c,
  strokeSoft: 0x3f4f68,
  gold: 0xf0c15a,       // 鎏金
  goldLight: 0xffe08a,  // 鎏金高亮
  jade: 0x2ea07a,       // 石绿（原 0x35b58f，修正为暖调）
  jadeLight: 0x7ff0c5,  // 石绿高亮
  cinnabar: 0xc43d30,   // 朱砂（原 0xb83f35，修正为暖调）
  cinnabarLight: 0xff786d, // 朱砂高亮
  slate: 0x667080,
  inkText: '#101826',
  mainText: '#f7f1d0',
  mutedText: '#cfd8e3',
  blueText: '#9fd3ff',
} as const;

interface PanelOptions {
  fill?: number;
  fillAlpha?: number;
  stroke?: number;
  strokeAlpha?: number;
  radius?: number;
  lineWidth?: number;
  shadow?: boolean;
}

interface ButtonOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  primary?: boolean;
  enabled?: boolean;
  fill?: number;
  stroke?: number;
  textColor?: string;
  fontSize?: string;
  onClick: () => void;
}

export function drawBattlePanel(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  options: PanelOptions = {},
): void {
  const radius = options.radius ?? 10;
  if (options.shadow) {
    graphics.fillStyle(0x05070d, 0.34);
    graphics.fillRoundedRect(x + 4, y + 5, width, height, radius);
  }
  graphics.fillStyle(options.fill ?? BATTLE_UI.surface, options.fillAlpha ?? 0.94);
  graphics.fillRoundedRect(x, y, width, height, radius);
  graphics.lineStyle(options.lineWidth ?? 2, options.stroke ?? BATTLE_UI.gold, options.strokeAlpha ?? 0.38);
  graphics.strokeRoundedRect(x, y, width, height, radius);
}

export function createBattleButton(scene: Phaser.Scene, options: ButtonOptions): Phaser.GameObjects.Container {
  const enabled = options.enabled ?? true;
  const primary = options.primary ?? false;
  const fill = options.fill ?? (!enabled ? BATTLE_UI.slate : primary ? BATTLE_UI.gold : BATTLE_UI.stroke);
  const stroke = options.stroke ?? (!enabled ? 0x8993a2 : primary ? BATTLE_UI.goldLight : 0xb8d8ff);
  const textColor = options.textColor ?? (enabled && primary ? BATTLE_UI.inkText : '#ffffff');
  const container = scene.add.container(options.x + options.width / 2, options.y + options.height / 2);

  const bg = scene.add.graphics();
  bg.fillStyle(fill, enabled ? 1 : 0.72);
  bg.fillRoundedRect(-options.width / 2, -options.height / 2, options.width, options.height, 9);
  bg.lineStyle(primary ? 2.5 : 1.5, stroke, primary ? 0.64 : 0.52);
  bg.strokeRoundedRect(-options.width / 2, -options.height / 2, options.width, options.height, 9);

  const text = createCjkText(scene, 0, 0, options.label, {
    fontSize: options.fontSize ?? (primary ? '24px' : '19px'),
    color: textColor,
    fontStyle: 'bold',
    align: 'center',
  });
  text.setOrigin(0.5);

  const hit = scene.add.zone(0, 0, options.width, options.height);
  hit.setOrigin(0.5);
  if (enabled) {
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => playBattlePress(scene, container, options.onClick));
  }

  container.add([bg, text, hit]);
  return container;
}

export function playBattlePress(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
  onComplete?: () => void,
): void {
  scene.tweens.add({
    targets: target,
    alpha: 0.82,
    scale: 0.98,
    duration: 80,
    yoyo: true,
    ease: 'Power1.Out',
    onComplete,
  });
}
