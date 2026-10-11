import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  RotateCw, 
  Monitor, 
  Laptop, 
  Tablet, 
  Smartphone, 
  ExternalLink, 
  X, 
  Inspect, 
  Globe, 
  Maximize2, 
  Minimize2, 
  Play, 
  Square, 
  ArrowLeft, 
  ArrowRight, 
  Copy, 
  Check, 
  MoreVertical, 
  AlertTriangle, 
  Settings2, 
  FileCode, 
  Sliders, 
  Layers, 
  Sparkles,
  Terminal,
  Radio,
  SplitSquareHorizontal,
  SplitSquareVertical
} from 'lucide-react';
import { FileNode, flattenFiles } from '../core/filesystem';
import { 
  previewService, 
  DevicePreset, 
  DEVICE_DIMENSIONS, 
  generatePreviewHtml, 
  InspectedElement, 
  PreviewBundle,
  PreviewStatus, 
  PreviewError, 
  ProjectDetectionResult 
} from '../core/preview';

interface PreviewPanelProps {
  files: FileNode[];
  onClose: () => void;
  onElementInspected?: (element: InspectedElement) => void;
  onNavigateToFile?: (file: string, line?: number, col?: number) => void;
  onOpenOutput?: () => void;
  onExecuteCommand?: (cmd: string) => void;
  theme?: 'dark' | 'light';
  layout?: 'right' | 'down';
  onToggleLayout?: (layout: 'right' | 'down') => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

const ZOOM_PRESETS = [50, 75, 90, 100, 110, 125, 150, 200];
const PREVIEW_LOADING_HTML = '<!doctype html><html><body style="margin:0;background:#0e1014;color:#a1a1aa;font:13px system-ui;display:grid;place-items:center;height:100vh">Building workspace preview...</body></html>';

export function PreviewPanel({
  files,
  onClose,
  onElementInspected,
  onNavigateToFile,
  onOpenOutput,
  onExecuteCommand,
  theme = 'dark',
  layout = 'right',
  onToggleLayout,
  isMaximized = false,
  onToggleMaximize
}: PreviewPanelProps) {
  // Service state subscriptions
  const [status, setStatus] = useState<PreviewStatus>(() => previewService.getStatus());
  const [currentURL, setCurrentURL] = useState<string>(() => previewService.getURL());
  const [device, setDevice] = useState<DevicePreset>(() => previewService.getViewportPreset());
  const [zoom, setZoom] = useState<number>(() => previewService.getZoom());
  const [autoReload, setAutoReload] = useState<boolean>(() => previewService.getAutoReload());
  const [currentError, setCurrentError] = useState<PreviewError | null>(() => previewService.getError());
  const [inspectedElement, setInspectedElement] = useState<InspectedElement | null>(() => previewService.getInspectedElement());
  const [isInspectorActive, setIsInspectorActive] = useState<boolean>(() => previewService.isInspector());

  // UI interaction states
  const [previewKey, setPreviewKey] = useState<number>(0);
  const [copiedURL, setCopiedURL] = useState<boolean>(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [isCustomDimensionsOpen, setIsCustomDimensionsOpen] = useState<boolean>(false);
  const [customWidth, setCustomWidth] = useState<string>('800');
  const [customHeight, setCustomHeight] = useState<string>('600');
  const [isFitToWindow, setIsFitToWindow] = useState<boolean>(false);
  const [previewHtml, setPreviewHtml] = useState(PREVIEW_LOADING_HTML);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Project detection
  const detection: ProjectDetectionResult = useMemo(() => {
    return previewService.detect(files);
  }, [files]);

  // Subscribe to previewService state
  useEffect(() => {
    return previewService.subscribe(() => {
      setStatus(previewService.getStatus());
      setCurrentURL(previewService.getURL());
      setDevice(previewService.getViewportPreset());
      setZoom(previewService.getZoom());
      setAutoReload(previewService.getAutoReload());
      setCurrentError(previewService.getError());
      setInspectedElement(previewService.getInspectedElement());
      setIsInspectorActive(previewService.isInspector());
    });
  }, []);

  useEffect(() => {
    if (inspectedElement) onElementInspected?.(inspectedElement);
  }, [inspectedElement, onElementInspected]);

  // Initialize and start preview on mount if supported
  useEffect(() => {
    if (previewService.getStatus() === 'stopped') {
      previewService.start(files);
    }
  }, []);

  // Auto reload when files change
  useEffect(() => {
    if (files.length > 0) {
      const activeOrMain = files[0];
      previewService.notifyFileChanged(activeOrMain, files);
    }
  }, [files]);

  // Compile the in-memory workspace instead of resolving its imports against the Studio source tree.
  useEffect(() => {
    let cancelled = false;
    const workspaceFiles = flattenFiles(files).filter((file) => file.type === 'file');
    const hasReactSource = workspaceFiles.some((file) => /\.(tsx|jsx)$/i.test(file.name));

    const publishHtml = (html: string) => {
      if (cancelled) return;
      setPreviewHtml(html);
      previewService.updateHtml(html);
    };

    if (!hasReactSource) {
      publishHtml(generatePreviewHtml(files));
      return () => { cancelled = true; };
    }

    setPreviewHtml(PREVIEW_LOADING_HTML);
    fetch('/api/preview-bundle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: workspaceFiles.map((file) => ({ path: file.path, content: file.content || '' }))
      })
    }).then(async (response) => {
      const bundle = await response.json() as PreviewBundle;
      if (!response.ok) throw new Error(bundle.error || `Preview compiler returned HTTP ${response.status}.`);
      return bundle;
    }).then((bundle) => {
      publishHtml(generatePreviewHtml(files, bundle));
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown preview build error.';
      publishHtml(generatePreviewHtml(files, { javascript: '', error: message }));
    });

    return () => { cancelled = true; };
  }, [files, previewKey]);

  const postPreviewHistoryCommand = (direction: 'back' | 'forward') => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'PREVIEW_HISTORY', direction }, '*');
  };

  // PostMessage forwarding for inspector toggle
  const toggleInspector = () => {
    const nextState = !isInspectorActive;
    previewService.setInspector(nextState);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'TOGGLE_INSPECTOR', active: nextState },
        '*'
      );
    }
  };

  const handleStartStop = () => {
    if (status === 'running') {
      previewService.stop();
    } else {
      if (detection.canRunInBrowserSandbox) {
        previewService.start(files);
      } else if (onExecuteCommand) {
        onExecuteCommand(detection.recommendedCommand || 'npm run dev');
        previewService.start(files);
      } else {
        previewService.start(files);
      }
    }
  };

  const handleReload = () => {
    setPreviewKey((k) => k + 1);
    previewService.reload();
  };

  const handleCopyURL = () => {
    navigator.clipboard.writeText(currentURL);
    setCopiedURL(true);
    setTimeout(() => setCopiedURL(false), 2000);
  };

  const handleDeviceChange = (preset: DevicePreset) => {
    if (preset === 'custom') {
      setIsCustomDimensionsOpen(true);
    } else {
      setIsCustomDimensionsOpen(false);
      previewService.setViewport(preset);
    }
  };

  const handleApplyCustomDimensions = () => {
    previewService.setViewport('custom', `${customWidth}px`, `${customHeight}px`);
    setIsCustomDimensionsOpen(false);
  };

  const handleJumpToSource = (element: InspectedElement) => {
    if (!onNavigateToFile) return;
    // Find matching file in workspace
    const cssMatch = files.find((f) => f.name.endsWith('.css'));
    const htmlMatch = files.find((f) => f.name.endsWith('.html'));

    if (element.className && cssMatch) {
      onNavigateToFile(cssMatch.path, 1, 1);
    } else if (htmlMatch) {
      onNavigateToFile(htmlMatch.path, 1, 1);
    }
  };

  const dimensions = previewService.getDimensions();

  // Color schemes
  const isLight = theme === 'light';
  const bgMain = isLight ? 'bg-[#f3f4f6]' : 'bg-[#0e1014]';
  const bgToolbar = isLight ? 'bg-[#e5e7eb] border-[#d1d5db]' : 'bg-[#14161b] border-[#22242b]';
  const bgAddress = isLight ? 'bg-white border-[#d1d5db] text-zinc-800' : 'bg-[#090b0e] border-[#22242b] text-zinc-200';
  const borderSubtle = isLight ? 'border-[#e5e7eb]' : 'border-[#22242b]';
  const textMuted = isLight ? 'text-zinc-500' : 'text-zinc-400';

  return (
    <div className={`flex-1 flex flex-col h-full ${bgMain} border-l ${borderSubtle} overflow-hidden select-text relative`}>
      <div className={`flex items-center justify-between px-2.5 h-9 ${bgToolbar} border-b text-xs shrink-0 select-none z-20`}>
        <div className="flex items-center space-x-1 shrink-0">
          <button onClick={() => postPreviewHistoryCommand('back')} title="Back in Preview" className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => postPreviewHistoryCommand('forward')} title="Forward in Preview" className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition">
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-3.5 bg-zinc-700/50 mx-1" />

          {/* Reload / Refresh Button */}
          <button
            onClick={handleReload}
            title="Reload Preview (Hard Refresh)"
            className={`p-1 rounded transition text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 ${
              status === 'reloading' ? 'animate-spin text-blue-400' : ''
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Start / Stop Toggle */}
          <button
            onClick={handleStartStop}
            title={status === 'running' ? 'Stop Preview' : 'Start Preview'}
            className={`p-1 rounded transition ${
              status === 'running'
                ? 'text-rose-400 hover:bg-rose-950/40'
                : 'text-emerald-400 hover:bg-emerald-950/40'
            }`}
          >
            {status === 'running' ? <Square className="w-3.5 h-3.5 fill-rose-400" /> : <Play className="w-3.5 h-3.5 fill-emerald-400" />}
          </button>

          <div className="w-[1px] h-3.5 bg-zinc-700/50 mx-1" />

          {/* Element Inspector Toggle */}
          <button
            onClick={toggleInspector}
            title={isInspectorActive ? 'Deactivate Element Inspector' : 'Element Inspector: Click any element in preview to view source and styles'}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition ${
              isInspectorActive
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Inspect className="w-3 h-3" />
            <span className="hidden sm:inline">{isInspectorActive ? 'Inspecting' : 'Inspect'}</span>
          </button>
        </div>

        {/* Center: Address Bar & Status Pill */}
        <div className={`flex-1 max-w-md mx-2 flex items-center gap-1.5 px-2 py-1 rounded ${bgAddress} font-mono text-[11px] overflow-hidden`}>
          <Globe className="w-3 h-3 text-blue-400 shrink-0" />
          <span className="truncate flex-1 select-all" title={currentURL}>
            {currentURL}
          </span>

          {/* Status Badge */}
          {status === 'running' ? (
            <span className="text-[9px] px-1 py-0.2 rounded font-sans font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-800/50 shrink-0 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          ) : status === 'reloading' ? (
            <span className="text-[9px] px-1 py-0.2 rounded font-sans font-medium bg-blue-950/70 text-blue-300 border border-blue-800/50 shrink-0">
              RELOADING
            </span>
          ) : status === 'error' ? (
            <span className="text-[9px] px-1 py-0.2 rounded font-sans font-medium bg-rose-950/70 text-rose-300 border border-rose-800/50 shrink-0">
              ERROR
            </span>
          ) : (
            <span className="text-[9px] px-1 py-0.2 rounded font-sans font-medium bg-zinc-800 text-zinc-400 shrink-0">
              STOPPED
            </span>
          )}

          {/* Copy URL */}
          <button
            onClick={handleCopyURL}
            title="Copy Preview URL"
            className="p-0.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition"
          >
            {copiedURL ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>

          {/* Open in External Browser */}
          <button
            onClick={() => previewService.openExternal()}
            title="Open in External Browser / New Window"
            className="p-0.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Right: Device Switcher, Zoom, Actions */}
        <div className="flex items-center space-x-1 shrink-0">
          {/* Viewport Preset Dropdown */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5 text-[10px]">
            <button
              onClick={() => handleDeviceChange('responsive')}
              title="Responsive (100%)"
              className={`p-1 rounded transition ${device === 'responsive' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <Maximize2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleDeviceChange('desktop')}
              title="Desktop (1440×900)"
              className={`p-1 rounded transition ${device === 'desktop' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <Monitor className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleDeviceChange('tablet')}
              title="Tablet (768×1024)"
              className={`p-1 rounded transition ${device === 'tablet' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <Tablet className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleDeviceChange('mobile')}
              title="Mobile (390×844)"
              className={`p-1 rounded transition ${device === 'mobile' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <Smartphone className="w-3 h-3" />
            </button>
          </div>

          {/* Zoom Selector */}
          <select
            value={zoom}
            onChange={(e) => previewService.setZoom(Number(e.target.value))}
            className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-[10px] rounded px-1.5 py-0.5 focus:outline-hidden"
            title="Preview Zoom"
          >
            {ZOOM_PRESETS.map((z) => (
              <option key={z} value={z}>
                {z}%
              </option>
            ))}
          </select>

          {/* More Actions Dropdown Toggle */}
          <div className="relative">
            <button
              onClick={() => setIsMoreMenuOpen((p) => !p)}
              title="More Preview Settings"
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {isMoreMenuOpen && (
              <div
                onClick={() => setIsMoreMenuOpen(false)}
                className="absolute right-0 top-full mt-1 w-52 bg-[#181a20] border border-zinc-700 rounded shadow-xl py-1 text-xs text-zinc-200 z-50 divide-y divide-zinc-800"
              >
                <div className="py-1">
                  <button
                    onClick={() => previewService.setAutoReload(!autoReload)}
                    className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 flex items-center justify-between text-xs"
                  >
                    <span>Auto Reload on Save</span>
                    {autoReload && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>
                  <button
                    onClick={() => setIsCustomDimensionsOpen(true)}
                    className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 flex items-center justify-between text-xs"
                  >
                    <span>Custom Viewport...</span>
                    <Sliders className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>

                <div className="py-1">
                  {onToggleLayout && (
                    <button
                      onClick={() => onToggleLayout(layout === 'right' ? 'down' : 'right')}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 flex items-center justify-between text-xs"
                    >
                      <span>{layout === 'right' ? 'Split Down' : 'Split Right'}</span>
                      {layout === 'right' ? (
                        <SplitSquareVertical className="w-3.5 h-3.5 text-zinc-400" />
                      ) : (
                        <SplitSquareHorizontal className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                    </button>
                  )}
                  {onOpenOutput && (
                    <button
                      onClick={onOpenOutput}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 flex items-center justify-between text-xs"
                    >
                      <span>View Output Stream</span>
                      <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                    </button>
                  )}
                </div>

                <div className="py-1">
                  <button
                    onClick={handleReload}
                    className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 text-xs text-zinc-300"
                  >
                    Clear Cache & Hard Reload
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="w-[1px] h-3.5 bg-zinc-700/50 mx-0.5" />

          {/* Maximize / Restore */}
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              title={isMaximized ? 'Restore Split View' : 'Maximize Live Preview'}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition"
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Close Preview */}
          <button
            onClick={onClose}
            title="Close Preview Panel (Ctrl+Shift+V)"
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-rose-400 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. CUSTOM DIMENSIONS POPOVER MODAL */}
      {isCustomDimensionsOpen && (
        <div className="absolute top-11 right-12 bg-[#181a20] border border-zinc-700 rounded-lg p-3 shadow-2xl z-40 text-xs text-zinc-200 w-64 space-y-2.5">
          <div className="flex items-center justify-between font-semibold border-b border-zinc-800 pb-1.5">
            <span>Custom Viewport Dimensions</span>
            <button onClick={() => setIsCustomDimensionsOpen(false)} className="text-zinc-400 hover:text-zinc-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Width (px)</label>
              <input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs focus:outline-hidden focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Height (px)</label>
              <input
                type="number"
                value={customHeight}
                onChange={(e) => setCustomHeight(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs focus:outline-hidden focus:border-blue-500 font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setIsCustomDimensionsOpen(false)}
              className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyCustomDimensions}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* 3. RUNTIME NOTIFICATION / DETECTION BANNER */}
      {!detection.canRunInBrowserSandbox && status === 'stopped' && (
        <div className="bg-amber-950/40 border-b border-amber-800/40 px-3 py-2 text-xs flex items-center justify-between text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold">{detection.name}: </span>
              <span className="text-amber-300/80">
                Preview development server is stopped. Run '{detection.recommendedCommand}' to boot preview server.
              </span>
            </div>
          </div>
          <button
            onClick={handleStartStop}
            className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs transition shrink-0 ml-2"
          >
            Start Preview
          </button>
        </div>
      )}

      {/* 4. MAIN PREVIEW CANVAS / IFRAME STAGE */}
      <div 
        ref={containerRef}
        className="flex-1 bg-[#0a0c10] flex items-center justify-center p-3 overflow-auto relative"
      >
        {/* Runtime Error Overlay Screen */}
        {currentError && (
          <div className="absolute inset-0 bg-[#0d1017]/95 z-30 flex items-center justify-center p-4">
            <div className="bg-[#161b22] border border-rose-800/60 rounded-lg p-5 max-w-lg w-full shadow-2xl text-xs space-y-3">
              <div className="flex items-start gap-2.5 text-rose-400">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-rose-300">Preview Runtime Error</h3>
                  <p className="text-zinc-400 text-[11px]">
                    An uncaught script error occurred while evaluating preview documents.
                  </p>
                </div>
              </div>

              <div className="bg-[#0d1117] border border-zinc-800 rounded p-3 font-mono text-[11px] text-rose-300 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                {currentError.message}
                {currentError.filename && (
                  <div className="text-zinc-500 mt-1 pt-1 border-t border-zinc-800 text-[10px]">
                    at {currentError.filename}:{currentError.lineno}:{currentError.colno}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  {currentError.filename && onNavigateToFile && (
                    <button
                      onClick={() => {
                        onNavigateToFile(currentError.filename!, currentError.lineno, currentError.colno);
                        previewService.clearError();
                      }}
                      className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1"
                    >
                      <FileCode className="w-3 h-3" />
                      <span>Open in Editor</span>
                    </button>
                  )}
                  {onOpenOutput && (
                    <button
                      onClick={onOpenOutput}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium"
                    >
                      View Output
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleReload}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  >
                    Reload
                  </button>
                  <button
                    onClick={() => previewService.clearError()}
                    className="px-2 py-1 text-zinc-500 hover:text-zinc-300"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stopped State Card if stopped & not errored */}
        {status === 'stopped' && !currentError && (
          <div className="absolute inset-0 bg-[#0a0c10]/95 z-20 flex items-center justify-center p-4">
            <div className="bg-[#12151b] border border-zinc-800 rounded-lg p-6 max-w-md w-full shadow-2xl text-center space-y-3">
              <Globe className="w-10 h-10 text-zinc-600 mx-auto stroke-1" />
              <h3 className="font-semibold text-sm text-zinc-200">Preview is Currently Stopped</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">
                {detection.canRunInBrowserSandbox
                  ? 'DevForge in-browser sandbox is ready to render your HTML/CSS/JavaScript documents.'
                  : `This project is configured as a ${detection.name}. Start preview server to activate live rendering.`}
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={handleStartStop}
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 transition shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start Live Preview</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Device Frame Wrapper with Zoom Scale */}
        <div
          style={{
            width: dimensions.width,
            height: dimensions.height,
            maxWidth: '100%',
            maxHeight: '100%',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out, width 0.2s ease, height 0.2s ease'
          }}
          className={`bg-white rounded-lg shadow-2xl overflow-hidden relative flex flex-col ${
            device !== 'responsive'
              ? 'border-[10px] border-[#1e232d] shadow-black/80 ring-1 ring-zinc-700/50'
              : 'border border-zinc-800'
          }`}
        >
          {/* Simulated Mobile Top Notch / Speaker if mobile */}
          {device === 'mobile' && (
            <div className="h-4 bg-[#1e232d] flex items-center justify-center shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-zinc-700/80" />
            </div>
          )}

          {/* Real Sandboxed Preview IFrame */}
          <iframe
            key={previewKey}
            ref={iframeRef}
            srcDoc={previewHtml}
            title="DevForge Live Web Preview"
            sandbox="allow-scripts allow-modals allow-forms allow-popups"
            className="w-full flex-1 border-none bg-white"
          />
        </div>
      </div>

      {/* 5. ELEMENT INSPECTOR INFORMATION DRAWER */}
      {inspectedElement && (
        <div className="border-t border-zinc-800 bg-[#12141a] p-2.5 text-xs text-zinc-300 shrink-0 select-text z-20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono">
              <span className="text-blue-400 font-bold">&lt;{inspectedElement.tagName}&gt;</span>
              {inspectedElement.id && <span className="text-emerald-400">#{inspectedElement.id}</span>}
              {inspectedElement.className && (
                <span className="text-amber-400">.{inspectedElement.className.split(' ').slice(0, 3).join('.')}</span>
              )}
              {inspectedElement.boundingRect && (
                <span className="text-zinc-500 text-[10px]">
                  {inspectedElement.boundingRect.width} × {inspectedElement.boundingRect.height} px
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleJumpToSource(inspectedElement)}
                className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium flex items-center gap-1 transition"
              >
                <FileCode className="w-3 h-3" />
                <span>Jump to Source</span>
              </button>
              <button
                onClick={() => previewService.clearInspectedElement()}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Key Styles Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[11px] bg-[#0a0c10] p-2 rounded border border-zinc-800/80">
            <div>
              <span className="text-zinc-500">color: </span>
              <span className="text-zinc-300">{inspectedElement.styles.color}</span>
            </div>
            <div>
              <span className="text-zinc-500">bg: </span>
              <span className="text-zinc-300">{inspectedElement.styles['background-color']}</span>
            </div>
            <div>
              <span className="text-zinc-500">font: </span>
              <span className="text-zinc-300">{inspectedElement.styles['font-size']}</span>
            </div>
            <div>
              <span className="text-zinc-500">display: </span>
              <span className="text-zinc-300">{inspectedElement.styles.display}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
