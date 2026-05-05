export function stableStringify(value: unknown, indent = 2): string {
  return JSON.stringify(value, sortKeysReplacer, indent) + '\n';
}

function sortKeysReplacer(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return Object.fromEntries(entries);
}
