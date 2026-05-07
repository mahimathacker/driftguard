import type { Finding, Layer } from './findings.js';
import type { Report } from './report.js';

const LAYER_TITLES: Record<Layer, string> = {
  contracts: 'Contracts (Solidity)',
  sdk: 'SDK (TypeScript)',
  docs: 'Documentation',
};

export function renderMarkdown(report: Report): string {
  if (report.findings.length === 0) {
    return '## DriftGuard\n\n✓ No drift detected.\n';
  }

  const lines: string[] = [];
  const errs = report.errorCount;
  const warns = report.warningCount;
  lines.push(`## DriftGuard found ${errs} error${plural(errs)} and ${warns} warning${plural(warns)}\n`);

  for (const layer of ['contracts', 'sdk', 'docs'] as const) {
    const layerFindings = report.findings.filter((f) => f.layer === layer);
    if (layerFindings.length === 0) continue;

    lines.push(`### ${LAYER_TITLES[layer]}\n`);
    for (const f of layerFindings) {
      lines.push(formatFinding(f));
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatFinding(f: Finding): string {
  const icon = f.severity === 'error' ? '🚨' : '⚠️';
  const loc = f.file ? `\`${f.file}${f.line ? `:${f.line}` : ''}\`` : '';
  const head = `- ${icon} ${loc ? `${loc} — ` : ''}${escapeMd(f.message)} _(${f.ruleId})_`;
  if (f.before !== undefined && f.after !== undefined) {
    return [
      head,
      '  ```diff',
      `  - ${f.before}`,
      `  + ${f.after}`,
      '  ```',
    ].join('\n');
  }
  return head;
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, '\\|');
}

function plural(n: number): string {
  return n === 1 ? '' : 's';
}
