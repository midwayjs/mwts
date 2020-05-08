# mwts
> MidwayJS TypeScript Style

[![NPM Version][npm-image]][npm-url]
[![GitHub Actions][github-image]][github-url]
[![codecov][codecov-image]][codecov-url]
[![TypeScript Style Guide][mwts-image]][mwts-url]

[mwts][npm-url] is Alibaba MidwayJS TypeScript style guide, and the configuration for our formatter, linter, and automatic code fixer. No lint rules to edit, no configuration to update, no more bike shedding over syntax.

To borrow from [standardjs][standardjs-url]:
- **No configuration**. The easiest way to enforce consistent style in your project. Just drop it in.
- **Automatically format code**. Just run `mwts fix` and say goodbye to messy or inconsistent code.
- **Catch style issues & programmer errors early**. Save precious code review time by eliminating back-and-forth between reviewer & contributor.
- **Opinionated, but not to a fault**. We recommend you use the default configuration, but if you *need* to customize compiler or linter config, you can.

Under the covers, we use [eslint][eslint-url] to enforce the style guide and provide automated fixes, and [prettier][prettier-url] to re-format code.

## Getting Started

The easiest way to get started is to run:
```sh
npx mwts init
```

## How it works
When you run the `npx mwts init` command, it's going to do a few things for you:
- Adds an opinionated `tsconfig.json` file to your project that uses the MidwayJS TypeScript Style.
- Adds the necessary devDependencies to your `package.json`.
- Adds scripts to your `package.json`:
  - `check`: Lints and checks for formatting problems.
  - `fix`: Automatically fixes formatting and linting problems (if possible).
  - `clean`: Removes output files.
  - `build`: Compiles the source code using TypeScript compiler.
  - `pretest`, `posttest` and `prepare`: convenience integrations.
- If a source folder is not already present it will add a default template project.

### Individual files
The commands above will all run in the scope of the current folder.  Some commands can be run on individual files:

```sh
mwts check index.ts
mwts check one.ts two.ts three.ts
mwts check *.ts
```

### Working with eslint
Under the covers, we use [eslint][eslint-url] to enforce the style guide and provide automated fixes, and [prettier][prettier-url] to re-format code. To use the shared `eslint` configuration, create an `.eslintrc` in your project directory, and extend the shared config:

```yml
---
extends:
  - './node_modules/mwts'
```

If you don't want to use the `mwts` CLI, you can drop down to using the module as a basic `eslint` config, and just use the `eslint` cli:

```
$ eslint --fix
```

This opens the ability to use the vast `eslint` ecosystem including custom rules, and tools like the VSCode plugin for eslint:
- https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint


## Badge
Show your love for `mwts` and include a badge!

[![Code Style: MidwayJS](https://img.shields.io/badge/code%20style-midwayjs-brightgreen.svg)](https://github.com/midwayjs/mwts)

```md
[![Code Style: MidwayJS](https://img.shields.io/badge/code%20style-midwayjs-brightgreen.svg)](https://github.com/midwayjs/mwts)
```

## Supported Node.js Versions
Our client libraries follow the [Node.js release schedule](https://nodejs.org/en/about/releases/). Libraries are compatible with all current _active_ and _maintenance_ versions of Node.js.

## License
[Apache-2.0](LICENSE)

---
Made with ❤️ by the Alibaba Node.js team.

> A derived project from the awesome [gts](https://github.com/google/gts).

[github-image]: https://github.com/midwayjs/mwts/workflows/ci/badge.svg
[github-url]: https://github.com/midwayjs/mwts/actions
[prettier-url]: https://prettier.io/
[codecov-image]: https://codecov.io/gh/midwayjs/mwts/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/midwayjs/mwts
[mwts-image]: https://img.shields.io/badge/code%20style-midwayjs-brightgreen.svg
[mwts-url]: https://github.com/midwayjs/mwts
[npm-image]: https://img.shields.io/npm/v/mwts.svg
[npm-url]: https://npmjs.org/package/mwts
[standardjs-url]: https://www.npmjs.com/package/standard
[eslint-url]: https://eslint.org/
