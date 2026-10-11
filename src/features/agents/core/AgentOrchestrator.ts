import { Agent, AgentStatus } from './Agent';
import { Logger } from '../../agent/src/utils/logger';

export interface OrchestratorConfig {
  maxConcurrentAgents?: number;
  timeout?: number;
}

export class AgentOrchestrator {
  private agents: Map<string, Agent> = new Map();
  private logger: Logger;
  private config: OrchestratorConfig;
  private runningAgents: Set<string> = new Set();

  constructor(config: OrchestratorConfig = {}) {
    this.config = {
      maxConcurrentAgents: 3,
      timeout: 60000,
      ...config,
    };
    this.logger = new Logger();
  }

  registerAgent(agent: Agent): void {
    this.agents.set(agent.getName(), agent);
    this.logger.info(`Agent registered: ${agent.getName()}`);
  }

  unregisterAgent(agentName: string): void {
    this.agents.delete(agentName);
    this.logger.info(`Agent unregistered: ${agentName}`);
  }

  getAgent(agentName: string): Agent | undefined {
    return this.agents.get(agentName);
  }

  async executeAgent(agentName: string, task: string): Promise<string> {
    const agent = this.agents.get(agentName);

    if (!agent) {
      throw new Error(`Agent not found: ${agentName}`);
    }

    if (this.runningAgents.size >= this.config.maxConcurrentAgents!) {
      throw new Error('Maximum concurrent agents reached');
    }

    this.runningAgents.add(agentName);
    this.logger.info(`Executing agent: ${agentName}`);

    try {
      const result = await agent.run(task);
      return result;
    } finally {
      this.runningAgents.delete(agentName);
    }
  }

  async executeParallel(agentTasks: Array<{ agent: string; task: string }>): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    if (agentTasks.length > this.config.maxConcurrentAgents!) {
      throw new Error(
        `Too many parallel tasks. Max: ${this.config.maxConcurrentAgents}, Requested: ${agentTasks.length}`
      );
    }

    const promises = agentTasks.map(async ({ agent, task }) => {
      try {
        const result = await this.executeAgent(agent, task);
        results.set(agent, result);
      } catch (error) {
        this.logger.error(`Agent ${agent} failed`, { error });
        results.set(agent, `Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    await Promise.all(promises);
    return results;
  }

  async executeSequential(agentTasks: Array<{ agent: string; task: string }>): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const { agent, task } of agentTasks) {
      try {
        const result = await this.executeAgent(agent, task);
        results.set(agent, result);
      } catch (error) {
        this.logger.error(`Agent ${agent} failed`, { error });
        results.set(agent, `Error: ${error instanceof Error ? error.message : String(error)}`);
        break;
      }
    }

    return results;
  }

  getStatus(): {
    total: number;
    running: number;
    idle: number;
    failed: number;
    completed: number;
  } {
    let running = 0;
    let idle = 0;
    let failed = 0;
    let completed = 0;

    for (const agent of this.agents.values()) {
      switch (agent.getStatus()) {
        case 'running':
          running++;
          break;
        case 'idle':
          idle++;
          break;
        case 'failed':
          failed++;
          break;
        case 'completed':
          completed++;
          break;
      }
    }

    return {
      total: this.agents.size,
      running,
      idle,
      failed,
      completed,
    };
  }

  pauseAll(): void {
    for (const agent of this.agents.values()) {
      agent.pause();
    }
    this.logger.info('All agents paused');
  }

  resumeAll(): void {
    for (const agent of this.agents.values()) {
      agent.resume();
    }
    this.logger.info('All agents resumed');
  }

  resetAll(): void {
    for (const agent of this.agents.values()) {
      agent.reset();
    }
    this.runningAgents.clear();
    this.logger.info('All agents reset');
  }

  getRunningAgents(): string[] {
    return Array.from(this.runningAgents);
  }

  getAvailableAgents(): string[] {
    return Array.from(this.agents.keys()).filter(
      name => !this.runningAgents.has(name)
    );
  }
}
