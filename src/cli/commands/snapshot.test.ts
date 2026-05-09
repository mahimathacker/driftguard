import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DriftGuardConfigSchema, type DriftGuardConfig } from '../../config/schema.js';
import { runCheck } from './check.js';
import { runSnapshot } from './snapshot.js';

const FOUNDRY_FIXTURE = resolve(__dirname, '../../../tests/fixtures/solidity/foundry-project');
const SDK_FIXTURE = resolve(__dirname, '../../../tests/fixtures/typescript/sample-sdk');
const DOCS_FIXTURE = resolve(__dirname, '../../../tests/fixtures/docs/sample-docs');

let workdir: string;

beforeEach(async () => {
  workdir = await mkdtemp(join(tmpdir(), 'driftguard-int-'));

  // Stage all three fixtures into a single working repo
  await cp(FOUNDRY_FIXTURE, workdir, { recursive: true });
  await cp(SDK_FIXTURE, join(workdir, 'sdk'), { recursive: true });
  await cp(DOCS_FIXTURE, join(workdir, 'docs'), { recursive: true });
});

afterEach(async () => {
  await rm(workdir, { recursive: true, force: true });
});

function makeConfig(): DriftGuardConfig {
  return DriftGuardConfigSchema.parse({
    contracts: { paths: ['src/**/*.sol'], toolchain: 'foundry' },
    sdk: { entry: 'sdk/package.json', tsconfig: 'sdk/tsconfig.json' },
    docs: { paths: ['docs/**/*.md'] },
    severity: { sdkAdded: 'off' },
  });
}

describe('snapshot → check loop', () => {
  it('writes a snapshot, then check finds zero drift against the same state', async () => {
    const config = makeConfig();

    const snap = await runSnapshot(workdir, config);
    expect(snap.contractCount).toBe(1);
    expect(snap.sdkExportCount).toBeGreaterThan(0);
    expect(snap.docFileCount).toBe(1);

    const check = await runCheck(workdir, config);
    expect(check.report.errorCount).toBe(0);
    expect(check.report.exitCode).toBe(0);
  });

  it('detects drift when the SDK changes between snapshot and check', async () => {
    const config = makeConfig();
    await runSnapshot(workdir, config);

    // Mutate the SDK: change `transfer` to take an extra arg
    const sdkPath = join(workdir, 'sdk/src/index.ts');
    const original = await readFile(sdkPath, 'utf8');
    const mutated = original.replace(
      'export function transfer(opts: TransferOptions): Promise<Receipt>',
      'export function transfer(opts: TransferOptions, extra: string): Promise<Receipt>',
    );
    await writeFile(sdkPath, mutated);

    const check = await runCheck(workdir, config);
    expect(check.report.errorCount).toBeGreaterThan(0);
    expect(check.report.exitCode).toBe(1);
    expect(check.report.findings.some((f) => f.ruleId === 'sdk-signature-changed')).toBe(true);
  });

  it('writes the configured output formats to disk', async () => {
    const config = makeConfig();
    await runSnapshot(workdir, config);
    const check = await runCheck(workdir, config);

    const formats = check.written.map((w) => w.format).sort();
    expect(formats).toEqual(['markdown', 'sarif']);

    for (const w of check.written) {
      const content = await readFile(w.path, 'utf8');
      expect(content.length).toBeGreaterThan(0);
    }
  });
});
