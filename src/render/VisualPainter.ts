import type Phaser from 'phaser';
import {
  ENEMY_TYPE_FALLBACK_VISUALS,
  ENEMY_VISUALS,
  HERO_VISUALS,
  ITEM_VISUALS,
  RANK_VISUALS,
  SOLDIER_VISUALS,
  VISUAL_PALETTE,
} from '../config/VisualConfig';
import { CardData, CardType, EnemyType, HeroRarity, ItemId, SoldierRank, SoldierType } from '../types';

interface CardIconOptions {
  size: number;
  card: CardData;
  heroRarity?: HeroRarity;
}

export function drawSoldierBody(g: Phaser.GameObjects.Graphics, type: SoldierType, rank: SoldierRank, scale: number): void {
  const visual = SOLDIER_VISUALS[type];
  const rankVisual = RANK_VISUALS[rank];
  const radius = 24 * scale;

  g.fillStyle(rankVisual.color, rankVisual.glowAlpha);
  g.fillCircle(0, 0, radius + 7);
  g.fillStyle(visual.fill);
  g.fillRoundedRect(-radius, -radius, radius * 2, radius * 2, 6 * scale);
  g.lineStyle(rank >= SoldierRank.ORANGE ? 4 : 2.5, rankVisual.color, 0.88);
  g.strokeRoundedRect(-radius, -radius, radius * 2, radius * 2, 6 * scale);
  g.lineStyle(1.5, visual.stroke, 0.48);
  g.strokeRoundedRect(-radius + 4, -radius + 4, (radius - 4) * 2, (radius - 4) * 2, 5 * scale);
  drawSoldierInsignia(g, type, 0, 0, scale * 0.78, visual.accent, visual.stroke);
}

export function drawSoldierInsignia(
  g: Phaser.GameObjects.Graphics,
  type: SoldierType,
  x: number,
  y: number,
  scale: number,
  accent?: number,
  stroke?: number,
): void {
  const visual = SOLDIER_VISUALS[type];
  const main = accent ?? visual.accent;
  const edge = stroke ?? visual.stroke;

  if (visual.weapon === 'staff') {
    g.lineStyle(4 * scale, main, 1);
    g.lineBetween(x - 16 * scale, y + 12 * scale, x + 16 * scale, y - 12 * scale);
    g.fillStyle(edge);
    g.fillCircle(x - 8 * scale, y - 5 * scale, 4 * scale);
    g.fillCircle(x + 8 * scale, y - 5 * scale, 4 * scale);
    return;
  }

  if (visual.weapon === 'spear_shield') {
    g.fillStyle(edge);
    g.fillTriangle(x - 5 * scale, y - 17 * scale, x + 5 * scale, y - 17 * scale, x, y - 26 * scale);
    g.lineStyle(3 * scale, main, 1);
    g.lineBetween(x, y - 18 * scale, x, y + 18 * scale);
    g.fillStyle(main);
    g.fillRoundedRect(x - 18 * scale, y - 2 * scale, 16 * scale, 22 * scale, 5 * scale);
    return;
  }

  if (visual.weapon === 'axe_mount') {
    g.fillStyle(main);
    g.fillEllipse(x, y + 10 * scale, 32 * scale, 13 * scale);
    g.lineStyle(3 * scale, edge, 1);
    g.lineBetween(x - 10 * scale, y + 9 * scale, x + 12 * scale, y - 16 * scale);
    g.fillStyle(edge);
    g.fillTriangle(x + 10 * scale, y - 19 * scale, x + 24 * scale, y - 11 * scale, x + 9 * scale, y - 5 * scale);
    return;
  }

  g.lineStyle(3 * scale, main, 1);
  g.strokeCircle(x - 2 * scale, y, 16 * scale);
  g.lineStyle(2 * scale, edge, 1);
  g.lineBetween(x - 14 * scale, y, x + 16 * scale, y);
  g.fillStyle(edge);
  g.fillTriangle(x + 17 * scale, y, x + 8 * scale, y - 5 * scale, x + 8 * scale, y + 5 * scale);
}

export function drawHeroBody(g: Phaser.GameObjects.Graphics, heroId: string, rarity: HeroRarity): void {
  const visual = HERO_VISUALS[heroId];
  const fill = visual?.fill ?? (rarity === HeroRarity.CORE ? 0x8a4a2b : 0x2f7866);
  const stroke = visual?.stroke ?? (rarity === HeroRarity.CORE ? VISUAL_PALETTE.gold : 0xb8f4de);
  const accent = visual?.accent ?? 0xffffff;

  if (rarity === HeroRarity.CORE) {
    g.fillStyle(stroke, 0.22);
    g.fillCircle(0, 0, 35);
  }
  g.fillStyle(fill);
  g.fillRoundedRect(-24, -24, 48, 48, 8);
  g.lineStyle(rarity === HeroRarity.CORE ? 4 : 2.5, stroke, rarity === HeroRarity.CORE ? 0.9 : 0.7);
  g.strokeRoundedRect(-24, -24, 48, 48, 8);
  g.lineStyle(1.5, accent, 0.38);
  g.strokeRoundedRect(-18, -18, 36, 36, 6);
  drawHeroEmblem(g, heroId, 0, 0, 0.85, accent, stroke);
}

export function drawHeroEmblem(
  g: Phaser.GameObjects.Graphics,
  heroId: string,
  x: number,
  y: number,
  scale: number,
  accent?: number,
  stroke?: number,
): void {
  const visual = HERO_VISUALS[heroId];
  const main = accent ?? visual?.accent ?? 0xffffff;
  const edge = stroke ?? visual?.stroke ?? VISUAL_PALETTE.gold;
  const emblem = visual?.emblem ?? 'staff';

  if (emblem === 'lotus') {
    g.fillStyle(main, 0.95);
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5;
      g.fillEllipse(x + Math.cos(angle) * 7 * scale, y + Math.sin(angle) * 4 * scale, 10 * scale, 18 * scale);
    }
    return;
  }
  if (emblem === 'wheels') {
    g.lineStyle(3 * scale, edge, 1);
    g.strokeCircle(x - 9 * scale, y + 6 * scale, 8 * scale);
    g.strokeCircle(x + 9 * scale, y + 6 * scale, 8 * scale);
    g.lineStyle(3 * scale, main, 1);
    g.lineBetween(x - 14 * scale, y - 12 * scale, x + 14 * scale, y - 18 * scale);
    return;
  }
  if (emblem === 'dragon') {
    g.lineStyle(3 * scale, main, 1);
    g.lineBetween(x - 16 * scale, y + 8 * scale, x - 7 * scale, y - 8 * scale);
    g.lineBetween(x - 7 * scale, y - 8 * scale, x + 4 * scale, y - 13 * scale);
    g.lineBetween(x + 4 * scale, y - 13 * scale, x + 14 * scale, y - 3 * scale);
    g.fillStyle(edge);
    g.fillTriangle(x + 14 * scale, y - 3 * scale, x + 4 * scale, y - 8 * scale, x + 7 * scale, y + 2 * scale);
    return;
  }
  if (emblem === 'crescent') {
    g.lineStyle(4 * scale, main, 1);
    g.lineBetween(x - 10 * scale, y + 16 * scale, x + 12 * scale, y - 16 * scale);
    g.lineStyle(3 * scale, edge, 1);
    g.arc(x + 9 * scale, y - 15 * scale, 8 * scale, 0.1, Math.PI * 1.4);
    return;
  }
  if (emblem === 'fire_spear' || emblem === 'flame') {
    g.fillStyle(main);
    g.fillTriangle(x, y - 18 * scale, x - 10 * scale, y + 10 * scale, x + 10 * scale, y + 10 * scale);
    g.fillStyle(edge, 0.92);
    g.fillTriangle(x, y - 8 * scale, x - 5 * scale, y + 11 * scale, x + 5 * scale, y + 11 * scale);
    if (emblem === 'fire_spear') {
      g.lineStyle(3 * scale, edge, 1);
      g.lineBetween(x - 16 * scale, y + 15 * scale, x + 17 * scale, y - 16 * scale);
    }
    return;
  }
  if (emblem === 'rake') {
    g.lineStyle(3 * scale, main, 1);
    g.lineBetween(x - 10 * scale, y + 15 * scale, x + 11 * scale, y - 13 * scale);
    for (let i = 0; i < 4; i++) {
      const px = x + (2 + i * 4) * scale;
      g.lineBetween(px, y - 15 * scale, px - 5 * scale, y - 8 * scale);
    }
    return;
  }
  if (emblem === 'eye') {
    g.fillStyle(main);
    g.fillEllipse(x, y, 28 * scale, 15 * scale);
    g.fillStyle(edge);
    g.fillCircle(x, y, 5 * scale);
    return;
  }
  if (emblem === 'horn') {
    g.fillStyle(edge);
    g.fillTriangle(x - 15 * scale, y - 5 * scale, x - 5 * scale, y - 19 * scale, x - 2 * scale, y + 1 * scale);
    g.fillTriangle(x + 15 * scale, y - 5 * scale, x + 5 * scale, y - 19 * scale, x + 2 * scale, y + 1 * scale);
    g.fillStyle(main);
    g.fillCircle(x, y + 5 * scale, 11 * scale);
    return;
  }
  if (emblem === 'bear' || emblem === 'bone' || emblem === 'web' || emblem === 'pagoda') {
    drawSimpleHeroMark(g, emblem, x, y, scale, main, edge);
    return;
  }

  g.lineStyle(4 * scale, main, 1);
  g.lineBetween(x - 15 * scale, y + 13 * scale, x + 15 * scale, y - 13 * scale);
  g.fillStyle(edge);
  g.fillCircle(x - 8 * scale, y - 5 * scale, 4 * scale);
}

export function drawEnemyBody(g: Phaser.GameObjects.Graphics, enemyId: string, enemyType: EnemyType, scale: number): void {
  const visual = ENEMY_VISUALS[enemyId] ?? ENEMY_TYPE_FALLBACK_VISUALS[enemyType];
  const radius = 22 * scale;

  if (visual.silhouette === 'boss_hex') {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      pts.push({ x: Math.cos(angle) * 26 * scale, y: Math.sin(angle) * 26 * scale });
    }
    g.fillStyle(visual.fill);
    g.fillPoints(pts, true);
    g.lineStyle(3, visual.stroke, 0.85);
    g.strokePoints(pts, true);
  } else {
    drawEnemySilhouette(g, visual.silhouette, radius, visual.fill, visual.stroke, visual.accent);
  }
}

export function drawItemIcon(g: Phaser.GameObjects.Graphics, itemId: ItemId, x: number, y: number, size: number): void {
  const visual = ITEM_VISUALS[itemId];
  const scale = size / 48;

  g.fillStyle(visual.fill);
  g.fillRoundedRect(x - 24 * scale, y - 24 * scale, 48 * scale, 48 * scale, 9 * scale);
  g.lineStyle(2 * scale, visual.stroke, 0.8);
  g.strokeRoundedRect(x - 24 * scale, y - 24 * scale, 48 * scale, 48 * scale, 9 * scale);

  if (visual.icon === 'axe') {
    g.lineStyle(4 * scale, visual.accent, 1);
    g.lineBetween(x - 12 * scale, y + 15 * scale, x + 12 * scale, y - 16 * scale);
    g.fillStyle(visual.stroke);
    g.fillTriangle(x + 8 * scale, y - 20 * scale, x + 22 * scale, y - 8 * scale, x + 5 * scale, y - 3 * scale);
    return;
  }
  if (visual.icon === 'elixir') {
    g.fillStyle(visual.accent);
    g.fillCircle(x, y, 13 * scale);
    g.lineStyle(2 * scale, visual.stroke, 0.9);
    g.strokeCircle(x, y, 18 * scale);
    return;
  }
  if (visual.icon === 'shard') {
    g.fillStyle(visual.accent);
    g.fillTriangle(x - 14 * scale, y - 13 * scale, x + 16 * scale, y - 5 * scale, x - 2 * scale, y + 18 * scale);
    g.lineStyle(2 * scale, visual.stroke, 0.85);
    g.strokeTriangle(x - 14 * scale, y - 13 * scale, x + 16 * scale, y - 5 * scale, x - 2 * scale, y + 18 * scale);
    return;
  }
  if (visual.icon === 'headband') {
    g.lineStyle(5 * scale, visual.accent, 1);
    g.strokeCircle(x, y, 15 * scale);
    g.lineStyle(2 * scale, visual.stroke, 0.8);
    g.lineBetween(x - 17 * scale, y, x + 17 * scale, y);
    return;
  }

  g.fillStyle(visual.accent);
  g.fillRoundedRect(x - 9 * scale, y - 15 * scale, 18 * scale, 30 * scale, 7 * scale);
  g.fillStyle(visual.stroke);
  g.fillRoundedRect(x - 5 * scale, y - 22 * scale, 10 * scale, 10 * scale, 3 * scale);
  g.lineStyle(2 * scale, visual.stroke, 0.8);
  g.strokeEllipse(x, y + 1 * scale, 25 * scale, 32 * scale);
}

export function drawCardIcon(g: Phaser.GameObjects.Graphics, options: CardIconOptions): void {
  const { card, size } = options;
  const x = size / 2;
  const y = size / 2;

  if (card.type === CardType.SOLDIER && card.soldierType) {
    const rank = card.soldierRank ?? SoldierRank.WHITE;
    g.fillStyle(RANK_VISUALS[rank].color, 0.18);
    g.fillCircle(x, y, size * 0.4);
    drawSoldierInsignia(g, card.soldierType, x, y, size / 58);
    return;
  }

  if (card.type === CardType.HERO && card.heroId) {
    drawHeroEmblem(g, card.heroId, x, y, size / 58);
    return;
  }

  if (card.type === CardType.HERO_SHARD) {
    const isCore = options.heroRarity === HeroRarity.CORE;
    g.fillStyle(isCore ? 0x7a2d22 : 0x245f56);
    g.fillCircle(x, y, size * 0.36);
    g.lineStyle(isCore ? 3 : 2, isCore ? VISUAL_PALETTE.gold : 0xb8f4de, isCore ? 0.9 : 0.7);
    g.strokeCircle(x, y, size * 0.36);
    g.fillStyle(isCore ? VISUAL_PALETTE.gold : 0xb8f4de);
    g.fillTriangle(x - size * 0.18, y - size * 0.16, x + size * 0.2, y - size * 0.05, x - size * 0.02, y + size * 0.22);
    return;
  }

  if (card.itemId) {
    drawItemIcon(g, card.itemId, x, y, size);
  }
}

function drawEnemySilhouette(
  g: Phaser.GameObjects.Graphics,
  silhouette: string,
  radius: number,
  fill: number,
  stroke: number,
  accent: number,
): void {
  if (silhouette === 'bat' || silhouette === 'wing') {
    g.fillStyle(fill);
    g.fillTriangle(-radius * 1.3, 0, -radius * 0.2, -radius * 0.8, -radius * 0.1, radius * 0.75);
    g.fillTriangle(radius * 1.3, 0, radius * 0.2, -radius * 0.8, radius * 0.1, radius * 0.75);
    g.fillCircle(0, 0, radius * 0.62);
  } else if (silhouette === 'skull') {
    g.fillStyle(fill);
    g.fillCircle(0, -radius * 0.15, radius * 0.82);
    g.fillRoundedRect(-radius * 0.42, radius * 0.32, radius * 0.84, radius * 0.46, 3);
    g.fillStyle(accent);
    g.fillCircle(-radius * 0.28, -radius * 0.18, radius * 0.16);
    g.fillCircle(radius * 0.28, -radius * 0.18, radius * 0.16);
  } else if (silhouette === 'wind') {
    g.fillStyle(fill);
    g.fillCircle(0, 0, radius);
    g.lineStyle(3, accent, 0.9);
    g.arc(-radius * 0.16, -radius * 0.05, radius * 0.72, -0.5, Math.PI * 1.2);
    g.arc(radius * 0.1, radius * 0.08, radius * 0.48, Math.PI * 0.2, Math.PI * 1.4);
  } else {
    g.fillStyle(fill);
    g.fillCircle(0, 0, radius);
    if (silhouette === 'fox' || silhouette === 'beast' || silhouette === 'elephant') {
      g.fillTriangle(-radius * 0.55, -radius * 0.62, -radius * 0.2, -radius * 1.22, radius * 0.02, -radius * 0.52);
      g.fillTriangle(radius * 0.55, -radius * 0.62, radius * 0.2, -radius * 1.22, -radius * 0.02, -radius * 0.52);
    }
  }
  g.lineStyle(2, stroke, 0.62);
  g.strokeCircle(0, 0, radius);
}

function drawSimpleHeroMark(
  g: Phaser.GameObjects.Graphics,
  emblem: string,
  x: number,
  y: number,
  scale: number,
  main: number,
  edge: number,
): void {
  if (emblem === 'web') {
    g.lineStyle(2 * scale, edge, 1);
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      g.lineBetween(x, y, x + Math.cos(angle) * 17 * scale, y + Math.sin(angle) * 17 * scale);
    }
    g.strokeCircle(x, y, 11 * scale);
    return;
  }
  if (emblem === 'pagoda') {
    g.fillStyle(main);
    g.fillTriangle(x, y - 18 * scale, x - 15 * scale, y - 5 * scale, x + 15 * scale, y - 5 * scale);
    g.fillRoundedRect(x - 10 * scale, y - 4 * scale, 20 * scale, 20 * scale, 2 * scale);
    return;
  }
  if (emblem === 'bone') {
    g.lineStyle(4 * scale, main, 1);
    g.lineBetween(x - 13 * scale, y + 12 * scale, x + 13 * scale, y - 12 * scale);
    g.fillCircle(x - 15 * scale, y + 14 * scale, 4 * scale);
    g.fillCircle(x + 15 * scale, y - 14 * scale, 4 * scale);
    return;
  }
  g.fillStyle(main);
  g.fillCircle(x - 8 * scale, y - 5 * scale, 8 * scale);
  g.fillCircle(x + 8 * scale, y - 5 * scale, 8 * scale);
  g.fillRoundedRect(x - 14 * scale, y - 1 * scale, 28 * scale, 18 * scale, 6 * scale);
  g.lineStyle(2 * scale, edge, 0.9);
  g.strokeRoundedRect(x - 14 * scale, y - 1 * scale, 28 * scale, 18 * scale, 6 * scale);
}
