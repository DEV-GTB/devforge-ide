// Fix Planner - Plans fixes for errors
import { ClassifiedError, Fix } from './FixOrchestrator';
import { AIService, AIMessage } from '../../services/aiService';

export class FixPlanner {
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

  async planFixes(errors: ClassifiedError[]): Promise<Fix[]> {
    const fixes: Fix[] = [];

    for (const classified of errors) {
      const fix = await this.planSingleFix(classified);
      if (fix) {
        fixes.push(fix);
      }
    }

    return fixes;
  }

  private async planSingleFix(classified: ClassifiedError): Promise<Fix | null> {
    const prompt = `Error in ${classified.error.file}:${classified.error.line}:
${classified.error.message}

Suggest a fix. Response as JSON:
{
  "file": "${classified.error.file}",
  "line": ${classified.error.line},
  "original": "original code line",
  "replacement": "fixed code line",
  "description": "explanation of the fix"
}`;

    const messages: AIMessage[] = [
      { role: 'system', content: 'You are a code fixer. Provide minimal, correct fixes.' },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.aiService.chat(messages, { temperature: 0.2 });
      return JSON.parse(response.content);
    } catch {
      return null;
    }
  }
}
