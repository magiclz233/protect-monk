import Phaser from 'phaser';
import { createCjkText } from '../core/TextStyles';
import {
  UI_TOKENS, UI_TYPE, UI_RADIUS,
  drawPaperPanel, createUiButton,
} from './DesignTokens';

/**
 * 「取经绘卷」统一反馈层。
 *
 * 对应设计稿「阶段 D」：复用前三阶段组件完成长尾页面，统一空状态、加载、
 * 广告失败与存档异常提示。所有提示使用同一套宣纸面板、朱砂印章、宋体标题
 * 和朱砂主按钮，不再让各页面各自写一套 toast 文案与配色。
 */

/** 全项目统一反馈文案，页面不得再自行撰写同义提示 */
export const FEEDBACK_TEXT = {
  adUnavailable: '广告未就绪，请稍后重试',
  adInterrupted: '广告未完成，本次奖励未发放',
  saveReadFailed: '本地存档读取失败，已按新存档开始；本次进度可能未能保存',
  saveWriteFailed: '本地存档写入失败，本次进度可能未保存',
  networkFailed: '榜单暂时无法加载，请稍后重试',
  cloudPending: '账号与云存档暂未接入，当前进度仅保存在这台设备',
  emptyLeaderboard: '还没有上榜记录，完成一局守护即可留下第一笔',
  emptyRoster: '当前筛选没有符合条件的英雄',
  emptyCodex: '这一组还没有法宝，继续推进章节即可解锁',
  retry: '重试',
} as const;

export type FeedbackKind = 'empty' | 'loading' | 'ad' | 'save' | 'info';

const KIND_SEAL: Record<FeedbackKind, string> = {
  empty: '空',
  loading: '候',
  ad: '缘',
  save: '录',
  info: '示',
};

export interface FeedbackOverlayOptions {
  kind?: FeedbackKind;
  title: string;
  message: string;
  /** 主操作文案；不传则只显示「知道了」次按钮 */
  actionLabel?: string;
  onAction?: () => void;
  /** 点关闭或遮罩时触发；点击主操作不触发 */
  onClose?: () => void;
  /** 是否显示半透明遮罩，默认显示 */
  dim?: boolean;
}

const PANEL_X = 110;
const PANEL_Y = 396;
const PANEL_W = 530;
const PANEL_H = 486;

/** 模态反馈弹窗：宣纸卷轴 + 朱砂印章 + 单一主操作 */
export class FeedbackOverlay {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly onClose?: () => void;
  private readonly spinner?: Phaser.GameObjects.Container;
  private closed = false;

  constructor(scene: Phaser.Scene, options: FeedbackOverlayOptions) {
    this.scene = scene;
    this.onClose = options.onClose;
    const kind = options.kind ?? 'info';
    const parts: Phaser.GameObjects.GameObject[] = [];
    this.container = scene.add.container(0, 0);
    this.container.setDepth(900);

    if (options.dim !== false) {
      const dim = scene.add.graphics();
      dim.fillStyle(0x0a1e19, 0.78);
      dim.fillRect(0, 0, 750, 1334);
      const dimHit = scene.add.zone(375, 667, 750, 1334);
      dimHit.setOrigin(0.5);
      dimHit.setInteractive();
      if (kind !== 'loading') {
        dimHit.on('pointerdown', () => this.close());
      }
      parts.push(dim, dimHit);
    }

    const panel = scene.add.graphics();
    drawPaperPanel(panel, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, { radius: UI_RADIUS.m });
    parts.push(panel);

    // 顶部轴头，与结算卷轴呼应
    const axis = scene.add.graphics();
    axis.fillStyle(0xd8bd86, 1);
    axis.fillRoundedRect(PANEL_X - 8, PANEL_Y - 12, PANEL_W + 16, 20, 8);
    axis.lineStyle(2, 0x9f7c42, 1);
    axis.strokeRoundedRect(PANEL_X - 8, PANEL_Y - 12, PANEL_W + 16, 20, 8);
    parts.push(axis);

    const seal = createCjkText(scene, 375, PANEL_Y + 60, KIND_SEAL[kind], {
      fontSize: UI_TYPE.heading,
      color: '#fff5da',
      fontStyle: 'bold',
      fontFamily: 'SimSun, Microsoft YaHei, serif',
      backgroundColor: '#c84a36',
      padding: { x: 16, y: 8 },
    });
    seal.setOrigin(0.5);
    seal.setAngle(-4);
    seal.setStroke('#8e2f25', 2);
    parts.push(seal);

    const title = createCjkText(scene, 375, PANEL_Y + 148, options.title, {
      fontSize: UI_TYPE.heading,
      color: UI_TOKENS.textOnPaper,
      fontStyle: 'bold',
      fontFamily: 'SimSun, Microsoft YaHei, serif',
    });
    title.setOrigin(0.5);
    parts.push(title);

    const message = createCjkText(scene, 375, PANEL_Y + 216, options.message, {
      fontSize: UI_TYPE.small,
      color: UI_TOKENS.textMutedOnPaper,
      align: 'center',
      wordWrap: { width: PANEL_W - 90, useAdvancedWrap: true },
      lineSpacing: 8,
    });
    message.setOrigin(0.5, 0);
    parts.push(message);

    if (kind === 'loading') {
      this.spinner = this.createSpinner(scene, 375, PANEL_Y + 340);
      parts.push(this.spinner);
    }

    if (options.actionLabel && options.onAction) {
      const action = options.onAction;
      parts.push(createUiButton(scene, {
        x: 170, y: PANEL_Y + PANEL_H - 120, width: 410, height: 88,
        label: options.actionLabel,
        primary: true,
        onClick: () => {
          this.close(true);
          action();
        },
      }));
    } else if (kind !== 'loading') {
      parts.push(createUiButton(scene, {
        x: 170, y: PANEL_Y + PANEL_H - 120, width: 410, height: 88,
        label: '知道了',
        secondary: true,
        onClick: () => this.close(),
      }));
    }

    if (kind !== 'loading') {
      const closeText = createCjkText(scene, PANEL_X + PANEL_W - 28, PANEL_Y + 36, '×', {
        fontSize: UI_TYPE.heading,
        color: UI_TOKENS.textMutedOnPaper,
        fontStyle: 'bold',
      });
      closeText.setOrigin(0.5);
      closeText.setInteractive({ useHandCursor: true });
      closeText.on('pointerdown', () => this.close());
      parts.push(closeText);
    }

    this.container.add(parts);
  }

  /** 关闭弹窗；执行主操作时抑制 onClose，避免误触发取消回调 */
  close(suppressClose: boolean = false): void {
    if (this.closed) return;
    this.closed = true;
    if (this.spinner) this.scene.tweens.killTweensOf(this.spinner);
    this.container.destroy(true);
    if (!suppressClose) this.onClose?.();
  }

  /** 旋转铜钱：加载态统一图元，减少动态效果时由调用方决定是否启用 */
  private createSpinner(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
    const holder = scene.add.container(x, y);
    const g = scene.add.graphics();
    g.lineStyle(6, UI_TOKENS.gold, 0.28);
    g.strokeCircle(0, 0, 30);
    g.lineStyle(6, UI_TOKENS.cinnabar, 1);
    g.beginPath();
    g.arc(0, 0, 30, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(30));
    g.strokePath();
    holder.add(g);
    scene.tweens.add({ targets: holder, angle: 360, duration: 1100, repeat: -1 });
    return holder;
  }
}

export interface EmptyStateOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** 内嵌空状态：列表/榜单/图鉴无数据时复用，不遮挡页面主结构 */
export function createEmptyState(scene: Phaser.Scene, options: EmptyStateOptions): Phaser.GameObjects.Container {
  const holder = scene.add.container(0, 0);
  const parts: Phaser.GameObjects.GameObject[] = [];
  const { x, y, width, height } = options;

  const panel = scene.add.graphics();
  drawPaperPanel(panel, x, y, width, height, { radius: UI_RADIUS.m, fillAlpha: 0.94 });
  parts.push(panel);

  // 空卷轴简笔：两道轴头 + 卷面，避免用旧风格图标
  const scroll = scene.add.graphics();
  const cx = x + width / 2;
  const cy = y + Math.min(96, height * 0.32);
  scroll.fillStyle(UI_TOKENS.paperDeep, 1);
  scroll.fillRoundedRect(cx - 68, cy - 40, 136, 80, 10);
  scroll.lineStyle(3, 0xb99a62, 0.9);
  scroll.strokeRoundedRect(cx - 68, cy - 40, 136, 80, 10);
  scroll.fillStyle(0xd8bd86, 1);
  scroll.fillRoundedRect(cx - 80, cy - 52, 160, 14, 7);
  scroll.fillRoundedRect(cx - 80, cy + 38, 160, 14, 7);
  scroll.lineStyle(2, 0x9f7c42, 1);
  scroll.strokeRoundedRect(cx - 80, cy - 52, 160, 14, 7);
  scroll.strokeRoundedRect(cx - 80, cy + 38, 160, 14, 7);
  parts.push(scroll);

  const title = createCjkText(scene, cx, cy + 88, options.title, {
    fontSize: UI_TYPE.bodyS,
    color: UI_TOKENS.textOnPaper,
    fontStyle: 'bold',
  });
  title.setOrigin(0.5);
  parts.push(title);

  const message = createCjkText(scene, cx, cy + 132, options.message, {
    fontSize: UI_TYPE.small,
    color: UI_TOKENS.textMutedOnPaper,
    align: 'center',
    wordWrap: { width: width - 70, useAdvancedWrap: true },
  });
  message.setOrigin(0.5, 0);
  parts.push(message);

  if (options.actionLabel && options.onAction) {
    parts.push(createUiButton(scene, {
      x: cx - 130, y: y + height - 106, width: 260, height: 76,
      label: options.actionLabel,
      secondary: true,
      onClick: options.onAction,
    }));
  }

  holder.add(parts);
  return holder;
}

/** 加载态徽标：用于需要等待的页面，不阻塞关闭 */
export function createLoadingBadge(scene: Phaser.Scene, x: number, y: number, label: string = '正在取经路上…'): Phaser.GameObjects.Container {
  const holder = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(UI_TOKENS.pine950, 0.9);
  g.fillRoundedRect(-150, -34, 300, 68, 20);
  g.lineStyle(2, UI_TOKENS.gold, 0.7);
  g.strokeRoundedRect(-150, -34, 300, 68, 20);
  g.lineStyle(5, UI_TOKENS.goldLight, 1);
  g.beginPath();
  g.arc(-112, 0, 13, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(40));
  g.strokePath();
  const text = createCjkText(scene, 18, 0, label, {
    fontSize: UI_TYPE.small,
    color: UI_TOKENS.textOnDark,
    fontStyle: 'bold',
  });
  text.setOrigin(0.5);
  holder.add([g, text]);
  return holder;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

/** 危险操作二次确认；设计稿要求回收、清空等操作不能直接执行 */
export function showConfirmDialog(scene: Phaser.Scene, options: ConfirmDialogOptions): FeedbackOverlay {
  return new FeedbackOverlay(scene, {
    kind: 'info',
    title: options.title,
    message: options.message,
    actionLabel: options.confirmLabel ?? '确认',
    onAction: options.onConfirm,
    onClose: options.onCancel,
  });
}
