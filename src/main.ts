import './platform/WechatAdapter';
import Phaser from 'phaser';
import { BattleOrchestrator } from './core/BattleOrchestrator';
import { CHAPTER_CONFIGS, rollDefenseChapter } from './config/ChapterConfig';
import { getJourneyLevel } from './data/JourneyLevelData';
import { LevelData } from './data/LevelData';
import { DESIGN_H, DESIGN_W } from './grid/GridManager';
import { getAllStaticAssets } from './render/AssetKeys';
import { GameMode, LevelConfig } from './types';
import { gameMgr } from './core/GameManager';
import { HeroSelectView } from './ui/HeroSelectView';
import { JourneyMapView } from './ui/JourneyMapView';
import { SaveManager } from './data/SaveManager';
import { FeedbackOverlay, FEEDBACK_TEXT } from './ui/FeedbackOverlay';
import { getWechatCanvas } from './platform/WechatAdapter';
import { AdSystem } from './systems/AdSystem';
import { UI_TOKENS } from './ui/DesignTokens';

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
    for (const { key, path, frameWidth, frameHeight } of assets) {
      if (frameWidth && frameHeight) {
        this.load.spritesheet(key, path, { frameWidth, frameHeight });
      } else {
        this.load.image(key, path);
      }
    }
  }

  init(data: SceneBootData): void {
    this.bootMode = data.mode ?? 'map';
    this.levelConfig = data.levelId ? getJourneyLevel(data.levelId) ?? null : null;
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdownScene, this);
    // 各视图构造时会读取存档；延迟一帧统一收集异常，避免提示被页面盖住。
    this.time.delayedCall(0, () => this.reportStorageIssues());

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
      onJourneyRestart: () => this.scene.restart({
        mode: 'journey',
        levelId: gameMgr.currentLevel,
      } satisfies SceneBootData),
      onNextLevel: () => {
        const nextLevelId = gameMgr.currentLevel >= 81
          ? LevelData.getInstance().currentLevel
          : gameMgr.currentLevel + 1;
        this.scene.restart({ mode: 'journey', levelId: nextLevelId } satisfies SceneBootData);
      },
    });
    this.orchestrator.setup(mode, level, this.battleChapterId);

  }

  update(_time: number, delta: number): void {
    this.orchestrator?.update(delta / 1000);
  }

  // ==================== 地图模式 ====================

  private createJourneyMap(): void {
    this.journeyMapView = new JourneyMapView(
      this,
      () => {
        // 老玩家沿用上局阵容直接开局；首次进入仍进入选将引导。
        if (gameMgr.selectedHeroes.length > 0) {
          this.scene.restart({ mode: 'defense' } satisfies SceneBootData);
        } else {
          this.openHeroSelect(null);
        }
      },
      level => this.openHeroSelect(level),
      () => this.openHeroSelect(null),
    );
  }

  private openHeroSelect(level: LevelConfig | null): void {
    this.heroSelectView?.destroy();
    AdSystem.getInstance().hideBanner('home');
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
        void AdSystem.getInstance().showBanner('home');
      },
    );
  }

  /** 存档读取／写入异常统一提示，取代过去被静默吞掉的行为 */
  private reportStorageIssues(): void {
    const errors = SaveManager.consumeStorageErrors();
    if (errors.length === 0) return;
    new FeedbackOverlay(this, {
      kind: 'save',
      title: '存档异常',
      message: `${FEEDBACK_TEXT.saveReadFailed}\n（${errors[0]}）`,
    });
  }

  private shutdownScene(): void {
    this.heroSelectView?.destroy();
    this.heroSelectView = undefined;
    this.journeyMapView?.destroy();
    this.journeyMapView = undefined;
    this.orchestrator?.shutdown();
    this.orchestrator = undefined;
  }

  // ==================== 战斗背景 ====================

  private drawBattleBackdrop(chapterId?: number): void {
    let bgKey = '战斗背景_森林';
    const chapter = chapterId
      ? CHAPTER_CONFIGS.find(config => config.chapterId === chapterId)
      : undefined;
    if (chapterId) {
      const chKey = `战斗背景_ch${chapterId}`;
      if (this.textures.exists(chKey)) {
        bgKey = chKey;
      }
    }
    const hasDedicatedBg = bgKey !== '战斗背景_森林';

    const bg = this.add.image(0, 0, bgKey);
    bg.setOrigin(0, 0);
    bg.setDisplaySize(DESIGN_W, DESIGN_H);
    bg.setDepth(-20);

    // 九章专属背景图尚未提供（assets/ui 目前只有森林一张），过去每章都长得一样。
    // 这里用章节主题色做低透明度氛围罩，让九章画面有可辨识差异；后续把
    // 战斗背景_chN.png 补齐并加入预载后，上面会优先命中专属图并自动跳过色罩。
    const wash = this.add.graphics();
    wash.setDepth(-19);
    if (!hasDedicatedBg && chapter) {
      wash.fillStyle(chapter.themeColorDark, 0.3);
      wash.fillRect(0, 0, DESIGN_W, DESIGN_H);
      wash.fillStyle(chapter.themeColor, 0.08);
      wash.fillRect(0, 0, DESIGN_W, DESIGN_H * 0.45);
    }
    // 底部压暗：棋盘下半与召唤 / 仓库深漆面板需要稳定的对比度
    wash.fillStyle(UI_TOKENS.pine950, 0.42);
    wash.fillRect(0, DESIGN_H * 0.58, DESIGN_W, DESIGN_H * 0.42);
  }
}

const wechatCanvas = getWechatCanvas();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: DESIGN_W,
  height: DESIGN_H,
  canvas: wechatCanvas,
  parent: wechatCanvas ? undefined : 'game-container',
  backgroundColor: '#102d27',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene],
};

new Phaser.Game(config);

console.log('[GuardMonk] Phaser 游戏实例已创建');
