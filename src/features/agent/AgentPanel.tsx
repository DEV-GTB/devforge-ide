import React, { useState, useEffect } from 'react';
import { Send, Play, Square, CheckCircle, XCircle, Clock, FileText, GitBranch, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AgentStatus from './AgentStatus';
import AgentPlan from './AgentPlan';
import AgentMessage from './AgentMessage';
import AgentApproval from './AgentApproval';

interface AgentRun {
  id: string;
  projectId: string;
  userId: string;
  goal: string;
  status: 'IDLE' | 'ANALYZING' | 'PLANNING' | 'EDITING' | 'BUILDING' | 'TESTING' | 'DEBUGGING' | 'VERIFYING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  tasks: AgentTask[];
  messages: AgentMessage[];
  changes: FileChange[];
  createdAt: Date;
  finishedAt?: Date;
  result?: AgentResult;
}

interface AgentTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependsOn?: string[];
}

interface AgentMessage {
  id: string;
  role: 'user' | 'system' | 'assistant';
  content: string;
  timestamp: Date;
}

interface FileChange {
  file: string;
  operation: 'create' | 'modify' | 'delete';
  additions: number;
  deletions: number;
}

interface AgentResult {
  status: 'verified' | 'partial' | 'failed';
  summary: string;
  filesChanged: number;
  tests: { passed: number; failed: number };
  build: string;
  verification: string;
}

export default function AgentPanel() {
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<any>(null);

  useEffect(() => {
    // Connect to WebSocket for real-time updates (same-origin when hosted).
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${wsProtocol}://${window.location.host}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketEvent(data);
    };

    return () => ws.close();
  }, []);

  const handleWebSocketEvent = (data: any) => {
    switch (data.type) {
      case 'agent:run_created':
        setCurrentRun(data.run);
        break;
      case 'agent:status_changed':
        if (currentRun && currentRun.id === data.runId) {
          setCurrentRun({ ...currentRun, status: data.status });
        }
        break;
      case 'agent:message_added':
        if (currentRun && currentRun.id === data.runId) {
          setCurrentRun({
            ...currentRun,
            messages: [...currentRun.messages, data.message],
          });
        }
        break;
      case 'agent:approval_required':
        setPendingApproval(data);
        break;
      case 'agent:completed':
        if (currentRun && currentRun.id === data.runId) {
          setCurrentRun({ ...currentRun, result: data.result, status: 'COMPLETED' });
        }
        break;
    }
  };

  const handleStart = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/agents/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'default',
          userId: 'user',
          goal: input,
        }),
      });

      const run = await response.json();
      setCurrentRun(run);
      setInput('');
    } catch (error) {
      console.error('Failed to start agent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!currentRun) return;

    try {
      await fetch(`/api/agents/runs/${currentRun.id}/cancel`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to cancel agent:', error);
    }
  };

  const handleApproval = async (approved: boolean) => {
    if (!pendingApproval) return;

    try {
      await fetch(`/api/agents/runs/${pendingApproval.runId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });
      setPendingApproval(null);
    } catch (error) {
      console.error('Failed to handle approval:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Terminal className="w-5 h-5 text-purple-400" />
          NEXUS Agent
        </h2>
      </div>

      {/* Status Bar */}
      {currentRun && (
        <AgentStatus status={currentRun.status} onCancel={handleCancel} />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel - Plan & Tasks */}
        <div className="w-1/3 border-r border-gray-700 overflow-y-auto p-4">
          {currentRun ? (
            <AgentPlan tasks={currentRun.tasks} />
          ) : (
            <div className="text-gray-400 text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No active agent run</p>
              <p className="text-sm mt-2">Enter a goal above to start</p>
            </div>
          )}
        </div>

        {/* Right Panel - Messages & Activity */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {currentRun?.messages.map((message) => (
              <AgentMessage key={message.id} message={message} />
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleStart()}
                placeholder="What do you want to build?"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                disabled={isLoading || !!currentRun}
              />
              <button
                onClick={handleStart}
                disabled={isLoading || !!currentRun || !input.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-4 py-2 rounded-lg flex items-center gap-2"
              >
                {isLoading ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Build
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      <AnimatePresence>
        {pendingApproval && (
          <AgentApproval
            approval={pendingApproval}
            onApprove={() => handleApproval(true)}
            onReject={() => handleApproval(false)}
          />
        )}
      </AnimatePresence>

      {/* Result Summary */}
      <AnimatePresence>
        {currentRun?.result && currentRun.status === 'COMPLETED' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="border-t border-gray-700 p-4 bg-gray-800"
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="font-semibold">Build Completed</span>
            </div>
            <p className="text-gray-300 mb-2">{currentRun.result.summary}</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Files Changed:</span>
                <span className="ml-2">{currentRun.result.filesChanged}</span>
              </div>
              <div>
                <span className="text-gray-400">Tests:</span>
                <span className="ml-2 text-green-400">{currentRun.result.tests.passed} passed</span>
                {currentRun.result.tests.failed > 0 && (
                  <span className="ml-1 text-red-400">{currentRun.result.tests.failed} failed</span>
                )}
              </div>
              <div>
                <span className="text-gray-400">Build:</span>
                <span className={`ml-2 ${currentRun.result.build === 'passed' ? 'text-green-400' : 'text-red-400'}`}>
                  {currentRun.result.build}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
