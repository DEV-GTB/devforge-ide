// Fix Recovery - loop detection, progress measurement and regression checks.
// Prevents the classic A -> B -> A -> B oscillation from burning attempts.

import { Diagnostic, FixProgressMetrics } from '../types/fix.types';

export interface LoopCheck {
  loopDetected: boolean;
  reason?: 'repeating-attempt' | 'oscillation';
  repeatCount: number;
}

export interface FixRecoveryOptions {
  /** Unused - kept for compatibility. Loop detection is set-based now. */
  fingerprintThreshold?: number;
}

function fingerprintSet(diagnostics: Diagnostic[]): string[] {
  return Array.from(new Set(diagnostics.map((d) => d.fingerprint))).sort();
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export class FixRecovery {
  private readonly history: string[][] = [];

  constructor(_options: FixRecoveryOptions = {}) {}

  get attempts(): number {
    return this.history.length;
  }

  /**
   * Record a diagnostic snapshot and decide whether we are stuck.
   *
   * A loop is either:
   *   - identical-attempt: the same set came back two attempts in a row, or
   *   - oscillation: a set that we already moved away from reappeared
   *     (A -> B -> A).
   *
   * A strictly shrinking set (A,B,C -> A,B -> A) is legitimate progress and
   * is never reported as a loop.
   */
  record(diagnostics: Diagnostic[]): LoopCheck {
    const set = fingerprintSet(diagnostics);
    this.history.push(set);

    const current = this.history[this.history.length - 1];
    const previous = this.history[this.history.length - 2];

    if (previous !== undefined && sameSet(current, previous)) {
      return { loopDetected: true, reason: 'repeating-attempt', repeatCount: 2 };
    }

    // Oscillation: current set matches a set from two or more attempts ago.
    for (let i = 0; i < this.history.length - 2; i++) {
      if (sameSet(current, this.history[i])) {
        return {
          loopDetected: true,
          reason: 'oscillation',
          repeatCount: this.history.length - i,
        };
      }
    }

    return { loopDetected: false, repeatCount: 1 };
  }

  measureProgress(before: Diagnostic[], after: Diagnostic[]): FixProgressMetrics {
    const beforeSet = new Set(fingerprintSet(before));
    const afterSet = new Set(fingerprintSet(after));

    let resolved = 0;
    for (const fp of beforeSet) if (!afterSet.has(fp)) resolved++;

    let introduced = 0;
    for (const fp of afterSet) if (!beforeSet.has(fp)) introduced++;

    const delta = afterSet.size - beforeSet.size;

    return {
      errorsBefore: beforeSet.size,
      errorsAfter: afterSet.size,
      resolved,
      introduced,
      delta,
      // Progress means we either removed something or introduced nothing new.
      improved: resolved > 0 && introduced === 0,
    };
  }

  /**
   * Diagnostics present after but never seen in ANY earlier snapshot.
   * Already-known remaining errors are "previously hidden downstream
   * problems", not new regressions.
   */
  detectRegression(_before: Diagnostic[], after: Diagnostic[]): Diagnostic[] {
    const seenAll = new Set<string>();
    for (const set of this.history) {
      for (const fp of set) seenAll.add(fp);
    }
    return after.filter((d) => !seenAll.has(d.fingerprint));
  }

  reset(): void {
    this.history.length = 0;
  }
}
