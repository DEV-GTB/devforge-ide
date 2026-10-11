// TestingPanel UI - binds to the Automatic Testing Agent server API.
// The UI never runs the test process itself; it requests a run on the server
// and renders the evidence-based outcome + event log.
import React, { useState } from 'react';
import { Play, RotateCw, ShieldCheck, FlaskConical, CheckCircle2, XCircle, Clock } from 'lucide-react';

export interface TestingPanelProps {
  projectId: string;
  projectPath: string;
  apiBase?: string;
  coverage?: boolean;
}

interface TestCaseView {
  id: string;
  title: string;
  file: string;
  status: string;
  durationMs: number;
  error?: string;
}

interface TestRunOutcomeView {
  id: string;
  status: string;
  framework: string;
  totals?: { tests: number; passed: number; failed: number; skipped: number; pending: number; durationMs: number };
  suites?: Array<{ name: string; file: string; status: string; durationMs: number; testCases: TestCaseView[] }>;
  error?: { code: string; message: string };
  changedFiles?: string[];
}

const STATUS_COLORS: Record<string, string> = {
  queued: 'bg-gray-700',
  inspecting: 'bg-blue-900/30 border-blue-500',
  preparing: 'bg-blue-900/30 border-blue-500',
  validating: 'bg-yellow-900/30 border-yellow-500',
  running: 'bg-yellow-900/30 border-yellow-500',
  analyzing: 'bg-purple-900/30 border-purple-500',
  completed: 'bg-green-900/30 border-green-500',
  failed: 'bg-red-900/30 border-red-500',
  error: 'bg-red-900/30 border-red-500',
  cancelled: 'bg-gray-800 border-gray-500',
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-700'} text-white`}>
      {status}
    </span>
  );
}

export function TestingPanel({
  projectId,
  projectPath,
  apiBase = '',
  coverage = true,
}: TestingPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [run, setRun] = useState<TestRunOutcomeView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const createRun = async (repair: boolean) => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/testing/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, projectPath, coverage, repair }),
      });
      if (!res.ok) throw new Error(`Testing run failed (${res.status})`);
      const data = await res.json();
      setRun(data.outcome as TestRunOutcomeView);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  };

  const totals = run?.totals ?? { tests: 0, passed: 0, failed: 0, skipped: 0, pending: 0, durationMs: 0 };

  return (
    <div className="p-4 bg-gray-900 text-white h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-purple-400" />
          Test Agent
        </h2>
        <div className="flex items-center gap-2">
          {run && run.status !== 'error' && (
            <button
              onClick={() => createRun(true)}
              disabled={isRunning}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 text-xs"
              title="Re-run failed tests with auto-repair"
            >
              <RotateCw className="w-4 h-4" />
              Repair & Re-run
            </button>
          )}
          <button
            onClick={() => createRun(false)}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-sm"
          >
            <Play className="w-4 h-4" />
            {isRunning ? 'Running...' : 'Run Tests'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {run && (
        <div className="mb-4 flex items-center gap-3">
          <StatusPill status={run.status} />
          {run.framework && run.framework !== 'none' && (
            <span className="text-xs text-gray-400 font-mono">framework: {run.framework}</span>
          )}
          {run.error && (
            <span className="text-xs text-red-400 font-mono">{run.error.code}: {run.error.message}</span>
          )}
        </div>
      )}

      {(isRunning || run) && (
        <>
          <div className="grid grid-cols-5 gap-3 mb-4">
            <Stat label="Tests" value={totals.tests} color="text-blue-400" />
            <Stat label="Passed" value={totals.passed} color="text-green-400" />
            <Stat label="Failed" value={totals.failed} color="text-red-400" />
            <Stat label="Skipped" value={totals.skipped} color="text-gray-400" />
            <Stat label="Duration" value={totals.durationMs ? `${totals.durationMs}ms` : '--'} color="text-purple-400" />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Runs executed server-side with timeouts &amp; output caps
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 210px)' }}>
            <div className="space-y-2">
              {(run.suites ?? []).length === 0 && !run.error && (
                <div className="p-4 text-center text-sm text-gray-400">
                  {run.status === 'completed'
                    ? 'No test suites were reported.'
                    : 'Waiting for results...'}
                </div>
              )}

              {(run.suites ?? []).map((suite, index) => (
                <div
                  key={`${suite.name}-${index}`}
                  className="p-3 rounded-lg border border-gray-700 bg-gray-800"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {suite.status === 'failed' ? (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      )}
                      <span className="font-medium truncate">{suite.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
                      <span>{suite.durationMs}ms</span>
                      <button
                        onClick={() => setExpanded(expanded === suite.file ? null : suite.file)}
                        className="hover:text-white"
                      >
                        {expanded === suite.file ? 'Hide' : `${suite.testCases.length} cases`}
                      </button>
                    </div>
                  </div>

                  {expanded === suite.file && (
                    <div className="mt-2 space-y-1.5">
                      {suite.testCases.map((tc) => (
                        <div key={tc.id} className="flex items-start gap-2 py-0.5 text-xs">
                          {tc.status === 'failed' ? (
                            <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          ) : tc.status === 'passed' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <div className="text-gray-200 break-words">{tc.title}</div>
                            {tc.error && (
                              <pre className="mt-1 p-2 bg-red-950/30 border border-red-800/40 rounded text-red-300 overflow-x-auto text-[10px] leading-tight max-h-40">
                                {tc.error}
                              </pre>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!run && !isRunning && (
        <div className="mt-8 text-center text-sm text-gray-500">
          Click "Run Tests" to detect the project framework (vitest, jest, mocha) and execute the suite server-side.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 text-center">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}