import Phaser from 'phaser';
import { eventMgr, GameEvent } from '../core/EventManager';
import { getHeroConfig } from '../config/HeroConfig';
import { Hero } from '../entities/Hero';
import { HeroShard } from '../entities/HeroShard';
import { GridManager } from '../grid/GridManager';
import type { UnitControlDelegate } from '../ui/DragMediator';
import { BattleSystem } from './BattleSystem';
import { EffectSystem } from './EffectSystem';
import { canUseUniversalShardCount } from './InventoryLogic';

export type HeroShardPlaceResult = 'placed' | 'stacked' | 'activated';

export function canPlaceHeroShardOnCell(gridMgr: GridManager, heroId: string, row: number, col: number): boolean {
  const cell = gridMgr.getCell(row, col);
  if (!cell) return false;
  if (gridMgr.canPlaceUnit(row, col)) return true;
  return cell.occupant instanceof HeroShard && cell.occupant.canStack(heroId);
}

export function canUseUniversalShardOnCell(gridMgr: GridManager, row: number, col: number): boolean {
  const occupant = gridMgr.getCell(row, col)?.occupant;
  return occupant instanceof HeroShard && canUseUniversalShardCount(occupant.count, occupant.needed);
}

export function placeHeroShardOnBoard(
  scene: Phaser.Scene,
  gridMgr: GridManager,
  battleSystem: BattleSystem,
  boardControl: UnitControlDelegate | undefined,
  heroId: string,
  row: number,
  col: number,
  amount: number = 1,
): HeroShardPlaceResult | null {
  const config = getHeroConfig(heroId);
  if (!config) return null;

  const cell = gridMgr.getCell(row, col);
  if (!cell) return null;

  if (cell.occupant instanceof HeroShard) {
    const shard = cell.occupant;
    if (!shard.canStack(heroId) || !shard.addShard(amount)) return null;
    if (shard.isComplete()) {
      activateHeroFromShard(scene, gridMgr, battleSystem, boardControl, shard);
      return 'activated';
    }
    return 'stacked';
  }

  if (!gridMgr.canPlaceUnit(row, col)) return null;

  const shard = new HeroShard(scene, heroId, amount);
  if (!gridMgr.placeUnit(row, col, shard)) {
    shard.destroy();
    return null;
  }

  shard.place(row, col);
  gridMgr.unitContainer.add(shard.sprite);
  boardControl?.makeControllable(shard);
  if (shard.isComplete()) {
    activateHeroFromShard(scene, gridMgr, battleSystem, boardControl, shard);
    return 'activated';
  }
  return 'placed';
}

export function placeUniversalShardOnBoard(
  scene: Phaser.Scene,
  gridMgr: GridManager,
  battleSystem: BattleSystem,
  boardControl: UnitControlDelegate | undefined,
  row: number,
  col: number,
  amount: number = 1,
): HeroShardPlaceResult | null {
  const occupant = gridMgr.getCell(row, col)?.occupant;
  if (!(occupant instanceof HeroShard) || !occupant.addShard(amount)) return null;

  if (occupant.isComplete()) {
    activateHeroFromShard(scene, gridMgr, battleSystem, boardControl, occupant);
    return 'activated';
  }

  return 'stacked';
}

function activateHeroFromShard(
  scene: Phaser.Scene,
  gridMgr: GridManager,
  battleSystem: BattleSystem,
  boardControl: UnitControlDelegate | undefined,
  shard: HeroShard,
): void {
  const config = getHeroConfig(shard.heroId);
  if (!config) return;

  const row = shard.gridRow;
  const col = shard.gridCol;
  const center = gridMgr.cellCenter(row, col);
  gridMgr.removeUnit(row, col);
  shard.destroy();

  const hero = new Hero(scene, config);
  if (!gridMgr.placeUnit(row, col, hero)) {
    hero.sprite.destroy();
    return;
  }

  hero.place(row, col);
  gridMgr.unitContainer.add(hero.sprite);
  battleSystem.addAlly(hero);
  boardControl?.makeControllable(hero);
  EffectSystem.forScene(scene).playRing(center.x, center.y, {
    radius: gridMgr.cellSize * 0.52,
    color: 0xffd36a,
    alpha: 0.9,
    lineWidth: 4,
    depth: 96,
    scaleTo: 1.35,
    duration: 320,
  });
  eventMgr.emit(GameEvent.HERO_ACTIVATED, hero);
}
