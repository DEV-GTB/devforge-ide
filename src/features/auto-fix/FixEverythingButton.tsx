// Fix Everything Button UI
//
// The UI never runs the repair agent directly. It creates a fix session on the
// server and asks the server to run it, then renders the evidence-based result.
import React, { useState } from 'react';
import type { FixResult } from './FixOrchestrator';
import { FixProgress, FixStage } from './components/FixProgress';

export interface FixEverythingButtonProps {
  projectId: string;
  projectPath: string;
  aiConfig: { provider: string; apiKey: string; model: string };
  mode?: 'suggest' | 'auto' | 'autonomous';
  maxAttempts?: number;
  apiBase?: string;
}

const BASE_STAGES = [
  'Scan project',
  'Diagnose',
  'Plan fix',
  'Apply patch',
  'Verify',
];

function buildStages(isFixing: boolean, result: FixResult | null): FixStage[] {
  if (!result) {
    return BASE_STAGES.map((name, index) => ({
      name,
      status: isFixing && index === 0 ? 'running' : 'pending',
    }));
  }

  const done = result.success;
  const failed = !result.success;
  return BASE_STAGES.map((name) => ({
    name,
    status: done ? 'completed' : failed ? (name === 'Verify' ? 'failed' : 'completed') : 'pending',
  }));
}

export function FixEverythingButton({
  projectId,
  projectPath,
  aiConfig,
  mode = 'auto',
  maxAttempts = 5,
  apiBase = '',
}: FixEverythingButtonProps) {
  const [isFixing, setIsFixing] = useState(false);
  const [result, setResult] = useState<FixResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFix = async () => {
    setIsFixing(true);
    setResult(null);
    setError(null);

    try {
      const createRes = await fetch(`${apiBase}/api/fix/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, projectPath, aiConfig, mode }),
      });
      if (!createRes.ok) throw new Error(`Failed to create session (${createRes.status})`);
      const { sessionId } = await createRes.json();

      const runRes = await fetch(`${apiBase}/api/fix/session/${sessionId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, maxAttempts }),
      });
      if (!runRes.ok) throw new Error(`Fix run failed (${runRes.status})`);
      const { result: fixResult } = await runRes.json();
      setResult(fixResult as FixResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={handleFix}
        disabled={isFixing}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
      >
        {isFixing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Fixing...
          </>
        ) : (
          <>
            <span>🔧</span>
            Fix Project
          </>
        )}
      </button>

      {(isFixing || result) && (
        <div className="mt-4">
          <FixProgress
            stages={buildStages(isFixing, result)}
            currentAttempt={result?.attempts ?? 1}
            maxAttempts={result?.maxAttempts ?? maxAttempts}
          />
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-900/20 border border-red-700 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg text-sm">
          {result.success ? (
            <div className="text-green-400 font-medium">
              ✓ Project repair verified in {result.attempts} attempt
              {result.attempts !== 1 ? 's' : ''}
            </div>
          ) : (
            <div className="text-yellow-400 font-medium">
              {result.partial ? '◐ Partially fixed' : '✗ Could not fully verify a fix'}
              <div className="text-xs text-gray-400 mt-1">
                Reason: {result.reason || result.error || 'unknown'}
                {result.rolledBack ? ' (changes rolled back)' : ''}
              </div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-300">
            <div>Found: {result.errorsFound}</div>
            <div>Remaining: {result.errorsRemaining}</div>
            <div>Files changed: {result.changedFiles?.length ?? 0}</div>
            <div>Status: {result.status}</div>
          </div>

          {result.changedFiles && result.changedFiles.length > 0 && (
            <div className="mt-3 text-xs text-gray-400">
              {result.changedFiles.map((file) => (
                <div key={file} className="font-mono truncate">
                  {file}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
