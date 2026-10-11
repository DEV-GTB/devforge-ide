import type {
  PreviewInfo,
  ScreenshotRecord,
  VisionAnalysis,
  VisionCapabilities,
  VisionEvent,
  VisionEventKind,
  VisionIssueReport,
  VisionSeverity,
  VisualDiffResult,
} from '../types/vision';

const API_BASE = '/api/vision';

export class VisionApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly hint?: string;
  readonly diagnosticId?: string;

  constructor(message: string, body?: Record<string, unknown>) {
    super(message);
    this.name = 'VisionApiError';
    this.code = typeof body?.code === 'string' ? body.code : 'VISION_INTERNAL';
    this.retryable = body?.retryable === true;
    this.hint = typeof body?.hint === 'string' ? body.hint : undefined;
    this.diagnosticId = typeof body?.diagnosticId === 'string' ? body.diagnosticId : undefined;
  }
}

export interface VisionErrorBody extends Record<string, unknown> {
  code?: string;
  message?: string;
  retryable?: boolean;
  hint?: string;
  diagnosticId?: string;
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 20000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    signal: controller.signal,
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    } as Record<string, string>,
  });
  clearTimeout(timer);

  const body = (await response.json().catch(() => null)) as
    | T
    | VisionErrorBody
    | null;

  if (!response.ok) {
    const errorBody = (body ?? {}) as VisionErrorBody;
    const fallback = `Request failed with status ${response.status}.`;
    const message =
      typeof errorBody.message === 'string' ? errorBody.message : fallback;
    throw new VisionApiError(message, errorBody);
  }

  return body as T;
}

// --- Capabilities ---

export async function getCapabilities() {
  return request<{ capabilities: VisionCapabilities; storage: { screenshotCount: number; bytes: number; quotaBytes: number } }>(
    '/capabilities'
  );
}

// --- Sessions ---

export async function connectPreview(url: string, viewport?: { width: number; height: number }) {
  return request<{ session: PreviewInfo }>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ url, viewport }),
  });
}

export async function disconnectPreview(sessionId: string) {
  return request<{ ok: true }>(`/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  });
}

export async function reloadPreview(sessionId: string) {
  return request<{ session: PreviewInfo }>(
    `/sessions/${encodeURIComponent(sessionId)}/reload`,
    { method: 'POST' }
  );
}

// --- Screenshots ---

export async function captureScreenshot(sessionId: string, dataUrl: string, label?: string) {
  return request<{ screenshot: ScreenshotRecord }>(
    `/sessions/${encodeURIComponent(sessionId)}/screenshots`,
    {
      method: 'POST',
      body: JSON.stringify({ dataUrl, label, mode: 'viewport' }),
    }
  );
}

export async function listScreenshots(sessionId: string) {
  return request<{ screenshots: ScreenshotRecord[] }>(
    `/sessions/${encodeURIComponent(sessionId)}/screenshots`
  );
}

export async function setBaseline(screenshotId: string) {
  return request<{ screenshot: ScreenshotRecord }>(
    `/screenshots/${encodeURIComponent(screenshotId)}/set-baseline`,
    { method: 'POST' }
  );
}

export async function setPinned(screenshotId: string, pinned: boolean) {
  return request<{ screenshot: ScreenshotRecord }>(
    `/screenshots/${encodeURIComponent(screenshotId)}/pin`,
    { method: 'POST', body: JSON.stringify({ pinned }) }
  );
}

export async function deleteScreenshot(screenshotId: string) {
  return request<{ ok: true }>(`/screenshots/${encodeURIComponent(screenshotId)}`, {
    method: 'DELETE',
  });
}

// --- Events ---

export async function listEvents(sessionId: string) {
  return request<{ events: VisionEvent[] }>(
    `/sessions/${encodeURIComponent(sessionId)}/events`
  );
}

export async function recordEvent(
  sessionId: string,
  input: {
    kind: VisionEventKind;
    message: string;
    sourceUrl?: string;
    line?: number;
    column?: number;
    statusCode?: number;
    severity?: VisionSeverity;
  }
) {
  return request<{ event: VisionEvent }>(
    `/sessions/${encodeURIComponent(sessionId)}/events`,
    { method: 'POST', body: JSON.stringify(input) }
  );
}

export async function clearEvents(sessionId: string) {
  return request<{ ok: true }>(
    `/sessions/${encodeURIComponent(sessionId)}/events`,
    { method: 'DELETE' }
  );
}

// --- Diffs ---

export async function recordDiff(
  baselineId: string,
  currentId: string,
  threshold = 0.1
) {
  return request<{ result: VisualDiffResult }>('/diffs', {
    method: 'POST',
    body: JSON.stringify({ baselineId, currentId, threshold }),
  });
}

export function artifactUrl(id: string): string {
  return `${API_BASE}/artifacts/${encodeURIComponent(id)}`;
}

// --- Analysis ---

export async function proposalContext(input: {
  sessionId: string;
  eventIds?: string[];
  diffId?: string;
  element?: unknown;
  screenshotIds?: string[];
}) {
  return request<{ bundleText: string; evidenceIds: string[] }>('/analysis/preview', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function analyzeVision(input: {
  sessionId: string;
  eventIds?: string[];
  diffId?: string;
  screenshotIds?: string[];
  element?: unknown;
  question?: string;
  route?: string;
}) {
  return request<{ analysis: VisionAnalysis; bundleText: string; evidenceIds: string[] }>(
    '/analysis',
    { method: 'POST', body: JSON.stringify(input) }
  );
}

// --- Issues ---

export interface IssueDraft {
  title: string;
  summary?: string;
  severity?: VisionSeverity;
  route?: string;
  reproductionSteps?: string[];
  expected?: string;
  actual?: string;
  evidenceScreenshotIds?: string[];
  eventIds?: string[];
  diffId?: string;
  element?: unknown;
  suspectedCauses?: string[];
  verificationPlan?: string[];
}

export async function createIssue(draft: IssueDraft) {
  return request<{ issue: VisionIssueReport }>('/issues', {
    method: 'POST',
    body: JSON.stringify(draft),
  });
}

export async function listIssues() {
  return request<{ issues: VisionIssueReport[] }>('/issues');
}

export async function deleteIssue(id: string) {
  return request<{ ok: true }>(`/issues/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function exportIssue(id: string, format: 'markdown' | 'json') {
  return request<{ format: string; content: string }>(
    `/issues/${encodeURIComponent(id)}/export?format=${format}`
  );
}

// --- Storage ---

export async function getStorage() {
  return request<{ storage: { screenshotCount: number; bytes: number; quotaBytes: number } }>(
    '/storage'
  );
}

export async function clearHistory() {
  return request<{ ok: true; cleared: { screenshots: number; issues: number } }>(
    '/history',
    { method: 'DELETE' }
  );
}