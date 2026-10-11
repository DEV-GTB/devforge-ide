// Vision Agent - Analyzes screenshots and UI
import { AIService, AIMessage } from '../../services/aiService';

export interface VisionAnalysis {
  issues: VisualIssue[];
  suggestions: string[];
  overallScore: number;
}

export interface VisualIssue {
  type: 'alignment' | 'spacing' | 'color' | 'typography' | 'responsiveness' | 'accessibility';
  description: string;
  severity: 'low' | 'medium' | 'high';
  location?: string;
}

export class VisionAgent {
  private aiService: AIService;

  constructor(aiConfig: { provider: string; apiKey: string; model: string }) {
    this.aiService = new AIService({
      provider: aiConfig.provider as any,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
    });
  }

  async analyzeScreenshot(imageData: string, description?: string): Promise<VisionAnalysis> {
    // In a real implementation, this would use a vision model
    // For now, use text-based analysis with AI description

    const prompt = description
      ? `Analyze this UI for issues:\n\n${description}\n\n`
      : 'Analyze this UI for visual issues.\n\n';

    const fullPrompt = prompt + `Check for:
- Alignment issues
- Inconsistent spacing
- Color contrast problems
- Typography issues
- Responsiveness problems
- Accessibility concerns

Response as JSON:
{
  "issues": [
    {
      "type": "alignment|spacing|color|typography|responsiveness|accessibility",
      "description": "issue description",
      "severity": "low|medium|high",
      "location": "optional location"
    }
  ],
  "suggestions": ["suggestion1", "suggestion2"],
  "overallScore": 0-100
}`;

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'You are a UI/UX expert. Analyze interfaces for visual and usability issues.',
      },
      { role: 'user', content: fullPrompt },
    ];

    try {
      const response = await this.aiService.chat(messages, { temperature: 0.3 });
      return JSON.parse(response.content);
    } catch {
      return {
        issues: [],
        suggestions: [],
        overallScore: 85,
      };
    }
  }

  async compareScreenshots(before: string, after: string): Promise<VisualDiff> {
    const prompt = `Compare two UI states and describe the changes.

Response as JSON:
{
  "changes": ["change1", "change2"],
  "improvements": ["improvement1"],
  "regressions": ["regression1"],
  "score": -100 to 100
}`;

    const messages: AIMessage[] = [
      { role: 'system', content: 'You are a visual diff analyzer.' },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.aiService.chat(messages, { temperature: 0.2 });
      return JSON.parse(response.content);
    } catch {
      return {
        changes: [],
        improvements: [],
        regressions: [],
        score: 0,
      };
    }
  }
}

export interface VisualDiff {
  changes: string[];
  improvements: string[];
  regressions: string[];
  score: number;
}
