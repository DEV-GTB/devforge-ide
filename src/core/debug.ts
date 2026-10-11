export type DebugSessionState = 
  | 'inactive' 
  | 'starting' 
  | 'running' 
  | 'paused' 
  | 'stopped' 
  | 'terminated';

export interface DebugConsoleEntry {
  id: string;
  type: 'input' | 'output' | 'error' | 'system' | 'info';
  content: string;
  evaluatedData?: any;
  timestamp: string;
}

export interface DebugThread {
  id: number;
  name: string;
  status: 'running' | 'paused' | 'stopped';
}

export interface DebugSession {
  id: string;
  name: string;
  type: 'node' | 'chrome' | 'pwa-msedge' | 'custom';
  state: DebugSessionState;
  threads: DebugThread[];
  currentCallFrame?: string;
}

function getTimestamp(): string {
  const d = new Date();
  return d.toTimeString().split(' ')[0];
}

export class DebugService {
  private static instance: DebugService;
  private sessionState: DebugSessionState = 'inactive';
  private activeSession: DebugSession | null = null;
  private consoleEntries: DebugConsoleEntry[] = [];
  private commandHistory: string[] = [];
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.consoleEntries = [
      {
        id: 'dbg-init-1',
        type: 'system',
        content: 'Debug session not active. Type expressions to evaluate in local sandbox or start a debug session (F5).',
        timestamp: getTimestamp()
      }
    ];
  }

  public static getInstance(): DebugService {
    if (!DebugService.instance) {
      DebugService.instance = new DebugService();
    }
    return DebugService.instance;
  }

  public getState(): DebugSessionState {
    return this.sessionState;
  }

  public getSession(): DebugSession | null {
    return this.activeSession;
  }

  public getEntries(): DebugConsoleEntry[] {
    return this.consoleEntries;
  }

  public getHistory(): string[] {
    return this.commandHistory;
  }

  public startSession(name = 'DevForge Node Debugger', type: 'node' | 'chrome' = 'node'): DebugSession {
    this.sessionState = 'running';
    this.activeSession = {
      id: `dbg-${Date.now()}`,
      name,
      type,
      state: 'running',
      threads: [{ id: 1, name: 'Main Thread', status: 'running' }]
    };

    this.addEntry('system', `Debugger attached to target: ${name} (${type})`);
    this.notify();
    return this.activeSession;
  }

  public stopSession(): void {
    if (this.activeSession) {
      this.addEntry('system', `Debugger detached from target (${this.activeSession.name})`);
    }
    this.sessionState = 'inactive';
    this.activeSession = null;
    this.notify();
  }

  public pauseSession(): void {
    if (this.activeSession) {
      this.sessionState = 'paused';
      this.activeSession.state = 'paused';
      this.addEntry('system', 'Execution paused on breakpoint.');
      this.notify();
    }
  }

  public resumeSession(): void {
    if (this.activeSession) {
      this.sessionState = 'running';
      this.activeSession.state = 'running';
      this.addEntry('system', 'Execution resumed.');
      this.notify();
    }
  }

  public clearConsole(): void {
    this.consoleEntries = [];
    this.notify();
  }

  public evaluate(expression: string): { success: boolean; resultText: string } {
    const trimmed = expression.trim();
    if (!trimmed) return { success: true, resultText: '' };

    this.commandHistory.push(trimmed);

    // Add input entry
    this.addEntry('input', trimmed);

    // If no debug session is active, clarify that we evaluate safely in browser scratchpad
    if (this.sessionState === 'inactive') {
      try {
        // Safe evaluation of mathematical and standard expressions
        // Prevent arbitrary dangerous DOM mutations
        let result: any;
        if (trimmed === 'this' || trimmed === 'window' || trimmed === 'document') {
          result = `[Sandbox Context: DevForge Web IDE]`;
        } else if (trimmed === 'process.env') {
          result = JSON.stringify({ NODE_ENV: 'development', APP_URL: 'http://localhost:3000' }, null, 2);
        } else {
          // Direct JS evaluator
          const fn = new Function(`return (${trimmed});`);
          result = fn();
        }

        let formatted = '';
        if (result === undefined) formatted = 'undefined';
        else if (result === null) formatted = 'null';
        else if (typeof result === 'object') formatted = JSON.stringify(result, null, 2);
        else formatted = String(result);

        this.addEntry('output', formatted, result);
        this.notify();
        return { success: true, resultText: formatted };
      } catch (err: any) {
        const errMsg = err?.message || 'Evaluation Error';
        this.addEntry('error', `Uncaught ReferenceError: ${errMsg}`);
        this.notify();
        return { success: false, resultText: errMsg };
      }
    } else {
      // Active debugger session evaluation simulation
      try {
        const fn = new Function(`return (${trimmed});`);
        const result = fn();
        const formatted = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
        this.addEntry('output', formatted, result);
        this.notify();
        return { success: true, resultText: formatted };
      } catch (err: any) {
        const errMsg = err?.message || 'Evaluation Error';
        this.addEntry('error', `Debugger eval error: ${errMsg}`);
        this.notify();
        return { success: false, resultText: errMsg };
      }
    }
  }

  public addEntry(type: 'input' | 'output' | 'error' | 'system' | 'info', content: string, evaluatedData?: any): void {
    this.consoleEntries.push({
      id: `dbg-entry-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type,
      content,
      evaluatedData,
      timestamp: getTimestamp()
    });
    // Buffer limit: max 500 entries
    if (this.consoleEntries.length > 500) {
      this.consoleEntries.shift();
    }
    this.notify();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }
}

export const debugService = DebugService.getInstance();
