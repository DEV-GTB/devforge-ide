// Test telemetry - typed event stream the UI can subscribe to in real time.

export type TestEventType =
  | 'TEST_RUN_STARTED'
  | 'TEST_INSPECTING'
  | 'TEST_FRAMEWORK_DETECTED'
  | 'TEST_PREPARING'
  | 'TEST_VALIDATING'
  | 'TEST_RUNNING'
  | 'TEST_ANALYZING'
  | 'TEST_CASE_RESULT'
  | 'TEST_SUITE_RESULT'
  | 'TEST_COVERAGE'
  | 'TEST_REPAIR_ATTEMPT'
  | 'TEST_REPAIR_APPLIED'
  | 'TEST_REPAIR_NO_PROGRESS'
  | 'TEST_COMPLETED'
  | 'TEST_FAILED'
  | 'TEST_ERROR'
  | 'TEST_CANCELLED'
  | 'TEST_STATE_CHANGED'
  | 'TEST_LOG';

export interface TestEvent {
  type: TestEventType;
  runId: string;
  timestamp: string;
  message?: string;
  data?: Record<string, unknown>;
}

export type TestEventHandler = (event: TestEvent) => void;

export class TestEventBus {
  private readonly handlers = new Map<string, Set<TestEventHandler>>();

  /** Subscribe to a specific event type, or '*' for everything. */
  on(type: TestEventType | '*', handler: TestEventHandler): () => void {
    const set = this.handlers.get(type) ?? new Set<TestEventHandler>();
    set.add(handler);
    this.handlers.set(type, set);
    return () => set.delete(handler);
  }

  emit(event: TestEvent): void {
    for (const handler of this.handlers.get(event.type) ?? []) handler(event);
    for (const handler of this.handlers.get('*') ?? []) handler(event);
  }
}