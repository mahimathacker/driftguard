import { appendFile } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import type { Report } from '../reporter/report.js';

export function isGitHubActions(): boolean {
  return process.env.GITHUB_ACTIONS === 'true';
}

export function emitAnnotations(
  report: Report,
  write: (s: string) => void,
): void {
  for (const f of report.findings) {
    const cmd = f.severity === 'error' ? 'error' : 'warning';
    const props: string[] = [];
    if (f.file) props.push(`file=${f.file}`);
    if (f.line) props.push(`line=${f.line}`);
    props.push(`title=DriftGuard: ${f.ruleId}`);
    write(`::${cmd} ${props.join(',')}::${escapeCommand(f.message)}\n`);
  }
}

export async function appendStepSummary(markdownPath: string): Promise<void> {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (!target) return;
  const md = await readFile(markdownPath, 'utf8');
  await appendFile(target, md + '\n', 'utf8');
}

export async function setOutput(name: string, value: string | number): Promise<void> {
  const target = process.env.GITHUB_OUTPUT;
  if (!target) return;
  await appendFile(target, `${name}=${value}\n`, 'utf8');
}

function escapeCommand(s: string): string {
  return s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}
