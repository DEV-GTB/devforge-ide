# Free AI Models Guide for DevForge AI

## Cloudflare Workers AI Models

### Text Generation (Chat/Code)
- **Llama 3.1 8B** - Meta's open-source LLM
  - Good for general chat and coding
  - Fast inference
  - Free tier available

- **Llama 3.1 70B** - Larger model for complex tasks
  - Better reasoning
  - Higher token limit
  - Free tier with rate limits

- **Mistral 7B** - Efficient open-source model
  - Good balance of speed and quality
  - Multilingual support

- **Mixtral 8x7B** - Mixture of Experts model
  - High quality reasoning
  - Competitive with larger models

### Image Generation
- **Stable Diffusion XL** - High-quality image generation
  - 1024x1024 resolution
  - Good for UI mockups and diagrams

- **Stable Diffusion 1.5** - Faster image generation
  - Lower resolution but faster
  - Good for quick previews

### Image Analysis
- **CLIP** - Image understanding and classification
  - Good for UI analysis
  - Can detect components and layouts

### Embeddings
- **BGE Small** - Text embeddings for search
  - Fast and efficient
  - Good for code search

### Text Classification
- **DistilBERT** - Fast text classification
  - Good for sentiment analysis
  - Error classification

---

## Other Free AI Providers

### 1. Hugging Face Inference API (Free Tier)

#### Text Generation
- **Meta-Llama-3.1-8B-Instruct**
  - 500K requests/month free
  - Good for chat and coding
  - API: `https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct`

- **Mistral-Nemo-Instruct-2407**
  - 12B parameter model
  - Excellent for coding
  - Fast inference

- **Qwen2.5-7B-Instruct**
  - Alibaba's model
  - Strong coding capabilities
  - Multilingual

#### Image Generation
- **Stable-Diffusion-XL**
  - Free tier available
  - High quality images
  - Good for UI generation

- **FLUX.1-schnell**
  - New fast model
  - Better quality than SDXL
  - Recently released free tier

#### Image Analysis
- **LLaVA-1.5-7B**
  - Vision-language model
  - Can describe images
  - Good for UI analysis

- **Qwen2-VL-7B**
  - Strong vision model
  - Can understand complex images
  - Good for screenshot analysis

#### Speech
- **Whisper-large-v3**
  - OpenAI's speech-to-text
  - Excellent accuracy
  - Multiple languages

- **Bark** - Text-to-speech
  - Natural sounding voices
  - Free tier available

### 2. Groq (Free Beta)

#### Text Generation
- **Llama 3.1 70B** - Ultra-fast inference
  - Fastest inference available
  - 500K tokens/day free
  - Excellent for real-time coding

- **Llama 3.1 8B** - Even faster
  - Perfect for quick responses
  - 1M tokens/day free

- **Mixtral 8x7B** - Fast MoE model
  - Good reasoning
  - Fast inference

### 3. Together AI (Free Credits)

#### Text Generation
- **Llama 3.1 70B**
  - $25 free credits
  - High quality
  - Good for complex tasks

- **Mixtral 8x7B**
  - Fast and efficient
  - Good for coding

### 4. DeepInfra (Free Tier)

#### Text Generation
- **Llama 3.1 8B**
  - Free tier available
  - Fast inference
  - Good for chat

#### Image Generation
- **Stable Diffusion XL**
  - Free tier
  - Good quality

### 5. Replicate (Free Credits)

#### Text Generation
- **Llama 3.1 70B**
  - $5 free credits
  - High quality

#### Image Generation
- **Stable Diffusion XL**
  - Free credits
  - High quality

- **FLUX.1**
  - New high-quality model
  - Excellent for UI

#### Video Analysis
- **VideoLLaMA**
  - Can analyze video frames
  - Good for preview analysis

#### 3D Generation
- **Shap-E**
  - OpenAI's 3D model generator
  - Can generate 3D objects from text
  - Free tier available

### 6. OpenRouter (Pay-as-you-go, very cheap)

#### Text Generation
- **Llama 3.1 70B** - $0.59/1M tokens
- **Llama 3.1 8B** - $0.05/1M tokens
- **Mixtral 8x7B** - $0.07/1M tokens
- **Qwen2.5-7B** - $0.08/1M tokens

Very affordable with no monthly minimum.

### 7. Perplexity AI (Free Tier)

#### Text Generation
- **Sonar Small** - Fast model
  - 5 queries/day free
  - Good for quick answers

- **Sonar Medium** - Better quality
  - Limited free queries
  - Good reasoning

---

## Local AI Models (Run on User's GPU)

### Text Generation (Ollama - Free)

Download and run locally:
```bash
# Install Ollama
# Then run models:
ollama run llama3.1
ollama run codellama
ollama run mistral
ollama run deepseek-coder
```

#### Recommended Models:
- **Llama 3.1 8B** - All-purpose
  - Requires: ~8GB VRAM
  - Good quality
  - Fast

- **Llama 3.1 70B** - High quality
  - Requires: ~40GB VRAM (quantized)
  - Excellent reasoning
  - Slower

- **CodeLlama 13B** - Coding specialist
  - Requires: ~13GB VRAM
  - Excellent for code
  - Python, JS, etc.

- **DeepSeek Coder** - Best for coding
  - Requires: ~16GB VRAM
  - Excellent code generation
  - Free and open source

- **Mistral 7B** - Fast and efficient
  - Requires: ~7GB VRAM
  - Good quality
  - Very fast

### Image Generation (Automatic1111 / ComfyUI - Free)

#### Stable Diffusion Models:
- **Stable Diffusion XL**
  - Requires: ~8GB VRAM
  - High quality
  - Good for UI

- **Stable Diffusion 1.5**
  - Requires: ~4GB VRAM
  - Faster
  - Good quality

- **FLUX.1**
  - Requires: ~12GB VRAM
  - Best quality
  - New model

Download: https://github.com/AUTOMATIC1111/stable-diffusion-webui

### Image Analysis (Transformers - Free)

#### Vision Models:
- **BLIP-2** - Image description
  - Requires: ~4GB VRAM
  - Good for UI analysis

- **LLaVA** - Vision-language
  - Requires: ~8GB VRAM
  - Can understand complex images
  - Good for screenshots

Run with:
```bash
pip install transformers
python -c "from transformers import pipeline; pipe = pipeline('image-to-text', model='Salesforce/blip2-opt-2.7b')"
```

### Speech to Text (Whisper - Free)

#### Models:
- **Whisper Small** - Fast
  - Requires: ~2GB VRAM
  - Good accuracy
  - Fast

- **Whisper Medium** - Better
  - Requires: ~5GB VRAM
  - Better accuracy
  - Good balance

- **Whisper Large** - Best
  - Requires: ~10GB VRAM
  - Excellent accuracy
  - Slower

Run with:
```bash
pip install openai-whisper
whisper audio.mp3
```

### Text to Speech (Coqui TTS - Free)

#### Models:
- **XTTS v2** - Natural voices
  - Requires: ~2GB VRAM
  - Voice cloning
  - Natural sounding

Run with:
```bash
pip install TTS
tts --text "Hello world" --model_name tts_models/multilingual/multi-dataset/xtts_v2
```

### Video Analysis (Free)

#### Models:
- **VideoLLaMA** - Video understanding
  - Requires: ~8GB VRAM
  - Can analyze video
  - Good for preview analysis

- **LLaVA-Video** - Video-language
  - Requires: ~12GB VRAM
  - Better video understanding
  - Can detect changes

### 3D Generation (Free)

#### Models:
- **Shap-E** - OpenAI
  - Requires: ~4GB VRAM
  - Generate 3D from text
  - Can export to OBJ/GLTF

- **Point-E** - Point cloud generation
  - Requires: ~2GB VRAM
  - Faster but lower quality
  - Good for previews

Run with:
```bash
pip install shap-e
python -c "from shap_e.diffusion.sample import sample_mesh; sample_mesh('a chair')"
```

---

## Recommended Setup for DevForge AI

### Option 1: Cloudflare Workers AI (Recommended for Cloud)
**Pros:**
- Free tier available
- Fast edge computing
- No GPU required on user device
- Easy integration

**Models to use:**
- Text: Llama 3.1 8B
- Image: Stable Diffusion XL
- Vision: CLIP
- Embeddings: BGE Small

### Option 2: Hugging Face Inference API (Recommended for Variety)
**Pros:**
- Huge model selection
- Free tier generous
- Easy API access
- No GPU required

**Models to use:**
- Text: Llama 3.1 8B or Mistral
- Image: FLUX.1-schnell or SDXL
- Vision: LLaVA-1.5 or Qwen2-VL
- Speech: Whisper-large-v3
- 3D: Shap-E

### Option 3: Groq (Recommended for Speed)
**Pros:**
- Ultra-fast inference
- Free tier generous
- Low latency
- Great for real-time

**Models to use:**
- Text: Llama 3.1 8B or 70B
- Best for coding assistance

### Option 4: Local Models (Recommended for Privacy)
**Pros:**
- Complete privacy
- No API costs
- No rate limits
- Works offline

**Setup:**
1. Install Ollama for text: `ollama run llama3.1`
2. Install ComfyUI for images
3. Install Whisper for speech
4. Install Shap-E for 3D

**Requirements:**
- Minimum: 8GB VRAM GPU
- Recommended: 16GB+ VRAM GPU
- CPU: Multi-core recommended
- RAM: 16GB+ recommended

---

## API Integration Examples

### Cloudflare Workers AI
```typescript
const response = await fetch('https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/@cf/meta/llama-3.1-8b-instruct', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Generate code for...' }]
  })
});
```

### Hugging Face
```typescript
const response = await fetch('https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${HF_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    inputs: 'Generate code for...',
    parameters: { max_new_tokens: 500 }
  })
});
```

### Groq
```typescript
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${GROQ_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: 'Generate code for...' }]
  })
});
```

### Ollama (Local)
```typescript
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'llama3.1',
    prompt: 'Generate code for...',
    stream: false
  })
});
```

---

## Summary Table

| Task | Cloudflare | Hugging Face | Groq | Local (Ollama) |
|------|-----------|--------------|------|----------------|
| Chat/Coding | Llama 3.1 8B | Llama 3.1 8B | Llama 3.1 8B | Llama 3.1 8B |
| Image Gen | SDXL | FLUX.1-schnell | - | SDXL (ComfyUI) |
| Image Analysis | CLIP | LLaVA-1.5 | - | BLIP-2 |
| Video Analysis | - | VideoLLaMA | - | VideoLLaMA |
| 3D Gen | - | Shap-E | - | Shap-E |
| Speech-to-Text | - | Whisper | - | Whisper |
| Text-to-Speech | - | Bark | - | XTTS v2 |

---

## Pricing Comparison (Free Tiers)

| Provider | Free Tier | Rate Limits |
|----------|-----------|-------------|
| Cloudflare | 10K requests/day | Depends on model |
| Hugging Face | 500K requests/month | 30 requests/minute |
| Groq | 500K-1M tokens/day | Depends on model |
| Together AI | $25 credits | Pay-as-you-go |
| Replicate | $5 credits | Pay-as-you-go |
| OpenRouter | $0.05/1M tokens | No minimum |
| Local (Ollama) | 100% free | Hardware limits |

---

## Recommendation

**For DevForge AI:**

1. **Primary (Cloud):** Use Groq for text/coding (fastest, generous free tier)
2. **Secondary (Cloud):** Use Hugging Face for vision, speech, 3D (variety)
3. **Fallback (Local):** Offer Ollama option for users with GPUs (privacy, no limits)

This gives you:
- Fast, free cloud options
- Wide model variety
- Privacy-focused local option
- No GPU requirement for basic users
- Unlimited option for power users
