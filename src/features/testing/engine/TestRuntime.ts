// TestRuntime - the execution boundary between the portable test orchestrator
// and the real filesystem/shell. Server code implements this interface; the
// orchestrator itself stays sandboxable and testable.
import {
  CommandResult,
  FrameworkDetection,
  TestFramework,
  TestInvocation,
  TEST_ERROR_CODES,
} from '../types/testing.types';

export interface DetectOptions {
  /** Package.json contents, if the caller already has it. */
  packageJson?: string;
  /** File names to check (e.g. vitest.config.ts). */
  configHints?: string[];
}

export interface DetectResult extends FrameworkDetection {
  /** True if a supported runner binary was found in node_modules/.bin. */
  runnerInstalled: boolean;
  /** The resolved runner executable path, if found. */
  runnerPath?: string;
}

export type { TestFramework };

export class RuntimeNotConfiguredError extends Error {
  constructor() {
    super('Test runtime is not configured');
    this.name = 'RuntimeNotConfiguredError';
  }
}

/** Thrown for policy / path violations so the orchestrator can map to error codes. */
export class TestRuntimeError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'TestRuntimeError';
  }
}

export const WORKSPACE_FORBIDDEN_ERROR = () =>
  new TestRuntimeError(TEST_ERROR_CODES.WORKSPACE_FORBIDDEN, 'Path escapes workspace');

/**
 * The minimal surface a testing backend must expose. The browser/UI side only
 * talks to the server API, so this is implemented purely server-side.
 */
export interface TestRuntime {
  /**
   * Detect which test framework the project uses. Should return
   * { framework: 'none' } when nothing supported is found.
   */
  detectFramework(options?: DetectOptions): Promise<DetectResult>;

  /**
   * Discover test files in the workspace (e.g. *.test.ts, *.spec.tsx).
   * Returns relative paths.
   */
  discoverTestFiles(): Promise<string[]>;

  /**
   * Run a single approved invocation with a timeout and output cap.
   * Never throws for a failing test run - a non-zero exit code is normal.
   */
  run(invocation: TestInvocation): Promise<CommandResult>;

  /** Run a command with no approval - used by the security layer to verify. */
  checkRunnerInstalled(runner: string): Promise<{ installed: boolean; path?: string }>;

  readFile(file: string): Promise<string>;
  writeFile(file: string, content: string): Promise<void>;
  fileExists(file: string): Promise<boolean>;
}

/** A runtime that throws on every operation - used when no backend is wired. */
export class NullTestRuntime implements TestRuntime {
  async detectFramework(): Promise<DetectResult> {
    throw new RuntimeNotConfiguredError();
  }
  async discoverTestFiles(): Promise<string[]> {
    throw new RuntimeNotConfiguredError();
  }
  async run(_invocation: TestInvocation): Promise<CommandResult> {
    throw new RuntimeNotConfiguredError();
  }
  async checkRunnerInstalled(): Promise<{ installed: boolean }> {
    throw new RuntimeNotConfiguredError();
  }
  async readFile(): Promise<string> {
    throw new RuntimeNotConfiguredError();
  }
  async writeFile(): Promise<void> {
    throw new RuntimeNotConfiguredError();
  }
  async fileExists(): Promise<boolean> {
    throw new RuntimeNotConfiguredError();
  }
}