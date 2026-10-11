import React from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface AgentStatusProps {
  status: string;
  onCancel: () => void;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  IDLE: { icon: <Clock className="w-4 h-4" />, color: 'text-gray-400', label: 'Idle' },
  ANALYZING: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-blue-400', label: 'Analyzing' },
  PLANNING: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-purple-400', label: 'Planning' },
  EDITING: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-yellow-400', label: 'Editing' },
  BUILDING: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-orange-400', label: 'Building' },
  TESTING: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-cyan-400', label: 'Testing' },
  DEBUGGING: { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-400', label: 'Debugging' },
  VERIFYING: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-green-400', label: 'Verifying' },
  COMPLETED: { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-400', label: 'Completed' },
  FAILED: { icon: <XCircle className="w-4 h-4" />, color: 'text-red-400', label: 'Failed' },
  CANCELLED: { icon: <XCircle className="w-4 h-4" />, color: 'text-gray-400', label: 'Cancelled' },
};

export default function AgentStatus({ status, onCancel }: AgentStatusProps) {
  const config = statusConfig[status] || statusConfig.IDLE;
  const isActive = status !== 'IDLE' && status !== 'COMPLETED' && status !== 'FAILED' && status !== 'CANCELLED';

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center gap-2">
        <span className={config.color}>{config.icon}</span>
        <span className="text-sm font-medium">{config.label}</span>
      </div>
      {isActive && (
        <button
          onClick={onCancel}
          className="text-xs bg-red-600 hover:bg-red-700 px-3 py-1 rounded transition-colors"
        >
          Stop
        </button>
      )}
    </div>
  );
}
