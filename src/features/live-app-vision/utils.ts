import { FileNode, flattenFiles } from '../../core/filesystem';
import { generatePreviewHtml, InspectedElement } from '../../core/preview';
import type { VisionElement } from './types/vision';

const LOOPBACK_PATTERN = /^(localhost|127\.0\.0\.1|\[?::1\]?)(:\d{1,5})?/i;
const PREVIEW_SCHEME = 'preview://';

/**
 * Client-side quick validation for instant feedback. The server remains the
 * authoritative source of truth; never trust the browser for security.
 */
export function sanitizePreviewUrl(raw: string): { url: string; error: string | null } {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { url: '', error: 'Enter a preview URL.' };

  if (trimmed.toLowerCase().startsWith('preview:')) {
    return { url: PREVIEW_SCHEME, error: null };
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { url: '', error: 'That is not a valid URL.' };
  }
  if (parsed.username || parsed.password) {
    return { url: '', error: 'Preview URLs must not contain credentials.' };
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return { url: '', error: 'Only HTTP(S) preview URLs are supported.' };
  }
  if (!LOOPBACK_PATTERN.test(parsed.hostname)) {
    return {
      url: '',
      error: `"${parsed.hostname}" is not a loopback host. Only localhost, 127.0.0.1 and ::1 are allowed in v1.`,
    };
  }
  parsed.hash = '';
  return { url: parsed.toString(), error: null };
}

export function formatEventTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

/** Convert the IDE bridge's inspected-element payload into a VisionElement. */
export function toVisionElement(payload: InspectedElement): VisionElement {
  const attributes: Record<string, string> = {};
  if (payload.id) attributes.id = payload.id;
  if (payload.className) attributes.class = String(payload.className);
  return {
    tagName: payload.tagName,
    selectorHint: payload.sourceHint,
    textPreview: payload.textContent?.slice(0, 120),
    boundingBox: payload.boundingRect
      ? {
          x: payload.boundingRect.x,
          y: payload.boundingRect.y,
          width: payload.boundingRect.width,
          height: payload.boundingRect.height,
        }
      : undefined,
    attributes,
  };
}

export function downloadText(filename: string, content: string, mime = 'text/markdown'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const PREVIEW_LOADING_HTML =
  '<!doctype html><html><body style="margin:0;background:#0e1014;color:#a1a1aa;font:13px system-ui;display:grid;place-items:center;height:100vh">Compiling workspace preview…</body></html>';

/**
 * Build the sandboxed srcDoc for the IDE's own workspace preview, including
 * the extended bridge (console/error/element/screenshot). Returns the loading
 * document first when a React bundle must be compiled server-side.
 */
export async function compileWorkspacePreview(
  files: FileNode[]
): Promise<string> {
  const workspaceFiles = flattenFiles(files).filter((file) => file.type === 'file');
  const hasReactSource = workspaceFiles.some((file) => /\.(tsx|jsx)$/i.test(file.name));

  if (!hasReactSource) return generatePreviewHtml(files);

  const bundle = await fetch('/api/preview-bundle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      files: workspaceFiles.map((file) => ({ path: file.path, content: file.content || '' })),
    }),
  }).then(async (response) => {
    const data = (await response.json()) as {
      javascript?: string;
      stylesheet?: string;
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error || `Preview compiler returned HTTP ${response.status}.`);
    }
    return data;
  });

  return generatePreviewHtml(files, {
    javascript: bundle.javascript ?? '',
    stylesheet: bundle.stylesheet,
    error: bundle.error,
  });
}

export { PREVIEW_LOADING_HTML };