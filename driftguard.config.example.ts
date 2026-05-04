import { defineConfig } from './src/config/schema';

export default defineConfig({
  contracts: {
    paths: ['contracts/**/*.sol', 'out/**/*.json'],
    toolchain: 'auto',
    ignore: ['Test*', 'Mock*'],
  },

  sdk: {
    entry: 'packages/sdk/package.json',
    publicApi: 'package-exports',
    tsconfig: 'packages/sdk/tsconfig.json',
  },

  docs: {
    paths: ['docs/**/*.{md,mdx}', 'README.md'],
    snippetLanguages: ['ts', 'tsx', 'solidity'],
  },

  demos: {
    enabled: false,
    repos: [
      {
        name: 'starter-app',
        path: 'examples/starter',
        command: 'pnpm test',
      },
    ],
  },

  severity: {
    abiBreaking: 'error',
    sdkBreaking: 'error',
    docSnippetFails: 'error',
    sdkAdded: 'off',
  },

  snapshot: {
    mode: 'snapshot',
    path: '.driftguard/snapshot.json',
  },
});
