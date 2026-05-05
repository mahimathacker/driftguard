import picomatch from 'picomatch';
import type { DriftGuardConfig } from '../../config/schema.js';
import type { SdkSnapshot } from '../../snapshot/schema.js';
import { loadSdk } from './extract.js';

type SdkConfig = NonNullable<DriftGuardConfig['sdk']>;

export async function analyzeSdk(
  config: SdkConfig,
  cwd: string = process.cwd(),
): Promise<SdkSnapshot> {
  const loaded = await loadSdk(config.entry, cwd, config.tsconfig);
  const ignore = config.ignore.length > 0 ? picomatch(config.ignore) : null;

  const exports: SdkSnapshot['exports'] = {};
  for (const [name, exp] of Object.entries(loaded.exports)) {
    if (ignore?.(name)) continue;
    exports[name] = exp;
  }

  return {
    packageName: loaded.packageName,
    entryPath: loaded.entryPath,
    exports,
    ...(loaded.packageVersion ? { packageVersion: loaded.packageVersion } : {}),
  };
}
