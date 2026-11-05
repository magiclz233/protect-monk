import Phaser from 'phaser';
import { getHeroConfig } from '../config/HeroConfig';
import { artifactKey, heroKey, heroShardKey, itemKey, soldierKey } from '../render/AssetKeys';
import { drawCardIcon } from '../render/VisualPainter';
import { ArtifactId, CardData, HeroRarity, ItemId } from '../types';
import { createCjkText } from '../core/TextStyles';
import { UI_TOKENS, UI_TYPE } from './DesignTokens';

/** 将召唤/仓库卡牌切成与素材同色的真实图标；缺失素材时回退程序化绘制。 */
export function createCardIconImage(
  scene: Phaser.Scene,
  card: CardData,
  width: number,
  height: number,
  fallbackSize?: number,
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  let key = '';

  if (card.type === 'soldier' && card.soldierType && card.soldierRank) {
    key = soldierKey(card.soldierType, card.soldierRank);
  } else if (card.type === 'hero' && card.heroId) {
    key = heroKey(card.heroId);
  } else if (card.type === 'hero_shard' && card.heroId) {
    key = heroShardKey(card.heroId);
  } else if (card.type === 'item' && card.itemId) {
    if (card.itemId === ItemId.HEADBAND) key = artifactKey(ArtifactId.HEADBAND);
    else key = itemKey(card.itemId);
  }

  if (key && scene.textures.exists(key)) {
    const image = scene.add.image(0, 0, key);
    const fit = Math.min(width / image.width, height / image.height, 1.2);
    image.setDisplaySize(image.width * fit, image.height * fit);
    container.add(image);
    return container;
  }

  const graphics = scene.add.graphics();
  graphics.setPosition(-(fallbackSize ?? width) / 2, -(fallbackSize ?? height) / 2);
  drawCardIcon(graphics, {
    card,
    size: fallbackSize ?? Math.max(width, height),
    heroRarity: card.heroId ? getHeroConfig(card.heroId)?.rarity : HeroRarity.NORMAL,
  });
  container.add(graphics);
  return container;
}

/**
 * 通用碎片专属角标：墨绿胶囊 + 鎏金描边 + 金色「通」字，
 * 与普通英雄碎片的「n/N」进度胶囊明确区分。
 * 容器锚点在右上角：图形绘制于 (-w, -h/2) ~ (0, h/2)，
 * 调用方只需把容器摆到卡片右上角即可贴合边缘。
 */
export function createUniversalShardMark(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const badge = scene.add.container(0, 0);

  const text = createCjkText(scene, 0, 0, '通', {
    fontSize: UI_TYPE.small,
    color: UI_TOKENS.textGoldOnDark,
    fontStyle: 'bold',
  });
  text.setOrigin(0.5);

  const w = Math.max(text.width + 14, 36);
  const h = Math.max(Math.ceil(text.height) + 4, 28);
  const pill = scene.add.graphics();
  pill.fillStyle(UI_TOKENS.pine950, 0.94);
  pill.fillRoundedRect(-w, -h / 2, w, h, h / 2);
  pill.lineStyle(2, UI_TOKENS.gold, 0.95);
  pill.strokeRoundedRect(-w, -h / 2, w, h, h / 2);
  text.setPosition(-w / 2, 0);

  badge.add([pill, text]);
  return badge;
}
