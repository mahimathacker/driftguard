import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { stableStringify } from '../utils/stable-json.js';
import { SNAPSHOT_VERSION, SnapshotSchema, type Snapshot } from './schema.js';

export class SnapshotNotFoundError extends Error {
  constructor(public readonly path: string) {
    super(
      `No snapshot found at ${path}. Run \`driftguard snapshot\` to create one.`,
    );
    this.name = 'SnapshotNotFoundError';
  }
}

export class SnapshotVersionError extends Error {
  constructor(public readonly path: string, public readonly found: number) {
    super(
      `Snapshot at ${path} has version ${found}, but this DriftGuard expects ${SNAPSHOT_VERSION}. ` +
        `Re-run \`driftguard snapshot\` to regenerate it.`,
    );
    this.name = 'SnapshotVersionError';
  }
}

export class SnapshotParseError extends Error {
  constructor(public readonly path: string, cause: unknown) {
    super(`Failed to parse snapshot at ${path}: ${describe(cause)}`);
    this.name = 'SnapshotParseError';
    this.cause = cause;
  }
}

export async function readSnapshot(path: string): Promise<Snapshot> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (err) {
    if (isNodeError(err) && err.code === 'ENOENT') {
      throw new SnapshotNotFoundError(path);
    }
    throw err;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new SnapshotParseError(path, err);
  }

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'version' in parsed &&
    typeof (parsed as { version: unknown }).version === 'number' &&
    (parsed as { version: number }).version !== SNAPSHOT_VERSION
  ) {
    throw new SnapshotVersionError(path, (parsed as { version: number }).version);
  }

  const result = SnapshotSchema.safeParse(parsed);
  if (!result.success) {
    throw new SnapshotParseError(path, result.error);
  }
  return result.data;
}

export async function writeSnapshot(path: string, snapshot: Snapshot): Promise<void> {
  SnapshotSchema.parse(snapshot);

  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, stableStringify(snapshot), 'utf8');
  await rename(tmp, path);
}

export async function snapshotExists(path: string): Promise<boolean> {
  try {
    await readFile(path, 'utf8');
    return true;
  } catch (err) {
    if (isNodeError(err) && err.code === 'ENOENT') return false;
    throw err;
  }
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

function describe(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
