import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Terminal as TerminalIcon, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  TerminalSquare, 
  Bug, 
  Plus, 
  Trash2, 
  Maximize2, 
  Minimize2, 
  X, 
  Split, 
  Search, 
  Copy, 
  Check, 
  Play, 
  Square, 
  Ban, 
  HelpCircle, 
  ChevronRight, 
  Filter, 
  ArrowDown, 
  Layers,
  Sparkles
} from 'lucide-react';
import { BottomPanelTab, ProblemItem } from '../core/workspace';
import { 
  TerminalSession, 
  TerminalLine, 
  terminalService, 
  ShellType 
} from '../core/terminal';
import { 
  outputService, 
  OutputChannelId, 
  OutputLogEntry 
} from '../core/output';
import { 
  debugService, 
  DebugSessionState, 
  DebugConsoleEntry 
} from '../core/debug';
import { FileNode } from '../core/filesystem';

interface PanelProps {
  activeTab: BottomPanelTab;
  onTabChange: (tab: BottomPanelTab) => void;
  onClose: () => void;
  problems: ProblemItem[];
  onClearProblems?: () => void;
  onNavigateToProblem: (file: string, line: number, column?: number) => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  panelHeight: number;
  onResizeHeight: (height: number) => void;
  onResetHeight: () => void;
  theme?: 'dark' | 'light';
  projectName?: string;
  files: FileNode[];
  onTriggerPreviewReload?: () => void;
}

export function Panel({
  activeTab,
  onTabChange,
  onClose,
  problems,
  onClearProblems,
  onNavigateToProblem,
  isMaximized,
  onToggleMaximize,
  panelHeight,
  onResizeHeight,
  onResetHeight,
  theme = 'dark',
  projectName = 'devforge-project',
  files,
  onTriggerPreviewReload
}: PanelProps) {
  // -------------------------------------------------------------
  // Resizing state & dragging logic
  // -------------------------------------------------------------
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = panelHeight;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = dragStartY.current - e.clientY;
      const newHeight = Math.min(
        Math.max(120, dragStartHeight.current + deltaY),
        window.innerHeight * 0.85
      );
      onResizeHeight(newHeight);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onResizeHeight]);

  // -------------------------------------------------------------
  // Terminal System state
  // -------------------------------------------------------------
  const [terminalSessions, setTerminalSessions] = useState<TerminalSession[]>(() =>
    terminalService.getSessions()
  );
  const [activeSessionId, setActiveSessionId] = useState<string>(() =>
    terminalService.getActiveSessionId()
  );
  const [isSplitTerminal, setIsSplitTerminal] = useState<boolean>(false);
  const [splitSessionId, setSplitSessionId] = useState<string | null>(null);

  const [commandInput, setCommandInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const splitTerminalBottomRef = useRef<HTMLDivElement>(null);

  // Subscribe to TerminalService changes
  useEffect(() => {
    return terminalService.subscribe(() => {
      setTerminalSessions(terminalService.getSessions());
      setActiveSessionId(terminalService.getActiveSessionId());
    });
  }, []);

  const activeSession = useMemo(() => {
    return (
      terminalSessions.find((s) => s.id === activeSessionId) ||
      terminalSessions[0] ||
      terminalService.getActiveSession()
    );
  }, [terminalSessions, activeSessionId]);

  const secondarySession = useMemo(() => {
    if (!isSplitTerminal) return null;
    return (
      terminalSessions.find((s) => s.id === splitSessionId) ||
      terminalSessions.find((s) => s.id !== activeSessionId) ||
      null
    );
  }, [terminalSessions, isSplitTerminal, splitSessionId, activeSessionId]);

  // Scroll active terminal to bottom on new lines
  useEffect(() => {
    if (activeTab === 'terminal') {
      terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSession?.lines.length, activeTab]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    const cmd = commandInput;
    setCommandInput('');
    setHistoryIndex(-1);
    terminalService.execute(activeSession.id, cmd, files, { onTriggerPreviewReload });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!activeSession) return;
    const history = activeSession.commandHistory;

    // Up Arrow: Navigate previous history
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setCommandInput(history[nextIndex] || '');
    }
    // Down Arrow: Navigate next history
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(-1);
        setCommandInput('');
      } else {
        setHistoryIndex(nextIndex);
        setCommandInput(history[nextIndex] || '');
      }
    }
    // Ctrl/Cmd + L: Clear terminal
    else if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      terminalService.clear(activeSession.id);
    }
    // Ctrl/Cmd + C: Interrupt process
    else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
      if (window.getSelection()?.toString() === '') {
        terminalService.kill(activeSession.id);
      }
    }
  };

  const handleCreateTerminal = (shell: ShellType = 'bash') => {
    const sess = terminalService.createSession(shell, `~/${projectName}`);
    setActiveSessionId(sess.id);
    if (isSplitTerminal && !splitSessionId) {
      setSplitSessionId(sess.id);
    }
  };

  const handleCloseTerminal = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    terminalService.closeSession(id);
    if (splitSessionId === id) {
      setSplitSessionId(null);
      setIsSplitTerminal(false);
    }
  };

  const handleToggleSplit = () => {
    if (!isSplitTerminal) {
      // Find or create secondary session
      let other = terminalSessions.find((s) => s.id !== activeSessionId);
      if (!other) {
        other = terminalService.createSession('bash', `~/${projectName}`);
      }
      setSplitSessionId(other.id);
      setIsSplitTerminal(true);
    } else {
      setIsSplitTerminal(false);
    }
  };

  // -------------------------------------------------------------
  // Problems Tab state & filtering
  // -------------------------------------------------------------
  const [problemFilterSeverity, setProblemFilterSeverity] = useState<
    'all' | 'error' | 'warning' | 'info' | 'hint'
  >('all');
  const [problemSearchQuery, setProblemSearchQuery] = useState('');

  const errorCount = useMemo(
    () => problems.filter((p) => p.severity === 'error').length,
    [problems]
  );
  const warningCount = useMemo(
    () => problems.filter((p) => p.severity === 'warning').length,
    [problems]
  );
  const infoCount = useMemo(
    () => problems.filter((p) => p.severity === 'info').length,
    [problems]
  );
  const hintCount = useMemo(
    () => problems.filter((p) => p.severity === 'hint').length,
    [problems]
  );

  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      if (problemFilterSeverity !== 'all' && p.severity !== problemFilterSeverity) {
        return false;
      }
      if (problemSearchQuery.trim()) {
        const query = problemSearchQuery.toLowerCase();
        const inMsg = p.message.toLowerCase().includes(query);
        const inFile = p.file.toLowerCase().includes(query);
        const inCode = p.code ? String(p.code).toLowerCase().includes(query) : false;
        const inSource = p.source.toLowerCase().includes(query);
        return inMsg || inFile || inCode || inSource;
      }
      return true;
    });
  }, [problems, problemFilterSeverity, problemSearchQuery]);

  // -------------------------------------------------------------
  // Output Tab state & channels
  // -------------------------------------------------------------
  const [activeOutputChannel, setActiveOutputChannel] = useState<OutputChannelId>('Build');
  const [outputLogs, setOutputLogs] = useState<OutputLogEntry[]>(() =>
    outputService.getLogs('Build')
  );
  const [outputSearchQuery, setOutputSearchQuery] = useState('');
  const [isAutoScrollOutput, setIsAutoScrollOutput] = useState(true);
  const [hasCopiedOutput, setHasCopiedOutput] = useState(false);
  const outputBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return outputService.subscribe(() => {
      setOutputLogs(outputService.getLogs(activeOutputChannel));
    });
  }, [activeOutputChannel]);

  useEffect(() => {
    setOutputLogs(outputService.getLogs(activeOutputChannel));
  }, [activeOutputChannel]);

  useEffect(() => {
    if (activeTab === 'output' && isAutoScrollOutput) {
      outputBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [outputLogs.length, activeTab, isAutoScrollOutput]);

  const filteredOutputLogs = useMemo(() => {
    if (!outputSearchQuery.trim()) return outputLogs;
    const q = outputSearchQuery.toLowerCase();
    return outputLogs.filter((l) => l.text.toLowerCase().includes(q));
  }, [outputLogs, outputSearchQuery]);

  const handleCopyOutput = () => {
    const text = filteredOutputLogs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.text}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setHasCopiedOutput(true);
    setTimeout(() => setHasCopiedOutput(false), 2000);
  };

  // -------------------------------------------------------------
  // Debug Console state
  // -------------------------------------------------------------
  const [debugSessionState, setDebugSessionState] = useState<DebugSessionState>(() =>
    debugService.getState()
  );
  const [debugEntries, setDebugEntries] = useState<DebugConsoleEntry[]>(() =>
    debugService.getEntries()
  );
  const [debugInput, setDebugInput] = useState('');
  const [debugHistoryIndex, setDebugHistoryIndex] = useState(-1);
  const debugBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return debugService.subscribe(() => {
      setDebugSessionState(debugService.getState());
      setDebugEntries([...debugService.getEntries()]);
    });
  }, []);

  useEffect(() => {
    if (activeTab === 'debug-console') {
      debugBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [debugEntries.length, activeTab]);

  const handleDebugSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debugInput.trim()) return;
    const expr = debugInput;
    setDebugInput('');
    setDebugHistoryIndex(-1);
    debugService.evaluate(expr);
  };

  const handleDebugKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const history = debugService.getHistory();
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = debugHistoryIndex === -1 ? history.length - 1 : Math.max(0, debugHistoryIndex - 1);
      setDebugHistoryIndex(nextIndex);
      setDebugInput(history[nextIndex] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (debugHistoryIndex === -1) return;
      const nextIndex = debugHistoryIndex + 1;
      if (nextIndex >= history.length) {
        setDebugHistoryIndex(-1);
        setDebugInput('');
      } else {
        setDebugHistoryIndex(nextIndex);
        setDebugInput(history[nextIndex] || '');
      }
    }
  };

  // Color & Theme classes
  const isLight = theme === 'light';
  const bgMain = isLight ? 'bg-[#f3f4f6]' : 'bg-[#121316]';
  const bgHeader = isLight ? 'bg-[#e5e7eb] border-[#d1d5db]' : 'bg-[#0e0f12] border-[#22242b]';
  const bgSurface = isLight ? 'bg-white text-zinc-800' : 'bg-[#15161a] text-zinc-200';
  const borderSubtle = isLight ? 'border-[#e5e7eb]' : 'border-[#22242b]';
  const textMuted = isLight ? 'text-zinc-500' : 'text-zinc-400';
  const textBright = isLight ? 'text-zinc-900' : 'text-zinc-100';

  return (
    <div
      style={{ height: isMaximized ? 'calc(100vh - 88px)' : `${panelHeight}px` }}
      className={`flex flex-col border-t select-text transition-[height] duration-75 relative shrink-0 z-20 ${bgMain} ${borderSubtle}`}
    >
      {/* Draggable Top Border Resizer */}
      {!isMaximized && (
        <div
          onMouseDown={handleMouseDown}
          onDoubleClick={onResetHeight}
          title="Drag to resize panel (Double-click to reset height)"
          className={`absolute -top-1 left-0 right-0 h-2 cursor-ns-resize z-30 group flex items-center justify-center hover:bg-blue-500/30 transition-colors ${
            isDragging ? 'bg-blue-500' : ''
          }`}
        >
          <div className="w-12 h-[2px] rounded-full bg-zinc-600/40 group-hover:bg-blue-400 transition-colors" />
        </div>
      )}

      {/* 1. COMPACT PANEL TOOLBAR & TABS */}
      <div className={`flex items-center justify-between px-2 h-9 border-b text-xs select-none shrink-0 ${bgHeader}`}>
        {/* Left: Tab Buttons */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
          {/* TERMINAL TAB */}
          <button
            onClick={() => onTabChange('terminal')}
            className={`px-3 py-1.5 flex items-center gap-1.5 font-medium border-b-2 transition-colors shrink-0 ${
              activeTab === 'terminal'
                ? `border-blue-500 ${textBright} ${isLight ? 'bg-white' : 'bg-[#18191e]'}`
                : `border-transparent ${textMuted} hover:${textBright}`
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>TERMINAL</span>
            {terminalSessions.length > 1 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-zinc-300 font-mono">
                {terminalSessions.length}
              </span>
            )}
          </button>

          {/* PROBLEMS TAB */}
          <button
            onClick={() => onTabChange('problems')}
            className={`px-3 py-1.5 flex items-center gap-1.5 font-medium border-b-2 transition-colors shrink-0 ${
              activeTab === 'problems'
                ? `border-blue-500 ${textBright} ${isLight ? 'bg-white' : 'bg-[#18191e]'}`
                : `border-transparent ${textMuted} hover:${textBright}`
            }`}
          >
            <AlertCircle
              className={`w-3.5 h-3.5 ${
                errorCount > 0
                  ? 'text-rose-400'
                  : warningCount > 0
                  ? 'text-amber-400'
                  : 'text-zinc-400'
              }`}
            />
            <span>PROBLEMS</span>
            {problems.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium ${
                  errorCount > 0
                    ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                    : warningCount > 0
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {problems.length}
              </span>
            )}
          </button>

          {/* OUTPUT TAB */}
          <button
            onClick={() => onTabChange('output')}
            className={`px-3 py-1.5 flex items-center gap-1.5 font-medium border-b-2 transition-colors shrink-0 ${
              activeTab === 'output'
                ? `border-blue-500 ${textBright} ${isLight ? 'bg-white' : 'bg-[#18191e]'}`
                : `border-transparent ${textMuted} hover:${textBright}`
            }`}
          >
            <TerminalSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>OUTPUT</span>
            <span className="hidden md:inline text-[10px] text-zinc-500">
              [{activeOutputChannel}]
            </span>
          </button>

          {/* DEBUG CONSOLE TAB */}
          <button
            onClick={() => onTabChange('debug-console')}
            className={`px-3 py-1.5 flex items-center gap-1.5 font-medium border-b-2 transition-colors shrink-0 ${
              activeTab === 'debug-console'
                ? `border-blue-500 ${textBright} ${isLight ? 'bg-white' : 'bg-[#18191e]'}`
                : `border-transparent ${textMuted} hover:${textBright}`
            }`}
          >
            <Bug
              className={`w-3.5 h-3.5 ${
                debugSessionState === 'running' ? 'text-emerald-400' : 'text-zinc-500'
              }`}
            />
            <span>DEBUG CONSOLE</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                debugSessionState === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
              }`}
            />
          </button>
        </div>

        {/* Middle & Right: Contextual Toolbar Controls */}
        <div className="flex items-center space-x-1 py-1">
          {/* TERMINAL CONTROLS */}
          {activeTab === 'terminal' && (
            <div className="flex items-center space-x-1 mr-2">
              {/* Session Selector Dropdown */}
              <select
                value={activeSessionId}
                onChange={(e) => {
                  setActiveSessionId(e.target.value);
                  terminalService.setActiveSessionId(e.target.value);
                }}
                className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-[11px] rounded px-2 py-0.5 focus:outline-hidden"
              >
                {terminalSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isRunning ? '●' : ''}
                  </option>
                ))}
              </select>

              {/* New Terminal Button */}
              <button
                onClick={() => handleCreateTerminal('bash')}
                title="New Terminal"
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* Split Terminal Button */}
              <button
                onClick={handleToggleSplit}
                title={isSplitTerminal ? 'Close Split Terminal' : 'Split Terminal (Side by Side)'}
                className={`p-1 rounded transition ${
                  isSplitTerminal ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <Split className="w-3.5 h-3.5" />
              </button>

              {/* Clear Terminal */}
              <button
                onClick={() => terminalService.clear(activeSessionId)}
                title="Clear Terminal (Ctrl+L)"
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Interrupt / Kill Process */}
              <button
                onClick={() => terminalService.kill(activeSessionId)}
                title="Interrupt Process (Ctrl+C)"
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-rose-400 transition"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>

              {/* Close Current Terminal */}
              {terminalSessions.length > 1 && (
                <button
                  onClick={(e) => handleCloseTerminal(activeSessionId, e)}
                  title="Close Terminal Session"
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-rose-400 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* PROBLEMS CONTROLS */}
          {activeTab === 'problems' && (
            <div className="flex items-center space-x-1.5 mr-2">
              {/* Severity Filter Pills */}
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5 text-[10px]">
                <button
                  onClick={() => setProblemFilterSeverity('all')}
                  className={`px-1.5 py-0.5 rounded transition ${
                    problemFilterSeverity === 'all'
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All ({problems.length})
                </button>
                <button
                  onClick={() => setProblemFilterSeverity('error')}
                  className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition ${
                    problemFilterSeverity === 'error'
                      ? 'bg-rose-600 text-white font-medium'
                      : 'text-rose-400 hover:text-rose-300'
                  }`}
                >
                  <AlertCircle className="w-2.5 h-2.5" /> {errorCount}
                </button>
                <button
                  onClick={() => setProblemFilterSeverity('warning')}
                  className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition ${
                    problemFilterSeverity === 'warning'
                      ? 'bg-amber-600 text-white font-medium'
                      : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  <AlertTriangle className="w-2.5 h-2.5" /> {warningCount}
                </button>
                <button
                  onClick={() => setProblemFilterSeverity('info')}
                  className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition ${
                    problemFilterSeverity === 'info'
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-blue-400 hover:text-blue-300'
                  }`}
                >
                  <Info className="w-2.5 h-2.5" /> {infoCount}
                </button>
                <button
                  onClick={() => setProblemFilterSeverity('hint')}
                  className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition ${
                    problemFilterSeverity === 'hint'
                      ? 'bg-emerald-600 text-white font-medium'
                      : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  <Sparkles className="w-2.5 h-2.5" /> {hintCount}
                </button>
              </div>

              {/* Text Search Filter */}
              <div className="relative flex items-center">
                <Search className="w-3 h-3 text-zinc-500 absolute left-2 pointer-events-none" />
                <input
                  type="text"
                  value={problemSearchQuery}
                  onChange={(e) => setProblemSearchQuery(e.target.value)}
                  placeholder="Filter problems..."
                  className="bg-zinc-900 border border-zinc-700 text-zinc-200 pl-6 pr-2 py-0.5 rounded text-[11px] w-28 md:w-36 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Clear Problems */}
              {onClearProblems && (
                <button
                  onClick={onClearProblems}
                  title="Clear Problems"
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* OUTPUT CONTROLS */}
          {activeTab === 'output' && (
            <div className="flex items-center space-x-1.5 mr-2">
              {/* Channel Selector */}
              <select
                value={activeOutputChannel}
                onChange={(e) => setActiveOutputChannel(e.target.value as OutputChannelId)}
                className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-[11px] rounded px-2 py-0.5 focus:outline-hidden"
              >
                {outputService.getChannels().map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Search Log Filter */}
              <div className="relative flex items-center">
                <Search className="w-3 h-3 text-zinc-500 absolute left-2 pointer-events-none" />
                <input
                  type="text"
                  value={outputSearchQuery}
                  onChange={(e) => setOutputSearchQuery(e.target.value)}
                  placeholder="Filter output..."
                  className="bg-zinc-900 border border-zinc-700 text-zinc-200 pl-6 pr-2 py-0.5 rounded text-[11px] w-28 md:w-36 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Copy Output */}
              <button
                onClick={handleCopyOutput}
                title="Copy Channel Output to Clipboard"
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition"
              >
                {hasCopiedOutput ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Toggle Auto-Scroll */}
              <button
                onClick={() => setIsAutoScrollOutput((prev) => !prev)}
                title={isAutoScrollOutput ? 'Auto-scroll On' : 'Auto-scroll Paused'}
                className={`p-1 rounded transition ${
                  isAutoScrollOutput ? 'text-blue-400 bg-blue-600/20' : 'text-zinc-500 hover:bg-zinc-800'
                }`}
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>

              {/* Clear Channel Output */}
              <button
                onClick={() => outputService.clear(activeOutputChannel)}
                title="Clear Output Channel"
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* DEBUG CONSOLE CONTROLS */}
          {activeTab === 'debug-console' && (
            <div className="flex items-center space-x-1.5 mr-2">
              <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
                Status:
                <span
                  className={
                    debugSessionState === 'running'
                      ? 'text-emerald-400 font-semibold'
                      : 'text-zinc-500'
                  }
                >
                  {debugSessionState.toUpperCase()}
                </span>
              </span>

              {/* Toggle Test Debug Session */}
              <button
                onClick={() => {
                  if (debugSessionState === 'running') {
                    debugService.stopSession();
                  } else {
                    debugService.startSession('DevForge Node Debug Target');
                  }
                }}
                title={debugSessionState === 'running' ? 'Stop Debugger' : 'Start Test Debug Session (F5)'}
                className="px-2 py-0.5 rounded text-[11px] flex items-center gap-1 font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
              >
                {debugSessionState === 'running' ? (
                  <>
                    <Square className="w-2.5 h-2.5 text-rose-400 fill-rose-400" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Play className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
                    <span>Attach Target</span>
                  </>
                )}
              </button>

              {/* Clear Debug Console */}
              <button
                onClick={() => debugService.clearConsole()}
                title="Clear Debug Console"
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="w-[1px] h-3.5 bg-zinc-800 mx-1" />

          {/* Maximize / Restore Panel Button */}
          <button
            onClick={onToggleMaximize}
            title={isMaximized ? 'Restore Panel Size' : 'Maximize Panel (Full Height)'}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition"
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Close Panel Button */}
          <button
            onClick={onClose}
            title="Close Bottom Panel (Ctrl+` or Ctrl+J)"
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. PANEL TAB CONTENTS (Persistent State via Display Toggles) */}
      <div className={`flex-1 overflow-hidden relative ${bgSurface}`}>
        {/* ========================================================================= */}
        {/* TAB 1: TERMINAL */}
        {/* ========================================================================= */}
        <div
          className={`${
            activeTab === 'terminal' ? 'flex h-full w-full' : 'hidden'
          } ${isSplitTerminal ? 'divide-x divide-zinc-800' : ''}`}
        >
          {/* Primary Terminal Session */}
          <div className="flex-1 flex flex-col h-full font-mono text-xs overflow-hidden p-2">
            <div className="flex-1 overflow-y-auto pr-1 space-y-1 select-text">
              {activeSession?.lines.map((line) => {
                let colorClass = 'text-zinc-300';
                if (line.type === 'input') colorClass = 'text-blue-400 font-semibold';
                else if (line.type === 'error') colorClass = 'text-rose-400 font-medium';
                else if (line.type === 'success') colorClass = 'text-emerald-400';
                else if (line.type === 'info') colorClass = 'text-amber-400';
                else if (line.type === 'warning') colorClass = 'text-amber-300';
                else if (line.type === 'system') colorClass = 'text-zinc-500 italic';

                return (
                  <div
                    key={line.id}
                    className={`whitespace-pre-wrap leading-relaxed select-text ${colorClass}`}
                  >
                    {line.text}
                  </div>
                );
              })}
              <div ref={terminalBottomRef} />
            </div>

            {/* Terminal Input Prompt */}
            <form
              onSubmit={handleCommandSubmit}
              className="flex items-center gap-2 pt-2 border-t border-zinc-800/80 shrink-0"
            >
              <span className="text-emerald-400 font-bold shrink-0 select-none">
                {activeSession?.cwd} (main) {activeSession?.shell === 'powershell' ? 'PS>' : '$'}
              </span>
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type command (e.g. 'npm run dev', 'npm test', 'npm run build', 'ls', 'help')..."
                className="flex-1 bg-transparent border-none outline-hidden text-zinc-100 placeholder-zinc-600 font-mono text-xs focus:ring-0"
              />
            </form>
          </div>

          {/* Secondary Terminal Session (when Split Terminal is active) */}
          {isSplitTerminal && secondarySession && (
            <div className="flex-1 flex flex-col h-full font-mono text-xs overflow-hidden p-2 bg-[#121316]">
              <div className="flex items-center justify-between pb-1 border-b border-zinc-800 text-[10px] text-zinc-500 select-none">
                <span>{secondarySession.name} (Split Pane)</span>
                <button
                  onClick={() => setIsSplitTerminal(false)}
                  className="hover:text-zinc-200"
                >
                  Close Split
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-1 select-text pt-1">
                {secondarySession.lines.map((line) => (
                  <div
                    key={line.id}
                    className={`whitespace-pre-wrap leading-relaxed select-text ${
                      line.type === 'input'
                        ? 'text-blue-400 font-semibold'
                        : line.type === 'error'
                        ? 'text-rose-400'
                        : line.type === 'success'
                        ? 'text-emerald-400'
                        : 'text-zinc-300'
                    }`}
                  >
                    {line.text}
                  </div>
                ))}
                <div ref={splitTerminalBottomRef} />
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TAB 2: PROBLEMS */}
        {/* ========================================================================= */}
        <div
          className={`${
            activeTab === 'problems' ? 'flex flex-col h-full w-full' : 'hidden'
          } overflow-y-auto p-2`}
        >
          {filteredProblems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-1 py-8">
              <Check className="w-8 h-8 text-emerald-500/80 mb-1" />
              <p className="text-sm font-medium text-zinc-300">No problems have been detected in the workspace.</p>
              <p className="text-xs text-zinc-500">
                Diagnostics from compiler, linter, and language servers will report here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/40 text-xs">
              {filteredProblems.map((prob) => {
                let icon = <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
                if (prob.severity === 'error') {
                  icon = <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
                } else if (prob.severity === 'warning') {
                  icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
                } else if (prob.severity === 'hint') {
                  icon = <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
                }

                return (
                  <div
                    key={prob.id}
                    onClick={() => onNavigateToProblem(prob.file, prob.line, prob.column)}
                    title="Click to jump to line in Monaco editor"
                    className="flex items-center justify-between py-1.5 px-2 hover:bg-zinc-800/50 rounded cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                      {icon}
                      <span className="text-zinc-200 group-hover:text-blue-400 font-sans text-xs truncate">
                        {prob.message}
                      </span>
                      {prob.code && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                          {prob.code}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-zinc-500 text-[11px] shrink-0">
                      <span className="font-mono bg-zinc-900/80 px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-400 group-hover:border-blue-500/50 group-hover:text-blue-300">
                        {prob.file}:{prob.line}:{prob.column}
                      </span>
                      <span className="text-[10px] uppercase font-mono text-zinc-600">
                        [{prob.source}]
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TAB 3: OUTPUT */}
        {/* ========================================================================= */}
        <div
          className={`${
            activeTab === 'output' ? 'flex flex-col h-full w-full' : 'hidden'
          } font-mono text-xs overflow-hidden p-2 select-text`}
        >
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 select-text">
            {filteredOutputLogs.length === 0 ? (
              <div className="text-zinc-600 italic py-4">No output records found for channel [{activeOutputChannel}].</div>
            ) : (
              filteredOutputLogs.map((log) => {
                let levelBadge = 'text-zinc-500';
                if (log.level === 'error') levelBadge = 'text-rose-400 font-bold';
                else if (log.level === 'warn') levelBadge = 'text-amber-400 font-semibold';
                else if (log.level === 'success') levelBadge = 'text-emerald-400';
                else if (log.level === 'debug') levelBadge = 'text-indigo-400';

                return (
                  <div key={log.id} className="flex items-start gap-2 leading-relaxed select-text">
                    <span className="text-zinc-600 select-none shrink-0 text-[11px]">
                      [{log.timestamp}]
                    </span>
                    <span className={`text-[10px] uppercase font-bold shrink-0 ${levelBadge}`}>
                      [{log.level}]
                    </span>
                    <span className="text-zinc-300 whitespace-pre-wrap flex-1 break-words">
                      {log.text}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={outputBottomRef} />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 4: DEBUG CONSOLE */}
        {/* ========================================================================= */}
        <div
          className={`${
            activeTab === 'debug-console' ? 'flex flex-col h-full w-full' : 'hidden'
          } font-mono text-xs overflow-hidden p-2 select-text`}
        >
          {/* Inactive State Banner if no debug target is active */}
          {debugSessionState === 'inactive' && (
            <div className="mb-2 p-2 bg-zinc-900/80 border border-zinc-800 rounded text-[11px] text-zinc-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-zinc-200 font-medium">Debug session not active</p>
                <p className="text-zinc-400 text-[10px]">
                  Expressions entered below evaluate safely in client scratchpad mode. Attach a target runtime (F5) to evaluate live variables and call frames.
                </p>
              </div>
            </div>
          )}

          {/* Console Entries Stream */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 select-text">
            {debugEntries.map((entry) => {
              if (entry.type === 'input') {
                return (
                  <div key={entry.id} className="flex items-start gap-1.5 text-blue-400 font-semibold">
                    <span className="text-blue-500 select-none">&gt;</span>
                    <span className="select-text whitespace-pre-wrap">{entry.content}</span>
                  </div>
                );
              }
              if (entry.type === 'error') {
                return (
                  <div key={entry.id} className="flex items-start gap-1.5 text-rose-400 pl-3">
                    <span className="select-text whitespace-pre-wrap">{entry.content}</span>
                  </div>
                );
              }
              if (entry.type === 'system') {
                return (
                  <div key={entry.id} className="text-zinc-500 italic text-[11px] pl-3">
                    {entry.content}
                  </div>
                );
              }

              // Output value
              return (
                <div key={entry.id} className="text-zinc-200 pl-3 leading-relaxed whitespace-pre-wrap">
                  {entry.content}
                </div>
              );
            })}
            <div ref={debugBottomRef} />
          </div>

          {/* Debug Console Input */}
          <form
            onSubmit={handleDebugSubmit}
            className="flex items-center gap-2 pt-2 border-t border-zinc-800 shrink-0"
          >
            <span className="text-blue-400 font-bold shrink-0 select-none">&gt;</span>
            <input
              type="text"
              value={debugInput}
              onChange={(e) => setDebugInput(e.target.value)}
              onKeyDown={handleDebugKeyDown}
              placeholder="Evaluate JavaScript expression (e.g. 10 + 20, Math.random(), document.title)..."
              className="flex-1 bg-transparent border-none outline-hidden text-zinc-100 placeholder-zinc-600 font-mono text-xs focus:ring-0"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
