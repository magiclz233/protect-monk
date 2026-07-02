# 守护唐僧 - 西游合成塔防微信小游戏

> Phaser 3 + TypeScript + Vite

## 快速开始

```bash
pnpm install
pnpm dev          # 浏览器开发调试
pnpm build        # 构建微信小游戏 CJS 单文件
```

## 技术栈

| 维度 | 选型 | 理由 |
|---|---|---|
| 渲染引擎 | Phaser 3 | 2D游戏框架，内置场景/动画/拖拽/粒子/音效 |
| 构建 | Vite + Rollup | 输出 CJS 单文件给微信小游戏 |
| 状态管理 | 纯 TS 单例 | 不需要额外库 |
| 后端 | MVP 纯单机本地存档 | 后续接入 Supabase |
| 开发体验 | 纯代码，无编辑器 | 你只需要 VS Code |

## 项目结构

```
src/
├── main.ts              # 入口：Phaser.Game + Scene，启动游戏循环
├── types.ts             # 全局类型定义（枚举、接口）
├── config/              # 数值配置表（纯数据）
│   ├── SoldierConfig.ts # 小兵：4兵种×5阶
│   ├── HeroConfig.ts    # 英雄：14名完整属性
│   └── EnemyConfig.ts   # 怪物：普通/精英/BOSS
├── core/                # 核心引擎（零渲染依赖）
│   ├── EventManager.ts  # 全局消息总线
│   ├── GameManager.ts   # 状态/资源/模式管理
│   └── ObjectPool.ts    # 通用对象池
├── grid/                # 棋盘系统
│   └── GridManager.ts   # 8×6网格 + Phaser Graphics渲染
├── entities/            # 游戏实体（Phaser渲染）
│   ├── Unit.ts          # 友方单位基类
│   ├── Soldier.ts       # 小兵：合成升级+攻击
│   ├── Hero.ts          # 英雄：碎片激活+经验升级
│   ├── Enemy.ts         # 妖怪：路径移动+特性
│   └── TangMonk.ts      # 唐僧：保护目标
├── systems/             # 游戏系统（纯逻辑）
│   ├── MergeSystem.ts   # 二合一合成判定
│   ├── SummonSystem.ts  # 卡池召唤
│   ├── ExperienceSystem.ts  # 经验分配
│   ├── FactionSystem.ts # 阵营羁绊
│   └── ItemSystem.ts    # 道具系统
├── data/                # 数据持久化
│   ├── SaveManager.ts   # 本地存档
│   ├── HeroData.ts      # 英雄数据
│   └── LevelData.ts     # 关卡进度
├── ui/                  # UI组件（待实现）
└── utils/
    └── MathUtils.ts     # 数学工具
```

## 核心玩法

- **守护模式**（主模式）：随机召唤+小兵合成+英雄养成，无限波次冲分
- **八十一难模式**（长线闯关）：取经路线图81关，战前选将，策略布防

## 微信小游戏构建

构建输出 `dist/game.js`（CJS 单文件），配合微信适配层使用。

> 详细设计方案见 `西游合成塔防微信小游戏 最终设计方案.md`
