import './platform/WechatAdapter';
import Phaser from 'phaser';
import { gameMgr } from './core/GameManager';
import { eventMgr, GameEvent } from './core/EventManager';
import { getChapterConfig, rollDefenseChapter, rollDefenseMechanics } from './config/ChapterConfig';
import { DEFENSE_DEFAULT_TEMPLATE, getBoardTemplateForChapter, getBoardTemplateForLevel, getLockedCellsForTemplate } from './data/DefenseBoardData';
import { getJourneyLevel } from './data/JourneyLevelData';
import { LevelData, getJourneyLoopDifficulty } from './data/LevelData';
import { TangMonk } from './entities/TangMonk';
import { GridManager, DESIGN_H, DESIGN_W } from './grid/GridManager';
import { getAllStaticAssets } from './render/AssetKeys';
import { BattleSystem } from './systems/BattleSystem';
import { ArtifactSystem } from './systems/ArtifactSystem';
import { AdSystem } from './systems/AdSystem';
import { SummonSystem } from './systems/SummonSystem';
import { WaveSystem } from './systems/WaveSystem';
import { ChapterMechanicSystem, CompositeMechanicManager } from './systems/ChapterMechanicSystem';
import { setGlobalHealMultiplier, setGlobalSpeedMultiplier } from './systems/MechanicState';
import { GameMode, LevelConfig } from './types';
import { ArtifactBarView } from './ui/ArtifactBarView';
import { HeroPanelView } from './ui/HeroPanelView';
import { HeroSelectView } from './ui/HeroSelectView';
import { BoardUnitControlView } from './ui/BoardUnitControlView';
import { HudView } from './ui/HudView';
import { InventoryBarView } from './ui/InventoryBarView';
import { JourneyMapView } from './ui/JourneyMapView';
import { ResultView } from './ui/ResultView';
import { SummonPanel } from './ui/SummonPanel';
import { TutorialHintView } from './ui/TutorialHintView';
import { getWechatCanvas } from './platform/WechatAdapter';

type BootMode = 'map' | 'defense' | 'journey';

interface SceneBootData {
  mode?: BootMode;
  levelId?: number;
}

export class GameScene extends Phaser.Scene {
  gridMgr?: GridManager;
  monk?: TangMonk;
  battleSystem?: BattleSystem;
  artifactSystem?: ArtifactSystem;
  waveSystem?: WaveSystem;
  hudView?: HudView;
  artifactBarView?: ArtifactBarView;
  heroPanelView?: HeroPanelView;
  inventoryBarView?: InventoryBarView;
  boardControlView?: BoardUnitControlView;
  summonPanel?: SummonPanel;
  tutorialHintView?: TutorialHintView;
  resultView?: ResultView;
  journeyMapView?: JourneyMapView;
  heroSelectView?: HeroSelectView;

  /** 章节机制系统（八十一难单章用） */
  chapterMechanicSystem?: ChapterMechanicSystem;
  /** 守护模式多机制并行管理器 */
  compositeMechanicManager?: CompositeMechanicManager;
  /** 当前战斗的章节 ID */
  private _battleChapterId?: number;

  private _bootMode: BootMode = 'map';
  private _levelConfig: LevelConfig | null = null;
  private _journeyLoop: number = 1;

  private readonly _monkDamageHandler = (hp: number): void => {
    this.monk?.updateHp(hp);
  };

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
    this._bootMode = data.mode ?? 'map';
    this._levelConfig = data.levelId ? getJourneyLevel(data.levelId) ?? null : null;
  }

  create(): void {
    if (this._bootMode === 'map') {
      this._createJourneyMap();
      return;
    }

    this._createBattleScene();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this._shutdownScene());
  }

  update(_time: number, delta: number): void {
    if (!this.waveSystem || !this.battleSystem) return;
    const dt = delta / 1000;
    gameMgr.update(dt);
    this.waveSystem.update(dt);
    this.battleSystem.update(dt);

    // 章节机制系统 tick
    if (this.chapterMechanicSystem) {
      this.chapterMechanicSystem.update(dt);
    }
    if (this.compositeMechanicManager) {
      this.compositeMechanicManager.update(dt);
    }
  }

  private _createJourneyMap(): void {
    this.journeyMapView = new JourneyMapView(
      this,
      () => this._openHeroSelect(null),
      level => this._openHeroSelect(level),
    );
  }

  private _openHeroSelect(level: LevelConfig | null): void {
    this.heroSelectView?.destroy();
    const bootMode: BootMode = level ? 'journey' : 'defense';
    this.heroSelectView = new HeroSelectView(
      this,
      level,
      () => this.scene.restart(level
        ? ({ mode: bootMode, levelId: level.levelId } satisfies SceneBootData)
        : ({ mode: bootMode } satisfies SceneBootData)),
      () => {
        this.heroSelectView?.destroy();
        this.heroSelectView = undefined;
      },
    );
  }

  private _createBattleScene(): void {
    AdSystem.getInstance().hideBanner();

    const level = this._levelConfig;
    const mode = this._bootMode === 'journey' && level ? GameMode.JOURNEY : GameMode.DEFENSE;

    // ---- 确定棋盘模板与章节 ID ----
    let boardTemplate = DEFENSE_DEFAULT_TEMPLATE;
    let chapterId: number | undefined;

    if (mode === GameMode.JOURNEY && level) {
      boardTemplate = getBoardTemplateForLevel(level.levelId);
      chapterId = level.chapter;
    } else {
      // 守护模式：随机选一章地图
      const rolled = rollDefenseChapter();
      chapterId = rolled.chapterId;
      boardTemplate = getBoardTemplateForChapter(chapterId);
      console.log(`[GuardMonk] 守护模式随机地图：${rolled.name} (Ch${chapterId})`);
    }

    this._battleChapterId = chapterId;
    const chapterConfig = chapterId ? getChapterConfig(chapterId) : undefined;

    // ---- 战斗背景（按章节） ----
    this._drawBattleBackdrop(chapterId);

    // ---- 锁定格计算（狮驼岭机制：锁格 +30%） ----
    let lockedCells = getLockedCellsForTemplate(boardTemplate);
    if (chapterConfig?.specialMechanic.type === 'stats_boost') {
      // 狮驼岭：锁格数量增加 30%
      const boostCount = Math.floor(lockedCells.length * 0.3);
      const lockedSet = new Set(lockedCells.map(lc => `${lc[0]},${lc[1]}`));
      const pathKeys = new Set(boardTemplate.path.map(p => `${p.row},${p.col}`));
      // 从非路径、非已锁、非开放格中找额外格子
      const extraCells: Array<[number, number]> = [];
      for (let r = 0; r < boardTemplate.rows; r++) {
        for (let c = 0; c < boardTemplate.cols; c++) {
          const key = `${r},${c}`;
          if (!pathKeys.has(key) && !lockedSet.has(key)) {
            extraCells.push([r, c]);
          }
        }
      }
      // 随机选额外锁格
      for (let i = 0; i < boostCount && extraCells.length > 0; i++) {
        const idx = Phaser.Math.Between(0, extraCells.length - 1);
        lockedCells.push(extraCells.splice(idx, 1)[0]);
      }
    }

    // ---- 游戏状态初始化 ----
    gameMgr.setMode(mode);
    if (mode === GameMode.JOURNEY && level) {
      gameMgr.setCurrentLevel(level.levelId);
      const levelData = LevelData.getInstance();
      levelData.loadFromSave();
      this._journeyLoop = levelData.currentLoop;
      gameMgr.setCurrentLoop(this._journeyLoop);
    } else {
      this._journeyLoop = 1;
      gameMgr.setCurrentLoop(1);
    }
    gameMgr.startNewGame(mode);
    SummonSystem.getInstance().reset();

    // ---- 棋盘初始化（传入章节 ID 以启用主题配色） ----
    this.gridMgr = new GridManager(this);
    this.gridMgr.init(boardTemplate, chapterId);
    this.gridMgr.setLockedCells(lockedCells);

    // ---- 唐僧 ----
    this.monk = new TangMonk(this);
    this.gridMgr.unitContainer.add(this.monk.sprite);
    eventMgr.on(GameEvent.MONK_DAMAGED, this._monkDamageHandler);

    // ---- 战斗系统 ----
    this.battleSystem = new BattleSystem(this, this.monk);
    this.artifactSystem = new ArtifactSystem(this.gridMgr, this.battleSystem, this.monk);
    this.waveSystem = new WaveSystem(this.battleSystem);
    this.hudView = new HudView(this);
    this.artifactBarView = new ArtifactBarView(this, this.gridMgr, this.artifactSystem);
    this.heroPanelView = new HeroPanelView(this);
    this.tutorialHintView = new TutorialHintView(this);
    this.boardControlView = new BoardUnitControlView(this, this.gridMgr, this.battleSystem);
    this.inventoryBarView = new InventoryBarView(this, this.gridMgr, this.battleSystem, this.boardControlView);
    this.summonPanel = new SummonPanel(
      this,
      this.gridMgr,
      this.battleSystem,
      this.inventoryBarView,
      this.boardControlView,
    );
    this.inventoryBarView.setCardSlotDropTarget(this.summonPanel);
    this.boardControlView.setDropTargets(this.inventoryBarView, this.summonPanel);
    this.resultView = new ResultView(
      this,
      () => this.scene.restart({ mode: 'defense' } satisfies SceneBootData),
      () => this.scene.restart({ mode: 'map' } satisfies SceneBootData),
    );

    // ---- 章节机制系统初始化 ----
    if (mode === GameMode.JOURNEY && chapterConfig) {
      // 八十一难：单章固定机制
      const mechanic = chapterConfig.specialMechanic;
      if (mechanic.type !== 'none') {
        this.chapterMechanicSystem = new ChapterMechanicSystem(
          mechanic,
          this.battleSystem,
          this.gridMgr,
        );
        console.log(`[GuardMonk] 章节机制：${mechanic.type} (Ch${chapterId} ${chapterConfig.name})`);
      }
    } else if (mode === GameMode.DEFENSE) {
      // 守护模式：多机制并行管理器（初始无机制，按波次递增）
      this.compositeMechanicManager = new CompositeMechanicManager(
        this.battleSystem,
        this.gridMgr,
      );
    }

    // ---- 波次启动 ----
    const startWaves = (): void => {
      if (mode === GameMode.JOURNEY && level) {
        const loopDifficulty = getJourneyLoopDifficulty(this._journeyLoop);
        // 狮驼岭机制：敌人数值提升
        const statsBoostMult = chapterConfig?.specialMechanic.type === 'stats_boost'
          ? 1 + (chapterConfig.specialMechanic.value ?? 15) / 100
          : 1;

        this.waveSystem?.start({
          waves: level.waves,
          transformWave: wave => ({
            ...wave,
            startDelay: wave.startDelay,
            enemies: wave.enemies.map(group => ({
              ...group,
              interval: Number((group.interval * loopDifficulty.intervalMultiplier).toFixed(3)),
              hpMultiplier: Number(((group.hpMultiplier ?? 1) * loopDifficulty.hpMultiplier * statsBoostMult).toFixed(3)),
              attackMultiplier: Number(((group.attackMultiplier ?? 1) * loopDifficulty.attackMultiplier * statsBoostMult).toFixed(3)),
              speedMultiplier: Number(((group.speedMultiplier ?? 1) * loopDifficulty.speedMultiplier).toFixed(3)),
            })),
          }),
        });
      } else {
        // 守护模式：传入章节机制相关的回调
        this.waveSystem?.start({
          endless: true,
          onWaveStart: (waveNumber: number) => {
            this._onDefenseWaveStart(waveNumber);
          },
        });
      }
    };

    this.monk.playIntro(this.gridMgr.pathPoints, startWaves);

    console.log(`[GuardMonk] ${mode === GameMode.JOURNEY ? '八十一难' : '守护模式'}战斗启动 (Ch${chapterId ?? 'default'})`);
  }

  /** 守护模式波次启动回调：按波次递增叠加机制 */
  private _onDefenseWaveStart(waveNumber: number): void {
    if (!this.compositeMechanicManager) return;

    // 波次 1-10：无机制
    // 波次 11-20：启动第 1 个随机机制
    // 波次 21-30：叠加第 2 个随机机制
    // 波次 31+：叠加第 3 个随机机制
    const stage1Trigger = waveNumber === 11;
    const stage2Trigger = waveNumber === 21;
    const stage3Trigger = waveNumber === 31;

    if (stage1Trigger) {
      const mechs = rollDefenseMechanics(1);
      for (const m of mechs) {
        this.compositeMechanicManager.addMechanic(m);
      }
    } else if (stage2Trigger) {
      const currentTypes = new Set(this.compositeMechanicManager.systems.map(s => s.mechanic.type));
      // 从池中找一个不同的机制
      const mechs = rollDefenseMechanics(3).filter(m => !currentTypes.has(m.type));
      if (mechs.length > 0) {
        this.compositeMechanicManager.addMechanic(mechs[0]);
      }
    } else if (stage3Trigger) {
      const currentTypes = new Set(this.compositeMechanicManager.systems.map(s => s.mechanic.type));
      const mechs = rollDefenseMechanics(4).filter(m => !currentTypes.has(m.type));
      if (mechs.length > 0) {
        this.compositeMechanicManager.addMechanic(mechs[0]);
      }
    }
  }

  private _drawBattleBackdrop(chapterId?: number): void {
    // 按章节选战斗背景
    let bgKey = '战斗背景_森林'; // 默认
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

  private _shutdownScene(): void {
    eventMgr.off(GameEvent.MONK_DAMAGED, this._monkDamageHandler);
    // 清理机制系统
    this.chapterMechanicSystem?.destroy();
    this.chapterMechanicSystem = undefined;
    this.compositeMechanicManager?.destroy();
    this.compositeMechanicManager = undefined;
    // 重置全局状态
    setGlobalHealMultiplier(1);
    setGlobalSpeedMultiplier(1);

    this.hudView?.destroy();
    this.artifactBarView?.destroy();
    this.heroPanelView?.destroy();
    this.tutorialHintView?.destroy();
    this.summonPanel?.destroy();
    this.inventoryBarView?.destroy();
    this.boardControlView?.destroy();
    this.resultView?.destroy();
    this.journeyMapView?.destroy();
    this.heroSelectView?.destroy();
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
