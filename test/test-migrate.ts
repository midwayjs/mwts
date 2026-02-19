import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import { withFixtures } from 'inline-fixtures';
import { describe, it } from 'mocha';

import { migrate } from '../src/migrate';
import { nop } from '../src/util';
import { Options } from '../src/cli';

const OPTIONS: Options = {
  mwtsRootDir: path.resolve(__dirname, '../..'),
  targetRootDir: './',
  dryRun: false,
  yes: false,
  no: false,
  logger: { log: nop, error: nop, dir: nop },
};

describe('migrate', () => {
  it('should migrate legacy eslint files to flat config', () => {
    return withFixtures(
      {
        '.eslintrc.json': JSON.stringify({
          extends: ['mwts'],
          ignorePatterns: ['packages/version', 'site'],
          rules: { 'no-control-regex': 'off' },
          env: { jest: true },
        }),
        '.eslintignore': 'dist\nnode_modules\n# comment\n',
      },
      async dir => {
        const migrated = await migrate(OPTIONS);
        assert.strictEqual(migrated, true);

        const eslintConfig = fs.readFileSync(
          path.join(dir, 'eslint.config.js'),
          'utf8'
        );
        assert.ok(eslintConfig.includes("require('mwts/eslint.config.js')"));
        assert.ok(
          eslintConfig.includes("ignores: ['dist/', '**/node_modules/',")
        );
        assert.ok(eslintConfig.includes("'packages/version'"));
        assert.ok(eslintConfig.includes("'site'"));
        assert.ok(eslintConfig.includes('const normalizedMwtsConfig ='));
        assert.ok(
          eslintConfig.includes('path.resolve(__dirname, projectPath)')
        );
        assert.ok(eslintConfig.includes('tsconfigRootDir: __dirname'));
        assert.ok(eslintConfig.includes('no-control-regex'));
        assert.ok(eslintConfig.includes('const legacyEnv = {'));
        assert.ok(eslintConfig.includes('"jest": true'));
        assert.ok(eslintConfig.includes('...globals[name]'));
        assert.throws(() => {
          fs.accessSync(path.join(dir, 'eslint.ignores.js'));
        });

        assert.doesNotThrow(() => {
          fs.accessSync(path.join(dir, '.eslintrc.json.bak'));
          fs.accessSync(path.join(dir, '.eslintignore.bak'));
        });
      }
    );
  });

  it('should skip migration when flat config already exists', () => {
    return withFixtures(
      {
        '.eslintrc.json': JSON.stringify({ extends: ['mwts'] }),
        'eslint.config.js': 'module.exports = [];\n',
      },
      async dir => {
        const migrated = await migrate(OPTIONS);
        assert.strictEqual(migrated, true);
        assert.throws(() =>
          fs.accessSync(path.join(dir, '.eslintrc.json.bak'))
        );
      }
    );
  });
});
