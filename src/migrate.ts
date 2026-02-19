import * as fs from 'fs';
import * as path from 'path';
import * as JSON5 from 'json5';

import { Options } from './cli';
import { safeError } from './util';

const DEFAULT_ESLINT_IGNORES = ['dist/', '**/node_modules/'];

interface LegacyEslintrc {
  ignorePatterns?: string | string[];
  rules?: Record<string, unknown>;
  env?: Record<string, boolean>;
}

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

function normalizeIgnorePatterns(
  legacyIgnorePatterns: LegacyEslintrc['ignorePatterns'],
  eslintIgnorePatterns: string[]
): string[] {
  const combined: string[] = [...DEFAULT_ESLINT_IGNORES];
  const fromLegacyEslintrc = Array.isArray(legacyIgnorePatterns)
    ? legacyIgnorePatterns
    : legacyIgnorePatterns
      ? [legacyIgnorePatterns]
      : [];
  combined.push(...fromLegacyEslintrc, ...eslintIgnorePatterns);

  const deduped: string[] = [];
  for (const pattern of combined) {
    if (!deduped.includes(pattern)) {
      deduped.push(pattern);
    }
  }
  return deduped;
}

function buildMigratedEslintConfig(
  ignorePatterns: string[],
  legacyRules: LegacyEslintrc['rules'],
  legacyEnv: LegacyEslintrc['env']
): string {
  const ignoreList = formatIgnoreConfig(ignorePatterns).replace(
    /^module\.exports = /u,
    ''
  );
  const rulesConfig = JSON.stringify(legacyRules || {}, null, 2);
  const envConfig = JSON.stringify(legacyEnv || {}, null, 2);
  return `const mwtsConfig = require('mwts/eslint.config.js');
const globals = require('globals');

const legacyRules = ${rulesConfig};
const legacyEnv = ${envConfig};
const legacyGlobals = Object.entries(legacyEnv).reduce((acc, [name, enabled]) => {
  if (!enabled || !globals[name]) {
    return acc;
  }
  return { ...acc, ...globals[name] };
}, {});

module.exports = [
  {
    ignores: ${ignoreList.trim()},
  },
  ...mwtsConfig,
  {
    languageOptions: {
      globals: legacyGlobals,
    },
    rules: legacyRules,
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
    const legacyEslintrcRaw = fs.readFileSync(legacyEslintConfig, 'utf8');
    const legacyEslintrc = JSON5.parse(legacyEslintrcRaw) as LegacyEslintrc;

    let eslintIgnorePatterns: string[] = [];
    if (fs.existsSync(legacyEslintIgnore)) {
      eslintIgnorePatterns = parseIgnorePatterns(
        fs.readFileSync(legacyEslintIgnore, 'utf8')
      );
    }
    const ignorePatterns = normalizeIgnorePatterns(
      legacyEslintrc.ignorePatterns,
      eslintIgnorePatterns
    );

    options.logger.log('Writing eslint.config.js...');
    if (!options.dryRun) {
      fs.writeFileSync(
        targetEslintConfig,
        buildMigratedEslintConfig(
          ignorePatterns,
          legacyEslintrc.rules,
          legacyEslintrc.env
        ),
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
