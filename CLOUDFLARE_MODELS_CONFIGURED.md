# Cloudflare Workers AI Models - Complete List

## Text/Chat Models Configured in VUX AI Service

### Coding Models

| Model                                 | Purpose                       | Mode | Quality | Speed  |
| ------------------------------------- | ----------------------------- | ---- | ------- | ------ |
| `@cf/qwen/qwen2.5-coder-32b-instruct` | Code generation               | Code | High    | Medium |
| `@cf/nvidia/nemotron-3-120b-a12b`     | Advanced coding with thinking | Code | High    | Slow   |

### General Purpose Models

| Model                        | Purpose       | Mode | Quality | Speed  |
| ---------------------------- | ------------- | ---- | ------- | ------ |
| `@cf/zai-org/glm-4.7-flash`  | Fast Q&A      | Ask  | Medium  | Fast   |
| `@cf/qwen/qwen3-30b-a3b-fp8` | General tasks | Plan | High    | Medium |
| `@cf/qwen/qwen3.8-27b`       | Complex tasks | Plan | High    | Medium |

### Legacy Models (Still Available)

| Model                                          | Purpose | Mode | Quality | Speed  |
| ---------------------------------------------- | ------- | ---- | ------- | ------ |
| `@cf/meta/llama-3.1-8b-instruct-fp8`           | General | Ask  | Medium  | Fast   |
| `@cf/mistral/mistral-7b-instruct-v0.2-lora`    | General | Plan | Medium  | Fast   |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | General | Code | High    | Medium |

## Image Generation Models Configured

### Primary Models

| Model                                  | Purpose                       | Quality | Speed  | Features                      |
| -------------------------------------- | ----------------------------- | ------- | ------ | ----------------------------- |
| `@cf/leonardo/phoenix-1.0`             | Best quality image generation | High    | Medium | Text rendering, coherent text |
| `@cf/black-forest-labs/flux-1-schnell` | Fast image generation         | High    | Fast   | Base64 output                 |
| `black-forest-labs/flux-1-kontext-max` | High quality generation       | High    | Medium | Legacy                        |

### Additional Models

| Model                           | Purpose                  | Quality | Speed  |
| ------------------------------- | ------------------------ | ------- | ------ |
| `google/nano-banana-2-lite`     | Concept sketches         | Medium  | Fast   |
| `krea/krea-2-large`             | Cinematic images         | High    | Medium |
| `alibaba/qwen-image-3.0-pro`    | General image generation | High    | Medium |
| `openai/gpt-image-2.5-sunburst` | High quality             | High    | Slow   |

## Video Generation Model

| Model                            | Purpose                                       | Modes         |
| -------------------------------- | --------------------------------------------- | ------------- |
| `black-forest-labs/flux-3-video` | Text-to-video, Image-to-video, Video-to-video | t2v, i2v, v2v |

## Translation Model

| Model                                   | Purpose                     |
| --------------------------------------- | --------------------------- |
| `@cf/ai4bharat/indictrans2-en-indic-1B` | English to Indian languages |

## Embeddings Model

| Model                        | Purpose                    |
| ---------------------------- | -------------------------- |
| `@cf/baai/bge-small-en-v1.5` | Text embeddings for search |

## Model Selection Strategy

### Ask Mode (Q&A)

- **Selected Model**: `@cf/zai-org/glm-4.7-flash`
- **Reason**: Fast response time for quick questions

### Plan Mode

- **Selected Model**: `@cf/qwen/qwen3.8-27b`
- **Reason**: High quality for complex planning and reasoning

### Code Mode

- **Selected Model**: `@cf/qwen/qwen2.5-coder-32b-instruct`
- **Reason**: Optimized for code generation

### Image Generation

- **Default Model**: `@cf/leonardo/phoenix-1.0`
- **Reason**: Best quality with text rendering support
- **Fallback**: `@cf/black-forest-labs/flux-1-schnell` for speed

## Your Cloudflare Credentials (Configured)

- **Account ID**: `your_account_id_here`
- **API Key**: `your_api_key_here`

⚠️ **Security Note**: These credentials are stored in your `.env` file which is in `.gitignore`. Never commit or share them publicly.

## API Endpoints Added

### New Endpoints

- `GET /api/ai/models/text` - List available text models
- `GET /api/ai/models/image` - List available image models

### Existing Endpoints

- `POST /api/ai/chat` - Chat with AI (auto-selects model based on mode)
- `POST /api/ai/provider` - Switch between cloud/local
- `GET /api/ai/provider` - Get current provider
- `POST /api/ai/image` - Generate images (with model selection)
- `POST /api/ai/video` - Generate videos
- `POST /api/ai/translate` - Translate text
- `POST /api/ai/embeddings` - Get text embeddings

## Model Comparison

### For Coding Tasks

1. **Best**: `@cf/qwen/qwen2.5-coder-32b-instruct` (optimized for code)
2. **Alternative**: `@cf/nvidia/nemotron-3-120b-a12b` (with thinking mode)

### For Q&A

1. **Best**: `@cf/zai-org/glm-4.7-flash` (fastest)
2. **Alternative**: `@cf/meta/llama-3.1-8b-instruct-fp8` (reliable)

### For Planning

1. **Best**: `@cf/qwen/qwen3.8-27b` (high quality)
2. **Alternative**: `@cf/qwen/qwen3-30b-a3b-fp8` (balanced)

### For Images

1. **Best Quality**: `@cf/leonardo/phoenix-1.0` (text rendering)
2. **Fastest**: `@cf/black-forest-labs/flux-1-schnell`
3. **Cinematic**: `krea/krea-2-large`

## Usage Examples

### Chat with auto model selection

```typescript
const response = await fetch("/api/ai/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mode: "code", // Automatically uses qwen2.5-coder-32b
    messages: [{ role: "user", content: "Create a React component" }],
  }),
});
```

### Generate image with specific model

```typescript
const response = await fetch("/api/ai/image", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "A modern UI dashboard",
    model: "@cf/leonardo/phoenix-1.0", // Override default
    options: {
      guidance: 8,
      numSteps: 40,
    },
  }),
});
```

### List available models

```typescript
const textModels = await fetch("/api/ai/models/text").then((r) => r.json());
const imageModels = await fetch("/api/ai/models/image").then((r) => r.json());
```

## All Models Listed by You

✅ **Already Integrated:**

- `@cf/qwen/qwen2.5-coder-32b-instruct`
- `@cf/zai-org/glm-4.7-flash`
- `@cf/qwen/qwen3-30b-a3b-fp8`
- `@cf/qwen/qwen3.8-27b`
- `@cf/nvidia/nemotron-3-120b-a12b`
- `@cf/black-forest-labs/flux-1-schnell`
- `@cf/leonardo/phoenix-1.0`
- `google/nano-banana-2-lite`
- `krea/krea-2-large`
- `alibaba/qwen-image-3.0-pro`
- `black-forest-labs/flux-3-video`
- `@cf/ai4bharat/indictrans2-en-indic-1B`
- `@cf/baai/bge-small-en-v1.5`

📝 **Legacy Models (still supported):**

- `@cf/meta/llama-3.1-8b-instruct-fp8`
- `@cf/mistral/mistral-7b-instruct-v0.2-lora`
- `@cf/mistralai/mistral-small-3.1-24b-instruct`
- `black-forest-labs/flux-1-kontext-max`
- `openai/gpt-image-2.5-sunburst`

## Next Steps

The VUX AI service now intelligently selects the best model for each task:

- **Ask mode** → Fast Q&A model
- **Plan mode** → High-quality reasoning model
- **Code mode** - Coding-optimized model
- **Images** → Phoenix 1.0 (best quality) or Flux (fast)
- **Videos** → Flux-3-video

Users can also manually specify which model to use via the API.
