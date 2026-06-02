import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeSdk } from './index.js';

const FIXTURE = resolve(__dirname, '../../../tests/fixtures/typescript/sample-sdk');

describe('analyzeSdk', () => {
  it('extracts every kind of export from the fixture SDK', async () => {
    const snap = await analyzeSdk(
      {
        entry: 'package.json',
        publicApi: 'package-exports',
        tsconfig: 'tsconfig.json',
        ignore: [],
      },
      FIXTURE,
    );

    expect(snap.packageName).toBe('@example/sample-sdk');
    expect(snap.packageVersion).toBe('1.0.0');

    const exports = snap.exports;
    expect(exports.transfer?.kind).toBe('function');
    expect(exports.TokenClient?.kind).toBe('class');
    expect(exports.Receipt?.kind).toBe('interface');
    expect(exports.TransferOptions?.kind).toBe('typeAlias');
    expect(exports.Hex?.kind).toBe('typeAlias');
    expect(exports.ErrorCode?.kind).toBe('enum');
    expect(exports.VERSION?.kind).toBe('variable');
  });

  it('serializes a function with its full type signature', async () => {
    const snap = await analyzeSdk(
      { entry: 'src/index.ts', publicApi: 'package-exports', ignore: [] },
      FIXTURE,
    );
    expect(snap.exports.transfer?.signature).toContain('TransferOptions');
    expect(snap.exports.transfer?.signature).toContain('Promise<Receipt>');
  });

  it('populates packageName by walking up from a .ts entry to the nearest package.json', async () => {
    const snap = await analyzeSdk(
      { entry: 'src/index.ts', publicApi: 'package-exports', ignore: [] },
      FIXTURE,
    );
    expect(snap.packageName).toBe('@example/sample-sdk');
    expect(snap.packageVersion).toBe('1.0.0');
  });

  it('strips private members from class signatures', async () => {
    const snap = await analyzeSdk(
      { entry: 'src/index.ts', publicApi: 'package-exports', ignore: [] },
      FIXTURE,
    );
    const sig = snap.exports.TokenClient?.signature ?? '';
    expect(sig).toContain('balanceOf');
    expect(sig).toContain('transfer');
    // Private field with no constructor param: fully stripped.
    expect(sig).not.toContain('cache');
    // `private rpcUrl` is a parameter property: appears in the constructor signature
    // (callers must pass it positionally) but NOT as a standalone property line.
    expect(sig).not.toMatch(/^\s*rpcUrl:/m);
  });

  it('sorts class methods alphabetically for stable diffs', async () => {
    const snap = await analyzeSdk(
      { entry: 'src/index.ts', publicApi: 'package-exports', ignore: [] },
      FIXTURE,
    );
    const sig = snap.exports.TokenClient?.signature ?? '';
    expect(sig.indexOf('balanceOf')).toBeLessThan(sig.indexOf('transfer'));
  });

  it('respects the ignore list', async () => {
    const snap = await analyzeSdk(
      {
        entry: 'src/index.ts',
        publicApi: 'package-exports',
        ignore: ['VERSION', 'ErrorCode'],
      },
      FIXTURE,
    );
    expect(snap.exports.VERSION).toBeUndefined();
    expect(snap.exports.ErrorCode).toBeUndefined();
    expect(snap.exports.transfer).toBeDefined();
  });
});
