import { FileNode } from './filesystem';

export type ActivityTab = 
  | 'explorer' 
  | 'search' 
  | 'git' 
  | 'debug' 
  | 'extensions' 
  | 'projects' 
  | 'preview' 
  | 'ai' 
  | 'settings';

export type BottomPanelTab = 'terminal' | 'problems' | 'output' | 'debug-console';

export type EditorSplit = 'single' | 'vertical' | 'horizontal';

export interface ProblemItem {
  id: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  file: string;
  line: number;
  column: number;
  source: string;
  code?: string | number;
}

export interface WorkspaceState {
  id: string;
  name: string;
  branch: string;
  files: FileNode[];
  activeFileId: string | null;
  secondaryFileId: string | null; // for split view
  openTabIds: string[];
  editorSplit: EditorSplit;
  activeSidebar: ActivityTab;
  isSidebarVisible: boolean;
  isBottomPanelVisible: boolean;
  bottomPanelTab: BottomPanelTab;
  theme: 'dark' | 'light';
  cursorPosition: { line: number; col: number };
  problems: ProblemItem[];
}

export const DEFAULT_PROBLEMS: ProblemItem[] = [];
