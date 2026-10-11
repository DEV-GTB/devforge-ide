import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface IDEState {
  // Theme
  theme: 'dark' | 'light' | 'cyberpunk' | 'forest' | 'ocean' | 'sunset';
  setTheme: (theme: IDEState['theme']) => void;

  // Layout
  sidebarOpen: boolean;
  panelOpen: boolean;
  terminalOpen: boolean;
  toggleSidebar: () => void;
  togglePanel: () => void;
  toggleTerminal: () => void;

  // Editor
  activeFile: string | null;
  openFiles: string[];
  setActiveFile: (file: string) => void;
  addOpenFile: (file: string) => void;
  removeOpenFile: (file: string) => void;

  // Workspace
  currentWorkspace: string | null;
  workspaces: Workspace[];
  setCurrentWorkspace: (id: string) => void;
  addWorkspace: (workspace: Workspace) => void;
  removeWorkspace: (id: string) => void;

  // Agent
  agentMode: 'ask' | 'plan' | 'code';
  agentProvider: 'cloud' | 'local';
  setAgentMode: (mode: IDEState['agentMode']) => void;
  setAgentProvider: (provider: IDEState['agentProvider']) => void;

  // Device Lab
  connectedDevices: string[];
  addConnectedDevice: (id: string) => void;
  removeConnectedDevice: (id: string) => void;

  // Terminal
  terminalHistory: TerminalCommand[];
  addTerminalCommand: (command: TerminalCommand) => void;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

export interface Workspace {
  id: string;
  name: string;
  path: string;
  language: string;
  framework: string;
  lastOpened: Date;
}

export interface TerminalCommand {
  id: string;
  command: string;
  output: string;
  timestamp: Date;
  exitCode: number;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number;
}

export const useIDEStore = create<IDEState>()(
  subscribeWithSelector((set) => ({
    // Theme
    theme: 'dark',
    setTheme: (theme) => set({ theme }),

    // Layout
    sidebarOpen: true,
    panelOpen: true,
    terminalOpen: false,
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
    toggleTerminal: () => set((state) => ({ terminalOpen: !state.terminalOpen })),

    // Editor
    activeFile: null,
    openFiles: [],
    setActiveFile: (file) => set({ activeFile: file }),
    addOpenFile: (file) => set((state) => ({ openFiles: [...state.openFiles, file] })),
    removeOpenFile: (file) => set((state) => ({ openFiles: state.openFiles.filter(f => f !== file) })),

    // Workspace
    currentWorkspace: null,
    workspaces: [],
    setCurrentWorkspace: (id) => set({ currentWorkspace: id }),
    addWorkspace: (workspace) => set((state) => ({ workspaces: [...state.workspaces, workspace] })),
    removeWorkspace: (id) => set((state) => ({ workspaces: state.workspaces.filter(w => w.id !== id) })),

    // Agent
    agentMode: 'ask',
    agentProvider: 'cloud',
    setAgentMode: (mode) => set({ agentMode: mode }),
    setAgentProvider: (provider) => set({ agentProvider: provider }),

    // Device Lab
    connectedDevices: [],
    addConnectedDevice: (id) => set((state) => ({ connectedDevices: [...state.connectedDevices, id] })),
    removeConnectedDevice: (id) => set((state) => ({ connectedDevices: state.connectedDevices.filter(d => d !== id) })),

    // Terminal
    terminalHistory: [],
    addTerminalCommand: (command) => set((state) => ({ terminalHistory: [...state.terminalHistory, command] })),

    // Notifications
    notifications: [],
    addNotification: (notification) => set((state) => ({ notifications: [...state.notifications, notification] })),
    removeNotification: (id) => set((state) => ({ notifications: state.notifications.filter(n => n.id !== id) })),
  }))
);
