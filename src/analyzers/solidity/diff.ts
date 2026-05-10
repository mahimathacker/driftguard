import type { AbiFragment, AbiParameter, ContractSnapshot } from '../../snapshot/schema.js';
import { fragmentKey } from './canonical-sig.js';

type Mutability = NonNullable<AbiFragment['stateMutability']>;

export type FragmentChange =
  | { kind: 'fragment-added'; key: string; fragment: AbiFragment }
  | { kind: 'fragment-removed'; key: string; fragment: AbiFragment }
  | { kind: 'mutability-tightened'; key: string; before: Mutability; after: Mutability }
  | { kind: 'mutability-relaxed'; key: string; before: Mutability; after: Mutability }
  | { kind: 'outputs-changed'; key: string; before: AbiParameter[]; after: AbiParameter[] };

export type ContractChange =
  | { kind: 'contract-added'; name: string; contract: ContractSnapshot }
  | { kind: 'contract-removed'; name: string; contract: ContractSnapshot }
  | { kind: 'contract-modified'; name: string; fragments: FragmentChange[] };

export function diffContracts(
  baseline: Record<string, ContractSnapshot>,
  head: Record<string, ContractSnapshot>,
  options?: { strict? : boolean},
): ContractChange[] {
  const changes: ContractChange[] = [];

  for (const [name, contract] of Object.entries(baseline)) {
    if (!(name in head)) {
      changes.push({ kind: 'contract-removed', name, contract });
    }
  }

  for (const [name, contract] of Object.entries(head)) {
    const before = baseline[name];
    if (!before) {
      changes.push({ kind: 'contract-added', name, contract });
      continue;
    }
    const fragments = diffFragments(before.abi, contract.abi);
    if (fragments.length > 0) {
      changes.push({ kind: 'contract-modified', name, fragments });
    }
  }

  return changes;
}

function diffFragments(before: AbiFragment[], after: AbiFragment[]): FragmentChange[] {
  const beforeMap = new Map(before.map((f) => [fragmentKey(f), f]));
  const afterMap = new Map(after.map((f) => [fragmentKey(f), f]));
  const changes: FragmentChange[] = [];

  for (const [key, fragment] of beforeMap) {
    if (!afterMap.has(key)) {
      changes.push({ kind: 'fragment-removed', key, fragment });
    }
  }

  for (const [key, after] of afterMap) {
    const beforeFragment = beforeMap.get(key);
    if (!beforeFragment) {
      changes.push({ kind: 'fragment-added', key, fragment: after });
      continue;
    }

    const mutChange = classifyMutability(key, beforeFragment.stateMutability, after.stateMutability);
    if (mutChange) changes.push(mutChange);

    if (outputsDiffer(beforeFragment.outputs, after.outputs)) {
      changes.push({
        kind: 'outputs-changed',
        key,
        before: beforeFragment.outputs ?? [],
        after: after.outputs ?? [],
      });
    }
  }

  return changes;
}

function classifyMutability(
  key: string,
  before: Mutability | undefined,
  after: Mutability | undefined,
): FragmentChange | null {
  if (!before || !after || before === after) return null;

  // Tightened: existing callers can now fail at runtime
  const tightened =
    (before === 'payable' && after !== 'payable') ||
    (before === 'view' && (after === 'nonpayable' || after === 'payable')) ||
    (before === 'pure' && (after === 'nonpayable' || after === 'payable'));

  return tightened
    ? { kind: 'mutability-tightened', key, before, after }
    : { kind: 'mutability-relaxed', key, before, after };
}

function outputsDiffer(before: AbiParameter[] | undefined, after: AbiParameter[] | undefined): boolean {
  const a = before ?? [];
  const b = after ?? [];
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (paramShape(a[i]!) !== paramShape(b[i]!)) return true;
  }
  return false;
}

function paramShape(p: AbiParameter): string {
  if (!p.components) return p.type;
  return `(${p.components.map(paramShape).join(',')})${p.type.endsWith('[]') ? '[]' : ''}`;
}
