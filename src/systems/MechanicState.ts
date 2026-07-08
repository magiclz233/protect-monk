/**
 * 章节机制全局状态 — 零依赖模块
 * 避免 ChapterMechanicSystem ↔ Unit 循环引用
 */

let _globalHealMultiplier = 1;

export function getGlobalHealMultiplier(): number {
  return _globalHealMultiplier;
}

export function setGlobalHealMultiplier(value: number): void {
  _globalHealMultiplier = Math.max(0, Math.min(1, value));
}

let _globalSpeedMultiplier = 1;

export function getGlobalSpeedMultiplier(): number {
  return _globalSpeedMultiplier;
}

export function setGlobalSpeedMultiplier(value: number): void {
  _globalSpeedMultiplier = Math.max(0.1, Math.min(2, value));
}
