import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { globby } from 'globby';
import type { ContractSnapshot } from '../../snapshot/schema.js';
import { normalizeAbi } from './abi-normalize.js';

type FoundryArtifact = {
  abi?: unknown;
  metadata?: {
    compiler?: { version?: string };
    sources?: Record<string, unknown>;
  };
};

export function discoverFoundryArtifacts(cwd: string): Promise<string[]> {
  return globby(['out/**/*.json', '!out/build-info/**'], { cwd, absolute: true });
}

export async function readFoundryArtifact(path: string): Promise<ContractSnapshot | null> {
  const artifact = await loadJson<FoundryArtifact>(path);
  if (!artifact?.abi) return null;

  const sourcePath = artifact.metadata?.sources
    ? Object.keys(artifact.metadata.sources)[0] ?? ''
    : '';

  const snapshot: ContractSnapshot = {
    name: basename(path, '.json'),
    sourcePath,
    abi: normalizeAbi(artifact.abi),
  };

  const compilerVersion = artifact.metadata?.compiler?.version;
  if (compilerVersion) snapshot.compilerVersion = compilerVersion;

  return snapshot;
}

async function loadJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return null;
  }
}
