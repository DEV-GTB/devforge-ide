export type VisionErrorCode =
  | 'VISION_PREVIEW_INVALID'
  | 'VISION_PREVIEW_BLOCKED'
  | 'VISION_PREVIEW_UNREACHABLE'
  | 'VISION_BROWSER_MISSING'
  | 'VISION_SESSION_EXPIRED'
  | 'VISION_CAPTURE_TIMEOUT'
  | 'VISION_CAPTURE_FAILED'
  | 'VISION_ARTIFACT_MISSING'
  | 'VISION_DIFF_DIMENSIONS_MISMATCH'
  | 'VISION_DIFF_FAILED'
  | 'VISION_AI_NOT_CONFIGURED'
  | 'VISION_AI_TIMEOUT'
  | 'VISION_CONTEXT_TOO_LARGE'
  | 'VISION_STORAGE_QUOTA'
  | 'VISION_PERMISSION_REQUIRED'
  | 'VISION_INVALID_REQUEST'
  | 'VISION_NOT_FOUND'
  | 'VISION_INTERNAL';

export interface VisionErrorPayload {
  code: VisionErrorCode;
  message: string;
  retryable: boolean;
  hint?: string;
  diagnosticId: string;
}

export class VisionError extends Error {
  readonly code: VisionErrorCode;
  readonly retryable: boolean;
  readonly hint?: string;
  readonly status: number;
  readonly diagnosticId: string;

  constructor(
    code: VisionErrorCode,
    message: string,
    options: { retryable?: boolean; hint?: string; status?: number } = {}
  ) {
    super(message);
    this.name = 'VisionError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.hint = options.hint;
    this.status = options.status ?? 400;
    this.diagnosticId = Math.random().toString(36).slice(2, 10);
  }

  toPayload(): VisionErrorPayload {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      hint: this.hint,
      diagnosticId: this.diagnosticId,
    };
  }
}

/**
 * Convert any thrown value into a stable, secret-free JSON body. Stack traces
 * and local paths are never returned to the browser.
 */
export function toVisionErrorPayload(error: unknown): {
  status: number;
  body: VisionErrorPayload;
} {
  if (error instanceof VisionError) {
    return { status: error.status, body: error.toPayload() };
  }
  const message =
    error instanceof Error ? error.message : 'Unexpected vision service error.';
  return {
    status: 500,
    body: {
      code: 'VISION_INTERNAL',
      message,
      retryable: true,
      diagnosticId: Math.random().toString(36).slice(2, 10),
    },
  };
}
