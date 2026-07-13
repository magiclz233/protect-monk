import Phaser from 'phaser';
import { eventMgr, GameEvent } from '../core/EventManager';
import { gameMgr } from '../core/GameManager';
import { createCjkText } from '../core/TextStyles';
import { Hero } from '../entities/Hero';
import { HeroShard } from '../entities/HeroShard';
import { Soldier } from '../entities/Soldier';
import { Unit } from '../entities/Unit';
import { GridManager } from '../grid/GridManager';
import { BattleSystem } from '../systems/BattleSystem';
import { createCardFromBoardOccupant } from '../systems/BoardCardUtils';
import { ExperienceSystem } from '../systems/ExperienceSystem';
import { canMergeHeroForUpgrade } from '../systems/HeroUpgradeLogic';
import { MergeSystem } from '../systems/MergeSystem';
import { CellState } from '../types';
import { BATTLE_UI } from './BattleUiPrimitives';
import { DragMediator, UnitControlDelegate } from './DragMediator';

type BoardOccupant = Unit | HeroShard;

const RECYCLE_X = 600;
const RECYCLE_Y = 720;
const RECYCLE_W = 108;
const RECYCLE_H = 66;

export class BoardUnitControlView implements UnitControlDelegate {
  readonly container: Phaser.GameObjects.Container;

  private readonly bound = new WeakSet<object>();
  private readonly recycleBg: Phaser.GameObjects.Graphics;
  private readonly tipText: Phaser.GameObjects.Text;
  private readonly unitPlacedHandler = (_row: number, _col: number, occupant: unknown): void => {
    if (this.isBoardOccupant(occupant)) {
      this.makeControllable(occupant);
    }
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly gridMgr: GridManager,
    private readonly battleSystem: BattleSystem,
    private readonly dragMediator: DragMediator,
  ) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(96);

    this.recycleBg = scene.add.graphics();
    this.tipText = createCjkText(scene, RECYCLE_X + RECYCLE_W / 2, RECYCLE_Y + RECYCLE_H / 2, '回收', {
      fontSize: '20px',
      color: '#ffd36a',
      fontStyle: 'bold',
    });
    this.tipText.setOrigin(0.5);
    this.container.add([this.recycleBg, this.tipText]);
    this.drawRecycle(false);
    eventMgr.on(GameEvent.UNIT_PLACED, this.unitPlacedHandler);

    // 向 Mediator 注册：自己是棋盘单位的可操控委托
    this.dragMediator.setUnitControlDelegate(this);
  }

  destroy(): void {
    eventMgr.off(GameEvent.UNIT_PLACED, this.unitPlacedHandler);
    this.container.destroy(true);
  }

  // ==================== UnitControlDelegate 实现 ====================

  makeControllable(occupant: BoardOccupant): void {
    if (this.bound.has(occupant)) return;
    this.bound.add(occupant);

    const sprite = occupant.sprite;
    sprite.setSize(64, 64);
    sprite.setInteractive(new Phaser.Geom.Rectangle(-32, -32, 64, 64), Phaser.Geom.Rectangle.Contains);
    this.scene.input.setDraggable(sprite);

    let originRow = occupant.gridRow;
    let originCol = occupant.gridCol;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let originUnitDepth = this.gridMgr.unitContainer.depth;
    let dragShadow: Phaser.GameObjects.Ellipse | null = null;

    sprite.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      originRow = occupant.gridRow;
      originCol = occupant.gridCol;
      if (this.isInteractionLocked()) {
        occupant.place(originRow, originCol);
        return;
      }
      originUnitDepth = this.gridMgr.unitContainer.depth;
      const point = this.getPointerWorld(pointer);
      dragOffsetX = point.x - sprite.x;
      dragOffsetY = point.y - sprite.y;
      this.gridMgr.unitContainer.setDepth(130);
      this.gridMgr.unitContainer.bringToTop(sprite);

      this.scene.tweens.add({
        targets: sprite,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 120,
        ease: 'Back.Out',
      });
      dragShadow = this.scene.add.ellipse(sprite.x, sprite.y + 10, 36, 12, 0x000000, 0.35);
      dragShadow.setDepth(129);
      this.gridMgr.unitContainer.add(dragShadow);

      this.drawRecycle(false);
      this.container.setVisible(true);
    });

    sprite.on('drag', (pointer: Phaser.Input.Pointer) => {
      if (this.isInteractionLocked()) return;
      const point = this.getPointerWorld(pointer);
      sprite.setPosition(point.x - dragOffsetX, point.y - dragOffsetY);
      if (dragShadow) {
        dragShadow.setPosition(point.x - dragOffsetX, point.y - dragOffsetY + 10);
      }
      this.drawRecycle(this.isRecyclePoint(point.x, point.y));
    });

    sprite.on('dragend', (pointer: Phaser.Input.Pointer) => {
      const point = this.getPointerWorld(pointer);
      this.gridMgr.unitContainer.setDepth(originUnitDepth);
      this.drawRecycle(false);

      if (dragShadow) {
        dragShadow.destroy();
        dragShadow = null;
      }

      this.scene.tweens.add({
        targets: sprite,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Back.Out',
      });

      if (this.isInteractionLocked()) {
        occupant.place(originRow, originCol);
        return;
      }

      if (this.isRecyclePoint(point.x, point.y)) {
        this.removeOccupant(occupant);
        return;
      }

      if (this.tryStoreOccupant(occupant, point.x, point.y)) {
        return;
      }

      if (this.tryDropOccupant(occupant, originRow, originCol, point.x, point.y)) {
        return;
      }

      occupant.place(originRow, originCol);
    });
  }

  // ==================== 内部：拖放路由（通过 Mediator） ====================

  private tryStoreOccupant(occupant: BoardOccupant, worldX: number, worldY: number): boolean {
    if (this.isInteractionLocked()) return false;
    if (!(occupant instanceof Soldier) && !(occupant instanceof Hero) && !(occupant instanceof HeroShard)) {
      return false;
    }

    const card = createCardFromBoardOccupant(occupant);

    // 通过 Mediator 查找卡槽目标（原 SummonPanel）
    const cardSlotTarget = this.dragMediator.findCardSlotTarget(worldX, worldY);
    if (cardSlotTarget) {
      if (!cardSlotTarget.addCardAtPoint(card, worldX, worldY)) return false;
      this.removeOccupant(occupant);
      return true;
    }

    // 通过 Mediator 查找仓库目标（原 InventoryBarView）
    const inventoryTarget = this.dragMediator.findInventoryTarget(worldX, worldY);
    if (inventoryTarget) {
      if (!inventoryTarget.addCard(card)) return false;
      this.removeOccupant(occupant);
      return true;
    }

    return false;
  }

  private tryDropOccupant(occupant: BoardOccupant, originRow: number, originCol: number, worldX: number, worldY: number): boolean {
    if (this.isInteractionLocked()) return false;
    const target = this.gridMgr.worldToCell(worldX, worldY);
    if (!target) return false;
    if (target.row === originRow && target.col === originCol) {
      occupant.place(originRow, originCol);
      return true;
    }

    const targetCell = this.gridMgr.getCell(target.row, target.col);
    if (!targetCell || this.gridMgr.isPathCell(target.row, target.col) || targetCell.state === CellState.LOCKED) {
      return false;
    }

    if (targetCell.state === CellState.OCCUPIED) {
      const other = targetCell.occupant;
      if (occupant instanceof Soldier && other instanceof Soldier) {
        if (MergeSystem.getInstance().tryMergeDraggedSoldier(this.gridMgr, this.battleSystem, occupant, other)) {
          return true;
        }
      }

      if (occupant instanceof Hero && other instanceof Hero) {
        return this.tryMergeDraggedHero(occupant, other);
      }

      if (occupant instanceof Hero || other instanceof Hero || occupant instanceof HeroShard || other instanceof HeroShard) {
        return false;
      }

      if (!this.gridMgr.swapUnits(originRow, originCol, target.row, target.col)) return false;
      occupant.place(target.row, target.col);
      if (this.isBoardOccupant(other)) {
        other.place(originRow, originCol);
      }
      return true;
    }

    if (!this.gridMgr.moveUnit(originRow, originCol, target.row, target.col)) return false;
    occupant.place(target.row, target.col);
    return true;
  }

  private tryMergeDraggedHero(source: Hero, target: Hero): boolean {
    if (this.isInteractionLocked()) return false;
    if (!canMergeHeroForUpgrade(source, target)) return false;

    const sourceRow = source.gridRow;
    const sourceCol = source.gridCol;
    this.battleSystem.removeAlly(source);
    ExperienceSystem.getInstance().unregisterHero(source);
    this.gridMgr.removeUnit(sourceRow, sourceCol);
    source.sprite.destroy();
    target.levelUp();
    return true;
  }

  private removeOccupant(occupant: BoardOccupant): void {
    if (occupant.gridRow >= 0 && occupant.gridCol >= 0) {
      this.gridMgr.removeUnit(occupant.gridRow, occupant.gridCol);
    }

    if (occupant instanceof Unit) {
      this.battleSystem.removeAlly(occupant);
      if (occupant instanceof Hero) {
        ExperienceSystem.getInstance().unregisterHero(occupant);
      }
      occupant.sprite.destroy();
      return;
    }

    occupant.destroy();
  }

  // ==================== 内部：渲染辅助 ====================

  private drawRecycle(active: boolean): void {
    this.recycleBg.clear();
    this.recycleBg.fillStyle(active ? 0x9f2d35 : BATTLE_UI.surfaceSoft, active ? 0.98 : 0.9);
    this.recycleBg.fillRoundedRect(RECYCLE_X, RECYCLE_Y, RECYCLE_W, RECYCLE_H, 8);
    this.recycleBg.lineStyle(2, active ? BATTLE_UI.goldLight : 0xffffff, active ? 0.85 : 0.18);
    this.recycleBg.strokeRoundedRect(RECYCLE_X, RECYCLE_Y, RECYCLE_W, RECYCLE_H, 8);
    this.tipText.setText(active ? '松手回收' : '回收');
  }

  private isRecyclePoint(x: number, y: number): boolean {
    return x >= RECYCLE_X && x <= RECYCLE_X + RECYCLE_W && y >= RECYCLE_Y && y <= RECYCLE_Y + RECYCLE_H;
  }

  private isBoardOccupant(value: unknown): value is BoardOccupant {
    return value instanceof Unit || value instanceof HeroShard;
  }

  private isInteractionLocked(): boolean {
    return !gameMgr.isPlaying;
  }

  private getPointerWorld(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    return {
      x: pointer.worldX ?? pointer.x,
      y: pointer.worldY ?? pointer.y,
    };
  }
}
