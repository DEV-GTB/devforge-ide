// RepairCoordinator - bounded repair-and-retest loop. Each failed run may be
// repaired up to maxRepairAttempts (default 3). Uses evidence-based progress so
// we stop early when a repair is not making things better.
import { TestEventBus, TestEvent } from '../telemetry/TestEvents';
import { TestPolicy } from '../policy/TestPolicy';
import { TestCase, TestRunReport, TestRunStatus } from '../types/testing.types';
import { TestRuntime } from './TestRuntime';

export interface RepairAction {
  file: string;
  before: string; // current content (for conflict detection)
  after: string; // proposed replacement
}

export interface RepairProvider {
  /** Propose repairs for the failing cases. Returns [] when nothing to fix. */
  proposeRepairs(report: TestRunReport): Promise<RepairAction[]>;
}

export class NoOpRepairProvider implements RepairProvider {
  async proposeRepairs(): Promise<RepairAction[]> {
    return [];
  }
}

export interface RepairOutcome {
  applied: RepairAction[];
  attempts: number;
  noProgress: boolean;
  status: TestRunStatus;
}

export class RepairCoordinator {
  private readonly provider: RepairProvider;
  private readonly eventBus?: TestEventBus;
  private readonly policy: TestPolicy;
  private readonly maxAttempts: number;

  constructor(
    private readonly runtime: TestRuntime,
    options: {
      provider?: RepairProvider;
      eventBus?: TestEventBus;
      policy?: TestPolicy;
      maxRepairAttempts?: number;
    } = {},
  ) {
    this.provider = options.provider ?? new NoOpRepairProvider();
    this.eventBus = options.eventBus;
    this.policy = options.policy ?? new TestPolicy();
    this.maxAttempts = options.maxRepairAttempts ?? 3;
  }

  private emit(event: Omit<TestEvent, 'timestamp'>): void {
    if (this.eventBus) {
      this.eventBus.emit({ ...event, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Attempt to repair a failed report. Returns the final status and a fresh
   * report when a repair run produced one. The runtime is the one executing
   * the re-run.
   */
  async repairAndRetest(
    failedReport: TestRunReport,
    invoke: () => Promise<TestRunReport>,
  ): Promise<{ status: TestRunStatus; report?: TestRunReport; applied: RepairAction[] }> {
    const applied: RepairAction[] = [];
    let current = failedReport;
    let attempts = 0;

    // Set-based loop detection (mirrors the fix engine): remember every failing
    // fingerprint ever seen. A repair that reproduces an identical failure set
    // is a loop; a repair that re-introduces an old failure without reducing
    // the failure count is a regression.
    const seen = new Set<string>();
    const seenSets = new Set<string>();
    const fingerprint = (report: TestRunReport): string =>
      this.failuringFingerprints(report).sort().join('|');
    seenSets.add(fingerprint(current));
    this.failuringFingerprints(current).forEach((f) => seen.add(f));
    let previousFailureCount = current.totals.failed;

    while (attempts < this.maxAttempts && !current.success) {
      attempts++;
      this.emit({
        type: 'TEST_REPAIR_ATTEMPT',
        runId: '',
        message: `Repair attempt ${attempts} of ${this.maxAttempts}`,
        data: { attempt: attempts, failed: current.totals.failed },
      });

      const actions = await this.provider.proposeRepairs(current);
      if (actions.length === 0) {
        this.emit({
          type: 'TEST_REPAIR_NO_PROGRESS',
          runId: '',
          message: 'No repairs proposed; stopping repair loop',
        });
        break;
      }

      // Validate each action against policy before touching the filesystem.
      const valid: RepairAction[] = [];
      for (const action of actions) {
        const decision = this.policy.evaluateFileWrite(action.file, {
          projectPath: action.file.split(/[\\/]/)[0] || '.',
        });
        if (decision.allowed) {
          valid.push(action);
          await this.runtime.writeFile(action.file, action.after);
          applied.push(action);
        } else {
          this.emit({
            type: 'TEST_LOG',
            runId: '',
            message: `Policy blocked repair of ${action.file}: ${decision.reason ?? 'denied'}`,
          });
        }
      }

      if (valid.length === 0) {
        this.emit({
          type: 'TEST_REPAIR_NO_PROGRESS',
          runId: '',
          message: 'All repairs were blocked; stopping repair loop',
        });
        break;
      }

      this.emit({
        type: 'TEST_REPAIR_APPLIED',
        runId: '',
        message: `Applied ${valid.length} repair(s)`,
        data: { files: valid.map((a) => a.file) },
      });

      // Re-run and compare against all previously seen failures.
      let next: TestRunReport;
      try {
        next = await invoke();
      } catch {
        break;
      }
      current = next;

      if (current.success) {
        return { status: 'completed', report: current, applied };
      }

      const nextFp = fingerprint(current);
      const nextFpsList = this.failuringFingerprints(current);
      let introduced = 0;
      for (const fp of nextFpsList) {
        if (!seen.has(fp)) introduced++;
      }
      nextFpsList.forEach((fp) => seen.add(fp));

      const stillFailing = current.totals.failed;
      const improved = stillFailing < previousFailureCount;
      previousFailureCount = stillFailing;

      // Loop: the repair produced the exact same failing set as a prior run.
      if (seenSets.has(nextFp)) {
        this.emit({
          type: 'TEST_REPAIR_NO_PROGRESS',
          runId: '',
          message: 'Repair reproduced the same failing set; stopping repair loop',
        });
        break;
      }
      seenSets.add(nextFp);

      // Regression: repair introduced failures we have never seen before and
      // did not reduce the failure count.
      if (introduced > 0 && !improved) {
        this.emit({
          type: 'TEST_REPAIR_NO_PROGRESS',
          runId: '',
          message: `Repair introduced ${introduced} new failing case(s); stopping`,
          data: { introduced },
        });
        break;
      }
    }

    return { status: current.success ? 'completed' : 'failed', report: current, applied };
  }

  private failuringFingerprints(report: TestRunReport): string[] {
    return report.suites.flatMap((s) =>
      s.testCases
        .filter((t: TestCase) => t.status === 'failed')
        .map((t) => `${s.file}:${t.title}`),
    );
  }
}