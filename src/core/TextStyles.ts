import type Phaser from 'phaser';

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;
type TextPadding = Phaser.Types.GameObjects.Text.TextPadding;

export const CJK_FONT_FAMILY = 'Microsoft YaHei, PingFang SC, Noto Sans CJK SC, Source Han Sans SC, SimHei, Arial, sans-serif';

export function createCjkText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string | string[],
  style: TextStyle = {},
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, withCjkTextStyle(style));
}

export function withCjkTextStyle(style: TextStyle = {}): TextStyle {
  return {
    ...style,
    fontFamily: style.fontFamily ?? CJK_FONT_FAMILY,
    padding: normalizePadding(style.padding),
  };
}

function normalizePadding(padding?: TextPadding): TextPadding {
  let left = 0;
  let right = 0;
  let top = 4;
  let bottom = 6;

  if (padding) {
    if (padding.x !== undefined) {
      left = padding.x;
      right = padding.x;
    }
    if (padding.y !== undefined) {
      top = padding.y;
      bottom = padding.y;
    }
    if (padding.left !== undefined) left = padding.left;
    if (padding.right !== undefined) right = padding.right;
    if (padding.top !== undefined) top = padding.top;
    if (padding.bottom !== undefined) bottom = padding.bottom;
  }

  return {
    left,
    right,
    top: Math.max(top, 4),
    bottom: Math.max(bottom, 6),
  };
}
