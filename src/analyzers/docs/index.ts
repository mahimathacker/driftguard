import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { globby } from 'globby';
import picomatch from 'picomatch';
import type { DriftGuardConfig } from '../../config/schema.js';
import type { DocFileSnapshot, DocSnippet } from '../../snapshot/schema.js';
import { extractSnippets } from './extract.js';
import { fileContentHash, snippetId } from './hash.js';
import { TsSnippetValidator, type SdkContext } from './validate.js';

type DocsConfig = NonNullable<DriftGuardConfig['docs']>;

export type DocsAnalysisContext = {
  sdk?: SdkContext;
  tsconfig?: string;
};

const TS_LANGUAGES = new Set(['ts', 'tsx', 'js', 'jsx']);

export async function analyzeDocs(
  config: DocsConfig,
  context: DocsAnalysisContext,
  cwd: string = process.cwd(),
): Promise<DocFileSnapshot[]> {
  const filePaths = await globby(config.paths, { cwd, absolute: true });
  const allowed = new Set(config.snippetLanguages);
  const ignore = config.ignore.length > 0 ? picomatch(config.ignore) : null;
  const validator = new TsSnippetValidator(context.sdk, context.tsconfig);

  const result: DocFileSnapshot[] = [];
  for (const absPath of filePaths) {
    const relPath = relative(cwd, absPath);
    if (ignore?.(relPath)) continue;

    const content = await readFile(absPath, 'utf8');
    const raw = extractSnippets(relPath, content);
    const snippets: DocSnippet[] = [];

    for (const r of raw) {
      if (!allowed.has(r.language as DocsConfig['snippetLanguages'][number])) continue;

      const result = TS_LANGUAGES.has(r.language)
        ? validator.validate(r)
        : { compiles: true };

      const snippet: DocSnippet = {
        id: snippetId(relPath, r.source),
        line: r.line,
        language: r.language,
        source: r.source,
        compiles: result.compiles,
      };
      if (result.error) snippet.error = result.error;
      snippets.push(snippet);
    }

    result.push({
      path: relPath,
      contentHash: fileContentHash(content),
      snippets,
    });
  }

  return result;
}
