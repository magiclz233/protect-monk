/**
 * 通用对象池
 * 纯 TS，不依赖引擎，适用于 PixiJS Container/Sprite 等
 */

export class ObjectPool<T> {
  private _pool: T[] = [];
  private _factory: () => T;
  private _reset: (obj: T) => void;

  constructor(factory: () => T, reset: (obj: T) => void, preloadCount: number = 10) {
    this._factory = factory;
    this._reset = reset;
    for (let i = 0; i < preloadCount; i++) {
      const obj = this._factory();
      this._reset(obj);
      this._pool.push(obj);
    }
  }

  get(): T {
    if (this._pool.length > 0) {
      return this._pool.pop()!;
    }
    return this._factory();
  }

  put(obj: T): void {
    this._reset(obj);
    this._pool.push(obj);
  }

  get freeCount(): number { return this._pool.length; }

  clear(): void { this._pool = []; }
}
