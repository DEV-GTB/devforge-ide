// Canonical Fix Engine types - shared language for every analyzer/verifier.
// Keep this module dependency-free so it can be imported from browser and server code.

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export type DiagnosticSource =
  | 'build'
  | 'typecheck'
  | 'lint'
  | 'test'
  | 'runtime'
  | 'browser';

/**
 * A normalized problem produced by any analyzer. Every analyzer speaks this
 * language so the orchestrator never has to parse raw terminal text.
 */
export interface Diagnostic {
  id: string;
  /** Stable identity used for deduplication, loop detection and regression checks. */
  fingerprint: string;
  severity: DiagnosticSeverity;
  category: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
  source: DiagnosticSource;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export type FixMode = 'suggest' | 'auto' | 'autonomous';

export type PolicyMode = 'strict' | 'standard' | 'permissive';

/** Errors grouped by a shared root-cause key (e.g. a missing module). */
export interface DiagnosticGroup {
  key: string;
  category: string;
  count: number;
  diagnostics: Diagnostic[];
}

/** Evidence-based progress between two diagnostic snapshots. */
export interface FixProgressMetrics {
  errorsBefore: number;
  errorsAfter: number;
  resolved: number;
  introduced: number;
  delta: number;
  improved: boolean;
}

export function createDiagnostic(
  input: Omit<Diagnostic, 'id' | 'fingerprint'> & { fingerprint?: string },
): Diagnostic {
  const fingerprint =
    input.fingerprint ??
    [input.file ?? '<unknown>', input.line ?? 0, input.code ?? input.message]
      .join(':')
      .replace(/\s+/g, ' ')
      .trim();

  return {
    ...input,
    id: `DIAG-${hashString(fingerprint + input.source)}`,
    fingerprint,
  };
}

/**
 * Deterministic FNV-1a hash. Used for content hashes (optimistic concurrency)
 * and for diagnostic ids. Works identically in Node and the browser.
 */
export function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
