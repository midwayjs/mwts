import chalk = require('chalk');
import * as cp from 'child_process';
import * as fs from 'fs-extra';
import * as tmp from 'tmp';
import * as assert from 'assert';
import * as path from 'path';
import { describe, it, before, after } from 'mocha';

import spawn = require('cross-spawn');
import execa = require('execa');
const pkg = require('../../package.json');
const keep = !!process.env.mwts_KEEP_TEMPDIRS;
const stagingDir = tmp.dirSync({ keep, unsafeCleanup: true });
const stagingPath = stagingDir.name;
const execOpts: Pick<
  cp.SpawnSyncOptionsWithStringEncoding,
  'cwd' | 'encoding'
> = {
  cwd: `${stagingPath}${path.sep}kitchen`,
  encoding: 'utf8',
};
describe('🚰 kitchen sink', () => {
  const fixturesPath = path.join('test', 'fixtures');
  const kitchenPath = path.join(stagingPath, 'kitchen');
  const mwtsTarball = path.resolve(stagingPath, 'mwts.tgz');
  const runMwts = (args: string[], options = execOpts) =>
    spawn.sync('npx', ['-p', mwtsTarball, 'mwts', ...args], {
      ...options,
      encoding: 'utf8',
    });
  const toString = (value: unknown) => (value ? String(value) : '');

  // Create a staging directory with temp fixtures used to test on a fresh application.
  before(() => {
    console.log(`${chalk.blue(`${__filename} staging area: ${stagingPath}`)}`);
    cp.execSync('npm pack');
    const tarball = `${pkg.name}-${pkg.version}.tgz`;
    fs.renameSync(tarball, 'mwts.tgz');
    const targetPath = path.resolve(stagingPath, 'mwts.tgz');
    console.log('moving packed tar to ', targetPath);
    fs.moveSync('mwts.tgz', targetPath);
    fs.copySync(fixturesPath, path.join(stagingPath, path.sep));
    // Ensure kitchen has local mwts installed from ../mwts.tgz for config resolution.
    cp.execSync('npm install --ignore-scripts', execOpts);
    fs.accessSync(
      path.join(kitchenPath, 'node_modules', 'mwts', 'package.json')
    );
  });
  // CLEAN UP - remove the staging directory when done.
  after('cleanup staging', () => {
    if (!keep) {
      stagingDir.removeCallback();
    }
  });

  it('it should run init', () => {
    const args = [
      '-p',
      path.resolve(stagingPath, 'mwts.tgz'),
      'mwts',
      'init',
      // It's important to use `-n` here because we don't want to overwrite
      // the version of mwts installed, as it will trigger the npm install.
      '-n',
    ];

    const res = spawn.sync('npx', args, execOpts);
    console.log('out: ', res.stdout + '');
    console.log('error: ', res.stderr + '');

    // Ensure config files got generated.
    fs.accessSync(path.join(kitchenPath, 'tsconfig.json'));
    fs.accessSync(path.join(kitchenPath, 'eslint.config.js'));
    fs.accessSync(path.join(kitchenPath, '.prettierrc.js'));

    // Compilation shouldn't have happened. Hence no `dist` directory.
    const dirContents = fs.readdirSync(kitchenPath);
    assert.strictEqual(dirContents.indexOf('dist'), -1);
  });

  it('should lint file without requiring init-generated config', () => {
    const tmpDir = tmp.dirSync({ keep, unsafeCleanup: true });
    const opts = {
      cwd: path.join(tmpDir.name, 'kitchen'),
      encoding: 'utf8',
    } as Pick<cp.SpawnSyncOptionsWithStringEncoding, 'cwd' | 'encoding'>;
    fs.copySync(fixturesPath, tmpDir.name);
    fs.copySync(
      path.join(stagingPath, 'mwts.tgz'),
      path.join(tmpDir.name, 'mwts.tgz')
    );

    const checkRes = spawn.sync(
      'npx',
      [
        '-p',
        path.resolve(tmpDir.name, 'mwts.tgz'),
        'mwts',
        'check',
        'src/server.ts',
      ],
      opts
    );
    assert.notStrictEqual(checkRes.status, 0);
    assert.ok(!toString(checkRes.stderr).includes('eslint.config'));

    if (!keep) {
      tmpDir.removeCallback();
    }
  });

  it('should resolve eslint config from parent directory', () => {
    const tmpDir = tmp.dirSync({ keep, unsafeCleanup: true });
    const workspacePath = path.join(tmpDir.name, 'workspace');
    const pkgPath = path.join(workspacePath, 'packages', 'demo');
    fs.ensureDirSync(path.join(pkgPath, 'src'));
    fs.copySync(
      path.join(stagingPath, 'mwts.tgz'),
      path.join(workspacePath, 'mwts.tgz')
    );
    fs.writeFileSync(
      path.join(workspacePath, 'eslint.config.js'),
      "module.exports = [{ rules: { 'no-console': 'error' } }];\n",
      'utf8'
    );
    fs.writeFileSync(path.join(pkgPath, 'src', 'demo.js'), 'console.log(1);\n');

    const res = spawn.sync(
      'npx',
      [
        '-p',
        path.resolve(workspacePath, 'mwts.tgz'),
        'mwts',
        'lint',
        'src/demo.js',
      ],
      {
        cwd: pkgPath,
        encoding: 'utf8',
      }
    );

    assert.notStrictEqual(res.status, 0);
    const output = `${toString(res.stdout)}${toString(res.stderr)}`;
    assert.ok(output.includes('no-console'));
    assert.ok(!output.includes('parserOptions.project'));

    if (!keep) {
      tmpDir.removeCallback();
    }
  });

  it('should use as a non-locally installed module', () => {
    // Use from a directory different from where we have locally installed. This
    // simulates use as a globally installed module.
    const tmpDir = tmp.dirSync({ keep, unsafeCleanup: true });
    const opts = { cwd: path.join(tmpDir.name, 'kitchen') };

    // Copy test files.
    fs.copySync(fixturesPath, tmpDir.name);
    // Test package.json expects a mwts tarball from ../mwts.tgz.
    fs.copySync(
      path.join(stagingPath, 'mwts.tgz'),
      path.join(tmpDir.name, 'mwts.tgz')
    );
    // It's important to use `-n` here because we don't want to overwrite
    // the version of mwts installed, as it will trigger the npm install.
    const initRes = spawn.sync(
      'npx',
      ['-p', path.resolve(stagingPath, 'mwts.tgz'), 'mwts', 'init', '-n'],
      {
        ...opts,
        encoding: 'utf8',
      }
    );
    assert.strictEqual(initRes.status, 0, toString(initRes.stderr));

    const checkRes = spawn.sync(
      'npx',
      [
        '-p',
        path.resolve(stagingPath, 'mwts.tgz'),
        'mwts',
        'check',
        'src/server.ts',
      ],
      {
        ...opts,
        encoding: 'utf8',
      }
    );
    assert.notStrictEqual(checkRes.status, 0);

    // The `extends` field must use the local mwts path.
    const tsconfigJson = fs.readFileSync(
      path.join(tmpDir.name, 'kitchen', 'tsconfig.json'),
      'utf8'
    );
    const tsconfig = JSON.parse(tsconfigJson);
    assert.deepStrictEqual(
      tsconfig.extends,
      './node_modules/mwts/tsconfig-midway.json'
    );

    if (!keep) {
      tmpDir.removeCallback();
    }
  });

  it('should terminate generated json files with newline', () => {
    const res = runMwts(['init', '-y']);
    assert.strictEqual(res.status, 0, toString(res.stderr));
    assert.ok(
      fs
        .readFileSync(path.join(kitchenPath, 'package.json'), 'utf8')
        .endsWith('\n')
    );
    assert.ok(
      fs
        .readFileSync(path.join(kitchenPath, 'tsconfig.json'), 'utf8')
        .endsWith('\n')
    );
    assert.ok(
      fs
        .readFileSync(path.join(kitchenPath, 'eslint.config.js'), 'utf8')
        .endsWith('\n')
    );
    assert.ok(
      fs
        .readFileSync(path.join(kitchenPath, '.prettierrc.js'), 'utf8')
        .endsWith('\n')
    );
  });

  it('should initialize with stylistic mode', () => {
    const tmpDir = tmp.dirSync({ keep, unsafeCleanup: true });
    const opts = {
      cwd: path.join(tmpDir.name, 'kitchen'),
      encoding: 'utf8',
    } as Pick<cp.SpawnSyncOptionsWithStringEncoding, 'cwd' | 'encoding'>;

    fs.copySync(fixturesPath, tmpDir.name);
    fs.copySync(
      path.join(stagingPath, 'mwts.tgz'),
      path.join(tmpDir.name, 'mwts.tgz')
    );

    const res = spawn.sync(
      'npx',
      [
        '-p',
        path.resolve(tmpDir.name, 'mwts.tgz'),
        'mwts',
        'init',
        '-y',
        '--formatter=stylistic',
      ],
      opts
    );
    assert.strictEqual(res.status, 0, toString(res.stderr));

    const content = fs.readFileSync(
      path.join(tmpDir.name, 'kitchen', 'eslint.config.js'),
      'utf8'
    );
    assert.ok(content.includes('@stylistic/eslint-plugin'));

    if (!keep) {
      tmpDir.removeCallback();
    }
  });

  it('should initialize with biome mode', () => {
    const tmpDir = tmp.dirSync({ keep, unsafeCleanup: true });
    const opts = {
      cwd: path.join(tmpDir.name, 'kitchen'),
      encoding: 'utf8',
    } as Pick<cp.SpawnSyncOptionsWithStringEncoding, 'cwd' | 'encoding'>;

    fs.copySync(fixturesPath, tmpDir.name);
    fs.copySync(
      path.join(stagingPath, 'mwts.tgz'),
      path.join(tmpDir.name, 'mwts.tgz')
    );

    const res = spawn.sync(
      'npx',
      [
        '-p',
        path.resolve(tmpDir.name, 'mwts.tgz'),
        'mwts',
        'init',
        '-y',
        '--formatter=biome',
      ],
      opts
    );
    assert.strictEqual(res.status, 0, toString(res.stderr));
    fs.accessSync(path.join(tmpDir.name, 'kitchen', 'biome.json'));
    assert.throws(() =>
      fs.accessSync(path.join(tmpDir.name, 'kitchen', '.prettierrc.js'))
    );

    if (!keep) {
      tmpDir.removeCallback();
    }
  });

  it('should lint before fix', async () => {
    const res = await execa('npx', ['-p', mwtsTarball, 'mwts', 'lint'], {
      reject: false,
      cwd: execOpts.cwd as string,
      encoding: 'utf8',
    });
    assert.strictEqual(res.exitCode, 1);
  });

  it('should fix', () => {
    const preFix = fs
      .readFileSync(path.join(kitchenPath, 'src', 'server.ts'), 'utf8')
      .split(/[\n\r]+/);

    const fixRes = runMwts(['fix']);
    assert.strictEqual(fixRes.status, 0, toString(fixRes.stderr));
    const postFix = fs
      .readFileSync(path.join(kitchenPath, 'src', 'server.ts'), 'utf8')
      .split(/[\n\r]+/);
    assert.strictEqual(preFix[0].trim() + ';', postFix[0]); // fix should have added a semi-colon
  });

  it('should lint after fix', () => {
    const lintRes = runMwts(['lint']);
    assert.strictEqual(lintRes.status, 0, toString(lintRes.stderr));
  });

  it('should build', () => {
    cp.execSync('npm run build', execOpts);
    fs.accessSync(path.join(kitchenPath, 'dist', 'src', 'server.js'));
    fs.accessSync(path.join(kitchenPath, 'dist', 'src', 'server.js.map'));
    fs.accessSync(path.join(kitchenPath, 'dist', 'src', 'server.d.ts'));
  });

  // Verify the `mwts clean` command actually removes the output dir
  it('should clean', () => {
    const cleanRes = runMwts(['clean']);
    assert.strictEqual(cleanRes.status, 0, toString(cleanRes.stderr));
    assert.throws(() => fs.accessSync(path.join(kitchenPath, 'dist')));
  });
});
