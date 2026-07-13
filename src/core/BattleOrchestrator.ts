/**
 * 战斗编排器 — 封装所有战斗场景的系统创建、UI 组装和生命周期管理
 * 深度模块：接口 { setup, update, shutdown } 隐藏了 ~180 行的编排复杂性
 */
import Phaser from 'phaser';
import { gameMgr } from './GameManager';
import { eventMgr, GameEvent } from './EventManager';
import { getChapterConfig, rollDefenseChapter, rollDefenseMechanics } from '../config/ChapterConfig';
import { DEFENSE_DEFAULT_TEMPLATE, getBoardTemplateForChapter, getBoardTemplateForLevel, getLockedCellsForTemplate } from '../data/DefenseBoardData';
import { getJourneyLevel } from '../data/JourneyLevelData';
import { LevelData, getJourneyLoopDifficulty } from '../data/LevelData';
import { TangMonk } from '../entities/TangMonk';
import { GridManager } from '../grid/GridManager';
import { BattleSystem } from '../systems/BattleSystem';
import { ArtifactSystem } from '../systems/ArtifactSystem';
import { AdSystem } from '../systems/AdSystem';
import { SummonSystem } from '../systems/SummonSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { ChapterMechanicSystem, CompositeMechanicManager } from '../systems/ChapterMechanicSystem';
import { setGlobalHealMultiplier, setGlobalSpeedMultiplier } from '../systems/MechanicState';
import { GameMode, LevelConfig } from '../types';
import { ArtifactBarView } from '../ui/ArtifactBarView';
import { HeroPanelView } from '../ui/HeroPanelView';
import { BoardUnitControlView } from '../ui/BoardUnitControlView';
import { HudView } from '../ui/HudView';
import { InventoryBarView } from '../ui/InventoryBarView';
import { ResultView } from '../ui/ResultView';
import { SummonPanel } from '../ui/SummonPanel';
import { TutorialHintView } from '../ui/TutorialHintView';
import { DragMediator } from '../ui/DragMediator';

export interface OrchestratorCallbacks {
  onDefenseRestart: () => void;
  onReturnMap: () => void;
}

export class BattleOrchestrator {
  // ---- 系统 ----
  private gridMgr?: GridManager;
  private monk?: TangMonk;
  private battleSystem?: BattleSystem;
  private artifactSystem?: ArtifactSystem;
  private waveSystem?: WaveSystem;

  // ---- 章节机制 ----
  private chapterMechanicSystem?: ChapterMechanicSystem;
  private compositeMechanicManager?: CompositeMechanicManager;
  private battleChapterId?: number;

  // ---- UI 视图 ----
  private hudView?: HudView;
  private artifactBarView?: ArtifactBarView;
  private heroPanelView?: HeroPanelView;
  private tutorialHintView?: TutorialHintView;
  private boardControlView?: BoardUnitControlView;
  private inventoryBarView?: InventoryBarView;
  private summonPanel?: SummonPanel;
  private resultView?: ResultView;

  // ---- 状态 ----
  private journeyLoop: number = 1;
  private monkDamageHandler: (hp: number) => void;

  constructor(
    private scene: Phaser.Scene,
    private callbacks: OrchestratorCallbacks,
  ) {
    this.monkDamageHandler = (hp: number): void => {
      this.monk?.updateHp(hp);
    };
  }

  // ==================== 公开接口 ====================

  /** 初始化并启动一场战斗（防守模式或八十一难模式） */
  setup(mode: GameMode, levelConfig: LevelConfig | null, chapterId: number | undefined): void {
    AdSystem.getInstance().hideBanner();

    // ---- 确定棋盘模板与章节 ID ----
    let boardTemplate = DEFENSE_DEFAULT_TEMPLATE;

    if (mode === GameMode.JOURNEY && levelConfig) {
      boardTemplate = getBoardTemplateForLevel(levelConfig.levelId);
      chapterId = levelConfig.chapter;
    } else {
      const rolled = rollDefenseChapter();
      chapterId = rolled.chapterId;
      boardTemplate = getBoardTemplateForChapter(chapterId);
      console.log(`[GuardMonk] 守护模式随机地图：${rolled.name} (Ch${chapterId})`);
    }

    this.battleChapterId = chapterId;
    const chapterConfig = chapterId ? getChapterConfig(chapterId) : undefined;

    // ---- 锁定格计算（狮驼岭机制：锁格 +30%） ----
    let lockedCells = getLockedCellsForTemplate(boardTemplate);
    if (chapterConfig?.specialMechanic.type === 'stats_boost') {
      const boostCount = Math.floor(lockedCells.length * 0.3);
      const lockedSet = new Set(lockedCells.map(lc => `${lc[0]},${lc[1]}`));
      const pathKeys = new Set(boardTemplate.path.map(p => `${p.row},${p.col}`));
      const extraCells: Array<[number, number]> = [];
      for (let r = 0; r < boardTemplate.rows; r++) {
        for (let c = 0; c < boardTemplate.cols; c++) {
          const key = `${r},${c}`;
          if (!pathKeys.has(key) && !lockedSet.has(key)) {
            extraCells.push([r, c]);
          }
        }
      }
      for (let i = 0; i < boostCount && extraCells.length > 0; i++) {
        const idx = Phaser.Math.Between(0, extraCells.length - 1);
        lockedCells.push(extraCells.splice(idx, 1)[0]);
      }
    }

    // ---- 游戏状态初始化 ----
    gameMgr.setMode(mode);
    if (mode === GameMode.JOURNEY && levelConfig) {
      gameMgr.setCurrentLevel(levelConfig.levelId);
      const levelData = LevelData.getInstance();
      levelData.loadFromSave();
      this.journeyLoop = levelData.currentLoop;
      gameMgr.setCurrentLoop(this.journeyLoop);
    } else {
      this.journeyLoop = 1;
      gameMgr.setCurrentLoop(1);
    }
    gameMgr.startNewGame(mode);
    SummonSystem.getInstance().reset();

    // ---- 棋盘初始化（传入章节 ID 以启用主题配色） ----
    this.gridMgr = new GridManager(this.scene);
    this.gridMgr.init(boardTemplate, chapterId);
    this.gridMgr.setLockedCells(lockedCells);

    // ---- 唐僧 ----
    this.monk = new TangMonk(this.scene);
    this.gridMgr.unitContainer.add(this.monk.sprite);
    eventMgr.on(GameEvent.MONK_DAMAGED, this.monkDamageHandler);

    // ---- 战斗系统 ----
    this.battleSystem = new BattleSystem(this.scene, this.monk);
    this.artifactSystem = new ArtifactSystem(this.gridMgr, this.battleSystem, this.monk);
    this.waveSystem = new WaveSystem(this.battleSystem);
    this.hudView = new HudView(this.scene);
    this.artifactBarView = new ArtifactBarView(this.scene, this.gridMgr, this.artifactSystem);
    this.heroPanelView = new HeroPanelView(this.scene);
    this.tutorialHintView = new TutorialHintView(this.scene);

    // 创建 DragMediator — 替代 post-construction 连线
    const dragMediator = new DragMediator();

    this.boardControlView = new BoardUnitControlView(
      this.scene, this.gridMgr, this.battleSystem, dragMediator,
    );
    this.inventoryBarView = new InventoryBarView(
      this.scene, this.gridMgr, this.battleSystem, dragMediator,
    );
    this.summonPanel = new SummonPanel(
      this.scene, this.gridMgr, this.battleSystem, dragMediator,
    );
    // 不再需要 setCardSlotDropTarget / setDropTargets — 由 DragMediator 自动路由

    this.resultView = new ResultView(
      this.scene,
      this.callbacks.onDefenseRestart,
      this.callbacks.onReturnMap,
    );

    // ---- 章节机制系统初始化 ----
    if (mode === GameMode.JOURNEY && chapterConfig) {
      const mechanic = chapterConfig.specialMechanic;
      if (mechanic.type !== 'none') {
        this.chapterMechanicSystem = new ChapterMechanicSystem(
          mechanic, this.battleSystem, this.gridMgr,
        );
        console.log(`[GuardMonk] 章节机制：${mechanic.type} (Ch${chapterId} ${chapterConfig.name})`);
      }
    } else if (mode === GameMode.DEFENSE) {
      this.compositeMechanicManager = new CompositeMechanicManager(
        this.battleSystem, this.gridMgr,
      );
    }

    // ---- 波次启动 ----
    const startWaves = (): void => {
      if (mode === GameMode.JOURNEY && levelConfig) {
        const loopDifficulty = getJourneyLoopDifficulty(this.journeyLoop);
        const statsBoostMult = chapterConfig?.specialMechanic.type === 'stats_boost'
          ? 1 + (chapterConfig.specialMechanic.value ?? 15) / 100
          : 1;

        this.waveSystem?.start({
          waves: levelConfig.waves,
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
        this.waveSystem?.start({
          endless: true,
          onWaveStart: (waveNumber: number) => {
            this.onDefenseWaveStart(waveNumber);
          },
        });
      }
    };

    this.monk.playIntro(this.gridMgr.pathPoints, startWaves);

    console.log(`[GuardMonk] ${mode === GameMode.JOURNEY ? '八十一难' : '守护模式'}战斗启动 (Ch${chapterId ?? 'default'})`);
  }

  /** 每帧更新 */
  update(dt: number): void {
    if (!this.waveSystem || !this.battleSystem) return;
    gameMgr.update(dt);
    this.waveSystem.update(dt);
    this.battleSystem.update(dt);

    if (this.chapterMechanicSystem) {
      this.chapterMechanicSystem.update(dt);
    }
    if (this.compositeMechanicManager) {
      this.compositeMechanicManager.update(dt);
    }
  }

  /** 完整清理 */
  shutdown(): void {
    eventMgr.off(GameEvent.MONK_DAMAGED, this.monkDamageHandler);

    // 清理机制系统
    this.chapterMechanicSystem?.destroy();
    this.chapterMechanicSystem = undefined;
    this.compositeMechanicManager?.destroy();
    this.compositeMechanicManager = undefined;

    // 重置全局状态
    setGlobalHealMultiplier(1);
    setGlobalSpeedMultiplier(1);

    // 清理 UI 视图
    this.hudView?.destroy();
    this.artifactBarView?.destroy();
    this.heroPanelView?.destroy();
    this.tutorialHintView?.destroy();
    this.summonPanel?.destroy();
    this.inventoryBarView?.destroy();
    this.boardControlView?.destroy();
    this.resultView?.destroy();

    // 清理系统（修复：ArtifactSystem.destroy() 此前从未被调用）
    this.artifactSystem?.destroy();
    this.battleSystem?.destroy();
    this.waveSystem?.destroy();

    // 清理 GridManager 静态引用
    this.gridMgr?.destroy();
    this.gridMgr = undefined;
  }

  // ==================== 内部：防守模式波次机制递增 ====================

  /** 防守模式波次启动回调：按波次递增叠加机制 */
  private onDefenseWaveStart(waveNumber: number): void {
    if (!this.compositeMechanicManager) return;

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
}
