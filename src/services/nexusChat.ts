import { FileNode, flattenFiles } from '../core/filesystem';
import { answerLocally } from '../core/localAssistant';
import { InspectedElement } from '../core/preview';
import { ProblemItem } from '../core/workspace';

export interface ChatCodeBlock {
  language: string;
  code: string;
  filename?: string;
}

export interface NexusSource {
  title: string;
  url: string;
  domain?: string;
}

export interface NexusImage {
  url: string;
  source?: string;
  title?: string;
}

export type FileOperation =
  | { op: 'create'; path: string; content: string }
  | { op: 'update'; path: string; content: string }
  | { op: 'delete'; path: string }
  | { op: 'rename'; path: string; newPath: string };

export interface NexusChatResult {
  text: string;
  codeBlock?: ChatCodeBlock;
  route: {
    id: string;
    label: string;
    provider: string;
    mode: 'cloud' | 'local';
  };
  suggestedActions?: string[];
  authNotice?: { level?: string; message?: string } | null;
  sources?: NexusSource[];
  images?: NexusImage[];
  fileOps?: FileOperation[];
  grounded?: boolean;
  error?: boolean;
}

export interface NexusChatRequest {
  message: string;
  history?: { role: 'user' | 'assistant'; text: string }[];
  files: FileNode[];
  activeFile?: FileNode | null;
  inspectedElement?: InspectedElement | null;
  problems?: ProblemItem[];
  grounding?: boolean;
}

function sanitizeSources(value: unknown): NexusSource[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const result: NexusSource[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const url = typeof (item as NexusSource).url === 'string' ? (item as NexusSource).url : '';
    if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    result.push({
      url,
      title: typeof (item as NexusSource).title === 'string' && (item as NexusSource).title ? (item as NexusSource).title : url,
      domain: typeof (item as NexusSource).domain === 'string' ? (item as NexusSource).domain : undefined,
    });
  }
  return result.length ? result : undefined;
}

function sanitizeImages(value: unknown): NexusImage[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const result: NexusImage[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const url = typeof (item as NexusImage).url === 'string' ? (item as NexusImage).url : '';
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push({
      url,
      source: typeof (item as NexusImage).source === 'string' ? (item as NexusImage).source : undefined,
      title: typeof (item as NexusImage).title === 'string' ? (item as NexusImage).title : undefined,
    });
  }
  return result.length ? result : undefined;
}

function normalizeWorkspacePath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\\/g, '/').replace(/^\.\//, '').trim();
  if (!normalized || normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) return null;
  if (normalized.split('/').some((segment) => segment === '..' || segment === '')) return null;
  return normalized;
}

function sanitizeFileOps(value: unknown): FileOperation[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result: FileOperation[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as { op?: unknown; path?: unknown; content?: unknown; newPath?: unknown };
    const path = normalizeWorkspacePath(raw.path);
    if (!path) continue;
    if (raw.op === 'create' || raw.op === 'update') {
      if (typeof raw.content !== 'string') continue;
      result.push({ op: raw.op, path, content: raw.content });
    } else if (raw.op === 'delete') {
      result.push({ op: 'delete', path });
    } else if (raw.op === 'rename') {
      const newPath = normalizeWorkspacePath(raw.newPath);
      if (!newPath) continue;
      result.push({ op: 'rename', path, newPath });
    }
  }
  return result.length ? result : undefined;
}

function languageForPath(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase();
  if (extension === 'tsx' || extension === 'ts') return 'typescript';
  if (extension === 'jsx' || extension === 'js') return 'javascript';
  if (extension === 'css') return 'css';
  if (extension === 'json') return 'json';
  if (extension === 'md') return 'markdown';
  if (extension === 'html') return 'html';
  return extension || 'text';
}

function normalizeFile(node: FileNode) {
  return {
    path: node.path,
    name: node.name,
    language: languageForPath(node.name),
    content: node.isDirty || true ? node.content || '' : (node.content || '')
  };
}

/**
 * Primary AI entry point used by the Copilot and Sidebar assistants.
 *
 * Strategy (free, no database required):
 *   1. Call the hosted server's /api/chat. The server tries its cloud AI
 *      integration first (a free low-latency tier), then the built-in
 *      offline engine — whichever gives a usable answer first.
 *   2. If the server is unreachable / errors, fall back to the fully
 *      offline browser assistant (answerLocally) so the feature never
 *      breaks.
 *
 * Provider names are intentionally kept out of the UI — users only see
 * "Nexus AI · Cloud" or "Nexus AI · Local mode".
 */
export async function askNexus(request: NexusChatRequest): Promise<NexusChatResult> {
  const workspaceFiles = flattenFiles(request.files);
  const workspaceContext = workspaceFiles
    .filter((f) => f.type === 'file' && f.content && f.content.trim().length > 0)
    .slice(0, 24)
    .map((f) => normalizeFile(f));

  const chatHistory = (request.history || [])
    .slice(-8)
    .map((m) => ({ sender: m.role === 'user' ? 'user' : 'assistant', text: m.text }));

  const payload: Record<string, unknown> = {
    message: request.message,
    chatHistory,
    mode: 'developer',
    workspaceContext,
    diagnostics: request.problems || [],
  };

  if (typeof request.grounding === 'boolean') {
    payload.grounding = request.grounding;
  }

  if (request.activeFile) {
    payload.activeFile = normalizeFile(request.activeFile);
  }
  if (request.inspectedElement && request.inspectedElement.tagName) {
    payload.inspectedElement = request.inspectedElement;
  }

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(90000),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || `Server AI returned HTTP ${response.status}`);
    }

    const text = typeof data?.text === 'string' && data.text.trim() ? data.text : '';
    if (!text) {
      throw new Error('Server AI returned an empty response.');
    }

    const codeBlock: ChatCodeBlock | undefined = data.diff?.code
      ? {
          language: data.diff.filename ? languageForPath(data.diff.filename) : languageForPath(activeFileHint(request)),
          code: data.diff.code,
          filename: data.diff.file || undefined,
        }
      : undefined;

    const provider: string =
      data.provider === 'local'
        ? 'offline engine'
        : 'cloud AI · free';
    const mode: 'cloud' | 'local' = data.provider === 'local' ? 'local' : 'cloud';

    return {
      text,
      codeBlock,
      route: {
        id: data.route?.id || 'general',
        label: data.route?.label || 'Nexus AI',
        provider,
        mode,
      },
      suggestedActions: Array.isArray(data.suggestedActions) ? data.suggestedActions : undefined,
      authNotice: data.authNotice || null,
      sources: sanitizeSources(data.sources),
      images: sanitizeImages(data.images),
      fileOps: sanitizeFileOps(data.fileOps),
      grounded: Boolean(data.grounded),
      error: false,
    };
  } catch (serverError) {
    console.warn('Server AI unavailable, using local assistant:', serverError instanceof Error ? serverError.message : serverError);
    const local = answerLocally(request.message, request.activeFile || null, request.files);
    return {
      text: local.text,
      codeBlock: local.file
        ? { language: local.file.language, code: local.file.code, filename: local.file.path }
        : undefined,
      route: {
        id: 'local',
        label: 'Nexus AI · Local mode',
        provider: 'browser · no API',
        mode: 'local',
      },
    };
  }
}

function activeFileHint(request: NexusChatRequest): string {
  return request.activeFile?.name || 'workspace-file';
}

/** Quick server reachability check to show the current AI mode in the UI. */
export async function checkNexusMode(): Promise<'cloud' | 'local'> {
  try {
    const response = await fetch('/api/health', { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return 'local';
    const data = await response.json();
    return data?.ok ? 'cloud' : 'local';
  } catch {
    return 'local';
  }
}

export interface NexusImageResult {
  image?: string;
  mimeType?: string;
  error?: string;
}

/**
 * Ask the server to render an image for the given prompt. Returns a data URL
 * that can be displayed directly inside the chat. Falls back to a descriptive
 * error when image generation is unavailable.
 */
export async function generateNexusImage(prompt: string): Promise<NexusImageResult> {
  try {
    const response = await fetch('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(90000),
    });
    const data = await response.json();
    if (!response.ok || !data?.image) {
      return { error: data?.error || `Image generation returned HTTP ${response.status}` };
    }
    return { image: data.image, mimeType: data.mimeType };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Image generation failed.' };
  }
}

export interface NexusVideoResult {
  videoUrl?: string;
  model?: string;
  error?: string;
}

export interface NexusVideoOptions {
  model?: string;
  mode?: 't2v' | 'i2v' | 'v2v';
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
  generateAudio?: boolean;
  image?: string;
  onProgress?: (status: string) => void;
  pollIntervalMs?: number;
  timeoutMs?: number;
}

/**
 * Start an asynchronous video generation job and poll until it completes.
 * Returns the hosted video URL on success, or a descriptive error. Video
 * generation is long-running, so the server runs it as a background job and
 * exposes a poll endpoint instead of holding the request open.
 */
export async function generateNexusVideo(
  prompt: string,
  options: NexusVideoOptions = {}
): Promise<NexusVideoResult> {
  const { onProgress, pollIntervalMs = 5000, timeoutMs = 600000, ...payload } = options;
  try {
    const start = await fetch('/api/ai/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, options: payload }),
      signal: AbortSignal.timeout(30000),
    });
    const started = await start.json();
    if (!start.ok || !started?.jobId) {
      return { error: started?.error || `Video generation returned HTTP ${start.status}` };
    }

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      const poll = await fetch(`/api/ai/video/${encodeURIComponent(started.jobId)}`, {
        signal: AbortSignal.timeout(15000),
      });
      const status = await poll.json();
      if (!poll.ok) {
        return { error: status?.error || `Video status returned HTTP ${poll.status}` };
      }
      onProgress?.(status.status);
      if (status.status === 'completed') {
        return { videoUrl: status.videoUrl, model: status.model };
      }
      if (status.status === 'failed') {
        return { error: status.error || 'Video generation failed.' };
      }
    }
    return { error: 'Video generation timed out before completion.' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Video generation failed.' };
  }
}