import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

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
  define: {
    __TOOL_VERSION__: JSON.stringify(pkg.version),
  },
});
