import { Logger } from '../../agent/src/utils/logger';

export type AgentStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

export interface AgentConfig {
  name: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface AgentTask {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export abstract class Agent {
  protected name: string;
  protected status: AgentStatus = 'idle';
  protected logger: Logger;
  protected tasks: AgentTask[] = [];
  protected config: AgentConfig;

  constructor(name: string, config: AgentConfig = { name }) {
    this.name = name;
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      ...config,
    };
    this.logger = new Logger();
  }

  abstract execute(task: string): Promise<string>;

  async run(task: string): Promise<string> {
    this.status = 'running';
    this.logger.info(`${this.name} started`, { task });

    const taskObj: AgentTask = {
      id: this.generateTaskId(),
      description: task,
      status: 'in_progress',
    };
    this.tasks.push(taskObj);

    try {
      const result = await this.withTimeout(
        this.execute(task),
        this.config.timeout!
      );

      taskObj.status = 'completed';
      taskObj.result = result;
      this.status = 'completed';
      this.logger.info(`${this.name} completed successfully`);

      return result;
    } catch (error) {
      taskObj.status = 'failed';
      taskObj.error = error instanceof Error ? error.message : String(error);
      this.status = 'failed';
      this.logger.error(`${this.name} failed`, { error });

      throw error;
    }
  }

  protected async withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Agent execution timeout')), timeout)
      ),
    ]);
  }

  protected async withRetry<T>(
    fn: () => Promise<T>,
    attempts: number = this.config.retryAttempts!
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`Attempt ${i + 1} failed`, { error: lastError.message });

        if (i < attempts - 1) {
          await this.sleep(1000 * (i + 1));
        }
      }
    }

    throw lastError!;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  getTasks(): AgentTask[] {
    return [...this.tasks];
  }

  getName(): string {
    return this.name;
  }

  pause(): void {
    if (this.status === 'running') {
      this.status = 'paused';
      this.logger.info(`${this.name} paused`);
    }
  }

  resume(): void {
    if (this.status === 'paused') {
      this.status = 'running';
      this.logger.info(`${this.name} resumed`);
    }
  }

  reset(): void {
    this.status = 'idle';
    this.tasks = [];
    this.logger.info(`${this.name} reset`);
  }
}
