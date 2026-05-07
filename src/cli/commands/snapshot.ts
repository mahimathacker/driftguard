import { dirname, resolve } from 'node:path';
import { analyzeDocs } from '../../analyzers/docs/index.js';
import { analyzeContracts } from '../../analyzers/solidity/index.js';
import { analyzeSdk } from '../../analyzers/typescript/index.js';
import type { DriftGuardConfig } from '../../config/schema.js';
import {
  createEmptySnapshot,
  type Snapshot,
} from '../../snapshot/schema.js';
import { writeSnapshot } from '../../snapshot/io.js';

const TOOL_VERSION = '0.1.0';

export type SnapshotResult = {
  path: string;
  contractCount: number;
  sdkExportCount: number;
  docFileCount: number;
};

export async function runSnapshot(
  cwd: string,
  config: DriftGuardConfig,
): Promise<SnapshotResult> {
  const snapshot = await analyze(cwd, config);
  const path = resolve(cwd, config.snapshot.path);
  await writeSnapshot(path, snapshot);
  return {
    path,
    contractCount: Object.keys(snapshot.contracts ?? {}).length,
    sdkExportCount: Object.keys(snapshot.sdk?.exports ?? {}).length,
    docFileCount: snapshot.docs?.length ?? 0,
  };
}

export async function analyze(
  cwd: string,
  config: DriftGuardConfig,
): Promise<Snapshot> {
  const [contracts, sdk] = await Promise.all([
    config.contracts ? analyzeContracts(config.contracts, cwd) : undefined,
    config.sdk ? analyzeSdk(config.sdk, cwd) : undefined,
  ]);

  const docs = config.docs
    ? await analyzeDocs(
        config.docs,
        sdk ? { sdk: { packageName: sdk.packageName, entryPath: sdk.entryPath } } : {},
        cwd,
      )
    : undefined;

  const snapshot: Snapshot = createEmptySnapshot(TOOL_VERSION);
  if (contracts && Object.keys(contracts).length > 0) snapshot.contracts = contracts;
  if (sdk) snapshot.sdk = sdk;
  if (docs && docs.length > 0) snapshot.docs = docs;
  return snapshot;
}
