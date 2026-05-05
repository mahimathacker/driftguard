import { describe, expect, it } from 'vitest';
import type { DocFileSnapshot, DocSnippet } from '../../snapshot/schema.js';
import { diffDocs } from './diff.js';

function snippet(id: string, compiles: boolean, source = 'x'): DocSnippet {
  return { id, line: 1, language: 'ts', source, compiles };
}

function file(path: string, snippets: DocSnippet[]): DocFileSnapshot {
  return { path, contentHash: 'h', snippets };
}

describe('diffDocs', () => {
  it('returns no changes when nothing changed', () => {
    const docs = [file('a.md', [snippet('a.md#abc', true)])];
    expect(diffDocs(docs, docs)).toEqual([]);
  });

  it('flags snippet-broken when a previously-compiling snippet now fails', () => {
    const before = [file('a.md', [snippet('a.md#abc', true)])];
    const after = [file('a.md', [snippet('a.md#abc', false)])];
    const result = diffDocs(before, after);
    expect(result[0]?.kind).toBe('snippet-broken');
  });

  it('flags snippet-fixed when a previously-broken snippet now compiles', () => {
    const before = [file('a.md', [snippet('a.md#abc', false)])];
    const after = [file('a.md', [snippet('a.md#abc', true)])];
    const result = diffDocs(before, after);
    expect(result[0]?.kind).toBe('snippet-fixed');
  });

  it('does not flag snippets that were already broken in the baseline (lenient mode)', () => {
    const before = [file('a.md', [snippet('a.md#abc', false)])];
    const after = [file('a.md', [snippet('a.md#abc', false)])];
    expect(diffDocs(before, after)).toEqual([]);
  });

  it('flags snippet-removed when a baseline snippet disappears', () => {
    const before = [file('a.md', [snippet('a.md#abc', true)])];
    const after = [file('a.md', [])];
    const result = diffDocs(before, after);
    expect(result[0]?.kind).toBe('snippet-removed');
  });

  it('flags newly-added broken snippets immediately (no grandfathering for new content)', () => {
    const before = [file('a.md', [])];
    const after = [file('a.md', [snippet('a.md#new', false)])];
    const result = diffDocs(before, after);
    expect(result[0]?.kind).toBe('snippet-added-broken');
  });

  it('does not flag newly-added snippets that compile', () => {
    const before = [file('a.md', [])];
    const after = [file('a.md', [snippet('a.md#new', true)])];
    expect(diffDocs(before, after)).toEqual([]);
  });

  it('flags doc-added and doc-removed at the file level (no per-snippet noise)', () => {
    const before = [file('old.md', [snippet('old.md#1', true)])];
    const after = [file('new.md', [snippet('new.md#1', true)])];
    const result = diffDocs(before, after);
    const kinds = result.map((c) => c.kind).sort();
    expect(kinds).toEqual(['doc-added', 'doc-removed']);
  });

  it('treats edited snippets (different content hash) as removed + maybe-added', () => {
    const before = [file('a.md', [snippet('a.md#old', true, 'old code')])];
    const after = [file('a.md', [snippet('a.md#new', true, 'new code')])];
    const result = diffDocs(before, after);
    expect(result.map((c) => c.kind)).toEqual(['snippet-removed']);
  });
});
