import type { SdkExport, SdkSnapshot } from '../../snapshot/schema.js';

export type SdkChange =
  | { kind: 'export-added'; name: string; export: SdkExport }
  | { kind: 'export-removed'; name: string; export: SdkExport }
  | { kind: 'kind-changed'; name: string; before: SdkExport; after: SdkExport }
  | { kind: 'signature-changed'; name: string; before: SdkExport; after: SdkExport };

export function diffSdk(baseline: SdkSnapshot, head: SdkSnapshot): SdkChange[] {
  const changes: SdkChange[] = [];

  for (const [name, exp] of Object.entries(baseline.exports)) {
    if (!(name in head.exports)) {
      changes.push({ kind: 'export-removed', name, export: exp });
    }
  }

  for (const [name, after] of Object.entries(head.exports)) {
    const before = baseline.exports[name];
    if (!before) {
      changes.push({ kind: 'export-added', name, export: after });
      continue;
    }
    if (before.kind !== after.kind) {
      changes.push({ kind: 'kind-changed', name, before, after });
      continue;
    }
    if (before.signature !== after.signature) {
      changes.push({ kind: 'signature-changed', name, before, after });
    }
  }

  return changes;
}
