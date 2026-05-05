import { describe, expect, it } from 'vitest';
import { normalizeAbi } from './abi-normalize.js';

describe('normalizeAbi', () => {
  it('returns empty array for non-array input', () => {
    expect(normalizeAbi(null)).toEqual([]);
    expect(normalizeAbi({})).toEqual([]);
    expect(normalizeAbi('abi')).toEqual([]);
  });

  it('drops fragments with unknown type', () => {
    const out = normalizeAbi([{ type: 'modifier', name: 'onlyOwner' }]);
    expect(out).toEqual([]);
  });

  it('strips internalType when redundant', () => {
    const [fragment] = normalizeAbi([
      {
        type: 'function',
        name: 'f',
        inputs: [{ name: 'x', type: 'uint256', internalType: 'uint256' }],
      },
    ]);
    expect(fragment?.inputs[0]?.internalType).toBeUndefined();
  });

  it('keeps internalType when distinct (struct/enum)', () => {
    const [fragment] = normalizeAbi([
      {
        type: 'function',
        name: 'f',
        inputs: [{ name: 'order', type: 'tuple', internalType: 'struct Order' }],
      },
    ]);
    expect(fragment?.inputs[0]?.internalType).toBe('struct Order');
  });

  it('sorts: constructor < function < event < error', () => {
    const out = normalizeAbi([
      { type: 'event', name: 'E', inputs: [] },
      { type: 'error', name: 'Err', inputs: [] },
      { type: 'function', name: 'f', inputs: [] },
      { type: 'constructor', inputs: [] },
    ]);
    expect(out.map((f) => f.type)).toEqual(['constructor', 'function', 'event', 'error']);
  });

  it('sorts overloaded functions by parameter signature', () => {
    const out = normalizeAbi([
      {
        type: 'function',
        name: 'transfer',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
      },
      {
        type: 'function',
        name: 'transfer',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
      },
    ]);
    expect(out[0]?.inputs).toHaveLength(2);
    expect(out[1]?.inputs).toHaveLength(3);
  });

  it('preserves indexed flag on event params', () => {
    const [fragment] = normalizeAbi([
      {
        type: 'event',
        name: 'Transfer',
        inputs: [{ name: 'from', type: 'address', indexed: true }],
      },
    ]);
    expect(fragment?.inputs[0]?.indexed).toBe(true);
  });

  it('drops invalid stateMutability', () => {
    const [fragment] = normalizeAbi([
      { type: 'function', name: 'f', inputs: [], stateMutability: 'magic' },
    ]);
    expect(fragment?.stateMutability).toBeUndefined();
  });
});
