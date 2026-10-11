// TestPolicy - decides which invocations may run against the workspace and
// which files may be edited. Mirrors the auto-fix policy so the testing agent
// is gated the same way.
import {
  TestFramework,
  TestInvocation,
  TEST_ERROR_CODES,
  TestRunConfig,
} from '../types/testing.types';

export interface InvocationDecision {
  allowed: boolean;
  reason?: string;
  errorCode?: string;
}

export interface FileAccessDecision {
  allowed: boolean;
  reason?: string;
}

export interface TestPolicyOptions {
  /** Runners we are willing to execute. */
  allowedRunners?: string[];
  /** Default timeout for a single run (ms). */
  defaultTimeoutMs?: number;
  /** Maximum output bytes captured per run. */
  maxOutputBytes?: number;
  /** Files that generated tests may be written to (glob-ish, base name match). */
  allowedTestExtensions?: string[];
}

const NODE_RUNNER_PREFIXES = ['node ', 'node --', 'node_modules/.bin/'];

export class TestPolicy {
  readonly allowedRunners: string[];
  readonly defaultTimeoutMs: number;
  readonly maxOutputBytes: number;

  constructor(
    private readonly options: TestPolicyOptions = {},
    private readonly mode: 'strict' | 'standard' | 'permissive' = 'standard',
  ) {
    this.allowedRunners = options.allowedRunners ?? ['vitest', 'jest', 'mocha', 'node'];
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 120_000;
    this.maxOutputBytes = options.maxOutputBytes ?? 2_000_000;
  }

  /** Rust-style builder to derive a stricter/looser copy. */
  withMode(mode: 'strict' | 'standard' | 'permissive'): TestPolicy {
    return new TestPolicy(this.options, mode);
  }

  /**
   * Evaluate a proposed invocation. A blocked invocation must never reach the
   * shell.
   */
  evaluateInvocation(
    invocation: TestInvocation,
    context: { projectPath: string; framework?: TestFramework },
  ): InvocationDecision {
    // Resolve the base command: allow "npx vitest" and "npm test" style.
    const base = invocation.command.trim();
    const lower = base.toLowerCase();

    // npm/pnpm/yarn wrappers are fine but must not be given arbitrary flags.
    if (lower === 'npm' || lower === 'npx' || lower === 'pnpm' || lower === 'yarn' || lower === 'node') {
      if (lower === 'node') {
        // Only "node <runner>" is allowed - never raw node with eval/script file.
        const firstArg = invocation.args[0] ?? '';
        const isRunner = NODE_RUNNER_PREFIXES.some((p) => firstArg.startsWith(p));
        if (isRunner) {
          return {
            allowed: true,
            reason: `Approved runner: ${base} ${firstArg}`,
          };
        }
        if (this.mode === 'permissive') {
          return { allowed: true, reason: 'Permissive mode allows node' };
        }
        return {
          allowed: false,
          errorCode: TEST_ERROR_CODES.POLICY_REJECTED,
          reason: 'Raw "node <script>" execution is not approved',
        };
      }

      const safeSub = invocation.args[0] ?? '';
      const allowedScripts = new Set(['test', 'run', 'vitest', 'jest', 'mocha', 'exec']);
      if (allowedScripts.has(safeSub.toLowerCase())) {
        return { allowed: true, reason: `Approved wrapper: ${base} ${safeSub}` };
      }
      return {
        allowed: false,
        errorCode: TEST_ERROR_CODES.POLICY_REJECTED,
        reason: `Wrapper "${base}" may not run "${safeSub}"`,
      };
    }

    const runnerInAllowlist = this.allowedRunners.some((r) => lower.includes(r.toLowerCase()));
    if (runnerInAllowlist) {
      return {
        allowed: true,
        reason: `Approved runner: ${base}`,
      };
    }

    return {
      allowed: false,
      errorCode: TEST_ERROR_CODES.POLICY_REJECTED,
      reason: `Runner "${base}" is not in the allowlist`,
    };
  }

  /**
   * Decide whether generated tests may be written to a file. Only test files
   * inside the workspace are editable (same guard as the fix engine).
   */
  evaluateFileWrite(file: string, context: { projectPath: string }): FileAccessDecision {
    if (file.includes('..')) {
      return {
        allowed: false,
        reason: 'Potentially unsafe path segment',
      };
    }

    const testPattern = /\b(src|test|spec|tests|__tests__)\b/i.test(file);
    const extensionOk = (this.options.allowedTestExtensions ?? ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx', '.test.js', '.spec.js']).some((ext) =>
      file.toLowerCase().endsWith(ext.toLowerCase()),
    );

    if (!extensionOk) {
      return {
        allowed: false,
        reason: 'Generated tests may only be written to test files',
      };
    }

    if (!testPattern && !file.includes('/test/') && !file.includes('\\test\\')) {
      return {
        allowed: false,
        reason: 'Test files must live in a test, spec, src or __tests__ directory',
      };
    }

    return { allowed: true };
  }

  effectiveConfig(config: TestRunConfig): Required<Pick<TestRunConfig, 'timeoutMs' | 'maxOutputBytes'>> {
    return {
      timeoutMs: config.timeoutMs ?? this.defaultTimeoutMs,
      maxOutputBytes: config.maxOutputBytes ?? this.maxOutputBytes,
    };
  }

  /** Public accessors for adaptation. */
  get allowedTestDirs(): string[] {
    return ['src', 'test', 'tests', 'spec', '__tests__'];
  }
}