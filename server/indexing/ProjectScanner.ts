// Project Scanner - Discovers and filters project files
import * as fs from 'fs';
import * as path from 'path';

export interface ScanResult {
  files: string[];
  ignored: string[];
  errors: string[];
  stats: {
    total: number;
    byLanguage: Record<string, number>;
    byExtension: Record<string, number>;
  };
}

export interface ScanOptions {
  excludePatterns?: string[];
  includePatterns?: string[];
  maxDepth?: number;
  followSymlinks?: boolean;
}

export class ProjectScanner {
  private readonly defaultExcludePatterns = [
    'node_modules',
    '.git',
    '.gitignore',
    'dist',
    'build',
    'coverage',
    '.cache',
    '.tmp',
    'vendor',
    '.next',
    '.nuxt',
    '.vscode',
    '.idea',
    '*.log',
    '*.lock',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
  ];

  private readonly sensitiveFiles = [
    '.env',
    '.env.local',
    '.env.*.local',
    '*.pem',
    '*.key',
    '*.cert',
    '*.crt',
    'id_rsa',
    'id_ed25519',
    'secrets',
    'credentials',
    'config/secrets',
  ];

  constructor(private projectRoot: string) {
    this.projectRoot = path.resolve(projectRoot);
  }

  async scan(options: ScanOptions = {}): Promise<ScanResult> {
    const result: ScanResult = {
      files: [],
      ignored: [],
      errors: [],
      stats: {
        total: 0,
        byLanguage: {},
        byExtension: {},
      },
    };

    const excludePatterns = [
      ...this.defaultExcludePatterns,
      ...(options.excludePatterns || []),
    ];

    try {
      await this.walkDirectory(this.projectRoot, result, excludePatterns, options);
    } catch (error) {
      result.errors.push(
        `Scan failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return result;
  }

  private async walkDirectory(
    dir: string,
    result: ScanResult,
    excludePatterns: string[],
    options: ScanOptions
  ): Promise<void> {
    const relativePath = path.relative(this.projectRoot, dir);

    // Check if directory should be excluded
    if (this.shouldExclude(relativePath, excludePatterns)) {
      result.ignored.push(relativePath);
      return;
    }

    // Check depth limit
    const depth = relativePath.split(path.sep).length;
    if (options.maxDepth && depth > options.maxDepth) {
      return;
    }

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      const relativeItemPath = path.relative(this.projectRoot, fullPath);

      if (item.isDirectory()) {
        // Recursively walk subdirectories
        await this.walkDirectory(fullPath, result, excludePatterns, options);
      } else if (item.isFile()) {
        // Check if file should be excluded
        if (this.shouldExclude(relativeItemPath, excludePatterns)) {
          result.ignored.push(relativeItemPath);
          continue;
        }

        // Check if file is sensitive
        if (this.isSensitiveFile(relativeItemPath)) {
          result.ignored.push(relativeItemPath + ' (sensitive)');
          continue;
        }

        // Check if file is binary
        if (this.isBinaryFile(fullPath)) {
          result.ignored.push(relativeItemPath + ' (binary)');
          continue;
        }

        // Check include patterns if specified
        if (options.includePatterns && options.includePatterns.length > 0) {
          const matches = options.includePatterns.some(pattern =>
            this.matchPattern(relativeItemPath, pattern)
          );
          if (!matches) {
            result.ignored.push(relativeItemPath + ' (pattern)');
            continue;
          }
        }

        // Add to results
        result.files.push(relativeItemPath);
        result.stats.total++;

        // Update stats
        const ext = path.extname(item.name).toLowerCase();
        const language = this.detectLanguage(ext);
        result.stats.byExtension[ext] = (result.stats.byExtension[ext] || 0) + 1;
        result.stats.byLanguage[language] = (result.stats.byLanguage[language] || 0) + 1;
      }
    }
  }

  private shouldExclude(path: string, patterns: string[]): boolean {
    const normalizedPath = path.normalize(path);

    return patterns.some(pattern => {
      // Convert glob pattern to regex
      const regex = this.globToRegex(pattern);
      return regex.test(normalizedPath);
    });
  }

  private isSensitiveFile(path: string): boolean {
    const filename = path.split('/').pop() || path;
    return this.sensitiveFiles.some(pattern => {
      const regex = this.globToRegex(pattern);
      return regex.test(filename) || regex.test(path);
    });
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
      return true; // If we can't read it, assume binary
    }
  }

  private matchPattern(path: string, pattern: string): boolean {
    const regex = this.globToRegex(pattern);
    return regex.test(path);
  }

  private globToRegex(pattern: string): RegExp {
    // Simple glob to regex conversion
    const escaped = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(escaped, 'i');
  }

  private detectLanguage(extension: string): string {
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.kt': 'kotlin',
      '.swift': 'swift',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.hpp': 'cpp',
      '.cs': 'csharp',
      '.php': 'php',
      '.sql': 'sql',
      '.sh': 'shell',
      '.bash': 'shell',
      '.zsh': 'shell',
      '.ps1': 'powershell',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.toml': 'toml',
      '.md': 'markdown',
      '.txt': 'text',
    };

    return languageMap[extension] || 'unknown';
  }

  async scanFile(filePath: string): Promise<{
    exists: boolean;
    isSensitive: boolean;
    isBinary: boolean;
    language: string;
    size: number;
  }> {
    const fullPath = path.resolve(this.projectRoot, filePath);

    if (!fs.existsSync(fullPath)) {
      return {
        exists: false,
        isSensitive: false,
        isBinary: false,
        language: 'unknown',
        size: 0,
      };
    }

    const stats = fs.statSync(fullPath);
    const ext = path.extname(filePath).toLowerCase();

    return {
      exists: true,
      isSensitive: this.isSensitiveFile(filePath),
      isBinary: this.isBinaryFile(fullPath),
      language: this.detectLanguage(ext),
      size: stats.size,
    };
  }
}
