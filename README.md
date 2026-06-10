# DriftGuard

**Cross-layer drift detection for code, SDKs, docs, and demos.** Catches when an SDK change silently breaks the docs, examples, or demo apps that depend on it, before the PR merges.

[![npm](https://img.shields.io/npm/v/@driftguardjs/cli?color=orange)](https://www.npmjs.com/package/@driftguardjs/cli)
[![downloads](https://img.shields.io/npm/dm/@driftguardjs/cli?color=brightgreen)](https://www.npmjs.com/package/@driftguardjs/cli)
[![stars](https://img.shields.io/github/stars/mahimathacker/driftguard?style=flat&color=yellow)](https://github.com/mahimathacker/driftguard/stargazers)
[![license](https://img.shields.io/npm/l/@driftguardjs/cli?color=yellow)](LICENSE)
[![Node](https://img.shields.io/node/v/@driftguardjs/cli?color=43853d)](https://nodejs.org)

[npm package](https://www.npmjs.com/package/@driftguardjs/cli) • [GitHub repo](https://github.com/mahimathacker/driftguard) • [Issues](https://github.com/mahimathacker/driftguard/issues) • [Configuration docs](docs/configuration.md)

```
contracts ─┐
SDK       ─┼─▶ DriftGuard ─▶ ✓ no drift     PR passes
docs      ─┤                ✗ drift found   PR fails with file:line annotations
demos     ─┘
```

Most existing tools either generate docs (Mintlify, GitBook) or flag generic prose drift (Swimm, DocDrift). They don't keep contracts, SDKs, docs, and demos in sync **with each other**. DriftGuard does, using deterministic checks (ABI diffs, AST diffs, real type-checking against the new SDK), not generation.

## Features

| Layer | What it catches |
|---|---|
| **Solidity contracts** | Function/event/error added/removed, mutability tightened (`view → nonpayable`), parameter or return type changes |
| **TypeScript SDK** | Exports added/removed, kind changes (function → class), signature changes (any param/return/generic) |
| **Documentation** | TypeScript code blocks in `.md`/`.mdx` re-validated against the current SDK; flags newly broken snippets |
| **Demo repositories** | Optional: runs install + test in real demo projects to catch runtime drift the static checks miss |

Findings emit as console output, a Markdown PR comment, and SARIF 2.1.0 (for the GitHub code-scanning tab).

## Install

```bash
npm install --save-dev @driftguardjs/cli
```

Requires Node 22+.

## Quick start

```bash
# 1. write a starter config (auto-detects contracts/docs in your project)
npx driftguard init

# 2. capture a baseline snapshot of the current state
npx driftguard snapshot

# 3. commit the snapshot. It's the approval mechanism.
git add .driftguard/snapshot.json driftguard.config.ts
git commit -m "add driftguard"

# 4. on every PR, run check (locally or in CI)
npx driftguard check
```

Re-run `driftguard snapshot` whenever you intentionally change the public surface. That regenerates the baseline and the next `check` passes.

## Configuration

A minimal `driftguard.config.ts`:

```ts
import { defineConfig } from '@driftguardjs/cli';

export default defineConfig({
  sdk: {
    entry: 'src/index.ts',         // your SDK's main TypeScript file
    // for monorepos: entry: 'packages/sdk/package.json'
    tsconfig: 'tsconfig.json',     // optional, improves type resolution
  },
  docs: {
    paths: ['docs/**/*.{md,mdx}', 'README.md'],
    snippetLanguages: ['ts', 'tsx', 'solidity'],
  },
  contracts: {
    paths: ['contracts/**/*.sol'],
    toolchain: 'auto',
  },
  severity: {
    sdkAdded: 'off',
    abiBreaking: 'error',
    docSnippetFails: 'error',
  },
});
```

All three layers (`contracts`, `sdk`, `docs`) are independently optional. Each rule's severity is configurable: `error` (fail CI), `warning` (annotate but pass), or `off` (suppressed).

See the full [configuration reference](docs/configuration.md) for every field.

## GitHub Action

```yaml
- uses: mahimathacker/driftguard@v0
  with:
    mode: check
```

The action does three things automatically:

1. **PR annotations**: drift findings appear inline at `file:line` in the PR diff.
2. **Step summary**: a Markdown report on the workflow run page.
3. **Outputs**: `error-count`, `warning-count`, `sarif-path` for downstream steps (Slack, codeql/upload-sarif, etc.).

Full example workflow: [examples/workflows/pr-check.yml](examples/workflows/pr-check.yml).

## CLI

| Command | Purpose |
|---|---|
| `driftguard init` | Write a starter `driftguard.config.ts` |
| `driftguard snapshot` | Capture a baseline of contracts + SDK exports + doc snippets |
| `driftguard check` | Diff the current state against the baseline; exit 1 on errors |

Pass `--config <path>` to point at a non-default config file.

## How it works

1. **Snapshot.** `driftguard snapshot` reads your contracts (Foundry/Hardhat artifacts), your SDK (via `ts-morph` walking `package.json#exports`), and your docs (extracts fenced code blocks via `remark-mdx`). Each layer is normalized into a canonical form and written to `.driftguard/snapshot.json`. The snapshot is committed to your repo. It's the *approval* of the current public surface.
2. **Check.** `driftguard check` recomputes the same shapes against the current code, then runs three layer-specific differs. Doc snippets are re-type-checked against the *current* SDK using a path-mapped `ts-morph` Project, so a SDK signature change immediately produces a doc snippet failure with the original markdown line number.
3. **Report.** Findings flow through one rule registry into all three output formats (console, Markdown, SARIF), so what shows up in the terminal matches what shows up in the PR comment matches what shows up in code-scanning.

The detection path is fully deterministic: ABI diffs, TS Compiler API diagnostics, AST comparisons. No AI, no heuristics, no false positives from prose changes.

## Tech stack

| Layer | Library |
|---|---|
| **Runtime** | Node 22+, TypeScript |
| **CLI framework** | [Clipanion](https://github.com/arcanis/clipanion) |
| **Solidity** | [@solidity-parser/parser](https://github.com/solidity-parser/parser), [ethers v6](https://github.com/ethers-io/ethers.js) |
| **TypeScript SDK analysis** | [ts-morph](https://github.com/dsherret/ts-morph) + TypeScript Compiler API |
| **Markdown / MDX** | [unified](https://github.com/unifiedjs/unified) + [remark](https://github.com/remarkjs/remark) + [remark-mdx](https://github.com/mdx-js/mdx) + [unist-util-visit](https://github.com/syntax-tree/unist-util-visit) |
| **Config loader** | [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) + [jiti](https://github.com/unjs/jiti) |
| **Config validation** | [Zod 4](https://github.com/colinhacks/zod) |
| **Demo runner** | [execa](https://github.com/sindresorhus/execa) + [package-manager-detector](https://github.com/antfu-collective/package-manager-detector) |
| **Reports** | SARIF 2.1.0, Markdown, [picocolors](https://github.com/alexeyraspopov/picocolors) |
| **Tests** | [vitest](https://github.com/vitest-dev/vitest) (88 tests) |
| **Bundler** | [tsup](https://github.com/egoist/tsup) |

## What's not in v0.1

| Parked | When |
|---|---|
| Solidity AST diff (struct shapes, NatSpec, internal funcs) | v0.2 |
| Solidity snippet validation via `solc-js` | v0.2 |
| AI-suggested fixes for broken snippets | v0.6 |
| MCP server (queryable drift for coding agents) | v0.7 |

## Contributing

PRs and issues are welcome.

- **Bug reports**: [open an issue](https://github.com/mahimathacker/driftguard/issues/new). A minimal repro repo helps a lot.
- **Feature ideas**: open an issue first so we can discuss scope before code.
- **Pull requests**: fork, branch, run `npm test` (88 tests should pass), then open a PR against `master`. CI will run DriftGuard against itself on your PR.
- **Setup**:
  ```bash
  git clone https://github.com/mahimathacker/driftguard.git
  cd driftguard
  npm install
  npm test
  npm run build:cli
  ```

Built as part of [DevRel Uni Cohort 7](https://www.devrel.university).

## License

[MIT](LICENSE) © 2026 Mahima Thacker
