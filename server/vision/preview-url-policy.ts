import dns from 'dns';
import { VisionError } from './vision.errors';
import { INTERNAL_PREVIEW_URL } from './vision.config';

export interface ValidatedPreviewUrl {
  url: string;
  origin: string;
  hostname: string;
  internal: boolean;
}

const BLOCKED_SCHEMES = new Set([
  'file:',
  'javascript:',
  'data:',
  'chrome:',
  'about:',
  'blob:',
  'vbscript:',
]);

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Prepend a scheme when the user omits one and strip the hash. Query strings
 * are preserved (routes often depend on them) but never credentials.
 */
export function normalizePreviewUrl(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) throw invalidUrl();

  if (trimmed.toLowerCase().startsWith('preview:')) {
    return INTERNAL_PREVIEW_URL;
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw invalidUrl();
  }

  if (BLOCKED_SCHEMES.has(parsed.protocol)) throw invalidUrl();
  if (parsed.username || parsed.password) {
    throw new VisionError(
      'VISION_PREVIEW_INVALID',
      'Preview URLs must not contain credentials.',
      { status: 400 }
    );
  }
  parsed.hash = '';
  return parsed.toString();
}

function invalidUrl(): VisionError {
  return new VisionError(
    'VISION_PREVIEW_INVALID',
    'Enter a local HTTP(S) development URL such as http://localhost:5173.',
    { status: 400, hint: 'Only loopback hosts are allowed by default.' }
  );
}

function isLoopbackAddress(address: string): boolean {
  const normalized = address.replace(/^\[|\]$/g, '').toLowerCase();
  if (normalized === '::1') return true;
  if (normalized === 'localhost') return true;
  const v4 = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 127;
  }
  // IPv4-mapped IPv6 (::ffff:127.0.0.1)
  const mapped = normalized.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return mapped[1].startsWith('127.');
  return false;
}

/**
 * Authoritative server-side validation. Loopback-only in v1; LAN and remote
 * hosts must go through a future explicit allow-list flow.
 */
export function validatePreviewUrl(raw: string): ValidatedPreviewUrl {
  const normalized = normalizePreviewUrl(raw);

  if (normalized.startsWith('preview:')) {
    return {
      url: INTERNAL_PREVIEW_URL,
      origin: 'preview://devforge',
      hostname: 'devforge',
      internal: true,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw invalidUrl();
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw invalidUrl();
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!LOOPBACK_HOSTNAMES.has(hostname) && !isLoopbackAddress(hostname)) {
    throw new VisionError(
      'VISION_PREVIEW_BLOCKED',
      `Host "${hostname}" is not an allowed loopback preview target.`,
      {
        status: 403,
        hint: 'Only localhost, 127.0.0.1 and ::1 are permitted in v1.',
      }
    );
  }

  return {
    url: parsed.toString(),
    origin: parsed.origin,
    hostname,
    internal: false,
  };
}

/**
 * Resolve the hostname and confirm every returned address is loopback. This
 * guards against a hostname that merely looks local but resolves elsewhere.
 */
export function assertResolvedLoopback(hostname: string): Promise<void> {
  if (LOOPBACK_HOSTNAMES.has(hostname)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    dns.lookup(hostname, { all: true }, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        reject(
          new VisionError(
            'VISION_PREVIEW_UNREACHABLE',
            `Could not resolve preview host "${hostname}".`,
            { status: 502, retryable: true }
          )
        );
        return;
      }
      const blocked = addresses.find((a) => !isLoopbackAddress(a.address));
      if (blocked) {
        reject(
          new VisionError(
            'VISION_PREVIEW_BLOCKED',
            `Host "${hostname}" resolved to a non-loopback address and was blocked.`,
            { status: 403 }
          )
        );
        return;
      }
      resolve();
    });
  });
}

/** Exposed for focused unit testing of the address predicate. */
export const __test__ = { isLoopbackAddress };
