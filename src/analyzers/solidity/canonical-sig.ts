import type { AbiFragment, AbiParameter } from '../../snapshot/schema.js';

export function fragmentKey(fragment: AbiFragment): string {
  if (fragment.type === 'constructor' || fragment.type === 'fallback' || fragment.type === 'receive') {
    return fragment.type;
  }
  return `${fragment.type}:${fragment.name ?? ''}(${paramTypes(fragment.inputs)})`;
}

function paramTypes(params: AbiParameter[]): string {
  return params.map(canonicalType).join(',');
}

function canonicalType(param: AbiParameter): string {
  if (!param.components) return param.type;
  const inner = `(${param.components.map(canonicalType).join(',')})`;
  return param.type.endsWith('[]') ? `${inner}[]` : inner;
}
