// Fix Progress Component - Shows progress of fixing operation
import React from 'react';

export interface FixStage {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
}

export interface FixProgressProps {
  stages: FixStage[];
  currentAttempt: number;
  maxAttempts: number;
}

export function FixProgress({ stages, currentAttempt, maxAttempts }: FixProgressProps) {
  const getStatusIcon = (status: FixStage['status']) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'running':
        return '●';
      case 'failed':
        return '✗';
      case 'pending':
        return '○';
    }
  };

  const getStatusColor = (status: FixStage['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'running':
        return 'text-blue-400 animate-pulse';
      case 'failed':
        return 'text-red-400';
      case 'pending':
        return 'text-gray-500';
    }
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium text-gray-300">
          Attempt {currentAttempt} of {maxAttempts}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(currentAttempt / maxAttempts) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {stages.map((stage, index) => (
          <div key={index} className="flex items-center gap-3 text-sm">
            <span className={`w-6 text-center ${getStatusColor(stage.status)}`}>
              {getStatusIcon(stage.status)}
            </span>
            <span className={stage.status === 'running' ? 'text-white font-medium' : 'text-gray-400'}>
              {stage.name}
            </span>
            {stage.message && (
              <span className="text-xs text-gray-500">- {stage.message}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
