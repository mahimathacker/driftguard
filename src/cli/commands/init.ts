import { access, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export type InitResult = {
  path: string;
  created: boolean;
  detected: { contracts: boolean; docs: boolean };
};

export async function runInit(cwd: string, force: boolean): Promise<InitResult> {
  const detected = await detectLayers(cwd);
  const content = buildStarter(detected);
  const path = resolve(cwd, 'driftguard.config.ts');
  const flag = force ? 'w' : 'wx';

  try {
    await writeFile(path, content, { encoding: 'utf8', flag });
    return { path, created: true, detected };
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'EEXIST') {
      return { path, created: false, detected };
    }
    throw err;
  }
}

async function detectLayers(cwd: string): Promise<{ contracts: boolean; docs: boolean }> {
  const exists = async (p: string) => {
    try { await access(resolve(cwd, p)); return true; } catch { return false; }
  };
  const contracts =
    (await exists('foundry.toml')) ||
    (await exists('hardhat.config.ts')) ||
    (await exists('hardhat.config.js')) ||
    (await exists('hardhat.config.cjs')) ||
    (await exists('hardhat.config.mjs')) ||
    (await exists('contracts'));
  const docs = (await exists('docs')) || (await exists('README.md'));
  return { contracts, docs };
}

function buildStarter(detected: { contracts: boolean; docs: boolean }): string {
  const blocks: string[] = [SDK_BLOCK];
  blocks.push(detected.contracts ? CONTRACTS_BLOCK : CONTRACTS_BLOCK_COMMENTED);
  blocks.push(detected.docs ? DOCS_BLOCK : DOCS_BLOCK_COMMENTED);
  blocks.push(SEVERITY_BLOCK);
  return `${HEADER}\n${blocks.join('\n\n')}\n${FOOTER}`;
}

const HEADER = `import { defineConfig } from '@driftguardjs/cli';

export default defineConfig({`;

const SDK_BLOCK = `  sdk: {
    entry: 'src/index.ts',                // your SDK's main TypeScript file
    // For monorepos: entry: 'packages/sdk/package.json'
    publicApi: 'package-exports',
    tsconfig: 'tsconfig.json',            // optional, improves type resolution
  },`;

const CONTRACTS_BLOCK = `  contracts: {
    paths: ['src/**/*.sol', 'contracts/**/*.sol'],
    toolchain: 'auto',                    // 'foundry' | 'hardhat' | 'auto'
    ignore: ['Test*', 'Mock*'],
  },`;

const CONTRACTS_BLOCK_COMMENTED = `  // Uncomment when you add Solidity contracts:
  // contracts: { paths: ['contracts/**/*.sol'], toolchain: 'auto' },`;

const DOCS_BLOCK = `  docs: {
    paths: ['docs/**/*.{md,mdx}', 'README.md'],
    snippetLanguages: ['ts', 'tsx', 'solidity'],
  },`;

const DOCS_BLOCK_COMMENTED = `  // Uncomment to validate code snippets in your docs:
  // docs: { paths: ['docs/**/*.md', 'README.md'], snippetLanguages: ['ts'] },`;

const SEVERITY_BLOCK = `  severity: {
    sdkAdded: 'off',                      // new exports usually aren't breaking
  },`;

const FOOTER = `});\n`;
