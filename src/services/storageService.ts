import { FileNode, flattenFiles, removeBundledStarterFiles } from '../core/filesystem';
import { WorkspaceState } from '../core/workspace';

const STORAGE_KEY = 'devforge_ide_workspace_state_v3';

export function loadSavedWorkspace(): Partial<WorkspaceState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.warn('Failed to load workspace state from storage:', err);
    return {};
  }
}

export function saveWorkspace(state: Partial<WorkspaceState>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save workspace state:', err);
  }
}

export function getInitialWorkspace(): WorkspaceState {
  const saved = loadSavedWorkspace();
  const files = removeBundledStarterFiles(Array.isArray(saved.files) ? saved.files : []);
  const fileIds = new Set(flattenFiles(files).map((file) => file.id));
  const activeFileId = saved.activeFileId && fileIds.has(saved.activeFileId)
    ? saved.activeFileId || null
    : null;

  return {
    id: saved.id || 'ws-default',
    name: saved.name || 'DevForge Interactive Workspace',
    branch: saved.branch || 'main',
    files,
    activeFileId,
    secondaryFileId: null,
    openTabIds: Array.isArray(saved.openTabIds)
      ? saved.openTabIds.filter((id) => fileIds.has(id))
      : [],
    editorSplit: saved.editorSplit || 'single',
    activeSidebar: saved.activeSidebar || 'explorer',
    isSidebarVisible: saved.isSidebarVisible !== undefined ? saved.isSidebarVisible : true,
    isBottomPanelVisible: saved.isBottomPanelVisible !== undefined ? saved.isBottomPanelVisible : true,
    bottomPanelTab: saved.bottomPanelTab || 'terminal',
    theme: saved.theme || 'dark',
    cursorPosition: { line: 1, col: 1 },
    problems: []
  };
}
