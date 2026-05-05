import remarkFrontmatter from 'remark-frontmatter';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

export type RawSnippet = {
  file: string;
  line: number;
  language: string;
  source: string;
};

const LANGUAGE_ALIASES: Record<string, string> = {
  typescript: 'ts',
  typescriptreact: 'tsx',
  javascript: 'js',
  javascriptreact: 'jsx',
  sol: 'solidity',
};

export function normalizeLanguage(lang: string): string {
  const lower = lang.toLowerCase();
  return LANGUAGE_ALIASES[lower] ?? lower;
}

export function extractSnippets(filePath: string, content: string): RawSnippet[] {
  const isMdx = filePath.endsWith('.mdx');
  const processor = unified().use(remarkParse).use(remarkFrontmatter, ['yaml', 'toml']);
  if (isMdx) processor.use(remarkMdx);

  const tree = processor.parse(content);
  const snippets: RawSnippet[] = [];

  visit(tree, 'code', (node) => {
    if (!node.lang) return;
    snippets.push({
      file: filePath,
      line: node.position?.start.line ?? 0,
      language: normalizeLanguage(node.lang),
      source: node.value,
    });
  });

  return snippets;
}
