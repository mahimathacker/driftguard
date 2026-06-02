#!/usr/bin/env node
import pc from 'picocolors';
import { Builtins, Cli, Command, Option } from 'clipanion';
import { ConfigNotFoundError, ConfigParseError, loadConfig } from '../config/load.js';
import { SnapshotNotFoundError, SnapshotVersionError } from '../snapshot/io.js';
import { runCheck } from './commands/check.js';
import { runInit } from './commands/init.js';
import { runSnapshot } from './commands/snapshot.js';
import {
  appendStepSummary,
  emitAnnotations,
  isGitHubActions,
  setOutput,
} from './github-output.js';
import { VERSION } from '../version.js';

class InitCommand extends Command {
  static override paths = [['init']];
  static override usage = Command.Usage({
    description: 'Generate a starter driftguard.config.ts in the current directory.',
  });

  force = Option.Boolean('-f,--force', false, {
    description: 'Overwrite an existing config file.',
  });

  async execute(): Promise<number> {
    const result = await runInit(process.cwd(), this.force);
    if (result.created) {
      this.context.stdout.write(pc.green(`✓ wrote ${result.path}\n`));
      const enabled = ['sdk'];
      if (result.detected.contracts) enabled.push('contracts');
      if (result.detected.docs) enabled.push('docs');
      this.context.stdout.write(
        pc.dim(`  enabled layers: ${enabled.join(', ')}\n`),
      );
      return 0;
    }
    this.context.stderr.write(
      pc.red(`config already exists at ${result.path} — pass --force to overwrite\n`),
    );
    return 1;
  }
}

class SnapshotCommand extends Command {
  static override paths = [['snapshot']];
  static override usage = Command.Usage({
    description: 'Capture a baseline snapshot of contracts, SDK exports, and docs.',
  });

  configPath = Option.String('-c,--config', { description: 'Path to config file.' });

  async execute(): Promise<number> {
    return withConfig(this.context, this.configPath, async (config) => {
      const result = await runSnapshot(process.cwd(), config);
      this.context.stdout.write(
        pc.green(
          `✓ snapshot written to ${result.path}\n` +
            `  ${result.contractCount} contract(s), ` +
            `${result.sdkExportCount} SDK export(s), ` +
            `${result.docFileCount} doc file(s)\n`,
        ),
      );
      return 0;
    });
  }
}

class CheckCommand extends Command {
  static override paths = [['check'], Command.Default];
  static override usage = Command.Usage({
    description: 'Detect drift between the current state and the baseline snapshot.',
  });

  configPath = Option.String('-c,--config', { description: 'Path to config file.' });
  json = Option.Boolean('--json', false, { description: 'Emit JSON report to stdout.' });

  async execute(): Promise<number> {
    return withConfig(this.context, this.configPath, async (config) => {
      const result = await runCheck(process.cwd(), config);

      if (this.json) {
        this.context.stdout.write(JSON.stringify(result.report, null, 2) + '\n');
      } else {
        this.context.stdout.write(result.console + '\n');
        for (const w of result.written) {
          this.context.stdout.write(pc.dim(`  ${w.format} → ${w.path}\n`));
        }
      }

      if (isGitHubActions()) {
        emitAnnotations(result.report, (s) => this.context.stdout.write(s));
        const md = result.written.find((w) => w.format === 'markdown');
        if (md) await appendStepSummary(md.path);
        await setOutput('error-count', result.report.errorCount);
        await setOutput('warning-count', result.report.warningCount);
        const sarif = result.written.find((w) => w.format === 'sarif');
        if (sarif) await setOutput('sarif-path', sarif.path);
      }

      return result.report.exitCode;
    });
  }
}

async function withConfig(
  context: { stderr: NodeJS.WritableStream },
  configPath: string | undefined,
  fn: (config: import('../config/schema.js').DriftGuardConfig) => Promise<number>,
): Promise<number> {
  try {
    const { config } = await loadConfig(process.cwd(), configPath);
    return await fn(config);
  } catch (err) {
    if (err instanceof ConfigNotFoundError) {
      context.stderr.write(pc.red(`error: ${err.message}\n`));
      return 2;
    }
    if (err instanceof ConfigParseError) {
      context.stderr.write(pc.red(`error: ${err.message}\n`));
      return 2;
    }
    if (err instanceof SnapshotNotFoundError) {
      context.stderr.write(pc.red(`error: ${err.message}\n`));
      return 2;
    }
    if (err instanceof SnapshotVersionError) {
      context.stderr.write(pc.red(`error: ${err.message}\n`));
      return 2;
    }
    throw err;
  }
}

const cli = new Cli({
  binaryLabel: 'DriftGuard',
  binaryName: 'driftguard',
  binaryVersion: VERSION,
});

cli.register(Builtins.HelpCommand);
cli.register(Builtins.VersionCommand);
cli.register(InitCommand);
cli.register(SnapshotCommand);
cli.register(CheckCommand);

void cli.runExit(process.argv.slice(2));
