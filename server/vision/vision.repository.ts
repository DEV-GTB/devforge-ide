import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  VISION_DATA_DIR,
  VISION_DIFF_DIR,
  VISION_HISTORY_FILE,
  VISION_SCREENSHOT_DIR,
  VISION_LIMITS,
} from './vision.config';
import { VisionError } from './vision.errors';
import type {
  PreviewInfo,
  ScreenshotRecord,
  VisionEvent,
  VisionIssueReport,
  VisionStoredArtifact,
  VisualDiffResult,
} from './vision.types';

interface HistoryShape {
  sessions: PreviewInfo[];
  screenshots: ScreenshotRecord[];
  events: VisionEvent[];
  diffs: VisualDiffResult[];
  issues: VisionIssueReport[];
  artifacts: VisionStoredArtifact[];
}

const EMPTY_HISTORY: HistoryShape = {
  sessions: [],
  screenshots: [],
  events: [],
  diffs: [],
  issues: [],
  artifacts: [],
};

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

/**
 * Local, single-instance metadata store. Artifact bytes live on disk under the
 * app-owned vision directory; metadata is mirrored to history.json so local
 * history survives restarts. No cookies, form values or HTML are stored.
 */
export class VisionRepository {
  private sessions = new Map<string, PreviewInfo>();
  private screenshots = new Map<string, ScreenshotRecord>();
  private events = new Map<string, VisionEvent[]>();
  private diffs = new Map<string, VisualDiffResult>();
  private issues = new Map<string, VisionIssueReport>();
  private artifacts = new Map<string, VisionStoredArtifact>();
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    fs.mkdirSync(VISION_SCREENSHOT_DIR, { recursive: true });
    fs.mkdirSync(VISION_DIFF_DIR, { recursive: true });
    this.load();
    this.initialized = true;
  }

  private load(): void {
    try {
      if (!fs.existsSync(VISION_HISTORY_FILE)) return;
      const parsed = JSON.parse(
        fs.readFileSync(VISION_HISTORY_FILE, 'utf-8')
      ) as Partial<HistoryShape>;
      const history: HistoryShape = { ...EMPTY_HISTORY, ...parsed };
      history.sessions.forEach((s) => this.sessions.set(s.sessionId, s));
      history.screenshots.forEach((s) => this.screenshots.set(s.id, s));
      history.diffs.forEach((d) => this.diffs.set(d.id, d));
      history.issues.forEach((i) => this.issues.set(i.id, i));
      history.artifacts.forEach((a) => this.artifacts.set(a.id, a));
      for (const event of history.events) {
        const list = this.events.get(event.sessionId) ?? [];
        list.push(event);
        this.events.set(event.sessionId, list);
      }
    } catch {
      // A corrupt history file must never take the service down.
    }
  }

  private persist(): void {
    const history: HistoryShape = {
      sessions: [...this.sessions.values()],
      screenshots: [...this.screenshots.values()],
      events: [...this.events.values()].flat(),
      diffs: [...this.diffs.values()],
      issues: [...this.issues.values()],
      artifacts: [...this.artifacts.values()],
    };
    try {
      fs.mkdirSync(VISION_DATA_DIR, { recursive: true });
      const tmp = `${VISION_HISTORY_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(history), 'utf-8');
      fs.renameSync(tmp, VISION_HISTORY_FILE);
    } catch {
      // Persistence is best-effort; the in-memory state remains authoritative.
    }
  }

  // --- Sessions ---

  saveSession(info: PreviewInfo): PreviewInfo {
    this.sessions.set(info.sessionId, info);
    this.persist();
    return info;
  }

  getSession(id: string): PreviewInfo | null {
    return this.sessions.get(id) ?? null;
  }

  listSessions(): PreviewInfo[] {
    return [...this.sessions.values()];
  }

  deleteSession(id: string): void {
    this.sessions.delete(id);
    this.events.delete(id);
    this.persist();
  }

  // --- Artifacts ---

  writeArtifact(
    kind: 'screenshot' | 'diff',
    sessionId: string,
    buffer: Buffer,
    mimeType = 'image/png'
  ): VisionStoredArtifact {
    this.init();
    const id = newId(kind === 'screenshot' ? 'shot' : 'diff');
    const dir = kind === 'screenshot' ? VISION_SCREENSHOT_DIR : VISION_DIFF_DIR;
    const relativePath = path
      .join(path.basename(dir), `${id}.png`)
      .split(path.sep)
      .join('/');
    const absolutePath = path.join(VISION_DATA_DIR, relativePath);
    const tmp = `${absolutePath}.tmp`;
    fs.writeFileSync(tmp, buffer);
    fs.renameSync(tmp, absolutePath);

    const artifact: VisionStoredArtifact = {
      id,
      sessionId,
      kind,
      relativePath,
      mimeType,
      createdAt: new Date().toISOString(),
    };
    this.artifacts.set(id, artifact);
    this.persist();
    return artifact;
  }

  getArtifact(id: string): VisionStoredArtifact | null {
    return this.artifacts.get(id) ?? null;
  }

  resolveArtifactPath(id: string): string {
    const artifact = this.artifacts.get(id);
    if (!artifact) {
      throw new VisionError('VISION_ARTIFACT_MISSING', 'Artifact not found.', { status: 404 });
    }
    const absolute = path.resolve(VISION_DATA_DIR, artifact.relativePath);
    const root = path.resolve(VISION_DATA_DIR);
    if (!absolute.startsWith(root + path.sep)) {
      throw new VisionError('VISION_ARTIFACT_MISSING', 'Artifact path rejected.', { status: 400 });
    }
    return absolute;
  }

  // --- Screenshots ---

  addScreenshot(record: ScreenshotRecord): ScreenshotRecord {
    this.screenshots.set(record.id, record);
    this.persist();
    this.enforceRetention();
    return record;
  }

  getScreenshot(id: string): ScreenshotRecord | null {
    return this.screenshots.get(id) ?? null;
  }

  listScreenshots(sessionId: string): ScreenshotRecord[] {
    return [...this.screenshots.values()]
      .filter((s) => s.sessionId === sessionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  setBaseline(id: string, baseline: boolean): ScreenshotRecord | null {
    const record = this.screenshots.get(id);
    if (!record) return null;
    if (baseline) {
      for (const other of this.screenshots.values()) {
        if (other.sessionId === record.sessionId && other.id !== id) {
          other.baseline = false;
        }
      }
    }
    record.baseline = baseline;
    this.persist();
    return record;
  }

  setPinned(id: string, pinned: boolean): ScreenshotRecord | null {
    const record = this.screenshots.get(id);
    if (!record) return null;
    record.pinned = pinned;
    this.persist();
    return record;
  }

  deleteScreenshot(id: string): void {
    const record = this.screenshots.get(id);
    this.screenshots.delete(id);
    if (record) {
      const artifact = [...this.artifacts.values()].find(
        (a) => a.relativePath === record.relativePath
      );
      if (artifact) {
        this.artifacts.delete(artifact.id);
        try {
          fs.unlinkSync(this.resolveArtifactPath(artifact.id));
        } catch {}
      }
    }
    this.persist();
  }

  // --- Events ---

  addEvent(event: VisionEvent): VisionEvent {
    const list = this.events.get(event.sessionId) ?? [];
    const existing = list.find((e) => e.fingerprint === event.fingerprint);
    if (existing) {
      existing.count += 1;
      existing.timestamp = event.timestamp;
      this.persist();
      return existing;
    }
    list.push(event);
    if (list.length > VISION_LIMITS.maxEventsPerSession) {
      list.splice(0, list.length - VISION_LIMITS.maxEventsPerSession);
    }
    this.events.set(event.sessionId, list);
    this.persist();
    return event;
  }

  listEvents(sessionId: string, severity?: string): VisionEvent[] {
    const list = this.events.get(sessionId) ?? [];
    const filtered = severity
      ? list.filter((e) => e.severity === severity)
      : list;
    return [...filtered].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  clearEvents(sessionId: string): void {
    this.events.delete(sessionId);
    this.persist();
  }

  // --- Diffs ---

  addDiff(result: VisualDiffResult): VisualDiffResult {
    this.diffs.set(result.id, result);
    this.persist();
    return result;
  }

  getDiff(id: string): VisualDiffResult | null {
    return this.diffs.get(id) ?? null;
  }

  listDiffs(sessionId: string): VisualDiffResult[] {
    return [...this.diffs.values()]
      .filter((d) => {
        const screenshot = this.screenshots.get(d.currentId);
        return screenshot ? screenshot.sessionId === sessionId : false;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // --- Issues ---

  addIssue(issue: VisionIssueReport): VisionIssueReport {
    this.issues.set(issue.id, issue);
    this.persist();
    return issue;
  }

  getIssue(id: string): VisionIssueReport | null {
    return this.issues.get(id) ?? null;
  }

  listIssues(): VisionIssueReport[] {
    return [...this.issues.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }

  deleteIssue(id: string): void {
    this.issues.delete(id);
    this.persist();
  }

  // --- Storage management ---

  private enforceRetention(): void {
    const unpinned = [...this.screenshots.values()]
      .filter((s) => !s.pinned)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const overflow = unpinned.slice(VISION_LIMITS.retentionScreenshots);
    for (const record of overflow) {
      this.deleteScreenshot(record.id);
    }
  }

  storageStats(): {
    screenshotCount: number;
    bytes: number;
    quotaBytes: number;
  } {
    let bytes = 0;
    for (const artifact of this.artifacts.values()) {
      try {
        bytes += fs.statSync(this.resolveArtifactPath(artifact.id)).size;
      } catch {}
    }
    return {
      screenshotCount: this.screenshots.size,
      bytes,
      quotaBytes: VISION_LIMITS.storageQuotaBytes,
    };
  }

  clearHistory(): { screenshots: number; issues: number } {
    const screenshotCount = this.screenshots.size;
    const issueCount = this.issues.size;
    for (const record of this.screenshots.values()) {
      const artifact = [...this.artifacts.values()].find(
        (a) => a.relativePath === record.relativePath
      );
      if (artifact) {
        try {
          fs.unlinkSync(this.resolveArtifactPath(artifact.id));
        } catch {}
        this.artifacts.delete(artifact.id);
      }
    }
    this.screenshots.clear();
    this.events.clear();
    this.diffs.clear();
    this.issues.clear();
    this.persist();
    return { screenshots: screenshotCount, issues: issueCount };
  }
}

export const visionRepository = new VisionRepository();
