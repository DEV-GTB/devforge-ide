// Agent Planner - Creates execution plans
import { AgentType, AgentPlan, AgentPlanStep } from '../../../types/agent';
import { AIService, AIMessage } from '../../../services/aiService';

export class AgentPlanner {
  private aiService: AIService;

  constructor(
    private projectId: string,
    aiConfig: { provider: string; apiKey: string; model: string }
  ) {
    this.aiService = new AIService({
      provider: aiConfig.provider as any,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
    });
  }

  async createPlan(userRequest: string, context: ProjectContext): Promise<AgentPlan> {
    const prompt = this.buildPlanningPrompt(userRequest, context);

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are an expert software development planner. Break down requests into specific, actionable steps.
        
Response format (JSON):
{
  "steps": [
    {
      "id": "step_1",
      "description": "What needs to be done",
      "agent": "coding|frontend|backend|testing",
      "files": ["file1.ts", "file2.ts"]
    }
  ],
  "estimatedDuration": 300,
  "dependencies": []
}

Agent types:
- coding: General code changes
- frontend: UI/React/HTML/CSS work
- backend: API/database/server work
- testing: Test creation and execution`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await this.aiService.chat(messages, { temperature: 0.3 });

    try {
      const parsed = JSON.parse(response.content);
      return {
        steps: parsed.steps.map((s: any) => ({
          ...s,
          status: 'pending' as const,
        })),
        estimatedDuration: parsed.estimatedDuration || 300,
        dependencies: parsed.dependencies || [],
      };
    } catch (error) {
      // Fallback to simple plan
      return {
        steps: [
          {
            id: 'step_1',
            description: userRequest,
            agent: 'coding',
            status: 'pending',
          },
        ],
        estimatedDuration: 300,
        dependencies: [],
      };
    }
  }

  private buildPlanningPrompt(userRequest: string, context: ProjectContext): string {
    return `User request: ${userRequest}

Project context:
- Language: ${context.language}
- Framework: ${context.framework || 'None'}
- Key files: ${context.keyFiles.join(', ')}

Available tools:
- read_file: Read file contents
- write_file: Create/overwrite files
- edit_file: Edit specific lines
- search_code: Search codebase
- run_command: Execute terminal commands
- run_tests: Run test suite
- git_diff: Show git changes

Break this down into concrete steps. Each step should be assigned to the most appropriate agent type.`;
  }
}

export interface ProjectContext {
  language: string;
  framework?: string;
  keyFiles: string[];
  recentChanges: string[];
}
