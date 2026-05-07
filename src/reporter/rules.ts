import type { DriftGuardConfig, Severity } from '../config/schema.js';

type SeverityRules = DriftGuardConfig['severity'];

export type RuleId =
  | 'abi-breaking'
  | 'abi-added'
  | 'abi-mutability-tightened'
  | 'abi-mutability-relaxed'
  | 'sdk-breaking'
  | 'sdk-added'
  | 'sdk-signature-changed'
  | 'doc-snippet-fails';

export const RULES: Record<RuleId, { description: string; configKey: keyof SeverityRules }> = {
  'abi-breaking': {
    description: 'Breaking change to contract ABI (function/event/error removed or output changed)',
    configKey: 'abiBreaking',
  },
  'abi-added': {
    description: 'New function/event/error added to contract ABI',
    configKey: 'abiAdded',
  },
  'abi-mutability-tightened': {
    description: 'Function mutability tightened in a way that may break existing callers',
    configKey: 'abiMutabilityTightened',
  },
  'abi-mutability-relaxed': {
    description: 'Function mutability relaxed (callers unaffected, contract guarantees changed)',
    configKey: 'abiMutabilityRelaxed',
  },
  'sdk-breaking': {
    description: 'SDK export removed or its kind changed',
    configKey: 'sdkBreaking',
  },
  'sdk-added': {
    description: 'New SDK export added',
    configKey: 'sdkAdded',
  },
  'sdk-signature-changed': {
    description: 'SDK export signature changed (callers may need to update)',
    configKey: 'sdkSignatureChanged',
  },
  'doc-snippet-fails': {
    description: 'Documentation code snippet no longer compiles against the current SDK',
    configKey: 'docSnippetFails',
  },
};

export function severityFor(rule: RuleId, config: SeverityRules): Severity {
  return config[RULES[rule].configKey];
}
