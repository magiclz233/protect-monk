import Phaser from 'phaser';
import { createCjkText } from '../core/TextStyles';

/**
 * 「取经绘卷」UI 设计令牌 —— 全项目唯一的界面视觉体系
 *
 * 设计理念（与 ui-redesign/index.html 视觉稿一致）：
 * - 宣纸承载叙事：章节、地图、结算等叙事信息用宣纸暖色
 * - 墨松绿稳住战斗：战斗 HUD、召唤栏、操作承载层用深松绿
 * - 朱砂引导操作：唯一的强主操作色，同屏只允许一个朱砂主按钮
 * - 鎏金留给奖励：奖励、核心英雄、星级和高价值内容专用
 * - 玉净青绿：可放置、增益、治疗状态专用
 *
 * 颜色取自项目实际素材（角色硬边色块、地图宣纸底、法宝朱砂金），
 * 不再使用旧的深蓝科幻面板色系（0x101826 / 0x31496c）。
 */
export const UI_TOKENS = {
  // ═══ 墨松绿（深色面板 / 战斗承载层）═══
  pine950: 0x102d27,
  pine900: 0x173f35,
  pine800: 0x245a49,
  pine700: 0x32715b,

  // ═══ 宣纸（浅色面板 / 叙事）═══
  paper: 0xf3e3bd,
  paperLight: 0xfff5da,
  paperDeep: 0xddc797,

  // ═══ 朱砂（唯一主操作色）═══
  cinnabar: 0xc84a36,
  cinnabarDark: 0x8e2f25,
  cinnabarEdge: 0xe88a65,

  // ═══ 鎏金（奖励 / 核心 / 星级）═══
  gold: 0xd8a64a,
  goldLight: 0xf2d484,

  // ═══ 玉净青绿（可放置 / 增益 / 治疗状态）═══
  jade: 0x3e8e75,
  jadeLight: 0x8bd5a6,

  // ═══ 墨色文字 / 辅助 ═══
  ink: 0x252a26,
  inkSoft: 0x4c5148,
  muted: 0x776a56,
  water: 0x3f8291,
  danger: 0xc84336,
  line: 0x403423, // 分隔线（约 26% 透明使用）

  // ═══ 文字颜色（CSS hex，直接给 Phaser Text 用）═══
  textOnDark: '#fff5da',      // 深面板上的主文字
  textMutedOnDark: '#d7cba6', // 深面板上的辅助文字
  textGoldOnDark: '#f2d484',  // 深面板上的金色强调
  textOnPaper: '#252a26',     // 宣纸面板上的主文字
  textMutedOnPaper: '#776a56',// 宣纸面板上的辅助文字
  textCinnabarOnPaper: '#8e2f25', // 宣纸面板上的朱砂强调
} as const;

/** 字号体系（750×1334 设计稿） */
export const UI_TYPE = {
  display: '76px',  // 展示标题（首页游戏名）
  title: '44px',    // 页面标题
  heading: '34px',  // 区块标题
  body: '28px',     // 正文 / 主按钮
  bodyS: '26px',    // 次按钮 / 次要正文
  small: '22px',    // 辅助文字下限
} as const;

/** 圆角体系 */
export const UI_RADIUS = { s: 12, m: 20, l: 30 } as const;

// ==================== 面板绘制 ====================

export interface PanelOptions {
  fill?: number;
  fillAlpha?: number;
  stroke?: number;
  strokeAlpha?: number;
  radius?: number;
  shadow?: boolean;
  /** 内衬描边（宣纸面板的金色内环） */
  innerRing?: boolean;
}

/** 深漆面板：rgba(16,45,39,.94) + 鎏金描边 + 底部厚阴影 —— 战斗/深色承载层 */
export function drawLacquerPanel(
  graphics: Phaser.GameObjects.Graphics,
  x: number, y: number, width: number, height: number,
  options: PanelOptions = {},
): void {
  const radius = options.radius ?? UI_RADIUS.m;
  const fill = options.fill ?? UI_TOKENS.pine950;
  const stroke = options.stroke ?? UI_TOKENS.gold;
  if (options.shadow !== false) {
    graphics.fillStyle(0x051512, 0.4);
    graphics.fillRoundedRect(x, y + 6, width, height, radius);
  }
  graphics.fillStyle(fill, options.fillAlpha ?? 0.94);
  graphics.fillRoundedRect(x, y, width, height, radius);
  graphics.lineStyle(2, stroke, options.strokeAlpha ?? 0.65);
  graphics.strokeRoundedRect(x, y, width, height, radius);
}

/** 宣纸面板：纸白底 + 金褐描边 + 内衬金环 + 底部厚阴影 —— 叙事/浅色承载层 */
export function drawPaperPanel(
  graphics: Phaser.GameObjects.Graphics,
  x: number, y: number, width: number, height: number,
  options: PanelOptions = {},
): void {
  const radius = options.radius ?? UI_RADIUS.m;
  const fill = options.fill ?? UI_TOKENS.paperLight;
  const stroke = options.stroke ?? 0xb99a62;
  if (options.shadow !== false) {
    graphics.fillStyle(0x3f301d, 0.18);
    graphics.fillRoundedRect(x, y + 6, width, height, radius);
  }
  graphics.fillStyle(fill, options.fillAlpha ?? 1);
  graphics.fillRoundedRect(x, y, width, height, radius);
  graphics.lineStyle(2, stroke, options.strokeAlpha ?? 0.85);
  graphics.strokeRoundedRect(x, y, width, height, radius);
  if (options.innerRing !== false) {
    graphics.lineStyle(2, UI_TOKENS.gold, 0.13);
    graphics.strokeRoundedRect(x + 5, y + 5, width - 10, height - 10, Math.max(4, radius - 5));
  }
}

// ==================== 按钮 ====================

export interface UiButtonOptions {
  x: number; y: number;
  width: number; height: number;
  label: string;
  /** 副标题（主按钮下方小字） */
  meta?: string;
  primary?: boolean;
  secondary?: boolean;
  enabled?: boolean;
  fontSize?: string;
  onClick: () => void;
}

/**
 * 统一按钮：primary 朱砂主按钮（同屏唯一）/ secondary 宣纸次按钮 / 默认深漆按钮
 * 尺寸规范：热区高度 ≥ 88 设计像素时体验最佳，最小 76。
 */
export function createUiButton(scene: Phaser.Scene, options: UiButtonOptions): Phaser.GameObjects.Container {
  const enabled = options.enabled ?? true;
  const primary = options.primary ?? false;
  const secondary = options.secondary ?? false;

  const container = scene.add.container(options.x + options.width / 2, options.y + options.height / 2);
  const bg = scene.add.graphics();
  const radius = Math.min(20, Math.round(options.height / 3));

  let fill: number, edge: number, shadow: number, textColor: string;
  if (!enabled) {
    fill = 0x8a8375; edge = 0xa79e8c; shadow = 0x5c564b; textColor = '#efeadb';
  } else if (primary) {
    fill = UI_TOKENS.cinnabar; edge = UI_TOKENS.cinnabarEdge; shadow = UI_TOKENS.cinnabarDark; textColor = UI_TOKENS.textOnDark;
  } else if (secondary) {
    fill = UI_TOKENS.paper; edge = 0xb89b65; shadow = 0xa88d5c; textColor = '#173f35';
  } else {
    fill = UI_TOKENS.pine900; edge = UI_TOKENS.gold; shadow = 0x091e19; textColor = UI_TOKENS.textOnDark;
  }

  // 底部厚度（按压立体感）
  bg.fillStyle(shadow, enabled ? 1 : 0.6);
  bg.fillRoundedRect(-options.width / 2, -options.height / 2 + 5, options.width, options.height, radius);
  // 主体
  bg.fillStyle(fill, enabled ? 1 : 0.8);
  bg.fillRoundedRect(-options.width / 2, -options.height / 2, options.width, options.height, radius);
  bg.lineStyle(primary ? 3 : 2, edge, enabled ? 0.9 : 0.5);
  bg.strokeRoundedRect(-options.width / 2, -options.height / 2, options.width, options.height, radius);
  // 主按钮内衬白环
  if (primary && enabled) {
    bg.lineStyle(2, 0xfff0c6, 0.24);
    bg.strokeRoundedRect(-options.width / 2 + 6, -options.height / 2 + 6, options.width - 12, options.height - 12, Math.max(4, radius - 6));
  }

  const text = createCjkText(scene, 0, options.meta ? -10 : 0, options.label, {
    fontSize: options.fontSize ?? (primary ? UI_TYPE.body : UI_TYPE.bodyS),
    color: textColor,
    fontStyle: 'bold',
    align: 'center',
  });
  text.setOrigin(0.5);

  const parts: Phaser.GameObjects.GameObject[] = [bg, text];
  if (options.meta) {
    const meta = createCjkText(scene, 0, options.height / 2 - 26, options.meta, {
      fontSize: UI_TYPE.small,
      color: textColor,
      align: 'center',
    });
    meta.setOrigin(0.5);
    meta.setAlpha(0.82);
    parts.push(meta);
  }

  const hit = scene.add.zone(0, 0, options.width, options.height);
  hit.setOrigin(0.5);
  if (enabled) {
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => playUiPress(scene, container, options.onClick));
  }

  container.add([...parts, hit]);
  return container;
}

/** 按压反馈：80–120ms，全局统一 */
export function playUiPress(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
  onComplete?: () => void,
): void {
  scene.tweens.add({
    targets: target,
    alpha: 0.85,
    scale: 0.97,
    duration: 90,
    yoyo: true,
    ease: 'Power1.Out',
    onComplete,
  });
}

// ==================== 资源胶囊 / 圆形图标 ====================

export interface HudChipOptions {
  x: number; y: number;
  iconKey: string;
  text: string;
  /** hp 胶囊用朱砂深色文字 */
  variant?: 'default' | 'hp' | 'gold';
  fontSize?: string;
}

/** 资源胶囊：纸白底 + 金褐描边 + 图标 + 数值（HUD 通用） */
export function createHudChip(scene: Phaser.Scene, options: HudChipOptions): Phaser.GameObjects.Container {
  const height = 56;
  const text = createCjkText(scene, 0, 0, options.text, {
    fontSize: options.fontSize ?? UI_TYPE.bodyS,
    fontStyle: 'bold',
    color: options.variant === 'hp' ? '#8e2f25' : '#252a26',
  });
  text.setOrigin(0, 0.5);
  const iconSize = 42;
  const textWidth = Math.max(text.width, 40);
  const width = iconSize + textWidth + 26;

  const container = scene.add.container(options.x, options.y);
  const g = scene.add.graphics();
  g.fillStyle(0x3f301d, 0.25);
  g.fillRoundedRect(0, 3, width, height, height / 2);
  g.fillStyle(UI_TOKENS.paperLight, 0.95);
  g.fillRoundedRect(0, 0, width, height, height / 2);
  g.lineStyle(2, 0xaa8b54, 0.9);
  g.strokeRoundedRect(0, 0, width, height, height / 2);

  const icon = scene.add.image(6 + iconSize / 2, height / 2, options.iconKey);
  icon.setDisplaySize(iconSize, iconSize);
  text.setPosition(iconSize + 16, height / 2);

  container.add([g, icon, text]);
  return container;
}

/** 深底圆形图标按钮（暂停 / 设置 / 广告奖励等） */
export function createRoundIconButton(
  scene: Phaser.Scene,
  x: number, y: number,
  iconKey: string,
  size: number,
  onClick?: () => void,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x051512, 0.35);
  g.fillCircle(0, 3, size / 2);
  g.fillStyle(UI_TOKENS.pine900, 0.94);
  g.fillCircle(0, 0, size / 2);
  g.lineStyle(2, UI_TOKENS.gold, 0.85);
  g.strokeCircle(0, 0, size / 2);

  const icon = scene.add.image(0, 0, iconKey);
  icon.setDisplaySize(size * 0.62, size * 0.62);
  icon.setName('roundIcon');

  const hit = scene.add.zone(0, 0, size + 12, size + 12);
  hit.setOrigin(0.5);
  hit.setInteractive({ useHandCursor: true });
  if (onClick) {
    hit.on('pointerdown', () => playUiPress(scene, container, onClick));
  }

  container.add([g, icon, hit]);
  return container;
}

// ==================== 渐变 ====================

export interface GradientStop {
  /** 0~1 位置 */
  offset: number;
  color: number;
  alpha: number;
}

/**
 * 垂直线性渐变贴图（模拟 CSS linear-gradient，比分段矩形顺滑无条带）。
 * 相同 key 只生成一次纹理，可安全重复调用。
 */
export function createVerticalGradientImage(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  stops: GradientStop[],
): Phaser.GameObjects.Image {
  if (!scene.textures.exists(key)) {
    const canvasTexture = scene.textures.createCanvas(key, width, height);
    if (!canvasTexture) return scene.add.image(0, 0, key).setOrigin(0, 0);
    const ctx = canvasTexture.getContext();
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    for (const stop of stops) {
      const r = (stop.color >> 16) & 0xff;
      const g = (stop.color >> 8) & 0xff;
      const b = stop.color & 0xff;
      grad.addColorStop(Math.max(0, Math.min(1, stop.offset)), `rgba(${r},${g},${b},${stop.alpha})`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    canvasTexture.refresh();
  }
  return scene.add.image(0, 0, key).setOrigin(0, 0);
}

// ==================== 文本快捷 ====================

/** 深色面板上的主文字 */
export function createDarkText(scene: Phaser.Scene, x: number, y: number, content: string, fontSize: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.GameObjects.Text {
  return createCjkText(scene, x, y, content, {
    fontSize, color: UI_TOKENS.textOnDark, ...extra,
  });
}

/** 宣纸面板上的主文字 */
export function createPaperText(scene: Phaser.Scene, x: number, y: number, content: string, fontSize: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.GameObjects.Text {
  return createCjkText(scene, x, y, content, {
    fontSize, color: UI_TOKENS.textOnPaper, ...extra,
  });
}
