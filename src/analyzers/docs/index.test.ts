import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeDocs } from './index.js';

const DOCS_FIXTURE = resolve(__dirname, '../../../tests/fixtures/docs/sample-docs');
const SDK_FIXTURE = resolve(__dirname, '../../../tests/fixtures/typescript/sample-sdk/src/index.ts');

describe('analyzeDocs', () => {
  it('captures every snippet, hashes file content, and assigns content-based ids', async () => {
    const docs = await analyzeDocs(
      {
        paths: ['*.md'],
        snippetLanguages: ['ts', 'tsx', 'solidity'],
        ignoreTag: 'driftguard-ignore',
        ignore: [],
      },
      { sdk: { packageName: '@example/sample-sdk', entryPath: SDK_FIXTURE } },
      DOCS_FIXTURE,
    );

    expect(docs).toHaveLength(1);
    expect(docs[0]?.path).toBe('quickstart.md');
    expect(docs[0]?.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(docs[0]?.snippets).toHaveLength(4);
    for (const s of docs[0]!.snippets) {
      expect(s.id).toMatch(/^quickstart\.md#[0-9a-f]{12}$/);
    }
  });

  it('marks well-typed TS snippets as compiles=true', async () => {
    const docs = await analyzeDocs(
      {
        paths: ['*.md'],
        snippetLanguages: ['ts'],
        ignoreTag: 'driftguard-ignore',
        ignore: [],
      },
      { sdk: { packageName: '@example/sample-sdk', entryPath: SDK_FIXTURE } },
      DOCS_FIXTURE,
    );
    const tsSnippets = docs[0]!.snippets;
    const goodOnes = tsSnippets.filter((s) => s.compiles);
    expect(goodOnes.length).toBeGreaterThanOrEqual(2);
  });

  it('marks the broken TS snippet as compiles=false with diagnostic text', async () => {
    const docs = await analyzeDocs(
      {
        paths: ['*.md'],
        snippetLanguages: ['ts'],
        ignoreTag: 'driftguard-ignore',
        ignore: [],
      },
      { sdk: { packageName: '@example/sample-sdk', entryPath: SDK_FIXTURE } },
      DOCS_FIXTURE,
    );
    const broken = docs[0]!.snippets.filter((s) => !s.compiles);
    expect(broken).toHaveLength(1);
    expect(broken[0]?.error).toBeDefined();
    expect(broken[0]?.error?.toLowerCase()).toContain('bigint');
  });

  it('does not validate Solidity snippets in v0.1 (compiles=true regardless)', async () => {
    const docs = await analyzeDocs(
      {
        paths: ['*.md'],
        snippetLanguages: ['solidity'],
        ignoreTag: 'driftguard-ignore',
        ignore: [],
      },
      { sdk: { packageName: '@example/sample-sdk', entryPath: SDK_FIXTURE } },
      DOCS_FIXTURE,
    );
    const sol = docs[0]!.snippets.find((s) => s.language === 'solidity');
    expect(sol?.compiles).toBe(true);
  });

  it('respects snippetLanguages filter', async () => {
    const docs = await analyzeDocs(
      {
        paths: ['*.md'],
        snippetLanguages: ['ts'],
        ignoreTag: 'driftguard-ignore',
        ignore: [],
      },
      { sdk: { packageName: '@example/sample-sdk', entryPath: SDK_FIXTURE } },
      DOCS_FIXTURE,
    );
    const langs = new Set(docs[0]!.snippets.map((s) => s.language));
    expect(langs).toEqual(new Set(['ts']));
  });
});
