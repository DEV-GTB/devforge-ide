import express from 'express';
import { VUXAIService, AIMode } from './VUXAIService';
import { mediaJobStore } from './mediaJobStore';

const router = express.Router();
const aiService = new VUXAIService();

// Store health status
let healthStatus = {
  status: 'healthy',
  lastCheck: new Date().toISOString(),
  cloudflare: false,
  gemini: false,
  local: false,
};

// Health Check Endpoint
router.get('/health', async (req, res) => {
  try {
    // Test Cloudflare connection
    let cloudflareStatus = false;
    try {
      const testResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${aiService['cloudflareAccountId']}/ai/run/@cf/meta/llama-3.1-8b-instruct-fp8`,
        {
          headers: {
            Authorization: `Bearer ${aiService['cloudflareApiKey']}`,
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
        }
      );
      cloudflareStatus = testResponse.ok;
    } catch (e) {
      cloudflareStatus = false;
    }

    // Test Gemini availability
    const geminiStatus = aiService.isGeminiAvailable() || false;

    // Test local AI (Ollama)
    let localStatus = false;
    try {
      const localResponse = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
      });
      localStatus = localResponse.ok;
    } catch (e) {
      localStatus = false;
    }

    healthStatus = {
      status: (cloudflareStatus || geminiStatus || localStatus) ? 'healthy' : 'degraded',
      lastCheck: new Date().toISOString(),
      cloudflare: cloudflareStatus,
      gemini: geminiStatus,
      local: localStatus,
    };

    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// AI Chat Endpoint
router.post('/chat', async (req, res) => {
  try {
    const { mode, messages, context } = req.body;

    if (!mode || !messages) {
      return res.status(400).json({ error: 'Missing required fields: mode, messages' });
    }

    const validModes: AIMode[] = ['ask', 'plan', 'code'];
    if (!validModes.includes(mode)) {
      return res.status(400).json({ error: `Invalid mode. Must be one of: ${validModes.join(', ')}` });
    }

    const response = await aiService.run({
      mode,
      messages,
      context,
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Provider Switching
router.post('/provider', (req, res) => {
  try {
    const { provider } = req.body;

    if (provider !== 'cloud' && provider !== 'local') {
      return res.status(400).json({ error: 'Invalid provider. Must be "cloud" or "local"' });
    }

    aiService.setProvider(provider);
    res.json({ provider: aiService.getProvider(), displayName: aiService.getDisplayName() });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.get('/provider', (req, res) => {
  res.json({ provider: aiService.getProvider(), displayName: aiService.getDisplayName() });
});

// Provider Health Check
router.get('/providers/health', async (req, res) => {
  try {
    // Test Cloudflare
    let cloudflareStatus = 'offline';
    try {
      const testResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${aiService['cloudflareAccountId']}/ai/run/@cf/meta/llama-3.1-8b-instruct-fp8`,
        {
          headers: {
            Authorization: `Bearer ${aiService['cloudflareApiKey']}`,
            'Content-Type': 'application/json',
          },
          method: 'POST',
          body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
        }
      );
      cloudflareStatus = testResponse.ok ? 'online' : 'error';
    } catch (e) {
      cloudflareStatus = 'offline';
    }

    // Test Gemini
    const geminiStatus = aiService.isGeminiAvailable() ? 'online' : 'offline';

    // Test Local (Ollama)
    let localStatus = 'offline';
    try {
      const localResponse = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
      });
      localStatus = localResponse.ok ? 'online' : 'offline';
    } catch (e) {
      localStatus = 'offline';
    }

    res.json({
      cloudflare: { status: cloudflareStatus, type: 'cloud' },
      gemini: { status: geminiStatus, type: 'external' },
      local: { status: localStatus, type: 'local' },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Image Generation
router.post('/image', async (req, res) => {
  try {
    const { prompt, options } = req.body ?? {};

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Missing required field: prompt' });
    }

    const result = await aiService.generateImage(prompt, options);
    res.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /not configured/i.test(message)
      ? 503
      : /unknown image model|required|characters or fewer/i.test(message)
        ? 400
        : 502;
    res.status(status).json({ error: message });
  }
});

// Get available models
router.get('/models/text', (req, res) => {
  const models = aiService.getAvailableTextModels();
  res.json({ models });
});

router.get('/models/image', (req, res) => {
  const models = aiService.getAvailableImageModels();
  res.json({ models });
});

router.get('/models/video', (req, res) => {
  const models = aiService.getAvailableVideoModels();
  res.json({ models });
});

// Model Router - All models in one endpoint
router.get('/models', (req, res) => {
  const textModels = aiService.getAvailableTextModels();
  const imageModels = aiService.getAvailableImageModels();
  const videoModels = aiService.getAvailableVideoModels();
  const embeddingModels = aiService.getAvailableEmbeddingModels();
  const speechModels = aiService.getAvailableSpeechModels();
  const ttsModels = aiService.getAvailableTTSModels();

  // Convert to the expected format with status
  const allModels = [
    ...textModels.map(m => ({ id: m.model, type: 'text', ...m, status: 'online' })),
    ...imageModels.map(m => ({ id: m.model, type: 'image', ...m, status: 'online' })),
    ...videoModels.map(m => ({ id: m.model, type: 'video', ...m, status: 'online' })),
    ...embeddingModels.map(m => ({ id: m.model, type: 'embedding', ...m, status: 'online' })),
    ...speechModels.map(m => ({ id: m.model, type: 'speech', ...m, status: 'online' })),
    ...ttsModels.map(m => ({ id: m.model, type: 'tts', ...m, status: 'online' })),
  ];

  res.json({
    models: allModels,
    categories: {
      text: textModels.length,
      image: imageModels.length,
      video: videoModels.length,
      embedding: embeddingModels.length,
      speech: speechModels.length,
      tts: ttsModels.length,
    },
    total: allModels.length,
  });
});

// Model Router Health
router.get('/models/health', (req, res) => {
  const textModels = aiService.getAvailableTextModels();
  const imageModels = aiService.getAvailableImageModels();
  const videoModels = aiService.getAvailableVideoModels();
  const embeddingModels = aiService.getAvailableEmbeddingModels();
  const speechModels = aiService.getAvailableSpeechModels();
  const ttsModels = aiService.getAvailableTTSModels();

  res.json({
    status: 'online',
    categories: {
      text: { count: textModels.length, status: 'online' },
      image: { count: imageModels.length, status: 'online' },
      video: { count: videoModels.length, status: 'online' },
      embedding: { count: embeddingModels.length, status: 'online' },
      speech: { count: speechModels.length, status: 'online' },
      tts: { count: ttsModels.length, status: 'online' },
    },
    timestamp: new Date().toISOString(),
  });
});

// Gemini Assistant
router.post('/gemini', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Missing required field: messages (array)' });
    }

    const result = await aiService.runGemini(messages);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Check Gemini availability
router.get('/gemini/status', (req, res) => {
  res.json({ available: aiService.isGeminiAvailable() });
});

// Embeddings
router.post('/embeddings', async (req, res) => {
  try {
    const { text, model } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing required field: text' });
    }

    const embeddings = await aiService.getEmbeddings(text, model);
    const selectedModel = model || '@cf/baai/bge-small-en-v1.5';
    const modelInfo = aiService.getAvailableEmbeddingModels().find(m => m.model === selectedModel);

    res.json({
      success: true,
      embeddings,
      model: selectedModel,
      dimensions: modelInfo?.dimensions || 384,
      vectorLength: embeddings[0]?.length || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Embeddings Health Check
router.get('/embeddings/health', async (req, res) => {
  try {
    const testText = 'health check';
    const model = '@cf/baai/bge-small-en-v1.5';

    const embeddings = await aiService.getEmbeddings(testText, model);
    const modelInfo = aiService.getAvailableEmbeddingModels().find(m => m.model === model);

    res.json({
      success: true,
      status: 'online',
      model,
      dimensions: modelInfo?.dimensions || 384,
      vectorLength: embeddings[0]?.length || 0,
      availableModels: aiService.getAvailableEmbeddingModels().length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'offline',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Speech to Text
router.post('/speech-to-text', async (req, res) => {
  try {
    const { audioData, model } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Missing required field: audioData' });
    }

    const transcript = await aiService.speechToText(audioData, model);
    res.json({ transcript, model: model || 'assemblyai/universal-3.5-pro' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get available models
router.get('/models/embedding', (req, res) => {
  const models = aiService.getAvailableEmbeddingModels();
  res.json({ models });
});

router.get('/models/speech', (req, res) => {
  const models = aiService.getAvailableSpeechModels();
  res.json({ models });
});

router.get('/models/tts', (req, res) => {
  const models = aiService.getAvailableTTSModels();
  res.json({ models });
});

// Text to Speech
router.post('/text-to-speech', async (req, res) => {
  try {
    const { text, options } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing required field: text' });
    }

    const result = await aiService.textToSpeech(text, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Video Generation (asynchronous job + polling)
// POST starts a job and returns 202 immediately; GET polls by jobId.
// Pass ?wait=true to run synchronously and receive the final result inline.
router.post('/video', async (req, res) => {
  try {
    const { prompt, options } = req.body ?? {};

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Missing required field: prompt' });
    }

    let model: string;
    try {
      model = aiService.resolveVideoModel(options);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }

    if (req.query.wait === 'true') {
      const result = await aiService.generateVideo(prompt, options);
      return res.json({ success: true, ...result });
    }

    const job = mediaJobStore.create('video', model);
    void (async () => {
      mediaJobStore.markRunning(job.id);
      try {
        const result = await aiService.generateVideo(prompt, options);
        mediaJobStore.complete(job.id, {
          videoUrl: result.videoUrl,
          model: result.model,
          state: result.state,
        });
      } catch (error) {
        mediaJobStore.fail(job.id, error instanceof Error ? error.message : String(error));
      }
    })();

    return res.status(202).json({ jobId: job.id, status: job.status, model: job.model });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.get('/video/:jobId', (req, res) => {
  const job = mediaJobStore.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Unknown or expired video job.' });
  }
  res.json({
    jobId: job.id,
    status: job.status,
    model: job.model,
    videoUrl: job.result?.videoUrl,
    state: job.result?.state,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
});

// Translation
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLang, sourceLang } = req.body;

    if (!text || !targetLang) {
      return res.status(400).json({ error: 'Missing required fields: text, targetLang' });
    }

    const result = await aiService.translate(text, targetLang, sourceLang);
    res.json({ translatedText: result });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Embeddings
router.post('/embeddings', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing required field: text' });
    }

    const embeddings = await aiService.getEmbeddings(text);
    res.json({ embeddings });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Vector Search (Mock implementation - can be extended with real vector DB)
router.post('/vector/search', async (req, res) => {
  try {
    const { query, limit = 5, model } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Missing required field: query' });
    }

    // Generate embedding for the query
    const queryEmbedding = await aiService.getEmbeddings(query, model);

    // Mock search results - in production, this would query a vector database
    // like Pinecone, Weaviate, pgvector, etc.
    const mockResults = [
      {
        id: 'doc_1',
        score: 0.95,
        content: 'Sample document 1 related to the query',
        metadata: { source: 'README.md', line: 10 },
      },
      {
        id: 'doc_2',
        score: 0.87,
        content: 'Sample document 2 with semantic similarity',
        metadata: { source: 'docs/guide.md', line: 25 },
      },
    ].slice(0, limit);

    res.json({
      success: true,
      query,
      results: mockResults,
      queryEmbedding: queryEmbedding[0],
      count: mockResults.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Vector Count (Mock implementation)
router.get('/vector/count', (req, res) => {
  // In production, this would return the actual count from the vector database
  res.json({
    success: true,
    count: 0, // No vectors stored yet
    message: 'Vector database not initialized. Configure a vector database to enable vector storage.',
    timestamp: new Date().toISOString(),
  });
});

export default router;
