// File Indexer - Indexes file metadata with security scanning
export interface FileIndex {
  id: string;
  path: string;
  language: string;
  size: number;
  hash: string;
  modified: Date;
  content?: string;
  sensitivity?: 'public' | 'internal' | 'sensitive' | 'secret';
  isBinary?: boolean;
  isGenerated?: boolean;
}

export class FileIndexer {
  private files: Map<string, FileIndex> = new Map();
  private sensitivePatterns: RegExp[] = [
    // API keys
    /API[_-]?KEY\s*=\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?/gi,
    /sk-[a-zA-Z0-9]{20,}/gi,
    // Secrets
    /SECRET[_-]?KEY\s*=\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?/gi,
    /PASSWORD\s*=\s*['"]?[a-zA-Z0-9\-_]{10,}['"]?/gi,
    // Database URLs
    /mongodb:\/\/[^'"\s]+/gi,
    /postgres:\/\/[^'"\s]+/gi,
    /mysql:\/\/[^'"\s]+/gi,
    // Tokens
    /JWT[_-]?SECRET\s*=\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?/gi,
    /Bearer\s+[a-zA-Z0-9\-_]{20,}/gi,
  ];

  constructor(private projectId: string) {}

  async indexAll(): Promise<FileIndex[]> {
    // In a real implementation, this would scan the project directory
    // For now, return mock data
    const mockFiles: FileIndex[] = [
      {
        id: crypto.randomUUID(),
        path: 'src/App.tsx',
        language: 'typescript',
        size: 1024,
        hash: 'abc123',
        modified: new Date(),
      },
      {
        id: crypto.randomUUID(),
        path: 'src/main.tsx',
        language: 'typescript',
        size: 512,
        hash: 'def456',
        modified: new Date(),
      },
    ];

    mockFiles.forEach(f => this.files.set(f.path, f));
    return mockFiles;
  }

  async indexFile(path: string, content: string): Promise<FileIndex> {
    const hash = this.hashContent(content);
    const language = this.detectLanguage(path);
    const sensitivity = this.classifySensitivity(path, content);

    const index: FileIndex = {
      id: crypto.randomUUID(),
      path,
      language,
      size: content.length,
      hash,
      modified: new Date(),
      content,
      sensitivity,
      isBinary: false,
      isGenerated: false,
    };

    this.files.set(path, index);
    return index;
  }

  getFile(path: string): FileIndex | undefined {
    return this.files.get(path);
  }

  getAllFiles(): FileIndex[] {
    return Array.from(this.files.values());
  }

  private hashContent(content: string): string {
    // Use crypto for proper hashing
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private detectLanguage(path: string): string {
    const ext = path.split('.').pop();
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      cpp: 'cpp',
      c: 'c',
      java: 'java',
      go: 'go',
      rs: 'rust',
    };
    return languageMap[ext || ''] || 'unknown';
  }

  private classifySensitivity(path: string, content: string): 'public' | 'internal' | 'sensitive' | 'secret' {
    const filename = path.toLowerCase();

    // Secret files
    if (filename.includes('.env') || filename.includes('secret') || filename.includes('credential')) {
      return 'secret';
    }

    // Sensitive files
    if (filename.includes('config') || filename.includes('key') || filename.includes('auth')) {
      return 'sensitive';
    }

    // Check content for secrets
    if (this.hasSecrets(content)) {
      return 'secret';
    }

    // Internal code
    if (filename.includes('src') || filename.includes('server') || filename.includes('api')) {
      return 'internal';
    }

    // Public files
    if (filename.includes('readme') || filename.includes('docs') || filename.includes('license')) {
      return 'public';
    }

    return 'internal';
  }

  private hasSecrets(content: string): boolean {
    return this.sensitivePatterns.some(pattern => pattern.test(content));
  }

  redactSecrets(content: string): string {
    let redacted = content;
    this.sensitivePatterns.forEach(pattern => {
      redacted = redacted.replace(pattern, '[REDACTED]');
    });
    return redacted;
  }

  getFileByLanguage(language: string): FileIndex[] {
    return Array.from(this.files.values()).filter(f => f.language === language);
  }

  getFilesBySensitivity(sensitivity: 'public' | 'internal' | 'sensitive' | 'secret'): FileIndex[] {
    return Array.from(this.files.values()).filter(f => f.sensitivity === sensitivity);
  }
}
