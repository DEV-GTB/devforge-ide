// Build With Me Panel UI
import React, { useState } from 'react';
import { BuildPlanner, BuildPlan, BuildTask } from './BuildPlanner';

export function BuildWithMePanel({ projectId, aiConfig }: { projectId: string; aiConfig: any }) {
  const [goal, setGoal] = useState('');
  const [plan, setPlan] = useState<BuildPlan | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [currentTask, setCurrentTask] = useState<number>(-1);

  const planner = new BuildPlanner(aiConfig);

  const handleStart = async () => {
    if (!goal.trim()) return;

    setIsBuilding(true);
    const buildPlan = await planner.createPlan(goal, {
      currentStack: 'React + TypeScript',
      existingFiles: ['src/App.tsx', 'src/main.tsx'],
    });

    setPlan(buildPlan);
    setIsBuilding(false);
  };

  const handleBuild = async () => {
    if (!plan) return;

    setIsBuilding(true);

    for (let i = 0; i < plan.tasks.length; i++) {
      setCurrentTask(i);
      plan.tasks[i].status = 'in_progress';
      setPlan({ ...plan });

      // Simulate task execution
      await new Promise(resolve => setTimeout(resolve, 2000));

      plan.tasks[i].status = 'completed';
      setPlan({ ...plan });
    }

    setCurrentTask(-1);
    setIsBuilding(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold mb-2">Build With Me</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="What do you want to build?"
            className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleStart}
            disabled={isBuilding}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded text-sm font-medium"
          >
            Plan
          </button>
        </div>
      </div>

      {/* Plan */}
      {plan && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-1">Goal</div>
            <div className="font-medium">{plan.goal}</div>
          </div>

          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-1">Technology</div>
            <div>{plan.technology}</div>
          </div>

          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-1">Estimated Time</div>
            <div>{Math.floor(plan.estimatedTime / 60)} minutes</div>
          </div>

          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-2">Tasks</div>
            <div className="space-y-2">
              {plan.tasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`p-3 rounded border ${
                    currentTask === index
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-gray-700 bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{index + 1}.</span>
                    <span className="flex-1">{task.description}</span>
                    <span className="text-xs px-2 py-1 rounded bg-gray-700">
                      {task.agent}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {task.status === 'completed' && (
                      <span className="text-green-400 text-sm">✓ Completed</span>
                    )}
                    {task.status === 'in_progress' && (
                      <span className="text-yellow-400 text-sm">◐ In Progress</span>
                    )}
                    {task.status === 'pending' && (
                      <span className="text-gray-400 text-sm">○ Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleBuild}
            disabled={isBuilding || plan.tasks.some(t => t.status === 'completed')}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-3 rounded-lg font-medium"
          >
            {isBuilding ? 'Building...' : 'Start Building'}
          </button>
        </div>
      )}
    </div>
  );
}
