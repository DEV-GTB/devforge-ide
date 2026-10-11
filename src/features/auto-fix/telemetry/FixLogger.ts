// Session-scoped logger. Keeps an in-memory log and mirrors entries onto the
// event bus so the UI can render a live activity stream.

import { FixEventBus } from './FixEvents';

export type FixLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface FixLogEntry {
  level: FixLogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export class FixLogger {
  private readonly entries: FixLogEntry[] = [];

  constructor(
    private readonly sessionId: string,
    private readonly bus?: FixEventBus,
  ) {}

  private write(level: FixLogLevel, message: string, data?: Record<string, unknown>): void {
    const entry: FixLogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    };
    this.entries.push(entry);
    this.bus?.emit({
      type: 'FIX_LOG',
      sessionId: this.sessionId,
      timestamp: entry.timestamp,
      message,
      data: { level, ...data },
    });
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.write('debug', message, data);
  }
  info(message: string, data?: Record<string, unknown>): void {
    this.write('info', message, data);
  }
  warn(message: string, data?: Record<string, unknown>): void {
    this.write('warn', message, data);
  }
  error(message: string, data?: Record<string, unknown>): void {
    this.write('error', message, data);
  }

  getEntries(): FixLogEntry[] {
    return [...this.entries];
  }
}
