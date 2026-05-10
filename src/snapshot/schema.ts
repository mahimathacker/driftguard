import { z } from 'zod';

export const SNAPSHOT_VERSION = 1 as const;

const AbiParameterSchema: z.ZodType<AbiParameter> = z.lazy(() =>
  z.object({
    name: z.string(),
    type: z.string(),
    internalType: z.string().optional(),
    indexed: z.boolean().optional(),
    components: z.array(AbiParameterSchema).optional(),
  }).strict(),
);

export type AbiParameter = {
  name: string;
  type: string;
  internalType?: string;
  indexed?: boolean;
  components?: AbiParameter[];
};

const AbiFragmentSchema = z.object({
  type: z.enum(['function', 'event', 'error', 'constructor', 'fallback', 'receive']),
  name: z.string().optional(),
  inputs: z.array(AbiParameterSchema).default([]),
  outputs: z.array(AbiParameterSchema).optional(),
  stateMutability: z.enum(['pure', 'view', 'nonpayable', 'payable']).optional(),
  anonymous: z.boolean().optional(),
}).strict();

const ContractSnapshotSchema = z.object({
  name: z.string(),
  sourcePath: z.string(),
  compilerVersion: z.string().optional(),
  abi: z.array(AbiFragmentSchema),
}).strict();

const SdkExportSchema = z.object({
  kind: z.enum([
    'function',
    'class',
    'interface',
    'typeAlias',
    'enum',
    'variable',
    'namespace',
  ]),
  signature: z.string(),
  sourceFile: z.string().optional(),
  line: z.number().int().nonnegative().optional(),
}).strict();

const SdkSnapshotSchema = z.object({
  packageName: z.string(),
  packageVersion: z.string().optional(),
  entryPath: z.string(),
  exports: z.record(z.string(), SdkExportSchema),
}).strict();

const DocSnippetSchema = z.object({
  id: z.string(),
  line: z.number().int().nonnegative(),
  language: z.string(),
  source: z.string(),
  compiles: z.boolean(),
  error: z.string().optional(),
}).strict();

const DocFileSnapshotSchema = z.object({
  path: z.string(),
  contentHash: z.string(),
  snippets: z.array(DocSnippetSchema),
}).strict();

export const SnapshotSchema = z.object({
  version: z.literal(SNAPSHOT_VERSION),
  createdAt: z.iso.datetime(),
  driftguardVersion: z.string(),
  contracts: z.record(z.string(), ContractSnapshotSchema).optional(),
  sdk: SdkSnapshotSchema.optional(),
  docs: z.array(DocFileSnapshotSchema).optional(),
}).strict();

export type Snapshot = z.infer<typeof SnapshotSchema>;
export type ContractSnapshot = z.infer<typeof ContractSnapshotSchema>;
export type SdkSnapshot = z.infer<typeof SdkSnapshotSchema>;
export type SdkExport = z.infer<typeof SdkExportSchema>;
export type DocFileSnapshot = z.infer<typeof DocFileSnapshotSchema>;
export type DocSnippet = z.infer<typeof DocSnippetSchema>;
export type AbiFragment = z.infer<typeof AbiFragmentSchema>;

export function createEmptySnapshot(driftguardVersion: string): Snapshot {
  return {
    version: SNAPSHOT_VERSION,
    createdAt: new Date().toISOString(),
    driftguardVersion,
  };
}
