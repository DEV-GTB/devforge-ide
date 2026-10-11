// Fix Runtime - the environment boundary.
// The orchestrator never touches fs/child_process directly; it talks to a
// runtime. This keeps the engine browser-safe and lets the server sandbox the
// actual filesystem/command access.

import { Diagnostic, hashString } from '../types/fix.types';

export interface DiagnosticCollectionOptions {
  includeBuild?: boolean;
  includeTypeCheck?: boolean;
  includeLint?: boolean;
  includeTests?: boolean;
  includeRuntime?: boolean;
}

export interface FixRuntime {
  /** Run project diagnostics (build/typecheck/lint/...) and normalize them. */
  collectDiagnostics(options?: DiagnosticCollectionOptions): Promise<Diagnostic[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  fileExists(path: string): Promise<boolean>;
}

export class RuntimeNotConfiguredError extends Error {
  constructor() {
    super(
      'No FixRuntime configured. The fix engine must run where project access is available (server side).',
    );
    this.name = 'RuntimeNotConfiguredError';
  }
}

/**
 * Used when the engine is instantiated without an execution backend (for
 * example inside the browser). Every operation fails loudly instead of
 * silently pretending to work.
 */
export class NullFixRuntime implements FixRuntime {
  async collectDiagnostics(): Promise<Diagnostic[]> {
    throw new RuntimeNotConfiguredError();
  }
  async readFile(): Promise<string> {
    throw new RuntimeNotConfiguredError();
  }
  async writeFile(): Promise<void> {
    throw new RuntimeNotConfiguredError();
  }
  async fileExists(): Promise<boolean> {
    throw new RuntimeNotConfiguredError();
  }
}

/** Shared content hash for optimistic-concurrency (conflict) checks. */
export function hashFileContent(content: string): string {
  return hashString(content);
}
