// Build With Me Planner - Plans build sessions
import { AIService, AIMessage } from '../../services/aiService';

export interface BuildPlan {
  goal: string;
  tasks: BuildTask[];
  estimatedTime: number;
  technology: string;
}

export interface BuildTask {
  id: string;
  description: string;
  agent: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  files?: string[];
}

export class BuildPlanner {
  private aiService: AIService;

  constructor(aiConfig: { provider: string; apiKey: string; model: string }) {
    this.aiService = new AIService({
      provider: aiConfig.provider as any,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
    });
  }

  async createPlan(goal: string, context: BuildContext): Promise<BuildPlan> {
    const prompt = `User wants to build: ${goal}

Project context:
- Current tech stack: ${context.currentStack}
- Existing files: ${context.existingFiles.join(', ')}

Create a detailed build plan. Break down into specific tasks.

Response as JSON:
{
  "goal": "rephrased goal",
  "tasks": [
    {
      "id": "task_1",
      "description": "specific task",
      "agent": "frontend|backend|testing|reviewer",
      "files": ["file1.ts"]
    }
  ],
  "estimatedTime": 300,
  "technology": "React + TypeScript"
}`;

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a project planner. Create detailed, actionable build plans.',
      },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.aiService.chat(messages, { temperature: 0.3 });
      const parsed = JSON.parse(response.content);
      return {
        ...parsed,
        tasks: parsed.tasks.map((t: any) => ({ ...t, status: 'pending' as const })),
      };
    } catch {
      // Fallback plan
      return {
        goal,
        tasks: [
          {
            id: 'task_1',
            description: goal,
            agent: 'frontend',
            status: 'pending',
          },
        ],
        estimatedTime: 300,
        technology: 'React + TypeScript',
      };
    }
  }
}

export interface BuildContext {
  currentStack: string;
  existingFiles: string[];
}
