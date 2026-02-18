<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# AGENTS.md

## 项目概览
- 包名：`mwts`
- 目标：提供 MidwayJS 风格的 TypeScript 工程规范与 CLI（`init` / `lint` / `fix` / `clean`）。
- 运行时：Node.js，TypeScript 编译到 `dist/` 后执行。
- 设计与实现思路来源于 https://github.com/google/gts，但本项目不直接依赖 `gts` 包。

## 目录与职责
- `src/cli.ts`：CLI 入口与命令分发。
- `src/init.ts`：初始化项目（写配置、补 scripts/deps、可安装模板）。
- `src/clean.ts`：根据 `tsconfig.json` 的 `outDir` 删除构建产物。
- `src/util.ts`：通用工具（读取 JSON/TSConfig、包管理器判断等）。
- `template/`：`mwts init` 注入的默认 `src` 模板。
- `test/`：单测与 kitchen system test。

## 常用命令
- 安装依赖：`npm install`
- 构建：`npm run build`
- Lint：`npm run lint`
- 自动修复：`npm run fix`
- 单测：`npm test`
- 系统测试：`npm run system-test`

注意：测试依赖编译产物（`pretest` / `presystem-test` 会先执行 `npm run build`）。

## 代码与变更约束
- 保持 CommonJS + TS 现有风格，不引入 ESM 改造。
- 新增/修改 CLI 行为时，同步更新：
  - `README.md`（用户可见命令说明）
  - `test/test-*.ts` 与必要的 `test/kitchen.ts`
- `init` 相关改动需保证：
  - 生成文件以换行结尾（已有系统测试覆盖）
  - 不破坏 `--dry-run` / `-y` / `-n` / `--yarn` 语义
- `clean` 相关改动需保证：
  - 不允许删除 `outDir='.'`
  - 缺少 `outDir` 时返回失败而非误删

## 测试策略（提交前最低要求）
1. `npm run lint`
2. `npm test`
3. 若改动了 `init`、模板复制、跨平台执行逻辑，再跑 `npm run system-test`

## 已知实现细节
- `lint/check/fix` 通过 `execa` 调用 `eslint/bin/eslint`。
- `init` 会在非 dry-run 下执行 `npm|yarn install --ignore-scripts`。
- 包导出 ESLint 配置：`src/index.ts -> .eslintrc.json`。
