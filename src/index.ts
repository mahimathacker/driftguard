export {
  DriftGuardConfigSchema,
  defineConfig,
} from './config/schema.js';

export type {
  DriftGuardConfig,
  DriftGuardConfigInput,
  Severity,
} from './config/schema.js';

export {
  SNAPSHOT_VERSION,
  SnapshotNotFoundError,
  SnapshotParseError,
  SnapshotSchema,
  SnapshotVersionError,
  createEmptySnapshot,
  readSnapshot,
  snapshotExists,
  writeSnapshot,
} from './snapshot/index.js';

export type {
  AbiFragment,
  AbiParameter,
  ContractSnapshot,
  DocFileSnapshot,
  DocSnippet,
  SdkExport,
  SdkSnapshot,
  Snapshot,
} from './snapshot/index.js';

export { analyzeContracts } from './analyzers/solidity/index.js';
export { diffContracts } from './analyzers/solidity/diff.js';
export type { ContractChange, FragmentChange } from './analyzers/solidity/diff.js';

export { analyzeSdk } from './analyzers/typescript/index.js';
export { diffSdk } from './analyzers/typescript/diff.js';
export type { SdkChange } from './analyzers/typescript/diff.js';
