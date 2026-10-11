// Fix telemetry - typed event stream the UI can subscribe to in real time.

export type FixEventType =
  | 'FIX_STARTED'
  | 'FIX_SCAN_STARTED'
  | 'DEPENDENCY_CHECK_STARTED'
  | 'TYPECHECK_STARTED'
  | 'ERROR_FOUND'
  | 'ANALYSIS_STARTED'
  | 'PATCH_PROPOSED'
  | 'PATCH_APPLIED'
  | 'PATCH_REJECTED'
  | 'POLICY_REJECTED'
  | 'VERIFICATION_STARTED'
  | 'VERIFICATION_PASSED'
  | 'VERIFICATION_FAILED'
  | 'LOOP_DETECTED'
  | 'FIX_RETRY'
  | 'FIX_ROLLED_BACK'
  | 'FIX_COMPLETED'
  | 'FIX_FAILED'
  | 'FIX_ABORTED'
  | 'FIX_STATE_CHANGED'
  | 'FIX_LOG';

export interface FixEvent {
  type: FixEventType;
  sessionId: string;
  timestamp: string;
  message?: string;
  data?: Record<string, unknown>;
}

export type FixEventHandler = (event: FixEvent) => void;

export class FixEventBus {
  private readonly handlers = new Map<string, Set<FixEventHandler>>();

  on(type: FixEventType | '*', handler: FixEventHandler): () => void {
    const set = this.handlers.get(type) ?? new Set<FixEventHandler>();
    set.add(handler);
    this.handlers.set(type, set);
    return () => set.delete(handler);
  }

  emit(event: FixEvent): void {
    for (const handler of this.handlers.get(event.type) ?? []) handler(event);
    for (const handler of this.handlers.get('*') ?? []) handler(event);
  }
}
