import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createEmptySnapshot, type Snapshot } from './schema.js';
import {
  SnapshotNotFoundError,
  SnapshotParseError,
  SnapshotVersionError,
  readSnapshot,
  snapshotExists,
  writeSnapshot,
} from './io.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'driftguard-snap-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('snapshotExists', () => {
  it('returns false for missing file', async () => {
    expect(await snapshotExists(join(dir, 'missing.json'))).toBe(false);
  });

  it('returns true after writing', async () => {
    const path = join(dir, 'snap.json');
    await writeSnapshot(path, createEmptySnapshot('0.1.0'));
    expect(await snapshotExists(path)).toBe(true);
  });
});

describe('writeSnapshot + readSnapshot round-trip', () => {
  it('preserves all fields', async () => {
    const path = join(dir, 'snap.json');
    const original: Snapshot = {
      ...createEmptySnapshot('0.1.0'),
      contracts: {
        Token: {
          name: 'Token',
          sourcePath: 'contracts/Token.sol',
          compilerVersion: '0.8.27',
          abi: [
            {
              type: 'function',
              name: 'transfer',
              inputs: [
                { name: 'to', type: 'address' },
                { name: 'amount', type: 'uint256' },
              ],
              outputs: [{ name: '', type: 'bool' }],
              stateMutability: 'nonpayable',
            },
          ],
        },
      },
      sdk: {
        packageName: '@example/sdk',
        packageVersion: '1.0.0',
        entryPath: 'src/index.ts',
        exports: {
          transfer: { kind: 'function', signature: '(to: string, amount: bigint) => Promise<boolean>' },
        },
      },
      docs: [
        {
          path: 'docs/quickstart.md',
          contentHash: 'abc123',
          snippets: [
            {
              id: 'docs/quickstart.md:abc1',
              line: 42,
              language: 'ts',
              source: 'await sdk.transfer(addr, 100n);',
              compiles: true,
            },
          ],
        },
      ],
    };

    await writeSnapshot(path, original);
    const loaded = await readSnapshot(path);
    expect(loaded).toEqual(original);
  });

  it('writes keys in sorted order for git-friendly diffs', async () => {
    const path = join(dir, 'snap.json');
    await writeSnapshot(path, createEmptySnapshot('0.1.0'));
    const raw = await readFile(path, 'utf8');
    const lines = raw.split('\n').filter((l) => l.includes('":'));
    const keys = lines.map((l) => l.match(/"([^"]+)":/)?.[1]).filter(Boolean) as string[];
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
  });

  it('writes atomically (no .tmp file remains on success)', async () => {
    const path = join(dir, 'snap.json');
    await writeSnapshot(path, createEmptySnapshot('0.1.0'));
    const { readdir } = await import('node:fs/promises');
    const entries = await readdir(dir);
    expect(entries.filter((e) => e.endsWith('.tmp'))).toHaveLength(0);
  });
});

describe('readSnapshot error cases', () => {
  it('throws SnapshotNotFoundError for missing file', async () => {
    await expect(readSnapshot(join(dir, 'missing.json'))).rejects.toBeInstanceOf(
      SnapshotNotFoundError,
    );
  });

  it('throws SnapshotVersionError for wrong version', async () => {
    const path = join(dir, 'snap.json');
    await writeFile(
      path,
      JSON.stringify({ version: 999, createdAt: new Date().toISOString(), driftguardVersion: '0.1.0' }),
      'utf8',
    );
    await expect(readSnapshot(path)).rejects.toBeInstanceOf(SnapshotVersionError);
  });

  it('throws SnapshotParseError for malformed JSON', async () => {
    const path = join(dir, 'snap.json');
    await writeFile(path, '{ not valid json', 'utf8');
    await expect(readSnapshot(path)).rejects.toBeInstanceOf(SnapshotParseError);
  });

  it('throws SnapshotParseError for schema-invalid content', async () => {
    const path = join(dir, 'snap.json');
    await writeFile(
      path,
      JSON.stringify({ version: 1, createdAt: 'not-a-date', driftguardVersion: '0.1.0' }),
      'utf8',
    );
    await expect(readSnapshot(path)).rejects.toBeInstanceOf(SnapshotParseError);
  });
});
