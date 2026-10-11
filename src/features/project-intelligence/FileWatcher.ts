// File Watcher - Monitors file changes for incremental indexing
import * as fs from 'fs';
import * as path from 'path';

export interface FileChangeEvent {
  type: 'created' | 'modified' | 'deleted';
  path: string;
  timestamp: Date;
}

export interface WatcherOptions {
  debounceMs?: number;
  ignorePatterns?: string[];
  recursive?: boolean;
}

export class FileWatcher {
  private watchedPaths: Map<string, fs.FSWatcher> = new Map();
  private eventQueue: FileChangeEvent[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Set<(event: FileChangeEvent) => void> = new Set();

  constructor(private options: WatcherOptions = {}) {
    this.options = {
      debounceMs: 300,
      ignorePatterns: ['node_modules', '.git', 'dist', 'build', '.cache'],
      recursive: true,
      ...options,
    };
  }

  watch(projectPath: string): void {
    const resolvedPath = path.resolve(projectPath);

    if (this.watchedPaths.has(resolvedPath)) {
      return; // Already watching
    }

    try {
      const watcher = fs.watch(resolvedPath, { recursive: this.options.recursive }, (eventType, filename) => {
        if (!filename) return;

        const filePath = path.join(resolvedPath, filename);

        // Check if should ignore
        if (this.shouldIgnore(filePath)) {
          return;
        }

        // Debounce events
        this.debouncedNotify(eventType as 'created' | 'modified' | 'deleted', filePath);
      });

      this.watchedPaths.set(resolvedPath, watcher);
    } catch (error) {
      console.error(`Failed to watch ${resolvedPath}:`, error);
    }
  }

  unwatch(projectPath: string): void {
    const resolvedPath = path.resolve(projectPath);
    const watcher = this.watchedPaths.get(resolvedPath);

    if (watcher) {
      watcher.close();
      this.watchedPaths.delete(resolvedPath);
    }
  }

  unwatchAll(): void {
    for (const [path, watcher] of this.watchedPaths) {
      watcher.close();
    }
    this.watchedPaths.clear();
  }

  onFileChange(listener: (event: FileChangeEvent) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private debouncedNotify(type: 'created' | 'modified' | 'deleted', filePath: string): void {
    // Clear existing timer for this file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      const event: FileChangeEvent = {
        type,
        path: filePath,
        timestamp: new Date(),
      };

      this.notifyListeners(event);
      this.debounceTimers.delete(filePath);
    }, this.options.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  private notifyListeners(event: FileChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in file change listener:', error);
      }
    }
  }

  private shouldIgnore(filePath: string): boolean {
    const relativePath = path.relative(process.cwd(), filePath);

    // Check ignore patterns
    if (this.options.ignorePatterns) {
      for (const pattern of this.options.ignorePatterns) {
        if (relativePath.includes(pattern)) {
          return true;
        }
      }
    }

    // Check if file exists (deleted files still trigger events)
    if (!fs.existsSync(filePath)) {
      return false; // Don't ignore deletions
    }

    // Check if it's a directory
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      return true; // Ignore directory events
    }

    // Check if it's a binary file
    if (this.isBinaryFile(filePath)) {
      return true;
    }

    return false;
  }

  private isBinaryFile(filePath: string): boolean {
    try {
      const buffer = fs.readFileSync(filePath);
      // Check for binary signature (null bytes)
      for (let i = 0; i < Math.min(1024, buffer.length); i++) {
        if (buffer[i] === 0) {
          return true;
        }
      }
      return false;
    } catch {
      return true;
    }
  }

  getWatchedPaths(): string[] {
    return Array.from(this.watchedPaths.keys());
  }

  isWatching(projectPath: string): boolean {
    const resolvedPath = path.resolve(projectPath);
    return this.watchedPaths.has(resolvedPath);
  }
}
