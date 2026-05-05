#!/usr/bin/env node
import { Builtins, Cli, Command, Option } from 'clipanion';

const VERSION = '0.1.0';

class InitCommand extends Command {
  static override paths = [['init']];
  static override usage = Command.Usage({
    description: 'Generate a starter driftguard.config.ts in the current directory.',
  });

  force = Option.Boolean('-f,--force', false, {
    description: 'Overwrite an existing config file.',
  });

  async execute(): Promise<number> {
    this.context.stdout.write('TODO: scaffold driftguard.config.ts\n');
    return 0;
  }
}

class SnapshotCommand extends Command {
  static override paths = [['snapshot']];
  static override usage = Command.Usage({
    description: 'Capture a baseline snapshot of contracts, SDK exports, and docs.',
  });

  config = Option.String('-c,--config', { description: 'Path to config file.' });

  async execute(): Promise<number> {
    this.context.stdout.write('TODO: write snapshot to .driftguard/snapshot.json\n');
    return 0;
  }
}

class CheckCommand extends Command {
  static override paths = [['check'], Command.Default];
  static override usage = Command.Usage({
    description: 'Detect drift between the current state and the baseline snapshot.',
  });

  config = Option.String('-c,--config', { description: 'Path to config file.' });
  json = Option.Boolean('--json', false, { description: 'Emit JSON only.' });

  async execute(): Promise<number> {
    this.context.stdout.write('TODO: run analyzers and report drift\n');
    return 0;
  }
}

class ReportCommand extends Command {
  static override paths = [['report']];
  static override usage = Command.Usage({
    description: 'Re-render the most recent drift result in a different format.',
  });

  format = Option.String('--format', 'markdown', {
    description: 'Output format: markdown, sarif, or json.',
  });

  async execute(): Promise<number> {
    this.context.stdout.write(`TODO: render ${this.format} report\n`);
    return 0;
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
cli.register(ReportCommand);

void cli.runExit(process.argv.slice(2));
