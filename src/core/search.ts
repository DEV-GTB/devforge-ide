import { FileNode, flattenFiles } from './filesystem';

export interface SearchOptions {
  query: string;
  isCaseSensitive: boolean;
  isWholeWord: boolean;
  isRegex: boolean;
  includePattern: string; // e.g. "*.tsx, src/*"
  excludePattern: string; // e.g. "node_modules, .git, dist, build, coverage"
  maxResults?: number;
}

export interface SearchMatch {
  line: number; // 1-based
  col: number;  // 1-based
  length: number;
  lineText: string;
  matchText: string;
  previewBefore: string;
  previewMatch: string;
  previewAfter: string;
}

export interface FileSearchResult {
  file: FileNode;
  filePath: string;
  fileName: string;
  matches: SearchMatch[];
}

export interface SearchSummary {
  totalMatches: number;
  totalFiles: number;
  isLimitReached: boolean;
  durationMs: number;
  error?: string;
}

export interface SearchProgressCallback {
  (progress: { matchedFiles: number; totalMatches: number; isDone: boolean }): void;
}

export class CancellationToken {
  private isCancelled = false;
  private cancelListeners: (() => void)[] = [];

  public cancel(): void {
    if (!this.isCancelled) {
      this.isCancelled = true;
      for (const listener of this.cancelListeners) {
        listener();
      }
    }
  }

  public get cancelled(): boolean {
    return this.isCancelled;
  }

  public onCancel(listener: () => void): void {
    if (this.isCancelled) {
      listener();
    } else {
      this.cancelListeners.push(listener);
    }
  }
}

/**
 * Checks if a relative file path matches a comma/space separated list of glob-like patterns.
 * Supports:
 * - wildcards: *.ts, src/*, components/**
 * - simple extensions: .tsx, .json
 * - folder names: node_modules, dist
 */
export function matchesGlobPattern(filePath: string, patternList: string): boolean {
  if (!patternList.trim()) return false;
  const patterns = patternList
    .split(/[,;\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();

  for (const pattern of patterns) {
    const p = pattern.toLowerCase();
    
    // Direct extension match: e.g. ".ts" or "*.ts"
    if (p.startsWith('*.')) {
      const ext = p.slice(1);
      if (normalizedPath.endsWith(ext)) return true;
    } else if (p.startsWith('.')) {
      if (normalizedPath.endsWith(p)) return true;
    }

    // Directory exclusion e.g. "node_modules", "dist", ".git"
    if (!p.includes('/') && !p.includes('*')) {
      const segments = normalizedPath.split('/');
      if (segments.includes(p)) return true;
      if (normalizedPath.startsWith(`${p}/`) || normalizedPath.endsWith(`/${p}`) || normalizedPath === p) {
        return true;
      }
    }

    // Wildcard prefix / suffix match: e.g. "src/*" or "*/components/*"
    const regexStr = '^' + p
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex chars except * and ?
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.') + '$';

    try {
      const re = new RegExp(regexStr);
      if (re.test(normalizedPath)) return true;
    } catch {
      // Fallback substring check
      if (normalizedPath.includes(p)) return true;
    }
  }

  return false;
}

export class SearchService {
  private currentToken: CancellationToken | null = null;
  private indexedCache = new Map<string, { hash: number; content: string }>();

  /**
   * Performs workspace-wide search across file nodes with filters, regex support, and limits.
   */
  public async search(
    nodes: FileNode[],
    options: SearchOptions,
    token?: CancellationToken
  ): Promise<{ results: FileSearchResult[]; summary: SearchSummary }> {
    const startTime = performance.now();
    const activeToken = token || new CancellationToken();
    this.currentToken = activeToken;

    const maxResults = options.maxResults || 1000;
    const query = options.query;

    if (!query.trim()) {
      return {
        results: [],
        summary: {
          totalMatches: 0,
          totalFiles: 0,
          isLimitReached: false,
          durationMs: Math.round(performance.now() - startTime)
        }
      };
    }

    // Compile matcher regex
    let regex: RegExp;
    try {
      let pattern = options.query;
      if (!options.isRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      if (options.isWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      const flags = options.isCaseSensitive ? 'g' : 'gi';
      regex = new RegExp(pattern, flags);
    } catch (err: any) {
      return {
        results: [],
        summary: {
          totalMatches: 0,
          totalFiles: 0,
          isLimitReached: false,
          durationMs: Math.round(performance.now() - startTime),
          error: `Invalid regular expression: ${err.message || 'Syntax error'}`
        }
      };
    }

    const allFiles = flattenFiles(nodes);
    const results: FileSearchResult[] = [];
    let totalMatches = 0;
    let isLimitReached = false;

    // Filter files based on include/exclude patterns
    const candidateFiles = allFiles.filter((file) => {
      const path = file.path;

      // Exclude check (default: node_modules, .git, dist, build, coverage)
      if (options.excludePattern && options.excludePattern.trim()) {
        if (matchesGlobPattern(path, options.excludePattern)) {
          return false;
        }
      }

      // Include check
      if (options.includePattern && options.includePattern.trim()) {
        if (!matchesGlobPattern(path, options.includePattern)) {
          return false;
        }
      }

      return true;
    });

    // Execute search across candidate files
    for (const file of candidateFiles) {
      if (activeToken.cancelled) break;
      if (isLimitReached) break;
      if (!file.content) continue;

      const lines = file.content.split('\n');
      const fileMatches: SearchMatch[] = [];

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        if (activeToken.cancelled) break;
        const lineText = lines[lineIdx];
        regex.lastIndex = 0; // Reset state for global regex

        let match: RegExpExecArray | null;
        while ((match = regex.exec(lineText)) !== null) {
          if (activeToken.cancelled) break;

          const matchText = match[0];
          if (!matchText) {
            // Guard against empty string match loops with regexes like (a*)*
            regex.lastIndex++;
            continue;
          }

          const col = match.index + 1;
          const matchLength = matchText.length;

          const previewStart = Math.max(0, match.index - 40);
          const previewEnd = Math.min(lineText.length, match.index + matchLength + 60);

          fileMatches.push({
            line: lineIdx + 1,
            col,
            length: matchLength,
            lineText: lineText,
            matchText,
            previewBefore: lineText.substring(previewStart, match.index),
            previewMatch: matchText,
            previewAfter: lineText.substring(match.index + matchLength, previewEnd)
          });

          totalMatches++;
          if (totalMatches >= maxResults) {
            isLimitReached = true;
            break;
          }
        }

        if (isLimitReached) break;
      }

      if (fileMatches.length > 0) {
        results.push({
          file,
          filePath: file.path,
          fileName: file.name,
          matches: fileMatches
        });
      }
    }

    return {
      results,
      summary: {
        totalMatches,
        totalFiles: results.length,
        isLimitReached,
        durationMs: Math.round(performance.now() - startTime)
      }
    };
  }

  /**
   * Replaces a single occurrence in a file content.
   */
  public replaceSingleMatch(
    content: string,
    match: SearchMatch,
    replacement: string
  ): string {
    const lines = content.split('\n');
    const lineIndex = match.line - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) return content;

    const line = lines[lineIndex];
    const colIndex = match.col - 1;
    const newLine =
      line.substring(0, colIndex) +
      replacement +
      line.substring(colIndex + match.length);

    lines[lineIndex] = newLine;
    return lines.join('\n');
  }

  /**
   * Replaces all matches within a specific file.
   */
  public replaceAllInFile(
    fileContent: string,
    options: SearchOptions,
    replacement: string
  ): { newContent: string; count: number } {
    let regex: RegExp;
    try {
      let pattern = options.query;
      if (!options.isRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      if (options.isWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      const flags = options.isCaseSensitive ? 'g' : 'gi';
      regex = new RegExp(pattern, flags);
    } catch {
      return { newContent: fileContent, count: 0 };
    }

    let count = 0;
    const newContent = fileContent.replace(regex, () => {
      count++;
      return replacement;
    });

    return { newContent, count };
  }

  /**
   * Workspace-wide replace all. Returns list of modified files with new content and match counts.
   */
  public replaceAllInWorkspace(
    filesToUpdate: FileSearchResult[],
    options: SearchOptions,
    replacement: string
  ): {
    updatedFiles: { file: FileNode; newContent: string; count: number }[];
    totalReplacements: number;
  } {
    const updatedFiles: { file: FileNode; newContent: string; count: number }[] = [];
    let totalReplacements = 0;

    for (const res of filesToUpdate) {
      const { newContent, count } = this.replaceAllInFile(
        res.file.content || '',
        options,
        replacement
      );
      if (count > 0) {
        updatedFiles.push({
          file: res.file,
          newContent,
          count
        });
        totalReplacements += count;
      }
    }

    return { updatedFiles, totalReplacements };
  }

  /**
   * Cancels any ongoing search operation.
   */
  public cancel(): void {
    if (this.currentToken) {
      this.currentToken.cancel();
      this.currentToken = null;
    }
  }
}

export const searchService = new SearchService();
