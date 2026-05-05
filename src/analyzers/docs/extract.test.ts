import { describe, expect, it } from 'vitest';
import { extractSnippets, normalizeLanguage } from './extract.js';

describe('normalizeLanguage', () => {
  it('canonicalizes common aliases', () => {
    expect(normalizeLanguage('typescript')).toBe('ts');
    expect(normalizeLanguage('TypeScript')).toBe('ts');
    expect(normalizeLanguage('typescriptreact')).toBe('tsx');
    expect(normalizeLanguage('javascript')).toBe('js');
    expect(normalizeLanguage('sol')).toBe('solidity');
    expect(normalizeLanguage('solidity')).toBe('solidity');
  });

  it('passes unknown languages through unchanged (lowercased)', () => {
    expect(normalizeLanguage('rust')).toBe('rust');
    expect(normalizeLanguage('Bash')).toBe('bash');
  });
});

describe('extractSnippets', () => {
  it('finds fenced code blocks with language tags', () => {
    const md = [
      '# Title',
      '',
      '```ts',
      'const x = 1;',
      '```',
      '',
      'Some text',
      '',
      '```solidity',
      'contract C {}',
      '```',
    ].join('\n');
    const snippets = extractSnippets('test.md', md);
    expect(snippets).toHaveLength(2);
    expect(snippets[0]).toMatchObject({ language: 'ts', source: 'const x = 1;' });
    expect(snippets[1]).toMatchObject({ language: 'solidity', source: 'contract C {}' });
  });

  it('skips fenced blocks with no language', () => {
    const md = '```\nplain block\n```';
    expect(extractSnippets('test.md', md)).toEqual([]);
  });

  it('records 1-indexed line numbers from the fence', () => {
    const md = ['# Heading', '', 'intro', '', '```ts', 'x', '```'].join('\n');
    const [snippet] = extractSnippets('test.md', md);
    expect(snippet?.line).toBe(5);
  });

  it('handles frontmatter without including it as a snippet', () => {
    const md = ['---', 'title: foo', '---', '', '```ts', 'const x = 1;', '```'].join('\n');
    const snippets = extractSnippets('test.md', md);
    expect(snippets).toHaveLength(1);
    expect(snippets[0]?.language).toBe('ts');
  });
});
