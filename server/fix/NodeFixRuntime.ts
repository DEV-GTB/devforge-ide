// NodeFixRuntime - server-side execution backend for the fix engine.
// This is the only place that touches the real filesystem and shell, which
// keeps the orchestrator itself portable and sandboxable.

import { promises as fs } from 'fs';
import { resolve, sep } from 'path';
import { BuildAnalyzer, BuildResult } from '../../src/features/auto-fix/BuildAnalyzer';
import {
  FixRuntime,
  DiagnosticCollectionOptions,
} from '../../src/features/auto-fix/engine/FixRuntime';
import {
  Diagnostic,
  DiagnosticSource,
  createDiagnostic,
} from '../../src/features/auto-fix/types/fix.types';

export interface NodeFixRuntimeOptions {
  buildCommand?: string;
  typeCheckCommand?: string;
  lintCommand?: string;
  testCommand?: string;
}

export class NodeFixRuntime implements FixRuntime {
  private readonly projectRoot: string;
  private readonly analyzer: BuildAnalyzer;

  constructor(
    private readonly projectPath: string,
    private readonly options: NodeFixRuntimeOptions = {},
  ) {
    this.projectRoot = resolve(projectPath);
    this.analyzer = new BuildAnalyzer(projectPath);
  }

  private resolvePath(file: string): string {
    const full = resolve(this.projectRoot, file);
    if (full !== this.projectRoot && !full.startsWith(this.projectRoot + sep)) {
      throw new Error(`Path escapes workspace: ${file}`);
    }
    return full;
  }

  async collectDiagnostics(options: DiagnosticCollectionOptions = {}): Promise<Diagnostic[]> {
    const tasks: Array<{ source: DiagnosticSource; run: () => Promise<BuildResult> }> = [];

    if (options.includeBuild ?? true) {
      tasks.push({
        source: 'build',
        run: () => this.analyzer.analyzeBuild(this.options.buildCommand),
      });
    }
    if (options.includeTypeCheck) {
      tasks.push({
        source: 'typecheck',
        run: () => this.analyzer.analyzeTypeCheck(this.options.typeCheckCommand),
      });
    }
    if (options.includeLint) {
      tasks.push({
        source: 'lint',
        run: () => this.analyzer.analyzeLint(this.options.lintCommand),
      });
    }
    if (options.includeTests) {
      tasks.push({
        source: 'test',
        run: () => this.analyzer.analyzeTests(this.options.testCommand),
      });
    }

    const diagnostics: Diagnostic[] = [];
    for (const task of tasks) {
      const result = await task.run();
      for (const error of result.errors) {
        diagnostics.push(
          createDiagnostic({
            severity: error.severity === 'info' ? 'info' : error.severity,
            category: this.categoryFor(task.source, error.code),
            message: error.message,
            file: error.file,
            line: error.line,
            column: error.column,
            code: error.code,
            source: task.source,
          }),
        );
      }
    }

    return this.deduplicate(diagnostics);
  }

  async readFile(file: string): Promise<string> {
    return fs.readFile(this.resolvePath(file), 'utf-8');
  }

  async writeFile(file: string, content: string): Promise<void> {
    await fs.writeFile(this.resolvePath(file), content, 'utf-8');
  }

  async fileExists(file: string): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(file));
      return true;
    } catch {
      return false;
    }
  }

  private categoryFor(source: DiagnosticSource, code?: string): string {
    if (code?.startsWith('TS')) return 'type';
    switch (source) {
      case 'lint':
        return 'lint';
      case 'test':
        return 'test';
      case 'runtime':
      case 'browser':
        return 'runtime';
      case 'typecheck':
        return 'type';
      default:
        return 'build';
    }
  }

  private deduplicate(diagnostics: Diagnostic[]): Diagnostic[] {
    const seen = new Set<string>();
    const unique: Diagnostic[] = [];
    for (const diagnostic of diagnostics) {
      const key = `${diagnostic.fingerprint}|${diagnostic.source}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(diagnostic);
    }
    return unique;
  }
}
