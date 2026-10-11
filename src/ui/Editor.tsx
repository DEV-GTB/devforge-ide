import React, { useState, useRef, useEffect, useMemo } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { 
  X, 
  Plus, 
  SplitSquareHorizontal, 
  SplitSquareVertical, 
  ChevronRight, 
  ChevronDown,
  Code2, 
  Save, 
  ArrowLeft, 
  ArrowRight, 
  ZoomIn, 
  ZoomOut, 
  WrapText, 
  Layers, 
  MoreVertical, 
  Check, 
  Copy, 
  Folder, 
  FileText,
  AlignLeft,
  Sparkles
} from 'lucide-react';
import { FileNode, flattenFiles } from '../core/filesystem';
import { EditorSplit, ProblemItem } from '../core/workspace';
import { FileIcon } from '../core/fileIcons';
import { getLanguageForFile } from '../core/language';
import { EditorSettings } from '../core/editorSettings';

export interface EditorApi {
  triggerFind: () => void;
  triggerReplace: () => void;
  triggerUndo: () => void;
  triggerRedo: () => void;
  triggerFormat: () => void;
  focus: () => void;
}

interface EditorProps {
  openTabs: FileNode[];
  activeFile: FileNode | null;
  secondaryFile: FileNode | null;
  editorSplit: EditorSplit;
  allFiles?: FileNode[];
  problems?: ProblemItem[];
  targetLocation?: { line: number; col: number; matchLength?: number; timestamp: number } | null;
  onEditorReady?: (api: EditorApi) => void;
  onSelectTab: (fileId: string) => void;
  onCloseTab: (fileId: string, e?: React.MouseEvent) => void;
  onCloseOtherTabs?: (fileId: string) => void;
  onCloseTabsToRight?: (fileId: string) => void;
  onCloseAllTabs?: () => void;
  onNewFileClick: () => void;
  onContentChange: (fileId: string, newContent: string) => void;
  onSaveFile: (fileId: string) => void;
  onSaveAs?: (fileId: string) => void;
  onSaveAll?: () => void;
  onToggleSplit: (split: EditorSplit) => void;
  onSelectSecondaryFile?: (fileId: string) => void;
  onCursorChange?: (line: number, col: number) => void;
  onSelectionChange?: (selectedChars: number) => void;
  theme: 'dark' | 'light';
  settings: EditorSettings;
  onUpdateSettings?: (settings: Partial<EditorSettings>) => void;
  workspaceName?: string;
}

interface TabContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  tab: FileNode | null;
}

export function Editor({
  openTabs,
  activeFile,
  secondaryFile,
  editorSplit,
  allFiles = [],
  problems = [],
  targetLocation = null,
  onEditorReady,
  onSelectTab,
  onCloseTab,
  onCloseOtherTabs,
  onCloseTabsToRight,
  onCloseAllTabs,
  onNewFileClick,
  onContentChange,
  onSaveFile,
  onSaveAs,
  onSaveAll,
  onToggleSplit,
  onSelectSecondaryFile,
  onCursorChange,
  onSelectionChange,
  theme,
  settings,
  onUpdateSettings,
  workspaceName = 'PROJECT'
}: EditorProps) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const secondaryEditorRef = useRef<any>(null);
  const activeFileRef = useRef<FileNode | null>(activeFile);
  activeFileRef.current = activeFile;

  // File navigation history (Back / Forward)
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Tab Context Menu State
  const [tabContextMenu, setTabContextMenu] = useState<TabContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    tab: null
  });

  // More Actions Menu State
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Breadcrumb Folder Dropdown State
  const [breadcrumbDropdown, setBreadcrumbDropdown] = useState<{
    isOpen: boolean;
    folderPath: string;
    items: FileNode[];
    x: number;
    y: number;
  } | null>(null);

  // Track file navigation history
  useEffect(() => {
    if (!activeFile) return;
    setHistory((prev) => {
      // Don't push duplicate consecutive entries
      if (prev.length > 0 && prev[prev.length - 1] === activeFile.id) {
        return prev;
      }
      const updated = [...prev, activeFile.id];
      setHistoryIndex(updated.length - 1);
      return updated;
    });
  }, [activeFile?.id]);

  // Handle Back in navigation history
  const handleNavBack = () => {
    if (historyIndex > 0) {
      const prevId = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onSelectTab(prevId);
    }
  };

  // Handle Forward in navigation history
  const handleNavForward = () => {
    if (historyIndex < history.length - 1) {
      const nextId = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onSelectTab(nextId);
    }
  };

  // Close context menu & dropdowns on global click
  useEffect(() => {
    const handleGlobalClick = () => {
      setTabContextMenu((p) => ({ ...p, isOpen: false }));
      setIsMoreMenuOpen(false);
      setBreadcrumbDropdown(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Configure custom Monaco Editor themes & actions on mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      allowNonTsExtensions: true,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX
    });

    // Define custom dark theme
    monaco.editor.defineTheme('devforge-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '38bdf8' },
        { token: 'string', foreground: 'fcd34d' },
        { token: 'number', foreground: '4ade80' },
        { token: 'type', foreground: '2dd4bf' },
        { token: 'function', foreground: '818cf8' },
        { token: 'variable', foreground: 'e2e8f0' },
        { token: 'delimiter', foreground: '94a3b8' }
      ],
      colors: {
        'editor.background': '#14151a',
        'editor.foreground': '#e2e8f0',
        'editor.lineHighlightBackground': '#1e2029',
        'editor.selectionBackground': '#2563eb40',
        'editor.inactiveSelectionBackground': '#3b82f620',
        'editorCursor.foreground': '#38bdf8',
        'editorWhitespace.foreground': '#27272a',
        'editorLineNumber.foreground': '#52525b',
        'editorLineNumber.activeForeground': '#a1a1aa',
        'editorGutter.background': '#14151a',
        'editorIndentGuide.background': '#27272a',
        'editorIndentGuide.activeBackground': '#3f3f46',
        'minimap.background': '#14151a'
      }
    });

    // Define custom light theme
    monaco.editor.defineTheme('devforge-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '0284c7' },
        { token: 'string', foreground: 'b45309' },
        { token: 'number', foreground: '15803d' },
        { token: 'type', foreground: '0f766e' },
        { token: 'function', foreground: '4338ca' }
      ],
      colors: {
        'editor.background': '#f8fafc',
        'editor.foreground': '#1e293b',
        'editor.lineHighlightBackground': '#f1f5f9',
        'editor.selectionBackground': '#93c5fd50',
        'editorCursor.foreground': '#0284c7',
        'editorLineNumber.foreground': '#94a3b8',
        'editorLineNumber.activeForeground': '#334155',
        'editorGutter.background': '#f8fafc'
      }
    });

    monaco.editor.setTheme(theme === 'dark' ? 'devforge-dark' : 'devforge-light');

    // Track cursor movements
    editor.onDidChangeCursorPosition((e: any) => {
      if (onCursorChange) {
        onCursorChange(e.position.lineNumber, e.position.column);
      }
    });

    // Track text selection count
    editor.onDidChangeCursorSelection(() => {
      if (onSelectionChange) {
        const selection = editor.getSelection();
        if (selection && !selection.isEmpty()) {
          const model = editor.getModel();
          if (model) {
            const selectedText = model.getValueInRange(selection);
            onSelectionChange(selectedText.length);
            return;
          }
        }
        onSelectionChange(0);
      }
    });

    // Add Save File command to Monaco (Cmd/Ctrl + S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (activeFileRef.current) {
        onSaveFile(activeFileRef.current.id);
      }
    });

    // Add Save As command to Monaco (Cmd/Ctrl + Shift + S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => {
      if (activeFileRef.current && onSaveAs) {
        onSaveAs(activeFileRef.current.id);
      }
    });

    // Context Menu Action: Save File
    editor.addAction({
      id: 'devforge-save',
      label: 'Save File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      contextMenuGroupId: '1_modification',
      contextMenuOrder: 1,
      run: () => {
        if (activeFileRef.current) onSaveFile(activeFileRef.current.id);
      }
    });

    // Context Menu Action: Save As
    editor.addAction({
      id: 'devforge-save-as',
      label: 'Save As...',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS],
      contextMenuGroupId: '1_modification',
      contextMenuOrder: 2,
      run: () => {
        if (activeFileRef.current && onSaveAs) onSaveAs(activeFileRef.current.id);
      }
    });

    // Context Menu Action: Format Document
    editor.addAction({
      id: 'devforge-format-doc',
      label: 'Format Document',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      contextMenuGroupId: '1_modification',
      contextMenuOrder: 3,
      run: () => {
        editor.getAction('editor.action.formatDocument')?.run();
      }
    });

    // Provide EditorApi to workbench
    if (onEditorReady) {
      onEditorReady({
        triggerFind: () => {
          editor.focus();
          editor.getAction('actions.find')?.run();
        },
        triggerReplace: () => {
          editor.focus();
          editor.getAction('editor.action.startFindReplaceAction')?.run();
        },
        triggerUndo: () => {
          editor.focus();
          editor.trigger('workbench', 'undo', null);
        },
        triggerRedo: () => {
          editor.focus();
          editor.trigger('workbench', 'redo', null);
        },
        triggerFormat: () => {
          editor.focus();
          editor.getAction('editor.action.formatDocument')?.run();
        },
        focus: () => editor.focus()
      });
    }
  };

  // Jump to location when targetLocation changes (e.g. from Problems panel or Search navigation)
  useEffect(() => {
    if (targetLocation && editorRef.current) {
      const editor = editorRef.current;
      const line = targetLocation.line;
      const startCol = targetLocation.col || 1;
      const matchLen = targetLocation.matchLength || 0;
      const endCol = startCol + matchLen;

      editor.revealLineInCenter(line);
      editor.setPosition({
        lineNumber: line,
        column: startCol
      });

      if (matchLen > 0) {
        editor.setSelection({
          startLineNumber: line,
          startColumn: startCol,
          endLineNumber: line,
          endColumn: endCol
        });

        if (monacoRef.current) {
          const decorations = editor.deltaDecorations([], [
            {
              range: new monacoRef.current.Range(line, startCol, line, endCol),
              options: {
                inlineClassName: 'bg-amber-400/40 text-white rounded font-bold underline',
                className: 'bg-amber-500/20'
              }
            }
          ]);
          setTimeout(() => {
            if (editorRef.current) {
              editorRef.current.deltaDecorations(decorations, []);
            }
          }, 2500);
        }
      }

      editor.focus();
    }
  }, [targetLocation]);

  // Synchronize Monaco model markers with workspace problems
  useEffect(() => {
    if (monacoRef.current && editorRef.current && activeFile) {
      const model = editorRef.current.getModel();
      if (model && problems) {
        const fileProblems = problems.filter((p) => {
          return (
            activeFile.path === p.file ||
            activeFile.path.endsWith(p.file) ||
            p.file.endsWith(activeFile.name)
          );
        });

        const markers = fileProblems.map((p) => {
          let severity = monacoRef.current.MarkerSeverity.Info;
          if (p.severity === 'error') severity = monacoRef.current.MarkerSeverity.Error;
          else if (p.severity === 'warning') severity = monacoRef.current.MarkerSeverity.Warning;
          else if (p.severity === 'hint') severity = monacoRef.current.MarkerSeverity.Hint;

          return {
            severity,
            message: `${p.message}${p.code ? ` (${p.code})` : ''} [${p.source}]`,
            startLineNumber: p.line,
            startColumn: p.column || 1,
            endLineNumber: p.line,
            endColumn: (p.column || 1) + 12
          };
        });

        monacoRef.current.editor.setModelMarkers(model, 'devforge-diagnostics', markers);
      }
    }
  }, [problems, activeFile?.id, activeFile?.content]);

  // Format active document
  const handleFormatDocument = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (onUpdateSettings) {
      onUpdateSettings({ fontSize: Math.min(24, settings.fontSize + 1) });
    }
  };

  const handleZoomOut = () => {
    if (onUpdateSettings) {
      onUpdateSettings({ fontSize: Math.max(10, settings.fontSize - 1) });
    }
  };

  // Toggle word wrap
  const handleToggleWordWrap = () => {
    if (onUpdateSettings) {
      onUpdateSettings({ wordWrap: settings.wordWrap === 'on' ? 'off' : 'on' });
    }
  };

  // Toggle minimap
  const handleToggleMinimap = () => {
    if (onUpdateSettings) {
      onUpdateSettings({ minimap: !settings.minimap });
    }
  };

  // Tab Context Menu Handler
  const handleTabContextMenu = (e: React.MouseEvent, tab: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setTabContextMenu({
      isOpen: true,
      x: Math.min(window.innerWidth - 180, e.clientX),
      y: e.clientY,
      tab
    });
  };

  // Language info
  const activeLang = activeFile ? getLanguageForFile(activeFile.name) : { name: 'Plain Text', monacoLang: 'plaintext' };
  const secondaryLang = secondaryFile ? getLanguageForFile(secondaryFile.name) : { name: 'Plain Text', monacoLang: 'plaintext' };

  // Flat files for breadcrumb dropdowns
  const flatFiles = useMemo(() => flattenFiles(allFiles), [allFiles]);

  // Handle clicking breadcrumb folder
  const handleBreadcrumbFolderClick = (e: React.MouseEvent, folderPath: string) => {
    e.stopPropagation();
    const children = flatFiles.filter((f) => {
      const parent = f.path.substring(0, f.path.lastIndexOf('/'));
      return parent === folderPath;
    });

    if (children.length > 0) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setBreadcrumbDropdown({
        isOpen: true,
        folderPath,
        items: children,
        x: rect.left,
        y: rect.bottom + 4
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#14151a] overflow-hidden select-none">
      {/* 1. TOP TAB BAR */}
      <div className="flex items-center justify-between bg-[#101114] border-b border-[#23242b] h-9 px-1 overflow-x-auto no-scrollbar">
        {/* Left: Tab List */}
        <div className="flex items-center space-x-1 h-full overflow-x-auto no-scrollbar">
          {openTabs.map((tab) => {
            const isActive = tab.id === activeFile?.id;

            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                onContextMenu={(e) => handleTabContextMenu(e, tab)}
                onAuxClick={(e) => {
                  // Middle-click to close
                  if (e.button === 1) {
                    e.preventDefault();
                    onCloseTab(tab.id, e);
                  }
                }}
                title={tab.path}
                className={`group flex items-center gap-1.5 h-full px-3 text-xs border-r border-[#23242b] cursor-pointer transition-colors select-none relative ${
                  isActive
                    ? 'bg-[#14151a] text-zinc-100 border-t-2 border-t-blue-500 font-medium'
                    : 'bg-[#101114] text-zinc-400 hover:text-zinc-200 hover:bg-[#181920]'
                }`}
              >
                <FileIcon filename={tab.name} className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[130px]">{tab.name}</span>

                {/* Dirty dot or Close button */}
                <div className="w-4 h-4 flex items-center justify-center ml-1">
                  {tab.isDirty ? (
                    <>
                      {/* Unsaved indicator dot */}
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onSaveFile(tab.id);
                        }}
                        title="Unsaved changes (Click to save / Ctrl+S)"
                        className="w-2 h-2 rounded-full bg-blue-400 group-hover:hidden"
                      />
                      {/* Close button on hover */}
                      <button
                        onClick={(e) => onCloseTab(tab.id, e)}
                        title="Close (Ctrl+W)"
                        className="hidden group-hover:flex p-0.5 rounded hover:bg-zinc-700/60 text-zinc-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => onCloseTab(tab.id, e)}
                      title="Close (Ctrl+W)"
                      className="p-0.5 rounded hover:bg-zinc-700/60 text-zinc-500 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <button
            onClick={onNewFileClick}
            title="New File"
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 rounded transition"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Editor Header Toolbar Controls */}
        <div className="flex items-center space-x-0.5 px-1 text-zinc-400 shrink-0">
          {/* Back Navigation */}
          <button
            onClick={handleNavBack}
            disabled={historyIndex <= 0}
            title="Go Back (Alt + Left)"
            className={`p-1.5 rounded transition ${
              historyIndex > 0 ? 'hover:bg-zinc-800 hover:text-zinc-200' : 'opacity-30 cursor-not-allowed'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          {/* Forward Navigation */}
          <button
            onClick={handleNavForward}
            disabled={historyIndex >= history.length - 1}
            title="Go Forward (Alt + Right)"
            className={`p-1.5 rounded transition ${
              historyIndex < history.length - 1 ? 'hover:bg-zinc-800 hover:text-zinc-200' : 'opacity-30 cursor-not-allowed'
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-zinc-800 mx-1" />

          {/* Split Editor Vertical (Right) */}
          <button
            onClick={() => onToggleSplit(editorSplit === 'vertical' ? 'single' : 'vertical')}
            title="Split Editor Right (Ctrl+\)"
            className={`p-1.5 rounded transition ${
              editorSplit === 'vertical' ? 'text-blue-400 bg-blue-600/20' : 'hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
          </button>

          {/* Split Editor Horizontal (Down) */}
          <button
            onClick={() => onToggleSplit(editorSplit === 'horizontal' ? 'single' : 'horizontal')}
            title="Split Editor Down"
            className={`p-1.5 rounded transition ${
              editorSplit === 'horizontal' ? 'text-blue-400 bg-blue-600/20' : 'hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <SplitSquareHorizontal className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-zinc-800 mx-1" />

          {/* Toggle Word Wrap */}
          <button
            onClick={handleToggleWordWrap}
            title={`Toggle Word Wrap (${settings.wordWrap === 'on' ? 'Enabled' : 'Disabled'})`}
            className={`p-1.5 rounded transition ${
              settings.wordWrap === 'on' ? 'text-blue-400 bg-zinc-800' : 'hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Minimap */}
          <button
            onClick={handleToggleMinimap}
            title={`Toggle Minimap (${settings.minimap ? 'Visible' : 'Hidden'})`}
            className={`p-1.5 rounded transition ${
              settings.minimap ? 'text-blue-400 bg-zinc-800' : 'hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            title="Zoom Out Font (Ctrl -)"
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            title="Zoom In Font (Ctrl +)"
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Save Active File Button */}
          {activeFile && (
            <button
              onClick={() => onSaveFile(activeFile.id)}
              title={activeFile.isDirty ? "Save File (Ctrl+S) - Unsaved changes" : "File Saved"}
              className={`p-1.5 rounded transition ${
                activeFile.isDirty
                  ? 'text-amber-400 hover:bg-amber-500/20'
                  : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          )}

          {/* More Actions Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMoreMenuOpen(!isMoreMenuOpen);
              }}
              title="More Editor Actions"
              className={`p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition ${
                isMoreMenuOpen ? 'bg-zinc-800 text-white' : ''
              }`}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {isMoreMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1 w-48 bg-[#181920] border border-[#2e303d] rounded-md shadow-xl py-1 z-50 text-xs text-zinc-300"
              >
                <button
                  onClick={() => {
                    handleFormatDocument();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between"
                >
                  <span>Format Document</span>
                  <span className="text-[10px] text-zinc-500">Shift+Alt+F</span>
                </button>

                {onSaveAll && (
                  <button
                    onClick={() => {
                      onSaveAll();
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between"
                  >
                    <span>Save All Files</span>
                    <span className="text-[10px] text-zinc-500">Ctrl+Shift+S</span>
                  </button>
                )}

                {activeFile && onSaveAs && (
                  <button
                    onClick={() => {
                      onSaveAs(activeFile.id);
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between"
                  >
                    <span>Save As...</span>
                  </button>
                )}

                <div className="h-[1px] bg-zinc-800 my-1" />

                <button
                  onClick={() => {
                    if (onUpdateSettings) onUpdateSettings({ fontSize: 13 });
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between"
                >
                  <span>Reset Font Size</span>
                  <span className="text-[10px] text-zinc-500">13px</span>
                </button>

                <button
                  onClick={() => {
                    if (onUpdateSettings) {
                      onUpdateSettings({
                        lineNumbers: settings.lineNumbers === 'on' ? 'off' : 'on'
                      });
                    }
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between"
                >
                  <span>Toggle Line Numbers</span>
                  <span className="text-[10px] text-zinc-500">{settings.lineNumbers}</span>
                </button>

                <div className="h-[1px] bg-zinc-800 my-1" />

                {onCloseOtherTabs && activeFile && (
                  <button
                    onClick={() => {
                      onCloseOtherTabs(activeFile.id);
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white"
                  >
                    Close Other Tabs
                  </button>
                )}

                {onCloseAllTabs && (
                  <button
                    onClick={() => {
                      onCloseAllTabs();
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-red-600 hover:text-white"
                  >
                    Close All Tabs
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. BREADCRUMBS BAR */}
      {activeFile && (
        <div className="flex items-center px-3 py-1 bg-[#101114] border-b border-[#23242b] text-[11px] text-zinc-400 select-none">
          <span className="text-zinc-500 font-semibold uppercase tracking-wider">{workspaceName}</span>
          {activeFile.path.split('/').map((seg, i, arr) => {
            const isLast = i === arr.length - 1;
            const currentSubPath = arr.slice(0, i + 1).join('/');

            return (
              <React.Fragment key={i}>
                <ChevronRight className="w-3 h-3 text-zinc-600 mx-1 shrink-0" />
                <span
                  onClick={(e) => !isLast && handleBreadcrumbFolderClick(e, currentSubPath)}
                  className={`flex items-center gap-1 transition-colors ${
                    isLast
                      ? 'text-zinc-200 font-medium'
                      : 'text-zinc-400 hover:text-blue-400 cursor-pointer hover:underline'
                  }`}
                >
                  {isLast ? (
                    <FileIcon filename={seg} className="w-3 h-3" />
                  ) : (
                    <Folder className="w-3 h-3 text-zinc-500" />
                  )}
                  <span>{seg}</span>
                </span>
              </React.Fragment>
            );
          })}
          {activeFile.isDirty && (
            <span className="ml-2 px-1.5 py-0.2 text-[10px] rounded bg-blue-500/20 text-blue-400 font-mono">
              [Modified]
            </span>
          )}
        </div>
      )}

      {/* 3. MAIN EDITOR SURFACE (SINGLE OR SPLIT) */}
      <div className="flex-1 relative overflow-hidden">
        {activeFile ? (
          <div className={`w-full h-full flex ${editorSplit === 'horizontal' ? 'flex-col' : 'flex-row'}`}>
            {/* Primary Editor Pane */}
            <div className="flex-1 h-full relative flex flex-col">
              {editorSplit !== 'single' && (
                <div className="flex items-center justify-between px-3 py-1 bg-[#14151a] border-b border-[#23242b] text-xs text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    <FileIcon filename={activeFile.name} className="w-3.5 h-3.5" />
                    <span className="font-medium">{activeFile.name}</span>
                    <span className="text-[10px] text-zinc-500">Pane 1</span>
                  </div>
                </div>
              )}
              <div className="flex-1 relative">
                <MonacoEditor
                  height="100%"
                  language={activeLang.monacoLang}
                  theme={theme === 'dark' ? 'devforge-dark' : 'devforge-light'}
                  value={activeFile.content || ''}
                  onChange={(val) => onContentChange(activeFile.id, val || '')}
                  onMount={handleEditorDidMount}
                  options={{
                    fontSize: settings.fontSize,
                    fontFamily: settings.fontFamily,
                    minimap: { enabled: settings.minimap },
                    wordWrap: settings.wordWrap,
                    lineNumbers: settings.lineNumbers,
                    tabSize: settings.tabSize,
                    insertSpaces: settings.insertSpaces,
                    scrollBeyondLastLine: false,
                    smoothScrolling: settings.smoothScrolling,
                    automaticLayout: true,
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    cursorStyle: settings.cursorStyle,
                    bracketPairColorization: { enabled: settings.bracketPairColorization },
                    folding: true,
                    matchBrackets: 'always',
                    autoIndent: 'advanced',
                    formatOnPaste: true,
                    formatOnType: true,
                    renderLineHighlight: 'all',
                    multiCursorModifier: 'alt',
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: true,
                    contextmenu: true
                  }}
                />
              </div>
            </div>

            {/* Secondary Split Pane */}
            {editorSplit !== 'single' && (
              <div
                className={`flex-1 h-full relative flex flex-col ${
                  editorSplit === 'vertical' ? 'border-l border-[#23242b]' : 'border-t border-[#23242b]'
                }`}
              >
                {/* Secondary Header */}
                <div className="flex items-center justify-between px-3 py-1 bg-[#14151a] border-b border-[#23242b] text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold">Pane 2</span>
                    {secondaryFile ? (
                      <div className="flex items-center gap-1.5">
                        <FileIcon filename={secondaryFile.name} className="w-3.5 h-3.5" />
                        <span className="font-medium">{secondaryFile.name}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-500 italic">No file selected</span>
                    )}
                  </div>

                  {/* Secondary Pane File Switcher / Close */}
                  <div className="flex items-center gap-1">
                    {openTabs.length > 1 && onSelectSecondaryFile && (
                      <select
                        value={secondaryFile?.id || ''}
                        onChange={(e) => onSelectSecondaryFile(e.target.value)}
                        className="bg-[#1e1f26] border border-zinc-700 text-[11px] text-zinc-200 rounded px-1.5 py-0.5"
                      >
                        <option value="">Select file...</option>
                        {openTabs.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      onClick={() => onToggleSplit('single')}
                      title="Close Split"
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Secondary Monaco Surface */}
                <div className="flex-1 relative">
                  {secondaryFile ? (
                    <MonacoEditor
                      height="100%"
                      language={secondaryLang.monacoLang}
                      theme={theme === 'dark' ? 'devforge-dark' : 'devforge-light'}
                      value={secondaryFile.content || ''}
                      onChange={(val) => onContentChange(secondaryFile.id, val || '')}
                      options={{
                        fontSize: settings.fontSize,
                        fontFamily: settings.fontFamily,
                        minimap: { enabled: false },
                        wordWrap: settings.wordWrap,
                        lineNumbers: settings.lineNumbers,
                        tabSize: settings.tabSize,
                        insertSpaces: settings.insertSpaces,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on',
                        bracketPairColorization: { enabled: true }
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs p-6 text-center space-y-2">
                      <SplitSquareVertical className="w-8 h-8 text-zinc-600 mb-1" />
                      <span className="font-medium text-zinc-400">Side-by-Side Split View</span>
                      <p className="text-[11px] text-zinc-500 max-w-[200px]">
                        Choose an open tab above or click any file in the Explorer to view simultaneously.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs space-y-3">
            <Code2 className="w-12 h-12 text-zinc-700" />
            <p className="text-zinc-400 font-medium">No files open in editor</p>
            <div className="flex items-center gap-2">
              <button
                onClick={onNewFileClick}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition"
              >
                Create New File
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. TAB CONTEXT MENU */}
      {tabContextMenu.isOpen && tabContextMenu.tab && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ top: tabContextMenu.y, left: tabContextMenu.x }}
          className="fixed z-50 w-52 bg-[#181920] border border-[#2e303d] rounded-md shadow-2xl py-1 text-xs text-zinc-300"
        >
          <button
            onClick={() => {
              if (tabContextMenu.tab) onCloseTab(tabContextMenu.tab.id);
              setTabContextMenu((p) => ({ ...p, isOpen: false }));
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between"
          >
            <span>Close</span>
            <span className="text-[10px] text-zinc-500">Ctrl+W</span>
          </button>

          {onCloseOtherTabs && (
            <button
              onClick={() => {
                if (tabContextMenu.tab) onCloseOtherTabs(tabContextMenu.tab.id);
                setTabContextMenu((p) => ({ ...p, isOpen: false }));
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white"
            >
              Close Others
            </button>
          )}

          {onCloseTabsToRight && (
            <button
              onClick={() => {
                if (tabContextMenu.tab) onCloseTabsToRight(tabContextMenu.tab.id);
                setTabContextMenu((p) => ({ ...p, isOpen: false }));
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white"
            >
              Close Tabs to the Right
            </button>
          )}

          {onCloseAllTabs && (
            <button
              onClick={() => {
                onCloseAllTabs();
                setTabContextMenu((p) => ({ ...p, isOpen: false }));
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white"
            >
              Close All
            </button>
          )}

          <div className="h-[1px] bg-zinc-800 my-1" />

          <button
            onClick={() => {
              if (tabContextMenu.tab) {
                navigator.clipboard.writeText(tabContextMenu.tab.name);
              }
              setTabContextMenu((p) => ({ ...p, isOpen: false }));
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between"
          >
            <span>Copy File Name</span>
            <Copy className="w-3 h-3 text-zinc-500" />
          </button>

          <button
            onClick={() => {
              if (tabContextMenu.tab) {
                navigator.clipboard.writeText(tabContextMenu.tab.path);
              }
              setTabContextMenu((p) => ({ ...p, isOpen: false }));
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between"
          >
            <span>Copy Relative Path</span>
            <Copy className="w-3 h-3 text-zinc-500" />
          </button>

          <div className="h-[1px] bg-zinc-800 my-1" />

          <button
            onClick={() => {
              if (tabContextMenu.tab) onSaveFile(tabContextMenu.tab.id);
              setTabContextMenu((p) => ({ ...p, isOpen: false }));
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between"
          >
            <span>Save</span>
            <span className="text-[10px] text-zinc-500">Ctrl+S</span>
          </button>
        </div>
      )}

      {/* 5. BREADCRUMB FOLDER DROPDOWN */}
      {breadcrumbDropdown && breadcrumbDropdown.isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ top: breadcrumbDropdown.y, left: breadcrumbDropdown.x }}
          className="fixed z-50 w-52 max-h-60 overflow-y-auto bg-[#181920] border border-[#2e303d] rounded-md shadow-2xl py-1 text-xs text-zinc-300"
        >
          <div className="px-2 py-1 text-[10px] font-semibold uppercase text-zinc-500 border-b border-zinc-800">
            Files in {breadcrumbDropdown.folderPath}
          </div>
          {breadcrumbDropdown.items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                setBreadcrumbDropdown(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center gap-2"
            >
              <FileIcon filename={item.name} className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
