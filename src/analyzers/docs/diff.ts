import type { DocFileSnapshot, DocSnippet } from '../../snapshot/schema.js';

export type DocChange =
  | { kind: 'doc-added'; file: string }
  | { kind: 'doc-removed'; file: string }
  | { kind: 'snippet-broken'; file: string; snippet: DocSnippet }
  | { kind: 'snippet-fixed'; file: string; snippet: DocSnippet }
  | { kind: 'snippet-removed'; file: string; snippet: DocSnippet }
  | { kind: 'snippet-added-broken'; file: string; snippet: DocSnippet };

export function diffDocs(baseline: DocFileSnapshot[], head: DocFileSnapshot[]): DocChange[] {
  const baseByPath = new Map(baseline.map((d) => [d.path, d]));
  const headByPath = new Map(head.map((d) => [d.path, d]));
  const changes: DocChange[] = [];

  for (const path of baseByPath.keys()) {
    if (!headByPath.has(path)) changes.push({ kind: 'doc-removed', file: path });
  }
  for (const path of headByPath.keys()) {
    if (!baseByPath.has(path)) changes.push({ kind: 'doc-added', file: path });
  }

  for (const [path, baseDoc] of baseByPath) {
    const headDoc = headByPath.get(path);
    if (!headDoc) continue;
    changes.push(...diffSnippets(path, baseDoc.snippets, headDoc.snippets));
  }

  for (const [path, headDoc] of headByPath) {
    if (baseByPath.has(path)) continue;
    for (const s of headDoc.snippets) {
      if (!s.compiles) changes.push({ kind: 'snippet-added-broken', file: path, snippet: s });
    }
  }

  return changes;
}

function diffSnippets(file: string, before: DocSnippet[], after: DocSnippet[]): DocChange[] {
  const beforeById = new Map(before.map((s) => [s.id, s]));
  const afterById = new Map(after.map((s) => [s.id, s]));
  const changes: DocChange[] = [];

  for (const [id, b] of beforeById) {
    const a = afterById.get(id);
    if (!a) {
      changes.push({ kind: 'snippet-removed', file, snippet: b });
      continue;
    }
    if (b.compiles && !a.compiles) {
      changes.push({ kind: 'snippet-broken', file, snippet: a });
    } else if (!b.compiles && a.compiles) {
      changes.push({ kind: 'snippet-fixed', file, snippet: a });
    }
  }

  for (const [id, a] of afterById) {
    if (beforeById.has(id)) continue;
    if (!a.compiles) changes.push({ kind: 'snippet-added-broken', file, snippet: a });
  }

  return changes;
}
