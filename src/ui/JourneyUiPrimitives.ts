import Phaser from 'phaser';
import { createCjkText } from '../core/TextStyles';
import { isReducedMotionEnabled } from './JourneyRewardIcons';
import { UI_TOKENS } from './DesignTokens';

interface ButtonOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  enabled?: boolean;
  primary?: boolean;
  fill?: number;
  stroke?: number;
  textColor?: string;
  fontSize?: string;
  onClick: () => void;
}

export function createJourneyButton(scene: Phaser.Scene, options: ButtonOptions): Phaser.GameObjects.Container {
  const enabled = options.enabled ?? true;
  const primary = options.primary ?? false;
  const fill = options.fill ?? (!enabled ? 0x8a8375 : primary ? UI_TOKENS.cinnabar : UI_TOKENS.pine900);
  const stroke = options.stroke ?? (!enabled ? 0xa79e8c : primary ? UI_TOKENS.cinnabarEdge : UI_TOKENS.gold);
  const textColor = options.textColor ?? (enabled ? UI_TOKENS.textOnDark : '#efeadb');
  const container = scene.add.container(options.x + options.width / 2, options.y + options.height / 2);

  const bg = scene.add.graphics();
  // 底部厚度 + 主体（与 DesignTokens.createUiButton 同语言）
  bg.fillStyle(!enabled ? 0x5c564b : primary ? UI_TOKENS.cinnabarDark : 0x091e19, enabled ? 1 : 0.6);
  bg.fillRoundedRect(-options.width / 2, -options.height / 2 + 5, options.width, options.height, 12);
  bg.fillStyle(fill, enabled ? 1 : 0.8);
  bg.fillRoundedRect(-options.width / 2, -options.height / 2, options.width, options.height, 12);
  bg.lineStyle(primary ? 2.5 : 2, stroke, enabled ? 0.9 : 0.5);
  bg.strokeRoundedRect(-options.width / 2, -options.height / 2, options.width, options.height, 12);

  const text = createCjkText(scene, 0, 0, options.label, {
    fontSize: options.fontSize ?? (primary ? '26px' : '23px'),
    color: textColor,
    fontStyle: 'bold',
  });
  text.setOrigin(0.5);

  const hit = scene.add.zone(0, 0, options.width, options.height);
  hit.setOrigin(0.5);
  if (enabled) {
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      playPressFeedback(scene, container, options.onClick);
    });
  }

  container.add([bg, text, hit]);
  return container;
}

export function createJourneyBackButton(scene: Phaser.Scene, onClick: () => void): Phaser.GameObjects.Container {
  const button = createJourneyButton(scene, {
    x: 54,
    y: 74,
    width: 112,
    height: 48,
    label: '返回',
    onClick,
    fontSize: '20px',
  });

  const arrow = createCjkText(scene, -28, 0, '‹', {
    fontSize: '26px',
    color: '#ffffff',
    fontStyle: 'bold',
  });
  arrow.setOrigin(0.5);
  button.add(arrow);
  return button;
}

export function playPressFeedback(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[], onComplete?: () => void): void {
  scene.tweens.add({
    targets: target,
    alpha: 0.84,
    scale: 0.98,
    duration: 80,
    yoyo: true,
    ease: 'Power1.Out',
    onComplete,
  });
}

export function playPageEnter(scene: Phaser.Scene, container: Phaser.GameObjects.Container, direction: 'forward' | 'back'): void {
  if (isReducedMotionEnabled()) return;
  const startX = direction === 'forward' ? 750 : -750;
  container.setX(startX);
  container.setAlpha(0.55);
  scene.tweens.add({
    targets: container,
    x: 0,
    alpha: 1,
    duration: 240,
    ease: 'Cubic.Out',
  });
}
