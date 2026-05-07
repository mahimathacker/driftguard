import { describe, expect, it } from 'vitest';
import { DriftGuardConfigSchema } from '../config/schema.js';
import {
  createEmptySnapshot,
  type ContractSnapshot,
  type SdkSnapshot,
  type Snapshot,
} from '../snapshot/schema.js';
import { buildReport } from './report.js';

const config = DriftGuardConfigSchema.parse({
  contracts: { paths: ['x'] },
  sdk: { entry: 'x' },
  docs: { paths: ['x'] },
});

function snap(over: Partial<Snapshot>): Snapshot {
  return { ...createEmptySnapshot('0.1.0'), ...over };
}

const transferAbi: ContractSnapshot['abi'] = [
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
];

describe('buildReport', () => {
  it('returns clean report when nothing changed', () => {
    const baseline = snap({});
    const head = snap({});
    const r = buildReport(baseline, head, config);
    expect(r.findings).toEqual([]);
    expect(r.exitCode).toBe(0);
  });

  it('flags removed contract function as abi-breaking error', () => {
    const baseline = snap({
      contracts: { Token: { name: 'Token', sourcePath: 'src/Token.sol', abi: transferAbi } },
    });
    const head = snap({
      contracts: { Token: { name: 'Token', sourcePath: 'src/Token.sol', abi: [] } },
    });
    const r = buildReport(baseline, head, config);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0]?.ruleId).toBe('abi-breaking');
    expect(r.findings[0]?.severity).toBe('error');
    expect(r.findings[0]?.file).toBe('src/Token.sol');
    expect(r.exitCode).toBe(1);
  });

  it('respects severity overrides (downgrade abi-breaking to warning)', () => {
    const customConfig = DriftGuardConfigSchema.parse({
      contracts: { paths: ['x'] },
      severity: { abiBreaking: 'warning' },
    });
    const baseline = snap({
      contracts: { Token: { name: 'Token', sourcePath: 'src/Token.sol', abi: transferAbi } },
    });
    const head = snap({
      contracts: { Token: { name: 'Token', sourcePath: 'src/Token.sol', abi: [] } },
    });
    const r = buildReport(baseline, head, customConfig);
    expect(r.findings[0]?.severity).toBe('warning');
    expect(r.exitCode).toBe(0);
  });

  it('drops findings whose severity is "off"', () => {
    const customConfig = DriftGuardConfigSchema.parse({
      contracts: { paths: ['x'] },
      severity: { abiAdded: 'off' },
    });
    const baseline = snap({});
    const head = snap({
      contracts: { New: { name: 'New', sourcePath: 'src/New.sol', abi: transferAbi } },
    });
    const r = buildReport(baseline, head, customConfig);
    expect(r.findings).toEqual([]);
  });

  it('flags SDK signature change with before/after captured', () => {
    const sdkBaseline: SdkSnapshot = {
      packageName: 'test',
      entryPath: 'index.ts',
      exports: { transfer: { kind: 'function', signature: '(x: number) => void' } },
    };
    const sdkHead: SdkSnapshot = {
      ...sdkBaseline,
      exports: { transfer: { kind: 'function', signature: '(x: bigint) => void' } },
    };
    const baseline = snap({ sdk: sdkBaseline });
    const head = snap({ sdk: sdkHead });
    const r = buildReport(baseline, head, config);
    expect(r.findings[0]?.ruleId).toBe('sdk-signature-changed');
    expect(r.findings[0]?.before).toBe('(x: number) => void');
    expect(r.findings[0]?.after).toBe('(x: bigint) => void');
  });

  it('flags newly broken doc snippet with file + line', () => {
    const baseline = snap({
      docs: [
        {
          path: 'docs/x.md',
          contentHash: 'h',
          snippets: [
            { id: 'docs/x.md#abc', line: 10, language: 'ts', source: 'x', compiles: true },
          ],
        },
      ],
    });
    const head = snap({
      docs: [
        {
          path: 'docs/x.md',
          contentHash: 'h',
          snippets: [
            {
              id: 'docs/x.md#abc',
              line: 10,
              language: 'ts',
              source: 'x',
              compiles: false,
              error: 'TS2322 something',
            },
          ],
        },
      ],
    });
    const r = buildReport(baseline, head, config);
    expect(r.findings[0]?.ruleId).toBe('doc-snippet-fails');
    expect(r.findings[0]?.file).toBe('docs/x.md');
    expect(r.findings[0]?.line).toBe(10);
  });
});
