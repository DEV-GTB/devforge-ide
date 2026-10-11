// Fix Session - the durable identity of one "Fix Project" run.
// Survives reconnects because everything lives on the session object.

import { FixStateMachine, FixStatus } from './FixState';
import { FixMode } from '../types/fix.types';

export interface FixSessionOptions {
  projectId: string;
  workspaceId?: string;
  mode?: FixMode;
  maxAttempts?: number;
  id?: string;
}

export interface FixSessionSnapshot {
  id: string;
  projectId: string;
  workspaceId?: string;
  mode: FixMode;
  status: FixStatus;
  attempt: number;
  maxAttempts: number;
  errorsFound: number;
  errorsRemaining: number;
  changedFiles: string[];
  startedAt: string;
  completedAt?: string;
}

export class FixSession {
  readonly id: string;
  readonly projectId: string;
  readonly workspaceId?: string;
  readonly mode: FixMode;
  readonly maxAttempts: number;
  readonly startedAt: string;
  readonly state = new FixStateMachine();

  attempt = 0;
  errorsFound = 0;
  errorsRemaining = 0;
  completedAt?: string;
  private readonly changedFiles = new Set<string>();

  constructor(options: FixSessionOptions) {
    this.id =
      options.id ??
      `FIX-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    this.projectId = options.projectId;
    this.workspaceId = options.workspaceId;
    this.mode = options.mode ?? 'auto';
    this.maxAttempts = options.maxAttempts ?? 5;
    this.startedAt = new Date().toISOString();
  }

  get status(): FixStatus {
    return this.state.getState();
  }

  beginAttempt(attempt: number): void {
    this.attempt = attempt;
  }

  addChangedFile(file: string): void {
    this.changedFiles.add(file);
  }

  getChangedFiles(): string[] {
    return Array.from(this.changedFiles);
  }

  /** Move to a terminal state and stamp completion time. */
  complete(status: FixStatus): void {
    this.state.force(status);
    this.completedAt = new Date().toISOString();
  }

  snapshot(): FixSessionSnapshot {
    return {
      id: this.id,
      projectId: this.projectId,
      workspaceId: this.workspaceId,
      mode: this.mode,
      status: this.status,
      attempt: this.attempt,
      maxAttempts: this.maxAttempts,
      errorsFound: this.errorsFound,
      errorsRemaining: this.errorsRemaining,
      changedFiles: this.getChangedFiles(),
      startedAt: this.startedAt,
      completedAt: this.completedAt,
    };
  }
}
