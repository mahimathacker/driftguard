# DriftGuard configuration reference

DriftGuard reads `driftguard.config.ts` (or `.js`/`.json`) from the repo root. Use `defineConfig` from `driftguard/config` for full type-checking — it's a no-op at runtime but gives IDE autocomplete for every field.

```ts
import { defineConfig } from 'driftguard/config';

export default defineConfig({
  // ... fields below ...
});
```

At least one of `contracts`, `sdk`, or `docs` must be configured. Everything else has sensible defaults.

## `contracts` — Solidity surface

```ts
contracts: {
  paths: ['src/**/*.sol', 'contracts/**/*.sol'],
  toolchain: 'auto',          // 'foundry' | 'hardhat' | 'auto' (default)
  ignore: ['Test*', 'Mock*'], // contract-name globs to skip
}
```

| Field | Default | Description |
|---|---|---|
| `paths` | required | Globs of source `.sol` files to track. Compiled artifacts are auto-discovered from the toolchain's standard output dir (`out/` for Foundry, `artifacts/contracts/` for Hardhat). |
| `toolchain` | `'auto'` | `'foundry'` reads `out/**/*.json`. `'hardhat'` reads `artifacts/contracts/**/*.json`. `'auto'` detects by `foundry.toml` / `hardhat.config.*`. |
| `ignore` | `[]` | Picomatch patterns matched against contract names. Use to skip test fixtures and mocks. |

If no toolchain can be detected (no config file, no compiled artifacts), the contracts layer silently produces an empty result.

## `sdk` — TypeScript public API

```ts
sdk: {
  entry: 'packages/sdk/package.json',  // or 'packages/sdk/src/index.ts'
  publicApi: 'package-exports',
  tsconfig: 'packages/sdk/tsconfig.json',
  ignore: ['**internal**'],
}
```

| Field | Default | Description |
|---|---|---|
| `entry` | required | Either a `package.json` (resolves via `types`/`typings`/`exports['.'].types`/`main`) or a TS file directly. |
| `publicApi` | `'package-exports'` | `'package-exports'` walks only re-exports from the entry. `'all-exports'` walks every `.ts` file (planned, not yet wired). |
| `tsconfig` | optional | Path to a tsconfig. Improves type resolution for SDKs that use path aliases or strict mode. |
| `ignore` | `[]` | Picomatch patterns matched against export names. |

The analyzer uses `ts-morph` to walk exports and produces a canonical signature per export. Class/interface members are sorted alphabetically; private/protected members are stripped.

## `docs` — Markdown / MDX snippets

```ts
docs: {
  paths: ['docs/**/*.{md,mdx}', 'README.md'],
  snippetLanguages: ['ts', 'tsx', 'solidity'],
  ignoreTag: 'driftguard-ignore',
  ignore: [],
}
```

| Field | Default | Description |
|---|---|---|
| `paths` | required | Globs of doc files to scan for fenced code blocks. |
| `snippetLanguages` | `['ts','tsx','solidity']` | Languages to extract. Other code blocks are ignored. |
| `ignoreTag` | `'driftguard-ignore'` | (Reserved for future per-snippet ignore comments.) |
| `ignore` | `[]` | File-path globs to skip entirely. |

TypeScript snippets are compiled against the SDK using a path-mapped `ts-morph` Project — so `import { foo } from '<your-package>'` resolves to your SDK's actual entry. Failed compilations produce `doc-snippet-fails` findings with the original markdown line number.

Solidity snippets are captured into the snapshot but **not yet validated** in v0.1 (deferred to v0.2).

## `demos` — Optional runtime checks

```ts
demos: {
  enabled: false,            // opt-in
  docker: false,             // (planned, not yet wired)
  repos: [
    {
      name: 'starter-app',
      path: 'examples/starter',  // local path relative to repo root
      install: 'pnpm install',   // optional, default: '<pm> install'
      command: 'pnpm test',      // optional, default: '<pm> test'
      packageManager: 'auto',    // 'auto' | 'npm' | 'pnpm' | 'yarn' | 'bun'
      timeoutMs: 180000,         // 3 min default
      env: { NODE_ENV: 'test' },
    },
  ],
}
```

When `demos.enabled: true`, each `driftguard check` runs install + test in every configured demo. Failures emit `demo-fails` findings. Defaults are intentionally `enabled: false` to keep the common case fast.

## `severity` — Per-rule configuration

```ts
severity: {
  // Solidity
  abiBreaking: 'error',           // function/event/error removed, output type changed
  abiAdded: 'warning',            // new ABI member
  abiMutabilityTightened: 'error', // view→nonpayable, payable→nonpayable, etc.
  abiMutabilityRelaxed: 'warning', // nonpayable→view, etc.

  // TypeScript SDK
  sdkBreaking: 'error',           // export removed, kind changed
  sdkAdded: 'off',                // new export — usually safe
  sdkSignatureChanged: 'error',   // any param/return change

  // Docs
  docSnippetFails: 'error',       // newly broken TS snippet
  docSnippetReferencesRemoved: 'error', // (reserved)

  // Demos
  demoFails: 'error',
}
```

Each rule is `'error'` (fail CI), `'warning'` (annotate but don't fail), or `'off'` (suppressed entirely). Defaults match the column above.

## `snapshot` — Where the baseline lives

```ts
snapshot: {
  path: '.driftguard/snapshot.json',  // relative to repo root
  mode: 'snapshot',                    // 'snapshot' | 'base-branch'
  baseBranch: 'main',                  // only when mode === 'base-branch'
}
```

- `'snapshot'` (default): the file at `path` is your committed baseline. Regenerate with `driftguard snapshot` to approve drift.
- `'base-branch'` (planned): on a PR, build the baseline in-memory from `baseBranch`. No committed file. Stateless but slower per run.

## `report` — Output formats and paths

```ts
report: {
  formats: ['console', 'markdown', 'sarif'],
  markdownPath: '.driftguard/report.md',
  sarifPath: '.driftguard/report.sarif',
  jsonPath: '.driftguard/report.json',
}
```

`console` always prints to stdout. The other formats are written to disk if listed in `formats`. Add `'json'` for programmatic consumption by other tools.

## Programmatic API

The same logic is exposed as functions for users who want to embed DriftGuard in custom workflows:

```ts
import {
  analyzeContracts,
  analyzeSdk,
  analyzeDocs,
  buildReport,
  diffContracts,
  diffSdk,
  diffDocs,
  readSnapshot,
  renderConsole,
  renderMarkdown,
  renderSarif,
  writeSnapshot,
} from 'driftguard';
```

See [src/index.ts](../src/index.ts) for the full export list and [src/reporter/rules.ts](../src/reporter/rules.ts) for the rule registry.
