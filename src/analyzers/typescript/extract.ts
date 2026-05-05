import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Project, type SourceFile } from 'ts-morph';
import type { SdkExport } from '../../snapshot/schema.js';
import { serializeExport } from './serialize.js';

export type LoadedSdk = {
  packageName: string;
  packageVersion?: string;
  entryPath: string;
  exports: Record<string, SdkExport>;
};

export async function loadSdk(
  entry: string,
  cwd: string,
  tsconfigPath?: string,
): Promise<LoadedSdk> {
  const resolvedEntry = await resolveEntry(entry, cwd);
  const { packageName, packageVersion } = await readPackageMeta(entry, cwd);

  const project = new Project({
    tsConfigFilePath: tsconfigPath ? resolve(cwd, tsconfigPath) : undefined,
    skipAddingFilesFromTsConfig: false,
    compilerOptions: tsconfigPath
      ? undefined
      : { allowJs: false, declaration: true, strict: true, target: 99, module: 99 },
  });

  const source =
    project.getSourceFile(resolvedEntry) ?? project.addSourceFileAtPath(resolvedEntry);

  return {
    packageName,
    packageVersion,
    entryPath: resolvedEntry,
    exports: extractExports(source),
  };
}

function extractExports(source: SourceFile): Record<string, SdkExport> {
  const exports: Record<string, SdkExport> = {};
  for (const [name, declarations] of source.getExportedDeclarations()) {
    const decl = declarations[0];
    if (!decl) continue;
    const serialized = serializeExport(decl);
    if (serialized) exports[name] = serialized;
  }
  return exports;
}

async function resolveEntry(entry: string, cwd: string): Promise<string> {
  const abs = resolve(cwd, entry);
  if (entry.endsWith('.ts') || entry.endsWith('.tsx') || entry.endsWith('.d.ts')) {
    return abs;
  }
  if (entry.endsWith('package.json')) {
    const pkg = JSON.parse(await readFile(abs, 'utf8')) as PackageJson;
    const types = pkg.types ?? pkg.typings ?? pkg.exports?.['.']?.types;
    if (types) return resolve(dirname(abs), types);
    const main = pkg.main ?? pkg.module;
    if (main) return resolve(dirname(abs), main.replace(/\.(js|mjs|cjs)$/, '.ts'));
    throw new Error(`No types/typings/main entry found in ${entry}`);
  }
  return abs;
}

async function readPackageMeta(
  entry: string,
  cwd: string,
): Promise<{ packageName: string; packageVersion?: string }> {
  if (entry.endsWith('package.json')) {
    const pkg = JSON.parse(await readFile(resolve(cwd, entry), 'utf8')) as PackageJson;
    return { packageName: pkg.name ?? '', packageVersion: pkg.version };
  }
  return { packageName: '' };
}

type PackageJson = {
  name?: string;
  version?: string;
  main?: string;
  module?: string;
  types?: string;
  typings?: string;
  exports?: { '.'?: { types?: string; import?: string } };
};
