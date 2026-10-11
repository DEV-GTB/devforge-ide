// ResultParser - normalizes raw framework output into the shared TestRunReport.
// Supports the JSON reporters of vitest, jest and mocha so the orchestrator
// never depends on a specific terminal renderer.
import {
  CommandResult,
  TestCase,
  TestCoverageInput,
  TestFramework,
  TestRunReport,
  TestSuiteResult,
} from '../types/testing.types';

interface RawAssertion {
  fullName?: string;
  title?: string;
  ancestorTitles?: string[];
  status?: string;
  failureMessages?: string[];
  failureDetails?: unknown[];
  duration?: number;
  message?: string;
  file?: string;
}

interface RawSuite {
  name?: string;
  title?: string;
  status?: string;
  message?: string;
  assertionResults?: RawAssertion[];
  tests?: RawAssertion[];
  startTime?: number;
  endTime?: number;
}

interface RawVitestJson {
  numPassedTests?: number;
  numFailedTests?: number;
  numPendingTests?: number;
  numTodoTests?: number;
  totalTestSuites?: number;
  numFailedTestSuites?: number;
  success?: boolean;
  testResults?: RawSuite[];
  coverageMap?: Record<
    string,
    {
      s?: Record<string, number>;
      f?: Record<string, number>;
      b?: Record<string, number[]>;
      path?: string;
    }
  >;
}

const PASSED_STATUSES = new Set(['passed', 'ok', 'success']);
const FAILED_STATUSES = new Set(['failed', 'failure', 'error']);
const SKIPPED_STATUSES = new Set(['skipped', 'pending', 'todo', 'disabled']);

function isFailed(status: string | undefined): boolean {
  return status ? FAILED_STATUSES.has(status.toLowerCase()) : false;
}

function isSkipped(status: string | undefined): boolean {
  return status ? SKIPPED_STATUSES.has(status.toLowerCase()) : false;
}

function normalizeAssertion(raw: RawAssertion, suiteId: string): TestCase {
  const status = isFailed(raw.status)
    ? 'failed'
    : isSkipped(raw.status)
      ? 'skipped'
      : raw.status === 'pending' || raw.status === 'todo'
        ? 'pending'
        : 'passed';

  const title = raw.fullName || (raw.ancestorTitles?.length ? `${raw.ancestorTitles.join(' > ')} > ${raw.title}` : (raw.title ?? '(unnamed)'));

  const error =
    raw.failureMessages && raw.failureMessages.length > 0
      ? (raw.failureMessages[0] ?? '')
      : raw.message
        ? raw.message
        : undefined;

  const key = `${suiteId}|${title}|${status}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const id = `TEST-${(hash >>> 0).toString(16).padStart(8, '0')}`;

  return {
    id,
    title,
    fullName: title,
    file: '',
    status,
    durationMs: raw.duration ?? 0,
    error,
  };
}

function parseVitestJson(data: RawVitestJson, fileFallback = ''): TestRunReport {
  const suites: TestSuiteResult[] = (data.testResults ?? []).map((suite, index) => {
    const assertions = (suite.assertionResults ?? []).map((a) =>
      normalizeAssertion(a, `suite-${index}`),
    );
    // Attach the suite file to each case when the raw format omits it.
    for (const tc of assertions) {
      tc.file = fileFallback;
    }
    const failed = assertions.filter((a) => a.status === 'failed').length;
    const skipped = assertions.filter((a) => a.status === 'skipped').length;
    const pending = assertions.filter((a) => a.status === 'pending').length;
    return {
      name: suite.name || suite.title || `Suite ${index + 1}`,
      file: fileFallback,
      status: failed > 0 ? 'failed' : skipped === assertions.length && assertions.length > 0 ? 'skipped' : 'passed',
      durationMs:
        suite.endTime && suite.startTime ? (suite.endTime as number) - (suite.startTime as number) : 0,
      testCases: assertions,
    };
  });

  const allCases = suites.flatMap((s) => s.testCases);
  const passed = allCases.filter((c) => c.status === 'passed').length;
  const failed = allCases.filter((c) => c.status === 'failed').length;
  const skipped = allCases.filter((c) => c.status === 'skipped').length;
  const pending = allCases.filter((c) => c.status === 'pending').length;
  const total = allCases.length;

  return {
    framework: 'vitest' as TestFramework,
    success: total === 0 ? true : failed === 0,
    totals: {
      tests: total,
      passed,
      failed,
      skipped,
      pending,
      durationMs: suites.reduce((sum, s) => sum + s.durationMs, 0),
    },
    suites,
    coverage: extractCoverage(data.coverageMap),
  };
}

function extractCoverage(coverageMap: RawVitestJson['coverageMap']): TestCoverageInput | null {
  if (!coverageMap || typeof coverageMap !== 'object') return null;
  let statements = 0;
  let hasCoverage = false;

  for (const entry of Object.values(coverageMap)) {
    if (!entry) continue;
    if (entry.s) {
      hasCoverage = true;
      statements += Object.values(entry.s).filter((v) => v > 0).length;
    }
  }

  return hasCoverage
    ? {
        lines: 0,
        functions: 0,
        branches: 0,
        statements,
      }
    : null;
}

function parseMochaJson(raw: unknown): TestRunReport {
  const stats = (raw as any)?.stats;
  const rawTests: RawAssertion[] = (raw as any)?.tests ?? [];
  const failures: RawAssertion[] = (raw as any)?.failures ?? [];
  const passes: RawAssertion[] = (raw as any)?.passes ?? [];

  const failureMessages = new Map<string, string>();
  for (const f of failures) {
    const title = f.fullName || f.title || f.file || '';
    const err = (f as any).err;
    const msg = err ? (err.message || err.stack || '') : '';
    failureMessages.set(title, msg);
  }

  const suites: TestSuiteResult[] = [
    {
      name: 'Mocha',
      file: '',
      status: failures.length > 0 ? 'failed' : 'passed',
      durationMs: stats?.duration ?? 0,
      testCases: rawTests.map((raw, index) =>
        normalizeAssertion(
          {
            title: raw.fullName || raw.title,
            fullName: raw.fullName || raw.title,
            status: failures.length > 0 && failureMessages.has(raw.fullName || raw.title || '') ? 'failed' : 'passed',
            duration: (raw as any).duration,
            failureMessages: failures.length > 0 && failureMessages.has(raw.fullName || raw.title || '') ? [failureMessages.get(raw.fullName || raw.title || '') || ''] : [],
          },
          `mocha-${index}`,
        ),
      ),
    },
  ];

  const allCases = suites.flatMap((s) => s.testCases);
  const passed = allCases.filter((c) => c.status === 'passed').length;
  const failed = allCases.filter((c) => c.status === 'failed').length;
  const skipped = stats?.pending ?? 0;
  const pending = stats?.pending ?? 0;
  const total = stats?.tests ?? allCases.length;

  return {
    framework: 'mocha' as TestFramework,
    success: failed === 0,
    totals: {
      tests: total,
      passed,
      failed,
      skipped,
      pending,
      durationMs: stats?.duration ?? 0,
    },
    suites,
    coverage: null,
  };
}

function parseGenericText(commandResult: CommandResult): TestRunReport | null {
  // Last-resort fallback: count common test-result markers.
  const combined = `${commandResult.stdout}\n${commandResult.stderr}`;
  const passedMatches = combined.match(/(?:✓|✔|passed|ok)\s/g) ?? [];
  const failedMatches = combined.match(/(?:✗|✖|failed|not ok)\s/g) ?? [];
  const passed = passedMatches.length || (commandResult.exitCode === 0 ? 1 : 0);
  const failed = failedMatches.length || (commandResult.exitCode !== 0 ? 1 : 0);
  const total = passed + failed;
  if (total === 0) return null;

  const fileFallback = '';
  return {
    framework: 'none' as TestFramework,
    success: failed === 0,
    totals: { tests: total, passed, failed, skipped: 0, pending: 0, durationMs: commandResult.durationMs },
    suites: [],
    coverage: null,
  };
}

export function createTestCaseId(title: string, file: string): string {
  let hash = 0x811c9dc5;
  const key = `${file}|${title}`;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `TEST-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Parse framework output into the shared report shape.
 * Throws TestParseError when the output cannot be interpreted.
 */
export class TestParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TestParseError';
  }
}

export function parseTestOutput(
  commandResult: CommandResult,
  framework: TestFramework,
  fileFallback = '',
): TestRunReport {
  const combined = `${commandResult.stdout}\n${commandResult.stderr}`;
  const trimmed = combined.trim();

  if (trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed);
      if (data.success !== undefined && Array.isArray(data.testResults)) {
        return parseVitestJson(data, fileFallback);
      }
      if (data.stats && Array.isArray(data.tests)) {
        return parseMochaJson(data);
      }
      // Some reporters emit an array or a wrapper (e.g. { testResults: { tests: [] } }).
      if (data.testResults && Array.isArray((data.testResults as any).tests)) {
        return parseMochaJson({ stats: data.testResults.stats, tests: (data.testResults as any).tests });
      }
    } catch {
      // not JSON - fall through to text parsing
    }
  }

  const generic = parseGenericText(commandResult);
  if (generic) {
    generic.framework = framework === 'none' ? 'none' : framework;
    return generic;
  }

  // No structured output and no recognizable markers.
  return {
    framework,
    success: commandResult.exitCode === 0,
    totals: { tests: 0, passed: 0, failed: 0, skipped: 0, pending: 0, durationMs: commandResult.durationMs },
    suites: [],
    coverage: null,
    error: {
      code: 'PARSE_FAILED',
      message: trimToLength(combined, 2000) || 'No test output captured',
    },
  };
}

function trimToLength(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}