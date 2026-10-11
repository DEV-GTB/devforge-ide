import React from 'react';
import { CheckCircle, Circle, Loader2, XCircle } from 'lucide-react';

interface AgentTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependsOn?: string[];
}

interface AgentPlanProps {
  tasks: AgentTask[];
}

export default function AgentPlan({ tasks }: AgentPlanProps) {
  const getTaskIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Circle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">Plan</h3>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-3 p-2 rounded bg-gray-800 hover:bg-gray-750 transition-colors"
          >
            <div className="mt-0.5">{getTaskIcon(task.status)}</div>
            <div className="flex-1">
              <p className="text-sm">{task.title}</p>
              {task.dependsOn && task.dependsOn.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Depends on {task.dependsOn.length} task{task.dependsOn.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
