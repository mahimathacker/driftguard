import { describe, expect, it } from 'vitest';
import type { Finding } from './findings.js';
import { renderConsole } from './console.js';
import { renderMarkdown } from './markdown.js';
import { renderSarif } from './sarif.js';
import type { Report } from './report.js';

const finding: Finding = {
  ruleId: 'abi-breaking',
  severity: 'error',
  layer: 'contracts',
  message: 'Token: function:transfer(address,uint256) removed',
  file: 'src/Token.sol',
};

const cleanReport: Report = {
  findings: [],
  errorCount: 0,
  warningCount: 0,
  exitCode: 0,
};

const dirtyReport: Report = {
  findings: [finding],
  errorCount: 1,
  warningCount: 0,
  exitCode: 1,
};

describe('renderConsole', () => {
  it('reports a clean run as success', () => {
    const out = renderConsole(cleanReport);
    expect(out).toContain('no drift detected');
  });

  it('renders findings grouped by file with rule + message', () => {
    const out = renderConsole(dirtyReport);
    expect(out).toContain('src/Token.sol');
    expect(out).toContain('abi-breaking');
    expect(out).toContain('removed');
    expect(out).toContain('1 error');
  });
});

describe('renderMarkdown', () => {
  it('produces a layered markdown summary', () => {
    const out = renderMarkdown(dirtyReport);
    expect(out).toContain('## DriftGuard found 1 error');
    expect(out).toContain('### Contracts');
    expect(out).toContain('`src/Token.sol`');
    expect(out).toContain('🚨');
  });

  it('renders before/after as a diff block', () => {
    const sigChange: Finding = {
      ruleId: 'sdk-signature-changed',
      severity: 'error',
      layer: 'sdk',
      message: 'Export transfer signature changed',
      file: 'index.ts',
      before: '(x: number) => void',
      after: '(x: bigint) => void',
    };
    const r: Report = { findings: [sigChange], errorCount: 1, warningCount: 0, exitCode: 1 };
    const out = renderMarkdown(r);
    expect(out).toContain('```diff');
    expect(out).toContain('- (x: number) => void');
    expect(out).toContain('+ (x: bigint) => void');
  });
});

describe('renderSarif', () => {
  it('produces valid SARIF 2.1.0 with rules and results', () => {
    const out = renderSarif(dirtyReport, '0.1.0');
    const sarif = JSON.parse(out);
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.name).toBe('DriftGuard');
    expect(sarif.runs[0].tool.driver.rules).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.rules[0].id).toBe('abi-breaking');
    expect(sarif.runs[0].results).toHaveLength(1);
    expect(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri).toBe(
      'src/Token.sol',
    );
  });

  it('omits unused rules (only includes ones referenced by findings)', () => {
    const out = renderSarif(dirtyReport, '0.1.0');
    const sarif = JSON.parse(out);
    const ruleIds = sarif.runs[0].tool.driver.rules.map((r: { id: string }) => r.id);
    expect(ruleIds).toEqual(['abi-breaking']);
  });
});
