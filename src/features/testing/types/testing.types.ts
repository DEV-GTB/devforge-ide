// Canonical Testing Engine types - shared language for detectors, adapters,
// the orchestrator and every UI panel. Keep this module dependency-free so it
// can be imported from browser and server code.

export type TestFramework = 'vitest' | 'jest' | 'mocha' | 'none';

export type TestCaseStatus = 'passed' | 'failed' | 'skipped' | 'pending';

export interface TestCase {
  id: string;
  title: string;
  /** Full test name including ancestor describe() titles. */
  fullName: string;
  file: string;
  status: TestCaseStatus;
  /** Duration in milliseconds. */
  durationMs: number;
  error?: string;
}

export interface TestSuiteResult {
  name: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  testCases: TestCase[];
}

export interface TestTotals {
  tests: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  durationMs: number;
}

export interface CoverageSummary {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

/** Raw per-file coverage map as emitted by v8/istanbul providers. */
export interface TestCoverageInput {
  lines?: Record<string, [number, number] | number> | number;
  functions?: Record<string, [number, number] | number> | number;
  branches?: Record<string, [number, number] | number> | number;
  statements?: Record<string, [number, number] | number> | number;
}

/**
 * Normalized result of a single test run. Every adapter speaks this language
 * so the orchestrator never has to parse raw framework output.
 */
export interface TestRunReport {
  framework: TestFramework;
  success: boolean;
  totals: TestTotals;
  suites: TestSuiteResult[];
  coverage?: TestCoverageInput | null;
  error?: {
    code: string;
    message: string;
  };
}

/** Invocation approved to run against the workspace. */
export interface TestInvocation {
  command: string;
  args: string[];
  timeoutMs?: number;
  env?: Record<string, string>;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export type TestRunStatus =
  | 'queued'
  | 'inspecting'
  | 'preparing'
  | 'validating'
  | 'running'
  | 'analyzing'
  | 'completed'
  | 'failed'
  | 'error'
  | 'cancelled';

export type TestRunMode = 'detect' | 'auto' | 'suggest';

export interface FrameworkDetection {
  framework: TestFramework;
  confidence: number;
  reason: string;
}

export interface TestRunOutcome {
  id: string;
  projectId: string;
  status: TestRunStatus;
  framework: TestFramework;
  attempts: number;
  maxAttempts: number;
  report?: TestRunReport;
  error?: {
    code: string;
    message: string;
  };
  detectedTests?: number;
  changedFiles?: string[];
  cancelled?: boolean;
}

export const TEST_ERROR_CODES = {
  UNSUPPORTED_FRAMEWORK: 'UNSUPPORTED_FRAMEWORK',
  WORKSPACE_FORBIDDEN: 'WORKSPACE_FORBIDDEN',
  POLICY_REJECTED: 'POLICY_REJECTED',
  TIMEOUT: 'TIMEOUT',
  OUTPUT_OVERFLOW: 'OUTPUT_OVERFLOW',
  PARSE_FAILED: 'PARSE_FAILED',
  SPAWN_FAILED: 'SPAWN_FAILED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  RUN_NOT_FOUND: 'RUN_NOT_FOUND',
  INVALID_REQUEST: 'INVALID_REQUEST',
} as const;

export type TestErrorCode = (typeof TEST_ERROR_CODES)[keyof typeof TEST_ERROR_CODES];

export interface TestRunConfig {
  framework?: TestFramework;
  projectPath: string;
  testFiles?: string[];
  timeoutMs?: number;
  maxOutputBytes?: number;
  coverage?: boolean;
  repair?: boolean;
  maxRepairAttempts?: number;
  mode?: TestRunMode;
}

/**
 * Deterministic FNV-1a hash. Used for stable test-case ids and content hashes.
 * Works identically in Node and the browser.
 */
export function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}