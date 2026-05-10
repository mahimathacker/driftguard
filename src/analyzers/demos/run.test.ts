import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DriftGuardConfigSchema } from '../../config/schema.js';
import { runDemos } from './run.js';

let workdir: string;

beforeEach(async () => {
  workdir = await mkdtemp(join(tmpdir(), 'driftguard-demos-'));
});

afterEach(async () => {
  await rm(workdir, { recursive: true, force: true });
});

function configForDemo(repos: object[]) {
  return DriftGuardConfigSchema.parse({
    contracts: { paths: ['x'] },
    demos: { enabled: true, repos },
  }).demos;
}

describe('runDemos', () => {
  it('returns empty when demos.enabled is false', async () => {
    const config = DriftGuardConfigSchema.parse({
      contracts: { paths: ['x'] },
      demos: { enabled: false },
    }).demos;
    expect(await runDemos(config, workdir)).toEqual([]);
  });

  it('returns empty when no repos configured', async () => {
    const config = configForDemo([]);
    expect(await runDemos(config, workdir)).toEqual([]);
  });

  it('captures pass/fail from a custom command (no install/test conventions)', async () => {
    const config = configForDemo([
      {
        name: 'always-passes',
        path: '.',
        install: 'true',
        command: 'true',
      },
      {
        name: 'always-fails',
        path: '.',
        install: 'true',
        command: 'false',
      },
    ]);
    const results = await runDemos(config, workdir);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ name: 'always-passes', passed: true, exitCode: 0 });
    expect(results[1]).toMatchObject({ name: 'always-fails', passed: false, exitCode: 1 });
  });

  it('short-circuits when install fails (does not run the test command)', async () => {
    const config = configForDemo([
      {
        name: 'broken-install',
        path: '.',
        install: 'exit 7',
        command: 'echo "should not run"',
      },
    ]);
    const [result] = await runDemos(config, workdir);
    expect(result?.passed).toBe(false);
    expect(result?.command).toBe('exit 7');
    expect(result?.exitCode).toBe(7);
  });

  it('captures stdout/stderr in output (truncated tail)', async () => {
    const config = configForDemo([
      {
        name: 'noisy',
        path: '.',
        install: 'true',
        command: 'echo "drift detected at line 42" && exit 3',
      },
    ]);
    const [result] = await runDemos(config, workdir);
    expect(result?.passed).toBe(false);
    expect(result?.output).toContain('drift detected at line 42');
  });

  it('honors per-demo env variables', async () => {
    const config = configForDemo([
      {
        name: 'env-check',
        path: '.',
        install: 'true',
        command: 'test "$DRIFT_TEST" = "from-config"',
        env: { DRIFT_TEST: 'from-config' },
      },
    ]);
    const [result] = await runDemos(config, workdir);
    expect(result?.passed).toBe(true);
  });

  it('respects timeoutMs (kills runaway commands)', async () => {
    const config = configForDemo([
      {
        name: 'slow',
        path: '.',
        install: 'true',
        command: 'sleep 30',
        timeoutMs: 200,
      },
    ]);
    const [result] = await runDemos(config, workdir);
    expect(result?.passed).toBe(false);
  });

  it('runs commands in the configured repo path', async () => {
    const subdir = join(workdir, 'inner');
    await rm(subdir, { recursive: true, force: true });
    const { mkdir } = await import('node:fs/promises');
    await mkdir(subdir);
    await writeFile(join(subdir, 'marker.txt'), 'here');
    const config = configForDemo([
      {
        name: 'cwd-check',
        path: 'inner',
        install: 'true',
        command: 'test -f marker.txt',
      },
    ]);
    const [result] = await runDemos(config, workdir);
    expect(result?.passed).toBe(true);
  });
});
