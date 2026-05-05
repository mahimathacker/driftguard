import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'cli/index': 'src/cli/index.ts',
  },
  outDir: 'dist',
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  dts: false,
  sourcemap: true,
  clean: true,
  shims: false,
  splitting: false,
  treeshake: true,
  minify: false,
});
