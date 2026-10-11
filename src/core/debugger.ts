export interface Breakpoint {
  id: string;
  file: string;
  line: number;
  enabled: boolean;
}

export interface DebugVariable {
  name: string;
  value: string;
  type: string;
}

export interface StackFrame {
  id: string;
  functionName: string;
  file: string;
  line: number;
}

export interface DebuggerState {
  status: 'idle' | 'running' | 'paused';
  activeLine: number | null;
  activeFile: string | null;
  breakpoints: Breakpoint[];
  variables: DebugVariable[];
  callStack: StackFrame[];
  watchList: string[];
}

export const INITIAL_DEBUG_STATE: DebuggerState = {
  status: 'idle',
  activeLine: null,
  activeFile: null,
  breakpoints: [
    { id: 'bp-1', file: 'src/app.ts', line: 12, enabled: true },
    { id: 'bp-2', file: 'src/app.ts', line: 26, enabled: true }
  ],
  variables: [
    { name: 'this.count', value: '0', type: 'number' },
    { name: 'this.status', value: '"Online & Ready"', type: 'string' },
    { name: 'document.readyState', value: '"complete"', type: 'string' },
    { name: 'window.location.href', value: '"http://localhost:3000/"', type: 'string' }
  ],
  callStack: [
    { id: 'cs-1', functionName: 'InteractiveApp.init', file: 'src/app.ts', line: 12 },
    { id: 'cs-2', functionName: 'new InteractiveApp', file: 'src/app.ts', line: 6 },
    { id: 'cs-3', functionName: 'anonymous listener', file: 'src/app.ts', line: 32 }
  ],
  watchList: ['this.count', 'window.innerWidth', 'document.body.children.length']
};
