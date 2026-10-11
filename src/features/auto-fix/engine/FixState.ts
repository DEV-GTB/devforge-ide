// Explicit fix-session state machine.
// Booleans like `isFixing` cannot survive a reconnect; explicit states can.

export const FIX_STATES = [
  'IDLE',
  'SCANNING',
  'ANALYZING',
  'PLANNING',
  'VALIDATING_PATCH',
  'AWAITING_APPROVAL',
  'PATCHING',
  'BUILDING',
  'TESTING',
  'RUNNING',
  'INSPECTING',
  'VERIFYING',
  'DIAGNOSING',
  'RETRY',
  'ROLLBACK',
  'DONE',
  'CANCELLED',
  'BLOCKED',
  'POLICY_REJECTED',
  'CONFLICT',
  'FAILED',
] as const;

export type FixStatus = (typeof FIX_STATES)[number];

const TRANSITIONS: Record<FixStatus, readonly FixStatus[]> = {
  IDLE: ['SCANNING', 'CANCELLED', 'FAILED'],
  SCANNING: ['ANALYZING', 'PLANNING', 'DONE', 'BLOCKED', 'CANCELLED', 'FAILED'],
  ANALYZING: ['PLANNING', 'BLOCKED', 'FAILED', 'CANCELLED'],
  PLANNING: ['VALIDATING_PATCH', 'AWAITING_APPROVAL', 'BLOCKED', 'FAILED', 'CANCELLED'],
  VALIDATING_PATCH: ['PATCHING', 'AWAITING_APPROVAL', 'POLICY_REJECTED', 'BLOCKED', 'FAILED', 'CANCELLED'],
  AWAITING_APPROVAL: ['PATCHING', 'DONE', 'CANCELLED', 'FAILED'],
  PATCHING: ['VERIFYING', 'BUILDING', 'BLOCKED', 'CONFLICT', 'FAILED', 'CANCELLED'],
  BUILDING: ['TESTING', 'VERIFYING', 'FAILED', 'CANCELLED'],
  TESTING: ['VERIFYING', 'FAILED', 'CANCELLED'],
  RUNNING: ['INSPECTING', 'VERIFYING', 'FAILED', 'CANCELLED'],
  INSPECTING: ['VERIFYING', 'FAILED', 'CANCELLED'],
  VERIFYING: ['DONE', 'RETRY', 'DIAGNOSING', 'ROLLBACK', 'BLOCKED', 'FAILED', 'CANCELLED'],
  DIAGNOSING: ['RETRY', 'BLOCKED', 'ROLLBACK', 'FAILED', 'CANCELLED'],
  RETRY: ['SCANNING', 'FAILED', 'CANCELLED'],
  ROLLBACK: ['FAILED', 'DONE', 'CANCELLED'],
  DONE: [],
  CANCELLED: [],
  BLOCKED: ['SCANNING', 'CANCELLED'],
  POLICY_REJECTED: ['AWAITING_APPROVAL', 'FAILED', 'CANCELLED'],
  CONFLICT: ['SCANNING', 'CANCELLED', 'FAILED'],
  FAILED: ['SCANNING'],
};

export const TERMINAL_STATES: readonly FixStatus[] = [
  'DONE',
  'CANCELLED',
  'BLOCKED',
  'POLICY_REJECTED',
  'CONFLICT',
  'FAILED',
];

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly from: FixStatus,
    public readonly to: FixStatus,
  ) {
    super(`Invalid fix state transition: ${from} -> ${to}`);
    this.name = 'InvalidStateTransitionError';
  }
}

export type FixStateListener = (next: FixStatus, previous: FixStatus) => void;

export class FixStateMachine {
  private state: FixStatus;
  private readonly listeners = new Set<FixStateListener>();

  constructor(initial: FixStatus = 'IDLE') {
    this.state = initial;
  }

  getState(): FixStatus {
    return this.state;
  }

  is(status: FixStatus): boolean {
    return this.state === status;
  }

  isTerminal(): boolean {
    return TERMINAL_STATES.includes(this.state);
  }

  canTransition(to: FixStatus): boolean {
    if (to === this.state) return true;
    return TRANSITIONS[this.state].includes(to);
  }

  /** Throws if the transition is not allowed by the graph. */
  transition(to: FixStatus): FixStatus {
    if (to === this.state) return this.state;
    if (!this.canTransition(to)) {
      throw new InvalidStateTransitionError(this.state, to);
    }
    const previous = this.state;
    this.state = to;
    for (const listener of this.listeners) listener(to, previous);
    return this.state;
  }

  /** Non-throwing transition. Returns false when rejected. */
  tryTransition(to: FixStatus): boolean {
    if (!this.canTransition(to)) return false;
    this.transition(to);
    return true;
  }

  /** Force a terminal state regardless of the graph (used for hard aborts). */
  force(to: FixStatus): FixStatus {
    const previous = this.state;
    this.state = to;
    for (const listener of this.listeners) listener(to, previous);
    return this.state;
  }

  onChange(listener: FixStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reset(): void {
    const previous = this.state;
    this.state = 'IDLE';
    for (const listener of this.listeners) listener('IDLE', previous);
  }
}
