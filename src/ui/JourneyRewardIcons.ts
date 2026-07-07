import Phaser from 'phaser';
import type { ArtifactConfigItem } from '../config/ArtifactConfig';
import type { HeroConfigItem } from '../config/HeroConfig';
import { HERO_VISUALS, VISUAL_PALETTE } from '../config/VisualConfig';
import { createCjkText } from '../core/TextStyles';

export function isReducedMotionEnabled(): boolean {
  const browserPrefersReducedMotion = typeof globalThis.matchMedia === 'function'
    && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wxRuntime = globalThis as typeof globalThis & {
    wx?: { getSystemInfoSync?: () => { reduceMotion?: boolean } };
  };
  const wxPrefersReducedMotion = wxRuntime.wx?.getSystemInfoSync?.().reduceMotion === true;
  return browserPrefersReducedMotion || wxPrefersReducedMotion;
}

export function createHeroRewardIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
  hero: HeroConfigItem | undefined,
  owned: boolean,
  themeColor: number,
  showBadge = true,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const visual = hero ? HERO_VISUALS[hero.heroId] : undefined;
  const radius = size / 2;
  const graphics = scene.add.graphics();

  graphics.fillStyle(owned ? visual?.fill ?? VISUAL_PALETTE.gold : 0x49505f, owned ? 1 : 0.58);
  graphics.fillCircle(0, 0, radius);
  graphics.lineStyle(2, owned ? VISUAL_PALETTE.gold : themeColor, owned ? 0.92 : 0.52);
  graphics.strokeCircle(0, 0, radius);
  if (!owned) {
    graphics.fillStyle(0x000000, 0.34);
    graphics.fillCircle(0, 0, radius);
  }

  const label = createCjkText(scene, 0, 1, hero?.name[0] ?? '?', {
    fontSize: `${Math.floor(size * 0.4)}px`,
    color: owned ? '#101826' : '#ffffff',
    fontStyle: 'bold',
  });
  label.setOrigin(0.5);
  label.setAlpha(owned ? 1 : 0.68);

  container.add([graphics, label]);
  if (showBadge) {
    container.add(createCornerBadge(scene, radius * 0.62, radius * 0.62, Math.max(10, size * 0.16), owned ? 'check' : 'lock'));
  }
  return container;
}

export function createArtifactRewardIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
  artifact: ArtifactConfigItem | undefined,
  owned: boolean,
  showBadge = true,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const half = size / 2;
  const radius = Math.max(6, size * 0.14);
  const graphics = scene.add.graphics();

  graphics.fillStyle(owned ? 0x1d2f43 : 0x29303a, owned ? 1 : 0.58);
  graphics.fillRoundedRect(-half, -half, size, size, radius);
  graphics.lineStyle(2, owned ? VISUAL_PALETTE.gold : 0x6f7785, owned ? 0.9 : 0.5);
  graphics.strokeRoundedRect(-half, -half, size, size, radius);
  if (!owned) {
    graphics.fillStyle(0x000000, 0.34);
    graphics.fillRoundedRect(-half, -half, size, size, radius);
  }

  const label = createCjkText(scene, 0, 1, artifact?.name[0] ?? '?', {
    fontSize: `${Math.floor(size * 0.4)}px`,
    color: '#ffd36a',
    fontStyle: 'bold',
  });
  label.setOrigin(0.5);
  label.setAlpha(owned ? 1 : 0.58);

  container.add([graphics, label]);
  if (showBadge) {
    container.add(createCornerBadge(scene, half * 0.62, half * 0.62, Math.max(10, size * 0.16), owned ? 'check' : 'lock'));
  }
  return container;
}

function createCornerBadge(scene: Phaser.Scene, x: number, y: number, radius: number, kind: 'check' | 'lock'): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  graphics.fillStyle(kind === 'check' ? VISUAL_PALETTE.jade : 0x6f7785, 1);
  graphics.fillCircle(x, y, radius);
  graphics.lineStyle(Math.max(2, radius * 0.18), kind === 'check' ? 0x101826 : 0xffffff, 0.96);

  if (kind === 'check') {
    graphics.beginPath();
    graphics.moveTo(x - radius * 0.42, y);
    graphics.lineTo(x - radius * 0.12, y + radius * 0.32);
    graphics.lineTo(x + radius * 0.46, y - radius * 0.36);
    graphics.strokePath();
    return graphics;
  }

  graphics.strokeRoundedRect(x - radius * 0.36, y - radius * 0.02, radius * 0.72, radius * 0.5, radius * 0.1);
  graphics.beginPath();
  graphics.arc(x, y - radius * 0.04, radius * 0.35, Math.PI, Math.PI * 2);
  graphics.strokePath();
  return graphics;
}
