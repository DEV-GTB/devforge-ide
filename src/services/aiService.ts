// AI Service - Nexus AI gateway. Provider details are internal only and are
// never surfaced to the user interface.
export type AIProvider = 'groq' | 'huggingface' | 'openrouter' | 'together';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class AIService {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async chat(messages: AIMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<AIResponse> {
    switch (this.config.provider) {
      case 'groq':
        return this.chatGroq(messages, options);
      case 'huggingface':
        return this.chatHuggingFace(messages, options);
      case 'openrouter':
        return this.chatOpenRouter(messages, options);
      case 'together':
        return this.chatTogether(messages, options);
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  private async chatGroq(messages: AIMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<AIResponse> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model || 'llama-3.3-70b-versatile',
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI provider error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  private async chatHuggingFace(messages: AIMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<AIResponse> {
    // Convert messages to the inference format expected by the provider.
    // Instruction-tuned chat models use the [INST] format.
    const prompt = this.formatHuggingFacePrompt(messages);

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${this.config.model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            temperature: options?.temperature ?? 0.7,
            max_new_tokens: options?.maxTokens ?? 2048,
            return_full_text: false,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI provider error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // Handle different response formats
    if (Array.isArray(data)) {
      return {
        content: data[0].generated_text || data[0].text || '',
      };
    }

    if (data.generated_text) {
      return {
        content: data.generated_text,
      };
    }

    if (data.text) {
      return {
        content: data.text,
      };
    }

    throw new Error('Unexpected response format from AI provider');
  }

  private formatHuggingFacePrompt(messages: AIMessage[]): string {
    // Detect instruction-tuned chat models that require the [INST] format.
    const isMistral = this.config.model.includes('mistral') || this.config.model.includes('Mistral');

    if (isMistral) {
      // Instruction-tuned models use the [INST] format
      let prompt = '';
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.role === 'user') {
          if (i === 0) {
            prompt += `<s>[INST] ${msg.content} [/INST]`;
          } else {
            prompt += `[INST] ${msg.content} [/INST]`;
          }
        } else if (msg.role === 'assistant') {
          prompt += ` ${msg.content} </s>`;
        } else if (msg.role === 'system') {
          prompt += `<s>[INST] ${msg.content}\n\n`;
        }
      }
      return prompt;
    }

    // Default format for other models
    return messages.map(msg => {
      if (msg.role === 'system') {
        return `System: ${msg.content}`;
      } else if (msg.role === 'user') {
        return `User: ${msg.content}`;
      } else {
        return `Assistant: ${msg.content}`;
      }
    }).join('\n');
  }

  private async chatOpenRouter(messages: AIMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<AIResponse> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model || 'mistralai/mistral-7b-instruct',
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI provider error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  private async chatTogether(messages: AIMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<AIResponse> {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model || 'mistralai/Mistral-7B-Instruct-v0.2',
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI provider error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }
}
