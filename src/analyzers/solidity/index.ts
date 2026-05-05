import { resolve } from 'node:path';
import { globby } from 'globby';
import picomatch from 'picomatch';
import type { DriftGuardConfig } from '../../config/schema.js';
import type { ContractSnapshot } from '../../snapshot/schema.js';
import { discoverFoundryArtifacts, readFoundryArtifact } from './foundry.js';
import { discoverHardhatArtifacts, readHardhatArtifact } from './hardhat.js';
import { detectToolchain, type Toolchain } from './toolchain.js';

type ContractsConfig = NonNullable<DriftGuardConfig['contracts']>;

export async function analyzeContracts(
  config: ContractsConfig,
  cwd: string = process.cwd(),
): Promise<Record<string, ContractSnapshot>> {
  const toolchain = await detectToolchain(cwd, config.toolchain);
  if (toolchain === 'unknown') return {};

  const sourceMatcher = await buildSourceMatcher(config.paths, cwd);
  const ignoreMatcher = config.ignore.length > 0 ? picomatch(config.ignore) : null;

  const artifactPaths = await discover(toolchain, cwd);
  const reader = toolchain === 'foundry' ? readFoundryArtifact : readHardhatArtifact;

  const contracts: Record<string, ContractSnapshot> = {};
  for (const artifactPath of artifactPaths) {
    const contract = await reader(artifactPath);
    if (!contract) continue;
    if (!sourceMatcher(contract.sourcePath)) continue;
    if (ignoreMatcher?.(contract.name)) continue;
    contracts[contract.name] = contract;
  }
  return contracts;
}

function discover(toolchain: Exclude<Toolchain, 'unknown'>, cwd: string): Promise<string[]> {
  return toolchain === 'foundry'
    ? discoverFoundryArtifacts(cwd)
    : discoverHardhatArtifacts(cwd);
}

async function buildSourceMatcher(
  patterns: string[],
  cwd: string,
): Promise<(sourcePath: string) => boolean> {
  const allowed = new Set(await globby(patterns, { cwd }));
  return (sourcePath) => allowed.has(sourcePath);
}
