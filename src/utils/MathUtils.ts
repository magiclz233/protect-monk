/**
 * 数学工具类 - 纯函数，不依赖任何引擎
 */

export class MathUtils {
  /** 随机整数 [min, max] */
  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /** 随机浮点数 [min, max) */
  static randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  /** 伤害波动 ±10% */
  static damageVariance(baseDamage: number): number {
    return Math.round(baseDamage * (0.9 + Math.random() * 0.2));
  }

  /** 概率判定 */
  static roll(probability: number): boolean {
    return Math.random() < probability;
  }

  /** 按权重抽取索引 */
  static weightedRandomIndex(weights: number[]): number {
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return i;
    }
    return weights.length - 1;
  }

  /** 线性插值 */
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /** 钳位 */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /** 格式化大数字 */
  static formatNumber(n: number): string {
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  /** 数组随机打乱 */
  static shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
