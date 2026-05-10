import { defineConfig } from './src/config/schema.js';

// DriftGuard's own dogfood config.
// We track our own SDK exports — every public API surface change must update
// the snapshot, which serves as the explicit approval.
export default defineConfig({
  sdk: {
    entry: 'src/index.ts',
    publicApi: 'package-exports',
    tsconfig: 'tsconfig.json',
  },
  severity: {
    sdkAdded: 'off',
    sdkBreaking: 'error',
    sdkSignatureChanged: 'error',
  },
});
