# AI Capabilities & Tools Documentation

## 🎯 AI Functions Available in IDE

### 1. Text/Chat Generation ✅
**Purpose**: Code generation, Q&A, planning, explanations

**Models**:
- `@cf/qwen/qwen2.5-coder-32b-instruct` - Coding
- `@cf/nvidia/nemotron-3-120b-a12b` - Advanced coding with thinking
- `@cf/zai-org/glm-4.7-flash` - Fast Q&A
- `@cf/qwen/qwen3-30b-a3b-fp8` - General tasks
- `@cf/qwen/qwen3.8-27b` - Complex tasks
- `@cf/mistralai/mistral-small-3.1-24b-instruct` - General
- `@cf/meta/llama-3.2-11b-vision-instruct` - Vision + Text
- `gemini-1.5-flash` - Code explanation (External)

**API Endpoint**: `POST /api/ai/chat`

**Usage**:
```typescript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'code', // 'ask' | 'plan' | 'code'
    messages: [{ role: 'user', content: 'Create a React component' }]
  })
});
```

---

### 2. Image Generation ✅
**Purpose**: Generate images for UI designs, illustrations, concepts

**Models**:
- `@cf/leonardo/phoenix-1.0` - Best quality with text rendering
- `@cf/black-forest-labs/flux-1-schnell` - Fast generation
- `google/nano-banana-2-lite` - Concept sketches
- `krea/krea-2-large` - Cinematic images
- `alibaba/qwen-image-3.0-pro` - General generation

**API Endpoint**: `POST /api/ai/image`

**Usage**:
```typescript
const response = await fetch('/api/ai/image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A modern UI dashboard',
    model: '@cf/leonardo/phoenix-1.0',
    options: {
      guidance: 8,
      numSteps: 40
    }
  })
});
```

---

### 3. Video Generation ✅
**Purpose**: Create animated scenes, website animations, marketing videos

**Models**:
- `alibaba/hh1.1-t2v` - Simple text-to-video
- `black-forest-labs/flux-3-video` - Multi-mode (T2V, I2V, V2V)
- `bytedance/seedance-2.0-fast` - Fast video generation
- `google/veo-3.1-fast` - Website animations
- `xai/grok-imagine-video` - Creative scenes

**API Endpoint**: `POST /api/ai/video`

**Usage**:
```typescript
const response = await fetch('/api/ai/video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A product showcase',
    model: 'google/veo-3.1-fast',
    options: {
      aspectRatio: '16:9',
      duration: '6s',
      resolution: '720p'
    }
  })
});
```

---

### 4. Speech to Text (STT) ✅
**Purpose**: Convert voice recordings to text, voice commands

**Models**:
- `assemblyai/universal-3.5-pro` - Multilingual transcription
- `xai/grok-stt` - Accurate transcription
- `openai/gpt-4o-transcribe` - High quality transcription

**API Endpoint**: `POST /api/ai/speech-to-text`

**Usage**:
```typescript
const response = await fetch('/api/ai/speech-to-text', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    audioData: 'data:audio/wav;base64,...',
    model: 'openai/gpt-4o-transcribe'
  })
});

const { transcript } = await response.json();
```

**IDE Integration**: VoiceChatPanel component with recording button

---

### 5. Text to Speech (TTS) ✅
**Purpose**: Convert AI responses to audio, accessibility

**Models**:
- `elevenlabs/eleven-v3` - Natural expressive voices
- `xai/grok-tts` - High quality synthesis
- `openai/tts-1-hd` - Multiple voices
- `minimax/speech-2.8-turbo` - Fast synthesis

**API Endpoint**: `POST /api/ai/text-to-speech`

**Usage**:
```typescript
const response = await fetch('/api/ai/text-to-speech', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Welcome to DevForge AI',
    options: {
      model: 'elevenlabs/eleven-v3',
      voiceId: 'JBFqnCBsd6RMkjVDRZzb',
      outputFormat: 'mp3_44100_128'
    }
  })
});

const { audioUrl } = await response.json();
```

**IDE Integration**: "Read aloud" button in chat messages

---

### 6. Embeddings ✅
**Purpose**: Semantic search, code similarity, document retrieval

**Models**:
- `@cf/baai/bge-small-en-v1.5` - 384 dimensions (fast)
- `@cf/baai/bge-base-en-v1.5` - 768 dimensions (high quality)
- `@cf/qwen/qwen3-embedding-0.6b` - 768 dimensions (multilingual)
- `@cf/pfnet/plamo-embedding-1b` - 768 dimensions (Japanese/Asian)
- `@cf/google/embeddinggemma-300m` - 300 dimensions (Google's lightweight model)

**API Endpoint**: `POST /api/ai/embeddings`

**Usage**:
```typescript
const response = await fetch('/api/ai/embeddings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: ['How to use React hooks'],
    model: '@cf/baai/bge-base-en-v1.5'
  })
});

const { embeddings } = await response.json();
```

---

### 7. Translation ✅
**Purpose**: Translate text between languages

**Model**: `@cf/ai4bharat/indictrans2-en-indic-1B`

**API Endpoint**: `POST /api/ai/translate`

**Usage**:
```typescript
const response = await fetch('/api/ai/translate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Hello world',
    targetLang: 'french',
    sourceLang: 'english'
  })
});
```

---

## 🗄️ Local Storage System

### Overview
All data is stored on the user's device using **IndexedDB** - no cloud database.

### Storage Structure

**Database**: `DevForgeLocalDB`

**Stores**:
1. `storage` - Generic storage items
2. `chats` - Chat message history
3. `progress` - Progress steps for tasks
4. `agents` - Agent run records
5. `workspaces` - Workspace data

### LocalStorageManager API

```typescript
import { localStorageManager } from './src/core/LocalStorageManager';

// Initialize
await localStorageManager.init();

// Generic storage
await localStorageManager.store({
  id: 'unique-id',
  type: 'tool',
  data: { ... },
  timestamp: Date.now()
});

const item = await localStorageManager.retrieve('unique-id');
const items = await localStorageManager.retrieveByType('tool');
await localStorageManager.delete('unique-id');

// Chat operations
await localStorageManager.saveChatMessage({
  id: 'msg-1',
  role: 'user',
  content: 'Hello',
  timestamp: Date.now(),
  mode: 'ask'
});

const history = await localStorageManager.getChatHistory(100);
await localStorageManager.clearChatHistory();

// Progress tracking
await localStorageManager.saveProgressStep({
  id: 'step-1',
  taskId: 'task-1',
  step: 1,
  description: 'Initialize project',
  status: 'completed',
  timestamp: Date.now()
});

const steps = await localStorageManager.getProgressByTask('task-1');
await localStorageManager.clearProgress('task-1');

// Agent runs
await localStorageManager.saveAgentRun({
  id: 'run-1',
  goal: 'Create React app',
  mode: 'code',
  status: 'running',
  startTime: Date.now(),
  steps: []
});

const run = await localStorageManager.getAgentRun('run-1');
const runs = await localStorageManager.getAgentRuns(50);

// Statistics
const stats = await localStorageManager.getStorageStats();
// { chats: 10, progress: 5, agents: 3, workspaces: 2, total: 20 }

// Clear all data
await localStorageManager.clearAll();
```

---

## 🛠️ Tools for AI Context

### Data Storage Tools

These tools provide data to the AI for context:

#### 1. **Chat History**
- **Purpose**: Provide conversation context
- **Storage**: IndexedDB `chats` store
- **API**: `localStorageManager.getChatHistory()`
- **Use**: Send last N messages as context to AI

#### 2. **Progress Steps**
- **Purpose**: Track task execution progress
- **Storage**: IndexedDB `progress` store
- **API**: `localStorageManager.getProgressByTask(taskId)`
- **Use**: Show AI what has been completed

#### 3. **Agent Runs**
- **Purpose**: Store full agent execution history
- **Storage**: IndexedDB `agents` store
- **API**: `localStorageManager.getAgentRuns()`
- **Use**: AI can reference previous similar tasks

#### 4. **File Context**
- **Purpose**: Provide file contents to AI
- **Storage**: IndexedDB `storage` store (type: 'file')
- **API**: `localStorageManager.retrieveByType('file')`
- **Use**: AI reads current project files

#### 5. **Workspace Metadata**
- **Purpose**: Project structure and configuration
- **Storage**: IndexedDB `workspaces` store
- **API**: `localStorageManager.retrieveByType('workspace')`
- **Use**: AI understands project context

### Tool Registry (Server-Side)

The agent system has these tools available:

```typescript
// File Operations
- read_file: Read file contents
- write_file: Create/overwrite files
- edit_file: Edit specific lines
- delete_file: Delete files
- list_files: List directory contents

// Code Operations
- search_code: Search for text in files
- run_command: Execute shell commands
- run_tests: Run test suite

// Project Operations
- get_project_structure: Get project metadata
```

### Context Building for AI

When sending requests to AI, include context:

```typescript
const context = {
  // Project info
  projectId: 'project-123',
  language: 'TypeScript',
  framework: 'React',

  // Recent files
  files: ['src/App.tsx', 'src/components/Button.tsx'],

  // Chat history
  recentMessages: await localStorageManager.getChatHistory(10),

  // Progress
  completedSteps: await localStorageManager.getProgressByTask(taskId),

  // Previous similar tasks
  similarRuns: await localStorageManager.getAgentRuns(5),
};

const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'code',
    messages: [{ role: 'user', content: request }],
    context
  })
});
```

---

## 📊 Progress & Steps Tracking

### Progress Tracking Component

**File**: `src/components/progress/ProgressTracker.tsx`

**Features**:
- Display all progress steps for a task
- Show status (pending, in_progress, completed, failed)
- View step results and errors
- Select from multiple agent runs
- Clear progress history

**Usage**:
```tsx
<ProgressTracker taskId="task-123" refresh={refreshKey} />
```

### Progress Step Structure

```typescript
interface ProgressStep {
  id: string;
  taskId: string;
  step: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp: number;
  result?: any;
  error?: string;
}
```

### Tracking Execution Flow

1. **Start Task**: Create agent run in storage
2. **Each Step**: Save progress step with status
3. **Update Status**: Change from pending → in_progress → completed/failed
4. **Store Results**: Save step result or error
5. **Complete Task**: Update agent run status

---

## 🎤 Voice Chat Integration

### VoiceChatPanel Component

**File**: `src/components/chat/VoiceChatPanel.tsx`

**Features**:
- **Recording**: Start/stop voice recording
- **Transcription**: Auto-convert speech to text using STT
- **TTS**: "Read aloud" button for AI responses
- **Chat History**: Saved to local storage
- **Mode Selection**: Ask, Plan, Code modes

**Usage**:
```tsx
<VoiceChatPanel
  mode="code"
  onSendMessage={(message) => {
    // Send to AI
  }}
  isLoading={false}
/>
```

### Recording Flow

1. User clicks microphone button
2. Browser requests microphone access
3. MediaRecorder captures audio
4. On stop, convert to base64
5. Send to `/api/ai/speech-to-text`
6. Display transcript in input
7. User can edit before sending

### TTS Flow

1. User clicks "Read aloud" on AI message
2. Send text to `/api/ai/text-to-speech`
3. Receive audio URL
4. Play audio using HTML5 Audio
5. Auto-stop when audio ends

---

## 📋 Complete AI Capabilities Summary

| Capability | Status | Models | API Endpoint |
|------------|--------|--------|--------------|
| Text/Chat | ✅ | 10 + Gemini | `/api/ai/chat` |
| Image Generation | ✅ | 7 | `/api/ai/image` |
| Video Generation | ✅ | 5 | `/api/ai/video` |
| Speech to Text | ✅ | 3 | `/api/ai/speech-to-text` |
| Text to Speech | ✅ | 4 | `/api/ai/text-to-speech` |
| Embeddings | ✅ | 5 | `/api/ai/embeddings` |
| Translation | ✅ | 1 | `/api/ai/translate` |
| Vision | ✅ | 1 | `/api/ai/chat` |

**Total**: 36 AI capabilities

---

## 🔒 Privacy & Security

### Local Storage Benefits
- ✅ All data stays on user's device
- ✅ No cloud database needed
- ✅ No data leaves the device (except AI API calls)
- ✅ User has full control
- ✅ Can export/delete all data

### Data That Leaves Device
- AI API requests (to Cloudflare, Google, etc.)
- No chat history sent to cloud
- No project files sent to cloud (only what user explicitly includes)

### Security Best Practices
- API keys stored in `.env` (gitignored)
- No secrets in local storage
- Encrypted browser storage (if supported)
- Regular data cleanup options

---

## 🚀 Next Steps

1. **Integrate VoiceChatPanel** into AgentPanel
2. **Add ProgressTracker** to agent execution UI
3. **Create semantic search** using embeddings
4. **Add file context** tool for AI
5. **Implement voice commands** for IDE actions
6. **Add export/import** for local storage
7. **Create dashboard** for storage statistics
8. **Add backup/restore** functionality
