export type CommandCategory =
  | 'File'
  | 'Edit'
  | 'View'
  | 'Selection'
  | 'Navigation'
  | 'Terminal'
  | 'Preview'
  | 'Preferences'
  | 'Run'
  | 'Help'
  | 'Git'
  | 'AI'
  | 'Debug';

export interface CommandItem {
  id: string;
  title: string;
  category: CommandCategory;
  shortcut?: string;
  macShortcut?: string;
  icon?: string;
  description?: string;
  isEnabled?: () => boolean;
  action: () => void | Promise<void>;
}

export interface FuzzyMatchResult {
  score: number;
  highlightIndices: number[];
}

/**
 * High-performance fuzzy matching algorithm with word boundary, prefix, and acronym bonuses.
 */
export function fuzzyMatch(pattern: string, text: string): FuzzyMatchResult | null {
  const p = pattern.trim().toLowerCase();
  const t = text.toLowerCase();

  if (!p) {
    return { score: 1, highlightIndices: [] };
  }

  // Exact match bonus
  if (t === p) {
    return {
      score: 1000,
      highlightIndices: Array.from({ length: t.length }, (_, i) => i)
    };
  }

  // Substring match bonus
  const subIndex = t.indexOf(p);
  if (subIndex !== -1) {
    const indices: number[] = [];
    for (let i = 0; i < p.length; i++) {
      indices.push(subIndex + i);
    }
    // Prefix bonus
    const prefixBonus = subIndex === 0 ? 300 : 150;
    return {
      score: prefixBonus + (100 / (t.length - p.length + 1)),
      highlightIndices: indices
    };
  }

  // Subsequence matching
  let pIdx = 0;
  let tIdx = 0;
  let score = 0;
  let consecutive = 0;
  const indices: number[] = [];

  while (pIdx < p.length && tIdx < t.length) {
    if (p[pIdx] === t[tIdx]) {
      indices.push(tIdx);
      let charScore = 10;

      // Bonus if start of word or following delimiter
      if (tIdx === 0 || /[\s_\-./\\]/.test(text[tIdx - 1])) {
        charScore += 50;
      }
      // Bonus if camelCase transition
      else if (text[tIdx] >= 'A' && text[tIdx] <= 'Z' && text[tIdx - 1] >= 'a' && text[tIdx - 1] <= 'z') {
        charScore += 40;
      }

      // Bonus for consecutive matches
      consecutive++;
      charScore += consecutive * 15;

      score += charScore;
      pIdx++;
    } else {
      consecutive = 0;
    }
    tIdx++;
  }

  if (pIdx === p.length) {
    // Penalty for length difference
    score -= (t.length - p.length) * 2;
    return { score: Math.max(1, score), highlightIndices: indices };
  }

  return null;
}

export function isMacPlatform(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /macintosh|mac os x/i.test(navigator.userAgent || navigator.platform);
}

export function formatShortcut(cmd: CommandItem): string {
  const isMac = isMacPlatform();
  if (isMac && cmd.macShortcut) return cmd.macShortcut;
  if (!isMac && cmd.shortcut) return cmd.shortcut;

  const raw = cmd.shortcut || cmd.macShortcut || '';
  if (isMac) {
    return raw
      .replace(/Ctrl\+Shift\+/gi, '⇧⌘')
      .replace(/Cmd\+Shift\+/gi, '⇧⌘')
      .replace(/Ctrl\+/gi, '⌘')
      .replace(/Cmd\+/gi, '⌘')
      .replace(/Alt\+/gi, '⌥');
  } else {
    return raw
      .replace(/⇧⌘/g, 'Ctrl+Shift+')
      .replace(/⌘/g, 'Ctrl+')
      .replace(/⌥/g, 'Alt+');
  }
}

export class CommandRegistry {
  private commands = new Map<string, CommandItem>();
  private listeners: (() => void)[] = [];

  public register(cmd: CommandItem): () => void {
    this.commands.set(cmd.id, cmd);
    this.notify();
    return () => {
      this.commands.delete(cmd.id);
      this.notify();
    };
  }

  public registerMany(cmds: CommandItem[]): () => void {
    for (const cmd of cmds) {
      this.commands.set(cmd.id, cmd);
    }
    this.notify();
    return () => {
      for (const cmd of cmds) {
        this.commands.delete(cmd.id);
      }
      this.notify();
    };
  }

  public get(id: string): CommandItem | undefined {
    return this.commands.get(id);
  }

  public getAll(): CommandItem[] {
    return Array.from(this.commands.values());
  }

  public getByCategory(category: CommandCategory): CommandItem[] {
    return this.getAll().filter((c) => c.category === category);
  }

  public async execute(id: string): Promise<boolean> {
    const cmd = this.commands.get(id);
    if (!cmd) {
      console.warn(`Command with ID '${id}' not found in registry.`);
      return false;
    }
    if (cmd.isEnabled && !cmd.isEnabled()) {
      console.warn(`Command '${id}' is currently disabled.`);
      return false;
    }
    try {
      await cmd.action();
      return true;
    } catch (err) {
      console.error(`Error executing command '${id}':`, err);
      return false;
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const commandRegistry = new CommandRegistry();
