import crypto from 'crypto';
import { VISION_LIMITS } from './vision.config';
import type { VisionEventKind, VisionSeverity } from './vision.types';

/**
 * Redaction is intentionally implemented as a list of ordered, individually
 * tested replacement functions so no rule depends on another rule's capture
 * groups. Every replacement preserves a human-readable marker.
 */
const REDACTIONS: Array<{ name: string; apply: (value: string) => string }> = [
  {
    name: 'bearer',
    apply: (value) =>
      value.replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]'),
  },
  {
    name: 'jwt',
    apply: (value) =>
      value.replace(
        /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\b/g,
        '[REDACTED_JWT]'
      ),
  },
  {
    name: 'aws-key',
    apply: (value) => value.replace(/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED_KEY]'),
  },
  {
    name: 'key-value',
    apply: (value) =>
      value.replace(
        /\b(api[_-]?key|access[_-]?token|client[_-]?secret|token|secret|password|authorization)\b\s*[:=]\s*["']?[^"'&\s,}]+/gi,
        '$1=[REDACTED]'
      ),
  },
  {
    name: 'query-param',
    apply: (value) =>
      value.replace(
        /([?&](?:token|key|secret|password|authorization|access_token|api_key)=)[^&\s]+/gi,
        '$1[REDACTED]'
      ),
  },
];

export function redactSensitiveText(input: string): string {
  let output = (input ?? '').slice(0, VISION_LIMITS.maxStackLength);
  for (const rule of REDACTIONS) {
    output = rule.apply(output);
  }
  return output;
}

export interface RawVisionEventInput {
  sessionId: string;
  kind: VisionEventKind;
  message: string;
  severity?: VisionSeverity;
  sourceUrl?: string;
  line?: number;
  column?: number;
  statusCode?: number;
}

export interface NormalizedVisionEvent {
  sessionId: string;
  kind: VisionEventKind;
  severity: VisionSeverity;
  message: string;
  sourceUrl?: string;
  line?: number;
  column?: number;
  statusCode?: number;
  fingerprint: string;
  redacted: boolean;
  timestamp: string;
}

function defaultSeverity(kind: VisionEventKind, statusCode?: number): VisionSeverity {
  switch (kind) {
    case 'console-error':
    case 'page-error':
    case 'request-failed':
      return 'error';
    case 'http-error':
      return statusCode && statusCode >= 500 ? 'error' : 'warning';
    case 'console-warning':
    case 'accessibility-note':
      return 'warning';
    default:
      return 'info';
  }
}

/** Strip volatile tokens (ids, timestamps, hex, numbers) before hashing. */
function canonicalizeMessage(message: string): string {
  return message
    .replace(/\b[0-9a-f]{8,}\b/gi, '<hex>')
    .replace(/\b\d{4}-\d{2}-\d{2}T[\d:.]+Z?\b/g, '<time>')
    .replace(/\b\d{5,}\b/g, '<num>')
    .replace(/:[0-9]+:[0-9]+/g, ':<loc>')
    .toLowerCase()
    .trim();
}

function sourcePathOf(sourceUrl?: string): string {
  if (!sourceUrl) return '';
  try {
    const parsed = new URL(sourceUrl);
    return parsed.pathname;
  } catch {
    return sourceUrl.split('?')[0];
  }
}

export function computeFingerprint(
  kind: VisionEventKind,
  message: string,
  sourceUrl?: string,
  statusCode?: number
): string {
  const canonical = [
    kind,
    canonicalizeMessage(message),
    sourcePathOf(sourceUrl),
    statusCode != null ? String(statusCode) : '',
  ].join('|');
  return crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}

export function normalizeVisionEvent(input: RawVisionEventInput): NormalizedVisionEvent {
  const rawMessage = typeof input.message === 'string' ? input.message : String(input.message ?? '');
  const redactedMessage = redactSensitiveText(rawMessage).slice(
    0,
    VISION_LIMITS.maxEventMessageLength
  );
  const redacted = redactedMessage !== rawMessage.slice(0, VISION_LIMITS.maxEventMessageLength);

  const sourceUrl = input.sourceUrl ? redactSensitiveText(input.sourceUrl) : undefined;

  return {
    sessionId: input.sessionId,
    kind: input.kind,
    severity: input.severity ?? defaultSeverity(input.kind, input.statusCode),
    message: redactedMessage.trim(),
    sourceUrl,
    line: input.line,
    column: input.column,
    statusCode: input.statusCode,
    fingerprint: computeFingerprint(input.kind, redactedMessage, sourceUrl, input.statusCode),
    redacted,
    timestamp: new Date().toISOString(),
  };
}
