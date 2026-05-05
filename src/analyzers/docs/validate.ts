import { resolve } from 'node:path';
import { Project, ts, type Diagnostic } from 'ts-morph';
import type { RawSnippet } from './extract.js';

export type ValidationResult = { compiles: boolean; error?: string };

export type SdkContext = {
  packageName: string;
  entryPath: string;
};

export class TsSnippetValidator {
  private project: Project;
  private counter = 0;

  constructor(sdk?: SdkContext, tsconfigPath?: string) {
    this.project = new Project({
      tsConfigFilePath: tsconfigPath,
      skipAddingFilesFromTsConfig: tsconfigPath ? false : true,
      compilerOptions: tsconfigPath
        ? undefined
        : {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
            strict: true,
            skipLibCheck: true,
            noEmit: true,
            allowImportingTsExtensions: false,
            baseUrl: '.',
            paths: sdk ? { [sdk.packageName]: [sdk.entryPath] } : {},
          },
    });

    if (sdk) this.project.addSourceFileAtPathIfExists(sdk.entryPath);
  }

  validate(snippet: RawSnippet): ValidationResult {
    const virtualPath = resolve(`/__driftguard__/snippet-${this.counter++}.${ext(snippet.language)}`);
    const file = this.project.createSourceFile(virtualPath, snippet.source, { overwrite: true });

    try {
      const diagnostics = file
        .getPreEmitDiagnostics()
        .filter((d) => d.getSourceFile()?.getFilePath() === file.getFilePath())
        .filter((d) => d.getCategory() === ts.DiagnosticCategory.Error);

      if (diagnostics.length === 0) return { compiles: true };

      return {
        compiles: false,
        error: diagnostics.slice(0, 3).map(formatDiagnostic).join('; '),
      };
    } finally {
      this.project.removeSourceFile(file);
    }
  }
}

function ext(language: string): string {
  if (language === 'tsx') return 'tsx';
  if (language === 'jsx') return 'jsx';
  return 'ts';
}

function formatDiagnostic(d: Diagnostic): string {
  const text = d.getMessageText();
  return typeof text === 'string' ? text : text.getMessageText();
}
