import path from 'path';

const ROOT = process.cwd();

export const VISION_DATA_DIR =
  process.env.VISION_DATA_DIR || path.join(ROOT, 'data', 'vision');
export const VISION_SCREENSHOT_DIR = path.join(VISION_DATA_DIR, 'screenshots');
export const VISION_DIFF_DIR = path.join(VISION_DATA_DIR, 'diffs');
export const VISION_HISTORY_FILE = path.join(VISION_DATA_DIR, 'history.json');

export const VISION_LIMITS = {
  /** Cap a single uploaded screenshot (base64 decoded) at 8 MB. */
  maxScreenshotBytes: 8 * 1024 * 1024,
  /** Bound in-memory events kept per session. */
  maxEventsPerSession: 2000,
  /** Console/network message length cap after normalization. */
  maxEventMessageLength: 2000,
  /** Stack trace cap. */
  maxStackLength: 8000,
  /** Keep the newest N unpinned screenshots. */
  retentionScreenshots: 100,
  /** Total artifact storage quota. */
  storageQuotaBytes: 250 * 1024 * 1024,
  /** Maximum characters sent to the AI adapter. */
  maxAnalysisChars: 24000,
  /** Bound a preview reachability probe. */
  reachabilityTimeoutMs: 4000,
  /** Concurrent in-flight captures per session. */
  maxCapturePerSession: 1,
};

/** Default viewport used when a session is created without one. */
export const VISION_DEFAULT_VIEWPORT = { width: 1440, height: 900 };

/**
 * Internal, non-network preview target. The IDE's own sandboxed workspace
 * preview registers with this URL so capabilities can be reported truthfully.
 */
export const INTERNAL_PREVIEW_URL = 'preview://devforge/index.html';
