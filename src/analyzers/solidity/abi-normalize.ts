import type { AbiFragment, AbiParameter } from '../../snapshot/schema.js';

type RawAbiParameter = {
  name?: string;
  type?: string;
  internalType?: string;
  indexed?: boolean;
  components?: RawAbiParameter[];
};

type RawAbiFragment = {
  type?: string;
  name?: string;
  inputs?: RawAbiParameter[];
  outputs?: RawAbiParameter[];
  stateMutability?: string;
  anonymous?: boolean;
};

const FRAGMENT_ORDER = {
  constructor: 0,
  fallback: 1,
  receive: 2,
  function: 3,
  event: 4,
  error: 5,
} as const satisfies Record<AbiFragment['type'], number>;

const MUTABILITIES = ['pure', 'view', 'nonpayable', 'payable'] as const;
type Mutability = (typeof MUTABILITIES)[number];

export function normalizeAbi(raw: unknown): AbiFragment[] {
  if (!Array.isArray(raw)) return [];

  const fragments: AbiFragment[] = [];
  for (const entry of raw as RawAbiFragment[]) {
    const type = entry.type;
    if (!type || !(type in FRAGMENT_ORDER)) continue;

    const fragment: AbiFragment = {
      type: type as AbiFragment['type'],
      inputs: normalizeParams(entry.inputs),
    };
    if (entry.name) fragment.name = entry.name;
    if (entry.outputs) fragment.outputs = normalizeParams(entry.outputs);
    if (entry.stateMutability && MUTABILITIES.includes(entry.stateMutability as Mutability)) {
      fragment.stateMutability = entry.stateMutability as Mutability;
    }
    if (entry.anonymous) fragment.anonymous = true;
    fragments.push(fragment);
  }

  return fragments.sort(compareFragments);
}

function normalizeParams(raw: RawAbiParameter[] | undefined): AbiParameter[] {
  return raw ? raw.map(normalizeParam) : [];
}

function normalizeParam(raw: RawAbiParameter): AbiParameter {
  const type = raw.type ?? 'unknown';
  const param: AbiParameter = { name: raw.name ?? '', type };
  if (raw.internalType && raw.internalType !== type) param.internalType = raw.internalType;
  if (typeof raw.indexed === 'boolean') param.indexed = raw.indexed;
  if (raw.components) param.components = raw.components.map(normalizeParam);
  return param;
}

function compareFragments(a: AbiFragment, b: AbiFragment): number {
  return (
    FRAGMENT_ORDER[a.type] - FRAGMENT_ORDER[b.type] ||
    (a.name ?? '').localeCompare(b.name ?? '') ||
    paramSig(a.inputs).localeCompare(paramSig(b.inputs))
  );
}

function paramSig(params: AbiParameter[]): string {
  return params.map((p) => p.type).join(',');
}
