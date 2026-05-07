import { resolve } from 'node:path';
import { cosmiconfig } from 'cosmiconfig';
import { createJiti } from 'jiti';
import { DriftGuardConfigSchema, type DriftGuardConfig } from './schema.js';

const MODULE_NAME = 'driftguard';

export class ConfigNotFoundError extends Error {
  constructor(cwd: string) {
    super(
      `No driftguard config found in ${cwd}. Run \`driftguard init\` to create one.`,
    );
    this.name = 'ConfigNotFoundError';
  }
}

export class ConfigParseError extends Error {
  constructor(filepath: string, cause: unknown) {
    super(`Failed to parse config at ${filepath}: ${describe(cause)}`);
    this.name = 'ConfigParseError';
    this.cause = cause;
  }
}

export type LoadedConfig = {
  config: DriftGuardConfig;
  filepath: string;
};

export async function loadConfig(
  cwd: string,
  explicitPath?: string,
): Promise<LoadedConfig> {
  const jiti = createJiti(cwd, { interopDefault: true });

  const explorer = cosmiconfig(MODULE_NAME, {
    searchPlaces: [
      'driftguard.config.ts',
      'driftguard.config.mts',
      'driftguard.config.js',
      'driftguard.config.mjs',
      'driftguard.config.cjs',
      'driftguard.config.json',
      `.${MODULE_NAME}rc`,
      `.${MODULE_NAME}rc.json`,
    ],
    loaders: {
      '.ts': async (filepath) => jiti.import(filepath, { default: true }),
      '.mts': async (filepath) => jiti.import(filepath, { default: true }),
    },
  });

  const result = explicitPath
    ? await explorer.load(resolve(cwd, explicitPath))
    : await explorer.search(cwd);

  if (!result || result.isEmpty) throw new ConfigNotFoundError(cwd);

  const parsed = DriftGuardConfigSchema.safeParse(result.config);
  if (!parsed.success) throw new ConfigParseError(result.filepath, parsed.error);

  return { config: parsed.data, filepath: result.filepath };
}

function describe(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
