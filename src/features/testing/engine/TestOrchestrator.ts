// TestOrchestrator - coordinates the testing agent flow:
//   detect framework -> discover tests -> prepare invocation -> validate
//   against policy -> run -> parse -> analyze -> repair (bounded) -> done.
import {
  TestRunConfig,
  TestRunOutcome,
  TestRunReport,
  TestRunStatus,
  TestFramework,
  TEST_ERROR_CODES,
  TestRunMode,
} from '../types/testing.types';
import { TestState } from './TestState';
import { TestRuntime } from './TestRuntime';
import { TestEventBus, TestEvent } from '../telemetry/TestEvents';
import { TestPolicy } from '../policy/TestPolicy';
import { TestFrameworkAdapter, FrameworkContext } from '../framework/TestFrameworkAdapter';
import { adapterForFramework } from '../framework/adapters';
import { detectFramework } from '../framework/FrameworkDetector';
import { RepairCoordinator, RepairProvider } from './RepairCoordinator';

export interface TestOrchestratorOptions {
  projectId: string;
  runtime: TestRuntime;
  policy?: TestPolicy;
  eventBus?: TestEventBus;
  /** If set, skip detection entirely and use this adapter. */
  framework?: TestFramework;
  /** Optional repair provider enabling the auto-repair loop. */
  repairProvider?: RepairProvider;
}

export class TestOrchestrator {
  private readonly runtime: TestRuntime;
  private readonly policy: TestPolicy;
  private readonly eventBus?: TestEventBus;
  private readonly projectId: string;
  private readonly forcedFramework?: TestFramework;
  private readonly repairProvider?: RepairProvider;

  constructor(options: TestOrchestratorOptions) {
    this.projectId = options.projectId;
    this.runtime = options.runtime;
    this.policy = options.policy ?? new TestPolicy();
    this.eventBus = options.eventBus;
    this.forcedFramework = options.framework;
    this.repairProvider = options.repairProvider;
  }

  private emit(event: Omit<TestEvent, 'timestamp'>): void {
    if (this.eventBus) {
      this.eventBus.emit({ ...event, timestamp: new Date().toISOString() });
    }
  }

  async runTests(config: TestRunConfig): Promise<TestRunOutcome> {
    const runId = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const state = new TestState('queued');
    const attempts = 1;
    const maxAttempts = config.maxRepairAttempts ?? 3;
    const mode: TestRunMode = config.mode ?? 'detect';

    const outcome: TestRunOutcome = {
      id: runId,
      projectId: this.projectId,
      status: 'queued',
      framework: 'none',
      attempts,
      maxAttempts,
    };

    this.emit({ type: 'TEST_RUN_STARTED', runId, message: `Starting test run for ${this.projectId}` });

    try {
      // 1. INSPECT
      this.safeTransition(state, 'inspecting');
      outcome.status = 'inspecting';
      this.emit({ type: 'TEST_INSPECTING', runId, message: 'Inspecting project' });

      let framework: TestFramework = this.forcedFramework ?? 'none';
      if (!this.forcedFramework) {
        let packageJson: string | undefined;
        try {
          if (await this.runtime.fileExists('package.json')) {
            packageJson = await this.runtime.readFile('package.json');
          }
        } catch {
          packageJson = undefined;
        }

        const detection = await detectFramework({
          packageJson,
          hasConfigFile: (names) => Promise.all(names.map((n) => this.runtime.fileExists(n))).then((r) => r.some(Boolean)),
          runnerInstalled: (runner) => this.runtime.checkRunnerInstalled(runner),
        });

        framework = detection.framework;
        this.emit({
          type: 'TEST_FRAMEWORK_DETECTED',
          runId,
          message: detection.reason,
          data: { framework, confidence: detection.confidence, runnerInstalled: detection.runnerInstalled },
        });
      }

      outcome.framework = framework;
      if (framework === 'none') {
        this.safeTransition(state, 'error');
        outcome.status = 'error';
        this.emit({
          type: 'TEST_ERROR',
          runId,
          message: 'No supported test framework detected',
          data: { code: TEST_ERROR_CODES.UNSUPPORTED_FRAMEWORK },
        });
        return {
          ...outcome,
          error: {
            code: TEST_ERROR_CODES.UNSUPPORTED_FRAMEWORK,
            message: 'No supported test framework detected (vitest, jest, mocha)',
          },
        };
      }

      const adapter: TestFrameworkAdapter | null = adapterForFramework(framework);
      if (!adapter) {
        this.safeTransition(state, 'error');
        outcome.status = 'error';
        return {
          ...outcome,
          error: { code: TEST_ERROR_CODES.UNSUPPORTED_FRAMEWORK, message: `No adapter for ${framework}` },
        };
      }

      // 2. PREPARE
      this.safeTransition(state, 'preparing');
      outcome.status = 'preparing';
      this.emit({ type: 'TEST_PREPARING', runId, message: `Preparing ${framework} run` });

      const discovered = await this.runtime.discoverTestFiles();
      const testFiles = config.testFiles && config.testFiles.length > 0 ? config.testFiles : discovered;
      const fileCount = testFiles.length;
      outcome.detectedTests = fileCount;

      if (mode === 'detect' && fileCount === 0) {
        this.safeTransition(state, 'completed');
        outcome.status = 'completed';
        this.emit({
          type: 'TEST_COMPLETED',
          runId,
          message: 'No test files found; nothing to run',
          data: { detectedTests: 0 },
        });
        return { ...outcome, framework };
      }

      const context: FrameworkContext = {
        projectPath: config.projectPath,
        testFiles,
        coverage: !!config.coverage,
        policy: this.policy,
      };
      const invocation = adapter.buildInvocation(context);

      // 3. VALIDATE against policy (never blindly execute)
      this.safeTransition(state, 'validating');
      outcome.status = 'validating';
      this.emit({ type: 'TEST_VALIDATING', runId, message: 'Validating invocation against policy' });

      const decision = this.policy.evaluateInvocation(invocation, {
        projectPath: config.projectPath,
        framework,
      });
      if (!decision.allowed) {
        this.safeTransition(state, 'error');
        outcome.status = 'error';
        return {
          ...outcome,
          error: {
            code: decision.errorCode ?? TEST_ERROR_CODES.POLICY_REJECTED,
            message: decision.reason ?? 'Invocation not approved',
          },
        };
      }

      // 4. RUN
      this.safeTransition(state, 'running');
      outcome.status = 'running';
      this.emit({ type: 'TEST_RUNNING', runId, message: `Running ${invocation.command} ${invocation.args.join(' ')}` });

      const effective = this.policy.effectiveConfig(config);
      const timedInvocation = {
        ...invocation,
        timeoutMs: effective.timeoutMs,
      };

      const commandResult = await this.runtime.run(timedInvocation);
      let currentReport: TestRunReport = adapter.parseOutput(commandResult, config.projectPath);

      // 5. ANALYZE
      this.safeTransition(state, 'analyzing');
      outcome.status = 'analyzing';
      this.emit({ type: 'TEST_ANALYZING', runId, message: 'Analyzing test results' });

      if (currentReport.coverage) {
        this.emit({
          type: 'TEST_COVERAGE',
          runId,
          message: 'Coverage generated',
          data: { coverage: currentReport.coverage },
        });
      }

      let appliedRepairs = 0;
      if (!currentReport.success && config.repair && this.repairProvider) {
        const repair = new RepairCoordinator(this.runtime, {
          provider: this.repairProvider,
          eventBus: this.eventBus,
          policy: this.policy,
          maxRepairAttempts: config.maxRepairAttempts,
        });
        const retest = await repair.repairAndRetest(currentReport, async () => {
          const rerunResult = await this.runtime.run(timedInvocation);
          return adapter.parseOutput(rerunResult, config.projectPath);
        });
        appliedRepairs = retest.applied.length;
        if (retest.report) {
          currentReport = retest.report;
        }
        this.safeTransition(state, retest.status === 'completed' ? 'completed' : 'failed');
      } else {
        this.safeTransition(state, currentReport.success ? 'completed' : 'failed');
      }

      // Emit per-case + suite results for UI/animation.
      for (const suite of currentReport.suites) {
        this.emit({
          type: 'TEST_SUITE_RESULT',
          runId,
          message: `${suite.name}: ${suite.status}`,
          data: { suite: { ...suite } },
        });
      }

      outcome.status = state.value;
      outcome.report = currentReport;
      outcome.changedFiles = [];

      if (state.value === 'completed') {
        this.emit({
          type: 'TEST_COMPLETED',
          runId,
          message: `Run completed: ${currentReport.totals.passed} passed, ${currentReport.totals.failed} failed, ${currentReport.totals.skipped} skipped`,
          data: { totals: currentReport.totals },
        });
      } else {
        this.emit({
          type: 'TEST_FAILED',
          runId,
          message: `Run failed: ${currentReport.totals.failed} failing case(s)`,
          data: { totals: currentReport.totals },
        });
      }
      return outcome;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (state.isActive()) {
        this.safeTransition(state, 'error');
      }
      outcome.status = state.value === 'cancelled' ? 'cancelled' : 'error';
      if (outcome.status === 'error') {
        outcome.error = { code: TEST_ERROR_CODES.SPAWN_FAILED, message };
        this.emit({ type: 'TEST_ERROR', runId, message });
      }
      return outcome;
    }
  }

  /** Cancel an in-progress run. Only meaningful when the runtime supports cancellation. */
  async cancelRun(outcome: TestRunOutcome): Promise<TestRunOutcome> {
    if (outcome.status !== 'running' && outcome.status !== 'analyzing') {
      return outcome; // no-op for terminal states
    }
    outcome.status = 'cancelled';
    outcome.cancelled = true;
    this.emit({
      type: 'TEST_CANCELLED',
      runId: outcome.id,
      message: 'Run cancelled by user',
    });
    return outcome;
  }

  private safeTransition(state: TestState, to: TestRunStatus): void {
    try {
      state.transition(to);
    } catch (err) {
      // If the state machine rejects the move, silently keep the current value
      // (typically cancelling while running - cancellation wins).
      void err;
    }
  }
}