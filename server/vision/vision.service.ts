import fs from 'fs';
import crypto from 'crypto';
import { visionRepository, newId } from './vision.repository';
import { normalizeVisionEvent, redactSensitiveText } from './event-normalizer';
import { readPngDimensions } from './png';
import { computeVisualDiff, DiffMask } from './visual-diff-service';
import { analyzeVisionContext, isAnalysisConfigured, AnalysisContextBundle } from './ai-analysis-adapter';
import {
  assertResolvedLoopback,
  validatePreviewUrl,
} from './preview-url-policy';
import { VisionError } from './vision.errors';
import {
  VISION_DEFAULT_VIEWPORT,
  VISION_LIMITS,
  INTERNAL_PREVIEW_URL,
} from './vision.config';
import type {
  PreviewInfo,
  ScreenshotRecord,
  VisionCapabilities,
  VisionEvent,
  VisionEventKind,
  VisionIssueReport,
  VisionSeverity,
  VisualDiffResult,
} from './vision.types';

const VIDEO_MIME = /^data:(image\/png);base64,([A-Za-z0-9+/=]+)$/;

function requireString(value: unknown, field: string, max = 2048): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new VisionError('VISION_INVALID_REQUEST', `"${field}" is required.`, { status: 400 });
  }
  if (value.length > max) {
    throw new VisionError('VISION_INVALID_REQUEST', `"${field}" is too long.`, { status: 400 });
  }
  return value.trim();
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? Math.round(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function parsePngDataUrl(dataUrl: unknown): Buffer {
  if (typeof dataUrl !== 'string') {
    throw new VisionError('VISION_CAPTURE_FAILED', 'A PNG capture payload is required.', {
      status: 400,
    });
  }
  const match = VIDEO_MIME.exec(dataUrl.trim());
  if (!match) {
    throw new VisionError('VISION_CAPTURE_FAILED', 'Only PNG screenshot captures are supported.', {
      status: 400,
    });
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0) {
    throw new VisionError('VISION_CAPTURE_FAILED', 'The capture payload was empty.', { status: 400 });
  }
  if (buffer.length > VISION_LIMITS.maxScreenshotBytes) {
    throw new VisionError('VISION_CAPTURE_FAILED', 'The screenshot exceeds the size limit.', {
      status: 413,
    });
  }
  try {
    readPngDimensions(buffer);
  } catch {
    throw new VisionError('VISION_CAPTURE_FAILED', 'The capture was not a valid PNG image.', {
      status: 400,
    });
  }
  return buffer;
}

export class VisionService {
  constructor() {
    visionRepository.init();
  }

  capabilities(): VisionCapabilities {
    return {
      browserAvailable: false,
      screenshotCapture: true,
      consoleEvents: true,
      requestEvents: false,
      elementInspection: true,
      visualDiff: true,
      aiAnalysis: isAnalysisConfigured(),
      reason: {
        browserAvailable:
          'No controlled browser connector (Playwright) is installed. External-URL sessions cannot capture console/network events.',
        requestEvents:
          'Network request capture requires the controlled browser connector.',
        consoleEvents:
          'Console events are captured from the IDE sandboxed preview bridge only.',
        aiAnalysis: isAnalysisConfigured()
          ? 'A model endpoint is configured.'
          : 'No model endpoint configured. Deterministic diagnostics remain available.',
      },
    };
  }

  async createSession(input: {
    url: unknown;
    viewport?: { width?: unknown; height?: unknown };
  }): Promise<PreviewInfo> {
    const validated = validatePreviewUrl(requireString(input.url, 'url'));

    const width = clampInt(input.viewport?.width, VISION_DEFAULT_VIEWPORT.width, 200, 3840);
    const height = clampInt(input.viewport?.height, VISION_DEFAULT_VIEWPORT.height, 200, 2160);

    let reachable = true;
    let title: string | null = validated.internal ? 'DevForge Workspace Preview' : null;

    if (!validated.internal) {
      await assertResolvedLoopback(validated.hostname);
      const probe = await this.probe(validated.url);
      reachable = probe.reachable;
      title = probe.title;
    }

    const now = new Date().toISOString();
    const info: PreviewInfo = {
      sessionId: newId('session'),
      url: validated.internal ? INTERNAL_PREVIEW_URL : validated.url,
      origin: validated.origin,
      title,
      reachable,
      connection: reachable ? 'ready' : 'error',
      internal: validated.internal,
      viewport: { width, height },
      lastCheckedAt: now,
    };

    return visionRepository.saveSession(info);
  }

  private async probe(url: string): Promise<{ reachable: boolean; title: string | null }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VISION_LIMITS.reachabilityTimeoutMs);
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'devforge-ide-vision' },
      });
      let title: string | null = null;
      try {
        const text = await response.text();
        const match = /<title[^>]*>([^<]{0,200})<\/title>/i.exec(text);
        title = match ? redactSensitiveText(match[1]).trim() : null;
      } catch {}
      return { reachable: true, title };
    } catch {
      return { reachable: false, title: null };
    } finally {
      clearTimeout(timer);
    }
  }

  getSession(sessionId: string): PreviewInfo {
    const session = visionRepository.getSession(sessionId);
    if (!session) {
      throw new VisionError('VISION_SESSION_EXPIRED', 'This preview session no longer exists.', {
        status: 404,
      });
    }
    return session;
  }

  async reloadSession(sessionId: string): Promise<PreviewInfo> {
    const session = this.getSession(sessionId);
    if (session.internal) {
      session.lastCheckedAt = new Date().toISOString();
      session.reachable = true;
      session.connection = 'ready';
      return visionRepository.saveSession(session);
    }
    const probe = await this.probe(session.url);
    session.reachable = probe.reachable;
    session.connection = probe.reachable ? 'ready' : 'error';
    if (probe.title) session.title = probe.title;
    session.lastCheckedAt = new Date().toISOString();
    return visionRepository.saveSession(session);
  }

  deleteSession(sessionId: string): void {
    visionRepository.deleteSession(sessionId);
  }

  // --- Screenshots ---

  captureScreenshot(
    sessionId: string,
    input: { dataUrl: unknown; label?: unknown; mode?: unknown }
  ): ScreenshotRecord {
    const session = this.getSession(sessionId);
    const buffer = parsePngDataUrl(input.dataUrl);
    const dimensions = readPngDimensions(buffer);

    const stats = visionRepository.storageStats();
    if (stats.bytes + buffer.length > stats.quotaBytes) {
      throw new VisionError(
        'VISION_STORAGE_QUOTA',
        'Local screenshot storage quota reached.',
        { status: 507, hint: 'Delete unpinned captures to free space.' }
      );
    }

    const label =
      typeof input.label === 'string' && input.label.trim()
        ? redactSensitiveText(input.label.trim()).slice(0, 120)
        : undefined;

    const artifact = visionRepository.writeArtifact('screenshot', sessionId, buffer);
    const record: ScreenshotRecord = {
      id: artifact.id,
      sessionId,
      createdAt: artifact.createdAt,
      width: dimensions.width,
      height: dimensions.height,
      relativePath: artifact.relativePath,
      label,
      baseline: false,
      pinned: false,
      sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    };

    return visionRepository.addScreenshot(record);
  }

  listScreenshots(sessionId: string): ScreenshotRecord[] {
    this.getSession(sessionId);
    return visionRepository.listScreenshots(sessionId);
  }

  setBaseline(screenshotId: string): ScreenshotRecord {
    const record = visionRepository.setBaseline(screenshotId, true);
    if (!record) {
      throw new VisionError('VISION_NOT_FOUND', 'Screenshot not found.', { status: 404 });
    }
    return record;
  }

  setPinned(screenshotId: string, pinned: boolean): ScreenshotRecord {
    const record = visionRepository.setPinned(screenshotId, pinned);
    if (!record) {
      throw new VisionError('VISION_NOT_FOUND', 'Screenshot not found.', { status: 404 });
    }
    return record;
  }

  deleteScreenshot(screenshotId: string): void {
    visionRepository.deleteScreenshot(screenshotId);
  }

  // --- Events ---

  recordEvent(
    sessionId: string,
    input: {
      kind?: unknown;
      message?: unknown;
      sourceUrl?: unknown;
      line?: unknown;
      column?: unknown;
      statusCode?: unknown;
      severity?: unknown;
    }
  ): VisionEvent {
    this.getSession(sessionId);
    const allowed: VisionEventKind[] = [
      'console-error',
      'console-warning',
      'page-error',
      'request-failed',
      'http-error',
      'navigation',
      'accessibility-note',
    ];
    const kind = allowed.includes(input.kind as VisionEventKind)
      ? (input.kind as VisionEventKind)
      : 'console-error';

    const normalized = normalizeVisionEvent({
      sessionId,
      kind,
      message: typeof input.message === 'string' ? input.message : String(input.message ?? ''),
      sourceUrl: typeof input.sourceUrl === 'string' ? input.sourceUrl : undefined,
      line: typeof input.line === 'number' ? input.line : undefined,
      column: typeof input.column === 'number' ? input.column : undefined,
      statusCode: typeof input.statusCode === 'number' ? input.statusCode : undefined,
      severity: ['info', 'warning', 'error'].includes(input.severity as string)
        ? (input.severity as VisionSeverity)
        : undefined,
    });

    return visionRepository.addEvent({ ...normalized, id: newId('evt'), count: 1 });
  }

  listEvents(sessionId: string, severity?: string): VisionEvent[] {
    return visionRepository.listEvents(sessionId, severity);
  }

  clearEvents(sessionId: string): void {
    visionRepository.clearEvents(sessionId);
  }

  // --- Diffs ---

  recordDiff(input: {
    baselineId: unknown;
    currentId: unknown;
    threshold?: unknown;
    masks?: unknown;
  }): VisualDiffResult {
    const baselineId = requireString(input.baselineId, 'baselineId', 128);
    const currentId = requireString(input.currentId, 'currentId', 128);

    const baseline = visionRepository.getScreenshot(baselineId);
    const current = visionRepository.getScreenshot(currentId);
    if (!baseline || !current) {
      throw new VisionError('VISION_ARTIFACT_MISSING', 'One of the screenshots was not found.', {
        status: 404,
      });
    }

    const threshold =
      typeof input.threshold === 'number' && input.threshold >= 0 && input.threshold <= 1
        ? input.threshold
        : 0.1;

    const masks: DiffMask[] = Array.isArray(input.masks)
      ? (input.masks as unknown[]).slice(0, 20).map((raw) => {
          const m = (raw ?? {}) as Record<string, unknown>;
          return {
            x: clampInt(m.x, 0, 0, 100000),
            y: clampInt(m.y, 0, 0, 100000),
            width: clampInt(m.width, 0, 0, 100000),
            height: clampInt(m.height, 0, 0, 100000),
          };
        })
      : [];

    const result = computeVisualDiff({
      baselinePath: visionRepository.resolveArtifactPath(baselineId),
      currentPath: visionRepository.resolveArtifactPath(currentId),
      threshold,
      masks,
    });

    const artifact = visionRepository.writeArtifact('diff', current.sessionId, result.diffBuffer);

    return visionRepository.addDiff({
      id: newId('vdiff'),
      baselineId,
      currentId,
      diffArtifactId: artifact.id,
      changedPixels: result.changedPixels,
      totalPixels: result.totalPixels,
      changedRatio: result.changedRatio,
      threshold,
      dimensionsMatch: result.dimensionsMatch,
      createdAt: new Date().toISOString(),
    });
  }

  getDiff(diffId: string): VisualDiffResult {
    const diff = visionRepository.getDiff(diffId);
    if (!diff) throw new VisionError('VISION_NOT_FOUND', 'Diff not found.', { status: 404 });
    return diff;
  }

  // --- Issues ---

  createIssue(input: {
    title: unknown;
    summary?: unknown;
    severity?: unknown;
    route?: unknown;
    reproductionSteps?: unknown;
    expected?: unknown;
    actual?: unknown;
    evidenceScreenshotIds?: unknown;
    eventIds?: unknown;
    diffId?: unknown;
    element?: unknown;
    suspectedCauses?: unknown;
    verificationPlan?: unknown;
  }): VisionIssueReport {
    const title = requireString(input.title, 'title', 200);
    const severity = (['info', 'warning', 'error'] as string[]).includes(input.severity as string)
      ? (input.severity as VisionSeverity)
      : 'warning';

    const report: VisionIssueReport = {
      id: newId('issue'),
      title: redactSensitiveText(title),
      summary: typeof input.summary === 'string' ? redactSensitiveText(input.summary).slice(0, 4000) : '',
      severity,
      route: typeof input.route === 'string' ? redactSensitiveText(input.route).slice(0, 512) : undefined,
      reproductionSteps: Array.isArray(input.reproductionSteps)
        ? input.reproductionSteps.map((s) => redactSensitiveText(String(s)).slice(0, 500)).slice(0, 30)
        : [],
      expected: typeof input.expected === 'string' ? redactSensitiveText(input.expected).slice(0, 2000) : 'Not specified',
      actual: typeof input.actual === 'string' ? redactSensitiveText(input.actual).slice(0, 2000) : 'Not specified',
      evidenceScreenshotIds: Array.isArray(input.evidenceScreenshotIds)
        ? input.evidenceScreenshotIds.map(String).slice(0, 50)
        : [],
      eventIds: Array.isArray(input.eventIds) ? input.eventIds.map(String).slice(0, 100) : [],
      diffId: typeof input.diffId === 'string' ? input.diffId : undefined,
      element: (input.element ?? undefined) as VisionIssueReport['element'],
      suspectedCauses: Array.isArray(input.suspectedCauses)
        ? input.suspectedCauses.map((s) => redactSensitiveText(String(s)).slice(0, 500)).slice(0, 20)
        : [],
      verificationPlan: Array.isArray(input.verificationPlan)
        ? input.verificationPlan.map((s) => redactSensitiveText(String(s)).slice(0, 500)).slice(0, 20)
        : [],
      createdAt: new Date().toISOString(),
    };

    return visionRepository.addIssue(report);
  }

  listIssues(): VisionIssueReport[] {
    return visionRepository.listIssues();
  }

  getIssue(id: string): VisionIssueReport {
    const issue = visionRepository.getIssue(id);
    if (!issue) throw new VisionError('VISION_NOT_FOUND', 'Issue report not found.', { status: 404 });
    return issue;
  }

  deleteIssue(id: string): void {
    visionRepository.deleteIssue(id);
  }

  exportIssue(id: string, format: 'markdown' | 'json'): string {
    const issue = this.getIssue(id);
    if (format === 'json') {
      return JSON.stringify(issue, null, 2);
    }
    const lines = [
      `# ${issue.title}`,
      '',
      `**Severity:** ${issue.severity}`,
      issue.route ? `**Route:** ${issue.route}` : '',
      '',
      issue.summary,
      '',
      '## Reproduction',
      ...issue.reproductionSteps.map((step, index) => `${index + 1}. ${step}`),
      '',
      '## Expected',
      issue.expected,
      '',
      '## Actual',
      issue.actual,
      '',
      '## Evidence',
      issue.evidenceScreenshotIds.length
        ? `Screenshots: ${issue.evidenceScreenshotIds.join(', ')}`
        : 'No screenshots attached.',
      issue.eventIds.length ? `Events: ${issue.eventIds.join(', ')}` : '',
      issue.diffId ? `Visual diff: ${issue.diffId}` : '',
      '',
      '## Suspected causes (hypotheses)',
      ...(issue.suspectedCauses.length
        ? issue.suspectedCauses.map((c) => `- ${c}`)
        : ['- Not determined']),
      '',
      '## Verification plan',
      ...(issue.verificationPlan.length
        ? issue.verificationPlan.map((v) => `- ${v}`)
        : ['- Not specified']),
      '',
      `_Created ${issue.createdAt}_`,
    ];
    return lines.filter((line) => line !== '').join('\n');
  }

  // --- AI analysis ---

  async analyze(input: {
    eventIds?: unknown;
    element?: unknown;
    diffId?: unknown;
    screenshotIds?: unknown;
    question?: unknown;
    route?: unknown;
    sessionId?: unknown;
  }) {
    const sessionId = typeof input.sessionId === 'string' ? input.sessionId : null;
    const eventIds = Array.isArray(input.eventIds) ? input.eventIds.map(String) : [];
    const events = sessionId
      ? visionRepository
          .listEvents(sessionId)
          .filter((event) => eventIds.includes(event.id))
      : [];

    const bundle: AnalysisContextBundle = {
      question: typeof input.question === 'string' ? input.question.slice(0, 1000) : undefined,
      events,
      element: (input.element ?? null) as AnalysisContextBundle['element'],
      diff: typeof input.diffId === 'string' ? visionRepository.getDiff(input.diffId) : null,
      screenshotIds: Array.isArray(input.screenshotIds) ? input.screenshotIds.map(String) : [],
      route: typeof input.route === 'string' ? input.route.slice(0, 512) : undefined,
    };

    return analyzeVisionContext(bundle);
  }

  // --- Storage / history ---

  storageStats() {
    return visionRepository.storageStats();
  }

  clearHistory() {
    return visionRepository.clearHistory();
  }

  readArtifact(id: string): { buffer: Buffer; mimeType: string } {
    const artifact = visionRepository.getArtifact(id);
    if (!artifact) {
      throw new VisionError('VISION_ARTIFACT_MISSING', 'Artifact not found.', { status: 404 });
    }
    const filePath = visionRepository.resolveArtifactPath(id);
    if (!fs.existsSync(filePath)) {
      throw new VisionError('VISION_ARTIFACT_MISSING', 'Artifact file is missing.', { status: 404 });
    }
    return { buffer: fs.readFileSync(filePath), mimeType: artifact.mimeType };
  }
}

export const visionService = new VisionService();
