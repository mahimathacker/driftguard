import pc from 'picocolors';
import type { Finding } from './findings.js';
import type { Report } from './report.js';

export function renderConsole(report: Report): string {
  if (report.findings.length === 0) {
    return pc.green('✓ DriftGuard: no drift detected.');
  }

  const lines: string[] = [];
  lines.push(
    pc.bold(
      `DriftGuard found ${report.errorCount} error${plural(report.errorCount)} ` +
        `and ${report.warningCount} warning${plural(report.warningCount)}.`,
    ),
  );

  for (const [file, findings] of groupByFile(report.findings)) {
    lines.push('');
    lines.push(pc.bold(file ?? '(global)'));
    for (const f of findings) {
      const tag = f.severity === 'error' ? pc.red('error  ') : pc.yellow('warning');
      const loc = f.line ? pc.dim(`:${f.line}`) : '';
      lines.push(`  ${tag} ${pc.dim(f.ruleId)} ${f.message}${loc}`);
      if (f.before !== undefined && f.after !== undefined) {
        lines.push(pc.dim(`    before: ${f.before}`));
        lines.push(pc.dim(`    after:  ${f.after}`));
      }
    }
  }

  lines.push('');
  lines.push(
    report.exitCode === 1
      ? pc.red(`✗ ${report.errorCount} error${plural(report.errorCount)} — failing the check.`)
      : pc.yellow(`⚠ ${report.warningCount} warning${plural(report.warningCount)} — check passing.`),
  );

  return lines.join('\n');
}

function groupByFile(findings: Finding[]): Map<string | undefined, Finding[]> {
  const map = new Map<string | undefined, Finding[]>();
  for (const f of findings) {
    const key = f.file;
    const list = map.get(key) ?? [];
    list.push(f);
    map.set(key, list);
  }
  return map;
}

function plural(n: number): string {
  return n === 1 ? '' : 's';
}
