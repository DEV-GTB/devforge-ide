import { EventEmitter } from 'events';

export type AgentStatus = 'IDLE' | 'ANALYZING' | 'READING' | 'PLANNING' | 'WAITING_APPROVAL' | 'EDITING' | 'INSTALLING' | 'BUILDING' | 'TESTING' | 'DEBUGGING' | 'VERIFYING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependsOn?: string[];
  startedAt?: Date;
  completedAt?: Date;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AgentAction {
  id: string;
  type: 'read_file' | 'write_file' | 'edit_file' | 'delete_file' | 'run_command' | 'run_tests' | 'search_code';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  input: any;
  output?: any;
  error?: string;
  timestamp: Date;
}

export interface AgentRun {
  id: string;
  projectId: string;
  userId: string;
  goal: string;
  status: AgentStatus;
  tasks: AgentTask[];
  messages: AgentMessage[];
  actions: AgentAction[];
  changes: FileChange[];
  errors: AgentError[];
  startedAt: Date;
  completedAt?: Date;
  result?: AgentResult;
}

export interface FileChange {
  id: string;
  file: string;
  operation: 'create' | 'modify' | 'delete';
  diff?: string;
  beforeHash?: string;
  afterHash?: string;
}

export interface AgentError {
  id: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
  timestamp: Date;
}

export interface AgentResult {
  status: 'verified' | 'partial' | 'failed' | 'not_verified';
  summary: string;
  filesChanged: number;
  tests?: {
    passed: number;
    failed: number;
  };
  build?: string;
  verification?: string;
}

export class AgentService extends EventEmitter {
  private runs: Map<string, AgentRun> = new Map();
  private activeRunId: string | null = null;

  createRun(projectId: string, userId: string, goal: string): AgentRun {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const run: AgentRun = {
      id: runId,
      projectId,
      userId,
      goal,
      status: 'IDLE',
      tasks: [],
      messages: [],
      actions: [],
      changes: [],
      errors: [],
      startedAt: new Date(),
    };

    this.runs.set(runId, run);
    this.activeRunId = runId;
    this.emit('run.created', run);
    return run;
  }

  getRun(runId: string): AgentRun | undefined {
    return this.runs.get(runId);
  }

  getActiveRun(): AgentRun | undefined {
    return this.activeRunId ? this.runs.get(this.activeRunId) : undefined;
  }

  updateRunStatus(runId: string, status: AgentStatus): void {
    const run = this.runs.get(runId);
    if (run) {
      run.status = status;
      this.emit('run.status_changed', { runId, status });
    }
  }

  addMessage(runId: string, role: AgentMessage['role'], content: string, metadata?: Record<string, any>): void {
    const run = this.runs.get(runId);
    if (run) {
      const message: AgentMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role,
        content,
        timestamp: new Date(),
        metadata,
      };
      run.messages.push(message);
      this.emit('run.message_added', { runId, message });
    }
  }

  addTask(runId: string, title: string, description: string, dependsOn?: string[]): AgentTask {
    const run = this.runs.get(runId);
    if (run) {
      const task: AgentTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title,
        description,
        status: 'pending',
        dependsOn,
      };
      run.tasks.push(task);
      this.emit('run.task_added', { runId, task });
      return task;
    }
    throw new Error('Run not found');
  }

  updateTaskStatus(runId: string, taskId: string, status: AgentTask['status']): void {
    const run = this.runs.get(runId);
    if (run) {
      const task = run.tasks.find(t => t.id === taskId);
      if (task) {
        task.status = status;
        if (status === 'in_progress') task.startedAt = new Date();
        if (status === 'completed' || status === 'failed') task.completedAt = new Date();
        this.emit('run.task_updated', { runId, taskId, status });
      }
    }
  }

  addAction(runId: string, type: AgentAction['type'], input: any): AgentAction {
    const run = this.runs.get(runId);
    if (run) {
      const action: AgentAction = {
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        status: 'pending',
        input,
        timestamp: new Date(),
      };
      run.actions.push(action);
      this.emit('run.action_added', { runId, action });
      return action;
    }
    throw new Error('Run not found');
  }

  updateActionResult(runId: string, actionId: string, output?: any, error?: string): void {
    const run = this.runs.get(runId);
    if (run) {
      const action = run.actions.find(a => a.id === actionId);
      if (action) {
        action.output = output;
        action.error = error;
        action.status = error ? 'failed' : 'completed';
        this.emit('run.action_updated', { runId, actionId, output, error });
      }
    }
  }

  addError(runId: string, type: string, severity: AgentError['severity'], message: string, file?: string, line?: number): void {
    const run = this.runs.get(runId);
    if (run) {
      const error: AgentError = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        severity,
        message,
        file,
        line,
        timestamp: new Date(),
      };
      run.errors.push(error);
      this.emit('run.error_added', { runId, error });
    }
  }

  completeRun(runId: string, result: AgentResult): void {
    const run = this.runs.get(runId);
    if (run) {
      run.status = 'COMPLETED';
      run.completedAt = new Date();
      run.result = result;
      this.activeRunId = null;
      this.emit('run.completed', { runId, result });
    }
  }

  failRun(runId: string, error: string): void {
    const run = this.runs.get(runId);
    if (run) {
      run.status = 'FAILED';
      run.completedAt = new Date();
      this.activeRunId = null;
      this.emit('run.failed', { runId, error });
    }
  }

  cancelRun(runId: string): void {
    const run = this.runs.get(runId);
    if (run) {
      run.status = 'CANCELLED';
      run.completedAt = new Date();
      if (this.activeRunId === runId) this.activeRunId = null;
      this.emit('run.cancelled', { runId });
    }
  }

  getAllRuns(): AgentRun[] {
    return Array.from(this.runs.values());
  }

  getRunsByProject(projectId: string): AgentRun[] {
    return Array.from(this.runs.values()).filter(r => r.projectId === projectId);
  }
}
