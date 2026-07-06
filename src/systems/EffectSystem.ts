import type Phaser from 'phaser';
import { ObjectPool } from '../core/ObjectPool';

interface RingEffectOptions {
  radius: number;
  color?: number;
  alpha?: number;
  lineWidth?: number;
  depth?: number;
  scaleTo?: number;
  duration?: number;
  ease?: string;
}

interface FloatTextOptions {
  color?: string;
  fontSize?: string;
  depth?: number;
  rise?: number;
  duration?: number;
}

interface AttackLineOptions {
  color?: number;
  alpha?: number;
  lineWidth?: number;
  depth?: number;
  duration?: number;
}

interface ProjectileEffectOptions {
  color?: number;
  alpha?: number;
  radius?: number;
  hitRadius?: number;
  depth?: number;
  duration?: number;
}

export class EffectSystem {
  private static readonly _instances = new WeakMap<Phaser.Scene, EffectSystem>();

  static forScene(scene: Phaser.Scene): EffectSystem {
    let instance = this._instances.get(scene);
    if (!instance) {
      instance = new EffectSystem(scene);
      this._instances.set(scene, instance);
    }
    return instance;
  }

  private readonly _graphicsPool: ObjectPool<Phaser.GameObjects.Graphics>;
  private readonly _textPool: ObjectPool<Phaser.GameObjects.Text>;

  private constructor(private readonly scene: Phaser.Scene) {
    this._graphicsPool = new ObjectPool<Phaser.GameObjects.Graphics>(
      () => this.scene.add.graphics(),
      graphic => this._resetGraphic(graphic),
      8,
    );
    this._textPool = new ObjectPool<Phaser.GameObjects.Text>(
      () => this.scene.add.text(0, 0, ''),
      text => this._resetText(text),
      8,
    );
  }

  playRing(x: number, y: number, options: RingEffectOptions): void {
    const effect = this._graphicsPool.get();
    const radius = options.radius;
    const color = options.color ?? 0xffd36a;
    const alpha = options.alpha ?? 0.95;
    const lineWidth = options.lineWidth ?? 4;

    effect.clear();
    effect.setPosition(x, y);
    effect.setAlpha(1);
    effect.setScale(1);
    effect.setDepth(options.depth ?? 85);
    effect.setVisible(true);
    effect.setActive(true);
    effect.lineStyle(lineWidth, color, alpha);
    effect.strokeCircle(0, 0, radius);

    this.scene.tweens.add({
      targets: effect,
      alpha: 0,
      scale: options.scaleTo ?? 1.45,
      duration: options.duration ?? 320,
      ease: options.ease,
      onComplete: () => this._graphicsPool.put(effect),
    });
  }

  playDoubleRing(x: number, y: number, outer: RingEffectOptions, inner: RingEffectOptions): void {
    const effect = this._graphicsPool.get();

    effect.clear();
    effect.setPosition(x, y);
    effect.setAlpha(1);
    effect.setScale(1);
    effect.setDepth(Math.max(outer.depth ?? 86, inner.depth ?? 86));
    effect.setVisible(true);
    effect.setActive(true);
    effect.lineStyle(outer.lineWidth ?? 5, outer.color ?? 0xffd36a, outer.alpha ?? 0.96);
    effect.strokeCircle(0, 0, outer.radius);
    effect.lineStyle(inner.lineWidth ?? 2, inner.color ?? 0xffffff, inner.alpha ?? 0.8);
    effect.strokeCircle(0, 0, inner.radius);

    this.scene.tweens.add({
      targets: effect,
      alpha: 0,
      scale: outer.scaleTo ?? 1.7,
      duration: outer.duration ?? 420,
      ease: outer.ease ?? 'Quad.easeOut',
      onComplete: () => this._graphicsPool.put(effect),
    });
  }

  playFloatText(x: number, y: number, content: string, options: FloatTextOptions = {}): void {
    const label = this._textPool.get();

    label.setText(content);
    label.setStyle({
      fontSize: options.fontSize ?? '18px',
      color: options.color ?? '#ffd36a',
      fontStyle: 'bold',
    });
    label.setPosition(x, y);
    label.setOrigin(0.5);
    label.setDepth(options.depth ?? 120);
    label.setAlpha(1);
    label.setScale(1);
    label.setVisible(true);
    label.setActive(true);

    this.scene.tweens.add({
      targets: label,
      y: y - (options.rise ?? 28),
      alpha: 0,
      duration: options.duration ?? 700,
      onComplete: () => this._textPool.put(label),
    });
  }

  playAttackLine(fromX: number, fromY: number, toX: number, toY: number, options: AttackLineOptions = {}): void {
    const effect = this._graphicsPool.get();

    effect.clear();
    effect.setPosition(0, 0);
    effect.setAlpha(1);
    effect.setScale(1);
    effect.setDepth(options.depth ?? 87);
    effect.setVisible(true);
    effect.setActive(true);
    effect.lineStyle(options.lineWidth ?? 3, options.color ?? 0xffd36a, options.alpha ?? 0.78);
    effect.lineBetween(fromX, fromY, toX, toY);
    effect.fillStyle(options.color ?? 0xffd36a, options.alpha ?? 0.78);
    effect.fillCircle(toX, toY, 4);

    this.scene.tweens.add({
      targets: effect,
      alpha: 0,
      duration: options.duration ?? 120,
      onComplete: () => this._graphicsPool.put(effect),
    });
  }

  playProjectile(fromX: number, fromY: number, toX: number, toY: number, options: ProjectileEffectOptions = {}): void {
    const effect = this._graphicsPool.get();
    const color = options.color ?? 0xffd36a;
    const alpha = options.alpha ?? 0.9;
    const radius = options.radius ?? 4;

    effect.clear();
    effect.setPosition(fromX, fromY);
    effect.setAlpha(1);
    effect.setScale(1);
    effect.setDepth(options.depth ?? 88);
    effect.setVisible(true);
    effect.setActive(true);
    effect.lineStyle(2, color, alpha * 0.5);
    effect.lineBetween(-radius * 4, 0, 0, 0);
    effect.fillStyle(color, alpha);
    effect.fillCircle(0, 0, radius);

    const angle = Math.atan2(toY - fromY, toX - fromX);
    effect.setRotation(angle);

    this.scene.tweens.add({
      targets: effect,
      x: toX,
      y: toY,
      duration: options.duration ?? 120,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this._graphicsPool.put(effect);
        this.playRing(toX, toY, {
          radius: options.hitRadius ?? radius * 3,
          color,
          alpha: 0.46,
          lineWidth: 2,
          depth: options.depth ?? 88,
          scaleTo: 1.35,
          duration: 160,
        });
      },
    });
  }

  private _resetGraphic(graphic: Phaser.GameObjects.Graphics): void {
    this.scene.tweens.killTweensOf(graphic);
    graphic.clear();
    graphic.setPosition(0, 0);
    graphic.setRotation(0);
    graphic.setAlpha(1);
    graphic.setScale(1);
    graphic.setDepth(0);
    graphic.setVisible(false);
    graphic.setActive(false);
  }

  private _resetText(text: Phaser.GameObjects.Text): void {
    this.scene.tweens.killTweensOf(text);
    text.setText('');
    text.setPosition(0, 0);
    text.setOrigin(0.5);
    text.setAlpha(1);
    text.setScale(1);
    text.setDepth(0);
    text.setVisible(false);
    text.setActive(false);
  }
}
