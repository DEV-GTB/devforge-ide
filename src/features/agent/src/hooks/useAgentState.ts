import { useState, useEffect, useCallback } from 'react';

export type AgentState = 'IDLE' | 'PLANNING' | 'WORKING' | 'WAITING' | 'BLOCKED' | 'REVIEWING' | 'FAILED' | 'COMPLETED';

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface AgentPlan {
  id: string;
  steps: Array<{
    id: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  }>;
}

export function useAgentState() {
  const [state, setState] = useState<AgentState>('IDLE');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const addMessage = useCallback((role: 'user' | 'assistant' | 'system', content: string) => {
    const message: AgentMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  }, []);

  const updateState = useCallback((newState: AgentState) => {
    setState(newState);
    setError(null);
  }, []);

  const setAgentError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setState('FAILED');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetAgent = useCallback(() => {
    setState('IDLE');
    setMessages([]);
    setPlan(null);
    setProgress(0);
    setError(null);
  }, []);

  const updatePlan = useCallback((newPlan: AgentPlan) => {
    setPlan(newPlan);
  }, []);

  const updateStepStatus = useCallback((stepId: string, status: 'pending' | 'in_progress' | 'completed' | 'failed') => {
    setPlan(prev => {
      if (!prev) return null;
      return {
        ...prev,
        steps: prev.steps.map(step =>
          step.id === stepId ? { ...step, status } : step
        ),
      };
    });
  }, []);

  const updateProgress = useCallback((value: number) => {
    setProgress(Math.min(100, Math.max(0, value)));
  }, []);

  return {
    state,
    messages,
    plan,
    progress,
    error,
    addMessage,
    updateState,
    setAgentError,
    clearError,
    resetAgent,
    updatePlan,
    updateStepStatus,
    updateProgress,
  };
}
