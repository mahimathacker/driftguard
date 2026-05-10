import { resolve } from 'node:path';
import { execa } from 'execa';
import { detect } from 'package-manager-detector';
import type { DriftGuardConfig } from '../../config/schema.js';

type DemosConfig = NonNullable<DriftGuardConfig['demos']>;
type DemoRepo = DemosConfig['repos'][number];
type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export type DemoResult = {
  name: string;
  command: string;
  passed: boolean;
  exitCode: number;
  durationMs: number;
  output: string;
};

const MAX_OUTPUT_TAIL = 4_000;

export async function runDemos(config: DemosConfig, cwd: string): Promise<DemoResult[]> {
  if (!config.enabled || config.repos.length === 0) return [];
  const results: DemoResult[] = [];
  for (const repo of config.repos) {
    results.push(await runOne(repo, cwd));
  }
  return results;
}

async function runOne(repo: DemoRepo, rootCwd: string): Promise<DemoResult> {
  const repoPath = resolve(rootCwd, repo.path);
  const pm = await resolvePackageManager(repo, repoPath);
  const installCmd = repo.install ?? `${pm} install`;
  const runCmd = repo.command ?? `${pm} test`;
  const start = Date.now();

  const install = await runCommand(installCmd, repoPath, repo.env, repo.timeoutMs);
  if (!install.passed) {
    return {
      name: repo.name,
      command: installCmd,
      passed: false,
      exitCode: install.exitCode,
      durationMs: Date.now() - start,
      output: install.output,
    };
  }

  const run = await runCommand(runCmd, repoPath, repo.env, repo.timeoutMs);
  return {
    name: repo.name,
    command: runCmd,
    passed: run.passed,
    exitCode: run.exitCode,
    durationMs: Date.now() - start,
    output: run.output,
  };
}

async function runCommand(
  command: string,
  cwd: string,
  env: Record<string, string>,
  timeout: number,
): Promise<{ passed: boolean; exitCode: number; output: string }> {
  const result = await execa(command, {
    cwd,
    env: { ...process.env, ...env },
    timeout,
    shell: true,
    reject: false,
    all: true,
  });
  const exitCode = result.exitCode ?? 1;
  const output = tail(result.all ?? result.stdout ?? '', MAX_OUTPUT_TAIL);
  return { passed: exitCode === 0, exitCode, output };
}

async function resolvePackageManager(repo: DemoRepo, repoPath: string): Promise<PackageManager> {
  if (repo.packageManager !== 'auto') return repo.packageManager;
  const detected = await detect({ cwd: repoPath });
  return (detected?.name as PackageManager | undefined) ?? 'npm';
}

function tail(s: string, n: number): string {
  if (s.length <= n) return s;
  return `…(truncated)…\n${s.slice(-n)}`;
}
