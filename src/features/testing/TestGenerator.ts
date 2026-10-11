// Test Generator - Generates tests for code
import { AIService, AIMessage } from '../../services/aiService';

export interface GeneratedTest {
  file: string;
  name: string;
  code: string;
  description: string;
}

export class TestGenerator {
  private aiService: AIService;

  constructor(aiConfig: { provider: string; apiKey: string; model: string }) {
    this.aiService = new AIService({
      provider: aiConfig.provider as any,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
    });
  }

  async generateTests(file: string, content: string): Promise<GeneratedTest[]> {
    const prompt = `Generate comprehensive tests for this code:

File: ${file}
\`\`\`
${content}
\`\`\`

Generate tests that cover:
- Happy path
- Edge cases
- Error handling
- Boundary conditions

Response as JSON array:
[
  {
    "file": "test_file.test.ts",
    "name": "test name",
    "code": "test code",
    "description": "what this tests"
  }
]`;

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a test generator. Write comprehensive, maintainable tests.',
      },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.aiService.chat(messages, { temperature: 0.3 });
      return JSON.parse(response.content);
    } catch {
      return [];
    }
  }

  async generateEdgeCases(functionName: string, signature: string): Promise<string[]> {
    const prompt = `Generate edge cases for function: ${functionName}

Signature: ${signature}

List edge cases as JSON array of strings.`;

    const messages: AIMessage[] = [
      { role: 'system', content: 'You are a test case generator.' },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.aiService.chat(messages, { temperature: 0.5 });
      return JSON.parse(response.content);
    } catch {
      return [];
    }
  }
}
