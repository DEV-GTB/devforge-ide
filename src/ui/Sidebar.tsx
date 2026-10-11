import React, { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  File, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  FolderPlus, 
  RotateCw, 
  MoreVertical, 
  MoreHorizontal,
  Search, 
  GitBranch, 
  Play, 
  Pause, 
  StepForward, 
  RotateCcw, 
  Square, 
  Package, 
  Sparkles, 
  Settings as SettingsIcon, 
  Trash2, 
  Edit2, 
  Check, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Layers, 
  Sliders, 
  FileCode,
  ArrowRight,
  Send,
  Zap,
  CheckCheck
} from 'lucide-react';
import { FileNode, getFileIconColor, searchInFiles, findNodeById } from '../core/filesystem';
import { askNexus, FileOperation, NexusImage, NexusSource } from '../services/nexusChat';
import { AiFileOpsReview } from './AiFileOpsReview';
import { ActivityTab, ProblemItem } from '../core/workspace';
import { DebuggerState } from '../core/debugger';
import { Explorer } from './Explorer';
import { SearchView } from './SearchView';
import { SUPPORTED_LANGUAGES } from '../core/language';
import { RECENT_PROJECTS, PROJECT_TEMPLATES } from '../services/projectService';
import { DETECTED_RUNTIMES } from '../services/runtimeService';

export interface AiChatMessage {
  role: 'user' | 'assistant';
  text: string;
  diff?: { file: string; code: string };
  sources?: NexusSource[];
  images?: NexusImage[];
  fileOps?: FileOperation[];
  authNotice?: {
    isAuthBlocked: boolean;
    title: string;
    message: string;
  };
  suggestedActions?: string[];
}

interface SidebarProps {
  activeTab: ActivityTab;
  files: FileNode[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onCreateFile: (parentPath: string | null) => void;
  onCreateFolder: (parentPath: string | null) => void;
  onRenameNode: (nodeId: string, currentName: string) => void;
  onDeleteNode: (nodeId: string, name: string) => void;
  onNavigateToProblem: (file: string, line: number) => void;
  onNavigateToSearchResult?: (filePath: string, line: number, col: number, matchLength: number) => void;
  onReplaceFiles?: (updatedFiles: { file: FileNode; newContent: string; count: number }[]) => void;
  searchFocusTrigger?: number;
  onApplyAiDiff?: (filePath: string, newContent: string) => void;
  onApplyFileOperations?: (operations: FileOperation[]) => void;
  onLoadTemplate?: (templateId: string) => void;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
  settings: {
    fontSize: number;
    minimap: boolean;
    wordWrap: 'on' | 'off';
    tabSize: number;
    autoSave: boolean;
  };
  onUpdateSettings: (newSettings: any) => void;
  debuggerState: DebuggerState;
  onFilesChanged?: (files: FileNode[]) => void;
  workspaceName?: string;
  onOpenDirectoryFromDisk?: () => void;
}

export function Sidebar({
  activeTab,
  files,
  activeFileId,
  onSelectFile,
  onToggleFolder,
  onCreateFile,
  onCreateFolder,
  onRenameNode,
  onDeleteNode,
  onNavigateToProblem,
  onNavigateToSearchResult,
  onReplaceFiles,
  searchFocusTrigger,
  onApplyAiDiff,
  onApplyFileOperations,
  onLoadTemplate,
  theme,
  onThemeChange,
  settings,
  onUpdateSettings,
  debuggerState,
  onFilesChanged,
  workspaceName,
  onOpenDirectoryFromDisk
}: SidebarProps) {
  // Git state
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitted, setIsCommitted] = useState(false);
  
  // Extensions state
  const [installedExts, setInstalledExts] = useState<string[]>([
    'TypeScript & JavaScript Language Features',
    'Prettier - Code Formatter',
    'Tailwind CSS IntelliSense'
  ]);

  // AI Assistant state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([
    {
      role: 'assistant',
      text: 'Nexus AI: server-powered assistant with an always-on offline fallback. Ask it to create a file, website, to-do app, or game, or to fix, explain and refactor your code.'
    }
  ]);

  // Recursive Tree Node Renderer
  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => {
      const isSelected = node.id === activeFileId;
      const icon = getFileIconColor(node.name);

      if (node.type === 'folder') {
        return (
          <div key={node.id} className="select-none">
            <div
              onClick={() => onToggleFolder(node.id)}
              className="group flex items-center justify-between py-1 px-2 hover:bg-zinc-800/60 rounded cursor-pointer text-xs text-zinc-300 transition-colors"
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
            >
              <div className="flex items-center gap-1.5 truncate">
                {node.isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                )}
                {node.isOpen ? (
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span className="font-medium truncate">{node.name}</span>
              </div>

              <div className="hidden group-hover:flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateFile(node.path);
                  }}
                  title="New File in Folder"
                  className="p-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRenameNode(node.id, node.name);
                  }}
                  title="Rename Folder"
                  className="p-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNode(node.id, node.name);
                  }}
                  title="Delete Folder"
                  className="p-0.5 hover:bg-rose-900/60 rounded text-rose-400 hover:text-rose-200"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {node.isOpen && node.children && (
              <div>{renderTree(node.children, depth + 1)}</div>
            )}
          </div>
        );
      }

      // File Node
      return (
        <div
          key={node.id}
          onClick={() => onSelectFile(node.id)}
          className={`group flex items-center justify-between py-1 px-2 rounded cursor-pointer text-xs transition-colors select-none ${
            isSelected
              ? 'bg-blue-600/25 text-blue-200 font-medium'
              : 'hover:bg-zinc-800/60 text-zinc-300'
          }`}
          style={{ paddingLeft: `${depth * 14 + 20}px` }}
        >
          <div className="flex items-center gap-2 truncate">
            <span className="font-mono text-[10px] font-bold" style={{ color: icon.color }}>
              {icon.label}
            </span>
            <span className="truncate">{node.name}</span>
          </div>

          <div className="flex items-center gap-1">
            {node.isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" title="Unsaved changes" />
            )}
            <div className="hidden group-hover:flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRenameNode(node.id, node.name);
                }}
                title="Rename File"
                className="p-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNode(node.id, node.name);
                }}
                title="Delete File"
                className="p-0.5 hover:bg-rose-900/60 rounded text-rose-400 hover:text-rose-200"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      );
    });
  };

  // AI Prompt Dispatcher
  const handleAiSend = async (customPrompt?: string) => {
    const promptToSend = customPrompt || aiPrompt;
    if (!promptToSend.trim() || isAiThinking) return;

    const userMessage: AiChatMessage = { role: 'user', text: promptToSend };
    setAiMessages((prev) => [...prev, userMessage]);
    setAiPrompt('');
    setIsAiThinking(true);

    try {
      const activeFile = activeFileId ? findNodeById(files, activeFileId) : null;
      const result = await askNexus({
        message: promptToSend,
        history: aiMessages.map((m) => ({ role: m.role, text: m.text })),
        files,
        activeFile,
        problems: []
      });
      const authNotice = result.authNotice
        ? { isAuthBlocked: false, title: result.route.label, message: result.authNotice.message || '' }
        : undefined;
      setAiMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: result.text,
          diff: result.codeBlock ? { file: result.codeBlock.filename || 'new-file.txt', code: result.codeBlock.code } : undefined,
          sources: result.sources,
          images: result.images,
          fileOps: result.fileOps,
          authNotice,
          suggestedActions: result.suggestedActions || ['Create a website', 'Create a to-do app', 'Create a game']
        }
      ]);
    } catch (err: any) {
      console.error('AI assistant failed:', err);
      setAiMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `The assistant could not complete that request: ${err instanceof Error ? err.message : 'unknown error'}. Your files have not been changed.`
        }
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  return (
    <div className="w-64 sm:w-72 bg-[#18181b] border-r border-[#27272a] flex flex-col h-full overflow-hidden select-none">
      {/* If Explorer tab, render full-featured Explorer */}
      {activeTab === 'explorer' ? (
        <Explorer
          files={files}
          activeFileId={activeFileId}
          onSelectFile={onSelectFile}
          onFilesChanged={(newFiles) => {
            if (onFilesChanged) onFilesChanged(newFiles);
          }}
          workspaceName={workspaceName || 'PROJECT'}
          onOpenDirectoryFromDisk={onOpenDirectoryFromDisk}
        />
      ) : activeTab === 'search' ? (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#27272a] text-xs font-semibold uppercase tracking-wider text-zinc-400 shrink-0">
            <span>Search</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <SearchView
              files={files}
              onNavigateToResult={(filePath, line, col, matchLength) => {
                if (onNavigateToSearchResult) {
                  onNavigateToSearchResult(filePath, line, col, matchLength);
                } else {
                  onNavigateToProblem(filePath, line);
                }
              }}
              onReplaceFiles={(updatedFiles) => {
                if (onReplaceFiles) onReplaceFiles(updatedFiles);
              }}
              focusTrigger={searchFocusTrigger}
              theme={theme}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Sidebar Header Title for Other Tabs */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#27272a] text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <span>{activeTab}</span>
          </div>

          {/* Sidebar Content Body for Other Tabs */}
          <div className="flex-1 overflow-y-auto p-2 text-xs">
        {/* GIT / SOURCE CONTROL TAB */}
        {activeTab === 'git' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-zinc-400 text-[11px]">
              <div className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold text-zinc-200">main</span>
              </div>
              <span className="bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded text-[10px]">
                Up to date
              </span>
            </div>

            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="Commit message (Enter to commit)..."
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-full bg-[#121214] border border-[#27272a] rounded px-2 py-1 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-blue-500"
              />
              <button
                onClick={() => {
                  if (!commitMessage.trim()) return;
                  setIsCommitted(true);
                  setTimeout(() => setIsCommitted(false), 2500);
                  setCommitMessage('');
                }}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium flex items-center justify-center gap-1.5 transition"
              >
                {isCommitted ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Committed!</span>
                  </>
                ) : (
                  <span>Commit to 'main'</span>
                )}
              </button>
            </div>

            <div className="pt-2">
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-1">
                Workspace Changes (2)
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between p-1 hover:bg-zinc-800 rounded">
                  <span className="text-zinc-300">src/app.ts</span>
                  <span className="text-amber-400 font-mono font-bold text-[10px]">M</span>
                </div>
                <div className="flex items-center justify-between p-1 hover:bg-zinc-800 rounded">
                  <span className="text-zinc-300">src/style.css</span>
                  <span className="text-amber-400 font-mono font-bold text-[10px]">M</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RUN & DEBUG TAB */}
        {activeTab === 'debug' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-[11px] text-zinc-500 uppercase font-bold">Configuration</div>
              <select className="w-full bg-[#121214] border border-[#27272a] rounded px-2 py-1 text-xs text-zinc-200">
                <option>Launch Web Preview (Vite :3000)</option>
                <option>Node.js Current File</option>
                <option>Python Interactive Debugger</option>
              </select>

              <div className="flex items-center justify-center gap-2 bg-[#121214] p-1.5 rounded border border-[#27272a]">
                <button title="Start / Continue" className="p-1 hover:bg-zinc-800 rounded text-emerald-400">
                  <Play className="w-3.5 h-3.5" />
                </button>
                <button title="Step Over" className="p-1 hover:bg-zinc-800 rounded text-blue-400">
                  <StepForward className="w-3.5 h-3.5" />
                </button>
                <button title="Restart" className="p-1 hover:bg-zinc-800 rounded text-amber-400">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button title="Stop" className="p-1 hover:bg-zinc-800 rounded text-rose-400">
                  <Square className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <div className="text-[11px] text-zinc-500 uppercase font-bold mb-1">Breakpoints (2)</div>
              <div className="space-y-1 font-mono text-[11px]">
                {debuggerState.breakpoints.map((bp) => (
                  <div key={bp.id} className="flex items-center gap-2 p-1 hover:bg-zinc-800 rounded">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                    <span className="text-zinc-300">{bp.file}:{bp.line}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-zinc-500 uppercase font-bold mb-1">Variables</div>
              <div className="bg-[#121214] rounded p-2 border border-[#27272a] space-y-1 font-mono text-[11px]">
                {debuggerState.variables.map((v, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-blue-300">{v.name}:</span>
                    <span className="text-amber-300">{v.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EXTENSIONS MARKETPLACE TAB */}
        {activeTab === 'extensions' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Search Extensions..."
              className="w-full bg-[#121214] border border-[#27272a] rounded px-2.5 py-1 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-blue-500"
            />

            <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
              Popular Tooling
            </div>

            <div className="space-y-2">
              {[
                { name: 'Python', author: 'Microsoft', desc: 'Linting, Debugging (multi-root), Intellisense' },
                { name: 'Prettier - Code Formatter', author: 'Prettier', desc: 'Code formatter using prettier' },
                { name: 'Tailwind CSS IntelliSense', author: 'Tailwind Labs', desc: 'Intelligent Tailwind CSS tooling' },
                { name: 'Rust Analyzer', author: 'rust-lang', desc: 'Rust language support for IDE' },
                { name: 'GitLens — Git supercharged', author: 'GitKraken', desc: 'Supercharge Git inside DevForge' }
              ].map((ext) => {
                const isInstalled = installedExts.includes(ext.name);
                return (
                  <div key={ext.name} className="p-2 bg-[#121214] border border-[#27272a] rounded space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200">{ext.name}</span>
                      <button
                        onClick={() => {
                          setInstalledExts((prev) =>
                            isInstalled ? prev.filter((n) => n !== ext.name) : [...prev, ext.name]
                          );
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                          isInstalled
                            ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                      >
                        {isInstalled ? 'Installed' : 'Install'}
                      </button>
                    </div>
                    <div className="text-[10px] text-zinc-500">by {ext.author}</div>
                    <div className="text-[11px] text-zinc-400">{ext.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PROJECTS TAB */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-2">
                Recent Projects
              </div>
              <div className="space-y-2">
                {RECENT_PROJECTS.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-2 bg-[#121214] border border-[#27272a] rounded hover:border-blue-500/50 cursor-pointer transition"
                  >
                    <div className="font-semibold text-zinc-200">{proj.name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">{proj.path}</div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-400">
                      <span>{proj.lastOpened}</span>
                      <span className="text-blue-400 font-mono">{proj.branch}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-2">
                Start From Template
              </div>
              <div className="space-y-2">
                {PROJECT_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => onLoadTemplate && onLoadTemplate(tmpl.id)}
                    className="p-2 bg-[#121214] border border-[#27272a] hover:border-emerald-500/50 rounded cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{tmpl.icon}</span>
                      <span className="font-semibold text-zinc-200 group-hover:text-emerald-300">
                        {tmpl.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">{tmpl.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PREVIEW TAB */}
        {activeTab === 'preview' && (
          <div className="space-y-3 text-center p-2">
            <Eye className="w-8 h-8 text-blue-400 mx-auto" />
            <div className="font-semibold text-zinc-200">Live Web Preview</div>
            <p className="text-[11px] text-zinc-400">
              The live interactive preview compiles your HTML, CSS, and TypeScript automatically.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  const event = new CustomEvent('devforge_open_preview');
                  window.dispatchEvent(event);
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
              >
                Launch Preview Window
              </button>
            </div>
          </div>
        )}

        {/* AI ASSISTANT TAB */}
        {activeTab === 'ai' && (
          <div className="flex flex-col h-full space-y-3">
            <div className="flex items-center gap-1.5 p-2 bg-blue-950/30 border border-blue-800/30 rounded text-blue-300 text-[11px]">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Project Memory: React, TypeScript, Vite, 5 files</span>
            </div>

            {/* Quick Action Chips */}
            <div className="flex flex-wrap gap-1">
              {[
                'Fix Project Errors',
                'Make Design Modern',
                'Explain Current File',
                'Generate Tests'
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleAiSend(chip)}
                  className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full border border-zinc-700/60"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {aiMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg text-xs ${
                    msg.role === 'user'
                      ? 'bg-blue-600/25 border border-blue-500/40 text-blue-100 ml-4'
                      : 'bg-[#121214] border border-[#27272a] text-zinc-300 mr-1'
                  }`}
                >
                  {/* Auth notice banner */}
                  {msg.authNotice && (
                    <div className="mb-2 p-2 rounded bg-amber-950/40 border border-amber-800/40 text-amber-200 text-[10px] space-y-1">
                      <div className="font-semibold text-amber-300 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{msg.authNotice.title}</span>
                      </div>
                      <p className="text-amber-200/90 leading-normal">{msg.authNotice.message}</p>
                    </div>
                  )}

                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                  {/* Image results */}
                  {msg.images && msg.images.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {msg.images.slice(0, 4).map((image, imgIdx) => (
                        <a
                          key={`${idx}-img-${imgIdx}`}
                          href={image.source || image.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="block overflow-hidden rounded border border-zinc-800 bg-black/40"
                          title={image.title || 'Open image source'}
                        >
                          <img
                            src={image.url}
                            alt={image.title || 'Result image'}
                            loading="lazy"
                            className="h-20 w-full object-cover"
                            onError={(event) => { (event.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Source links */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 border-t border-zinc-800 pt-2 space-y-1">
                      {msg.sources.slice(0, 6).map((source, srcIdx) => (
                        <a
                          key={`${idx}-src-${srcIdx}`}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center gap-1 truncate text-[10px] text-sky-300 hover:text-sky-200"
                        >
                          <span className="text-zinc-500">[{srcIdx + 1}]</span>
                          <span className="truncate">{source.title}</span>
                          {source.domain && <span className="shrink-0 text-zinc-600">· {source.domain}</span>}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Proposed Diff Block */}
                  {msg.fileOps && msg.fileOps.length > 0 && (
                    <AiFileOpsReview
                      compact
                      operations={msg.fileOps}
                      onApply={(operations) => onApplyFileOperations?.(operations)}
                    />
                  )}

                  {msg.diff && !(msg.fileOps && msg.fileOps.length > 0) && (
                    <div className="mt-2.5 pt-2 border-t border-zinc-800 font-mono text-[11px]">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1.5">
                        <span className="font-medium text-zinc-300">Proposed: {msg.diff.file}</span>
                      </div>
                      <pre className="bg-black/60 p-2.5 rounded-md border border-zinc-800 text-emerald-400 overflow-x-auto text-[10px] max-h-48 leading-tight">
                        {msg.diff.code}
                      </pre>
                      {onApplyAiDiff && (
                        <button
                          onClick={() => onApplyAiDiff(msg.diff!.file, msg.diff!.code)}
                          className="mt-2 w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded font-medium text-[11px] transition shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Apply Changes to Editor
                        </button>
                      )}
                    </div>
                  )}

                  {/* Suggested Follow-up Actions */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex flex-wrap gap-1">
                      {msg.suggestedActions.map((act) => (
                        <button
                          key={act}
                          onClick={() => handleAiSend(act)}
                          className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-blue-300 hover:text-white rounded border border-zinc-700/50 transition cursor-pointer"
                        >
                          {act}
                        </button>
                      ))}
                    </div>
                  )}

                </div>
              ))}
              {isAiThinking && (
                <div className="flex items-center gap-2 p-2 bg-[#121214] rounded border border-zinc-800 text-zinc-400 text-xs">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  <span>Nexus AI thinking…</span>
                </div>
              )}
            </div>

            {/* AI Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAiSend();
              }}
              className="flex items-center gap-1.5 pt-2 border-t border-zinc-800"
            >
              <input
                type="text"
                placeholder="Ask Nexus AI..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-1 bg-[#121214] border border-[#27272a] rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!aiPrompt.trim()}
                className="p-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-2">
                Color Theme
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onThemeChange('dark')}
                  className={`p-2 rounded text-center border font-medium transition ${
                    theme === 'dark'
                      ? 'border-blue-500 bg-blue-950/40 text-blue-200'
                      : 'border-zinc-800 bg-[#121214] text-zinc-400'
                  }`}
                >
                  Dark (Default)
                </button>
                <button
                  onClick={() => onThemeChange('light')}
                  className={`p-2 rounded text-center border font-medium transition ${
                    theme === 'light'
                      ? 'border-blue-500 bg-blue-950/40 text-blue-200'
                      : 'border-zinc-800 bg-[#121214] text-zinc-400'
                  }`}
                >
                  Light Theme
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
                Editor Preferences
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Font Size ({settings.fontSize}px)</span>
                <input
                  type="range"
                  min="11"
                  max="18"
                  value={settings.fontSize}
                  onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
                  className="w-24 accent-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Minimap</span>
                <input
                  type="checkbox"
                  checked={settings.minimap}
                  onChange={(e) => onUpdateSettings({ minimap: e.target.checked })}
                  className="accent-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Word Wrap</span>
                <input
                  type="checkbox"
                  checked={settings.wordWrap === 'on'}
                  onChange={(e) => onUpdateSettings({ wordWrap: e.target.checked ? 'on' : 'off' })}
                  className="accent-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-300">Auto Save</span>
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => onUpdateSettings({ autoSave: e.target.checked })}
                  className="accent-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-2">
                Runtimes & Toolchain
              </div>
              <div className="space-y-1.5 font-mono text-[10px]">
                {DETECTED_RUNTIMES.map((rt) => (
                  <div key={rt.id} className="flex items-center justify-between p-1.5 bg-[#121214] rounded border border-zinc-800">
                    <span className="text-zinc-300">{rt.name}</span>
                    <span className={rt.status === 'installed' ? 'text-emerald-400' : 'text-zinc-500'}>
                      {rt.version}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )}
</div>
);
}
