// Answerer - the "AI Answer with Sources" mode. Feeds retrieved search results
// to the existing AI model and asks for a grounded answer with citations.
// Falls back to an extractive summary (no AI) when no model key is configured.
import { AIService, AIProvider } from '../../src/services/aiService';
import type { WebResult } from './SearchService';

export interface Citation {
  index: number;
  title: string;
  url: string;
  source: string;
  snippet: string;
}

export interface AnswerResult {
  answer: string;
  citations: Citation[];
  provider: string;
  grounded: boolean;
  notice?: string;
}

const PROVIDERS: AIProvider[] = ['groq', 'huggingface', 'openrouter', 'together'];

interface ResolvedAiConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

function resolveAiConfig(): ResolvedAiConfig | null {
  const explicit = (process.env.AI_PROVIDER || '').toLowerCase() as AIProvider;
  const model = process.env.AI_MODEL || 'llama-3.3-70b-versatile';

  const keyFor: Record<AIProvider, string | undefined> = {
    groq: process.env.GROQ_API_KEY,
    huggingface: process.env.HUGGINGFACE_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    together: process.env.TOGETHER_API_KEY,
  };

  if (PROVIDERS.includes(explicit) && keyFor[explicit]) {
    return { provider: explicit, apiKey: keyFor[explicit]!, model };
  }

  // Otherwise use the first provider that has a key.
  for (const provider of PROVIDERS) {
    if (keyFor[provider]) {
      return { provider, apiKey: keyFor[provider]!, model };
    }
  }
  return null;
}

/** Convert web results into numbered citations [1], [2], ... */
export function buildCitations(results: WebResult[]): Citation[] {
  return results.map((item, index) => ({
    index: index + 1,
    title: item.title,
    url: item.url,
    source: item.source,
    snippet: trim(item.description, 400),
  }));
}

export function buildContext(citations: Citation[]): string {
  return citations
    .map((c) => `[${c.index}] ${c.title}\nURL: ${c.url}\nSource: ${c.source}\nSnippet: ${c.snippet}`)
    .join('\n\n');
}

export class Answerer {
  private ai: AIService | null;
  private readonly providerName: string;

  constructor(aiConfig?: ResolvedAiConfig | null) {
    const resolved = aiConfig ?? resolveAiConfig();
    if (resolved) {
      this.ai = new AIService({
        provider: resolved.provider,
        apiKey: resolved.apiKey,
        model: resolved.model,
      });
      this.providerName = `${resolved.provider}:${resolved.model}`;
    } else {
      this.ai = null;
      this.providerName = 'extractive';
    }
  }

  isGroundedAiAvailable(): boolean {
    return this.ai !== null;
  }

  async answer(question: string, results: WebResult[], region = 'India'): Promise<AnswerResult> {
    const citations = buildCitations(results);

    if (citations.length === 0) {
      return {
        answer:
          'I could not retrieve any web sources for this question. Try a more specific query, or configure a search API key so results can be fetched inside the app.',
        citations: [],
        provider: this.providerName,
        grounded: false,
      };
    }

    if (!this.ai) {
      return {
        answer: this.extractiveSummary(question, citations),
        citations,
        provider: 'extractive',
        grounded: true,
        notice:
          'No AI model key configured. This is an extractive summary of the retrieved sources. Set AI_PROVIDER + a provider key (e.g. GROQ_API_KEY) for a written answer.',
      };
    }

    const system = [
      `You are an India and Kerala knowledgeable research assistant.`,
      `Answer the user's question using ONLY the provided web sources.`,
      `Cite sources inline using bracketed numbers like [1], [2] that match the source list.`,
      `Prefer official and local sources (${region}).`,
      `If the sources are insufficient, say so clearly instead of inventing facts.`,
      `Be concise, factual and neutral. Include relevant dates when present.`,
    ].join(' ');

    const user = `Question: ${question}\n\nWeb sources:\n${buildContext(citations)}\n\nWrite the answer with inline citations.`;

    try {
      const response = await this.ai.chat(
        [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        { temperature: 0.2, maxTokens: 1200 },
      );

      return {
        answer: response.content.trim(),
        citations,
        provider: this.providerName,
        grounded: true,
      };
    } catch (error) {
      return {
        answer: this.extractiveSummary(question, citations),
        citations,
        provider: 'extractive',
        grounded: true,
        notice: `AI answer failed (${
          error instanceof Error ? error.message : String(error)
        }). Showing an extractive summary of the sources instead.`,
      };
    }
  }

  private extractiveSummary(question: string, citations: Citation[]): string {
    const lines = citations
      .slice(0, 5)
      .map((c) => `- ${trim(c.snippet || c.title, 220)} [${c.index}]`);
    return `Summary of retrieved sources for "${question}":\n\n${lines.join('\n')}`;
  }
}

function trim(value: string, max: number): string {
  const collapsed = (value || '').replace(/\s+/g, ' ').trim();
  return collapsed.length > max ? `${collapsed.slice(0, max)}...` : collapsed;
}