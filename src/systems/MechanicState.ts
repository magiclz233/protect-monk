/**
 * 章节机制全局状态 — 零依赖模块
 *
 * 设计意图：ChapterMechanicSystem 设置全局倍率，Unit（实体层）读取它们。
 * 如果 Unit 直接导入 ChapterMechanicSystem，会形成循环依赖。
 * 此模块作为轻量级中间层，持有模块级变量以断开循环。
 *
 * 不要在此文件中添加与章节机制无关的状态。
 *
 * @tech-debt 循环依赖逃生舱 — 长期方案：让 BattleSystem 在调用 Unit.heal()
 *   时传入修正值，或通过 EventManager 发布治疗修正变更事件让 Unit 订阅。
 *
 * @see ChapterMechanicSystem._setup() — 写入端
 * @see Unit.heal() — 读取端
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
