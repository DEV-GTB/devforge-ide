export type OutputChannelId = 
  | 'IDE' 
  | 'Build' 
  | 'Language Service' 
  | 'Preview' 
  | 'Git' 
  | 'AI' 
  | 'Extensions';

export interface OutputLogEntry {
  id: string;
  timestamp: string;
  channel: OutputChannelId;
  level: 'info' | 'warn' | 'error' | 'debug' | 'success';
  text: string;
}

export interface OutputChannelConfig {
  id: OutputChannelId;
  name: string;
  description: string;
}

export const OUTPUT_CHANNELS: OutputChannelConfig[] = [
  { id: 'IDE', name: 'DevForge IDE', description: 'Core IDE lifecycle and system events' },
  { id: 'Build', name: 'Build & Tasks', description: 'Bundler, compiler, and task outputs' },
  { id: 'Language Service', name: 'TypeScript Language Service', description: 'TSServer diagnostics, indexing, and completions' },
  { id: 'Preview', name: 'Live Web Preview', description: 'Local dev server and iframe runtime logs' },
  { id: 'Git', name: 'Git Source Control', description: 'Version control operations and diff logs' },
  { id: 'AI', name: 'Nexus AI', description: 'Workspace context and generation stream' },
  { id: 'Extensions', name: 'Extensions Host', description: 'Installed plugins and themes' },
];

function getCurrentTimeStr(): string {
  const d = new Date();
  return d.toTimeString().split(' ')[0];
}

export class OutputService {
  private static instance: OutputService;
  private logs: Map<OutputChannelId, OutputLogEntry[]> = new Map();
  private listeners: Set<() => void> = new Set();
  private maxLogsPerChannel = 1000;

  private constructor() {
    // Initialize default channels with realistic startup diagnostic logs
    OUTPUT_CHANNELS.forEach((c) => this.logs.set(c.id, []));

    this.append('IDE', 'DevForge Web IDE v1.4.0 initialized successfully.', 'info');
    this.append('IDE', 'Monaco Editor engine v0.52.0 loaded with WebAssembly syntax highlighter.', 'info');
    this.append('IDE', 'Virtual workspace filesystem mounted (in-memory + local persistence).', 'success');

    this.append('Build', 'Build pipeline configuration: vite.config.ts (ESNext, React 18, Tailwind CSS).', 'info');
    this.append('Build', 'Watching for workspace file change events.', 'debug');

    this.append('Language Service', 'Initializing TypeScript Language Server (tsserver v5.4.2)...', 'info');
    this.append('Language Service', 'Loaded tsconfig.json with target: ES2022, moduleResolution: bundler.', 'info');
    this.append('Language Service', 'Workspace index completed: 14 modules, 0 fatal type errors.', 'success');

    this.append('Preview', 'Local dev server active on http://localhost:3000', 'success');
    this.append('Preview', 'Live reload sync: active via postMessage communication bridge.', 'info');

    this.append('Git', 'Repository opened: branch "main"', 'info');
    this.append('Git', 'Working tree clean, tracking origin/main.', 'info');

    this.append('AI', 'Nexus AI assistant ready with workspace routing and context.', 'info');

    this.append('Extensions', 'Registered 5 built-in extensions (Monaco, Tailwind, TypeScript, Git, Prettier).', 'info');
  }

  public static getInstance(): OutputService {
    if (!OutputService.instance) {
      OutputService.instance = new OutputService();
    }
    return OutputService.instance;
  }

  public getChannels(): OutputChannelConfig[] {
    return OUTPUT_CHANNELS;
  }

  public getLogs(channel: OutputChannelId): OutputLogEntry[] {
    return this.logs.get(channel) || [];
  }

  public append(
    channel: OutputChannelId,
    text: string,
    level: 'info' | 'warn' | 'error' | 'debug' | 'success' = 'info'
  ): OutputLogEntry {
    const entry: OutputLogEntry = {
      id: `out-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: getCurrentTimeStr(),
      channel,
      level,
      text
    };

    const current = this.logs.get(channel) || [];
    if (current.length >= this.maxLogsPerChannel) {
      current.shift(); // Evict oldest log entry to maintain buffer ceiling
    }
    current.push(entry);
    this.logs.set(channel, current);

    this.notify();
    return entry;
  }

  public clear(channel: OutputChannelId): void {
    this.logs.set(channel, []);
    this.notify();
  }

  public clearAll(): void {
    OUTPUT_CHANNELS.forEach((c) => this.logs.set(c.id, []));
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

export const outputService = OutputService.getInstance();
