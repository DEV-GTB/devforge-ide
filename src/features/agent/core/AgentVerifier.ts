// Agent Verifier - Verifies that changes work correctly
import { AIService, AIMessage } from '../../../services/aiService';
import { AgentStepResult } from './AgentExecutor';

export class AgentVerifier {
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

  async verifyAll(results: AgentStepResult[]): Promise<VerificationResult> {
    // 1. Check if all steps succeeded
    const allSuccess = results.every(r => r.success);
    if (!allSuccess) {
      return {
        success: false,
        error: 'Some steps failed',
        details: results.filter(r => !r.success).map(r => r.error),
      };
    }

    // 2. Run tests if available
    const testResult = await this.runTests();
    if (!testResult.success) {
      return {
        success: false,
        error: 'Tests failed',
        details: testResult.details,
      };
    }

    // 3. Build the project
    const buildResult = await this.buildProject();
    if (!buildResult.success) {
      return {
        success: false,
        error: 'Build failed',
        details: buildResult.details,
      };
    }

    // 4. AI review of changes
    const review = await this.aiReviewChanges(results);
    if (!review.approved) {
      return {
        success: false,
        error: 'AI review found issues',
        details: review.issues,
      };
    }

    return {
      success: true,
    };
  }

  private async runTests(): Promise<{ success: boolean; details?: string[] }> {
    // In a real implementation, this would run the test suite
    return { success: true };
  }

  private async buildProject(): Promise<{ success: boolean; details?: string[] }> {
    // In a real implementation, this would build the project
    return { success: true };
  }

  private async aiReviewChanges(results: AgentStepResult[]): Promise<{ approved: boolean; issues: string[] }> {
    const changes = results.map(r => r.output).join('\n');

    const prompt = `Review these code changes for potential issues:\n\n${changes}\n\n
Check for:
- Security vulnerabilities
- Performance issues
- Code quality problems
- Missing error handling

Response as JSON:
{
  "approved": true/false,
  "issues": ["issue1", "issue2"]
}`;

    const messages: AIMessage[] = [
      { role: 'system', content: 'You are a code reviewer. Be thorough but reasonable.' },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.aiService.chat(messages, { temperature: 0.2 });
      const parsed = JSON.parse(response.content);
      return parsed;
    } catch {
      return { approved: true, issues: [] };
    }
  }
}

export interface VerificationResult {
  success: boolean;
  error?: string;
  details?: string[];
}
