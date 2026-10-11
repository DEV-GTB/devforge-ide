import { AgentService, AgentRun, AgentTask, AgentStatus } from './AgentService';
import { AgentPlanner } from './AgentPlanner';
import { AgentExecutor } from './AgentExecutor';
import { AgentVerifier } from './AgentVerifier';
import { AgentMemory } from './AgentMemory';
import { ToolRegistry } from './tools/ToolRegistry';
import { AgentPolicy } from './AgentPolicy';

export interface AgentConfig {
  maxIterations: number;
  timeout: number;
  autoApproveSafe: boolean;
  requireApprovalForDestructive: boolean;
}

export class AgentOrchestrator {
  private service: AgentService;
  private planner: AgentPlanner;
  private executor: AgentExecutor;
  private verifier: AgentVerifier;
  private memory: AgentMemory;
  private toolRegistry: ToolRegistry;
  private policy: AgentPolicy;
  private config: AgentConfig;
  private currentRun: AgentRun | null = null;
  private abortController: AbortController | null = null;

  constructor(service: AgentService, config: Partial<AgentConfig> = {}) {
    this.service = service;
    this.config = {
      maxIterations: 10,
      timeout: 300000, // 5 minutes
      autoApproveSafe: true,
      requireApprovalForDestructive: true,
      ...config,
    };

    this.memory = new AgentMemory();
    this.toolRegistry = new ToolRegistry();
    this.policy = new AgentPolicy();
    this.planner = new AgentPlanner(this.toolRegistry, this.memory);
    this.executor = new AgentExecutor(this.toolRegistry, this.policy, this.memory, service);
    this.verifier = new AgentVerifier(this.toolRegistry, this.memory);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.service.on('run.created', (run: AgentRun) => {
      this.currentRun = run;
    });
  }

  async execute(projectId: string, userId: string, goal: string): Promise<AgentRun> {
    const run = this.service.createRun(projectId, userId, goal);
    this.abortController = new AbortController();

    try {
      await this.runAgentLoop(run);
    } catch (error) {
      if (error.name !== 'AbortError') {
        this.service.failRun(run.id, error instanceof Error ? error.message : String(error));
      }
    }

    return run;
  }

  private async runAgentLoop(run: AgentRun): Promise<void> {
    this.service.updateRunStatus(run.id, 'ANALYZING');
    this.service.addMessage(run.id, 'system', 'Starting autonomous coding agent...');

    // Phase 1: Analyze project
    await this.analyzeProject(run);

    // Phase 2: Plan
    this.service.updateRunStatus(run.id, 'PLANNING');
    const plan = await this.planner.createPlan(run.goal, run.projectId);
    run.tasks = plan.tasks;

    this.service.addMessage(run.id, 'system', `Plan created with ${plan.tasks.length} tasks`);

    // Phase 3: Execute tasks
    this.service.updateRunStatus(run.id, 'EDITING');
    await this.executeTasks(run);

    // Phase 4: Verify
    this.service.updateRunStatus(run.id, 'VERIFYING');
    const verification = await this.verifier.verify(run);

    // Complete
    this.service.completeRun(run.id, verification);
  }

  private async analyzeProject(run: AgentRun): Promise<void> {
    this.service.addMessage(run.id, 'system', 'Analyzing project structure...');

    // Store project context in memory
    const projectStructure = await this.toolRegistry.execute('get_project_structure', {
      projectId: run.projectId,
    });

    this.memory.set('project_structure', projectStructure);
    this.memory.set('project_id', run.projectId);
  }

  private async executeTasks(run: AgentRun): Promise<void> {
    const completedTasks = new Set<string>();
    let iterations = 0;

    while (completedTasks.size < run.tasks.length && iterations < this.config.maxIterations) {
      iterations++;

      // Find next executable task (dependencies satisfied)
      const nextTask = run.tasks.find(task => {
        if (completedTasks.has(task.id)) return false;
        if (!task.dependsOn) return true;
        return task.dependsOn.every(dep => completedTasks.has(dep));
      });

      if (!nextTask) break;

      // Execute task
      this.service.updateTaskStatus(run.id, nextTask.id, 'in_progress');
      this.service.addMessage(run.id, 'system', `Executing: ${nextTask.title}`);

      try {
        await this.executor.executeTask(run, nextTask);
        this.service.updateTaskStatus(run.id, nextTask.id, 'completed');
        completedTasks.add(nextTask.id);
      } catch (error) {
        this.service.updateTaskStatus(run.id, nextTask.id, 'failed');
        this.service.addError(
          run.id,
          'TASK_FAILED',
          'error',
          error instanceof Error ? error.message : String(error)
        );

        // Try to fix
        this.service.updateRunStatus(run.id, 'DEBUGGING');
        await this.handleTaskFailure(run, nextTask, error);
      }
    }
  }

  private async handleTaskFailure(run: AgentRun, task: AgentTask, error: any): Promise<void> {
    this.service.addMessage(run.id, 'system', `Attempting to fix failure in: ${task.title}`);

    // Simple retry strategy
    try {
      await this.executor.executeTask(run, task);
      this.service.updateTaskStatus(run.id, task.id, 'completed');
      this.service.addMessage(run.id, 'system', 'Task fixed successfully');
    } catch (retryError) {
      this.service.addMessage(run.id, 'system', 'Could not fix task automatically');
      throw retryError;
    }
  }

  cancel(runId: string): void {
    this.abortController?.abort();
    this.service.cancelRun(runId);
  }

  getStatus(): AgentStatus {
    return this.currentRun?.status || 'IDLE';
  }
}
