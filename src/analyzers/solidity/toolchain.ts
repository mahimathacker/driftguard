import { access } from 'node:fs/promises';
import { join } from 'node:path';

export type Toolchain = 'foundry' | 'hardhat' | 'unknown';

const HARDHAT_CONFIGS = [
  'hardhat.config.ts',
  'hardhat.config.js',
  'hardhat.config.cjs',
  'hardhat.config.mjs',
];

export async function detectToolchain(
  cwd: string,
  hint: 'foundry' | 'hardhat' | 'solc' | 'auto',
): Promise<Toolchain> {
  if (hint === 'foundry' || hint === 'hardhat') return hint;

  const hasFoundry = await fileExists(join(cwd, 'foundry.toml'));
  if (hasFoundry) return 'foundry';

  for (const f of HARDHAT_CONFIGS) {
    if (await fileExists(join(cwd, f))) return 'hardhat';
  }

  return 'unknown';
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
