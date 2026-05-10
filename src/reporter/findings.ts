import type { ContractChange } from '../analyzers/solidity/diff.js';
import type { DocChange } from '../analyzers/docs/diff.js';
import type { SdkChange } from '../analyzers/typescript/diff.js';
import type { DemoResult } from '../analyzers/demos/run.js';
import type { Snapshot } from '../snapshot/schema.js';
import { type RuleId, severityFor } from './rules.js';
import type { DriftGuardConfig } from '../config/schema.js';

export type Layer = 'contracts' | 'sdk' | 'docs' | 'demos';

export type Finding = {
  ruleId: RuleId;
  severity: 'error' | 'warning';
  layer: Layer;
  message: string;
  file?: string;
  line?: number;
  before?: string;
  after?: string;
};

export function findingsFromContracts(
  changes: ContractChange[],
  config: DriftGuardConfig['severity'],
  baseline: Snapshot,
  head: Snapshot,
): Finding[] {
  const out: Finding[] = [];
  for (const change of changes) {
    if (change.kind === 'contract-added') {
      push(out, 'abi-added', 'contracts', config, {
        message: `Contract ${change.name} added`,
        file: change.contract.sourcePath,
      });
      continue;
    }
    if (change.kind === 'contract-removed') {
      push(out, 'abi-breaking', 'contracts', config, {
        message: `Contract ${change.name} removed`,
        file: change.contract.sourcePath,
      });
      continue;
    }
    const file =
      head.contracts?.[change.name]?.sourcePath ?? baseline.contracts?.[change.name]?.sourcePath;
    for (const f of change.fragments) {
      switch (f.kind) {
        case 'fragment-added':
          push(out, 'abi-added', 'contracts', config, {
            message: `${change.name}: ${f.key} added`,
            file,
          });
          break;
        case 'fragment-removed':
          push(out, 'abi-breaking', 'contracts', config, {
            message: `${change.name}: ${f.key} removed`,
            file,
          });
          break;
        case 'mutability-tightened':
          push(out, 'abi-mutability-tightened', 'contracts', config, {
            message: `${change.name}: ${f.key} mutability tightened`,
            file,
            before: f.before,
            after: f.after,
          });
          break;
        case 'mutability-relaxed':
          push(out, 'abi-mutability-relaxed', 'contracts', config, {
            message: `${change.name}: ${f.key} mutability relaxed`,
            file,
            before: f.before,
            after: f.after,
          });
          break;
        case 'outputs-changed':
          push(out, 'abi-breaking', 'contracts', config, {
            message: `${change.name}: ${f.key} outputs changed`,
            file,
          });
          break;
      }
    }
  }
  return out;
}

export function findingsFromSdk(
  changes: SdkChange[],
  config: DriftGuardConfig['severity'],
  baseline: Snapshot,
  head: Snapshot,
): Finding[] {
  const file = head.sdk?.entryPath ?? baseline.sdk?.entryPath;
  const out: Finding[] = [];
  for (const change of changes) {
    switch (change.kind) {
      case 'export-added':
        push(out, 'sdk-added', 'sdk', config, {
          message: `Export ${change.name} added (${change.export.kind})`,
          file,
        });
        break;
      case 'export-removed':
        push(out, 'sdk-breaking', 'sdk', config, {
          message: `Export ${change.name} removed`,
          file,
        });
        break;
      case 'kind-changed':
        push(out, 'sdk-breaking', 'sdk', config, {
          message: `Export ${change.name} kind changed: ${change.before.kind} → ${change.after.kind}`,
          file,
        });
        break;
      case 'signature-changed':
        push(out, 'sdk-signature-changed', 'sdk', config, {
          message: `Export ${change.name} signature changed`,
          file,
          before: change.before.signature,
          after: change.after.signature,
        });
        break;
    }
  }
  return out;
}

export function findingsFromDemos(
  results: DemoResult[],
  config: DriftGuardConfig['severity'],
): Finding[] {
  const out: Finding[] = [];
  for (const result of results) {
    if (result.passed) continue;
    push(out, 'demo-fails', 'demos', config, {
      message: `Demo "${result.name}" failed: ${result.command} (exit ${result.exitCode})`,
      after: result.output,
    });
  }
  return out;
}

export function findingsFromDocs(
  changes: DocChange[],
  config: DriftGuardConfig['severity'],
): Finding[] {
  const out: Finding[] = [];
  for (const change of changes) {
    if (change.kind === 'snippet-broken' || change.kind === 'snippet-added-broken') {
      push(out, 'doc-snippet-fails', 'docs', config, {
        message: change.snippet.error ?? 'Snippet failed to compile',
        file: change.file,
        line: change.snippet.line,
      });
    }
    // doc-added, doc-removed, snippet-fixed, snippet-removed are informational — not reported
  }
  return out;
}

function push(
  out: Finding[],
  ruleId: RuleId,
  layer: Layer,
  config: DriftGuardConfig['severity'],
  fields: Omit<Finding, 'ruleId' | 'severity' | 'layer'>,
): void {
  const severity = severityFor(ruleId, config);
  if (severity === 'off') return;
  out.push({ ruleId, severity, layer, ...fields });
}
