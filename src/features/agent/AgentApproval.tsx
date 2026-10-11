import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface AgentApprovalProps {
  approval: {
    tool: string;
    input: any;
    riskLevel: string;
    description: string;
  };
  onApprove: () => void;
  onReject: () => void;
}

export default function AgentApproval({ approval, onApprove, onReject }: AgentApprovalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-800 rounded-lg border border-gray-700 max-w-md w-full mx-4"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-semibold">Action Requires Approval</h3>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Tool:</p>
              <p className="font-mono text-sm bg-gray-900 p-2 rounded">{approval.tool}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-1">Risk Level:</p>
              <span className={`px-2 py-1 rounded text-xs ${
                approval.riskLevel === 'high' ? 'bg-red-900/30 text-red-400' :
                approval.riskLevel === 'moderate' ? 'bg-yellow-900/30 text-yellow-400' :
                'bg-green-900/30 text-green-400'
              }`}>
                {approval.riskLevel.toUpperCase()}
              </span>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-1">Description:</p>
              <p className="text-sm">{approval.description}</p>
            </div>

            {approval.input && (
              <div>
                <p className="text-sm text-gray-400 mb-1">Input:</p>
                <pre className="text-xs bg-gray-900 p-2 rounded overflow-x-auto">
                  {JSON.stringify(approval.input, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onReject}
              className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
            >
              Reject
            </button>
            <button
              onClick={onApprove}
              className="flex-1 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
            >
              Approve
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
