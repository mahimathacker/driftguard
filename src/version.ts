// Injected by tsup's `define` at build time from package.json#version.
// When running under vitest (raw TS, no bundler), it's undefined — fall back to a dev sentinel.
declare const __TOOL_VERSION__: string | undefined;

export const VERSION: string =
  typeof __TOOL_VERSION__ !== 'undefined' ? __TOOL_VERSION__ : '0.0.0-dev';
