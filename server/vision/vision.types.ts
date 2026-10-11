/**
 * Shared contract types for Feature 5 — Live App Vision.
 *
 * These types are mirrored (type-only) in
 * src/features/live-app-vision/types/vision.ts. Keep the two in sync.
 */

export type VisionConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'ready'
  | 'error';

export type VisionActivity =
  | 'idle'
  | 'capturing'
  | 'inspecting'
  | 'comparing'
  | 'analyzing';

export type VisionEventKind =
  | 'console-error'
  | 'console-warning'
  | 'page-error'
  | 'request-failed'
  | 'http-error'
  | 'navigation'
  | 'accessibility-note';

export type VisionSeverity = 'info' | 'warning' | 'error';

export interface PreviewInfo {
  sessionId: string;
  url: string;
  origin: string;
  title: string | null;
  reachable: boolean;
  /** Textual reachability detail. Never a fabricated success. */
  connection: VisionConnectionState;
  /** True when this session is the IDE's own sandboxed workspace preview. */
  internal: boolean;
  viewport: { width: number; height: number };
  lastCheckedAt: string;
}

export interface VisionEvent {
  id: string;
  sessionId: string;
  kind: VisionEventKind;
  severity: VisionSeverity;
  message: string;
  sourceUrl?: string;
  line?: number;
  column?: number;
  statusCode?: number;
  timestamp: string;
  fingerprint: string;
  redacted: boolean;
  /** Number of times this fingerprint has been observed in the session. */
  count: number;
}

export interface ScreenshotRecord {
  id: string;
  sessionId: string;
  createdAt: string;
  width: number;
  height: number;
  relativePath: string;
  label?: string;
  baseline: boolean;
  pinned: boolean;
  sha256: string;
}

export interface VisionElement {
  tagName: string;
  role?: string;
  accessibleName?: string;
  selectorHint?: string;
  textPreview?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  attributes: Record<string, string>;
}

export interface VisualDiffResult {
  id: string;
  baselineId: string;
  currentId: string;
  diffArtifactId: string;
  changedPixels: number;
  totalPixels: number;
  changedRatio: number;
  threshold: number;
  dimensionsMatch: boolean;
  createdAt: string;
}

export interface VisionIssueReport {
  id: string;
  title: string;
  summary: string;
  severity: VisionSeverity;
  route?: string;
  reproductionSteps: string[];
  expected: string;
  actual: string;
  evidenceScreenshotIds: string[];
  eventIds: string[];
  diffId?: string;
  element?: VisionElement;
  suspectedCauses: string[];
  verificationPlan: string[];
  createdAt: string;
}

export interface VisionCapabilities {
  browserAvailable: boolean;
  screenshotCapture: boolean;
  consoleEvents: boolean;
  requestEvents: boolean;
  elementInspection: boolean;
  visualDiff: boolean;
  aiAnalysis: boolean;
  reason: Record<string, string>;
}

export interface VisionAnalysisObservation {
  statement: string;
  evidenceIds: string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface VisionAnalysis {
  summary: string;
  observations: VisionAnalysisObservation[];
  likelyCauses: Array<{
    cause: string;
    reasoning: string;
    evidenceIds: string[];
    confidence: 'low' | 'medium' | 'high';
  }>;
  recommendedChecks: string[];
  suggestedFixes: Array<{
    description: string;
    files?: string[];
    risk: 'low' | 'medium' | 'high';
  }>;
  missingEvidence: string[];
  /** Whether this came from a configured model or a deterministic local pass. */
  source: 'model' | 'local';
}

export interface VisionStoredArtifact {
  id: string;
  sessionId: string;
  kind: 'screenshot' | 'diff';
  relativePath: string;
  mimeType: string;
  createdAt: string;
}
