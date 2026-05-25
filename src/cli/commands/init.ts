import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const STARTER = `import { defineConfig } from '@driftguardjs/cli';

export default defineConfig({
  contracts: {
    paths: ['src/**/*.sol', 'contracts/**/*.sol'],
    toolchain: 'auto',
    ignore: ['Test*', 'Mock*'],
  },

  sdk: {
    entry: 'package.json',
    publicApi: 'package-exports',
  },

  docs: {
    paths: ['docs/**/*.{md,mdx}', 'README.md'],
    snippetLanguages: ['ts', 'tsx', 'solidity'],
  },

  severity: {
    abiBreaking: 'error',
    sdkBreaking: 'error',
    docSnippetFails: 'error',
    sdkAdded: 'off',
  },
});
`;

export async function runInit(cwd: string, force: boolean): Promise<{ path: string; created: boolean }> {
  const path = resolve(cwd, 'driftguard.config.ts');
  const flag = force ? 'w' : 'wx';
  try {
    await writeFile(path, STARTER, { encoding: 'utf8', flag });
    return { path, created: true };
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'EEXIST') {
      return { path, created: false };
    }
    throw err;
  }
}
