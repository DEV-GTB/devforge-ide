# VUX AI Integration Guide

## Overview
VUX AI is the unified AI service for DevForge Studio, providing seamless integration with both cloud and local AI models. Users never see the underlying model selection - they simply interact with "VUX AI Cloud" or "VUX AI Local".

## Architecture

### Two Providers
1. **VUX AI Cloud** - Cloudflare Workers AI
2. **VUX AI Local** - Local models (Ollama)

### Three Modes
1. **Ask** - Read-only Q&A mode
2. **Plan** - Planning mode (no code execution)
3. **Code** - Coding mode (full permissions)

## API Endpoints

### Chat Endpoint
**POST /api/ai/chat**

Request:
```json
{
  "mode": "ask" | "plan" | "code",
  "messages": [
    { "role": "user", "content": "Your question" }
  ],
  "context": {
    "projectId": "project-123",
    "files": ["src/App.tsx"],
    "language": "TypeScript",
    "framework": "React"
  }
}
```

Response:
```json
{
  "content": "AI response",
  "model": "@cf/meta/llama-3.1-8b-instruct-fp8",
  "provider": "cloud",
  "usage": {
    "promptTokens": 100,
    "completionTokens": 200,
    "totalTokens": 300
  }
}
```

### Provider Management
**POST /api/ai/provider**
```json
{
  "provider": "cloud" | "local"
}
```

**GET /api/ai/provider**
```json
{
  "provider": "cloud",
  "displayName": "VUX AI Cloud"
}
```

### Image Generation
**POST /api/ai/image**
```json
{
  "prompt": "A modern UI dashboard",
  "options": {
    "quality": "high",
    "size": "1024x1024",
    "outputFormat": "png"
  }
}
```

Response:
```json
{
  "imageUrl": "https://...",
  "model": "black-forest-labs/flux-1-kontext-max",
  "provider": "cloud"
}
```

### Video Generation
**POST /api/ai/video**
```json
{
  "prompt": "A cozy ramen shop on a rainy Tokyo night",
  "options": {
    "mode": "t2v",
    "duration": 5,
    "resolution": "hd",
    "generateAudio": true
  }
}
```

Response:
```json
{
  "videoUrl": "https://...",
  "model": "black-forest-labs/flux-3-video",
  "provider": "cloud"
}
```

### Translation
**POST /api/ai/translate**
```json
{
  "text": "Hello world",
  "targetLang": "french",
  "sourceLang": "english"
}
```

### Embeddings
**POST /api/ai/embeddings**
```json
{
  "text": "Search query"
}
```

## Mode System

### Ask Mode
- **Purpose**: Q&A, explanations, code analysis
- **Permissions**: Read-only
- **Model**: Llama 3.1 8B (fast)
- **Behavior**:
  - Provide helpful explanations
  - Analyze code and explain how it works
  - Suggest improvements but don't modify
  - Answer questions clearly and concisely
  - Focus on education and understanding

Example:
```
User: "How does React useEffect work?"
AI: Explains useEffect with examples, no code modification
```

### Plan Mode
- **Purpose**: Create execution plans
- **Permissions**: Read-only analysis
- **Model**: Mistral 7B (balanced)
- **Behavior**:
  - Analyze request and create detailed plan
  - Break down into actionable steps
  - Identify dependencies
  - Assess risks
  - Provide structured plan format
  - **No actual code generation**

Plan Format:
```
# Analysis
[Brief analysis]

# Approach
[Proposed approach]

# Tasks
1. [Task description]
   - Dependencies: [...]
   - Risk: [low/medium/high]

2. [Task description]
   ...

# Verification
[How to verify success]
```

Example:
```
User: "Add authentication to my app"
AI: Returns detailed plan with tasks, dependencies, and verification steps
No code is written
```

### Code Mode
- **Purpose**: Generate and modify code
- **Permissions**: Full write access
- **Model**: Mistral Small 3.1 24B (powerful)
- **Behavior**:
  - Generate complete, working code
  - Follow project conventions
  - Write clean, maintainable code
  - Include error handling
  - **No permission checks needed**
  - Assume all operations approved

Example:
```
User: "Create a login component"
AI: Generates complete React component with TypeScript, styling, and error handling
```

## Model Selection

### Cloudflare Workers AI Models

| Mode | Model | Purpose |
|------|-------|---------|
| Ask | @cf/meta/llama-3.1-8b-instruct-fp8 | Fast Q&A |
| Plan | @cf/mistral/mistral-7b-instruct-v0.2-lora | Planning |
| Code | @cf/mistralai/mistral-small-3.1-24b-instruct | Coding |
| Image | black-forest-labs/flux-1-kontext-max | Image generation |
| Video | black-forest-labs/flux-3-video | Video generation |
| Translation | @cf/ai4bharat/indictrans2-en-indic-1B | Translation |
| Embeddings | @cf/baai/bge-small-en-v1.5 | Text embeddings |

### Local Models (Ollama)

| Mode | Model | VRAM Required |
|------|-------|---------------|
| Ask | llama3.1 | 8GB |
| Plan | mistral | 7GB |
| Code | deepseek-coder | 16GB |

## Environment Variables

```bash
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_KEY=your_api_key
```

## Usage Examples

### Ask Mode
```typescript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'ask',
    messages: [
      { role: 'user', content: 'Explain how React hooks work' }
    ]
  })
});

const { content } = await response.json();
console.log(content); // Explanation without code modification
```

### Plan Mode
```typescript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'plan',
    messages: [
      { role: 'user', content: 'Add user authentication' }
    ],
    context: {
      projectId: 'my-project',
      framework: 'React',
      language: 'TypeScript'
    }
  })
});

const { content } = await response.json();
console.log(content); // Structured plan, no code
```

### Code Mode
```typescript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'code',
    messages: [
      { role: 'user', content: 'Create a login component with validation' }
    ],
    context: {
      projectId: 'my-project',
      framework: 'React',
      language: 'TypeScript'
    }
  })
});

const { content } = await response.json();
console.log(content); // Complete working code
```

### Switching Providers
```typescript
// Switch to local
await fetch('/api/ai/provider', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ provider: 'local' })
});

// Check current provider
const response = await fetch('/api/ai/provider');
const { provider, displayName } = await response.json();
console.log(displayName); // "VUX AI Local"
```

### Image Generation
```typescript
const response = await fetch('/api/ai/image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A modern dark theme dashboard',
    options: {
      quality: 'high',
      size: '1024x1024'
    }
  })
});

const { imageUrl } = await response.json();
```

### Video Generation
```typescript
const response = await fetch('/api/ai/video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A person walking through a forest',
    options: {
      mode: 't2v',
      duration: 10,
      resolution: 'hd'
    }
  })
});

const { videoUrl } = await response.json();
```

## Integration with Agent System

The VUX AI service integrates with the autonomous agent system:

```typescript
import { VUXAIService } from './server/ai/VUXAIService';

const aiService = new VUXAIService();

// In AgentPlanner
async createPlan(goal: string): Promise<Plan> {
  const response = await aiService.run({
    mode: 'plan',
    messages: [{ role: 'user', content: goal }],
    context: { projectId: this.projectId }
  });

  // Parse the structured plan from response
  return this.parsePlan(response.content);
}

// In AgentExecutor
async generateCode(task: AgentTask): Promise<string> {
  const response = await aiService.run({
    mode: 'code',
    messages: [{ role: 'user', content: task.description }],
    context: { projectId: this.projectId }
  });

  return response.content; // The generated code
}
```

## User Experience

Users see:
- "VUX AI Cloud" or "VUX AI Local" in the UI
- Mode selector: Ask | Plan | Code
- No technical model names
- Seamless switching between providers

Backend handles:
- Model selection based on mode
- Provider switching
- API key management
- Rate limiting
- Error handling

## Benefits

1. **Abstraction** - Users don't need to know about models
2. **Mode-based** - Clear intent (ask, plan, code)
3. **Flexible** - Switch between cloud and local
4. **No Permissions** - Code mode assumes approval
5. **Optimized** - Different models for different tasks
6. **Privacy** - Local option for sensitive data
7. **Cost-effective** - Free Cloudflare tier, free local
8. **Fast** - Groq-like speeds with Cloudflare edge

## Future Enhancements

- Add more Cloudflare models as they become available
- Integrate video analysis for preview validation
- Add 3D generation capability
- Implement speech-to-text and text-to-speech
- Add vision capabilities for UI analysis
- Implement automatic provider switching based on task complexity
- Add usage analytics and cost tracking
