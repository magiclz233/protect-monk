import './platform/WechatAdapter';
import Phaser from 'phaser';
import { gameMgr } from './core/GameManager';
import { eventMgr, GameEvent } from './core/EventManager';
import { DEFENSE_DEFAULT_TEMPLATE, getBoardTemplateForLevel, getLockedCellsForTemplate } from './data/DefenseBoardData';
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
    this._drawBattleBackdrop();

    const level = this._levelConfig;
    const mode = this._bootMode === 'journey' && level ? GameMode.JOURNEY : GameMode.DEFENSE;
    const boardTemplate = mode === GameMode.JOURNEY && level
      ? getBoardTemplateForLevel(level.levelId)
      : DEFENSE_DEFAULT_TEMPLATE;
    const lockedCells = getLockedCellsForTemplate(boardTemplate);

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

    this.gridMgr = new GridManager(this);
    this.gridMgr.init(boardTemplate);
    this.gridMgr.setLockedCells(lockedCells);

    this.monk = new TangMonk(this);
    this.gridMgr.unitContainer.add(this.monk.sprite);
    eventMgr.on(GameEvent.MONK_DAMAGED, this._monkDamageHandler);

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

    const startWaves = (): void => {
      if (mode === GameMode.JOURNEY && level) {
        const loopDifficulty = getJourneyLoopDifficulty(this._journeyLoop);
        this.waveSystem?.start({
          waves: level.waves,
          transformWave: wave => ({
            ...wave,
            startDelay: wave.startDelay,
            enemies: wave.enemies.map(group => ({
              ...group,
              interval: Number((group.interval * loopDifficulty.intervalMultiplier).toFixed(3)),
              hpMultiplier: Number(((group.hpMultiplier ?? 1) * loopDifficulty.hpMultiplier).toFixed(3)),
              attackMultiplier: Number(((group.attackMultiplier ?? 1) * loopDifficulty.attackMultiplier).toFixed(3)),
              speedMultiplier: Number(((group.speedMultiplier ?? 1) * loopDifficulty.speedMultiplier).toFixed(3)),
            })),
          }),
        });
      } else {
        this.waveSystem?.start(true);
      }
    };

    this.monk.playIntro(this.gridMgr.pathPoints, startWaves);

    console.log(`[GuardMonk] ${mode === GameMode.JOURNEY ? '八十一难' : '守护模式'}战斗启动`);
  }

  private _drawBattleBackdrop(): void {
    // 使用战斗背景图片
    const bg = this.add.image(0, 0, '战斗背景_森林');
    bg.setOrigin(0, 0);
    bg.setDisplaySize(DESIGN_W, DESIGN_H);
    bg.setDepth(-20);
  }

  private _shutdownScene(): void {
    eventMgr.off(GameEvent.MONK_DAMAGED, this._monkDamageHandler);
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
