import { readFile } from 'node:fs/promises';
import { globby } from 'globby';
import type { ContractSnapshot } from '../../snapshot/schema.js';
import { normalizeAbi } from './abi-normalize.js';

type HardhatArtifact = {
  contractName?: string;
  sourceName?: string;
  abi?: unknown;
};

export function discoverHardhatArtifacts(cwd: string): Promise<string[]> {
  return globby(['artifacts/contracts/**/*.json', '!**/*.dbg.json'], {
    cwd,
    absolute: true,
  });
}

export async function readHardhatArtifact(path: string): Promise<ContractSnapshot | null> {
  let artifact: HardhatArtifact;
  try {
    artifact = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }

  if (!artifact.contractName || !artifact.sourceName) return null;

  return {
    name: artifact.contractName,
    sourcePath: artifact.sourceName,
    abi: normalizeAbi(artifact.abi),
  };
}
