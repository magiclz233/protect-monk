/**
 * 主入口 - 创建Phaser游戏，启动游戏循环
 */
import Phaser from 'phaser';
import { GridManager, DESIGN_W, DESIGN_H } from './grid/GridManager';
import { gameMgr } from './core/GameManager';
import { GameMode, Waypoint } from './types';
import { TangMonk } from './entities/TangMonk';

export class GameScene extends Phaser.Scene {
  gridMgr!: GridManager;
  monk!: TangMonk;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // 初始化网格管理器（传入scene引用）
    this.gridMgr = new GridManager(this);
    this.gridMgr.init(80);

    // 设置路径（8×6 网格，S形路径）
    const path: Waypoint[] = [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
      { row: 0, col: 3 }, { row: 0, col: 4 }, { row: 0, col: 5 },
      { row: 0, col: 6 }, { row: 0, col: 7 },
      { row: 1, col: 7 }, { row: 1, col: 6 }, { row: 1, col: 5 },
      { row: 1, col: 4 }, { row: 1, col: 3 }, { row: 1, col: 2 },
      { row: 1, col: 1 }, { row: 1, col: 0 },
      { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 },
      { row: 2, col: 3 }, { row: 2, col: 4 }, { row: 2, col: 5 },
      { row: 2, col: 6 }, { row: 2, col: 7 },
      { row: 3, col: 7 }, { row: 3, col: 6 }, { row: 3, col: 5 },
      { row: 3, col: 4 }, { row: 3, col: 3 }, { row: 3, col: 2 },
      { row: 3, col: 1 }, { row: 3, col: 0 },
      { row: 4, col: 0 }, { row: 4, col: 1 }, { row: 4, col: 2 },
      { row: 4, col: 3 }, { row: 4, col: 4 }, { row: 4, col: 5 },
      { row: 4, col: 6 }, { row: 4, col: 7 },
      { row: 5, col: 7 }, { row: 5, col: 6 }, { row: 5, col: 5 },
    ];
    this.gridMgr.setPath(path);
    this.gridMgr.setLockedCells([[2, 3], [2, 6], [3, 1], [4, 4]]);

    // 唐僧
    this.monk = new TangMonk(this);
    this.gridMgr.unitContainer.add(this.monk.sprite);

    // 初始化游戏状态
    gameMgr.setMode(GameMode.DEFENSE);
    gameMgr.startNewGame(GameMode.DEFENSE);

    console.log('[GuardMonk] Phaser 3 初始化完成');
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000; // ms → 秒
    // 主循环由 GameScreen 管理
  }
}

// ==================== 启动 ====================

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: DESIGN_W,
  height: DESIGN_H,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene],
};

new Phaser.Game(config);

console.log('[GuardMonk] Phaser 游戏实例已创建');
