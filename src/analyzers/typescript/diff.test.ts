import { describe, expect, it } from 'vitest';
import type { SdkSnapshot } from '../../snapshot/schema.js';
import { diffSdk } from './diff.js';

function snap(exports: SdkSnapshot['exports']): SdkSnapshot {
  return { packageName: 'test', entryPath: 'index.ts', exports };
}

describe('diffSdk', () => {
  it('returns no changes when snapshots are equal', () => {
    const a = snap({ foo: { kind: 'function', signature: '() => void' } });
    expect(diffSdk(a, a)).toEqual([]);
  });

  it('detects added exports', () => {
    const before = snap({});
    const after = snap({ foo: { kind: 'function', signature: '() => void' } });
    const result = diffSdk(before, after);
    expect(result).toEqual([
      { kind: 'export-added', name: 'foo', export: { kind: 'function', signature: '() => void' } },
    ]);
  });

  it('detects removed exports', () => {
    const before = snap({ foo: { kind: 'function', signature: '() => void' } });
    const after = snap({});
    const result = diffSdk(before, after);
    expect(result[0]?.kind).toBe('export-removed');
  });

  it('detects signature change when shape differs', () => {
    const before = snap({ transfer: { kind: 'function', signature: '(to: string) => void' } });
    const after = snap({ transfer: { kind: 'function', signature: '(to: string, amount: bigint) => void' } });
    const result = diffSdk(before, after);
    expect(result[0]?.kind).toBe('signature-changed');
  });

  it('detects kind change when an export was reclassified', () => {
    const before = snap({ Helper: { kind: 'function', signature: '() => void' } });
    const after = snap({ Helper: { kind: 'class', signature: 'class { ... }' } });
    const result = diffSdk(before, after);
    expect(result[0]?.kind).toBe('kind-changed');
  });

  it('emits one change per export, not chained', () => {
    const before = snap({
      a: { kind: 'function', signature: '() => void' },
      b: { kind: 'function', signature: '() => string' },
    });
    const after = snap({
      a: { kind: 'function', signature: '() => number' },
      c: { kind: 'function', signature: '() => void' },
    });
    const result = diffSdk(before, after);
    expect(result).toHaveLength(3);
    const kinds = result.map((c) => c.kind).sort();
    expect(kinds).toEqual(['export-added', 'export-removed', 'signature-changed']);
  });
});
