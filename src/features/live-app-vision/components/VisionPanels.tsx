import { useState } from 'react';
import {
  AlertTriangle,
  Baseline,
  Copy,
  Eraser,
  FileDown,
  Info,
  Layers,
  Pause,
  Play,
  Pin,
  PinOff,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { artifactUrl, deleteIssue, exportIssue, recordDiff as apiRecordDiff } from '../api/visionClient';
import { formatBytes, formatEventTime } from '../utils';
import type {
  ScreenshotRecord,
  VisionCapabilities,
  VisionElement,
  VisionEvent,
  VisionIssueReport,
  VisualDiffResult,
} from '../types/vision';

const MUTED = 'text-[11px] text-zinc-400';
const BUTTON = 'inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-[#1e1e24] border border-[#27272a] text-zinc-300 hover:border-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed';

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center min-h-[200px]">
      <Layers className="w-6 h-6 text-zinc-600" />
      <p className="text-xs font-medium text-zinc-300">{title}</p>
      {children && <div className="text-[11px] text-zinc-500 max-w-[40ch] leading-relaxed">{children}</div>}
    </div>
  );
}

interface GalleryProps {
  screenshots: ScreenshotRecord[];
  busy: boolean;
  onRefetch: () => void;
  onDelete: (id: string) => void;
  onSetBaseline: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
}

export function ScreenshotGallery({ screenshots, busy, onDelete, onSetBaseline, onTogglePin }: GalleryProps) {
  if (screenshots.length === 0) {
    return (
      <EmptyState title="No screenshots captured yet.">
        Connect the workspace preview, then press Capture in the toolbar. Captures are stored locally as PNG artifacts.
      </EmptyState>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto p-2 grid grid-cols-1 gap-2 content-start">
      {screenshots.map((shot) => (
        <article key={shot.id} className="bg-[#12141a] border border-[#27272a] rounded-lg overflow-hidden">
          <img
            src={artifactUrl(shot.id)}
            alt={shot.label || `Screenshot ${shot.width}×${shot.height}`}
            className="w-full bg-white block"
            loading="lazy"
          />
          <div className="p-2 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-zinc-200 truncate">
                  {shot.label || 'Untitled capture'}
                </p>
                <p className={MUTED}>
                  {shot.width} × {shot.height} px · {formatEventTime(shot.createdAt)} ·{' '}
                  {shot.sha256.slice(0, 12)}
                </p>
              </div>
              {shot.baseline && (
                <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-700/50 uppercase">
                  Baseline
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {!shot.baseline && (
                <button title="Use this capture as the comparison baseline" className={BUTTON} onClick={() => onSetBaseline(shot.id)} disabled={busy}>
                  <Baseline className="w-3 h-3" /> Set baseline
                </button>
              )}
              <button title={shot.pinned ? 'Unpin (eligible for retention cleanup)' : 'Pin (exempt from retention cleanup)'} className={BUTTON} onClick={() => onTogglePin(shot.id, !shot.pinned)} disabled={busy}>
                {shot.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                {shot.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button title="Delete this capture" className={`${BUTTON} hover:border-rose-500`} onClick={() => onDelete(shot.id)} disabled={busy}>
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

interface CompareProps {
  sessionId: string;
  screenshots: ScreenshotRecord[];
  busy: boolean;
}

export function ComparePanel({ sessionId, screenshots, busy }: CompareProps) {
  const [baselineId, setBaselineId] = useState('');
  const [currentId, setCurrentId] = useState('');
  const [threshold, setThreshold] = useState(0.1);
  const [result, setResult] = useState<VisualDiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);

  const selectedBaseline = screenshots.find((s) => s.id === baselineId);
  const selectedCurrent = screenshots.find((s) => s.id === currentId);
  const usable = screenshots.filter((s) => !s.baseline);

  async function handleCompare() {
    if (!baselineId || !currentId || !sessionId) return;
    setComparing(true);
    setError(null);
    try {
      const { result: diff } = await apiRecordDiff(baselineId, currentId, threshold);
      setResult(diff);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comparison failed.');
      setResult(null);
    } finally {
      setComparing(false);
    }
  }

  if (screenshots.length < 2) {
    return (
      <EmptyState title="Need at least two captures to compare.">
        Capture the same viewport before and after a change, mark one as the baseline, then compare here.
      </EmptyState>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className={`${MUTED} block mb-1`}>Baseline</span>
          <select value={baselineId} onChange={(e) => setBaselineId(e.target.value)} className="w-full bg-[#0d1119] border border-[#27272a] rounded px-2 py-1.5 text-[11px] text-zinc-200">
            <option value="">Select baseline…</option>
            {screenshots.map((s) => (
              <option key={s.id} value={s.id}>{s.label || 'Untitled'} · {s.width}×{s.height}{s.baseline ? ' (baseline)' : ''}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={`${MUTED} block mb-1`}>Current</span>
          <select value={currentId} onChange={(e) => setCurrentId(e.target.value)} className="w-full bg-[#0d1119] border border-[#27272a] rounded px-2 py-1.5 text-[11px] text-zinc-200">
            <option value="">Select current capture…</option>
            {usable.map((s) => (
              <option key={s.id} value={s.id}>{s.label || 'Untitled'} · {s.width}×{s.height}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className={`${MUTED} block mb-1`}>
          Pixel threshold: {threshold.toFixed(2)} (fraction of the 0–255 channel range treated as noise)
        </span>
        <input type="range" min={0} max={0.5} step={0.01} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full accent-blue-500" />
      </label>
      <div className="flex items-center justify-between gap-2">
        <button type="button" className={BUTTON} onClick={() => void handleCompare()} disabled={!baselineId || !currentId || comparing || busy}>
          <Plus className="w-3 h-3" /> {comparing ? 'Comparing…' : 'Compare'}
        </button>
        {result && (
          <span className={`${MUTED} font-mono`}>
            {result.changedPixels} / {result.totalPixels} px (
            {(result.changedRatio * 100).toFixed(2)}%)
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded border border-rose-800/50 bg-rose-950/30 p-2 text-[11px] text-rose-300">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1.5 bg-[#0d1119] border border-[#27272a] rounded-lg p-1.5">
            {selectedBaseline && (
              <figure className="min-w-0">
                <img src={artifactUrl(selectedBaseline.id)} alt="Baseline" className="w-full rounded border border-[#27272a]" />
                <figcaption className={`${MUTED} mt-1 text-center`}>Baseline</figcaption>
              </figure>
            )}
            {result && (
              <figure className="min-w-0">
                <img src={artifactUrl(result.diffArtifactId)} alt="Pixel difference overlay" className="w-full rounded border border-rose-800/50" />
                <figcaption className={`${MUTED} mt-1 text-center`}>Diff</figcaption>
              </figure>
            )}
            {selectedCurrent && (
              <figure className="min-w-0">
                <img src={artifactUrl(selectedCurrent.id)} alt="Current" className="w-full rounded border border-[#27272a]" />
                <figcaption className={`${MUTED} mt-1 text-center`}>Current</figcaption>
              </figure>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Changed pixels: {((result.changedRatio * 100).toFixed(2))}% ({result.changedPixels.toLocaleString()} of{' '}
            {result.totalPixels.toLocaleString()}). This is a visual difference measurement, not a quality score.
            Review the highlighted areas before deciding whether the change is expected.
          </p>
        </div>
      )}
    </div>
  );
}

interface DiagnosticsProps {
  events: VisionEvent[];
  paused: boolean;
  busy: boolean;
  unavailable: boolean;
  consoleEvents: boolean;
  internal: boolean;
  onTogglePause: () => void;
  onClear: () => void;
}

export function DiagnosticsPanel({ events, paused, busy, unavailable, consoleEvents, internal, onTogglePause, onClear }: DiagnosticsProps) {
  const errors = events.filter((e) => e.severity === 'error').length;

  if (unavailable) {
    return (
      <EmptyState title="Error capture is unavailable.">
        The local vision service could not be reached. Restart the IDE server, then reconnect the preview.
      </EmptyState>
    );
  }

  if (!consoleEvents || !internal) {
    return (
      <EmptyState title="Live diagnostics are not available for this preview.">
        Console and error capture requires the IDE sandboxed preview bridge. External-URL sessions are shown without
        browser instrumentation (no controlled browser connector is installed).
      </EmptyState>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#27272a]">
        <span className={MUTED}>
          {busy ? 'Refreshing…' : `${errors} error${errors === 1 ? '' : 's'} · ${events.length} event${events.length === 1 ? '' : 's'}`}
        </span>
        <div className="flex gap-1">
          <button title={paused ? 'Resume event collection' : 'Pause event collection'} className={BUTTON} onClick={onTogglePause}>
            {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button title="Clear events for this session" className={BUTTON} onClick={() => void onClear()} disabled={events.length === 0}>
            <Eraser className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>
      {paused && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-950/30 border-b border-amber-800/40 text-[11px] text-amber-300">
          <Info className="w-3 h-3" /> Collection paused — new events are ignored.
        </div>
      )}
      <div className="flex-1 overflow-y-auto divide-y divide-[#22242b]">
        {events.length === 0 ? (
          <EmptyState title="No errors or warnings captured.">
            This only means nothing was reported to the bridge in this session — not that the application has no issues.
          </EmptyState>
        ) : (
          events.map((event) => (
            <div key={event.id} className="px-2 py-1.5 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={`shrink-0 text-[9px] px-1 py-0.5 rounded uppercase font-semibold ${
                    event.severity === 'error'
                      ? 'bg-rose-950/60 text-rose-300'
                      : event.severity === 'warning'
                        ? 'bg-amber-950/60 text-amber-300'
                        : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {event.severity}
                </span>
                <span className="text-[11px] text-zinc-300 break-words font-mono">{event.message}</span>
              </div>
              <div className={`${MUTED} flex flex-wrap gap-x-2`}>
                <span>{formatEventTime(event.timestamp)}</span>
                <span>{event.kind}</span>
                {event.sourceUrl && <span className="font-mono">{event.sourceUrl}</span>}
                {event.line != null && <span>line {event.line}</span>}
                {event.count > 1 && <span>× {event.count}</span>}
                {event.redacted && <span className="text-amber-400">redacted</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface InspectorProps {
  element: VisionElement | null;
  active: boolean;
  onToggle: () => void;
  onCopy: () => void;
  onCreateIssue: () => void;
  onExplain: () => void;
  aiAnalysis: boolean;
}

export function VisionInspector({ element, active, onToggle, onCopy, onCreateIssue, onExplain, aiAnalysis }: InspectorProps) {
  return (
    <div className="border-t border-[#27272a] bg-[#12141a]">
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
          <Info className="w-3 h-3 text-blue-400" /> Element inspector
        </span>
        <button className={BUTTON} onClick={onToggle}>
          {active ? <Play className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {active ? 'Exit' : 'Inspect'}
        </button>
      </div>
      {!element ? (
        <p className="px-2 pb-2 text-[11px] text-zinc-500">
          {active ? 'Hover the preview and click an element to inspect it. Press Escape to cancel.' : 'Enable inspect mode and click an element in the preview.'}
        </p>
      ) : (
        <div className="px-2 pb-2 space-y-1.5">
          <div className="font-mono text-[11px] text-zinc-200">
            <span className="text-blue-400">&lt;{element.tagName}&gt;</span>
            {element.attributes.id && <span className="text-emerald-400"> #{element.attributes.id}</span>}
            {element.selectorHint && <span className="text-zinc-500"> · {element.selectorHint}</span>}
          </div>
          {element.boundingBox && (
            <p className={MUTED}>
              {element.boundingBox.width} × {element.boundingBox.height} px at ({element.boundingBox.x}, {element.boundingBox.y})
            </p>
          )}
          <div className="flex flex-wrap gap-1">
            <button className={BUTTON} onClick={onCopy}>
              <Copy className="w-3 h-3" /> Copy selector
            </button>
            <button className={BUTTON} onClick={onCreateIssue}>
              <AlertTriangle className="w-3 h-3" /> Create issue
            </button>
            {aiAnalysis && (
              <button className={BUTTON} onClick={onExplain}>
                <Sparkles className="w-3 h-3" /> Explain element
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface IssuesProps {
  issues: VisionIssueReport[];
  onDeleted: (id: string) => void;
}

export function IssuesPanel({ issues, onDeleted }: IssuesProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  async function handleExport(id: string) {
    setExporting(id);
    try {
      const result = await exportIssue(id, 'markdown');
      const blob = new Blob([result.content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `vision-issue-${id}.md`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      setExporting(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this issue report?')) return;
    await deleteIssue(id);
    onDeleted(id);
  }

  if (!issues.length) {
    return <EmptyState title="No issue reports yet.">Use the Capture, Inspector, or Diagnostics evidence to build a structured, exportable report.</EmptyState>;
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-[#22242b]">
      {issues.map((issue) => (
        <article key={issue.id} className="px-2 py-2 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-200">{issue.title}</p>
              <p className={MUTED}>
                {issue.severity} · {formatEventTime(issue.createdAt)}
                {issue.route ? ` · ${issue.route}` : ''}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">{issue.summary || issue.actual}</p>
          <div className="flex flex-wrap gap-1">
            <button className={BUTTON} onClick={() => void handleExport(issue.id)} disabled={exporting === issue.id}>
              <FileDown className="w-3 h-3" /> {exporting === issue.id ? 'Exporting…' : 'Export'}
            </button>
            <button className={`${BUTTON} hover:border-rose-500`} onClick={() => void handleDelete(issue.id)}>
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

export { formatBytes };