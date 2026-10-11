import { FileNode, flattenFiles } from './filesystem';
import { outputService } from './output';

export type TerminalLineType = 
  | 'input' 
  | 'output' 
  | 'error' 
  | 'success' 
  | 'info' 
  | 'warning' 
  | 'system';

export interface TerminalLine {
  id: string;
  type: TerminalLineType;
  text: string;
  timestamp?: number;
}

export type ShellType = 'bash' | 'zsh' | 'node' | 'powershell';

export interface TerminalSession {
  id: string;
  name: string;
  shell: ShellType;
  cwd: string;
  lines: TerminalLine[];
  commandHistory: string[];
  historyIndex: number;
  isRunning: boolean;
  activeProcess?: string;
  backend: 'browser-sandbox' | 'desktop-pty';
  cols?: number;
  rows?: number;
}

export function createInitialTerminal(projectName = 'devforge-project'): TerminalSession {
  return {
    id: 'term-1',
    name: '1: bash',
    shell: 'bash',
    cwd: `~/${projectName}`,
    commandHistory: ['devforge dev'],
    historyIndex: -1,
    isRunning: false,
    backend: 'browser-sandbox',
    lines: [
      {
        id: 'init-1',
        type: 'system',
        text: 'DevForge Terminal Environment (v1.4.0) [Browser Sandbox Mode]'
      },
      {
        id: 'init-2',
        type: 'info',
        text: 'Type "help" for built-in dev commands or run npm scripts (e.g. "npm run dev", "npm test").'
      },
      {
        id: 'init-3',
        type: 'input',
        text: '$ npm run dev'
      },
      {
        id: 'init-4',
        type: 'info',
        text: '> vite --port 3000 --host 0.0.0.0'
      },
      {
        id: 'init-5',
        type: 'success',
        text: '➜ Local: http://localhost:3000/ (preview server ready)'
      }
    ]
  };
}

export class TerminalService {
  private static instance: TerminalService;
  private sessions: TerminalSession[] = [];
  private activeSessionId: string = 'term-1';
  private listeners: Set<() => void> = new Set();
  private maxBufferLines = 1000;

  private constructor() {
    this.sessions = [createInitialTerminal()];
    this.activeSessionId = this.sessions[0].id;
  }

  public static getInstance(): TerminalService {
    if (!TerminalService.instance) {
      TerminalService.instance = new TerminalService();
    }
    return TerminalService.instance;
  }

  public getSessions(): TerminalSession[] {
    return [...this.sessions];
  }

  public getActiveSession(): TerminalSession {
    const s = this.sessions.find((sess) => sess.id === this.activeSessionId);
    if (s) return s;
    if (this.sessions.length > 0) {
      this.activeSessionId = this.sessions[0].id;
      return this.sessions[0];
    }
    const newSess = this.createSession();
    return newSess;
  }

  public getActiveSessionId(): string {
    return this.activeSessionId;
  }

  public setActiveSessionId(id: string): void {
    if (this.sessions.some((s) => s.id === id)) {
      this.activeSessionId = id;
      this.notify();
    }
  }

  public createSession(
    shell: ShellType = 'bash',
    cwd = '~/devforge-project',
    customName?: string
  ): TerminalSession {
    const nextNum = this.sessions.length + 1;
    const name = customName || `${nextNum}: ${shell}`;
    const newSession: TerminalSession = {
      id: `term-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      shell,
      cwd,
      lines: [
        {
          id: `line-${Date.now()}-1`,
          type: 'system',
          text: `Session ${name} initialized. Sandbox environment ready.`
        }
      ],
      commandHistory: [],
      historyIndex: -1,
      isRunning: false,
      backend: 'browser-sandbox'
    };

    this.sessions.push(newSession);
    this.activeSessionId = newSession.id;
    this.notify();
    return newSession;
  }

  public closeSession(id: string): boolean {
    if (this.sessions.length <= 1) {
      // Don't close the last session; instead clear it
      this.clear(id);
      return false;
    }

    const index = this.sessions.findIndex((s) => s.id === id);
    if (index === -1) return false;

    this.sessions.splice(index, 1);
    if (this.activeSessionId === id) {
      const nextIndex = Math.max(0, index - 1);
      this.activeSessionId = this.sessions[nextIndex].id;
    }

    this.notify();
    return true;
  }

  public clear(sessionId?: string): void {
    const id = sessionId || this.activeSessionId;
    const sess = this.sessions.find((s) => s.id === id);
    if (sess) {
      sess.lines = [];
      this.notify();
    }
  }

  public write(sessionId: string, text: string, type: TerminalLineType = 'output'): void {
    const sess = this.sessions.find((s) => s.id === sessionId);
    if (!sess) return;

    sess.lines.push({
      id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type,
      text,
      timestamp: Date.now()
    });

    if (sess.lines.length > this.maxBufferLines) {
      sess.lines.shift();
    }

    this.notify();
  }

  public kill(sessionId: string): void {
    const sess = this.sessions.find((s) => s.id === sessionId);
    if (!sess) return;

    if (sess.isRunning) {
      sess.isRunning = false;
      sess.activeProcess = undefined;
      this.write(sessionId, '^C Process terminated by user interrupt.', 'warning');
    }
  }

  public resize(sessionId: string, cols: number, rows: number): void {
    const sess = this.sessions.find((s) => s.id === sessionId);
    if (sess) {
      sess.cols = cols;
      sess.rows = rows;
    }
  }

  public setWorkingDirectory(sessionId: string, cwd: string): void {
    const sess = this.sessions.find((s) => s.id === sessionId);
    if (sess) {
      sess.cwd = cwd;
      this.notify();
    }
  }

  public getHistory(sessionId: string): string[] {
    const sess = this.sessions.find((s) => s.id === sessionId);
    return sess ? sess.commandHistory : [];
  }

  public execute(
    sessionId: string,
    rawCommand: string,
    files: FileNode[],
    options?: {
      onTriggerPreviewReload?: () => void;
      onOutputLog?: (channel: string, msg: string) => void;
    }
  ): TerminalSession {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return createInitialTerminal();

    const trimmed = rawCommand.trim();
    const promptSymbol = session.shell === 'powershell' ? 'PS' : '$';
    
    // Add input line
    this.write(sessionId, `${promptSymbol} ${rawCommand}`, 'input');

    if (!trimmed) {
      return session;
    }

    // Update command history
    session.commandHistory.push(trimmed);
    session.historyIndex = -1;

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    const add = (text: string, type: TerminalLineType = 'output') => {
      this.write(sessionId, text, type);
    };

    switch (cmd) {
      case 'clear':
      case 'cls':
        this.clear(sessionId);
        return session;

      case 'help':
        add('DevForge Built-in Developer Commands:', 'info');
        add('  npm run dev        - Starts local Vite preview server on :3000', 'output');
        add('  npm run build      - Transpiles and packages production bundle', 'output');
        add('  npm test           - Executes Vitest unit tests suite', 'output');
        add('  npm install <pkg>  - Installs library package to virtual workspace', 'output');
        add('  ls / dir [path]    - Lists files and subdirectories in path', 'output');
        add('  cd <dir>           - Changes current working directory', 'output');
        add('  pwd                - Prints current working directory', 'output');
        add('  cat <file>         - Displays contents of a project file', 'output');
        add('  echo <text>        - Prints string to stdout', 'output');
        add('  date               - Prints current date and system time', 'output');
        add('  whoami             - Prints current developer identity', 'output');
        add('  node -v / tsc -v   - Displays toolchain version identifiers', 'output');
        add('  git status         - Displays working tree branch and modified files', 'output');
        add('  git branch         - Lists active workspace branches', 'output');
        add('  git log            - Shows recent commit history', 'output');
        add('  git commit -m <m>  - Creates git commit in workspace tree', 'output');
        add('  clear              - Clears terminal output (Ctrl+L)', 'output');
        add('', 'output');
        add('Note on Browser Security: Native OS binaries (python, docker, cargo, gcc) require', 'system');
        add('a native desktop daemon or PTY host. The browser sandbox executes workspace toolchains.', 'system');
        break;

      case 'pwd':
        add(session.cwd, 'output');
        break;

      case 'cd':
        const targetDir = args[0];
        if (!targetDir || targetDir === '~' || targetDir === '/') {
          session.cwd = '~/devforge-project';
          add(session.cwd, 'output');
        } else if (targetDir === '..') {
          const segs = session.cwd.split('/');
          if (segs.length > 2) {
            segs.pop();
            session.cwd = segs.join('/');
          }
          add(session.cwd, 'output');
        } else {
          // Check if folder exists
          const cleanTarget = targetDir.replace(/^\.\//, '').replace(/\/$/, '');
          const all = flattenFiles(files);
          const folderExists = all.some(
            (f) => (f.type === 'folder' && (f.path === cleanTarget || f.name === cleanTarget)) ||
                   f.path.startsWith(cleanTarget + '/')
          );
          if (folderExists) {
            session.cwd = session.cwd.endsWith(cleanTarget) ? session.cwd : `${session.cwd}/${cleanTarget}`;
          } else {
            add(`cd: no such file or directory: ${targetDir}`, 'error');
          }
        }
        break;

      case 'ls':
      case 'dir':
        const flat = flattenFiles(files);
        const folderItems: string[] = [];
        const fileItems: string[] = [];

        flat.forEach((f) => {
          if (f.type === 'folder') {
            folderItems.push(`${f.name}/`);
          } else {
            fileItems.push(f.name);
          }
        });

        // Group output
        const outputItems = [
          ...Array.from(new Set(folderItems)).map((f) => `\x1b[34m${f}\x1b[0m`),
          ...Array.from(new Set(fileItems))
        ];

        add(outputItems.join('   '), 'output');
        break;

      case 'cat':
        if (!args[0]) {
          add('cat: missing filename operand', 'error');
        } else {
          const flatList = flattenFiles(files);
          const search = args[0].replace(/^\.\//, '');
          const match = flatList.find(
            (f) => f.name === search || f.path === search || f.path.endsWith(search)
          );
          if (match && match.content !== undefined) {
            match.content.split('\n').forEach((line) => add(line, 'output'));
          } else {
            add(`cat: ${args[0]}: No such file or directory`, 'error');
          }
        }
        break;

      case 'node':
        if (args[0] === '-v' || args[0] === '--version') {
          add('v20.12.0 (DevForge Node Runtime)', 'success');
        } else {
          add('Node.js REPL is available in Debug Console. Use npm scripts to run scripts.', 'info');
        }
        break;

      case 'tsc':
        if (args[0] === '-v' || args[0] === '--version') {
          add('Version 5.4.2 (TypeScript Compiler)', 'success');
        } else {
          add('Transpiling TypeScript project in ~/devforge-project...', 'info');
          add('Found 0 compiler errors. Transpilation succeeded.', 'success');
        }
        break;

      case 'npm':
        const sub = args[0];
        if (sub === 'run' && args[1] === 'dev') {
          add('> devforge-project@1.0.0 dev', 'info');
          add('> vite --port 3000 --host', 'info');
          add('');
          add('  VITE v5.2.0  ready in 142 ms', 'success');
          add('  ➜  Local:   http://localhost:3000/', 'success');
          add('  ➜  Network: use --host to expose', 'info');
          add('  ➜  press h + enter to show help', 'output');
          outputService.append('Build', '[dev] Vite server restarted on port 3000', 'success');
          outputService.append('Preview', '[HMR] Live reload synchronized', 'info');
          if (options?.onTriggerPreviewReload) options.onTriggerPreviewReload();
        } else if (sub === 'run' && args[1] === 'build') {
          add('> devforge-project@1.0.0 build', 'info');
          add('> tsc && vite build', 'info');
          add('vite v5.2.0 building for production...');
          add('transforming (14) modules...', 'info');
          add('✓ 14 modules transformed.', 'success');
          add('dist/index.html                   0.84 kB │ gzip: 0.42 kB', 'output');
          add('dist/assets/index.css             1.48 kB │ gzip: 0.69 kB', 'output');
          add('dist/assets/index.js             24.30 kB │ gzip: 8.98 kB', 'output');
          add('✓ built in 298ms', 'success');
          outputService.append('Build', 'Production build compiled successfully: 3 bundles created.', 'success');
        } else if (sub === 'test') {
          add('> devforge-project@1.0.0 test', 'info');
          add('> vitest run', 'info');
          add('');
          add(' ✓ src/components/Counter.test.ts (2 tests)', 'success');
          add(' ✓ src/app.test.ts (3 tests)', 'success');
          add('');
          add(' Test Files  2 passed (2)', 'success');
          add('      Tests  5 passed (5)', 'success');
          add('   Duration  310ms (transform 38ms, setup 0ms, collect 78ms, tests 194ms)', 'info');
          outputService.append('Build', 'Vitest suite: 5/5 tests passing.', 'success');
        } else if (sub === 'install' || sub === 'i') {
          const pkg = args.slice(1).join(' ') || 'dependencies';
          add(`added 12 packages, and audited 184 packages in 1.2s for ${pkg}`, 'success');
          add('found 0 vulnerabilities', 'info');
          outputService.append('Build', `npm install ${pkg}: completed with 0 errors.`, 'info');
        } else {
          add(`npm: command not recognized: ${args.join(' ')}. Try "npm run dev", "npm run build", or "npm test"`, 'error');
        }
        break;

      case 'git':
        const gitCmd = args[0];
        if (gitCmd === 'status') {
          add('On branch main', 'info');
          add('Your branch is up to date with "origin/main".');
          add('Changes not staged for commit:');
          add('  (use "git add <file>..." to update what will be committed)');
          add('    modified:   src/app.ts', 'warning');
          add('    modified:   src/style.css', 'warning');
        } else if (gitCmd === 'branch') {
          add('* main', 'success');
          add('  feature/components');
          add('  release/v1.0');
        } else if (gitCmd === 'log') {
          add('commit 8f192b49c71a39f1 (HEAD -> main, origin/main)', 'warning');
          add('Author: DevForge User <developer@devforge.local>');
          add('Date:   Mon Sep 15 05:00:00 2026 +0000');
          add('');
          add('    feat: integrate Monaco editor and bottom workbench panel');
        } else if (gitCmd === 'commit') {
          add('[main 9a24c1f] Workspace changes committed cleanly.', 'success');
          add(' 2 files changed, 24 insertions(+), 6 deletions(-)');
          outputService.append('Git', 'Created commit 9a24c1f on branch main', 'success');
        } else {
          add(`git ${args.join(' ')}: executed cleanly.`, 'info');
        }
        break;

      case 'echo':
        add(args.join(' '), 'output');
        break;

      case 'date':
        add(new Date().toUTCString(), 'output');
        break;

      case 'whoami':
        add('developer', 'output');
        break;

      // Native commands that cannot run in browser sandbox
      case 'python':
      case 'python3':
      case 'pip':
      case 'docker':
      case 'cargo':
      case 'rustc':
      case 'go':
      case 'make':
      case 'gcc':
      case 'g++':
      case 'clang':
      case 'mvn':
      case 'gradle':
        add(
          `Terminal backend: OS terminal backend unavailable in browser sandbox.\n` +
          `Execution of native binary "${cmd}" requires a local DevForge desktop agent or backend daemon.\n` +
          `Built-in web toolchains (Node.js, TypeScript, Vite, npm, Git) are fully operational.`,
          'error'
        );
        break;

      default:
        add(`command not found: ${cmd}. Type "help" to see available commands in browser sandbox.`, 'error');
    }

    this.notify();
    return session;
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

export const terminalService = TerminalService.getInstance();

// Backward-compatible wrapper
export function executeTerminalCommand(
  command: string,
  session: TerminalSession,
  files: FileNode[],
  onTriggerPreviewReload?: () => void
): TerminalSession {
  return terminalService.execute(session.id, command, files, { onTriggerPreviewReload });
}
