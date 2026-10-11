// Agent Orchestrator - Main coordinator for autonomous coding
import { AgentState, AgentType, AgentMessage, AgentPermission, ToolContext, ToolResult } from '../../../types/agent';
import { AgentPlanner } from './AgentPlanner';
import { AgentExecutor } from './AgentExecutor';
import { AgentVerifier } from './AgentVerifier';
import { AgentMemory } from './AgentMemory';

export class AgentOrchestrator {
  private planner: AgentPlanner;
  private executor: AgentExecutor;
  private verifier: AgentVerifier;
  private memory: AgentMemory;
  private currentState: AgentState = 'IDLE';
  private messageBus: Map<string, AgentMessage[]> = new Map();

  constructor(
    private projectId: string,
    private permissions: AgentPermission,
    private aiConfig: { provider: string; apiKey: string; model: string }
  ) {
    this.planner = new AgentPlanner(projectId, aiConfig);
    this.executor = new AgentExecutor(projectId, permissions, aiConfig);
    this.verifier = new AgentVerifier(projectId, aiConfig);
    this.memory = new AgentMemory(projectId);
  }

  async processRequest(userRequest: string): Promise<AgentPlanResult> {
    this.currentState = 'PLANNING';

    try {
      // 1. Analyze project context
      const context = await this.memory.getProjectContext();

      // 2. Create plan
      const plan = await this.planner.createPlan(userRequest, context);
      this.emitMessage('orchestrator', 'user', `Plan created with ${plan.steps.length} steps`);

      // 3. Execute plan
      this.currentState = 'WORKING';
      const results: AgentStepResult[] = [];

      for (const step of plan.steps) {
        this.emitMessage('orchestrator', step.agent, `Starting: ${step.description}`);

        const result = await this.executor.executeStep(step);
        results.push(result);

        if (!result.success) {
          this.currentState = 'FAILED';
          return {
            success: false,
            plan,
            results,
            error: result.error,
          };
        }

        this.emitMessage(step.agent, 'orchestrator', `Completed: ${step.description}`);
      }

      // 4. Verify results
      this.currentState = 'REVIEWING';
      const verification = await this.verifier.verifyAll(results);

      if (!verification.success) {
        this.currentState = 'FAILED';
        return {
          success: false,
          plan,
          results,
          error: verification.error,
        };
      }

      // 5. Save to memory
      await this.memory.saveSession(userRequest, plan, results);

      this.currentState = 'COMPLETED';
      return {
        success: true,
        plan,
        results,
      };
    } catch (error) {
      this.currentState = 'FAILED';
      return {
        success: false,
        plan: { steps: [], estimatedDuration: 0, dependencies: [] },
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getState(): AgentState {
    return this.currentState;
  }

  private emitMessage(from: string, to: string, message: string): void {
    const msg: AgentMessage = {
      taskId: crypto.randomUUID(),
      from,
      to,
      message,
      timestamp: new Date(),
    };

    const messages = this.messageBus.get(to) || [];
    messages.push(msg);
    this.messageBus.set(to, messages);
  }

  getMessages(recipient: string): AgentMessage[] {
    return this.messageBus.get(recipient) || [];
  }
}

export interface AgentPlanResult {
  success: boolean;
  plan: AgentPlan;
  results: AgentStepResult[];
  error?: string;
}

export interface AgentPlan {
  steps: AgentPlanStep[];
  estimatedDuration: number;
  dependencies: string[];
}

export interface AgentPlanStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  agent: AgentType;
  files?: string[];
}

export interface AgentStepResult {
  stepId: string;
  success: boolean;
  output: string;
  filesChanged: string[];
  error?: string;
}
