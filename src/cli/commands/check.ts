import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { DriftGuardConfig } from '../../config/schema.js';
import { buildReport } from '../../reporter/report.js';
import { renderConsole } from '../../reporter/console.js';
import { renderMarkdown } from '../../reporter/markdown.js';
import { renderSarif } from '../../reporter/sarif.js';
import type { Report } from '../../reporter/report.js';
import { readSnapshot } from '../../snapshot/io.js';
import { analyze } from './snapshot.js';

const TOOL_VERSION = '0.1.0';

export type CheckOutput = {
  report: Report;
  console: string;
  written: { format: string; path: string }[];
};

export async function runCheck(
  cwd: string,
  config: DriftGuardConfig,
): Promise<CheckOutput> {
  const baselinePath = resolve(cwd, config.snapshot.path);
  const baseline = await readSnapshot(baselinePath);
  const head = await analyze(cwd, config);
  const report = buildReport(baseline, head, config);

  const written: { format: string; path: string }[] = [];
  for (const format of config.report.formats) {
    if (format === 'console') continue;
    const { path, content } = await emit(cwd, format, report, config);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, 'utf8');
    written.push({ format, path });
  }

  return {
    report,
    console: renderConsole(report),
    written,
  };
}

async function emit(
  cwd: string,
  format: 'markdown' | 'sarif' | 'json',
  report: Report,
  config: DriftGuardConfig,
): Promise<{ path: string; content: string }> {
  switch (format) {
    case 'markdown':
      return { path: resolve(cwd, config.report.markdownPath), content: renderMarkdown(report) };
    case 'sarif':
      return { path: resolve(cwd, config.report.sarifPath), content: renderSarif(report, TOOL_VERSION) };
    case 'json':
      return {
        path: resolve(cwd, config.report.jsonPath),
        content: JSON.stringify(report, null, 2) + '\n',
      };
  }
}
