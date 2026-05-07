import { diffDocs } from '../analyzers/docs/diff.js';
import { diffContracts } from '../analyzers/solidity/diff.js';
import { diffSdk } from '../analyzers/typescript/diff.js';
import type { DriftGuardConfig } from '../config/schema.js';
import type { Snapshot } from '../snapshot/schema.js';
import {
  findingsFromContracts,
  findingsFromDocs,
  findingsFromSdk,
  type Finding,
} from './findings.js';

export type Report = {
  findings: Finding[];
  errorCount: number;
  warningCount: number;
  exitCode: 0 | 1;
};

export function buildReport(
  baseline: Snapshot,
  head: Snapshot,
  config: DriftGuardConfig,
): Report {
  const findings: Finding[] = [];

  const contractChanges = diffContracts(baseline.contracts ?? {}, head.contracts ?? {});
  findings.push(...findingsFromContracts(contractChanges, config.severity, baseline, head));

  if (baseline.sdk && head.sdk) {
    const sdkChanges = diffSdk(baseline.sdk, head.sdk);
    findings.push(...findingsFromSdk(sdkChanges, config.severity, baseline, head));
  }

  const docChanges = diffDocs(baseline.docs ?? [], head.docs ?? []);
  findings.push(...findingsFromDocs(docChanges, config.severity));

  let errorCount = 0;
  let warningCount = 0;
  for (const f of findings) {
    if (f.severity === 'error') errorCount++;
    else warningCount++;
  }

  return {
    findings,
    errorCount,
    warningCount,
    exitCode: errorCount > 0 ? 1 : 0,
  };
}
