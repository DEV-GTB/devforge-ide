// Fix Orchestrator - the conductor of the auto-repair pipeline.
//
// Detect -> understand -> propose -> validate -> apply -> verify -> record.
// The orchestrator never touches the filesystem/commands directly: it drives
// analyzers, the policy engine, the patch engine and the runtime, enforcing
// attempt limits, loop detection, checkpoints and rollback.

import type { BuildError } from '../../types/build';
import { ErrorClassifier } from './ErrorClassifier';
import { FixPlanner } from './FixPlanner';
import { FixPolicy, FixCategory } from './FixPolicy';
import { FixStateMachine, FixStatus } from './engine/FixState';
import { FixSession } from './engine/FixSession';
import { FixRecovery } from './engine/FixRecovery';
import {
  FixRuntime,
  NullFixRuntime,
  DiagnosticCollectionOptions,
} from './engine/FixRuntime';
import { FixEventBus, FixEventType } from './telemetry/FixEvents';
import { FixLogger } from './telemetry/FixLogger';
import {
  Diagnostic,
  FixMode,
  FixProgressMetrics,
  PolicyMode,
  RiskLevel,
  hashString,
} from './types/fix.types';

export type { BuildError };

export interface Fix {
  file: string;
  line: number;
  original: string;
  replacement: string;
  description: string;
}

export interface ClassifiedError {
  error: BuildError;
  category: 'type' | 'syntax' | 'runtime' | 'dependency' | 'import';
  confidence: number;
}

export interface AppliedFix {
  file: string;
  line: number;
  description: string;
  risk: RiskLevel;
  beforeHash: string;
  afterHash: string;
}

export interface VerificationResult {
  success: boolean;
  remainingErrors: BuildError[];
}

export interface FixAttempt {
  attempt: number;
  errors: BuildError[];
  diagnostics?: Diagnostic[];
  fixes: Fix[];
  applied?: AppliedFix[];
  verification: VerificationResult;
  phase?: FixStatus;
  progress?: FixProgressMetrics;
  startedAt?: string;
  completedAt?: string;
}

export interface FixResult {
  success: boolean;
  status: FixStatus;
  sessionId: string;
  partial: boolean;
  attempts: number;
  maxAttempts: number;
  errorsFound: number;
  errorsRemaining: number;
  changedFiles: string[];
  rolledBack: boolean;
  proposals: Fix[];
  history: FixAttempt[];
  error?: string;
  reason?: string;
}

export interface FixOrchestratorOptions {
  maxAttempts?: number;
  mode?: FixMode;
  policyMode?: PolicyMode;
  eventBus?: FixEventBus;
  diagnostics?: DiagnosticCollectionOptions;
  onEvent?: (type: FixEventType, data?: Record<string, unknown>) => void;
}

interface StagedFix {
  fix: Fix;
  category: FixCategory;
  risk: RiskLevel;
  requiresManualApproval: boolean;
}

const CATEGORY_MAP: Record<string, FixCategory> = {
  syntax: FixCategory.SYNTAX,
  type: FixCategory.TYPE,
  import: FixCategory.IMPORT,
  dependency: FixCategory.DEPENDENCY,
  lint: FixCategory.LINT,
  build: FixCategory.BUILD,
  test: FixCategory.TEST,
  runtime: FixCategory.RUNTIME,
  security: FixCategory.SECURITY,
  database: FixCategory.DATABASE,
  deployment: FixCategory.DEPLOYMENT,
};

export interface DiagnosisEngine {
  classify(errors: BuildError[]): Promise<ClassifiedError[]>;
}

export interface PlanningEngine {
  planFixes(errors: ClassifiedError[]): Promise<Fix[]>;
}

export interface FixEngineDependencies {
  classifier?: DiagnosisEngine;
  planner?: PlanningEngine;
}

export class FixOrchestrator {
  private readonly errorClassifier: DiagnosisEngine;
  private readonly fixPlanner: PlanningEngine;
  private readonly policy: FixPolicy;
  private readonly runtime: FixRuntime;
  private readonly options: FixOrchestratorOptions;
  private readonly mode: FixMode;
  private readonly maxAttempts: number;

  constructor(
    private readonly projectId: string,
    aiConfig: { provider: string; apiKey: string; model: string },
    runtime: FixRuntime = new NullFixRuntime(),
    options: FixOrchestratorOptions = {},
    dependencies: FixEngineDependencies = {},
  ) {
    this.errorClassifier = dependencies.classifier ?? new ErrorClassifier(projectId, aiConfig);
    this.fixPlanner = dependencies.planner ?? new FixPlanner(projectId, aiConfig);
    this.options = options;
    this.runtime = runtime;
    this.mode = options.mode ?? 'auto';
    this.maxAttempts = options.maxAttempts ?? 5;
    this.policy = new FixPolicy(options.policyMode ?? 'standard');
  }

  /**
   * Run the full detect -> fix -> verify loop. Bounded by maxAttempt",
   * protected by loop detection, checkpoints and rollback.
   */
  async fixEverything(): Promise<FixResult> {
    const session = new FixSession({
      projectId: this.projectId,
      mode: this.mode,
      maxAttempts: this.maxAttempts,
    });
    const state: FixStateMachine = session.state;
    const bus = this.options.eventBus ?? new FixEventBus();
    const log = new FixLogger(session.id, bus);
    const recovery = new FixRecovery();

    const history: FixAttempt[] = [];
    const proposals: Fix[] = [];
    /** Original file contents captured before we first modified them. */
    const checkpoints = new Map<string, string>();

    bus.on('*', (event) => {
      if (event.type === 'FIX_LOG') return;
      this.options.onEvent?.(event.type, event.data);
    });

    const emit = (type: FixEventType, message?: string, data?: Record<string, unknown>) => {
      bus.emit({
        type,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        message,
        data,
      });
    };

    emit('FIX_STARTED', `Starting project repair in ${this.mode} mode`, {
      mode: this.mode,
      maxAttempts: this.maxAttempts,
    });
    log.info('Fix session started', { sessionId: session.id });

    try {
      for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
        session.beginAttempt(attempt);
        {
          // ---- SCAN -----------------------------------------------------
          state.tryTransition('SCANNING');
          emit('FIX_SCAN_STARTED', `Scanning project (attempt ${attempt}/${this.maxAttempts})`);
          log.info('Collecting diagnostics');

          const diagnostics = await this.runtime.collectDiagnostics(this.options.diagnostics);
          const errors = diagnostics.map(toBuildError);

          if (attempt === 1) session.errorsFound = diagnostics.length;
          session.errorsRemaining = diagnostics.length;

          if (diagnostics.length === 0) {
            emit('VERIFICATION_PASSED', 'No problems detected');
            return this.finish(session, state, log, {
              success: true,
              history,
              proposals,
              changedFiles: session.getChangedFiles(),
              rolledBack: false,
            });
          }

          emit('ERROR_FOUND', `${diagnostics.length} problem(s) detected`, {
            count: diagnostics.length,
          });

          // ---- LOOP DETECTION -------------------------------------------
          const loop = recovery.record(diagnostics);
          if (loop.loopDetected) {
            emit('LOOP_DETECTED', 'No progress detected; stopping to avoid a loop', {
              reason: loop.reason,
            });
            log.warn('Repair loop detected', { reason: loop.reason });
            return this.finish(session, state, log, {
              success: false,
              status: 'BLOCKED',
              reason: 'no_progress',
              history,
              proposals,
              changedFiles: session.getChangedFiles(),
              rolledBack: false,
            });
          }

          // ---- ANALYZE --------------------------------------------------
          state.tryTransition('ANALYZING');
          emit('ANALYSIS_STARTED', 'Classifying problems');
          const classified = await this.errorClassifier.classify(errors);

          // ---- PLAN -----------------------------------------------------
          state.tryTransition('PLANNING');
          const fixes = await this.fixPlanner.planFixes(classified);
          if (fixes.length === 0) {
            emit('FIX_FAILED', 'No fix could be planned');
            return this.finish(session, state, log, {
              success: false,
              status: 'BLOCKED',
              reason: 'no_fixes_planned',
              history,
              proposals,
              changedFiles: session.getChangedFiles(),
              rolledBack: false,
            });
          }
          proposals.push(...fixes);

          // ---- POLICY ---------------------------------------------------
          state.tryTransition('VALIDATING_PATCH');
          const staged: StagedFix[] = [];
          let sawManualApproval = false;
          for (const fix of fixes) {
            const category = this.resolveCategory(fix, classified);
            const decision = this.policy.evaluateFix(fix, category);
            const risk = this.riskOf(category);

            if (decision.allowed && !decision.requiresManualApproval) {
              staged.push({ fix, category, risk, requiresManualApproval: false });
            } else {
              if (decision.requiresManualApproval) sawManualApproval = true;
              emit('POLICY_REJECTED', `Fix on ${fix.file} requires approval`, {
                file: fix.file,
                reason: decision.reason,
                approvalLevel: decision.approvalLevel,
              });
            }
          }

          const autoApply = this.mode !== 'suggest';
          if (!autoApply || staged.length === 0) {
            state.tryTransition('AWAITING_APPROVAL');
            emit('FIX_ABORTED', 'Awaiting manual approval', {
              pending: fixes.length - staged.length,
            });
            return this.finish(session, state, log, {
              success: false,
              status: 'AWAITING_APPROVAL',
              reason: sawManualApproval ? 'manual_approval_required' : 'suggest_mode',
              history,
              proposals,
              changedFiles: session.getChangedFiles(),
              rolledBack: false,
            });
          }

          // ---- PATCH + CHECKPOINT ---------------------------------------
          state.tryTransition('PATCHING');
          const applied = await this.applyStaged(staged, checkpoints, session, emit, log);

          if (applied.length === 0) {
            emit('FIX_FAILED', 'All patches were rejected (conflict or size)');
            return this.finish(session, state, log, {
              success: false,
              status: 'CONFLICT',
              reason: 'no_patches_applied',
              history,
              proposals,
              changedFiles: session.getChangedFiles(),
              rolledBack: false,
            });
          }

          // ---- VERIFY (re-diagnose) -------------------------------------
          state.tryTransition('VERIFYING');
          emit('VERIFICATION_STARTED', 'Verifying changes');
          const afterDiagnostics = await this.runtime.collectDiagnostics(this.options.diagnostics);
          session.errorsRemaining = afterDiagnostics.length;

          const progress = recovery.measureProgress(diagnostics, afterDiagnostics);
          const regression = recovery.detectRegression(diagnostics, afterDiagnostics);
          const verification: VerificationResult = {
            success: afterDiagnostics.length === 0,
            remainingErrors: afterDiagnostics.map(toBuildError),
          };

          const attemptRecord: FixAttempt = {
            attempt,
            errors,
            diagnostics,
            fixes: staged.map((s) => s.fix),
            applied,
            verification,
            phase: state.getState(),
            progress,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          };
          history.push(attemptRecord);

          if (verification.success) {
            emit('VERIFICATION_PASSED', 'All diagnostics resolved');
            return this.finish(session, state, log, {
              success: true,
              history,
              proposals,
              changedFiles: session.getChangedFiles(),
              rolledBack: false,
            });
          }

          emit('VERIFICATION_FAILED', `${afterDiagnostics.length} problem(s) remain`, {
            remaining: afterDiagnostics.length,
            regression: regression.length,
          });

          // ---- REGRESSION -> ROLLBACK -----------------------------------
          if (regression.length > 0) {
            state.tryTransition('ROLLBACK');
            await this.rollback(checkpoints, log);
            emit('FIX_ROLLED_BACK', 'Restored project state after regression');
            return this.finish(session, state, log, {
              success: false,
              status: 'FAILED',
              reason: 'regression',
              history,
              proposals,
              changedFiles: [],
              rolledBack: true,
            });
          }

          // ---- NO PROGRESS -> STOP --------------------------------------
          if (!progress.improved) {
            emit('LOOP_DETECTED', 'No measurable progress; stopping');
            return this.finish(session, state, log, {
              success: false,
              status: 'BLOCKED',
              reason: 'no_progress',
              history,
              proposals,
              changedFiles: session.getChangedFiles(),
              rolledBack: false,
            });
          }

          // ---- RETRY ----------------------------------------------------
          if (attempt < this.maxAttempts) {
            state.tryTransition('RETRY');
            emit('FIX_RETRY', `Retrying (${attempt + 1}/${this.maxAttempts})`, {
              resolved: progress.resolved,
            });
          }
        }
      }

      // Attempt budget exhausted.
      emit('FIX_FAILED', `Stopped after ${this.maxAttempts} attempts`);
      return this.finish(session, state, log, {
        success: false,
        status: 'BLOCKED',
        reason: 'max_attempts_reached',
        history,
        proposals,
        changedFiles: session.getChangedFiles(),
        rolledBack: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error('Fix run failed', { message });
      emit('FIX_FAILED', message);
      state.force('FAILED');
      session.completedAt = new Date().toISOString();
      return {
        success: false,
        status: 'FAILED',
        sessionId: session.id,
        partial: false,
        attempts: session.attempt,
        maxAttempts: this.maxAttempts,
        errorsFound: session.errorsFound,
        errorsRemaining: session.errorsRemaining,
        changedFiles: session.getChangedFiles(),
        rolledBack: false,
        proposals,
        history,
        error: message,
      };
    }
  }

  private async applyStaged(
    staged: StagedFix[],
    checkpoints: Map<string, string>,
    session: FixSession,
    emit: (type: FixEventType, message?: string, data?: Record<string, unknown>) => void,
    log: FixLogger,
  ): Promise<AppliedFix[]> {
    const applied: AppliedFix[] = [];

    for (const { fix, risk } of staged) {
      try {
        if (!this.policy.canModifyFile(fix.file)) {
          emit('PATCH_REJECTED', `Protected file skipped: ${fix.file}`, { file: fix.file });
          continue;
        }

        const before = await this.runtime.readFile(fix.file);
        if (!checkpoints.has(fix.file)) checkpoints.set(fix.file, before);

        const lines = before.split('\n');
        if (fix.line < 1 || fix.line > lines.length) {
          emit('PATCH_REJECTED', `Line ${fix.line} out of range in ${fix.file}`, {
            file: fix.file,
          });
          continue;
        }

        // Optimistic concurrency: the line must still match what the fix expects.
        const currentLine = lines[fix.line - 1] ?? '';
        if (fix.original && currentLine.trim() !== fix.original.trim()) {
          emit('PATCH_REJECTED', `Conflict detected in ${fix.file}:${fix.line}`, {
            file: fix.file,
            line: fix.line,
          });
          continue;
        }

        lines[fix.line - 1] = fix.replacement;
        const after = lines.join('\n');
        await this.runtime.writeFile(fix.file, after);
        session.addChangedFile(fix.file);

        const record: AppliedFix = {
          file: fix.file,
          line: fix.line,
          description: fix.description,
          risk,
          beforeHash: hashString(before),
          afterHash: hashString(after),
        };
        applied.push(record);

        emit('PATCH_APPLIED', `Applied fix to ${fix.file}`, {
          file: fix.file,
          line: fix.line,
          risk,
        });
        log.info(`Applied fix to ${fix.file}:${fix.line}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        emit('PATCH_REJECTED', `Failed to apply fix to ${fix.file}: ${message}`, {
          file: fix.file,
        });
      }
    }

    return applied;
  }

  private async rollback(checkpoints: Map<string, string>, log: FixLogger): Promise<void> {
    for (const [file, original] of checkpoints.entries()) {
      try {
        await this.runtime.writeFile(file, original);
      } catch (error) {
        log.error(`Rollback failed for ${file}`, {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private resolveCategory(fix: Fix, classified: ClassifiedError[]): FixCategory {
    const match = classified.find(
      (c) => c.error.file === fix.file && c.error.line === fix.line,
    );
    return CATEGORY_MAP[match?.category ?? 'type'] ?? FixCategory.TYPE;
  }

  private riskOf(category: FixCategory): RiskLevel {
    switch (category) {
      case FixCategory.SYNTAX:
      case FixCategory.IMPORT:
      case FixCategory.LINT:
        return 'low';
      case FixCategory.TYPE:
      case FixCategory.BUILD:
      case FixCategory.TEST:
      case FixCategory.RUNTIME:
        return 'medium';
      default:
        return 'high';
    }
  }

  private finish(
    session: FixSession,
    state: FixStateMachine,
    log: FixLogger,
    outcome: {
      success: boolean;
      status?: FixStatus;
      reason?: string;
      history: FixAttempt[];
      proposals: Fix[];
      changedFiles: string[];
      rolledBack: boolean;
    },
  ): FixResult {
    const status = outcome.status ?? 'DONE';
    session.complete(status);
    log.info('Fix session finished', { status, success: outcome.success });

    return {
      success: outcome.success,
      status,
      sessionId: session.id,
      partial: !outcome.success && outcome.changedFiles.length > 0,
      attempts: session.attempt,
      maxAttempts: this.maxAttempts,
      errorsFound: session.errorsFound,
      errorsRemaining: session.errorsRemaining,
      changedFiles: outcome.changedFiles,
      rolledBack: outcome.rolledBack,
      proposals: outcome.proposals,
      history: outcome.history,
      reason: outcome.reason,
      error: outcome.success ? undefined : outcome.reason,
    };
  }
}

function toBuildError(diagnostic: Diagnostic): BuildError {
  return {
    file: diagnostic.file ?? '<unknown>',
    line: diagnostic.line ?? 0,
    column: diagnostic.column ?? 0,
    message: diagnostic.message,
    code: diagnostic.code,
    severity: diagnostic.severity,
  };
}


