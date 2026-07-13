import './platform/WechatAdapter';
import Phaser from 'phaser';
import { BattleOrchestrator } from './core/BattleOrchestrator';
import { rollDefenseChapter } from './config/ChapterConfig';
import { getJourneyLevel } from './data/JourneyLevelData';
import { DESIGN_H, DESIGN_W } from './grid/GridManager';
import { getAllStaticAssets } from './render/AssetKeys';
import { GameMode, LevelConfig } from './types';
import { HeroSelectView } from './ui/HeroSelectView';
import { JourneyMapView } from './ui/JourneyMapView';
import { getWechatCanvas } from './platform/WechatAdapter';

type BootMode = 'map' | 'defense' | 'journey';

interface SceneBootData {
  mode?: BootMode;
  levelId?: number;
}

export class GameScene extends Phaser.Scene {
  /** 战斗编排器（防守模式 / 八十一难模式） */
  private orchestrator?: BattleOrchestrator;

  /** 当前战斗的章节 ID（用于绘制战斗背景） */
  private battleChapterId?: number;

  private bootMode: BootMode = 'map';
  private levelConfig: LevelConfig | null = null;

  // ---- 地图模式视图 ----
  private journeyMapView?: JourneyMapView;
  private heroSelectView?: HeroSelectView;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    const assets = getAllStaticAssets();
    for (const { key, path } of assets) {
      this.load.image(key, path);
    }
  }

  init(data: SceneBootData): void {
    this.bootMode = data.mode ?? 'map';
    this.levelConfig = data.levelId ? getJourneyLevel(data.levelId) ?? null : null;
  }

  create(): void {
    if (this.bootMode === 'map') {
      this.createJourneyMap();
      return;
    }

    // 确定棋盘模板和章节 ID（用于战斗背景绘制）
    const level = this.levelConfig;
    const mode = this.bootMode === 'journey' && level ? GameMode.JOURNEY : GameMode.DEFENSE;

    if (mode === GameMode.JOURNEY && level) {
      this.battleChapterId = level.chapter;
    } else {
      const rolled = rollDefenseChapter();
      this.battleChapterId = rolled.chapterId;
    }

    // 绘制战斗背景（纯渲染，留在 Scene 层）
    this.drawBattleBackdrop(this.battleChapterId);

    // 委托战斗编排器处理所有系统创建和生命周期
    this.orchestrator = new BattleOrchestrator(this, {
      onDefenseRestart: () => this.scene.restart({ mode: 'defense' } satisfies SceneBootData),
      onReturnMap: () => this.scene.restart({ mode: 'map' } satisfies SceneBootData),
    });
    this.orchestrator.setup(mode, level, this.battleChapterId);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.orchestrator?.shutdown();
      this.orchestrator = undefined;
    });
  }

  update(_time: number, delta: number): void {
    this.orchestrator?.update(delta / 1000);
  }

  // ==================== 地图模式 ====================

  private createJourneyMap(): void {
    this.journeyMapView = new JourneyMapView(
      this,
      () => this.openHeroSelect(null),
      level => this.openHeroSelect(level),
    );
  }

  private openHeroSelect(level: LevelConfig | null): void {
    this.heroSelectView?.destroy();
    const mode: BootMode = level ? 'journey' : 'defense';
    this.heroSelectView = new HeroSelectView(
      this,
      level,
      () => this.scene.restart(level
        ? ({ mode, levelId: level.levelId } satisfies SceneBootData)
        : ({ mode } satisfies SceneBootData)),
      () => {
        this.heroSelectView?.destroy();
        this.heroSelectView = undefined;
      },
    );
  }

  // ==================== 战斗背景 ====================

  private drawBattleBackdrop(chapterId?: number): void {
    let bgKey = '战斗背景_森林';
    if (chapterId) {
      const chKey = `战斗背景_ch${chapterId}`;
      if (this.textures.exists(chKey)) {
        bgKey = chKey;
      }
    }
    const bg = this.add.image(0, 0, bgKey);
    bg.setOrigin(0, 0);
    bg.setDisplaySize(DESIGN_W, DESIGN_H);
    bg.setDepth(-20);
  }
}

const wechatCanvas = getWechatCanvas();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: DESIGN_W,
  height: DESIGN_H,
  canvas: wechatCanvas,
  parent: wechatCanvas ? undefined : 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene],
};

new Phaser.Game(config);

console.log('[GuardMonk] Phaser 游戏实例已创建');
