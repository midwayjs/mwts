# Change: Upgrade mwts to 2.0 on latest gts baseline

## Why
`mwts` is currently pinned to an old lint/format ecosystem (ESLint 7 era), which causes installation and compatibility issues reported by users (including the dependency conflicts discussed in `midwayjs/mwts#16`).

To resolve this sustainably, `mwts` needs a breaking modernization aligned with latest `gts` and modern TypeScript ESLint tooling.

## What Changes
- Upgrade `mwts` to a **2.0 breaking release** baseline aligned with latest `gts` major.
- Upgrade core lint/format/tooling dependencies to current supported major versions (including `@typescript-eslint` v8 line and modern ESLint/Prettier stack).
- Migrate lint configuration model to modern gts-compatible structure for new initialized projects.
- Keep default formatting strategy as `Prettier + ESLint` (same high-level UX as today).
- Add an optional user-selectable mode to use `ESLint + Stylistic` instead of Prettier.
- Update CLI init behavior, docs, and tests to reflect new defaults and optional formatter strategy.

## Impact
- Affected specs:
  - `core-toolchain` (new)
  - `formatter-strategy` (new)
- Affected code (expected):
  - `package.json`
  - `src/init.ts`
  - `src/cli.ts`
  - lint config exports and generated template/config files
  - `README.md`
  - `test/test-init.ts`, `test/kitchen.ts`, and related fixtures
- Breaking changes:
  - Runtime/toolchain minimums will be raised for `mwts 2.0`.
  - Generated lint config format and dependency set will change.
