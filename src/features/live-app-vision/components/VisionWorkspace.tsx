import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  FileText,
  Loader2,
  MonitorSmartphone,
  Plug,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Unplug,
  X,
} from 'lucide-react';
import { FileNode, flattenFiles } from '../../../core/filesystem';
import * as visionApi from '../api/visionClient';
import { useVisionSession } from '../hooks/useVisionSession';
import { useVisionEvents } from '../hooks/useVisionEvents';
import { sanitizePreviewUrl, compileWorkspacePreview, toVisionElement, formatBytes, PREVIEW_LOADING_HTML } from '../utils';
import {
  ComparePanel,
  DiagnosticsPanel,
  EmptyState,
  IssuesPanel,
  ScreenshotGallery,
  VisionInspector,
} from './VisionPanels';
import type {
  ScreenshotRecord,
  VisionAnalysis,
  VisionElement,
  VisionIssueReport,
} from '../types/vision';

type VisionTab = 'preview' | 'screenshots' | 'compare' | 'diagnostics' | 'issues';

interface PreviewTarget {
  kind: 'srcdoc' | 'url';
  value: string;
}

interface PendingCapture {
  timer: ReturnType<typeof setTimeout>;
  resolve: (value: { dataUrl: string; width: number; height: number }) => void;
  reject: (reason: Error) => void;
}

interface VisionWorkspaceProps {
  files: FileNode[];
}

const VIEWPORT_PRESETS = [
  { label: 'Responsive', width: 0, height: 0 },
  { label: 'Desktop 1440×900', width: 1440, height: 900 },
  { label: 'Laptop 1280×800', width: 1280, height: 800 },
  { label: 'Tablet 820×1180', width: 820, height: 1180 },
  { label: 'Mobile 390×844', width: 390, height: 844 },
];

const TAB_BUTTON = 'px-2.5 py-1.5 text-[11px] font-medium rounded-t transition border-b-2';
const TOOLBAR_BUTTON =
  'inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-[#1e1e24] border border-[#27272a] text-zinc-300 hover:border-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed';

export function VisionWorkspace({ files }: VisionWorkspaceProps) {
  const { session, capabilities, busy, error, connect, disconnect, reload } = useVisionSession();
  const { events, paused, unavailable, setPaused, add, clear, flush } = useVisionEvents(session?.sessionId ?? null);

  const [urlInput, setUrlInput] = useState('preview://');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [tab, setTab] = useState<VisionTab>('preview');
  const [captureLabel, setCaptureLabel] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [screenshots, setScreenshots] = useState<ScreenshotRecord[]>([]);
  const [issues, setIssues] = useState<VisionIssueReport[]>([]);
  const [selectedElement, setSelectedElement] = useState<VisionElement | null>(null);
  const [inspectorActive, setInspectorActive] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);
  const [analysis, setAnalysis] = useState<VisionAnalysis | null>(null);
  const [draftingIssue, setDraftingIssue] = useState(false);
  const [storage, setStorage] = useState<{ bytes: number; quotaBytes: number } | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingCapture = useRef<PendingCapture | null>(null);

  const sessionId = session?.sessionId ?? null;
  const internal = session?.internal === true;

  const hasReactSource = useMemo(
    () => flattenFiles(files).some((file) => /\.(tsx|jsx)$/i.test(file.name)),
    [files]
  );

  const loadScreenshots = useCallback(async (id: string) => {
    try {
      const result = await visionApi.listScreenshots(id);
      setScreenshots(result.screenshots);
    } catch {}
  }, []);

  const loadIssues = useCallback(async () => {
    try {
      const result = await visionApi.listIssues();
      setIssues(result.issues);
    } catch {}
  }, []);

  const loadStorage = useCallback(async () => {
    try {
      const result = await visionApi.getStorage();
      setStorage(result.storage);
    } catch {}
  }, []);

  useEffect(() => {
    if (sessionId) void loadIssues();
  }, [sessionId, loadIssues]);

  // Bridge listener for the sandboxed workspace preview.
  useEffect(() => {
    if (!sessionId || !internal) return;
    const listener = (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;
      const data = event.data as Record<string, unknown>;
      if (!data || typeof data !== 'object' || typeof data.type !== 'string') return;

      if (data.type === 'DEVFORGE_PREVIEW_CONSOLE') {
        const level = data.level === 'error' ? 'error' : data.level === 'warn' ? 'warn' : 'info';
        if (level === 'error') {
          void add({ kind: 'console-error', message: String(data.text ?? '') });
          void flush();
        } else if (level === 'warn') {
          void add({ kind: 'console-warning', message: String(data.text ?? '') });
          void flush();
        }
      } else if (data.type === 'DEVFORGE_PREVIEW_ERROR') {
        void add({
          kind: 'page-error',
          message: String(data.message ?? 'Unknown runtime error'),
          line: typeof data.lineno === 'number' ? data.lineno : undefined,
          column: typeof data.colno === 'number' ? data.colno : undefined,
        });
        void flush();
      } else if (data.type === 'DEVFORGE_ELEMENT_INSPECTED') {
        setSelectedElement(toVisionElement(data.payload as never));
      } else if (data.type === 'DEVFORGE_PREVIEW_SCREENSHOT') {
        const pending = pendingCapture.current;
        if (pending) {
          clearTimeout(pending.timer);
          pendingCapture.current = null;
          pending.resolve({
            dataUrl: String(data.dataUrl ?? ''),
            width: Number(data.width ?? 0),
            height: Number(data.height ?? 0),
          });
        }
      } else if (data.type === 'DEVFORGE_PREVIEW_SCREENSHOT_ERROR') {
        const pending = pendingCapture.current;
        if (pending) {
          clearTimeout(pending.timer);
          pendingCapture.current = null;
          pending.reject(new Error(String(data.message ?? 'Capture failed in the preview.')));
        }
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [sessionId, internal, add, flush]);

  // Escape exits inspect mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && inspectorActive) {
        setInspectorActive(false);
        iframeRef.current?.contentWindow?.postMessage({ type: 'TOGGLE_INSPECTOR', active: false }, '*');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inspectorActive]);

  async function handleConnect() {
    setUrlError(null);
    const { url, error: sanitizeError } = sanitizePreviewUrl(urlInput);
    if (sanitizeError) {
      setUrlError(sanitizeError);
      return;
    }
    try {
      setTab('preview');
      const connected = await connect(url);
      setScreenshots([]);
      setSelectedElement(null);
      await loadStorage();
      if (connected.internal) {
        setPreviewTarget({ kind: 'srcdoc', value: PREVIEW_LOADING_HTML });
        const html = await compileWorkspacePreview(files);
        setPreviewTarget({ kind: 'srcdoc', value: html });
      } else {
        setPreviewTarget({ kind: 'url', value: connected.url });
      }
      await loadScreenshots(connected.sessionId);
    } catch (err) {
      setPreviewTarget(null);
      if (err instanceof Error) setUrlError(err.message);
    }
  }

  async function handleDisconnect() {
    await disconnect().catch(() => undefined);
    setPreviewTarget(null);
    setSelectedElement(null);
    setInspectorActive(false);
  }

  async function handleReload() {
    void reload();
    if (internal) {
      setPreviewTarget({ kind: 'srcdoc', value: PREVIEW_LOADING_HTML });
      try {
        const html = await compileWorkspacePreview(files);
        setPreviewTarget({ kind: 'srcdoc', value: html });
      } catch {}
    } else if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  }

  async function handleCapture() {
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!sessionId || !internal || !iframeWindow) {
      setUrlError('Capture requires the sandboxed workspace preview.');
      return;
    }
    setCapturing(true);
    setUrlError(null);
    try {
      const shot = await new Promise<{ dataUrl: string; width: number; height: number }>(
        (resolve, reject) => {
          pendingCapture.current = { resolve, reject, timer: setTimeout(() => {
            pendingCapture.current = null;
            reject(new Error('Capture timed out while the preview rendered.'));
          }, 9000) };
          iframeWindow.postMessage({ type: 'VISION_CAPTURE_REQUEST' }, '*');
        }
      );
      if (!shot.dataUrl) throw new Error('The preview returned an empty capture.');
      const result = await visionApi.captureScreenshot(sessionId, shot.dataUrl, captureLabel.trim() || undefined);
      setScreenshots((old) => [result.screenshot, ...old]);
      setCaptureLabel('');
      setTab('screenshots');
      void loadStorage();
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Capture failed. See browser console for the preview reason.');
    } finally {
      setCapturing(false);
    }
  }

  function handleToggleInspector() {
    const next = !inspectorActive;
    setInspectorActive(next);
    iframeRef.current?.contentWindow?.postMessage({ type: 'TOGGLE_INSPECTOR', active: next }, '*');
  }

  function handleCopySelector() {
    if (selectedElement?.selectorHint) {
      void navigator.clipboard.writeText(selectedElement.selectorHint);
    }
  }

  async function handleExplain() {
    if (!sessionId) return;
    setAnalyzing(true);
    setUrlError(null);
    try {
      const result = await visionApi.analyzeVision({
        sessionId,
        eventIds: events.filter((e) => e.severity === 'error').map((e) => e.id),
        element: selectedElement ?? undefined,
      });
      setAnalysis(result.analysis);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  }

  function handleResolveIssue(id: string) {
    setIssues((old) => old.filter((i) => i.id !== id));
  }

  async function handleClearHistory() {
    if (!window.confirm('Clear all local vision history? Screenshots, diffs, events and issue reports will be deleted. This cannot be undone.')) return;
    await visionApi.clearHistory();
    setScreenshots([]);
    setIssues([]);
    void loadStorage();
  }

  const evidenceErrorEvents = events.filter((e) => e.severity === 'error');
  const connectedBadge = !session
    ? { text: 'Preview disconnected', cls: 'text-zinc-500 bg-zinc-900 border-zinc-800' }
    : !internal && !session.reachable
      ? { text: 'Could not reach preview', cls: 'text-rose-300 bg-rose-950/50 border-rose-800/50' }
      : internal
        ? { text: 'Workspace preview connected', cls: 'text-emerald-300 bg-emerald-950/50 border-emerald-800/50' }
        : { text: `Connected · ${session.origin}`, cls: 'text-emerald-300 bg-emerald-950/50 border-emerald-800/50' };

  return (
    <div className="flex h-full flex-col bg-[#18181b] text-zinc-200 min-w-0">
      {/* Toolbar */}
      <div className="shrink-0 border-b border-[#27272a] bg-[#121214] px-2 py-1.5 space-y-1.5">
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            void handleConnect();
          }}
        >
          <label htmlFor="vision-preview-url" className="sr-only">
            Preview URL
          </label>
          <input
            id="vision-preview-url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="http://localhost:5173 or preview://"
            spellCheck={false}
            disabled={Boolean(session)}
            className="flex-1 min-w-0 bg-[#0d1119] border border-[#27272a] rounded px-2 py-1 text-[11px] font-mono text-zinc-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          {!session ? (
            <button type="submit" disabled={busy || !urlInput.trim()} className={TOOLBAR_BUTTON}>
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plug className="w-3 h-3" />}
              Connect
            </button>
          ) : (
            <button type="button" onClick={() => void handleDisconnect()} disabled={busy} className={TOOLBAR_BUTTON} title="Disconnect and release this session">
              <Unplug className="w-3 h-3" /> Disconnect
            </button>
          )}
        </form>

        <div className="flex items-center gap-1.5">
          <input
            aria-label="Screenshot label"
            value={captureLabel}
            onChange={(e) => setCaptureLabel(e.target.value)}
            placeholder="Capture label (optional)"
            maxLength={120}
            disabled={!session || !internal}
            className="flex-1 min-w-0 bg-[#0d1119] border border-[#27272a] rounded px-2 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void handleCapture()}
            disabled={!session || !internal || !session.reachable || capturing}
            title={!internal ? 'Screenshot capture requires the workspace preview bridge.' : 'Capture the current preview as a PNG artifact'}
            className={TOOLBAR_BUTTON}
          >
            {capturing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
            {capturing ? 'Capturing…' : 'Capture'}
          </button>
          <button type="button" onClick={() => void handleReload()} disabled={!session || busy} className={TOOLBAR_BUTTON} title="Reload the preview">
            <RotateCw className="w-3 h-3" /> Reload
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${connectedBadge.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connectedBadge.text.startsWith('Workspace') || connectedBadge.text.startsWith('Connected') ? 'bg-emerald-400' : connectedBadge.text.startsWith('Could') ? 'bg-rose-400' : 'bg-zinc-500'}`} />
            {connectedBadge.text}
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> Local only
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 font-mono">
            {capabilities?.aiAnalysis ? <Sparkles className="w-3 h-3 text-blue-400" /> : <Sparkles className="w-3 h-3 text-zinc-600" />}
            AI {capabilities?.aiAnalysis ? 'configured' : 'off'}
          </span>
          {evidenceErrorEvents.length > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-rose-300 bg-rose-950/50 border border-rose-800/50">
              <AlertTriangle className="w-3 h-3" /> {evidenceErrorEvents.length} real error{evidenceErrorEvents.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {storage && (
          <p className="text-[10px] text-zinc-500">
            Local storage: {formatBytes(storage.bytes)} / {formatBytes(storage.quotaBytes)}
            <button className="ml-1.5 underline hover:text-rose-300" onClick={() => void handleClearHistory()} title="Clear all local vision history">
              Clear history
            </button>
          </p>
        )}

        {(urlError || error) && (
          <div className="flex items-start gap-2 rounded border border-rose-800/50 bg-rose-950/30 px-2 py-1.5 text-[11px] text-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="break-words">{urlError || error}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <nav className="flex shrink-0 items-end gap-0.5 px-1.5 border-b border-[#27272a] bg-[#121214]" aria-label="Vision workspace tabs">
        {(
          [
            ['preview', 'Preview'],
            ['screenshots', 'Screenshots'],
            ['compare', 'Compare'],
            ['diagnostics', 'Diagnostics'],
            ['issues', 'Issues'],
          ] as Array<[VisionTab, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`${TAB_BUTTON} ${
              tab === id
                ? 'border-blue-500 text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        {session && (
          <button
            type="button"
            onClick={() => void handleReload()}
            className="mb-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-zinc-500 hover:text-zinc-200"
            title="Re-check preview reachability"
          >
            <MonitorSmartphone className="w-3 h-3" /> {session.viewport.width}×{session.viewport.height}
          </button>
        )}
      </nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0">
        {tab === 'preview' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="relative flex-1 min-h-0 bg-[#0d1119]">
              {previewTarget ? (
                internal ? (
                  <iframe
                    ref={iframeRef}
                    title="Live App Vision — workspace preview"
                    srcDoc={previewTarget.value}
                    sandbox="allow-scripts allow-modals allow-forms allow-popups"
                    className={`h-full w-full border-0 ${inspectorActive ? 'cursor-crosshair' : ''}`}
                  />
                ) : (
                  <iframe
                    ref={iframeRef}
                    title="Live App Vision — external preview"
                    src={previewTarget.value}
                    sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                    referrerPolicy="no-referrer"
                    className="h-full w-full border-0 bg-white"
                  />
                )
              ) : (
                <EmptyState title={session ? 'Rendering preview…' : 'Connect a local preview'}>
                  {session
                    ? 'Waiting for the preview document to render.'
                    : `Enter a loopback URL such as http://localhost:5173 (start your dev server first), or use ${urlInput || 'preview://'} for the IDE workspace preview.`}
                </EmptyState>
              )}
              {inspectorActive && (
                <span className="pointer-events-none absolute top-2 left-2 rounded bg-blue-600/90 px-1.5 py-0.5 text-[10px] text-white">
                  Inspect mode — click an element
                </span>
              )}
              {!internal && session && (
                <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-zinc-300">
                  External preview · sandboxed iframe · some apps may refuse to embed
                </span>
              )}
            </div>
            <VisionInspector
              element={selectedElement}
              active={inspectorActive}
              onToggle={handleToggleInspector}
              onCopy={handleCopySelector}
              onCreateIssue={() => setDraftingIssue(true)}
              onExplain={() => void handleExplain()}
              aiAnalysis={Boolean(capabilities?.aiAnalysis)}
            />
          </div>
        )}

        {tab === 'screenshots' && (
          <ScreenshotGallery
            screenshots={screenshots}
            busy={capturing}
            onRefetch={() => sessionId && void loadScreenshots(sessionId)}
            onDelete={(id) => {
              void visionApi.deleteScreenshot(id).then(() => setScreenshots((old) => old.filter((s) => s.id !== id)));
            }}
            onSetBaseline={(id) => {
              void visionApi.setBaseline(id).then(() => loadScreenshots(sessionId!));
            }}
            onTogglePin={(id, pinned) => {
              void visionApi.setPinned(id, pinned).then(() => loadScreenshots(sessionId!));
            }}
          />
        )}

        {tab === 'compare' && (
          <ComparePanel sessionId={sessionId ?? ''} screenshots={screenshots} busy={busy} />
        )}

        {tab === 'diagnostics' && (
          <DiagnosticsPanel
            events={events}
            paused={paused}
            busy={false}
            unavailable={unavailable}
            consoleEvents={Boolean(capabilities?.consoleEvents)}
            internal={internal}
            onTogglePause={() => {
              setPaused(!paused);
              if (!paused) void flush();
            }}
            onClear={() => void clear()}
          />
        )}

        {tab === 'issues' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#27272a] shrink-0">
              <span className="text-[11px] text-zinc-400">{issues.length} saved report{issues.length === 1 ? '' : 's'}</span>
              <button type="button" className={TOOLBAR_BUTTON} onClick={() => setDraftingIssue(true)}>
                <FileText className="w-3 h-3" /> New report
              </button>
            </div>
            <IssuesPanel issues={issues} onDeleted={handleResolveIssue} />
          </div>
        )}
      </div>

      {/* Issue draft modal */}
      {draftingIssue && (
        <IssueDraftModal
          evidence={{ element: selectedElement, errorEvents: evidenceErrorEvents, screenshotIds: screenshots.slice(0, 3).map((s) => s.id) }}
          onClose={() => setDraftingIssue(false)}
          onCreated={(issue) => {
            setIssues((old) => [issue, ...old]);
            setDraftingIssue(false);
          }}
        />
      )}

      {/* Analysis modal */}
      {analysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-lg border border-[#3f3f46] bg-[#1e1e24] shadow-2xl">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#27272a] sticky top-0 bg-[#1e1e24]">
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                {analysis.source === 'model' ? 'AI analysis' : 'Deterministic summary (AI off)'}
              </span>
              <button onClick={() => setAnalysis(null)} className="text-zinc-500 hover:text-zinc-200 p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-3 space-y-3 text-[11px]">
              <p className="text-zinc-300 leading-relaxed">{analysis.summary || 'No summary returned.'}</p>
              {analysis.observations.length > 0 && (
                <div>
                  <h4 className="text-zinc-400 font-semibold mb-1">Observations</h4>
                  <ul className="space-y-1">
                    {analysis.observations.map((o, i) => (
                      <li key={i} className="text-zinc-300">• {o.statement} <span className="text-zinc-500">[{o.confidence}]</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.likelyCauses.length > 0 && (
                <div>
                  <h4 className="text-zinc-400 font-semibold mb-1">Likely causes (hypotheses)</h4>
                  <ul className="space-y-1">
                    {analysis.likelyCauses.map((o, i) => (
                      <li key={i} className="text-zinc-300">• {o.cause} <span className="text-zinc-500">[{o.confidence}]</span>
                        {o.reasoning ? <div className="text-zinc-500 pl-3">{o.reasoning}</div> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.recommendedChecks.length > 0 && (
                <div>
                  <h4 className="text-zinc-400 font-semibold mb-1">Recommended checks</h4>
                  <ul className="space-y-1">
                    {analysis.recommendedChecks.map((r, i) => (
                      <li key={i} className="text-zinc-300">• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.suggestedFixes.length > 0 && (
                <div>
                  <h4 className="text-zinc-400 font-semibold mb-1">Suggested fixes (not applied)</h4>
                  <ul className="space-y-1">
                    {analysis.suggestedFixes.map((s, i) => (
                      <li key={i} className="text-zinc-300">• {s.description} <span className="text-zinc-500">risk: {s.risk}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.missingEvidence.length > 0 && (
                <div className="rounded border border-amber-800/50 bg-amber-950/30 p-2 text-amber-200">
                  <span className="font-semibold">Missing evidence:</span>{' '}
                  {analysis.missingEvidence.join('; ')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface IssueDraftModalProps {
  evidence: {
    element: VisionElement | null;
    errorEvents: { id: string; message: string; severity: string }[];
    screenshotIds: string[];
  };
  onClose: () => void;
  onCreated: (issue: VisionIssueReport) => void;
}

function IssueDraftModal({ evidence, onClose, onCreated }: IssueDraftModalProps) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [steps, setSteps] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) {
      setError('A title is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await visionApi.createIssue({
        title,
        summary: summary.trim() || undefined,
        expected: expected.trim() || 'Not specified',
        actual: actual.trim() || 'Not specified',
        reproductionSteps: steps.split('\n').map((s) => s.trim()).filter(Boolean),
        element: evidence.element ?? undefined,
        eventIds: evidence.errorEvents.map((e) => e.id),
        evidenceScreenshotIds: evidence.screenshotIds,
      });
      onCreated(result.issue);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the report.');
    } finally {
      setSaving(false);
    }
  }

  const field = 'w-full bg-[#0d1119] border border-[#27272a] rounded px-2 py-1.5 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-lg border border-[#3f3f46] bg-[#1e1e24] shadow-2xl">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#27272a]">
          <span className="text-xs font-semibold text-zinc-200">New issue report</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 p-1" title="Close">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-3 space-y-2">
          <input className={field} placeholder="Title *" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          <textarea className={`${field} resize-none`} placeholder="Summary (what did you observe?)" value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} />
          <div className="grid grid-cols-2 gap-2">
            <textarea className={`${field} resize-none`} placeholder="Expected behaviour (or “Not specified”)" value={expected} onChange={(e) => setExpected(e.target.value)} rows={2} />
            <textarea className={`${field} resize-none`} placeholder="Actual behaviour" value={actual} onChange={(e) => setActual(e.target.value)} rows={2} />
          </div>
          <textarea className={`${field} resize-none`} placeholder="Reproduction steps (one per line)" value={steps} onChange={(e) => setSteps(e.target.value)} rows={3} />
          {evidence.element && (
            <p className="text-[10px] text-zinc-500 font-mono">
              Attached element: &lt;{evidence.element.tagName}&gt;{evidence.element.selectorHint ? ` ${evidence.element.selectorHint}` : ''}
            </p>
          )}
          {evidence.errorEvents.length > 0 && (
            <p className="text-[10px] text-zinc-500">Attached evidence: {evidence.errorEvents.length} error event(s)</p>
          )}
          {error && <p className="text-[11px] text-rose-300">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200">
              Cancel
            </button>
            <button type="button" onClick={() => void handleSave()} disabled={saving} className="px-3 py-1 text-[11px] rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50">
              {saving ? 'Saving…' : 'Save report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}