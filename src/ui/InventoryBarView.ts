import Phaser from 'phaser';
import { gameMgr } from '../core/GameManager';
import { getHeroConfig } from '../config/HeroConfig';
import { ITEM_VISUALS } from '../config/VisualConfig';
import { createCjkText } from '../core/TextStyles';
import { Hero } from '../entities/Hero';
import { Soldier } from '../entities/Soldier';
import { GridManager } from '../grid/GridManager';
import { AdSystem } from '../systems/AdSystem';
import { BattleSystem } from '../systems/BattleSystem';
import { createHeroFromCard, createSoldierFromCard } from '../systems/BoardCardUtils';
import {
  canPlaceHeroShardOnCell,
  canUseUniversalShardOnCell,
  placeHeroShardOnBoard,
  placeUniversalShardOnBoard,
} from '../systems/HeroShardMergeSystem';
import { canMergeHeroForUpgrade } from '../systems/HeroUpgradeLogic';
import {
  canStoreInInventory,
  INITIAL_INVENTORY_SLOT_LIMIT,
  InventorySlot,
  MAX_INVENTORY_SLOT_LIMIT,
} from '../systems/InventoryLogic';
import { ItemSystem } from '../systems/ItemSystem';
import { MergeSystem } from '../systems/MergeSystem';
import { CardData, CardType, CellState, HeroRarity, ItemId, SoldierRank } from '../types';
import { UI_TOKENS, UI_TYPE, drawLacquerPanel, drawPaperPanel, createUiButton, playUiPress } from './DesignTokens';
import { createCardIconImage, createUniversalShardMark } from './CardIconFactory';
import { FEEDBACK_TEXT } from './FeedbackOverlay';
import { DragMediator, CardSlotDropTarget, InventoryDropTarget } from './DragMediator';

interface InventorySlotView {
  card: CardData;
  container: Phaser.GameObjects.Container;
  hitZone: Phaser.GameObjects.Zone;
  slotIndex: number;
  homeX: number;
  homeY: number;
  dragOffsetX: number;
  dragOffsetY: number;
}

const BAR_X = 32;
const BAR_Y = 922;
const BAR_W = 686;
const BAR_H = 76;
const SLOT_SIZE = 50;
const SLOT_GAP = 7;
const SLOT_START_X = 134;
const SLOT_Y = BAR_Y + 14;

// 卡槽 / 仓库满的统一提示文案（与 SummonPanel 保持一致）
const TIP_CARD_SLOT_FULL = '卡槽已满，先上阵或入库';
const TIP_INVENTORY_FULL = '仓库已满，先扩容或腾出空位';
// 点碎片判定：pointerup 位移小于该阈值才算「点」，不干扰拖拽
const TAP_THRESHOLD = 10;

export class InventoryBarView implements InventoryDropTarget {
  readonly container: Phaser.GameObjects.Container;

  private readonly _slots: InventorySlot[] = Array(MAX_INVENTORY_SLOT_LIMIT).fill(null);
  private readonly _slotPositions: Array<{ x: number; y: number }> = [];
  private readonly _slotViews: Array<InventorySlotView | null> = Array(MAX_INVENTORY_SLOT_LIMIT).fill(null);
  private readonly _highlight: Phaser.GameObjects.Graphics;
  private readonly _fullHighlight: Phaser.GameObjects.Graphics;
  private _detailPanel: Phaser.GameObjects.Container | null = null;
  private _tipText: Phaser.GameObjects.Text | null = null;
  private _tipValue = '';
  private _destroyed = false;
  private _expandPending = false;
  private _expandRequestId = 0;
  private _slotLimit = INITIAL_INVENTORY_SLOT_LIMIT;
  private _tipTimer?: Phaser.Time.TimerEvent;
  private _lastTipAt = -1000;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly gridMgr: GridManager,
    private readonly battleSystem: BattleSystem,
    private readonly dragMediator: DragMediator,
  ) {
    this.container = scene.add.container(0, 0);
    this.container.setDepth(88);

    this._highlight = scene.add.graphics();
    this._highlight.setDepth(82);
    this._highlight.setVisible(false);
    // 仓库栏满格高亮：独立于 container，避免被 _redraw 的 removeAll 清掉
    this._fullHighlight = scene.add.graphics();
    this._fullHighlight.setDepth(120);
    this._fullHighlight.fillStyle(UI_TOKENS.cinnabar, 0.12);
    this._fullHighlight.fillRoundedRect(BAR_X, BAR_Y, BAR_W, BAR_H, 10);
    this._fullHighlight.lineStyle(4, UI_TOKENS.goldLight, 0.95);
    this._fullHighlight.strokeRoundedRect(BAR_X, BAR_Y, BAR_W, BAR_H, 10);
    this._fullHighlight.setVisible(false);

    // 向 Mediator 注册为仓库放置目标
    this.dragMediator.registerInventoryTarget(this);

    this._redraw();
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._expandPending = false;
    this._expandRequestId++;
    this._tipTimer?.remove(false);
    this._tipTimer = undefined;
    if (this._tipText) this.scene.tweens.killTweensOf(this._tipText);
    this.scene.tweens.killTweensOf(this._fullHighlight);
    this._closeDetailPanel();
    this.dragMediator.unregister(this);
    this._highlight.destroy();
    this._fullHighlight.destroy();
    this.container.destroy(true);
    this._tipText = null;
  }

  // ==================== InventoryDropTarget 实现 ====================

  containsPoint(x: number, y: number): boolean {
    return x >= BAR_X && x <= BAR_X + BAR_W && y >= BAR_Y && y <= BAR_Y + BAR_H;
  }

  addCard(card: CardData): boolean {
    if (!canStoreInInventory(card)) {
      this._showTip('这类卡牌不能入库');
      return false;
    }

    const slotIndex = this._slots.findIndex((slot, index) => index < this._slotLimit && slot === null);
    if (slotIndex < 0) {
      // 仓库满：不改动已有卡，统一文案 + 高亮仓库区域
      this._showTip(TIP_INVENTORY_FULL);
      this._flashInventoryHighlight();
      return false;
    }

    this._slots[slotIndex] = card;
    this._showTip(`${card.displayName} 已入库`);
    this._redraw();
    return true;
  }

  get slotLimit(): number {
    return this._slotLimit;
  }

  get storedCount(): number {
    return this._slots.slice(0, this._slotLimit).filter(Boolean).length;
  }

  /** 仓库满时闪烁高亮整个仓库栏，提示先扩容或腾位 */
  private _flashInventoryHighlight(): void {
    const g = this._fullHighlight;
    g.setAlpha(0);
    g.setVisible(true);
    this.scene.tweens.killTweensOf(g);
    this.scene.tweens.add({
      targets: g,
      alpha: 1,
      duration: 160,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (!this._destroyed) g.setVisible(false);
      },
    });
  }

  private _isShardCard(card: CardData): boolean {
    return card.type === CardType.HERO_SHARD
      || (card.type === CardType.ITEM && card.itemId === ItemId.UNIVERSAL_SHARD);
  }

  /** 点碎片弹出底部半层详情：可激活英雄与消耗，不遮整盘 */
  private _showShardDetail(card: CardData): void {
    this._closeDetailPanel();
    const parts: Phaser.GameObjects.GameObject[] = [];
    const panel = this.scene.add.container(0, 0);
    panel.setDepth(400);

    // 轻遮罩只覆盖下半屏，点任意处关闭
    const dim = this.scene.add.graphics();
    dim.fillStyle(0x0a1e19, 0.55);
    dim.fillRect(0, 620, 750, 714);
    const dimHit = this.scene.add.zone(375, 977, 750, 714);
    dimHit.setOrigin(0.5);
    dimHit.setInteractive();
    dimHit.on('pointerdown', () => this._closeDetailPanel());
    parts.push(dim, dimHit);

    const sheetX = 40;
    const sheetY = 700;
    const sheetW = 670;
    const sheetH = 440;
    const bg = this.scene.add.graphics();
    drawLacquerPanel(bg, sheetX, sheetY, sheetW, sheetH, { radius: 20 });
    parts.push(bg);

    // 内容区用宣纸面板，与叙事层呼应
    const inner = this.scene.add.graphics();
    drawPaperPanel(inner, sheetX + 20, sheetY + 20, sheetW - 40, sheetH - 120, { radius: 14 });
    parts.push(inner);

    const title = createCjkText(this.scene, 375, sheetY + 48, card.displayName, {
      fontSize: UI_TYPE.heading,
      color: UI_TOKENS.textOnPaper,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    parts.push(title);

    const body = createCjkText(this.scene, sheetX + 48, sheetY + 100, this._buildShardDetailLines(card).join('\n'), {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textMutedOnPaper,
      align: 'left',
      lineSpacing: 12,
      wordWrap: { width: sheetW - 96, useAdvancedWrap: true },
    });
    body.setOrigin(0, 0);
    parts.push(body);

    parts.push(createUiButton(this.scene, {
      x: 245, y: sheetY + sheetH - 92, width: 260, height: 76,
      label: '知道了',
      secondary: true,
      onClick: () => this._closeDetailPanel(),
    }));

    panel.add(parts);
    this._detailPanel = panel;
  }

  private _buildShardDetailLines(card: CardData): string[] {
    if (card.itemId === ItemId.UNIVERSAL_SHARD) {
      return [
        '类型：通用碎片（可补任意英雄）',
        '可激活英雄：任意尚未集齐的英雄碎片',
        '消耗：1 枚通用碎片补 1 格进度',
        '用法：拖到棋盘上已有的英雄碎片上',
      ];
    }
    const config = card.heroId ? getHeroConfig(card.heroId) : undefined;
    const need = config?.shardsNeeded ?? 2;
    const count = Math.min(card.shardCount ?? 1, need);
    const heroName = config?.name ?? card.displayName;
    const rarity = config?.rarity === HeroRarity.CORE ? '核心' : '普通';
    return [
      `可激活英雄：${heroName}（${rarity}）`,
      `激活进度：${count}/${need} 枚`,
      `消耗：集齐 ${need} 枚同名碎片自动激活`,
      count < need ? `还差 ${need - count} 枚碎片，继续召唤或补位` : '已集齐，放到棋盘即可激活',
    ];
  }

  private _closeDetailPanel(): void {
    this._detailPanel?.destroy(true);
    this._detailPanel = null;
  }

  private _redraw(): void {
    if (this._tipText) this.scene.tweens.killTweensOf(this._tipText);
    this.container.removeAll(true);
    this._slotPositions.length = 0;
    this._slotViews.fill(null);

    const bg = this.scene.add.graphics();
    drawLacquerPanel(bg, BAR_X, BAR_Y, BAR_W, BAR_H, {
      radius: 10,
    });
    bg.fillStyle(UI_TOKENS.paperLight, 0.05);
    bg.fillRoundedRect(BAR_X + 94, BAR_Y + 10, BAR_W - 180, BAR_H - 20, 8);

    const title = createCjkText(this.scene, BAR_X + 18, BAR_Y + 26, '仓库栏', {
      fontSize: UI_TYPE.small,
      color: '#f2d484',
      fontStyle: 'bold',
    });
    title.setOrigin(0, 0.5);

    const hint = createCjkText(this.scene, BAR_X + 18, BAR_Y + 58, '卡牌暂存', {
      fontSize: UI_TYPE.small,
      color: '#d7cba6',
    });
    hint.setOrigin(0, 0.5);

    this._tipText = createCjkText(this.scene, 375, 660, this._tipValue, {
      fontSize: UI_TYPE.label,
      color: '#252a26',
      fontStyle: 'bold',
      backgroundColor: '#d8a64a',
      padding: { x: 22, y: 10 },
    });
    this._tipText.setOrigin(0.5);
    this._tipText.setDepth(300);
    this._tipText.setAlpha(this._tipValue ? 1 : 0);

    this.container.add([bg, title, hint, this._tipText]);

    for (let i = 0; i < this._slotLimit; i++) {
      const x = SLOT_START_X + i * (SLOT_SIZE + SLOT_GAP);
      const y = SLOT_Y;
      this._slotPositions[i] = { x, y };
      this.container.add(this._createSlotBg(x, y));
      if (this._slots[i]) {
        this._renderCard(i);
      }
    }

    if (this._slotLimit < MAX_INVENTORY_SLOT_LIMIT) {
      this._renderExpandButton();
    }
  }

  private _createSlotBg(x: number, y: number): Phaser.GameObjects.Graphics {
    const slot = this.scene.add.graphics();
    slot.fillStyle(UI_TOKENS.pine950, 0.77);
    slot.fillRoundedRect(x, y, SLOT_SIZE, SLOT_SIZE, 8);
    this._strokeDashedRect(slot, x + 4, y + 4, SLOT_SIZE - 8, SLOT_SIZE - 8, 0xfff5da, 0.55);
    return slot;
  }

  /** 虚线描边：沿矩形四边画短直线段，模拟设计稿的虚线格 */
  private _strokeDashedRect(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, width: number, height: number,
    color: number, alpha: number, dash = 7, gap = 5,
  ): void {
    const draw = (x1: number, y1: number, x2: number, y2: number): void => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      let t = 0;
      while (t < len) {
        const end = Math.min(t + dash, len);
        g.lineBetween(x1 + ux * t, y1 + uy * t, x1 + ux * end, y1 + uy * end);
        t = end + gap;
      }
    };
    g.lineStyle(2, color, alpha);
    draw(x, y, x + width, y);
    draw(x + width, y, x + width, y + height);
    draw(x + width, y + height, x, y + height);
    draw(x, y + height, x, y);
  }

  private _renderCard(slotIndex: number): void {
    const card = this._slots[slotIndex];
    const pos = this._slotPositions[slotIndex];
    if (!card || !pos) return;

    const view = this.scene.add.container(pos.x, pos.y);
    const visual = this._getCardVisual(card);

    const bg = this.scene.add.graphics();
    bg.fillStyle(visual.fill, 0.98);
    bg.fillRoundedRect(0, 0, SLOT_SIZE, SLOT_SIZE, 8);
    bg.lineStyle(visual.lineWidth, visual.stroke, visual.alpha);
    bg.strokeRoundedRect(0, 0, SLOT_SIZE, SLOT_SIZE, 8);
    if (visual.glow) {
      bg.lineStyle(3, 0xf2d484, 0.3);
      bg.strokeRoundedRect(-3, -3, SLOT_SIZE + 6, SLOT_SIZE + 6, 10);
    }

    const icon = createCardIconImage(this.scene, card, 38, 34, 30);
    icon.setPosition(SLOT_SIZE / 2, 20);

    const name = createCjkText(this.scene, SLOT_SIZE / 2, SLOT_SIZE - 2, visual.label, {
      fontSize: UI_TYPE.small,
      color: '#fff5da',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: SLOT_SIZE - 4, useAdvancedWrap: true },
    });
    name.setOrigin(0.5, 1);

    const hitZone = this.scene.add.zone(SLOT_SIZE / 2, SLOT_SIZE / 2, SLOT_SIZE, SLOT_SIZE);
    hitZone.setOrigin(0.5);
    hitZone.setInteractive({ useHandCursor: true });
    this.scene.input.setDraggable(hitZone);

    const parts: Phaser.GameObjects.GameObject[] = [bg, icon, name];
    const badge = this._createCardBadge(card);
    if (badge) parts.push(badge);
    parts.push(hitZone);

    view.add(parts);
    this.container.add(view);

    const slotView: InventorySlotView = {
      card,
      container: view,
      hitZone,
      slotIndex,
      homeX: pos.x,
      homeY: pos.y,
      dragOffsetX: 0,
      dragOffsetY: 0,
    };
    this._slotViews[slotIndex] = slotView;
    this._bindDrag(slotView);
  }

  /** 碎片角标：英雄碎片显示激活进度 n/N，通用碎片显示金色「通」 */
  private _createCardBadge(card: CardData): Phaser.GameObjects.Container | null {
    if (card.itemId === ItemId.UNIVERSAL_SHARD) {
      const mark = createUniversalShardMark(this.scene);
      mark.setPosition(SLOT_SIZE - 2, 3);
      return mark;
    }
    if (card.type !== CardType.HERO_SHARD || !card.heroId) return null;
    const needed = getHeroConfig(card.heroId)?.shardsNeeded ?? 2;
    const label = `${card.shardCount ?? 1}/${needed}`;

    const text = createCjkText(this.scene, 0, 0, label, {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textOnDark,
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);

    const w = Math.max(text.width + 14, 38);
    const h = Math.max(Math.ceil(text.height) + 6, 26);
    const pill = this.scene.add.graphics();
    pill.fillStyle(UI_TOKENS.pine950, 0.92);
    pill.fillRoundedRect(-w, -h / 2, w, h, h / 2);
    pill.lineStyle(1.5, UI_TOKENS.gold, 0.75);
    pill.strokeRoundedRect(-w, -h / 2, w, h, h / 2);
    text.setPosition(-w / 2, 0);

    const badge = this.scene.add.container(SLOT_SIZE - 2, 3);
    badge.add([pill, text]);
    return badge;
  }

  private _renderExpandButton(): void {
    const x = BAR_X + BAR_W - 88;
    const y = BAR_Y + 7;
    const w = 76;
    const h = 62;
    const label = AdSystem.getInstance().hasRewardedVideo('extraSummon') ? '广告\n扩容' : '免费\n扩容';

    const button = this.scene.add.container(x + w / 2, y + h / 2);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x091e19, 1);
    bg.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 10);
    bg.fillStyle(UI_TOKENS.pine900, 0.96);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    bg.lineStyle(2, UI_TOKENS.gold, 0.7);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);

    const text = createCjkText(this.scene, 0, 0, label, {
      fontSize: UI_TYPE.small,
      color: '#f2d484',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 2,
    });
    text.setOrigin(0.5);

    const hit = this.scene.add.zone(0, 0, w, h);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      playUiPress(this.scene, button);
      void this._expandSlot();
    });

    button.add([bg, text, hit]);
    this.container.add(button);
  }

  private _bindDrag(slotView: InventorySlotView): void {
    let pressX = 0;
    let pressY = 0;
    // 点碎片（位移很小、非拖拽）弹出半层详情；原有拖拽逻辑保持不变
    slotView.hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pressX = pointer.x;
      pressY = pointer.y;
    });
    slotView.hitZone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (Math.hypot(pointer.x - pressX, pointer.y - pressY) > TAP_THRESHOLD) return;
      if (this._isInteractionLocked() || this._destroyed) return;
      if (this._isShardCard(slotView.card)) this._showShardDetail(slotView.card);
    });

    slotView.hitZone.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      if (this._isInteractionLocked()) {
        slotView.container.setPosition(slotView.homeX, slotView.homeY);
        this._showTip('暂停中不能操作仓库');
        return;
      }
      const pointerWorld = this._getPointerWorld(pointer);
      slotView.dragOffsetX = pointerWorld.x - slotView.container.x;
      slotView.dragOffsetY = pointerWorld.y - slotView.container.y;
      this.container.setDepth(132);
      this.container.bringToTop(slotView.container);
      slotView.container.setScale(1.06);
    });

    slotView.hitZone.on('drag', (pointer: Phaser.Input.Pointer) => {
      if (this._isInteractionLocked()) return;
      const point = this._getPointerWorld(pointer);
      slotView.container.setPosition(point.x - slotView.dragOffsetX, point.y - slotView.dragOffsetY);
      this._updateHighlight(slotView.card, point.x, point.y);
    });

    slotView.hitZone.on('dragend', (pointer: Phaser.Input.Pointer) => {
      this._highlight.setVisible(false);
      if (this._isInteractionLocked()) {
        this.container.setDepth(88);
        slotView.container.setScale(1);
        slotView.container.setPosition(slotView.homeX, slotView.homeY);
        this._showTip('暂停中不能操作仓库');
        return;
      }
      const point = this._getPointerWorld(pointer);
      slotView.container.setScale(1);
      const used = this._tryUseSlot(slotView, point.x, point.y);
      this.container.setDepth(88);
      if (!used) {
        slotView.container.setPosition(slotView.homeX, slotView.homeY);
        // 回弹必须有文字反馈：本次使用若未给出具体原因，补一条兜底提示
        if (this.scene.time.now - this._lastTipAt > 80) {
          this._showTip('这里不能使用，请拖到可布阵格或卡槽');
        }
      }
    });
  }

  private _tryUseSlot(slotView: InventorySlotView, worldX: number, worldY: number): boolean {
    if (this._isInteractionLocked()) {
      this._showTip('暂停中不能操作仓库');
      return false;
    }

    const cardSlotTarget = this.dragMediator.findCardSlotTarget(worldX, worldY);
    if (cardSlotTarget) {
      if (!cardSlotTarget.addCardAtPoint(slotView.card, worldX, worldY)) {
        // 卡槽满：仓库卡不清空，统一文案提示
        this._showTip(TIP_CARD_SLOT_FULL);
        return false;
      }
      this._clearSlots([slotView.slotIndex]);
      this._showTip('卡牌已放入卡槽');
      this._redraw();
      return true;
    }

    if (slotView.card.type === CardType.SOLDIER && slotView.card.soldierType) {
      return this._tryUseSoldier(slotView, worldX, worldY);
    }

    if (slotView.card.type === CardType.HERO_SHARD && slotView.card.heroId) {
      return this._tryUseHeroShard(slotView, worldX, worldY);
    }

    if (slotView.card.type === CardType.HERO && slotView.card.heroId) {
      return this._tryUseHero(slotView, worldX, worldY);
    }

    if (slotView.card.type === CardType.ITEM && slotView.card.itemId) {
      return this._tryUseItem(slotView, worldX, worldY);
    }

    this._showTip('这张卡不能在这里使用');
    return false;
  }

  private _tryUseSoldier(slotView: InventorySlotView, worldX: number, worldY: number): boolean {
    const soldierType = slotView.card.soldierType;
    if (!soldierType) return false;
    const rank = slotView.card.soldierRank ?? SoldierRank.WHITE;

    const cell = this.gridMgr.worldToCell(worldX, worldY);
    if (!cell) {
      this._showTip('请拖到棋盘的可布阵格');
      return false;
    }

    const target = this.gridMgr.getCell(cell.row, cell.col)?.occupant;
    if (target instanceof Soldier) {
      const merged = MergeSystem.getInstance().tryMergeSoldierCard(
        this.gridMgr,
        cell.row,
        cell.col,
        soldierType,
        rank,
      );
      if (!merged) {
        this._showTip('只能和同名同级小兵合成');
        return false;
      }
      this._clearSlots([slotView.slotIndex]);
      this._showTip('小兵已合成');
      this._redraw();
      return true;
    }

    if (!this.gridMgr.canPlaceUnit(cell.row, cell.col)) {
      this._showTip(this._getCellBlockReason(cell.row, cell.col));
      return false;
    }

    const soldier = createSoldierFromCard(this.scene, slotView.card);
    if (!soldier) return false;
    if (!this.gridMgr.placeUnit(cell.row, cell.col, soldier)) {
      soldier.sprite.destroy();
      this._showTip(this._getCellBlockReason(cell.row, cell.col));
      return false;
    }

    soldier.place(cell.row, cell.col);
    this.gridMgr.unitContainer.add(soldier.sprite);
    this.battleSystem.addAlly(soldier);
    this.dragMediator.makeControllable(soldier);
    this._clearSlots([slotView.slotIndex]);
    this._showTip('小兵已上阵');
    this._redraw();
    return true;
  }

  private _tryUseHeroShard(slotView: InventorySlotView, worldX: number, worldY: number): boolean {
    const heroId = slotView.card.heroId;
    if (!heroId) return false;

    const cell = this.gridMgr.worldToCell(worldX, worldY);
    if (!cell) {
      this._showTip('请拖到棋盘的可布阵格');
      return false;
    }

    const result = placeHeroShardOnBoard(
      this.scene,
      this.gridMgr,
      this.battleSystem,
      this.dragMediator,
      heroId,
      cell.row,
      cell.col,
      slotView.card.shardCount ?? 1,
    );
    if (!result) {
      this._showTip(this._getShardPlaceFailTip(cell.row, cell.col));
      return false;
    }

    this._clearSlots([slotView.slotIndex]);
    this._showTip(result === 'activated' ? '英雄已合成' : '碎片已放置');
    this._redraw();
    return true;
  }

  private _tryUseHero(slotView: InventorySlotView, worldX: number, worldY: number): boolean {
    const cell = this.gridMgr.worldToCell(worldX, worldY);
    if (!cell) {
      this._showTip('请拖到棋盘的可布阵格');
      return false;
    }

    const target = this.gridMgr.getCell(cell.row, cell.col)?.occupant;
    if (target instanceof Hero) {
      const source = {
        heroId: slotView.card.heroId!,
        level: slotView.card.heroLevel ?? 1,
        maxLevel: target.maxLevel,
      };
      if (!canMergeHeroForUpgrade(source, target)) {
        this._showTip('只能低等级同名英雄合入高等级英雄');
        return false;
      }
      target.levelUp();
      this._clearSlots([slotView.slotIndex]);
      this._showTip('英雄已升级');
      this._redraw();
      return true;
    }

    if (!this.gridMgr.canPlaceUnit(cell.row, cell.col)) {
      this._showTip(this._getCellBlockReason(cell.row, cell.col));
      return false;
    }

    const hero = createHeroFromCard(this.scene, slotView.card);
    if (!hero) return false;
    if (!this.gridMgr.placeUnit(cell.row, cell.col, hero)) {
      hero.sprite.destroy();
      this._showTip(this._getCellBlockReason(cell.row, cell.col));
      return false;
    }

    hero.place(cell.row, cell.col);
    this.gridMgr.unitContainer.add(hero.sprite);
    this.battleSystem.addAlly(hero);
    this.dragMediator.makeControllable(hero);
    this._clearSlots([slotView.slotIndex]);
    this._showTip('英雄已上阵');
    this._redraw();
    return true;
  }

  private _tryUseItem(slotView: InventorySlotView, worldX: number, worldY: number): boolean {
    const itemId = slotView.card.itemId;
    if (!itemId) return false;

    if (itemId === ItemId.UNIVERSAL_SHARD) {
      const cell = this.gridMgr.worldToCell(worldX, worldY);
      if (!cell) {
        this._showTip('通用碎片请拖到已有英雄碎片上');
        return false;
      }

      const result = placeUniversalShardOnBoard(
        this.scene,
        this.gridMgr,
        this.battleSystem,
        this.dragMediator,
        cell.row,
        cell.col,
      );
      if (!result) {
        this._showTip(this._getUniversalShardFailTip(cell.row, cell.col));
        return false;
      }

      this._clearSlots([slotView.slotIndex]);
      this._showTip(result === 'activated' ? '英雄已合成' : '通用碎片已补位');
      this._redraw();
      return true;
    }

    const cell = this.gridMgr.worldToCell(worldX, worldY);
    const success = ItemSystem.getInstance().use(itemId, {
      gridMgr: this.gridMgr,
      battleSystem: this.battleSystem,
      row: cell?.row,
      col: cell?.col,
    });

    if (!success) {
      this._showTip(this._getItemFailTip(itemId));
      return false;
    }

    this._clearSlots([slotView.slotIndex]);
    this._showTip(`${slotView.card.displayName}已生效`);
    this._redraw();
    return true;
  }

  private _clearSlots(indexes: number[]): void {
    for (const index of indexes) {
      this._slots[index] = null;
      this._slotViews[index]?.container.destroy();
      this._slotViews[index] = null;
    }
  }

  private async _expandSlot(): Promise<void> {
    if (this._destroyed || this._expandPending) return;
    if (this._isInteractionLocked()) {
      this._showTip('暂停中不能扩容');
      return;
    }
    if (this._slotLimit >= MAX_INVENTORY_SLOT_LIMIT) return;

    if (AdSystem.getInstance().hasRewardedVideo('extraSummon')) {
      this._expandPending = true;
      const requestId = ++this._expandRequestId;
      const ok = await AdSystem.getInstance().showRewardedVideo('extraSummon');
      if (this._destroyed || requestId !== this._expandRequestId) return;

      this._expandPending = false;
      if (!ok) {
        this._showTip(FEEDBACK_TEXT.adUnavailable);
        return;
      }
    }
    if (this._isInteractionLocked()) {
      this._showTip('当前状态不能扩容');
      return;
    }
    if (this._slotLimit >= MAX_INVENTORY_SLOT_LIMIT) return;

    this._slotLimit++;
    this._redraw();
    this._showTip('仓库已扩容');
  }

  private _updateHighlight(card: CardData, worldX: number, worldY: number): void {
    const cell = this.gridMgr.worldToCell(worldX, worldY);
    this._highlight.clear();

    if (!cell) {
      this._highlight.setVisible(false);
      return;
    }

    const center = this.gridMgr.cellCenter(cell.row, cell.col);
    const valid = this._canUseCardOnCell(card, cell.row, cell.col);
    this._highlight.fillStyle(valid ? UI_TOKENS.jade : UI_TOKENS.danger, 0.26);
    this._highlight.lineStyle(3, valid ? UI_TOKENS.jadeLight : UI_TOKENS.cinnabarEdge, 0.9);
    this._highlight.fillRect(
      center.x - this.gridMgr.cellSize / 2,
      center.y - this.gridMgr.cellSize / 2,
      this.gridMgr.cellSize,
      this.gridMgr.cellSize,
    );
    this._highlight.strokeRect(
      center.x - this.gridMgr.cellSize / 2,
      center.y - this.gridMgr.cellSize / 2,
      this.gridMgr.cellSize,
      this.gridMgr.cellSize,
    );
    this._highlight.setVisible(true);
  }

  private _canUseCardOnCell(card: CardData, row: number, col: number): boolean {
    if (card.type === CardType.SOLDIER) {
      const occupant = this.gridMgr.getCell(row, col)?.occupant;
      const rank = card.soldierRank ?? SoldierRank.WHITE;
      return this.gridMgr.canPlaceUnit(row, col)
        || (occupant instanceof Soldier
          && occupant.soldierType === card.soldierType
          && occupant.rank === rank
          && occupant.rank < SoldierRank.ORANGE);
    }

    if (card.type === CardType.HERO) {
      const occupant = this.gridMgr.getCell(row, col)?.occupant;
      return this.gridMgr.canPlaceUnit(row, col)
        || (occupant instanceof Hero
          && !!card.heroId
          && canMergeHeroForUpgrade({
            heroId: card.heroId,
            level: card.heroLevel ?? 1,
            maxLevel: occupant.maxLevel,
          }, occupant));
    }

    if (card.type === CardType.HERO_SHARD) {
      return !!card.heroId && canPlaceHeroShardOnCell(this.gridMgr, card.heroId, row, col);
    }

    if (!card.itemId) return false;
    return this._canUseItemOnCell(card.itemId, row, col);
  }

  private _canUseItemOnCell(itemId: ItemId, row: number, col: number): boolean {
    switch (itemId) {
      case ItemId.AXE:
        return this.gridMgr.getCell(row, col)?.state === CellState.LOCKED;
      case ItemId.ELIXIR:
        return this.gridMgr.getCell(row, col)?.occupant instanceof Hero;
      case ItemId.UNIVERSAL_SHARD:
        return canUseUniversalShardOnCell(this.gridMgr, row, col);
      case ItemId.HEADBAND:
        return this.battleSystem.enemies.some(enemy => enemy.alive);
      case ItemId.VASE:
        return gameMgr.canFortifyMonk();
      default:
        return false;
    }
  }

  private _getCardVisual(card: CardData): {
    fill: number;
    stroke: number;
    alpha: number;
    lineWidth: number;
    label: string;
    glow: boolean;
  } {
    if (card.type === CardType.SOLDIER) {
      return {
        fill: UI_TOKENS.jade,
        stroke: UI_TOKENS.jadeLight,
        alpha: 0.62,
        lineWidth: 2,
        label: `${card.displayName.slice(0, 2)} Lv${card.soldierRank ?? 1}`,
        glow: false,
      };
    }

    if (card.type === CardType.HERO && card.heroId) {
      const config = getHeroConfig(card.heroId);
      const isCore = config?.rarity === HeroRarity.CORE;
      return {
        fill: isCore ? UI_TOKENS.cinnabarDark : UI_TOKENS.pine800,
        stroke: isCore ? UI_TOKENS.gold : UI_TOKENS.jadeLight,
        alpha: isCore ? 0.92 : 0.68,
        lineWidth: isCore ? 3 : 2,
        label: `${(config?.name ?? card.heroId).slice(0, 2)} Lv${card.heroLevel ?? 1}`,
        glow: isCore,
      };
    }

    if (card.type === CardType.HERO_SHARD && card.heroId) {
      const config = getHeroConfig(card.heroId);
      const isCore = config?.rarity === HeroRarity.CORE || (config?.maxLevel ?? 0) >= 15;
      return {
        fill: isCore ? UI_TOKENS.cinnabarDark : UI_TOKENS.pine800,
        stroke: isCore ? UI_TOKENS.gold : UI_TOKENS.jadeLight,
        alpha: isCore ? 0.92 : 0.62,
        lineWidth: isCore ? 3 : 2,
        label: `${(config?.name ?? card.heroId).slice(0, 2)}碎`,
        glow: isCore,
      };
    }

    const itemId = card.itemId;
    const itemVisual = itemId ? ITEM_VISUALS[itemId] : null;
    return {
      fill: itemVisual?.fill ?? UI_TOKENS.pine800,
      stroke: itemVisual?.stroke ?? 0xf2d484,
      alpha: 0.62,
      lineWidth: 2,
      label: card.displayName,
      glow: false,
    };
  }

  private _getItemFailTip(itemId: ItemId): string {
    switch (itemId) {
      case ItemId.AXE:
        return '开山斧需要拖到锁定格';
      case ItemId.ELIXIR:
        return '九转仙丹需要拖到英雄身上';
      case ItemId.UNIVERSAL_SHARD:
        return '通用碎片请拖到已有英雄碎片上';
      case ItemId.HEADBAND:
        return '当前没有可减速的妖怪';
      case ItemId.VASE:
        return '唐僧血量已到上限';
      default:
        return '道具使用失败';
    }
  }

  /** 区分不可放置原因：路径格 / 山石锁定 / 已有单位 */
  private _getCellBlockReason(row: number, col: number): string {
    if (this.gridMgr.isPathCell(row, col)) return '妖怪路径格不能布阵';
    const cell = this.gridMgr.getCell(row, col);
    if (cell?.state === CellState.LOCKED) return '山石锁定，用开山斧解锁';
    if (cell?.occupant) return '该格已有单位';
    return '此格状态不允许布阵';
  }

  /** 英雄碎片放置失败原因：路径 / 山石 / 已有单位 / 已集满 / 碎片不足 */
  private _getShardPlaceFailTip(row: number, col: number): string {
    if (this.gridMgr.isPathCell(row, col)) return '妖怪路径格不能放置碎片';
    const cell = this.gridMgr.getCell(row, col);
    if (cell?.state === CellState.LOCKED) return '山石锁定，用开山斧解锁';
    const occupant = cell?.occupant as { isComplete?: () => boolean } | null | undefined;
    if (occupant?.isComplete?.()) return '该英雄碎片已集满';
    if (cell?.occupant) return '该格已有单位，碎片只能叠加同英雄碎片';
    return '碎片不足，先放到空格累积';
  }

  /** 通用碎片补位失败原因：路径 / 山石 / 已集满 / 碎片不足 */
  private _getUniversalShardFailTip(row: number, col: number): string {
    if (this.gridMgr.isPathCell(row, col)) return '妖怪路径格没有英雄碎片';
    const cell = this.gridMgr.getCell(row, col);
    if (cell?.state === CellState.LOCKED) return '山石锁定，用开山斧解锁';
    const occupant = cell?.occupant as { isComplete?: () => boolean } | null | undefined;
    if (occupant?.isComplete?.()) return '该英雄碎片已集满，无需补位';
    return '碎片不足，先放置英雄碎片再补位';
  }

  private _showTip(text: string): void {
    if (this._destroyed) return;
    this._lastTipAt = this.scene.time.now;
    this._tipTimer?.remove(false);
    if (this._tipText) this.scene.tweens.killTweensOf(this._tipText);
    this._tipValue = text;
    this._tipText?.setText(text);
    this._tipText?.setAlpha(1);
    this._tipTimer = this.scene.time.delayedCall(1800, () => {
      this._tipTimer = undefined;
      if (!this._destroyed && this._tipValue === text) {
        this._tipValue = '';
        const tipText = this._tipText;
        this.scene.tweens.add({
          targets: tipText,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            if (!this._destroyed && this._tipValue === '' && this._tipText === tipText) {
              tipText?.setText('');
            }
          },
        });
      }
    });
  }

  private _isInteractionLocked(): boolean {
    return !gameMgr.isPlaying;
  }

  private _getPointerWorld(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    return {
      x: pointer.worldX ?? pointer.x,
      y: pointer.worldY ?? pointer.y,
    };
  }
}
