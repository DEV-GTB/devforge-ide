import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Clock, XCircle, Play, Pause, Trash2 } from 'lucide-react';
import { localStorageManager, ProgressStep, AgentRun } from '../../core/LocalStorageManager';

interface ProgressTrackerProps {
  taskId?: string;
  refresh?: number;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ taskId, refresh }) => {
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [taskId, refresh]);

  const loadData = async () => {
    if (taskId) {
      const taskSteps = await localStorageManager.getProgressByTask(taskId);
      setSteps(taskSteps);
    } else {
      const runs = await localStorageManager.getAgentRuns(20);
      setAgentRuns(runs);
      if (runs.length > 0) {
        setSelectedRun(runs[0].id);
        const runSteps = await localStorageManager.getProgressByTask(runs[0].id);
        setSteps(runSteps);
      }
    }
  };

  const getStatusIcon = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const clearProgress = async () => {
    if (selectedRun) {
      await localStorageManager.clearProgress(selectedRun);
      await loadData();
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Progress Tracker</h3>
        {selectedRun && (
          <button
            onClick={clearProgress}
            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Agent Runs Selector */}
      {!taskId && agentRuns.length > 0 && (
        <div className="mb-4">
          <select
            value={selectedRun || ''}
            onChange={(e) => setSelectedRun(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {agentRuns.map((run) => (
              <option key={run.id} value={run.id}>
                {run.goal.substring(0, 50)}... ({run.status})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Progress Steps */}
      <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-200px)]">
        <AnimatePresence>
          {steps.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No progress steps recorded
            </div>
          ) : (
            steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-gray-800 rounded-lg p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getStatusIcon(step.status)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">
                        Step {step.step}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                        {step.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{step.description}</p>

                    {step.error && (
                      <div className="mt-2 p-2 bg-red-900/30 rounded text-xs text-red-400">
                        {step.error}
                      </div>
                    )}

                    {step.result && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-400 cursor-pointer">
                          View Result
                        </summary>
                        <pre className="mt-1 text-xs text-gray-400 overflow-x-auto">
                          {JSON.stringify(step.result, null, 2)}
                        </pre>
                      </details>
                    )}

                    <div className="mt-2 text-xs text-gray-500">
                      {new Date(step.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
