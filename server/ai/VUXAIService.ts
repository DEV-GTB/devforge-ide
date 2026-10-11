import { config } from '../../src/core/Config';

export type AIMode = 'ask' | 'plan' | 'code';

export type AIProvider = 'cloud' | 'local';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  mode: AIMode;
  messages: AIMessage[];
  context?: {
    projectId?: string;
    files?: string[];
    language?: string;
    framework?: string;
  };
}

export interface AIResponse {
  content: string;
  model: string;
  provider: AIProvider;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class VUXAIService {
  private cloudflareAccountId: string;
  private cloudflareApiKey: string;
  private provider: AIProvider = 'cloud';

  // Available Cloudflare Text Models
  private textModels = {
    // Coding models
    '@cf/qwen/qwen2.5-coder-32b-instruct': { type: 'coding', quality: 'high', speed: 'medium' },
    '@cf/nvidia/nemotron-3-120b-a12b': { type: 'coding', quality: 'high', speed: 'slow', thinking: true },
    
    // General purpose
    '@cf/zai-org/glm-4.7-flash': { type: 'general', quality: 'medium', speed: 'fast' },
    '@cf/qwen/qwen3-30b-a3b-fp8': { type: 'general', quality: 'high', speed: 'medium' },
    '@cf/qwen/qwen3.8-27b': { type: 'general', quality: 'high', speed: 'medium' },
    '@cf/mistralai/mistral-small-3.1-24b-instruct': { type: 'general', quality: 'high', speed: 'medium' },
    
    // Vision model (also works for text)
    '@cf/meta/llama-3.2-11b-vision-instruct': { type: 'vision', quality: 'high', speed: 'medium' },
    
    // Legacy models (kept for compatibility)
    '@cf/meta/llama-3.1-8b-instruct-fp8': { type: 'general', quality: 'medium', speed: 'fast' },
    '@cf/mistral/mistral-7b-instruct-v0.2-lora': { type: 'general', quality: 'medium', speed: 'fast' },
  };

  // Verified Cloudflare Workers AI text-to-image models.
  // `output` describes how pixels come back: `base64` means a JSON body at
  // `result.image`, `binary` means the raw response body is the image bytes and
  // the Content-Type header carries the mime type.
  private imageModels: Record<string, {
    type: string; quality: string; speed: string; text: boolean;
    output: 'base64' | 'binary'; mimeType: string;
  }> = {
    '@cf/black-forest-labs/flux-1-schnell': { type: 'generation', quality: 'high', speed: 'fast', text: false, output: 'base64', mimeType: 'image/jpeg' },
    '@cf/black-forest-labs/flux-2-klein-4b': { type: 'generation', quality: 'medium', speed: 'fast', text: false, output: 'base64', mimeType: 'image/jpeg' },
    '@cf/black-forest-labs/flux-2-klein-9b': { type: 'generation', quality: 'high', speed: 'medium', text: false, output: 'base64', mimeType: 'image/jpeg' },
    '@cf/black-forest-labs/flux-2-dev': { type: 'generation', quality: 'high', speed: 'slow', text: false, output: 'base64', mimeType: 'image/jpeg' },
    '@cf/leonardo/lucid-origin': { type: 'generation', quality: 'high', speed: 'medium', text: false, output: 'binary', mimeType: 'image/jpeg' },
    '@cf/leonardo/phoenix-1.0': { type: 'generation', quality: 'high', speed: 'medium', text: false, output: 'binary', mimeType: 'image/jpeg' },
  };

  // Verified Cloudflare video generation models. These are partner models served
  // through the unified AI Gateway endpoint (`POST /ai/run` with `{ model, input }`)
  // rather than the classic `/ai/run/<model>` path.
  private videoModels: Record<string, {
    type: string; quality: string; speed: string;
    modes: string[]; maxDuration: number; audio: boolean;
  }> = {
    'black-forest-labs/flux-3-video': { type: 'video', quality: 'high', speed: 'medium', modes: ['t2v', 'i2v', 'v2v'], maxDuration: 20, audio: true },
    'lightricks/ltx-2-5-fast': { type: 'video', quality: 'high', speed: 'fast', modes: ['t2v', 'i2v'], maxDuration: 10, audio: true },
    'pixverse/v6': { type: 'video', quality: 'high', speed: 'medium', modes: ['t2v', 'i2v'], maxDuration: 15, audio: true },
    'pixverse/v5.6': { type: 'video', quality: 'high', speed: 'medium', modes: ['t2v', 'i2v'], maxDuration: 5, audio: true },
    'bytedance/seedance-2.0': { type: 'video', quality: 'high', speed: 'medium', modes: ['t2v', 'i2v'], maxDuration: 12, audio: true },
  };

  // Gemini Assistant (External API)
  private geminiEnabled = process.env.GEMINI_API_KEY ? true : false;
  private geminiApiKey = process.env.GEMINI_API_KEY || '';

  // Available Cloudflare Embedding Models
  private embeddingModels = {
    '@cf/baai/bge-small-en-v1.5': { type: 'general', dimensions: 384 },
    '@cf/baai/bge-base-en-v1.5': { type: 'general', dimensions: 768 },
    '@cf/qwen/qwen3-embedding-0.6b': { type: 'general', dimensions: 768 },
    '@cf/pfnet/plamo-embedding-1b': { type: 'general', dimensions: 768 },
    '@cf/google/embeddinggemma-300m': { type: 'general', dimensions: 300 },
  };

  // Available Cloudflare Speech Recognition Models
  private speechModels = {
    'assemblyai/universal-3.5-pro': { type: 'stt', quality: 'high', language: 'multilingual' },
    'xai/grok-stt': { type: 'stt', quality: 'high', language: 'multilingual' },
    'openai/gpt-4o-transcribe': { type: 'stt', quality: 'high', language: 'multilingual' },
  };

  // Available Cloudflare Text-to-Speech Models
  private ttsModels = {
    'elevenlabs/eleven-v3': { type: 'tts', quality: 'high', voices: true, language: false },
    'xai/grok-tts': { type: 'tts', quality: 'high', voices: false, language: true },
    'openai/tts-1-hd': { type: 'tts', quality: 'high', voices: true, language: false },
    'minimax/speech-2.8-turbo': { type: 'tts', quality: 'high', voices: true, language: false },
  };

  constructor() {
    this.cloudflareAccountId = config.getCloudflareAccountId();
    this.cloudflareApiKey = config.getCloudflareApiKey();
  }

  setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  getProvider(): AIProvider {
    return this.provider;
  }

  getDisplayName(): string {
    return this.provider === 'cloud' ? 'VUX AI Cloud' : 'VUX AI Local';
  }

  async run(request: AIRequest): Promise<AIResponse> {
    const systemPrompt = this.getSystemPrompt(request.mode, request.context);
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...request.messages,
    ];

    if (this.provider === 'cloud') {
      return this.runCloudflare(messages, request.mode);
    } else {
      return this.runLocal(messages, request.mode);
    }
  }

  private getSystemPrompt(mode: AIMode, context?: any): string {
    const basePrompt = `You are VUX AI, an intelligent coding assistant for DevForge Studio. You help developers build, debug, and optimize their projects.`;

    switch (mode) {
      case 'ask':
        return `${basePrompt}

MODE: ASK
- You are in read-only mode
- Provide helpful explanations and guidance
- Analyze code and explain how it works
- Suggest improvements but do not modify anything
- Answer questions clearly and concisely
- Focus on education and understanding
- Do not write or modify code unless explicitly asked to show an example

Context:
${context ? JSON.stringify(context, null, 2) : 'No specific context provided'}`;

      case 'plan':
        return `${basePrompt}

MODE: PLAN
- You are in planning mode
- Analyze the user's request and create a detailed execution plan
- Break down complex tasks into clear, actionable steps
- Identify dependencies between tasks
- Assess potential risks and suggest mitigations
- Provide both a high-level overview and detailed steps
- Format your response as a structured plan with clear sections
- Include: analysis, approach, tasks (numbered), dependencies, and verification steps
- Do not write actual code in this mode - only plan what needs to be done

Plan Format:
# Analysis
[Brief analysis of the request]

# Approach
[Your proposed approach]

# Tasks
1. [Task description]
   - Dependencies: [if any]
   - Risk: [low/medium/high]

2. [Task description]
   ...

# Verification
[How to verify the plan succeeds]

Context:
${context ? JSON.stringify(context, null, 2) : 'No specific context provided'}`;

      case 'code':
        return `${basePrompt}

MODE: CODE
- Generate complete, working code based on the user's request
- Follow existing project conventions and patterns
- Write clean, readable, and maintainable code
- Add appropriate error handling
- Include type definitions when using TypeScript
- Provide brief explanations for complex logic
- When modifying code, preserve unrelated functionality
- Generate production-ready code
- No permission checks needed - assume all operations are approved

Coding Guidelines:
- Use modern language features
- Follow the project's existing style
- Include necessary imports
- Handle edge cases
- Add comments only for complex logic
- Ensure code is self-contained
- Provide the complete implementation

Context:
${context ? JSON.stringify(context, null, 2) : 'No specific context provided'}`;

      default:
        return basePrompt;
    }
  }

  private async runCloudflare(messages: AIMessage[], mode: AIMode): Promise<AIResponse> {
    const model = this.selectCloudflareModel(mode);

    const body: any = { messages };

    // Add thinking parameters for Nemotron
    if (model === '@cf/nvidia/nemotron-3-120b-a12b') {
      body.extra_body = {
        chat_template_kwargs: {
          enable_thinking: true,
          low_effort: true,
        },
      };
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/ai/run/${model}`,
      {
        headers: {
          Authorization: `Bearer ${this.cloudflareApiKey}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    return {
      content: result.response || result.message || '',
      model,
      provider: 'cloud',
      usage: result.usage,
    };
  }

  private selectCloudflareModel(mode: AIMode): string {
    switch (mode) {
      case 'ask':
        // Use fast model for Q&A
        return '@cf/zai-org/glm-4.7-flash';
      case 'plan':
        // Use high-quality model for planning
        return '@cf/qwen/qwen3.8-27b';
      case 'code':
        // Use coding-optimized model
        return '@cf/qwen/qwen2.5-coder-32b-instruct';
      default:
        return '@cf/zai-org/glm-4.7-flash';
    }
  }

  private async runLocal(messages: AIMessage[], mode: AIMode): Promise<AIResponse> {
    const model = this.selectLocalModel(mode);

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: this.formatMessagesForOllama(messages),
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error('Local AI service not available. Ensure Ollama is running.');
    }

    const result = await response.json();

    return {
      content: result.response,
      model,
      provider: 'local',
    };
  }

  private selectLocalModel(mode: AIMode): string {
    switch (mode) {
      case 'ask':
        return 'llama3.1';
      case 'plan':
        return 'mistral';
      case 'code':
        return 'deepseek-coder';
      default:
        return 'llama3.1';
    }
  }

  private formatMessagesForOllama(messages: AIMessage[]): string {
    return messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
  }

  // Image Generation (verified Workers AI text-to-image models)
  async generateImage(prompt: string, options?: {
    model?: string;
    quality?: 'low' | 'medium' | 'high' | 'xhigh' | 'max' | 'auto';
    size?: string;
    aspectRatio?: string;
    guidance?: number;
    seed?: number;
    numSteps?: number;
    negativePrompt?: string;
    resolution?: string;
  }): Promise<{ image: string; imageUrl: string; mimeType: string; model: string; provider: AIProvider; state: string }> {
    const cleanPrompt = typeof prompt === 'string' ? prompt.trim() : '';
    if (!cleanPrompt) {
      throw new Error('An image prompt is required.');
    }
    if (cleanPrompt.length > 2048) {
      throw new Error('Image prompts must be 2048 characters or fewer.');
    }

    const model = this.resolveImageModel(options);
    const body = this.buildImageInput(model, cleanPrompt, options);

    const response = await this.fetchCloudflare(
      this.workersAiRunUrl(model),
      JSON.stringify(body),
      120000
    );

    if (!response.ok) {
      throw new Error(`Image generation failed (${model}): ${await this.readCloudflareError(response)}`);
    }

    // Partner image models (Leonardo) stream the image bytes back directly.
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.startsWith('image/')) {
      const buffer = Buffer.from(await response.arrayBuffer());
      const mimeType = contentType.split(';')[0].trim() || this.imageModels[model]?.mimeType || 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
      return { image: dataUrl, imageUrl: dataUrl, mimeType, model, provider: 'cloud', state: 'Completed' };
    }

    const payload: any = await response.json().catch(() => null);
    const base64 = this.findBase64Image(payload);
    if (!base64) {
      throw new Error(`Image generation returned no image data (${model}).`);
    }
    const mimeType = this.imageModels[model]?.mimeType || 'image/jpeg';
    const dataUrl = base64.startsWith('data:') ? base64 : `data:${mimeType};base64,${base64}`;
    return {
      image: dataUrl,
      imageUrl: dataUrl,
      mimeType,
      model,
      provider: 'cloud',
      state: String(payload?.state || 'Completed'),
    };
  }

  resolveImageModel(options?: { model?: string }): string {
    const requested = options?.model;
    if (requested) {
      if (this.imageModels[requested]) return requested;
      throw new Error(`Unknown image model "${requested}".`);
    }
    // Flux schnell is the fastest, most widely available default.
    return '@cf/black-forest-labs/flux-1-schnell';
  }

  private buildImageInput(
    model: string,
    prompt: string,
    options?: { seed?: number; numSteps?: number; negativePrompt?: string; guidance?: number; size?: string }
  ): Record<string, unknown> {
    const input: Record<string, unknown> = { prompt };
    if (options?.seed != null) input.seed = options.seed;

    if (model === '@cf/black-forest-labs/flux-1-schnell') {
      if (options?.numSteps != null) input.steps = this.clamp(Math.round(options.numSteps), 1, 8);
    } else if (model.startsWith('@cf/black-forest-labs/flux-2')) {
      if (options?.numSteps != null) input.steps = this.clamp(Math.round(options.numSteps), 1, 50);
    } else if (model.startsWith('@cf/leonardo/')) {
      if (options?.negativePrompt) input.negative_prompt = options.negativePrompt;
      if (options?.numSteps != null) input.steps = Math.round(options.numSteps);
      if (options?.guidance != null) input.guidance = options.guidance;
      const dims = this.parseSize(options?.size);
      if (dims) {
        input.width = dims.width;
        input.height = dims.height;
      }
    }
    return input;
  }

  // Video Generation (verified partner models via the AI Gateway unified endpoint)
  async generateVideo(prompt: string, options?: {
    model?: string;
    mode?: 't2v' | 'i2v' | 'v2v';
    duration?: number | 'auto' | string;
    resolution?: string;
    generateAudio?: boolean;
    aspectRatio?: string;
    fps?: number;
    image?: string;
    imageUri?: string;
    timeoutMs?: number;
  }): Promise<{ videoUrl: string; model: string; provider: AIProvider; state: string }> {
    const cleanPrompt = typeof prompt === 'string' ? prompt.trim() : '';
    if (!cleanPrompt) {
      throw new Error('A video prompt is required.');
    }
    if (cleanPrompt.length > 2000) {
      throw new Error('Video prompts must be 2000 characters or fewer.');
    }

    const model = this.resolveVideoModel(options);
    const input = this.buildVideoInput(model, cleanPrompt, options);

    const response = await this.fetchCloudflare(
      this.gatewayRunUrl(),
      JSON.stringify({ model, input }),
      options?.timeoutMs ?? 600000
    );

    if (!response.ok) {
      throw new Error(`Video generation failed (${model}): ${await this.readCloudflareError(response)}`);
    }

    const payload: any = await response.json().catch(() => null);
    const state = String(payload?.state || payload?.result?.state || 'Completed');
    const videoUrl =
      payload?.result?.video ||
      payload?.result?.result?.video ||
      payload?.result?.url ||
      payload?.video;

    if (!videoUrl) {
      if (!['completed'].includes(state.toLowerCase())) {
        throw new Error(`Video generation is still ${state.toLowerCase()}; no output URL was returned yet.`);
      }
      throw new Error(`Video generation returned no output URL (${model}).`);
    }

    return { videoUrl, model, provider: 'cloud', state };
  }

  resolveVideoModel(options?: { model?: string }): string {
    const requested = options?.model;
    if (requested) {
      if (this.videoModels[requested]) return requested;
      throw new Error(`Unknown video model "${requested}".`);
    }
    // Flux 3 Video is the most versatile default (t2v / i2v / v2v + audio).
    return 'black-forest-labs/flux-3-video';
  }

  private buildVideoInput(
    model: string,
    prompt: string,
    options?: { mode?: string; duration?: number | 'auto' | string; resolution?: string; generateAudio?: boolean; aspectRatio?: string; fps?: number; image?: string; imageUri?: string }
  ): Record<string, unknown> {
    const input: Record<string, unknown> = { prompt };
    const duration = typeof options?.duration === 'number' ? options.duration : undefined;
    const withAudio = options?.generateAudio !== false;

    if (model === 'black-forest-labs/flux-3-video') {
      input.mode = options?.mode || 't2v';
      input.resolution = options?.resolution || 'hd';
      input.duration = this.clamp(duration ?? 5, 5, 20);
      input.generate_audio = withAudio;
      if (options?.image) input.image = options.image;
    } else if (model === 'lightricks/ltx-2-5-fast') {
      input.duration = this.clamp(duration ?? 8, 1, 10);
      input.resolution = options?.resolution || '1920x1080';
      input.fps = options?.fps ?? 24;
      input.generate_audio = withAudio;
      if (options?.imageUri || options?.image) input.image_uri = options.imageUri || options.image;
    } else if (model === 'pixverse/v5.6' || model === 'pixverse/v6') {
      const max = model === 'pixverse/v6' ? 15 : 5;
      input.aspect_ratio = options?.aspectRatio || '16:9';
      input.duration = this.clamp(duration ?? 5, 1, max);
      input.quality = options?.resolution || '720p';
      input.generate_audio = withAudio;
      if (options?.image) input.image = options.image;
    } else if (model === 'bytedance/seedance-2.0') {
      input.aspect_ratio = options?.aspectRatio || '16:9';
      input.duration = this.clamp(duration ?? 5, 4, 12);
      input.resolution = options?.resolution || '720p';
      input.generate_audio = withAudio;
      if (options?.image) input.image = options.image;
    }
    return input;
  }

  // --- Cloudflare transport helpers ---

  private workersAiRunUrl(model: string): string {
    return `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/ai/run/${model}`;
  }

  private gatewayRunUrl(): string {
    return `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/ai/run`;
  }

  private async fetchCloudflare(url: string, body: string, timeoutMs: number): Promise<Response> {
    if (!this.cloudflareAccountId || !this.cloudflareApiKey) {
      throw new Error('Cloudflare Workers AI is not configured (set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_KEY).');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.cloudflareApiKey}`,
          'Content-Type': 'application/json',
        },
        body,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Cloudflare request timed out after ${Math.round(timeoutMs / 1000)}s.`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private async readCloudflareError(response: Response): Promise<string> {
    try {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text);
        const detail = parsed?.errors?.[0]?.message || parsed?.error || parsed?.message;
        if (detail) return `${response.status} ${detail}`;
      } catch {
        // Fall through to the raw text preview.
      }
      return `${response.status} ${text.slice(0, 300)}`;
    } catch {
      return `${response.status} ${response.statusText}`;
    }
  }

  private findBase64Image(payload: any): string | null {
    const candidates = [
      payload?.result?.image,
      payload?.image,
      payload?.result?.dataURI,
      payload?.dataURI,
      payload?.result?.output,
      payload?.result?.images?.[0]?.image,
      payload?.result?.images?.[0],
    ];
    for (const value of candidates) {
      if (typeof value === 'string' && value.length > 0) return value;
    }
    return null;
  }

  private parseSize(size?: string): { width: number; height: number } | null {
    if (!size || size === 'auto') return null;
    const match = /^(\d{2,4})\s*[x×]\s*(\d{2,4})$/.exec(size.trim());
    if (!match) return null;
    return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
  }

  private clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
  }

  // Translation
  async translate(text: string, targetLang: string, sourceLang?: string): Promise<string> {
    const model = '@cf/ai4bharat/indictrans2-en-indic-1B';

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/ai/run/${model}`,
      {
        headers: {
          Authorization: `Bearer ${this.cloudflareApiKey}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          text,
          source_lang: sourceLang || 'english',
          target_lang: targetLang,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Translation error: ${response.status}`);
    }

    const result = await response.json();
    return result.translated_text || text;
  }

  // Embeddings with multiple model options
  async getEmbeddings(text: string | string[], model?: string): Promise<number[][]> {
    const selectedModel = model || '@cf/baai/bge-small-en-v1.5';

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/ai/run/${selectedModel}`,
      {
        headers: {
          Authorization: `Bearer ${this.cloudflareApiKey}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          text: Array.isArray(text) ? text : [text],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Embeddings error: ${response.status}`);
    }

    const result = await response.json();
    return result.data || [];
  }

  // Get available models
  getAvailableTextModels(): Array<{ model: string; type: string; quality: string; speed: string }> {
    return Object.entries(this.textModels).map(([model, info]) => ({
      model,
      type: info.type,
      quality: info.quality,
      speed: info.speed,
    }));
  }

  getAvailableImageModels(): Array<{ model: string; type: string; quality: string; speed: string; text: boolean; output: string; mimeType: string }> {
    return Object.entries(this.imageModels).map(([model, info]) => ({
      model,
      type: info.type,
      quality: info.quality,
      speed: info.speed,
      text: info.text,
      output: info.output,
      mimeType: info.mimeType,
    }));
  }

  getAvailableVideoModels(): Array<{ model: string; type: string; quality: string; speed: string; modes: string[]; maxDuration: number; audio: boolean }> {
    return Object.entries(this.videoModels).map(([model, info]) => ({
      model,
      type: info.type,
      quality: info.quality,
      speed: info.speed,
      modes: info.modes,
      maxDuration: info.maxDuration,
      audio: info.audio,
    }));
  }

  getAvailableEmbeddingModels(): Array<{ model: string; type: string; dimensions: number }> {
    return Object.entries(this.embeddingModels).map(([model, info]) => ({
      model,
      type: info.type,
      dimensions: info.dimensions,
    }));
  }

  getAvailableSpeechModels(): Array<{ model: string; type: string; quality: string; language: string }> {
    return Object.entries(this.speechModels).map(([model, info]) => ({
      model,
      type: info.type,
      quality: info.quality,
      language: info.language,
    }));
  }

  getAvailableTTSModels(): Array<{ model: string; type: string; quality: string; voices?: boolean; language?: boolean }> {
    return Object.entries(this.ttsModels).map(([model, info]) => ({
      model,
      type: info.type,
      quality: info.quality,
      voices: info.voices,
      language: info.language,
    }));
  }

  // Gemini Assistant Integration
  async runGemini(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.geminiEnabled) {
      throw new Error('Gemini API key not configured. Add GEMINI_API_KEY to .env');
    }

    // Convert messages to Gemini format
    const geminiMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`,
      {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();

    return {
      content: result.candidates?.[0]?.content?.parts?.[0]?.text || '',
      model: 'gemini-1.5-flash',
      provider: 'cloud',
    };
  }

  // Check if Gemini is available
  isGeminiAvailable(): boolean {
    return this.geminiEnabled;
  }

  // Image Analysis (Vision)
  async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    // Use CLIP or similar for image analysis
    return 'Image analysis feature will be implemented with vision models';
  }

  // Video Analysis
  async analyzeVideo(videoUrl: string, prompt: string): Promise<string> {
    // Video analysis for preview/error detection
    return 'Video analysis feature will be implemented';
  }

  // 3D Generation
  async generate3D(prompt: string): Promise<string> {
    // 3D object generation
    return '3D generation feature will be implemented';
  }

  // Speech to Text (Speech Recognition)
  async speechToText(audioData: string | Buffer, model?: string): Promise<string> {
    const selectedModel = model || 'assemblyai/universal-3.5-pro';

    const body: any = {};
    if (selectedModel === 'assemblyai/universal-3.5-pro') {
      body.audio_url = audioData;
    } else if (selectedModel === 'xai/grok-stt') {
      body.url = audioData;
    } else if (selectedModel === 'openai/gpt-4o-transcribe') {
      body.file = audioData;
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/ai/run/${selectedModel}`,
      {
        headers: {
          Authorization: `Bearer ${this.cloudflareApiKey}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`Speech recognition error: ${response.status}`);
    }

    const result = await response.json();
    return result.text || result.transcript || '';
  }

  // Text to Speech
  async textToSpeech(text: string, options?: {
    model?: string;
    voiceId?: string;
    voice?: string;
    language?: string;
    outputFormat?: string;
    responseFormat?: string;
    format?: string;
    speed?: number;
    pitch?: number;
    volume?: number;
  }): Promise<{ audioUrl: string; model: string; provider: AIProvider }> {
    const selectedModel = options?.model || 'elevenlabs/eleven-v3';

    const body: any = { text };

    // Add model-specific parameters
    if (selectedModel === 'elevenlabs/eleven-v3') {
      if (options?.voiceId) body.voice_id = options.voiceId;
      if (options?.outputFormat) body.output_format = options.outputFormat;
    } else if (selectedModel === 'xai/grok-tts') {
      if (options?.language) body.language = options.language;
    } else if (selectedModel === 'openai/tts-1-hd') {
      if (options?.voice) body.voice = options.voice;
      if (options?.responseFormat) body.response_format = options.responseFormat;
      if (options?.speed) body.speed = options.speed;
    } else if (selectedModel === 'minimax/speech-2.8-turbo') {
      if (options?.voiceId) body.voice_id = options.voiceId;
      if (options?.format) body.format = options.format;
      if (options?.speed) body.speed = options.speed;
      if (options?.pitch) body.pitch = options.pitch;
      if (options?.volume) body.volume = options.volume;
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/ai/run/${selectedModel}`,
      {
        headers: {
          Authorization: `Bearer ${this.cloudflareApiKey}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`Text-to-speech error: ${response.status}`);
    }

    const result = await response.json();

    return {
      audioUrl: result.audio || result.output || '',
      model: selectedModel,
      provider: 'cloud',
    };
  }
}
