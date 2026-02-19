import * as fs from 'fs';
import * as path from 'path';

import { Options } from './cli';
import { safeError } from './util';

const DEFAULT_ESLINT_IGNORES = ['dist/', '**/node_modules/'];

function parseIgnorePatterns(contents: string): string[] {
  return contents
    .split(/\r?\n/u)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

function formatIgnoreConfig(patterns: string[]): string {
  const escaped = patterns.map(pattern => `'${pattern.replace(/'/gu, "\\'")}'`);
  return `module.exports = [${escaped.join(', ')}]\n`;
}

function buildMigratedEslintConfig(ignorePatterns: string[]): string {
  const ignoreList = formatIgnoreConfig(ignorePatterns).replace(
    /^module\.exports = /u,
    ''
  );
  return `const mwtsConfig = require('mwts/eslint.config.js');

const compatConfig = mwtsConfig.map(config => {
  const parserOptions = config?.languageOptions?.parserOptions;
  if (!parserOptions) {
    return config;
  }
  const { project, projectService, ...nextParserOptions } = parserOptions;

  return {
    ...config,
    languageOptions: {
      ...config.languageOptions,
      parserOptions: nextParserOptions,
    },
  };
});

module.exports = [
  {
    ignores: ${ignoreList.trim()},
  },
  ...compatConfig,
  {
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
];
`;
}

export async function migrate(options: Options): Promise<boolean> {
  const root = options.targetRootDir;
  const eslintConfigCandidates = [
    'eslint.config.js',
    'eslint.config.cjs',
    'eslint.config.mjs',
  ];
  const hasFlatConfig = eslintConfigCandidates.some(candidate =>
    fs.existsSync(path.join(root, candidate))
  );

  if (hasFlatConfig) {
    options.logger.log('Detected existing eslint.config.*; skip migration.');
    return true;
  }

  const legacyEslintConfig = path.join(root, '.eslintrc.json');
  const legacyEslintIgnore = path.join(root, '.eslintignore');
  const targetEslintConfig = path.join(root, 'eslint.config.js');

  if (!fs.existsSync(legacyEslintConfig)) {
    options.logger.log(
      'No .eslintrc.json found. Nothing to migrate in current directory.'
    );
    return true;
  }

  try {
    let ignorePatterns = DEFAULT_ESLINT_IGNORES;
    if (fs.existsSync(legacyEslintIgnore)) {
      const parsedIgnorePatterns = parseIgnorePatterns(
        fs.readFileSync(legacyEslintIgnore, 'utf8')
      );
      if (parsedIgnorePatterns.length > 0) {
        ignorePatterns = parsedIgnorePatterns;
      }
    }

    options.logger.log('Writing eslint.config.js...');
    if (!options.dryRun) {
      fs.writeFileSync(
        targetEslintConfig,
        buildMigratedEslintConfig(ignorePatterns),
        'utf8'
      );
    }

    options.logger.log('Backing up legacy ESLint files...');
    if (!options.dryRun) {
      fs.renameSync(legacyEslintConfig, `${legacyEslintConfig}.bak`);
      if (fs.existsSync(legacyEslintIgnore)) {
        fs.renameSync(legacyEslintIgnore, `${legacyEslintIgnore}.bak`);
      }
    }
    return true;
  } catch (exc) {
    const err = safeError(exc);
    options.logger.error(`Migration failed: ${err.message}`);
    return false;
  }
}
