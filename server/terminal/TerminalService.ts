import { spawn, ChildProcess } from 'child_process';
import { CommandClassifier } from '../agent/tools/CommandClassifier';

export interface TerminalSession {
  id: string;
  pid?: number;
  cwd: string;
  status: 'idle' | 'running' | 'terminated';
  history: TerminalCommand[];
  environment: Record<string, string>;
}

export interface TerminalCommand {
  command: string;
  output: string;
  error?: string;
  exitCode: number;
  timestamp: Date;
  classification?: {
    riskLevel: string;
    requiresApproval: boolean;
  };
}

export interface TerminalOutput {
  type: 'stdout' | 'stderr' | 'exit';
  data: string;
  timestamp: Date;
}

/**
 * Terminal Service
 * Purpose: Manage terminal sessions for code execution
 * Features:
 * - Session management
 * - Command execution with security
 * - Output streaming
 * - Command history
 * - Working directory management
 * - Environment variable control
 */
export class TerminalService {
  private sessions: Map<string, TerminalSession> = new Map();
  private processes: Map<string, ChildProcess> = new Map();
  private commandClassifier: CommandClassifier;

  constructor() {
    this.commandClassifier = new CommandClassifier();
  }

  createSession(cwd: string = process.cwd()): TerminalSession {
    const session: TerminalSession = {
      id: this.generateId(),
      cwd,
      status: 'idle',
      history: [],
      environment: { ...process.env },
    };

    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  terminateSession(sessionId: string): void {
    const process = this.processes.get(sessionId);
    if (process) {
      process.kill();
      this.processes.delete(sessionId);
    }

    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'terminated';
    }
  }

  async executeCommand(
    sessionId: string,
    command: string,
    timeout: number = 60000
  ): Promise<TerminalCommand> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Classify command for security
    const classification = this.commandClassifier.classify(command);

    // Block system commands
    if (classification.riskLevel === 'system') {
      throw new Error(
        `System command blocked: ${command}\n` +
        `Reason: ${classification.description}\n` +
        `This command requires explicit user approval.`
      );
    }

    return new Promise((resolve, reject) => {
      const process = spawn(command, {
        cwd: session.cwd,
        shell: true,
        env: session.environment,
      });

      this.processes.set(sessionId, process);
      session.status = 'running';

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeoutHandle = setTimeout(() => {
        process.kill();
        reject(new Error(`Command timeout after ${timeout}ms`));
      }, timeout);

      process.on('close', (code) => {
        clearTimeout(timeoutHandle);
        this.processes.delete(sessionId);
        session.status = 'idle';

        const terminalCommand: TerminalCommand = {
          command,
          output: stdout,
          error: stderr || undefined,
          exitCode: code || 0,
          timestamp: new Date(),
          classification: {
            riskLevel: classification.riskLevel,
            requiresApproval: classification.requiresApproval,
          },
        };

        session.history.push(terminalCommand);
        resolve(terminalCommand);
      });

      process.on('error', (error) => {
        clearTimeout(timeoutHandle);
        this.processes.delete(sessionId);
        session.status = 'idle';

        const terminalCommand: TerminalCommand = {
          command,
          output: '',
          error: error.message,
          exitCode: 1,
          timestamp: new Date(),
          classification: {
            riskLevel: classification.riskLevel,
            requiresApproval: classification.requiresApproval,
          },
        };

        session.history.push(terminalCommand);
        resolve(terminalCommand);
      });
    });
  }

  async executeCommandStreaming(
    sessionId: string,
    command: string,
    onOutput: (output: TerminalOutput) => void
  ): Promise<TerminalCommand> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const classification = this.commandClassifier.classify(command);

    if (classification.riskLevel === 'system') {
      throw new Error(
        `System command blocked: ${command}\n` +
        `Reason: ${classification.description}`
      );
    }

    return new Promise((resolve, reject) => {
      const process = spawn(command, {
        cwd: session.cwd,
        shell: true,
        env: session.environment,
      });

      this.processes.set(sessionId, process);
      session.status = 'running';

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        onOutput({ type: 'stdout', data: output, timestamp: new Date() });
      });

      process.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        onOutput({ type: 'stderr', data: output, timestamp: new Date() });
      });

      process.on('close', (code) => {
        this.processes.delete(sessionId);
        session.status = 'idle';

        onOutput({ type: 'exit', data: String(code || 0), timestamp: new Date() });

        const terminalCommand: TerminalCommand = {
          command,
          output: stdout,
          error: stderr || undefined,
          exitCode: code || 0,
          timestamp: new Date(),
          classification: {
            riskLevel: classification.riskLevel,
            requiresApproval: classification.requiresApproval,
          },
        };

        session.history.push(terminalCommand);
        resolve(terminalCommand);
      });

      process.on('error', (error) => {
        this.processes.delete(sessionId);
        session.status = 'idle';

        const terminalCommand: TerminalCommand = {
          command,
          output: '',
          error: error.message,
          exitCode: 1,
          timestamp: new Date(),
          classification: {
            riskLevel: classification.riskLevel,
            requiresApproval: classification.requiresApproval,
          },
        };

        session.history.push(terminalCommand);
        resolve(terminalCommand);
      });
    });
  }

  changeDirectory(sessionId: string, path: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.cwd = path;
  }

  setEnvironmentVariable(sessionId: string, key: string, value: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.environment[key] = value;
  }

  getSessionHistory(sessionId: string): TerminalCommand[] {
    const session = this.sessions.get(sessionId);
    return session?.history || [];
  }

  clearSessionHistory(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.history = [];
    }
  }

  deleteSession(sessionId: string): void {
    this.terminateSession(sessionId);
    this.sessions.delete(sessionId);
  }

  private generateId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
