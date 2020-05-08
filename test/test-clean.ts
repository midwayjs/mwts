import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import { clean } from '../src/clean';
import { nop } from '../src/util';

import { withFixtures } from 'inline-fixtures';
import { describe, it } from 'mocha';

describe('clean', () => {
  const OPTIONS = {
    mwtsRootDir: path.resolve(__dirname, '../..'),
    targetRootDir: './',
    dryRun: false,
    yes: false,
    no: false,
    logger: { log: nop, error: nop, dir: nop },
  };

  it('should gracefully error if tsconfig is missing', () => {
    return assert.rejects(() =>
      withFixtures({}, async () => {
        await clean(OPTIONS);
      })
    );
  });

  it('should gracefully error if tsconfig does not have valid outDir', () => {
    return withFixtures({ 'tsconfig.json': JSON.stringify({}) }, async () => {
      const deleted = await clean(OPTIONS);
      assert.strictEqual(deleted, false);
    });
  });

  it('should avoid deleting .', () => {
    return withFixtures(
      { 'tsconfig.json': JSON.stringify({ compilerOptions: { outDir: '.' } }) },
      async () => {
        const deleted = await clean(OPTIONS);
        assert.strictEqual(deleted, false);
      }
    );
  });

  it('should ensure that outDir is local to targetRoot', () => {
    return assert.rejects(() =>
      withFixtures(
        {
          'tsconfig.json': JSON.stringify({
            compilerOptions: { outDir: '../out' },
          }),
        },
        async () => {
          const deleted = await clean(OPTIONS);
          assert.strictEqual(deleted, false);
        }
      )
    );
  });

  it('should remove outDir', () => {
    const OUT = 'outputDirectory';
    return withFixtures(
      {
        'tsconfig.json': JSON.stringify({ compilerOptions: { outDir: OUT } }),
        [OUT]: {},
      },
      async dir => {
        const outputPath = path.join(dir, OUT);
        // make sure the output directory exists.
        fs.accessSync(outputPath);
        const deleted = await clean(OPTIONS);
        assert.strictEqual(deleted, true);
        // make sure the directory has been deleted.
        assert.throws(() => {
          fs.accessSync(outputPath);
        });
      }
    );
  });
});
