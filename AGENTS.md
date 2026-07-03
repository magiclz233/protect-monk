# 仓库指南

## 项目结构与模块组织

本项目是基于 Phaser 3、TypeScript 和 Vite 的小游戏工程。入口文件是 `src/main.ts`，负责创建 Phaser 游戏实例和场景。核心管理与通用能力位于 `src/core/`，玩法数据和存档位于 `src/data/`，棋盘逻辑位于 `src/grid/`，游戏实体位于 `src/entities/`，玩法系统位于 `src/systems/`，数值配置位于 `src/config/`，共享类型定义位于 `src/types.ts`。构建产物输出到 `dist/`，不要提交。根目录 Markdown 文件用于设计方案和开发路线记录。

## 构建、测试与本地开发命令

本仓库使用 pnpm，锁文件为 `pnpm-lock.yaml`。

```bash
pnpm install      # 安装依赖
pnpm dev          # 启动 Vite 开发服务器，默认端口 3000
pnpm build        # 执行 TypeScript 检查并输出 dist/game.js
pnpm preview      # 本地预览构建结果
```

当前主要验证命令是 `pnpm build`，因为它会先运行 `tsc` 再执行 Vite 打包。

## 编码风格与命名约定

使用严格 TypeScript，目标为 ES2020。保持现有风格：两个空格缩进、单引号、语句结尾使用分号，公开方法建议写明返回类型。实体、管理器、系统和配置文件使用 PascalCase，例如 `GameManager.ts`、`MergeSystem.ts`；变量和方法使用 camelCase。跨目录导入可使用已配置的 `@/*` 别名，局部相邻模块也可以继续使用相对路径。

## 语言与注释限制

后续新增或修改的代码注释、文档、提交信息、PR 描述、开发说明等默认使用简体中文。保留英文仅用于命令、API 名称、类型名、文件名、第三方库名、协议字段或必须与外部系统一致的文本。不要新增乱码文本；编辑现有中文内容时确保保存为 UTF-8。

## 测试指南

当前尚未配置自动化测试框架。提交前至少运行 `pnpm build`，并通过 `pnpm dev` 做基础玩法冒烟验证。后续添加测试时，可将测试与功能模块就近放置，或建立清晰的 `tests/` 目录；测试文件应按被测模块命名，并优先覆盖 `src/core/`、`src/systems/`、`src/grid/` 中可确定结果的逻辑。

## 提交与 Pull Request 规范

现有提交记录采用 Conventional Commit 风格，例如 `feat: ...`、`docs: ...`。继续使用简短、祈使式的中文提交标题，例如 `fix: 修正合成消耗计算` 或 `feat: 添加敌人波次调度`。

PR 应包含变更摘要、验证步骤（如 `pnpm build`）、相关 issue 或设计文档链接；涉及可见玩法或 UI 改动时，附截图或录屏。

## 安全与配置提示

不要提交本地环境文件、微信开发者工具私有配置、`node_modules/` 或 `dist/`。生成产物应始终能通过源码和脚本重新生成。

