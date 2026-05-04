import { z } from 'zod';

const Severity = z.enum(['error', 'warning', 'off']);
export type Severity = z.infer<typeof Severity>;

const ContractsConfig = z.object({
  paths: z.array(z.string()).min(1),
  toolchain: z.enum(['foundry', 'hardhat', 'solc', 'auto']).default('auto'),
  ignore: z.array(z.string()).default([]),
}).strict();

const SdkConfig = z.object({
  entry: z.string(),
  publicApi: z.enum(['package-exports', 'all-exports']).default('package-exports'),
  tsconfig: z.string().optional(),
  ignore: z.array(z.string()).default([]),
}).strict();

const DocsConfig = z.object({
  paths: z.array(z.string()).min(1),
  snippetLanguages: z
    .array(z.enum(['ts', 'tsx', 'js', 'jsx', 'solidity']))
    .default(['ts', 'tsx', 'solidity']),
  ignoreTag: z.string().default('driftguard-ignore'),
  ignore: z.array(z.string()).default([]),
}).strict();

const DemoRepo = z.object({
  name: z.string(),
  path: z.string(),
  command: z.string().optional(),
  install: z.string().optional(),
  packageManager: z.enum(['npm', 'pnpm', 'yarn', 'bun', 'auto']).default('auto'),
  timeoutMs: z.number().int().positive().default(180_000),
  env: z.record(z.string(), z.string()).default({}),
}).strict();

const DemosConfig = z.object({
  enabled: z.boolean().default(false),
  docker: z.boolean().default(false),
  repos: z.array(DemoRepo).default([]),
}).strict();

const SeverityRules = z.object({
  abiBreaking: Severity.default('error'),
  abiAdded: Severity.default('warning'),
  abiMutabilityRelaxed: Severity.default('warning'),
  abiMutabilityTightened: Severity.default('error'),
  solidityAstBreaking: Severity.default('error'),
  sdkBreaking: Severity.default('error'),
  sdkAdded: Severity.default('off'),
  sdkSignatureChanged: Severity.default('error'),
  docSnippetFails: Severity.default('error'),
  docSnippetReferencesRemoved: Severity.default('error'),
  demoFails: Severity.default('error'),
}).strict();

const SnapshotConfig = z.object({
  path: z.string().default('.driftguard/snapshot.json'),
  mode: z.enum(['snapshot', 'base-branch']).default('snapshot'),
  baseBranch: z.string().default('main'),
}).strict();

const ReportConfig = z.object({
  formats: z
    .array(z.enum(['console', 'markdown', 'sarif', 'json']))
    .default(['console', 'markdown', 'sarif']),
  sarifPath: z.string().default('.driftguard/report.sarif'),
  markdownPath: z.string().default('.driftguard/report.md'),
  jsonPath: z.string().default('.driftguard/report.json'),
}).strict();

export const DriftGuardConfigSchema = z.object({
  contracts: ContractsConfig.optional(),
  sdk: SdkConfig.optional(),
  docs: DocsConfig.optional(),
  demos: DemosConfig.default({ enabled: false, docker: false, repos: [] }),
  severity: SeverityRules.default({}),
  snapshot: SnapshotConfig.default({}),
  report: ReportConfig.default({}),
}).strict().refine(
  (c) => c.contracts || c.sdk || c.docs,
  { message: 'At least one of `contracts`, `sdk`, or `docs` must be configured.' },
);

export type DriftGuardConfig = z.infer<typeof DriftGuardConfigSchema>;
export type DriftGuardConfigInput = z.input<typeof DriftGuardConfigSchema>;

export function defineConfig(config: DriftGuardConfigInput): DriftGuardConfigInput {
  return config;
}
