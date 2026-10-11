// TestFrameworkAdapter - pluggable per-framework logic so the orchestrator can
// detect, prepare and parse results without caring which runner is used.
import {
  CommandResult,
  TestFramework,
  TestInvocation,
  TestRunReport,
} from '../types/testing.types';
import { TestPolicy } from '../policy/TestPolicy';
import type { DetectResult } from '../engine/TestRuntime';

export interface FrameworkContext {
  projectPath: string;
  testFiles: string[];
  coverage: boolean;
  policy: TestPolicy;
}

export interface TestFrameworkAdapter {
  readonly framework: TestFramework;

  /**
   * Detect the framework from runtime metadata (package.json, config files,
   * installed runner). Return confidence < 1 when uncertain.
   */
  detect(runtime: {
    packageJson?: string;
    hasConfigFile: (names: string[]) => Promise<boolean>;
    runnerInstalled: (runner: string) => Promise<{ installed: boolean; path?: string }>;
  }): Promise<DetectResult>;

  /** Build an approved invocation for the current project. */
  buildInvocation(context: FrameworkContext): TestInvocation;

  /** Normalize the raw process output into the shared report shape. */
  parseOutput(commandResult: CommandResult, fileFallback?: string): TestRunReport;
}