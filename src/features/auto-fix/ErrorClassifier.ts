// Error Classifier - Classifies build errors
import { BuildError } from '../../types/build';
import { ClassifiedError } from './FixOrchestrator';
import { AIService, AIMessage } from '../../services/aiService';

export class ErrorClassifier {
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

  async classify(errors: BuildError[]): Promise<ClassifiedError[]> {
    const classified: ClassifiedError[] = [];

    for (const error of errors) {
      const category = await this.classifySingle(error);
      classified.push({
        error,
        ...category,
      });
    }

    return classified;
  }

  private async classifySingle(error: BuildError): Promise<{ category: ClassifiedError['category']; confidence: number }> {
    // Simple rule-based classification first
    const message = error.message.toLowerCase();

    if (message.includes('property') && message.includes('does not exist')) {
      return { category: 'type', confidence: 0.9 };
    }
    if (message.includes('cannot find module') || message.includes('module not found')) {
      return { category: 'import', confidence: 0.95 };
    }
    if (message.includes('syntax error') || message.includes('unexpected token')) {
      return { category: 'syntax', confidence: 0.9 };
    }
    if (message.includes('is not defined') || message.includes('reference error')) {
      return { category: 'runtime', confidence: 0.85 };
    }

    // Use AI for ambiguous cases
    const prompt = `Classify this error message: "${error.message}"

Categories:
- type: Type errors, missing properties, wrong types
- syntax: Syntax errors, parsing errors
- runtime: Runtime errors, undefined variables
- dependency: Missing dependencies, version conflicts
- import: Import/export errors, module not found

Response as JSON: {"category": "...", "confidence": 0.0-1.0}`;

    const messages: AIMessage[] = [
      { role: 'system', content: 'You are an error classifier. Be precise.' },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.aiService.chat(messages, { temperature: 0.1 });
      return JSON.parse(response.content);
    } catch {
      return { category: 'runtime', confidence: 0.5 };
    }
  }
}
