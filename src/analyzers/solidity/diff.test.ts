import { describe, expect, it } from 'vitest';
import type { ContractSnapshot } from '../../snapshot/schema.js';
import { diffContracts } from './diff.js';

function contract(name: string, abi: ContractSnapshot['abi']): ContractSnapshot {
  return { name, sourcePath: `src/${name}.sol`, abi };
}

const transferAbi: ContractSnapshot['abi'] = [
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
];

describe('diffContracts', () => {
  it('returns empty array when nothing changed', () => {
    const baseline = { Token: contract('Token', transferAbi) };
    const head = { Token: contract('Token', transferAbi) };
    expect(diffContracts(baseline, head)).toEqual([]);
  });

  it('detects added contract', () => {
    const result = diffContracts({}, { Token: contract('Token', transferAbi) });
    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe('contract-added');
  });

  it('detects removed contract', () => {
    const result = diffContracts({ Token: contract('Token', transferAbi) }, {});
    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe('contract-removed');
  });

  it('detects fragment-removed when a function disappears', () => {
    const baseline = { Token: contract('Token', transferAbi) };
    const head = { Token: contract('Token', []) };
    const result = diffContracts(baseline, head);
    expect(result[0]?.kind).toBe('contract-modified');
    if (result[0]?.kind === 'contract-modified') {
      expect(result[0].fragments[0]?.kind).toBe('fragment-removed');
    }
  });

  it('detects fragment-added when a new overload appears', () => {
    const extended: ContractSnapshot['abi'] = [
      ...transferAbi,
      {
        type: 'function',
        name: 'transfer',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
      },
    ];
    const result = diffContracts(
      { Token: contract('Token', transferAbi) },
      { Token: contract('Token', extended) },
    );
    if (result[0]?.kind !== 'contract-modified') throw new Error('expected modified');
    expect(result[0].fragments).toHaveLength(1);
    expect(result[0].fragments[0]?.kind).toBe('fragment-added');
  });

  it('flags mutability tightening (view → nonpayable) as breaking', () => {
    const before: ContractSnapshot['abi'] = [
      { type: 'function', name: 'read', inputs: [], outputs: [], stateMutability: 'view' },
    ];
    const after: ContractSnapshot['abi'] = [
      { type: 'function', name: 'read', inputs: [], outputs: [], stateMutability: 'nonpayable' },
    ];
    const result = diffContracts(
      { C: contract('C', before) },
      { C: contract('C', after) },
    );
    if (result[0]?.kind !== 'contract-modified') throw new Error('expected modified');
    expect(result[0].fragments[0]?.kind).toBe('mutability-tightened');
  });

  it('flags mutability relaxation (nonpayable → view) as warning-level', () => {
    const before: ContractSnapshot['abi'] = [
      { type: 'function', name: 'op', inputs: [], outputs: [], stateMutability: 'nonpayable' },
    ];
    const after: ContractSnapshot['abi'] = [
      { type: 'function', name: 'op', inputs: [], outputs: [], stateMutability: 'view' },
    ];
    const result = diffContracts(
      { C: contract('C', before) },
      { C: contract('C', after) },
    );
    if (result[0]?.kind !== 'contract-modified') throw new Error('expected modified');
    expect(result[0].fragments[0]?.kind).toBe('mutability-relaxed');
  });

  it('flags payable → nonpayable as tightened (callers sending value would revert)', () => {
    const before: ContractSnapshot['abi'] = [
      { type: 'function', name: 'deposit', inputs: [], stateMutability: 'payable' },
    ];
    const after: ContractSnapshot['abi'] = [
      { type: 'function', name: 'deposit', inputs: [], stateMutability: 'nonpayable' },
    ];
    const result = diffContracts(
      { C: contract('C', before) },
      { C: contract('C', after) },
    );
    if (result[0]?.kind !== 'contract-modified') throw new Error('expected modified');
    expect(result[0].fragments[0]?.kind).toBe('mutability-tightened');
  });

  it('detects outputs change', () => {
    const before: ContractSnapshot['abi'] = [
      {
        type: 'function',
        name: 'getValue',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
      },
    ];
    const after: ContractSnapshot['abi'] = [
      {
        type: 'function',
        name: 'getValue',
        inputs: [],
        outputs: [{ name: '', type: 'uint128' }],
        stateMutability: 'view',
      },
    ];
    const result = diffContracts(
      { C: contract('C', before) },
      { C: contract('C', after) },
    );
    if (result[0]?.kind !== 'contract-modified') throw new Error('expected modified');
    expect(result[0].fragments[0]?.kind).toBe('outputs-changed');
  });

  it('treats parameter-count change as removal + addition (different overloads)', () => {
    const before: ContractSnapshot['abi'] = [
      {
        type: 'function',
        name: 'transfer',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
      },
    ];
    const after: ContractSnapshot['abi'] = [
      {
        type: 'function',
        name: 'transfer',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
      },
    ];
    const result = diffContracts(
      { Token: contract('Token', before) },
      { Token: contract('Token', after) },
    );
    if (result[0]?.kind !== 'contract-modified') throw new Error('expected modified');
    const kinds = result[0].fragments.map((f) => f.kind).sort();
    expect(kinds).toEqual(['fragment-added', 'fragment-removed']);
  });

  it('handles tuples in canonical signatures', () => {
    const abi: ContractSnapshot['abi'] = [
      {
        type: 'function',
        name: 'execute',
        inputs: [
          {
            name: 'order',
            type: 'tuple',
            components: [
              { name: 'maker', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
          },
        ],
      },
    ];
    expect(diffContracts({ C: contract('C', abi) }, { C: contract('C', abi) })).toEqual([]);
  });
});
