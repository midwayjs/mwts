## 1. Planning and Baseline
- [x] 1.1 Confirm final Node.js and TypeScript minimum versions for `mwts 2.0` based on latest gts compatibility.
- [x] 1.2 Lock target dependency versions/ranges for ESLint, `@typescript-eslint`, Prettier, and related plugins.

## 2. Core Toolchain Upgrade
- [x] 2.1 Upgrade package dependencies/devDependencies to the approved modern baseline.
- [x] 2.2 Update lint config exports and init-generated config files to the modern gts-compatible format.
- [x] 2.3 Ensure CLI lint/fix/check flows still work with upgraded ESLint stack.

## 3. Formatter Strategy Support
- [x] 3.1 Keep default init behavior as `Prettier + ESLint`.
- [x] 3.2 Add a user-selectable init option for `ESLint + Stylistic` mode.
- [x] 3.3 Ensure generated scripts/config/dependencies differ correctly by selected formatter mode.

## 4. Docs and Migration Guidance
- [x] 4.1 Update README and generated project guidance for new baseline and formatter-mode options.
- [x] 4.2 Add migration notes from `mwts 1.x` to `mwts 2.0`.

## 5. Validation
- [x] 5.1 Update and pass unit tests for init/config generation and CLI behavior.
- [x] 5.2 Update and pass system tests for both default mode and stylistic mode.
- [x] 5.3 Run `npm run lint`, `npm test`, `npm run system-test` successfully.
- [x] 5.4 Run `openspec validate update-mwts-2-0-gts7 --strict --no-interactive` successfully.
