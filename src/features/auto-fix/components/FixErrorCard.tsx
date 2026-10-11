// Fix Error Card Component - Shows individual error with fix action
import React from 'react';
import { BuildError } from '../../../types/build';

export interface FixErrorCardProps {
  error: BuildError;
  category?: string;
  risk?: 'low' | 'medium' | 'high';
  onViewCode?: () => void;
  onExplain?: () => void;
  onFix?: () => void;
}

export function FixErrorCard({ error, category, risk, onViewCode, onExplain, onFix }: FixErrorCardProps) {
  const getRiskColor = (risk?: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low':
        return 'bg-green-900/30 text-green-400 border-green-700';
      case 'medium':
        return 'bg-yellow-900/30 text-yellow-400 border-yellow-700';
      case 'high':
        return 'bg-red-900/30 text-red-400 border-red-700';
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  const getSeverityIcon = (severity: BuildError['severity']) => {
    switch (severity) {
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
    }
  };

  const getSeverityColor = (severity: BuildError['severity']) => {
    switch (severity) {
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
    }
  };

  return (
    <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={getSeverityColor(error.severity)}>{getSeverityIcon(error.severity)}</span>
          {error.code && (
            <span className="text-xs font-mono bg-gray-700 px-2 py-0.5 rounded text-gray-300">
              {error.code}
            </span>
          )}
          {category && (
            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-400 capitalize">
              {category}
            </span>
          )}
        </div>
        {risk && (
          <span className={`text-xs px-2 py-0.5 rounded border ${getRiskColor(risk)} capitalize`}>
            {risk} risk
          </span>
        )}
      </div>

      <div className="mb-2">
        <div className="text-sm font-medium text-white mb-1">{error.message}</div>
        <div className="text-xs text-gray-400 font-mono">
          {error.file}:{error.line}
          {error.column > 0 && `:${error.column}`}
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {onViewCode && (
          <button
            onClick={onViewCode}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
          >
            View Code
          </button>
        )}
        {onExplain && (
          <button
            onClick={onExplain}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
          >
            Explain
          </button>
        )}
        {onFix && (
          <button
            onClick={onFix}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
          >
            Fix
          </button>
        )}
      </div>
    </div>
  );
}
