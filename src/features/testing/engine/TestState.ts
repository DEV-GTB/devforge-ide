// TestRun state machine - manages the lifecycle of a test run.
// States follow the spec:
//   queued -> inspecting -> preparing -> validating -> running -> analyzing
//   analyzing -> completed | failed
// Any active state -> cancelled | error
import { TestRunStatus } from '../types/testing.types';

export const TEST_STATES: TestRunStatus[] = [
  'queued',
  'inspecting',
  'preparing',
  'validating',
  'running',
  'analyzing',
  'completed',
  'failed',
  'error',
  'cancelled',
];

export const TERMINAL_TEST_STATES: TestRunStatus[] = ['completed', 'failed', 'error', 'cancelled'];

export const ACTIVE_TEST_STATES: TestRunStatus[] = [
  'queued',
  'inspecting',
  'preparing',
  'validating',
  'running',
  'analyzing',
];

// Allowed transitions from each state.
const TRANSITIONS: Record<TestRunStatus, TestRunStatus[]> = {
  queued: ['inspecting', 'cancelled', 'error'],
  inspecting: ['preparing', 'running', 'error', 'cancelled'],
  preparing: ['validating', 'running', 'error', 'cancelled'],
  validating: ['running', 'error', 'cancelled'],
  running: ['analyzing', 'error', 'cancelled'],
  analyzing: ['completed', 'failed', 'cancelled'],
  completed: [],
  failed: [],
  error: [],
  cancelled: [],
};

export class InvalidTestStateTransitionError extends Error {
  constructor(from: TestRunStatus, to: TestRunStatus) {
    super(`Invalid test state transition: ${from} -> ${to}`);
    this.name = 'InvalidTestStateTransitionError';
  }
}

export class TestState {
  private current: TestRunStatus;

  constructor(initial: TestRunStatus = 'queued') {
    this.current = initial;
  }

  get value(): TestRunStatus {
    return this.current;
  }

  isTerminal(): boolean {
    return TERMINAL_TEST_STATES.includes(this.current);
  }

  isActive(): boolean {
    return ACTIVE_TEST_STATES.includes(this.current);
  }

  /** Attempt a transition. Throws if the transition is not allowed. */
  transition(to: TestRunStatus): TestRunStatus {
    if (this.current === to) return this.current;
    const allowed = TRANSITIONS[this.current];
    if (!allowed.includes(to)) {
      throw new InvalidTestStateTransitionError(this.current, to);
    }
    this.current = to;
    return this.current;
  }

  /** Like transition() but returns the status instead of throwing. */
  canTransition(to: TestRunStatus): boolean {
    return TRANSITIONS[this.current].includes(to);
  }
}