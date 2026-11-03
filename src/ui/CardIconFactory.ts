import Phaser from 'phaser';
import { getHeroConfig } from '../config/HeroConfig';
import { artifactKey, heroKey, heroShardKey, itemKey, soldierKey } from '../render/AssetKeys';
import { drawCardIcon } from '../render/VisualPainter';
import { ArtifactId, CardData, HeroRarity, ItemId } from '../types';

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
