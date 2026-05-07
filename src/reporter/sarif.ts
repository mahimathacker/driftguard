import { stableStringify } from '../utils/stable-json.js';
import type { Finding } from './findings.js';
import type { Report } from './report.js';
import { RULES, type RuleId } from './rules.js';

const SCHEMA = 'https://json.schemastore.org/sarif-2.1.0.json';
const VERSION = '2.1.0';
const TOOL_URI = 'https://github.com/driftguard/driftguard';

type SarifLevel = 'error' | 'warning' | 'note' | 'none';

type SarifResult = {
  ruleId: RuleId;
  level: SarifLevel;
  message: { text: string };
  locations?: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region?: { startLine: number };
    };
  }>;
};

type SarifRule = {
  id: RuleId;
  shortDescription: { text: string };
  defaultConfiguration: { level: SarifLevel };
};

export function renderSarif(report: Report, toolVersion: string): string {
  const usedRuleIds = new Set<RuleId>(report.findings.map((f) => f.ruleId));
  const rules: SarifRule[] = [];
  for (const id of usedRuleIds) {
    rules.push({
      id,
      shortDescription: { text: RULES[id].description },
      defaultConfiguration: { level: 'warning' },
    });
  }

  const sarif = {
    $schema: SCHEMA,
    version: VERSION,
    runs: [
      {
        tool: {
          driver: {
            name: 'DriftGuard',
            version: toolVersion,
            informationUri: TOOL_URI,
            rules,
          },
        },
        results: report.findings.map(toSarifResult),
      },
    ],
  };

  return stableStringify(sarif);
}

function toSarifResult(f: Finding): SarifResult {
  const result: SarifResult = {
    ruleId: f.ruleId,
    level: f.severity,
    message: { text: f.message },
  };
  if (f.file) {
    result.locations = [
      {
        physicalLocation: {
          artifactLocation: { uri: f.file },
          region: { startLine: f.line ?? 1 },
        },
      },
    ];
  }
  return result;
}
