import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Folder, 
  Search, 
  GitBranch, 
  Play, 
  Package, 
  Layers, 
  Eye, 
  Sparkles, 
  Settings as SettingsIcon,
  Command,
  Sun,
  Moon,
  SplitSquareVertical,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Terminal as TerminalIcon,
  ChevronDown,
  Layout,
  Code2,
  RefreshCw,
  FolderPlus,
  FilePlus,
  Bell,
  Check,
  Globe,
  Boxes,
  ScanEye
} from 'lucide-react';

import { 
  FileNode, 
  renameNode, 
  deleteNode, 
  toggleFolderOpen, 
  updateFileContent, 
  markFileSaved, 
  findNodeById,
  findNodeByPath,
  flattenFiles
} from '../core/filesystem';
import { 
  ActivityTab, 
  BottomPanelTab, 
  EditorSplit, 
  WorkspaceState, 
  DEFAULT_PROBLEMS 
} from '../core/workspace';
import { terminalService } from '../core/terminal';
import { INITIAL_DEBUG_STATE, DebuggerState } from '../core/debugger';
import { InspectedElement, previewService } from '../core/preview';
import { PROJECT_TEMPLATES } from '../services/projectService';
import { saveWorkspace } from '../services/storageService';
import { filesystemService } from '../services/filesystemService';
import { FileOperation } from '../services/nexusChat';
import { loadEditorSettings, saveEditorSettings, EditorSettings } from '../core/editorSettings';
import { getLanguageForFile } from '../core/language';

import { Sidebar } from './Sidebar';
import { Editor, EditorApi } from './Editor';
import { Panel } from './Panel';
import { PreviewPanel } from './PreviewPanel';
import { CopilotPanel } from './CopilotPanel';
import { SearchPanel } from '../features/search/SearchPanel';
import { ThreeDStudio } from '../features/three-d/ThreeDStudio';
import { LiveAppVisionPanel } from '../features/live-app-vision/LiveAppVisionPanel';
import { PromptModal, ElementInspectorModal } from './dialogs';
import { CommandPalette } from './CommandPalette';
import { QuickOpen } from './QuickOpen';
import { ElementSelector, SelectedElement } from './ElementSelector';
import { ElementEditor } from './ElementEditor';
import { commandRegistry, CommandItem } from '../core/commands';

interface WorkbenchProps {
  initialState: WorkspaceState;
  onExitToLanding: () => void;
}

export function Workbench({ initialState, onExitToLanding }: WorkbenchProps) {
  // Main state
  const [workspace, setWorkspace] = useState<WorkspaceState>(initialState);
  const [debuggerState, setDebuggerState] = useState<DebuggerState>(INITIAL_DEBUG_STATE);
  
  // Modals & Popups
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const [searchFocusTrigger, setSearchFocusTrigger] = useState(0);
  const editorApiRef = useRef<EditorApi | null>(null);

  // Recent files tracking
  const [recentFileIds, setRecentFileIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('devforge_recent_files');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const markFileRecent = (fileId: string) => {
    setRecentFileIds((prev) => {
      const updated = [fileId, ...prev.filter((id) => id !== fileId)].slice(0, 30);
      try {
        localStorage.setItem('devforge_recent_files', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    title: string;
    placeholder: string;
    initialValue?: string;
    onConfirm: (val: string) => void;
  }>({
    isOpen: false,
    title: '',
    placeholder: '',
    onConfirm: () => {}
  });

  const [inspectedElement, setInspectedElement] = useState<InspectedElement | null>(null);
  const [aiSelectedElement, setAiSelectedElement] = useState<InspectedElement | null>(null);
  const [aiDraftPrompt, setAiDraftPrompt] = useState<string | null>(null);
  const [isPanelMaximized, setIsPanelMaximized] = useState(false);

  // Element selector state
  const [isElementSelectorActive, setIsElementSelectorActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [isElementEditorOpen, setIsElementEditorOpen] = useState(false);

  // Bottom panel height state with local persistence
  const [panelHeight, setPanelHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('devforge_panel_height');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 120 && parsed <= 900) {
          return parsed;
        }
      }
    } catch {}
    return 240;
  });

  const handleResizePanelHeight = (newHeight: number) => {
    setPanelHeight(newHeight);
    try {
      localStorage.setItem('devforge_panel_height', String(newHeight));
    } catch {}
  };

  const [editorTargetLocation, setEditorTargetLocation] = useState<{
    line: number;
    col: number;
    matchLength?: number;
    timestamp: number;
  } | null>(null);

  const handleNavigateToProblem = (file: string, line: number, column?: number) => {
    let target = findNodeByPath(workspace.files, file);
    if (!target) {
      const all = flattenFiles(workspace.files);
      target = all.find((f) => f.path.endsWith(file) || f.name === file) || null;
    }
    if (target) {
      handleSelectFile(target.id);
      setEditorTargetLocation({ line, col: column || 1, timestamp: Date.now() });
    }
  };

  const handleNavigateToSearchResult = (
    filePath: string,
    line: number,
    col: number,
    matchLength: number
  ) => {
    let target = findNodeByPath(workspace.files, filePath);
    if (!target) {
      const all = flattenFiles(workspace.files);
      target = all.find((f) => f.path === filePath || f.name === filePath || f.path.endsWith(filePath)) || null;
    }
    if (target) {
      handleSelectFile(target.id);
      setEditorTargetLocation({
        line,
        col: Math.max(1, col),
        matchLength,
        timestamp: Date.now()
      });
    }
  };

  const handleReplaceFiles = (
    updatedFiles: { file: FileNode; newContent: string; count: number }[]
  ) => {
    setWorkspace((prev) => {
      let curFiles = prev.files;
      for (const item of updatedFiles) {
        curFiles = updateFileContent(curFiles, item.file.id, item.newContent);
      }
      return {
        ...prev,
        files: curFiles
      };
    });

    const totalReplacements = updatedFiles.reduce((sum, u) => sum + u.count, 0);
    setSaveStatusMessage(`Replaced ${totalReplacements} occurrence${totalReplacements === 1 ? '' : 's'} across ${updatedFiles.length} file${updatedFiles.length === 1 ? '' : 's'}`);
    setTimeout(() => setSaveStatusMessage(null), 4000);
  };

  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [previewLayout, setPreviewLayout] = useState<'right' | 'down'>(() => {
    return (localStorage.getItem('devforge_preview_layout') as 'right' | 'down') || 'right';
  });
  const [previewSplitRatio, setPreviewSplitRatio] = useState<number>(() => {
    const saved = localStorage.getItem('devforge_preview_ratio');
    return saved ? Math.max(20, Math.min(80, parseFloat(saved))) : 50;
  });
  const [isPreviewMaximized, setIsPreviewMaximized] = useState<boolean>(false);
  const [mobilePreviewTab, setMobilePreviewTab] = useState<'code' | 'preview'>('code');
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const [isCopilotOpen, setIsCopilotOpen] = useState(true);
  const [isWebSearchOpen, setIsWebSearchOpen] = useState(false);
  const [isThreeDOpen, setIsThreeDOpen] = useState(false);
  const [isVisionOpen, setIsVisionOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Settings with persistence
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => loadEditorSettings());
  const [selectionCount, setSelectionCount] = useState<number>(0);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);

  // Global keyboard shortcuts (Ctrl+Shift+P, Ctrl+P, Ctrl+Shift+F, Ctrl+S, Ctrl+Shift+S, Ctrl+W, Ctrl+B, Ctrl+J, Ctrl+`, Ctrl+Shift+V)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        setIsQuickOpen(false);
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setIsQuickOpen((prev) => !prev);
        setIsCommandPaletteOpen(false);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setWorkspace((prev) => ({ ...prev, activeSidebar: 'search', isSidebarVisible: true }));
        setSearchFocusTrigger((c) => c + 1);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        setWorkspace((prev) => ({ ...prev, activeSidebar: 'search', isSidebarVisible: true }));
        setSearchFocusTrigger((c) => c + 1);
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        if (!isInput) {
          e.preventDefault();
          editorApiRef.current?.triggerFind();
        }
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'h' || e.key === 'H')) {
        if (!isInput) {
          e.preventDefault();
          editorApiRef.current?.triggerReplace();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        setIsPreviewOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSaveAll();
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (workspace.activeFileId) {
          handleSaveFile(workspace.activeFileId);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        if (workspace.activeFileId) {
          handleCloseTab(workspace.activeFileId);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setWorkspace((prev) => ({ ...prev, isSidebarVisible: !prev.isSidebarVisible }));
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '`' || e.key === '~' || e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        setWorkspace((prev) => ({ ...prev, isBottomPanelVisible: !prev.isBottomPanelVisible }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [workspace.activeFileId, workspace.files]);

  // Close menus when clicking outside
  useEffect(() => {
    const close = () => setOpenMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  // Listen for custom event to open preview
  useEffect(() => {
    const handleOpenPreview = () => setIsPreviewOpen(true);
    window.addEventListener('devforge_open_preview', handleOpenPreview);
    return () => window.removeEventListener('devforge_open_preview', handleOpenPreview);
  }, []);

  // Sync theme to root element
  useEffect(() => {
    if (workspace.theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.body.classList.remove('bg-[#181818]', 'text-[#cccccc]');
      document.body.classList.add('bg-[#ffffff]', 'text-[#1e1e1e]');
    } else {
      document.documentElement.classList.remove('theme-light');
      document.body.classList.add('bg-[#181818]', 'text-[#cccccc]');
      document.body.classList.remove('bg-[#ffffff]', 'text-[#1e1e1e]');
    }
  }, [workspace.theme]);

  // Save changes to localStorage
  useEffect(() => {
    filesystemService.setFiles(workspace.files);
    saveWorkspace({
      files: workspace.files,
      activeFileId: workspace.activeFileId,
      openTabIds: workspace.openTabIds,
      theme: workspace.theme,
      editorSplit: workspace.editorSplit,
      activeSidebar: workspace.activeSidebar
    });
  }, [workspace.files, workspace.activeFileId, workspace.openTabIds, workspace.theme, workspace.editorSplit, workspace.activeSidebar]);

  // Active File & Tabs calculations
  const activeFile = workspace.activeFileId
    ? findNodeById(workspace.files, workspace.activeFileId)
    : null;

  const secondaryFile = workspace.secondaryFileId
    ? findNodeById(workspace.files, workspace.secondaryFileId)
    : null;

  const openTabs = workspace.openTabIds
    .map((id) => findNodeById(workspace.files, id))
    .filter((n): n is FileNode => n !== null);

  // File Operations
  const handleSelectFile = (fileId: string) => {
    markFileRecent(fileId);
    setWorkspace((prev) => {
      const alreadyOpen = prev.openTabIds.includes(fileId);
      const newTabs = alreadyOpen ? prev.openTabIds : [...prev.openTabIds, fileId];
      return {
        ...prev,
        activeFileId: fileId,
        openTabIds: newTabs
      };
    });
  };

  const handleCloseTab = (fileId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWorkspace((prev) => {
      const idx = prev.openTabIds.indexOf(fileId);
      const remaining = prev.openTabIds.filter((id) => id !== fileId);
      let nextActive = prev.activeFileId;
      if (prev.activeFileId === fileId) {
        if (remaining.length > 0) {
          const nextIndex = Math.min(idx, remaining.length - 1);
          nextActive = remaining[nextIndex];
        } else {
          nextActive = null;
        }
      }
      return {
        ...prev,
        openTabIds: remaining,
        activeFileId: nextActive
      };
    });
  };

  const handleCloseOtherTabs = (fileId: string) => {
    setWorkspace((prev) => ({
      ...prev,
      openTabIds: [fileId],
      activeFileId: fileId
    }));
  };

  const handleCloseTabsToRight = (fileId: string) => {
    setWorkspace((prev) => {
      const idx = prev.openTabIds.indexOf(fileId);
      if (idx === -1) return prev;
      const remaining = prev.openTabIds.slice(0, idx + 1);
      return {
        ...prev,
        openTabIds: remaining,
        activeFileId: remaining.includes(prev.activeFileId || '') ? prev.activeFileId : fileId
      };
    });
  };

  const handleCloseAllTabs = () => {
    setWorkspace((prev) => ({
      ...prev,
      openTabIds: [],
      activeFileId: null
    }));
  };

  const handleContentChange = (fileId: string, newContent: string) => {
    setWorkspace((prev) => ({
      ...prev,
      files: updateFileContent(prev.files, fileId, newContent)
    }));
  };

  const handleSaveFile = async (fileId: string) => {
    const target = findNodeById(workspace.files, fileId);
    if (!target) return;
    try {
      const res = await filesystemService.writeFile(target.path, target.content || '');
      if (res.success) {
        setWorkspace((prev) => {
          const updated = markFileSaved(prev.files, fileId);
          previewService.notifyFileChanged(target, updated);
          return {
            ...prev,
            files: updated
          };
        });
        setSaveStatusMessage(`Saved ${target.name}`);
        setTimeout(() => setSaveStatusMessage(null), 2500);
      } else {
        setSaveStatusMessage(`Error saving: ${res.error}`);
      }
    } catch (err: any) {
      setSaveStatusMessage(`Save error: ${err.message}`);
    }
  };

  const handleSaveAll = async () => {
    const flat = flattenFiles(workspace.files);
    const dirtyFiles = flat.filter((f) => f.isDirty);
    if (dirtyFiles.length === 0) {
      setSaveStatusMessage('All files saved');
      setTimeout(() => setSaveStatusMessage(null), 2000);
      return;
    }
    for (const f of dirtyFiles) {
      await filesystemService.writeFile(f.path, f.content || '');
    }
    setWorkspace((prev) => {
      let updated = prev.files;
      for (const f of dirtyFiles) {
        updated = markFileSaved(updated, f.id);
      }
      if (dirtyFiles[0]) {
        previewService.notifyFileChanged(dirtyFiles[0], updated);
      }
      return { ...prev, files: updated };
    });
    setSaveStatusMessage(`Saved ${dirtyFiles.length} file${dirtyFiles.length > 1 ? 's' : ''}`);
    setTimeout(() => setSaveStatusMessage(null), 2500);
  };

  const handleSaveAsPrompt = (fileId: string) => {
    const target = findNodeById(workspace.files, fileId);
    if (!target) return;
    setPromptModal({
      isOpen: true,
      title: `Save As: '${target.name}'`,
      placeholder: 'Path, e.g. src/components/NewComponent.tsx',
      initialValue: target.path,
      onConfirm: async (newPath) => {
        const cleanPath = newPath.trim();
        if (!cleanPath) return;
        const res = await filesystemService.createFile(cleanPath, target.content || '');
        if (res.success) {
          const updatedFiles = filesystemService.getFiles();
          const flat = flattenFiles(updatedFiles);
          const created = flat.find((f) => f.path === cleanPath);
          setWorkspace((prev) => ({
            ...prev,
            files: updatedFiles,
            activeFileId: created ? created.id : prev.activeFileId,
            openTabIds: created && !prev.openTabIds.includes(created.id)
              ? [...prev.openTabIds, created.id]
              : prev.openTabIds
          }));
          setSaveStatusMessage(`Saved as ${cleanPath}`);
          setTimeout(() => setSaveStatusMessage(null), 2500);
        } else {
          setSaveStatusMessage(`Error: ${res.error}`);
        }
        setPromptModal((p) => ({ ...p, isOpen: false }));
      }
    });
  };

  const handleUpdateEditorSettings = (newS: Partial<EditorSettings>) => {
    setEditorSettings((prev) => {
      const updated = saveEditorSettings({ ...prev, ...newS });
      return updated;
    });
  };

  const handleToggleFolder = (folderId: string) => {
    setWorkspace((prev) => ({
      ...prev,
      files: toggleFolderOpen(prev.files, folderId)
    }));
  };

  const handleCreateFilePrompt = (parentPath: string | null) => {
    setPromptModal({
      isOpen: true,
      title: parentPath ? `New File in '${parentPath}'` : 'New File in Root',
      placeholder: 'e.g. Counter.tsx, utils.ts, styles.css',
      onConfirm: async (name) => {
        const res = await filesystemService.createFile(parentPath ? `${parentPath}/${name.trim()}` : name.trim());
        if (!res.success) {
          setSaveStatusMessage(`Could not create file: ${res.error || 'unknown error'}`);
          return;
        }
        const updatedFiles = filesystemService.getFiles();
        const created = findNodeByPath(updatedFiles, parentPath ? `${parentPath}/${name.trim()}` : name.trim());
        setWorkspace((prev) => ({
          ...prev,
          files: updatedFiles,
          activeFileId: created ? created.id : prev.activeFileId,
          openTabIds: created && !prev.openTabIds.includes(created.id) ? [...prev.openTabIds, created.id] : prev.openTabIds
        }));
        setPromptModal((p) => ({ ...p, isOpen: false }));
      }
    });
  };

  const handleCreateFolderPrompt = (parentPath: string | null) => {
    setPromptModal({
      isOpen: true,
      title: parentPath ? `New Folder in '${parentPath}'` : 'New Folder in Root',
      placeholder: 'e.g. components, hooks, api',
      onConfirm: (name) => {
        const res = filesystemService.create(parentPath, name, 'folder');
        if (!res.success) {
          setSaveStatusMessage(`Could not create folder: ${res.error || 'unknown error'}`);
          return;
        }
        setWorkspace((prev) => ({ ...prev, files: filesystemService.getFiles() }));
        setPromptModal((p) => ({ ...p, isOpen: false }));
      }
    });
  };

  const handleRenamePrompt = (nodeId: string, currentName: string) => {
    setPromptModal({
      isOpen: true,
      title: `Rename '${currentName}'`,
      placeholder: 'New name',
      initialValue: currentName,
      onConfirm: (newName) => {
        setWorkspace((prev) => ({
          ...prev,
          files: renameNode(prev.files, nodeId, newName)
        }));
        setPromptModal((p) => ({ ...p, isOpen: false }));
      }
    });
  };

  const handleDeletePrompt = (nodeId: string, name: string) => {
    setWorkspace((prev) => {
      const deletedNode = findNodeById(prev.files, nodeId);
      const deletedPaths = new Set(
        deletedNode
          ? flattenFiles(prev.files)
              .filter((file) => file.path === deletedNode.path || file.path.startsWith(`${deletedNode.path}/`))
              .map((file) => file.id)
          : [nodeId]
      );
      const updated = deleteNode(prev.files, nodeId);
      filesystemService.setFiles(updated);
      return {
        ...prev,
        files: updated,
        openTabIds: prev.openTabIds.filter((id) => !deletedPaths.has(id)),
        activeFileId: prev.activeFileId && deletedPaths.has(prev.activeFileId) ? null : prev.activeFileId,
        secondaryFileId: prev.secondaryFileId && deletedPaths.has(prev.secondaryFileId) ? null : prev.secondaryFileId
      };
    });
  };

  const handleFilesChanged = (newFiles: FileNode[]) => {
    filesystemService.setFiles(newFiles);
    setWorkspace((prev) => {
      const flat = flattenFiles(newFiles);
      const remainingIds = new Set(flat.map((f) => f.id));
      const newOpenTabIds = prev.openTabIds.filter((id) => remainingIds.has(id));
      const newActiveFileId =
        prev.activeFileId && remainingIds.has(prev.activeFileId)
          ? prev.activeFileId
          : (newOpenTabIds[0] || (flat[0] ? flat[0].id : null));

      return {
        ...prev,
        files: newFiles,
        openTabIds: newOpenTabIds,
        activeFileId: newActiveFileId
      };
    });
  };

  const handleOpenDirectoryFromDisk = async () => {
    const res = await filesystemService.openDirectoryFromDisk();
    if (res.success) {
      const loadedFiles = filesystemService.getFiles();
      const flat = flattenFiles(loadedFiles);
      const firstFile = flat[0];
      setWorkspace((prev) => ({
        ...prev,
        name: res.rootName || prev.name,
        files: loadedFiles,
        activeFileId: firstFile ? firstFile.id : null,
        openTabIds: firstFile ? [firstFile.id] : []
      }));
      setSaveStatusMessage(`Opened ${res.rootName || 'folder'} locally`);
    } else if (res.error && !res.error.includes('cancelled')) {
      setSaveStatusMessage(res.error);
    }
  };

  const handleApplyAiDiff = async (filePath: string, newContent: string) => {
    const cleanPath = filePath.replace(/\\/g, '/').replace(/^\.\//, '').trim();
    if (!cleanPath || cleanPath.startsWith('/') || cleanPath.split('/').some((part) => part === '..')) {
      setSaveStatusMessage('The generated file path must stay inside this workspace.');
      return;
    }
    const flat = flattenFiles(workspace.files);
    const match = flat.find(
      (f) => f.path === cleanPath || f.name === cleanPath || f.path.endsWith(cleanPath)
    );

    if (match) {
      const updatedFiles = updateFileContent(workspace.files, match.id, newContent);
      filesystemService.setFiles(updatedFiles);
      setWorkspace((prev) => ({ ...prev, files: updateFileContent(prev.files, match.id, newContent) }));
      handleSelectFile(match.id);
    } else {
      const result = await filesystemService.createFile(cleanPath, newContent);
      if (!result.success) {
        setSaveStatusMessage(`Could not create ${cleanPath}: ${result.error || 'unknown error'}`);
        return;
      }
      const updatedFiles = filesystemService.getFiles();
      const createdFile = flattenFiles(updatedFiles).find((file) => file.path === cleanPath);
      setWorkspace((prev) => ({
        ...prev,
        files: updatedFiles,
        openTabIds: createdFile ? [...prev.openTabIds, createdFile.id] : prev.openTabIds,
        activeFileId: createdFile ? createdFile.id : prev.activeFileId
      }));
    }
  };

  const handleApplyFileOperations = async (operations: FileOperation[]) => {
    if (!operations.length) return;
    filesystemService.setFiles(workspace.files);

    let applied = 0;
    const errors: string[] = [];
    const isSafe = (value: string) => {
      const normalized = value.replace(/\\/g, '/').replace(/^\.\//, '').trim();
      return Boolean(normalized) && !normalized.startsWith('/') && !normalized.split('/').some((part) => part === '..');
    };

    for (const operation of operations) {
      if (!isSafe(operation.path) || (operation.op === 'rename' && !isSafe(operation.newPath))) {
        errors.push(`Skipped unsafe path: ${operation.path}`);
        continue;
      }

      if (operation.op === 'create' || operation.op === 'update') {
        const existing = filesystemService.findNodeByPath(operation.path);
        if (existing && existing.type === 'file') {
          const result = await filesystemService.writeFile(operation.path, operation.content);
          if (result.success) applied += 1;
          else errors.push(result.error || operation.path);
        } else {
          const result = await filesystemService.createFile(operation.path, operation.content);
          if (result.success) applied += 1;
          else errors.push(result.error || operation.path);
        }
      } else if (operation.op === 'delete') {
        const result = filesystemService.delete(operation.path);
        if (result.success) applied += 1;
        else errors.push(result.error || operation.path);
      } else if (operation.op === 'rename') {
        const node = filesystemService.findNodeByPath(operation.path);
        if (!node) {
          errors.push(`Not found: ${operation.path}`);
          continue;
        }
        const oldParent = operation.path.split('/').slice(0, -1).join('/');
        const newParent = operation.newPath.split('/').slice(0, -1).join('/');
        const newName = operation.newPath.split('/').pop() || operation.newPath;
        if (oldParent === newParent) {
          const result = filesystemService.rename(operation.path, newName);
          if (result.success) applied += 1;
          else errors.push(result.error || operation.path);
        } else {
          const result = await filesystemService.createFile(operation.newPath, node.content || '');
          if (result.success) {
            filesystemService.delete(operation.path);
            applied += 1;
          } else {
            errors.push(result.error || operation.newPath);
          }
        }
      }
    }

    const updatedFiles = filesystemService.getFiles();
    const flat = flattenFiles(updatedFiles);
    const remainingIds = new Set(flat.map((file) => file.id));
    setWorkspace((prev) => ({
      ...prev,
      files: updatedFiles,
      openTabIds: prev.openTabIds.filter((id) => remainingIds.has(id)),
      activeFileId: prev.activeFileId && remainingIds.has(prev.activeFileId) ? prev.activeFileId : (flat[0]?.id ?? null)
    }));

    setSaveStatusMessage(
      applied
        ? `Applied ${applied} AI file change${applied === 1 ? '' : 's'}${errors.length ? ` · ${errors.length} skipped` : ''}`
        : `No changes applied${errors.length ? `: ${errors.join('; ')}` : ''}`
    );
  };

  const handleLoadTemplate = (templateId: string) => {
    const tmpl = PROJECT_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;
    if (window.confirm(`Load template "${tmpl.name}"? This will mount the template files in your workspace.`)) {
      setWorkspace((prev) => ({
        ...prev,
        files: tmpl.files,
        openTabIds: tmpl.files.filter((f) => f.type === 'file').map((f) => f.id),
        activeFileId: tmpl.files[0]?.id || null
      }));
    }
  };

  const handleExecuteCommand = (cmd: string) => {
    const activeSess = terminalService.getActiveSession();
    terminalService.execute(activeSess.id, cmd, workspace.files, {
      onTriggerPreviewReload: () => setIsPreviewOpen(true)
    });
  };

  const handleClearTerminal = () => {
    const activeId = terminalService.getActiveSessionId();
    terminalService.clear(activeId);
  };

  const handlePreviewResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const container = splitContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const isHorizontal = previewLayout === 'right';

    const onMouseMove = (moveEvent: MouseEvent) => {
      let newRatio: number;
      if (isHorizontal) {
        newRatio = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      } else {
        newRatio = ((moveEvent.clientY - rect.top) / rect.height) * 100;
      }
      const clamped = Math.max(20, Math.min(80, newRatio));
      setPreviewSplitRatio(clamped);
      localStorage.setItem('devforge_preview_ratio', String(clamped));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Commands List for Command Palette & Quick Access
  const commands: CommandItem[] = useMemo(() => [
    // File
    {
      id: 'file.newFile',
      title: 'File: New File',
      category: 'File',
      shortcut: 'Ctrl+N',
      action: () => handleCreateFilePrompt(null)
    },
    {
      id: 'file.newFolder',
      title: 'File: New Folder',
      category: 'File',
      shortcut: 'Ctrl+Shift+N',
      action: () => handleCreateFolderPrompt(null)
    },
    {
      id: 'file.quickOpen',
      title: 'File: Quick Open File...',
      category: 'File',
      shortcut: 'Ctrl+P',
      action: () => setIsQuickOpen(true)
    },
    {
      id: 'file.save',
      title: 'File: Save Active File',
      category: 'File',
      shortcut: 'Ctrl+S',
      action: () => activeFile && handleSaveFile(activeFile.id)
    },
    {
      id: 'file.saveAll',
      title: 'File: Save All Files',
      category: 'File',
      shortcut: 'Ctrl+Shift+S',
      action: handleSaveAll
    },
    {
      id: 'file.closeEditor',
      title: 'File: Close Active Tab',
      category: 'File',
      shortcut: 'Ctrl+W',
      action: () => activeFile && handleCloseTab(activeFile.id)
    },
    {
      id: 'file.closeAll',
      title: 'File: Close All Tabs',
      category: 'File',
      action: handleCloseAllTabs
    },
    {
      id: 'file.closeOthers',
      title: 'File: Close Other Tabs',
      category: 'File',
      action: () => activeFile && handleCloseOtherTabs(activeFile.id)
    },

    // Edit
    {
      id: 'edit.undo',
      title: 'Edit: Undo',
      category: 'Edit',
      shortcut: 'Ctrl+Z',
      action: () => editorApiRef.current?.triggerUndo()
    },
    {
      id: 'edit.redo',
      title: 'Edit: Redo',
      category: 'Edit',
      shortcut: 'Ctrl+Shift+Z',
      action: () => editorApiRef.current?.triggerRedo()
    },
    {
      id: 'edit.findInFile',
      title: 'Edit: Find in Current File',
      category: 'Edit',
      shortcut: 'Ctrl+F',
      action: () => editorApiRef.current?.triggerFind()
    },
    {
      id: 'edit.replaceInFile',
      title: 'Edit: Replace in Current File',
      category: 'Edit',
      shortcut: 'Ctrl+H',
      action: () => editorApiRef.current?.triggerReplace()
    },
    {
      id: 'edit.formatDocument',
      title: 'Edit: Format Document',
      category: 'Edit',
      shortcut: 'Shift+Alt+F',
      action: () => editorApiRef.current?.triggerFormat()
    },

    // Search & View
    {
      id: 'search.workspace',
      title: 'Search: Find in Entire Workspace',
      category: 'View',
      shortcut: 'Ctrl+Shift+F',
      action: () => {
        setWorkspace((p) => ({ ...p, activeSidebar: 'search', isSidebarVisible: true }));
        setSearchFocusTrigger((c) => c + 1);
      }
    },
    {
      id: 'view.commandPalette',
      title: 'View: Command Palette...',
      category: 'View',
      shortcut: 'Ctrl+Shift+P',
      action: () => setIsCommandPaletteOpen(true)
    },
    {
      id: 'view.quickOpen',
      title: 'View: Go to File...',
      category: 'View',
      shortcut: 'Ctrl+P',
      action: () => setIsQuickOpen(true)
    },
    {
      id: 'view.toggleSidebar',
      title: 'View: Toggle Primary Sidebar',
      category: 'View',
      shortcut: 'Ctrl+B',
      action: () => setWorkspace((p) => ({ ...p, isSidebarVisible: !p.isSidebarVisible }))
    },
    {
      id: 'view.togglePanel',
      title: 'View: Toggle Terminal / Bottom Panel',
      category: 'View',
      shortcut: 'Ctrl+J',
      action: () => setWorkspace((p) => ({ ...p, isBottomPanelVisible: !p.isBottomPanelVisible }))
    },
    {
      id: 'view.explorer',
      title: 'View: Show Explorer',
      category: 'View',
      shortcut: 'Ctrl+Shift+E',
      action: () => setWorkspace((p) => ({ ...p, activeSidebar: 'explorer', isSidebarVisible: true }))
    },
    {
      id: 'view.sourceControl',
      title: 'View: Show Source Control',
      category: 'View',
      shortcut: 'Ctrl+Shift+G',
      action: () => setWorkspace((p) => ({ ...p, activeSidebar: 'git', isSidebarVisible: true }))
    },
    {
      id: 'view.debug',
      title: 'View: Show Run & Debug',
      category: 'View',
      shortcut: 'Ctrl+Shift+D',
      action: () => setWorkspace((p) => ({ ...p, activeSidebar: 'debug', isSidebarVisible: true }))
    },
    {
      id: 'view.extensions',
      title: 'View: Show Extensions',
      category: 'View',
      shortcut: 'Ctrl+Shift+X',
      action: () => setWorkspace((p) => ({ ...p, activeSidebar: 'extensions', isSidebarVisible: true }))
    },
    {
      id: 'view.splitEditor',
      title: 'View: Toggle Split Editor Right',
      category: 'View',
      shortcut: 'Ctrl+\\',
      action: () => setWorkspace((prev) => ({
        ...prev,
        editorSplit: prev.editorSplit === 'vertical' ? 'single' : 'vertical'
      }))
    },

    // Preview
    {
      id: 'preview.toggle',
      title: 'View: Toggle Live Web Preview',
      category: 'Preview',
      shortcut: 'Ctrl+Shift+V',
      action: () => setIsPreviewOpen((prev) => !prev)
    },
    {
      id: 'preview.splitRight',
      title: 'View: Preview Split Right',
      category: 'Preview',
      action: () => {
        setIsPreviewOpen(true);
        setPreviewLayout('right');
        localStorage.setItem('devforge_preview_layout', 'right');
      }
    },
    {
      id: 'preview.splitDown',
      title: 'View: Preview Split Down',
      category: 'Preview',
      action: () => {
        setIsPreviewOpen(true);
        setPreviewLayout('down');
        localStorage.setItem('devforge_preview_layout', 'down');
      }
    },
    {
      id: 'preview.maximize',
      title: 'View: Toggle Maximize Live Preview',
      category: 'Preview',
      action: () => {
        setIsPreviewOpen(true);
        setIsPreviewMaximized((prev) => !prev);
      }
    },
    {
      id: 'preview.restart',
      title: 'View: Restart Live Preview Session',
      category: 'Preview',
      action: () => {
        setIsPreviewOpen(true);
        previewService.restart(workspace.files);
      }
    },

    // Run & Debug
    {
      id: 'run.dev',
      title: 'Run: Start Vite Dev Server',
      category: 'Run',
      shortcut: 'F5',
      action: () => {
        setWorkspace((prev) => ({ ...prev, isBottomPanelVisible: true, bottomPanelTab: 'terminal' }));
        handleExecuteCommand('npm run dev');
      }
    },
    {
      id: 'run.build',
      title: 'Run: Execute Production Build',
      category: 'Run',
      action: () => {
        setWorkspace((prev) => ({ ...prev, isBottomPanelVisible: true, bottomPanelTab: 'terminal' }));
        handleExecuteCommand('npm run build');
      }
    },
    {
      id: 'run.test',
      title: 'Run: Execute Unit Tests',
      category: 'Run',
      action: () => {
        setWorkspace((prev) => ({ ...prev, isBottomPanelVisible: true, bottomPanelTab: 'terminal' }));
        handleExecuteCommand('npm test');
      }
    },
    {
      id: 'terminal.clear',
      title: 'Terminal: Clear Active Terminal',
      category: 'Terminal',
      shortcut: 'Ctrl+K',
      action: handleClearTerminal
    },

    // Preferences & Copilot
    {
      id: 'preferences.theme',
      title: 'Preferences: Toggle Dark / Light Theme',
      category: 'Preferences',
      action: () => setWorkspace((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }))
    },
    {
      id: 'preferences.settings',
      title: 'Preferences: Open Settings',
      category: 'Preferences',
      shortcut: 'Ctrl+,',
      action: () => setWorkspace((p) => ({ ...p, activeSidebar: 'settings', isSidebarVisible: true }))
    },
    {
      id: 'ai.assistant',
      title: 'AI: Open Nexus AI Studio',
      category: 'AI',
      action: () => setIsCopilotOpen(true)
    },
    {
      id: 'search.indiaKerala',
      title: 'Search: India & Kerala Web Search',
      category: 'AI',
      action: () => setIsWebSearchOpen(true)
    }
  ], [activeFile, workspace.files, workspace.theme, handleSaveAll, handleCloseAllTabs, handleCloseOtherTabs, handleClearTerminal]);

  // Synchronize with global command registry
  useEffect(() => {
    commandRegistry.registerMany(commands);
  }, [commands]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#18181b] text-zinc-300 font-sans select-none">
      {/* 1. TOP MENU BAR (VS Code Style) */}
      <div className="flex items-center justify-between px-2 bg-[#121214] border-b border-[#27272a] h-7 text-xs text-zinc-300 relative z-30">
        <div className="flex items-center space-x-1">
          {/* Logo Badge */}
          <div 
            onClick={onExitToLanding}
            title="DevForge IDE - Return to Home"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-zinc-800 cursor-pointer text-blue-400 font-bold mr-1"
          >
            <Code2 className="w-4 h-4 text-blue-500" />
            <span className="font-mono text-xs text-white">DevForge</span>
          </div>

          {/* Menus Dropdowns */}
          {[
            {
              id: 'File',
              items: [
                { label: 'New File', shortcut: '⌘N', action: () => handleCreateFilePrompt(null) },
                { label: 'New Folder', shortcut: '⇧⌘N', action: () => handleCreateFolderPrompt(null) },
                { label: 'Open File / Quick Open...', shortcut: '⌘P', action: () => setIsQuickOpen(true) },
                { divider: true },
                { label: 'Save', shortcut: '⌘S', action: () => activeFile && handleSaveFile(activeFile.id) },
                { label: 'Save All', shortcut: '⌥⌘S', action: handleSaveAll },
                { label: 'Close Editor', shortcut: '⌘W', action: () => activeFile && handleCloseTab(activeFile.id, { stopPropagation: () => {} } as any) },
                { label: 'Close All Tabs', shortcut: '⌘K ⌘W', action: handleCloseAllTabs },
                { divider: true },
                { label: 'Exit to Landing Page', shortcut: 'Esc', action: onExitToLanding }
              ]
            },
            {
              id: 'Edit',
              items: [
                { label: 'Undo', shortcut: '⌘Z', action: () => editorApiRef.current?.triggerUndo() },
                { label: 'Redo', shortcut: '⇧⌘Z', action: () => editorApiRef.current?.triggerRedo() },
                { divider: true },
                { label: 'Find in File', shortcut: '⌘F', action: () => editorApiRef.current?.triggerFind() },
                { label: 'Replace in File', shortcut: '⌥⌘F', action: () => editorApiRef.current?.triggerReplace() },
                { label: 'Find in Workspace', shortcut: '⇧⌘F', action: () => {
                  setWorkspace((p) => ({ ...p, activeSidebar: 'search', isSidebarVisible: true }));
                  setSearchFocusTrigger((c) => c + 1);
                }},
                { divider: true },
                { label: 'Format Document', shortcut: '⇧⌥F', action: () => editorApiRef.current?.triggerFormat() }
              ]
            },
            {
              id: 'Selection',
              items: [
                { label: 'Select All', shortcut: '⌘A', action: () => {} },
                { label: 'Expand Selection', shortcut: '⌃⇧→', action: () => {} },
                { label: 'Shrink Selection', shortcut: '⌃⇧←', action: () => {} }
              ]
            },
            {
              id: 'View',
              items: [
                { label: 'Command Palette...', shortcut: '⇧⌘P', action: () => setIsCommandPaletteOpen(true) },
                { label: 'Go to File...', shortcut: '⌘P', action: () => setIsQuickOpen(true) },
                { divider: true },
                { label: 'Explorer', shortcut: '⇧⌘E', action: () => setWorkspace((p) => ({ ...p, activeSidebar: 'explorer', isSidebarVisible: true })) },
                { label: 'Search', shortcut: '⇧⌘F', action: () => {
                  setWorkspace((p) => ({ ...p, activeSidebar: 'search', isSidebarVisible: true }));
                  setSearchFocusTrigger((c) => c + 1);
                }},
                { label: 'Source Control', shortcut: '⌃⇧G', action: () => setWorkspace((p) => ({ ...p, activeSidebar: 'git', isSidebarVisible: true })) },
                { label: 'Run and Debug', shortcut: '⇧⌘D', action: () => setWorkspace((p) => ({ ...p, activeSidebar: 'debug', isSidebarVisible: true })) },
                { label: 'Extensions', shortcut: '⇧⌘X', action: () => setWorkspace((p) => ({ ...p, activeSidebar: 'extensions', isSidebarVisible: true })) },
                { divider: true },
                { label: 'Terminal', shortcut: '⌃`', action: () => setWorkspace((p) => ({ ...p, isBottomPanelVisible: true, bottomPanelTab: 'terminal' })) },
                { label: 'Problems', shortcut: '⇧⌘M', action: () => setWorkspace((p) => ({ ...p, isBottomPanelVisible: true, bottomPanelTab: 'problems' })) },
                { label: 'Output', shortcut: '⇧⌘U', action: () => setWorkspace((p) => ({ ...p, isBottomPanelVisible: true, bottomPanelTab: 'output' })) },
                { divider: true },
                { label: 'Toggle Live Web Preview', shortcut: '⇧⌘V', action: () => setIsPreviewOpen((p) => !p) },
                { label: 'Preview: Split Right', action: () => { setIsPreviewOpen(true); setPreviewLayout('right'); localStorage.setItem('devforge_preview_layout', 'right'); } },
                { label: 'Preview: Split Down', action: () => { setIsPreviewOpen(true); setPreviewLayout('down'); localStorage.setItem('devforge_preview_layout', 'down'); } },
                { label: 'Preview: Maximize Preview', action: () => { setIsPreviewOpen(true); setIsPreviewMaximized((prev) => !prev); } },
                { divider: true },
                { label: 'Select Element to Edit', shortcut: '⇧⌘E', action: () => setIsElementSelectorActive(true) },
                { divider: true },
                { label: 'India & Kerala Search', action: () => setIsWebSearchOpen((p) => !p) }
              ]
            },
            {
              id: 'Go',
              items: [
                { label: 'Go to File...', shortcut: '⌘P', action: () => setIsQuickOpen(true) },
                { label: 'Go to Symbol...', shortcut: '⇧⌘O', action: () => setIsQuickOpen(true) },
                { label: 'Go to Line...', shortcut: '⌃G', action: () => setIsQuickOpen(true) }
              ]
            },
            {
              id: 'Run',
              items: [
                { label: 'Run Project', shortcut: 'F5', action: () => handleExecuteCommand('npm run dev') },
                { label: 'Start Debugging', shortcut: 'F5', action: () => handleExecuteCommand('npm run dev') },
                { label: 'Stop Debugging', shortcut: '⇧F5', action: () => handleExecuteCommand('kill') },
                { divider: true },
                { label: 'Run Without Debugging', shortcut: '⌃F5', action: () => handleExecuteCommand('npm run build') }
              ]
            },
            {
              id: 'Terminal',
              items: [
                { label: 'New Terminal', shortcut: '⌃⇧`', action: () => setWorkspace((p) => ({ ...p, isBottomPanelVisible: true, bottomPanelTab: 'terminal' })) },
                { label: 'Clear Terminal', shortcut: '⌘K', action: handleClearTerminal }
              ]
            },
            {
              id: 'Help',
              items: [
                { label: 'Command Palette', shortcut: '⇧⌘P', action: () => setIsCommandPaletteOpen(true) },
                { label: 'Keyboard Shortcuts', shortcut: '⌘K ⌘S', action: () => setIsCommandPaletteOpen(true) }
              ]
            }
          ].map((menu) => (
            <div key={menu.id} className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenu(openMenu === menu.id ? null : menu.id);
                }}
                className={`px-2 py-0.5 rounded hover:bg-zinc-800 transition ${
                  openMenu === menu.id ? 'bg-zinc-800 text-white' : 'text-zinc-300'
                }`}
              >
                {menu.id}
              </button>

              {openMenu === menu.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-full left-0 mt-0.5 w-60 bg-[#1e1e24] border border-[#3f3f46] rounded-md shadow-2xl py-1 text-xs text-zinc-200 z-50 divide-y divide-zinc-800/40"
                >
                  <div className="py-0.5">
                    {menu.items.map((it: any, idx: number) => {
                      if (it.divider) {
                        return <div key={idx} className="my-1 border-t border-zinc-700/50" />;
                      }
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (it.action) it.action();
                            setOpenMenu(null);
                          }}
                          className="w-full text-left px-3 py-1 hover:bg-blue-600 hover:text-white transition flex items-center justify-between text-xs"
                        >
                          <span>{it.label}</span>
                          {it.shortcut && (
                            <span className="text-[10px] text-zinc-400 font-mono tracking-tight">{it.shortcut}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Project Name & Quick Open bar Center */}
        <div 
          onClick={() => setIsQuickOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-0.5 rounded bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/40 cursor-pointer text-zinc-400 hover:text-zinc-200 transition text-[11px] select-none"
          title="Quick Open Files (Ctrl+P / ⌘P)"
        >
          <Search className="w-3 h-3 text-zinc-500" />
          <span className="font-mono text-zinc-300">{workspace.name || 'devforge-project'}</span>
          <span className="text-zinc-600">—</span>
          <span className="text-zinc-400">{activeFile ? activeFile.name : 'Quick Open files'}</span>
          <kbd className="ml-2 px-1 py-0.2 bg-zinc-700/60 rounded text-[9px] font-mono text-zinc-400">⌘P</kbd>
        </div>

        {/* Quick Toolbar Right */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            title="Command Palette (Ctrl+Shift+P)"
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-[11px]"
          >
            <Command className="w-3 h-3 text-zinc-400" />
            <span className="hidden sm:inline">⌘K</span>
          </button>

          <button
            onClick={() => handleExecuteCommand('npm run dev')}
            title="Run Project (npm run dev)"
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium"
          >
            <Play className="w-3 h-3 fill-current" />
            <span className="hidden sm:inline">Run</span>
          </button>

          <button
            onClick={onExitToLanding}
            title="Return to Landing Page"
            className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition"
          >
            <span>Exit to Home</span>
          </button>

          <button
            onClick={() => setWorkspace((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }))}
            title="Toggle Theme"
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200"
          >
            {workspace.theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKBENCH BODY (Activity Bar + Sidebar + Editor + Preview + Panel) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT ACTIVITY BAR */}
        <div className="w-12 bg-[#121214] border-r border-[#27272a] flex flex-col items-center py-2 justify-between z-20 shrink-0 select-none">
          <div className="flex flex-col items-center space-y-3">
            {[
              { id: 'explorer' as ActivityTab, icon: Folder, label: 'Explorer (Ctrl+Shift+E)' },
              { id: 'search' as ActivityTab, icon: Search, label: 'Search (Ctrl+Shift+F)' },
              { id: 'git' as ActivityTab, icon: GitBranch, label: 'Source Control (Ctrl+Shift+G)' },
              { id: 'debug' as ActivityTab, icon: Play, label: 'Run & Debug (Ctrl+Shift+D)' },
              { id: 'extensions' as ActivityTab, icon: Package, label: 'Extensions (Ctrl+Shift+X)' },
              { id: 'projects' as ActivityTab, icon: Layers, label: 'Project Templates' },
              { id: 'preview' as ActivityTab, icon: Eye, label: 'Live Web Preview' },
              { id: 'ai' as ActivityTab, icon: Sparkles, label: 'Nexus AI Studio' }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === 'ai'
                ? isCopilotOpen
                : workspace.isSidebarVisible && workspace.activeSidebar === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'preview') {
                      setIsPreviewOpen((prev) => !prev);
                      return;
                    }
                    if (tab.id === 'ai') {
                      setIsCopilotOpen((prev) => !prev);
                      return;
                    }
                    if (workspace.isSidebarVisible && workspace.activeSidebar === tab.id) {
                      setWorkspace((p) => ({ ...p, isSidebarVisible: false }));
                    } else {
                      setWorkspace((p) => ({
                        ...p,
                        isSidebarVisible: true,
                        activeSidebar: tab.id
                      }));
                    }
                  }}
                  title={tab.label}
                  className={`p-2 rounded-lg relative transition group ${
                    isActive
                      ? 'text-white bg-blue-600/20'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  {isActive && (
                    <span className="absolute -left-2 top-2 bottom-2 w-1 bg-blue-500 rounded-r" />
                  )}
                  <Icon className="w-5 h-5" />
                  {tab.id === 'ai' && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={() => setIsThreeDOpen((prev) => !prev)}
              title="3D Studio"
              className={`p-2 rounded-lg transition ${
                isThreeDOpen
                  ? 'text-white bg-fuchsia-600/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Boxes className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsWebSearchOpen((prev) => !prev)}
              title="India & Kerala Search"
              className={`p-2 rounded-lg transition ${
                isWebSearchOpen
                  ? 'text-white bg-orange-600/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Globe className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsVisionOpen((prev) => !prev)}
              title="Live App Vision"
              className={`p-2 rounded-lg transition ${
                isVisionOpen
                  ? 'text-white bg-blue-600/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <ScanEye className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setWorkspace((p) => ({
                  ...p,
                  isSidebarVisible: true,
                  activeSidebar: 'settings'
                }));
              }}
              title="Settings (Ctrl+,)"
              className={`p-2 rounded-lg transition ${
                workspace.isSidebarVisible && workspace.activeSidebar === 'settings'
                  ? 'text-white bg-blue-600/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* LEFT SIDEBAR */}
        {workspace.isSidebarVisible && (
          <Sidebar
            activeTab={workspace.activeSidebar}
            files={workspace.files}
            activeFileId={workspace.activeFileId}
            onSelectFile={handleSelectFile}
            onToggleFolder={handleToggleFolder}
            onCreateFile={handleCreateFilePrompt}
            onCreateFolder={handleCreateFolderPrompt}
            onRenameNode={handleRenamePrompt}
            onDeleteNode={handleDeletePrompt}
            onFilesChanged={handleFilesChanged}
            workspaceName={workspace.name || 'PROJECT'}
            onOpenDirectoryFromDisk={handleOpenDirectoryFromDisk}
            onNavigateToProblem={(file, line) => {
              const f = findNodeByPath(workspace.files, file);
              if (f) {
                handleSelectFile(f.id);
              }
            }}
            onNavigateToSearchResult={handleNavigateToSearchResult}
            onReplaceFiles={handleReplaceFiles}
            searchFocusTrigger={searchFocusTrigger}
                onApplyAiDiff={handleApplyAiDiff}
                onApplyFileOperations={handleApplyFileOperations}
                onLoadTemplate={handleLoadTemplate}
            theme={workspace.theme}
            onThemeChange={(t) => setWorkspace((p) => ({ ...p, theme: t }))}
            settings={editorSettings}
            onUpdateSettings={(newS) => setEditorSettings((p) => ({ ...p, ...newS }))}
            debuggerState={debuggerState}
          />
        )}

        {/* CENTER & RIGHT: EDITOR + PREVIEW + BOTTOM PANEL */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile responsive toggle when preview is open */}
          {isPreviewOpen && (
            <div className="md:hidden flex items-center bg-[#13161c] border-b border-[#22242b] px-2 py-1 text-xs shrink-0 select-none">
              <button
                onClick={() => setMobilePreviewTab('code')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  mobilePreviewTab === 'code' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Code
              </button>
              <button
                onClick={() => setMobilePreviewTab('preview')}
                className={`px-3 py-1 rounded text-xs font-medium ml-1.5 transition ${
                  mobilePreviewTab === 'preview' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Live Preview
              </button>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="ml-auto text-zinc-500 hover:text-zinc-300 p-1"
                title="Close Preview"
              >
                ✕
              </button>
            </div>
          )}

          {/* Editor & Preview Split Container */}
          <div
            ref={splitContainerRef}
            className={`flex-1 flex overflow-hidden relative ${
              isPreviewOpen && !isPreviewMaximized
                ? previewLayout === 'right'
                  ? 'flex-row'
                  : 'flex-col'
                : 'flex-row'
            }`}
          >
            {/* Main Monaco Editor */}
            <div
              style={
                isPreviewOpen && !isPreviewMaximized
                  ? previewLayout === 'right'
                    ? { width: `${previewSplitRatio}%` }
                    : { height: `${previewSplitRatio}%` }
                  : { width: '100%', height: '100%' }
              }
              className={`flex flex-col overflow-hidden ${
                isPreviewMaximized ? 'hidden' : ''
              } ${isPreviewOpen && mobilePreviewTab === 'preview' ? 'hidden md:flex' : 'flex'}`}
            >
              <Editor
                openTabs={openTabs}
                activeFile={activeFile}
                secondaryFile={secondaryFile}
                editorSplit={workspace.editorSplit}
                allFiles={workspace.files}
                problems={workspace.problems}
                targetLocation={editorTargetLocation}
                onEditorReady={(api) => {
                  editorApiRef.current = api;
                }}
                onSelectTab={handleSelectFile}
                onCloseTab={handleCloseTab}
                onCloseOtherTabs={handleCloseOtherTabs}
                onCloseTabsToRight={handleCloseTabsToRight}
                onCloseAllTabs={handleCloseAllTabs}
                onNewFileClick={() => handleCreateFilePrompt(null)}
                onContentChange={handleContentChange}
                onSaveFile={handleSaveFile}
                onSaveAs={handleSaveAsPrompt}
                onSaveAll={handleSaveAll}
                onToggleSplit={(split) => setWorkspace((p) => ({ ...p, editorSplit: split }))}
                onSelectSecondaryFile={(fileId) => setWorkspace((p) => ({ ...p, secondaryFileId: fileId }))}
                onCursorChange={(line, col) =>
                  setWorkspace((p) => ({ ...p, cursorPosition: { line, col } }))
                }
                onSelectionChange={(count) => setSelectionCount(count)}
                theme={workspace.theme}
                settings={editorSettings}
                onUpdateSettings={handleUpdateEditorSettings}
                workspaceName={workspace.name || 'PROJECT'}
              />
            </div>

            {/* Draggable Divider between Editor and Preview */}
            {isPreviewOpen && !isPreviewMaximized && (
              <div
                onMouseDown={handlePreviewResizeStart}
                onDoubleClick={() => {
                  setPreviewSplitRatio(50);
                  localStorage.setItem('devforge_preview_ratio', '50');
                }}
                title="Drag to resize Editor and Preview (Double-click to reset 50/50)"
                className={`hidden md:block select-none shrink-0 z-10 transition-colors ${
                  previewLayout === 'right'
                    ? 'w-1 hover:w-1.5 bg-[#22242b] hover:bg-blue-500 active:bg-blue-600 cursor-col-resize'
                    : 'h-1 hover:h-1.5 bg-[#22242b] hover:bg-blue-500 active:bg-blue-600 cursor-row-resize'
                }`}
              />
            )}

            {/* Live Web Preview Panel */}
            {isPreviewOpen && (
              <div
                style={
                  isPreviewMaximized
                    ? { width: '100%', height: '100%' }
                    : previewLayout === 'right'
                    ? { width: `${100 - previewSplitRatio}%` }
                    : { height: `${100 - previewSplitRatio}%` }
                }
                className={`flex flex-col overflow-hidden ${
                  mobilePreviewTab === 'code' ? 'hidden md:flex' : 'flex'
                }`}
              >
                <PreviewPanel
                  files={workspace.files}
                  onClose={() => setIsPreviewOpen(false)}
                  onElementInspected={(el) => {
                    setInspectedElement(el);
                    setAiSelectedElement(el);
                  }}
                  onNavigateToFile={(path, line, col) => handleNavigateToProblem(path, line || 1, col || 1)}
                  onOpenOutput={() =>
                    setWorkspace((p) => ({ ...p, isBottomPanelVisible: true, bottomPanelTab: 'output' }))
                  }
                  onExecuteCommand={(cmd) => handleExecuteCommand(cmd)}
                  theme={workspace.theme}
                  layout={previewLayout}
                  onToggleLayout={(layout) => {
                    setPreviewLayout(layout);
                    localStorage.setItem('devforge_preview_layout', layout);
                  }}
                  isMaximized={isPreviewMaximized}
                  onToggleMaximize={() => setIsPreviewMaximized((prev) => !prev)}
                />
              </div>
            )}
          </div>

          {/* Bottom Panel (Terminal, Problems, Output, Debug Console) */}
          {workspace.isBottomPanelVisible && (
            <Panel
              activeTab={workspace.bottomPanelTab}
              onTabChange={(tab) => setWorkspace((p) => ({ ...p, bottomPanelTab: tab }))}
              onClose={() => setWorkspace((p) => ({ ...p, isBottomPanelVisible: false }))}
              problems={workspace.problems}
              onClearProblems={() => setWorkspace((p) => ({ ...p, problems: [] }))}
              onNavigateToProblem={handleNavigateToProblem}
              isMaximized={isPanelMaximized}
              onToggleMaximize={() => setIsPanelMaximized((prev) => !prev)}
              panelHeight={panelHeight}
              onResizeHeight={handleResizePanelHeight}
              onResetHeight={() => handleResizePanelHeight(240)}
              theme={workspace.theme}
              projectName={workspace.name || 'devforge-project'}
              files={workspace.files}
              onTriggerPreviewReload={() => setIsPreviewOpen(true)}
            />
          )}
        </div>

        {/* RIGHT PANEL: 3D STUDIO */}
        {isThreeDOpen && (
          <div className="w-[400px] shrink-0 border-l border-[#27272a] bg-[#18181b] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#27272a] shrink-0">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-fuchsia-400" />
                3D Studio
              </span>
              <button
                onClick={() => setIsThreeDOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 p-1"
                title="Close 3D Studio"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ThreeDStudio />
            </div>
          </div>
        )}

        {/* RIGHT PANEL: INDIA & KERALA SEARCH */}
        {isWebSearchOpen && (
          <div className="w-[380px] shrink-0 border-l border-[#27272a] bg-[#18181b] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#27272a] shrink-0">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-orange-400" />
                India &amp; Kerala Search
              </span>
              <button
                onClick={() => setIsWebSearchOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 p-1"
                title="Close Search"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SearchPanel apiBase="" />
            </div>
          </div>
        )}

        {/* RIGHT PANEL: LIVE APP VISION */}
        {isVisionOpen && (
          <div className="w-[440px] shrink-0 border-l border-[#27272a] bg-[#18181b] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#27272a] shrink-0 md:hidden">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <ScanEye className="w-3.5 h-3.5 text-blue-400" />
                Live App Vision
              </span>
              <button
                onClick={() => setIsVisionOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 p-1"
                title="Close Live App Vision"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <LiveAppVisionPanel files={workspace.files} />
            </div>
          </div>
        )}

        {/* RIGHT PANEL: AI ASSISTANT / DEV COPILOT */}
        <CopilotPanel
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          files={workspace.files}
          activeFile={activeFile}
              onApplyDiff={handleApplyAiDiff}
              onApplyFileOperations={handleApplyFileOperations}
          inspectedElement={aiSelectedElement || inspectedElement}
          problems={workspace.problems}
          draftPrompt={aiDraftPrompt}
          onDraftPromptConsumed={() => setAiDraftPrompt(null)}
        />
      </div>

      {/* 3. BOTTOM STATUS BAR */}
      <div className="flex items-center justify-between px-3 bg-[#18181b] border-t border-[#27272a] text-zinc-300 text-[11px] font-mono h-6 shrink-0 z-30 select-none">
        {/* Left Status Bar Items */}
        <div className="flex items-center space-x-2 text-[11px]">
          <div className="flex items-center gap-1 hover:bg-zinc-800 px-1.5 py-0.5 rounded cursor-pointer text-zinc-200">
            <GitBranch className="w-3 h-3 text-blue-400" />
            <span>{workspace.branch}</span>
          </div>

          <span className="text-zinc-600">|</span>

          <div className="flex items-center gap-1 text-emerald-400 hover:bg-zinc-800 px-1 py-0.5 rounded cursor-pointer" title="Repository in sync">
            <Check className="w-3 h-3 text-emerald-400" />
          </div>

          <span className="text-zinc-600">|</span>

          <div
            onClick={() => setWorkspace((p) => ({ ...p, isBottomPanelVisible: true, bottomPanelTab: 'problems' }))}
            className="flex items-center gap-2 hover:bg-zinc-800 px-1.5 py-0.5 rounded cursor-pointer"
          >
            <span className="flex items-center gap-1 text-zinc-300">
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span>{workspace.problems.filter((p) => p.severity === 'error').length} errors</span>
            </span>
            <span className="flex items-center gap-1 text-zinc-400">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>{workspace.problems.filter((p) => p.severity === 'warning').length} warnings</span>
            </span>
          </div>

          <span className="text-zinc-600 hidden sm:inline">|</span>

          <div
            onClick={() => setIsPreviewOpen((p) => !p)}
            className="hidden sm:flex items-center gap-1 hover:bg-zinc-800 px-1.5 py-0.5 rounded cursor-pointer text-zinc-400 hover:text-zinc-200"
          >
            <Eye className="w-3 h-3 text-blue-400" />
            <span>Preview: {isPreviewOpen ? 'Active (Port 3000)' : 'Hidden'}</span>
          </div>
        </div>

        {/* Right Status Bar Items */}
        <div className="flex items-center space-x-2 text-[11px]">
          {saveStatusMessage ? (
            <span className="text-emerald-400 font-medium px-1.5 py-0.5 rounded bg-emerald-950/40 animate-pulse">
              {saveStatusMessage}
            </span>
          ) : activeFile?.isDirty ? (
            <span
              onClick={() => activeFile && handleSaveFile(activeFile.id)}
              className="text-amber-400 hover:text-amber-300 font-medium px-1.5 py-0.5 rounded hover:bg-zinc-800 cursor-pointer"
              title="Click to save (Ctrl+S)"
            >
              ● Unsaved
            </span>
          ) : (
            <span className="text-zinc-500 hidden sm:inline">
              Saved
            </span>
          )}
          <span className="text-zinc-600 hidden sm:inline">|</span>

          <span className="hover:bg-zinc-800 px-1.5 py-0.5 rounded cursor-pointer text-zinc-300">
            Ln {workspace.cursorPosition.line}, Col {workspace.cursorPosition.col}
            {selectionCount > 0 && (
              <span className="text-blue-400 ml-1">({selectionCount} selected)</span>
            )}
          </span>
          <span className="text-zinc-600">|</span>
          <span
            onClick={() => handleUpdateEditorSettings({ tabSize: editorSettings.tabSize === 2 ? 4 : 2 })}
            className="hidden sm:inline hover:bg-zinc-800 px-1.5 py-0.5 rounded cursor-pointer text-zinc-400 hover:text-zinc-200"
            title="Click to toggle Spaces: 2 / 4"
          >
            Spaces: {editorSettings.tabSize}
          </span>
          <span className="text-zinc-600 hidden sm:inline">|</span>
          <span className="hover:bg-zinc-800 px-1.5 py-0.5 rounded cursor-pointer text-zinc-400">
            UTF-8
          </span>
          <span className="text-zinc-600">|</span>
          <span className="hover:bg-zinc-800 px-1.5 py-0.5 rounded cursor-pointer text-blue-400 font-semibold">
            {activeFile ? getLanguageForFile(activeFile.name).name : 'Plain Text'}
          </span>
          <span className="text-zinc-600 hidden md:inline">|</span>
          <span className="hidden md:inline hover:bg-zinc-800 px-1.5 py-0.5 rounded cursor-pointer text-zinc-400" title="Code Formatter Active">
            Prettier ✓
          </span>
          <span className="text-zinc-600">|</span>
          <div
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center hover:bg-zinc-800 p-1 rounded cursor-pointer text-zinc-400 hover:text-zinc-200"
            title="Notifications"
          >
            <Bell className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Global Modals */}
      <QuickOpen
        isOpen={isQuickOpen}
        onClose={() => setIsQuickOpen(false)}
        files={workspace.files}
        recentFileIds={recentFileIds}
        onOpenFile={(fileId, targetLine) => {
          handleSelectFile(fileId);
          if (targetLine) {
            setEditorTargetLocation({
              line: targetLine,
              col: 1,
              timestamp: Date.now()
            });
          }
        }}
        theme={workspace.theme}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
        theme={workspace.theme}
      />

      <PromptModal
        isOpen={promptModal.isOpen}
        title={promptModal.title}
        placeholder={promptModal.placeholder}
        initialValue={promptModal.initialValue}
        onConfirm={promptModal.onConfirm}
        onCancel={() => setPromptModal((p) => ({ ...p, isOpen: false }))}
      />

      <ElementInspectorModal
        element={inspectedElement}
        onClose={() => setInspectedElement(null)}
        onAskAi={(element) => {
          const selector = `<${element.tagName}>${element.id ? `#${element.id}` : ''}${element.className ? `.${element.className.trim().split(/\s+/).join('.')}` : ''}`;
          setAiSelectedElement(element);
          setAiDraftPrompt(`Change the selected preview element ${selector}. Describe the desired change: `);
          setIsCopilotOpen(true);
        }}
        onOpenInEditor={(path) => {
          const match = findNodeByPath(workspace.files, path);
          if (match) handleSelectFile(match.id);
        }}
      />

      {/* Element Selector */}
      {isElementSelectorActive && (
        <ElementSelector
          isActive={isElementSelectorActive}
          onElementSelected={setSelectedElement}
          onEditElement={(el) => {
            setSelectedElement(el);
            setIsElementEditorOpen(true);
            setIsElementSelectorActive(false);
          }}
          onDeactivate={() => setIsElementSelectorActive(false)}
        />
      )}

      {/* Element Editor */}
      {isElementEditorOpen && selectedElement && (
        <ElementEditor
          element={selectedElement}
          onClose={() => setIsElementEditorOpen(false)}
          onSave={(changes) => {
            // Apply changes to the element
            const el = document.querySelector(selectedElement.xpath) as HTMLElement;
            if (el) {
              Object.entries(changes.styles).forEach(([prop, value]) => {
                el.style[prop as any] = value;
              });
            }
          }}
        />
      )}
    </div>
  );
}
