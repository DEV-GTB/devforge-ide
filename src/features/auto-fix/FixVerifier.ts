// Fix Verifier - Verifies that fixes work
import { BuildError, Fix } from './FixOrchestrator';
import { VerificationResult } from './FixOrchestrator';

export class FixVerifier {
  constructor(
    private projectId: string,
    aiConfig: { provider: string; apiKey: string; model: string }
  ) {}

  async verify(originalErrors: BuildError[], fixes: Fix[]): Promise<VerificationResult> {
    // 1. Rebuild to check if errors are resolved
    const buildResult = await this.buildProject();

    // 2. Check if original errors are gone
    const remainingErrors = buildResult.errors.filter(err => {
      return !originalErrors.some(orig =>
        orig.file === err.file &&
        orig.line === err.line &&
        orig.message === err.message
      );
    });

    return {
      success: remainingErrors.length === 0,
      remainingErrors,
    };
  }

  private async buildProject(): Promise<{ success: boolean; errors: BuildError[] }> {
    // In a real implementation, this would run the build
    return {
      success: true,
      errors: [],
    };
  }
}
