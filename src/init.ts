import * as cp from 'child_process';
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import * as path from 'path';
import { ncp } from 'ncp';
import * as util from 'util';

import {
  getPkgManagerCommand,
  readFilep as read,
  readJsonp as readJson,
  writeFileAtomicp as write,
  Bag,
  DefaultPackage,
  safeError,
} from './util';

import { Options } from './cli';
import { PackageJson } from '@npm/types';
import chalk = require('chalk');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json');

const ncpp = util.promisify(ncp);

const DEFAULT_PACKAGE_JSON: PackageJson = {
  name: '',
  version: '0.0.0',
  description: '',
  main: 'dist/src/index.js',
  types: 'dist/src/index.d.ts',
  files: ['dist/src'],
  license: 'Apache-2.0',
  keywords: [],
  scripts: { test: 'echo "Error: no test specified" && exit 1' },
};

async function query(
  message: string,
  question: string,
  defaultVal: boolean,
  options: Options
): Promise<boolean> {
  if (options.yes) {
    return true;
  } else if (options.no) {
    return false;
  }

  if (message) {
    options.logger.log(message);
  }

  const answers: inquirer.Answers = await inquirer.prompt({
    type: 'confirm',
    name: 'query',
    message: question,
    default: defaultVal,
  });
  return answers.query;
}

export async function addScripts(
  packageJson: PackageJson,
  options: Options
): Promise<boolean> {
  let edits = false;
  const pkgManager = getPkgManagerCommand(options.yarn);
  const scripts: Bag<string> = {
    lint: 'mwts lint',
    clean: 'mwts clean',
    build: 'tsc',
    fix: 'mwts fix',
    prepare: `${pkgManager} run build`,
    pretest: `${pkgManager} run build`,
    posttest: `${pkgManager} run lint`,
  };

  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }

  for (const script of Object.keys(scripts)) {
    let install = true;
    const existing = packageJson.scripts[script];
    const target = scripts[script];

    if (existing !== target) {
      if (existing) {
        const message =
          `package.json already has a script for ${chalk.bold(script)}:\n` +
          `-${chalk.red(existing)}\n+${chalk.green(target)}`;
        install = await query(message, 'Replace', false, options);
      }

      if (install) {
        // eslint-disable-next-line require-atomic-updates
        packageJson.scripts[script] = scripts[script];
        edits = true;
      }
    }
  }
  return edits;
}

export async function addDependencies(
  packageJson: PackageJson,
  options: Options
): Promise<boolean> {
  let edits = false;
  const deps: DefaultPackage = {
    mwts: `^${pkg.version}`,
    typescript: pkg.devDependencies.typescript,
    '@types/node': pkg.devDependencies['@types/node'],
  };

  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }

  for (const dep of Object.keys(deps)) {
    let install = true;
    const existing = packageJson.devDependencies[dep];
    const target = deps[dep];

    if (existing !== target) {
      if (existing) {
        const message =
          `Already have devDependency for ${chalk.bold(dep)}:\n` +
          `-${chalk.red(existing)}\n+${chalk.green(target)}`;
        install = await query(message, 'Overwrite', false, options);
      }

      if (install) {
        // eslint-disable-next-line require-atomic-updates
        packageJson.devDependencies[dep] = deps[dep];
        edits = true;
      }
    }
  }

  return edits;
}

function formatJson(object: unknown) {
  const json = JSON.stringify(object, null, '  ');
  return `${json}\n`;
}

async function writePackageJson(
  packageJson: PackageJson,
  options: Options
): Promise<void> {
  options.logger.log('Writing package.json...');
  if (!options.dryRun) {
    await write('./package.json', formatJson(packageJson));
  }
  const preview = {
    scripts: packageJson.scripts,
    devDependencies: packageJson.devDependencies,
  };
  options.logger.dir(preview);
}

export const ESLINT_CONFIG = {
  extends: './node_modules/mwts/',
};

export const ESLINT_IGNORE = 'dist/\n';

async function generateConfigFile(
  options: Options,
  filename: string,
  contents: string
) {
  let existing;
  try {
    existing = await read(filename, 'utf8');
  } catch (exc) {
    const err = safeError(exc);
    if (err.code === 'ENOENT') {
      /* not found, create it. */
    } else {
      throw new Error(`Unknown error reading ${filename}: ${err.message}`);
    }
  }

  let writeFile = true;
  if (existing && existing === contents) {
    options.logger.log(`No edits needed in ${filename}`);
    return;
  } else if (existing) {
    writeFile = await query(
      `${chalk.bold(filename)} already exists`,
      'Overwrite',
      false,
      options
    );
  }

  if (writeFile) {
    options.logger.log(`Writing ${filename}...`);
    if (!options.dryRun) {
      await write(filename, contents);
    }
    options.logger.log(contents);
  }
}

async function generateESLintConfig(options: Options): Promise<void> {
  return generateConfigFile(
    options,
    './.eslintrc.json',
    formatJson(ESLINT_CONFIG)
  );
}

async function generateESLintIgnore(options: Options): Promise<void> {
  return generateConfigFile(options, './.eslintignore', ESLINT_IGNORE);
}

async function generateTsConfig(options: Options): Promise<void> {
  const config = formatJson({
    extends: './node_modules/mwts/tsconfig-midway.json',
    compilerOptions: { rootDir: '.', outDir: 'dist' },
    include: ['src/**/*.ts', 'test/**/*.ts'],
  });
  return generateConfigFile(options, './tsconfig.json', config);
}

async function generatePrettierConfig(options: Options): Promise<void> {
  const style = `module.exports = {
  ...require('mwts/.prettierrc.json')
}
`;
  return generateConfigFile(options, './.prettierrc.js', style);
}

export async function installDefaultTemplate(
  options: Options
): Promise<boolean> {
  const cwd = process.cwd();
  const sourceDirName = path.join(__dirname, '../template');
  const targetDirName = path.join(cwd, 'src');

  try {
    fs.mkdirSync(targetDirName);
  } catch (exc) {
    const err = safeError(exc);
    if (err.code !== 'EEXIST') {
      throw err;
    }
    // Else, continue and populate files into the existing directory.
  }

  // Only install the template if no ts files exist in target directory.
  const files = fs.readdirSync(targetDirName);
  const tsFiles = files.filter(file => file.toLowerCase().endsWith('.ts'));
  if (tsFiles.length !== 0) {
    options.logger.log(
      'Target src directory already has ts files. ' +
        'Template files not installed.'
    );
    return false;
  }
  await ncpp(sourceDirName, targetDirName);
  options.logger.log('Default template installed.');
  return true;
}

export async function init(options: Options): Promise<boolean> {
  let generatedPackageJson = false;
  let packageJson;
  try {
    packageJson = (await readJson('./package.json')) as PackageJson;
  } catch (exc) {
    const err = safeError(exc);
    if (err.code !== 'ENOENT') {
      throw new Error(`Unable to open package.json file: ${err.message}`);
    }
    const generate = await query(
      `${chalk.bold('package.json')} does not exist.`,
      'Generate',
      true,
      options
    );

    if (!generate) {
      options.logger.log('Please run from a directory with your package.json.');
      return false;
    }

    packageJson = DEFAULT_PACKAGE_JSON;
    generatedPackageJson = true;
  }

  const addedDeps = await addDependencies(packageJson, options);
  const addedScripts = await addScripts(packageJson, options);
  if (generatedPackageJson || addedDeps || addedScripts) {
    await writePackageJson(packageJson, options);
  } else {
    options.logger.log('No edits needed in package.json.');
  }
  await generateTsConfig(options);
  await generateESLintConfig(options);
  await generateESLintIgnore(options);
  await generatePrettierConfig(options);
  await installDefaultTemplate(options);

  // Run `npm install` after initial setup so `npm run lint` works right away.
  if (!options.dryRun) {
    // --ignore-scripts so that compilation doesn't happen because there's no
    // source files yet.

    cp.spawnSync(
      getPkgManagerCommand(options.yarn),
      ['install', '--ignore-scripts'],
      { stdio: 'inherit' }
    );
  }

  return true;
}
