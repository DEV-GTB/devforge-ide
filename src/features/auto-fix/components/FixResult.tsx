// Fix Result Component - Shows final result of fix operation
import React from 'react';
import { FixResult as FixResultType } from '../FixOrchestrator';

export interface FixResultProps {
  result: FixResultType;
  onRetry?: () => void;
  onRollback?: () => void;
}

export function FixResult({ result, onRetry, onRollback }: FixResultProps) {
  if (result.success) {
    return (
      <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">✓</span>
          <div>
            <div className="font-medium text-green-400">Fix Complete</div>
            <div className="text-sm text-gray-400">
              Successfully fixed in {result.attempts} attempt{result.attempts !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {result.history.length > 0 && (
          <div className="mt-4 pt-4 border-t border-green-800">
            <div className="text-sm font-medium text-gray-300 mb-2">Fix History</div>
            <div className="space-y-2">
              {result.history.map((attempt, i) => (
                <div key={i} className="text-xs text-gray-400 p-2 bg-gray-800 rounded">
                  <div className="flex justify-between">
                    <span>Attempt {attempt.attempt}</span>
                    <span className="text-green-400">{attempt.verification.success ? '✓' : '✗'}</span>
                  </div>
                  <div className="mt-1">
                    {attempt.errors.length} errors → {attempt.fixes.length} fixes
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">✗</span>
        <div>
          <div className="font-medium text-red-400">Fix Failed</div>
          <div className="text-sm text-gray-400">{result.error || 'Could not fix automatically'}</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-red-800">
        <div className="text-sm text-gray-300 mb-2">
          Made {result.attempts} attempt{result.attempts !== 1 ? 's' : ''} but could not resolve issues
        </div>

        <div className="flex gap-2 mt-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
            >
              Retry
            </button>
          )}
          {onRollback && (
            <button
              onClick={onRollback}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded"
            >
              Rollback Changes
            </button>
          )}
        </div>
      </div>

      {result.history.length > 0 && (
        <div className="mt-4 pt-4 border-t border-red-800">
          <div className="text-sm font-medium text-gray-300 mb-2">Attempt History</div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {result.history.map((attempt, i) => (
              <div key={i} className="text-xs text-gray-400 p-2 bg-gray-800 rounded">
                <div className="flex justify-between">
                  <span>Attempt {attempt.attempt}</span>
                  <span className={attempt.verification.success ? 'text-green-400' : 'text-red-400'}>
                    {attempt.verification.success ? '✓' : '✗'}
                  </span>
                </div>
                <div className="mt-1">
                  {attempt.errors.length} errors remaining
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
