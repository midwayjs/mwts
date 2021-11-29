import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';
import { promisify } from 'util';
import * as ncp from 'ncp';
import * as writeFileAtomic from 'write-file-atomic';
import * as JSON5 from 'json5';

export const readFilep = promisify(fs.readFile) as ReadFileP;
export const rimrafp = promisify(rimraf);
export const writeFileAtomicp = promisify(writeFileAtomic);
export const ncpp = promisify(ncp.ncp);

export interface Bag<T> {
  [script: string]: T;
}

export interface DefaultPackage extends Bag<string> {
  mwts: string;
  typescript: string;
  '@types/node': string;
}

export async function readJsonp(jsonPath: string) {
  const contents = await readFilep(jsonPath, 'utf8');
  return JSON5.parse(contents);
}

export interface ReadFileP {
  (path: string, encoding: string): Promise<string>;
}

export function nop() {
  /* empty */
}

export function safeError(err: unknown): NodeJS.ErrnoException {
  if (err == null) {
    return new Error(`(${err})`);
  }
  if (err instanceof Error) {
    return err;
  }
  return new Error(`${err}`);
}

/**
 * Recursively iterate through the dependency chain until we reach the end of
 * the dependency chain or encounter a circular reference
 * @param filePath Filepath of file currently being read
 * @param customReadFilep The file reading function being used
 * @param readFiles an array of the previously read files so we can check for
 * circular references
 * returns a ConfigFile object containing the data from all the dependencies
 */
async function getBase(
  filePath: string,
  customReadFilep: ReadFileP | undefined,
  readFiles: Set<string>,
  currentDir: string
): Promise<ConfigFile> {
  customReadFilep = customReadFilep || readFilep;

  filePath = path.resolve(currentDir, filePath);

  // An error is thrown if there is a circular reference as specified by the
  // TypeScript doc
  if (readFiles.has(filePath)) {
    throw new Error(`Circular reference in ${filePath}`);
  }
  readFiles.add(filePath);
  try {
    const json = await customReadFilep(filePath, 'utf8');
    let contents: ConfigFile;
    try {
      contents = JSON5.parse(json);
    } catch (exc) {
      const err = safeError(exc);
      err.message = `Unable to parse ${filePath}!\n${err.message}`;
      throw err;
    }

    if (typeof contents.extends === 'string') {
      const nextFile = await getBase(
        contents.extends,
        customReadFilep,
        readFiles,
        path.dirname(filePath)
      );
      contents = combineTSConfig(nextFile, contents);
    } else if (Array.isArray(contents.extends)) {
      for (const extend of contents.extends) {
        const nextFile = await getBase(
          extend,
          customReadFilep,
          readFiles,
          path.dirname(filePath)
        );
        contents = combineTSConfig(nextFile, contents);
      }
    }

    return contents;
  } catch (exc) {
    const err = safeError(exc);
    err.message = `Error: ${filePath}\n${err.message}`;
    throw err;
  }
}

/**
 * Takes in 2 config files
 * @param base is loaded first
 * @param inherited is then loaded and overwrites base
 */
function combineTSConfig(base: ConfigFile, inherited: ConfigFile): ConfigFile {
  const result: ConfigFile = { compilerOptions: {} };

  Object.assign(result, base, inherited);
  Object.assign(
    result.compilerOptions,
    base.compilerOptions,
    inherited.compilerOptions
  );
  delete result.extends;
  return result;
}

/**
 * An interface containing the top level data fields present in Config Files
 */
export interface ConfigFile {
  files?: string[];
  compilerOptions?: unknown;
  include?: string[];
  exclude?: string[];
  extends?: string[] | string;
}

/**
 * Automatically defines npm or yarn is going to be used:
 * - If only yarn.lock exists, use yarn
 * - If only package-lock.json or both exist, use npm
 */
export function isYarnUsed(existsSync = fs.existsSync): boolean {
  if (existsSync('package-lock.json')) {
    return false;
  }
  return existsSync('yarn.lock');
}

export function getPkgManagerCommand(isYarnUsed?: boolean): string {
  return (
    (isYarnUsed ? 'yarn' : 'npm') + (process.platform === 'win32' ? '.cmd' : '')
  );
}

/**
 * Find the tsconfig.json, read it, and return parsed contents.
 * @param rootDir Directory where the tsconfig.json should be found.
 * If the tsconfig.json file has an "extends" field hop down the dependency tree
 * until it ends or a circular reference is found in which case an error will be
 * thrown
 */
export async function getTSConfig(
  rootDir: string,
  customReadFilep?: ReadFileP
): Promise<ConfigFile> {
  const readArr = new Set<string>();
  return getBase('tsconfig.json', customReadFilep, readArr, rootDir);
}

export function readJSON(filepath: string): unknown {
  const content = fs.readFileSync(filepath, 'utf8');
  try {
    return JSON.parse(content);
  } catch (exc) {
    const err = safeError(exc);
    throw new Error(
      `Failed to parse JSON file '${content}' for: ${err.message}`
    );
  }
}
