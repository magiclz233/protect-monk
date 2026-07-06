# 守护唐僧 - 西游合成塔防微信小游戏

> Phaser 3 + TypeScript + Vite

## 快速开始

```bash
pnpm install
pnpm dev          # 浏览器开发调试
pnpm test         # 运行命令行逻辑回归测试
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
│   ├── EnemyConfig.ts   # 怪物：普通/精英/BOSS
│   └── VisualConfig.ts  # 程序化美术主色、轮廓和图标配置
├── render/              # 程序化图形绘制工具
│   └── VisualPainter.ts # 小兵、英雄、敌人、道具图标绘制
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
│   ├── InventoryLogic.ts # 统一仓库槽位、碎片消耗规则
│   ├── ExperienceSystem.ts  # 经验分配
│   ├── FactionSystem.ts # 阵营羁绊
│   ├── EffectSystem.ts  # 对象池特效、短弹道和命中反馈
│   └── ItemSystem.ts    # 道具系统
├── data/                # 数据持久化
│   ├── SaveManager.ts   # 本地存档
│   ├── HeroData.ts      # 英雄数据
│   └── LevelData.ts     # 关卡进度
├── ui/                  # UI组件
│   ├── InventoryBarView.ts # 统一仓库：道具和英雄碎片共用槽位
│   ├── SummonPanel.ts      # 召唤卡池与拖拽上阵
│   └── BoardUnitControlView.ts # 棋盘单位拖动、换位、回收
└── utils/
    └── MathUtils.ts     # 数学工具
```

## 核心玩法

- **守护模式**（主模式）：随机召唤+小兵合成+英雄养成，无限波次冲分
- **八十一难模式**（长线闯关）：取经路线图81关，战前选将，策略布防
- **统一仓库栏**：道具和英雄碎片共用仓库槽，每个道具或碎片占 1 格，初始 5 格、最多 8 格。
- **碎片合成**：拖指定英雄碎片到空闲非路径格，普通英雄消耗 2 个同名碎片，核心英雄消耗 3 个同名碎片；不足时只放置不可攻击碎片占位。
- **通用碎片**：作为仓库中的万能补位材料参与合成，但不能单独决定生成哪个英雄。
- **玉净瓶**：守护唐僧，使用后唐僧最大血量和当前血量各 +2，最大血量上限 7。
- **程序化美术基线**：MVP 阶段使用 `Graphics` 绘制 Q 版西游轮廓、道具图标、英雄稀有度边框和短弹道反馈；正式 PNG/atlas 后续替换。

## 微信小游戏构建

构建输出 `dist/game.js`（CJS 单文件），配合微信适配层使用。

> 详细设计方案见 `西游合成塔防微信小游戏 最终设计方案.md`
