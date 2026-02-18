# Project Context

## Purpose
`mwts` is a Node.js CLI package that provides the MidwayJS TypeScript style baseline.
Its goal is to make TypeScript project setup and code quality enforcement consistent with near-zero config:
- Bootstrap project config via `mwts init`
- Enforce lint/style rules via `mwts lint` / `mwts check`
- Auto-fix issues via `mwts fix`
- Clean build artifacts via `mwts clean`

## Tech Stack
- Node.js CLI runtime (engine declared as `>=10`)
- TypeScript (compiled to CommonJS, output in `dist/`)
- ESLint + `@typescript-eslint` + Prettier for style enforcement
- Mocha + c8 for tests and coverage
- meow (CLI parsing), execa (process execution), inquirer (interactive prompts)

## Project Conventions

### Code Style
- TypeScript source lives in `src/`; tests live in `test/`.
- Lint rules are centrally defined in `.eslintrc.json`; Prettier defaults in `.prettierrc.json`.
- Key formatting preferences:
  - single quotes
  - trailing commas (`es5`)
  - bracket spacing enabled
  - arrow parens avoided when possible
- Generated JSON/config files should end with a trailing newline (covered by system tests).
- Favor explicit safety checks in CLI/file operations (e.g., guard against dangerous delete targets).

### Architecture Patterns
- CLI entrypoint: `src/cli.ts`.
- Verb-based command dispatch pattern:
  - `init` -> `src/init.ts`
  - `clean` -> `src/clean.ts`
  - `lint/check/fix` -> delegated to local eslint binary via `execa`
- Shared utilities in `src/util.ts` (JSON/TS config reading, package manager detection, safe error handling).
- Initialization flow is additive/opinionated:
  - updates/creates `package.json` scripts and devDependencies
  - generates config files (`tsconfig.json`, `.eslintrc.json`, `.eslintignore`, `.prettierrc.js`)
  - installs a default `src` template only when no `.ts` files exist

### Testing Strategy
- Unit tests: `test/test-*.ts` (compiled then run from `dist/test`).
- System/integration test: `test/kitchen.ts` validates realistic bootstrap/lint/fix/build/clean behavior in a temp project.
- Coverage via `c8`.
- Expected validation sequence for meaningful changes:
  1. `npm run lint`
  2. `npm test`
  3. `npm run system-test` for changes affecting init/template/cross-platform CLI behavior

### Git Workflow
- Development happens through branches and pull requests (see CI on PR and push).
- Commit messages in history commonly follow short conventional prefixes such as:
  - `fix: ...`
  - `chore(deps): ...`
  - `deps: ...`
  - `rules: ...`
- Keep commits scoped to one logical change and include tests when behavior changes.

## Domain Context
- This package is both:
  - a CLI tool end-users run directly (`npx mwts init`)
  - a shareable lint/style config consumed by other projects
- Backward compatibility of generated project files and CLI flags matters because `mwts` is used to bootstrap external repositories.
- `check` is intentionally kept as an alias for `lint` for compatibility.

## Important Constraints
- Node compatibility baseline is conservative (`>=10` in package metadata and CI matrix includes old Node versions).
- `clean` must never allow destructive deletion of source roots (explicit guard for `outDir='.'`).
- `init` must respect non-interactive flags:
  - `-y/--yes`
  - `-n/--no`
  - `--dry-run`
  - `--yarn`
- Cross-platform behavior (Linux/Windows) is required; CI includes both.

## External Dependencies
- npm registry for package distribution and dependency installation.
- GitHub Actions for CI (`lint`, `test`, `system-test`, coverage jobs).
- Codecov for coverage reporting.
- No business-domain external APIs; dependencies are tooling-focused (linting/formatting/CLI/runtime helpers).
