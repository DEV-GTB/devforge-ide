// Build Analyzer - Analyzes build output and extracts diagnostics
import { BuildError } from '../../types/build';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface BuildResult {
  success: boolean;
  exitCode: number;
  errors: BuildError[];
  warnings: BuildError[];
  durationMs: number;
  rawOutput: string;
}

export interface Diagnostic {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
  source: 'build' | 'test' | 'runtime' | 'browser';
}

export class BuildAnalyzer {
  constructor(private projectPath: string) {}

  async analyzeBuild(command: string = 'npm run build'): Promise<BuildResult> {
    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectPath,
        timeout: 120000, // 2 minute timeout
      });

      const output = stdout + stderr;
      const diagnostics = this.parseOutput(output);

      return {
        success: true,
        exitCode: 0,
        errors: diagnostics.filter(d => d.severity === 'error'),
        warnings: diagnostics.filter(d => d.severity === 'warning'),
        durationMs: Date.now() - startTime,
        rawOutput: output,
      };
    } catch (error: any) {
      const output = error.stdout + error.stderr || error.message;
      const diagnostics = this.parseOutput(output);

      return {
        success: false,
        exitCode: error.code || 1,
        errors: diagnostics.filter(d => d.severity === 'error'),
        warnings: diagnostics.filter(d => d.severity === 'warning'),
        durationMs: Date.now() - startTime,
        rawOutput: output,
      };
    }
  }

  async analyzeTypeCheck(command: string = 'npx tsc --noEmit'): Promise<BuildResult> {
    return this.analyzeBuild(command);
  }

  async analyzeLint(command: string = 'npm run lint'): Promise<BuildResult> {
    return this.analyzeBuild(command);
  }

  async analyzeTests(command: string = 'npm test'): Promise<BuildResult> {
    return this.analyzeBuild(command);
  }

  private parseOutput(output: string): BuildError[] {
    const diagnostics: BuildError[] = [];
    const lines = output.split('\n');

    // TypeScript error format: file.ts(line,column): error TScode: message
    const tsErrorRegex = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/;

    // ESLint format: file.ts:line:column: message
    const eslintRegex = /^(.+?):(\d+):(\d+):\s+(error|warning)\s+(.+)$/;

    // Generic format: file:line: message
    const genericRegex = /^(.+?):(\d+):\s+(.+)$/;

    for (const line of lines) {
      let match = line.match(tsErrorRegex);
      if (match) {
        diagnostics.push({
          file: match[1],
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
          severity: match[4] as 'error' | 'warning',
          code: match[5],
          message: match[6],
        });
        continue;
      }

      match = line.match(eslintRegex);
      if (match) {
        diagnostics.push({
          file: match[1],
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
          severity: match[4] as 'error' | 'warning',
          message: match[5],
        });
        continue;
      }

      match = line.match(genericRegex);
      if (match) {
        diagnostics.push({
          file: match[1],
          line: parseInt(match[2], 10),
          column: 0,
          severity: 'error',
          message: match[3],
        });
      }
    }

    return diagnostics;
  }

  groupErrorsByCategory(errors: BuildError[]): Map<string, BuildError[]> {
    const groups = new Map<string, BuildError[]>();

    for (const error of errors) {
      const category = this.inferCategory(error);
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(error);
    }

    return groups;
  }

  deduplicateErrors(errors: BuildError[]): BuildError[] {
    const seen = new Set<string>();
    const unique: BuildError[] = [];

    for (const error of errors) {
      const key = `${error.file}:${error.line}:${error.column}:${error.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(error);
      }
    }

    return unique;
  }

  estimateRisk(errors: BuildError[]): 'low' | 'medium' | 'high' {
    if (errors.length === 0) return 'low';

    const errorCounts = {
      syntax: 0,
      type: 0,
      runtime: 0,
      dependency: 0,
      other: 0,
    };

    for (const error of errors) {
      const category = this.inferCategory(error);
      if (category in errorCounts) {
        errorCounts[category as keyof typeof errorCounts]++;
      } else {
        errorCounts.other++;
      }
    }

    // High risk: many syntax or runtime errors
    if (errorCounts.syntax > 5 || errorCounts.runtime > 3) {
      return 'high';
    }

    // Medium risk: moderate errors
    if (errors.length > 10) {
      return 'medium';
    }

    // Low risk: few errors
    return 'low';
  }

  private inferCategory(error: BuildError): string {
    const message = error.message.toLowerCase();

    if (error.code?.startsWith('TS')) {
      if (message.includes('property') && message.includes('does not exist')) {
        return 'type';
      }
      if (message.includes('cannot find module') || message.includes('module not found')) {
        return 'dependency';
      }
      return 'type';
    }

    if (message.includes('syntax error') || message.includes('unexpected token')) {
      return 'syntax';
    }

    if (message.includes('is not defined') || message.includes('reference error')) {
      return 'runtime';
    }

    if (message.includes('cannot find') || message.includes('module not found')) {
      return 'dependency';
    }

    return 'other';
  }

  generateErrorFingerprint(error: BuildError): string {
    return `${error.file}:${error.line}:${error.code || error.message}`;
  }

  async checkDependencies(): Promise<{
    installed: string[];
    missing: string[];
    outdated: string[];
  }> {
    try {
      const { stdout } = await execAsync('npm ls --json', {
        cwd: this.projectPath,
        timeout: 30000,
      });

      const result = JSON.parse(stdout);
      const dependencies = result.dependencies || {};

      return {
        installed: Object.keys(dependencies),
        missing: result.problems?.filter((p: string) => p.includes('missing')) || [],
        outdated: [],
      };
    } catch {
      return {
        installed: [],
        missing: [],
        outdated: [],
      };
    }
  }
}
