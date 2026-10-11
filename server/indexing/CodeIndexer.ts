import * as fs from 'fs';
import * as path from 'path';

export interface IndexedFile {
  path: string;
  language: string;
  functions: FunctionDef[];
  classes: ClassDef[];
  imports: ImportDef[];
  exports: ExportDef[];
  lastModified: Date;
}

export interface FunctionDef {
  name: string;
  line: number;
  parameters: string[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
}

export interface ClassDef {
  name: string;
  line: number;
  methods: FunctionDef[];
  properties: string[];
  extends?: string;
}

export interface ImportDef {
  module: string;
  names: string[];
  line: number;
  isDefault: boolean;
}

export interface ExportDef {
  name: string;
  line: number;
  type: 'function' | 'class' | 'variable' | 'type';
}

/**
 * Code Indexer
 * Purpose: Index code files for fast search and navigation
 * Features:
 * - Function extraction
 * - Class extraction
 * - Import/Export tracking
 * - Language detection
 * - Symbol search
 * - Cross-reference analysis
 */
export class CodeIndexer {
  private index: Map<string, IndexedFile> = new Map();
  private symbolIndex: Map<string, Set<string>> = new Map(); // symbol -> file paths

  async indexDirectory(rootPath: string, ignorePatterns: string[] = ['node_modules', '.git', 'dist', 'build']): Promise<void> {
    const files = this.walkDirectory(rootPath, ignorePatterns);

    for (const file of files) {
      await this.indexFile(file);
    }
  }

  async indexFile(filePath: string): Promise<IndexedFile> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const language = this.detectLanguage(filePath);
    const indexed: IndexedFile = {
      path: filePath,
      language,
      functions: this.extractFunctions(content, language),
      classes: this.extractClasses(content, language),
      imports: this.extractImports(content, language),
      exports: this.extractExports(content, language),
      lastModified: new Date(fs.statSync(filePath).mtime),
    };

    this.index.set(filePath, indexed);
    this.updateSymbolIndex(indexed);

    return indexed;
  }

  private walkDirectory(dir: string, ignorePatterns: string[]): string[] {
    const files: string[] = [];

    const walk = (currentPath: string) => {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (!ignorePatterns.includes(item)) {
            walk(fullPath);
          }
        } else {
          const ext = path.extname(item);
          if (['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs'].includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    walk(dir);
    return files;
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath);
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
    };
    return langMap[ext] || 'unknown';
  }

  private extractFunctions(content: string, language: string): FunctionDef[] {
    const functions: FunctionDef[] = [];

    if (language === 'typescript' || language === 'javascript') {
      // Match function declarations
      const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
      let match;

      while ((match = funcRegex.exec(content)) !== null) {
        const isAsync = content.substring(match.index - 20, match.index).includes('async');
        const isExported = content.substring(match.index - 20, match.index).includes('export');
        const params = match[2].split(',').map(p => p.trim()).filter(p => p);

        functions.push({
          name: match[1],
          line: content.substring(0, match.index).split('\n').length,
          parameters: params,
          isAsync,
          isExported,
        });
      }

      // Match arrow functions and method definitions
      const methodRegex = /(?:async\s+)?(\w+)\s*(?:\([^)]*\)\s*(?::\s*\w+)?)?\s*=>/g;
      while ((match = methodRegex.exec(content)) !== null) {
        functions.push({
          name: match[1],
          line: content.substring(0, match.index).split('\n').length,
          parameters: [],
          isAsync: content.substring(match.index - 20, match.index).includes('async'),
          isExported: false,
        });
      }
    }

    if (language === 'python') {
      const funcRegex = /def\s+(\w+)\s*\(([^)]*)\):/g;
      let match;

      while ((match = funcRegex.exec(content)) !== null) {
        const params = match[2].split(',').map(p => p.trim()).filter(p => p);
        functions.push({
          name: match[1],
          line: content.substring(0, match.index).split('\n').length,
          parameters: params,
          isAsync: false,
          isExported: false,
        });
      }
    }

    return functions;
  }

  private extractClasses(content: string, language: string): ClassDef[] {
    const classes: ClassDef[] = [];

    if (language === 'typescript' || language === 'javascript') {
      const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?/g;
      let match;

      while ((match = classRegex.exec(content)) !== null) {
        classes.push({
          name: match[1],
          line: content.substring(0, match.index).split('\n').length,
          methods: [],
          properties: [],
          extends: match[2],
        });
      }
    }

    if (language === 'python') {
      const classRegex = /class\s+(\w+)(?:\([^)]*\))?:/g;
      let match;

      while ((match = classRegex.exec(content)) !== null) {
        classes.push({
          name: match[1],
          line: content.substring(0, match.index).split('\n').length,
          methods: [],
          properties: [],
        });
      }
    }

    return classes;
  }

  private extractImports(content: string, language: string): ImportDef[] {
    const imports: ImportDef[] = [];

    if (language === 'typescript' || language === 'javascript') {
      // ES6 imports
      const importRegex = /import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]+)\}\s*,?\s*)?(\w+)?\s+from\s+['"]([^'"]+)['"]/g;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        const names: string[] = [];
        if (match[1]) names.push(match[1]);
        if (match[2]) names.push(...match[2].split(',').map(n => n.trim()));
        if (match[3]) names.push(match[3]);

        imports.push({
          module: match[4],
          names,
          line: content.substring(0, match.index).split('\n').length,
          isDefault: !!match[1],
        });
      }

      // CommonJS require
      const requireRegex = /(?:const|let|var)\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        imports.push({
          module: match[2],
          names: [match[1]],
          line: content.substring(0, match.index).split('\n').length,
          isDefault: true,
        });
      }
    }

    if (language === 'python') {
      const importRegex = /(?:from\s+(\w+)\s+)?import\s+(.+)/g;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        imports.push({
          module: match[1] || match[2],
          names: match[2].split(',').map(n => n.trim()),
          line: content.substring(0, match.index).split('\n').length,
          isDefault: false,
        });
      }
    }

    return imports;
  }

  private extractExports(content: string, language: string): ExportDef[] {
    const exports: ExportDef[] = [];

    if (language === 'typescript' || language === 'javascript') {
      const exportRegex = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
      let match;

      while ((match = exportRegex.exec(content)) !== null) {
        exports.push({
          name: match[1],
          line: content.substring(0, match.index).split('\n').length,
          type: 'variable',
        });
      }
    }

    return exports;
  }

  private updateSymbolIndex(indexed: IndexedFile): void {
    // Index functions
    indexed.functions.forEach(func => {
      if (!this.symbolIndex.has(func.name)) {
        this.symbolIndex.set(func.name, new Set());
      }
      this.symbolIndex.get(func.name)!.add(indexed.path);
    });

    // Index classes
    indexed.classes.forEach(cls => {
      if (!this.symbolIndex.has(cls.name)) {
        this.symbolIndex.set(cls.name, new Set());
      }
      this.symbolIndex.get(cls.name)!.add(indexed.path);
    });
  }

  searchSymbols(query: string): Map<string, Set<string>> {
    const results = new Map<string, Set<string>>();

    this.symbolIndex.forEach((files, symbol) => {
      if (symbol.toLowerCase().includes(query.toLowerCase())) {
        results.set(symbol, files);
      }
    });

    return results;
  }

  getFileIndex(filePath: string): IndexedFile | undefined {
    return this.index.get(filePath);
  }

  getAllIndexedFiles(): IndexedFile[] {
    return Array.from(this.index.values());
  }

  clearIndex(): void {
    this.index.clear();
    this.symbolIndex.clear();
  }
}
