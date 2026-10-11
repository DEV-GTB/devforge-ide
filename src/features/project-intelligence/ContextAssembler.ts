// Context Assembler - Assembles context packs for AI with budget management
import { ContextRetriever, ContextPack, ContextFile, ContextSymbol } from './ContextRetriever';
import type { ContextRequest } from './ContextRetriever';
import { FileIndexer, FileIndex } from './FileIndexer';

export interface ContextBudget {
  maxTokens: number;
  reserved: {
    system: number;
    task: number;
    projectSummary: number;
    retrievedCode: number;
    tests: number;
    buffer: number;
  };
}

export interface AssembledContext {
  contextPack: ContextPack;
  tokenCount: number;
  compressed: boolean;
  sources: ContextSource[];
}

export interface ContextSource {
  type: 'file' | 'symbol' | 'dependency' | 'memory' | 'decision' | 'test';
  id: string;
  reason: string;
  relevance: number;
}

export class ContextAssembler {
  private defaultBudget: ContextBudget = {
    maxTokens: 100000,
    reserved: {
      system: 5000,
      task: 2000,
      projectSummary: 3000,
      retrievedCode: 70000,
      tests: 10000,
      buffer: 10000,
    },
  };

  constructor(
    private contextRetriever: ContextRetriever,
    private fileIndexer: FileIndexer
  ) {}

  async assemble(request: ContextRequest, budget?: ContextBudget): Promise<AssembledContext> {
    const contextBudget = budget || this.defaultBudget;
    const availableTokens = contextBudget.maxTokens - contextBudget.reserved.system - contextBudget.reserved.task;

    // Get initial context pack
    let contextPack = await this.contextRetriever.buildContext(request);

    // Compress if needed
    const estimatedTokens = this.estimateTokenCount(contextPack);
    let compressed = false;

    if (estimatedTokens > availableTokens) {
      contextPack = await this.compressContext(contextPack, availableTokens);
      compressed = true;
    }

    // Generate sources
    const sources = this.generateSources(contextPack);

    return {
      contextPack,
      tokenCount: this.estimateTokenCount(contextPack),
      compressed,
      sources,
    };
  }

  private estimateTokenCount(contextPack: ContextPack): number {
    let count = 0;

    // Project summary
    count += JSON.stringify(contextPack.projectSummary).length / 4;

    // Files
    contextPack.files.forEach(f => {
      if (f.content) {
        count += f.content.length / 4;
      } else {
        count += f.path.length / 4;
      }
    });

    // Symbols
    count += JSON.stringify(contextPack.symbols).length / 4;

    // Relationships
    count += JSON.stringify(contextPack.relationships).length / 4;

    // Memories
    count += JSON.stringify(contextPack.memories).length / 4;

    // Decisions
    count += JSON.stringify(contextPack.decisions).length / 4;

    // Tests
    if (contextPack.tests) {
      count += JSON.stringify(contextPack.tests).length / 4;
    }

    return Math.round(count);
  }

  private async compressContext(contextPack: ContextPack, maxTokens: number): Promise<ContextPack> {
    const compressed = { ...contextPack };

    // Sort files by relevance
    compressed.files.sort((a, b) => b.relevance - a.relevance);

    // Categorize files by priority
    const highPriority = compressed.files.filter(f => f.relevance > 0.8);
    const mediumPriority = compressed.files.filter(f => f.relevance > 0.5 && f.relevance <= 0.8);
    const lowPriority = compressed.files.filter(f => f.relevance <= 0.5);

    // Load full content for high priority
    for (const file of highPriority) {
      const fileIndex = this.fileIndexer.getFile(file.path);
      if (fileIndex && fileIndex.content) {
        file.content = fileIndex.content;
      }
    }

    // Load only relevant functions for medium priority
    for (const file of mediumPriority) {
      const fileIndex = this.fileIndexer.getFile(file.path);
      if (fileIndex && fileIndex.content) {
        file.content = this.extractRelevantFunctions(fileIndex.content, 3);
      }
    }

    // Only keep paths for low priority
    for (const file of lowPriority) {
      delete file.content;
    }

    // Limit symbols
    compressed.symbols = compressed.symbols
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 50);

    // Limit relationships
    compressed.relationships = compressed.relationships.slice(0, 30);

    // Limit memories
    compressed.memories = compressed.memories.slice(0, 10);

    // Limit decisions
    compressed.decisions = compressed.decisions.slice(0, 5);

    return compressed;
  }

  private extractRelevantFunctions(content: string, maxFunctions: number): string {
    const lines = content.split('\n');
    const functions: string[] = [];
    let currentFunction: string[] = [];
    let inFunction = false;
    let braceCount = 0;

    for (const line of lines) {
      if (line.match(/function\s+\w+|const\s+\w+\s*=\s*\(|async\s+function/)) {
        inFunction = true;
        currentFunction = [line];
        braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      } else if (inFunction) {
        currentFunction.push(line);
        braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;

        if (braceCount === 0) {
          functions.push(currentFunction.join('\n'));
          currentFunction = [];
          inFunction = false;

          if (functions.length >= maxFunctions) {
            break;
          }
        }
      }
    }

    return functions.join('\n\n');
  }

  private generateSources(contextPack: ContextPack): ContextSource[] {
    const sources: ContextSource[] = [];

    // Files
    contextPack.files.forEach(f => {
      sources.push({
        type: 'file',
        id: f.path,
        reason: f.reason,
        relevance: f.relevance,
      });
    });

    // Symbols
    contextPack.symbols.forEach(s => {
      sources.push({
        type: 'symbol',
        id: `${s.file}:${s.name}`,
        reason: `Symbol: ${s.name}`,
        relevance: s.relevance,
      });
    });

    // Dependencies
    contextPack.relationships.forEach(r => {
      sources.push({
        type: 'dependency',
        id: `${r.source}->${r.target}`,
        reason: `Dependency: ${r.type}`,
        relevance: 0.7,
      });
    });

    // Memories
    contextPack.memories.forEach(m => {
      sources.push({
        type: 'memory',
        id: crypto.randomUUID(),
        reason: `Memory: ${m.type}`,
        relevance: m.confidence,
      });
    });

    // Decisions
    contextPack.decisions.forEach(d => {
      sources.push({
        type: 'decision',
        id: crypto.randomUUID(),
        reason: `Decision: ${d.category}`,
        relevance: 0.8,
      });
    });

    // Tests
    if (contextPack.tests) {
      contextPack.tests.forEach(t => {
        sources.push({
          type: 'test',
          id: t.path,
          reason: 'Test coverage',
          relevance: 0.9,
        });
      });
    }

    return sources;
  }

  validateContext(contextPack: ContextPack): boolean {
    // Check for secrets
    for (const file of contextPack.files) {
      if (file.content) {
        if (this.hasSecrets(file.content)) {
          console.warn(`Secret detected in ${file.path}`);
          return false;
        }
      }
    }

    // Check file paths
    for (const file of contextPack.files) {
      if (!this.isValidPath(file.path)) {
        console.warn(`Invalid path: ${file.path}`);
        return false;
      }
    }

    return true;
  }

  private hasSecrets(content: string): boolean {
    const secretPatterns = [
      /API[_-]?KEY\s*=\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?/gi,
      /sk-[a-zA-Z0-9]{20,}/gi,
      /SECRET[_-]?KEY\s*=\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?/gi,
      /PASSWORD\s*=\s*['"]?[a-zA-Z0-9\-_]{10,}['"]?/gi,
    ];

    return secretPatterns.some(pattern => pattern.test(content));
  }

  private isValidPath(path: string): boolean {
    // Prevent path traversal
    if (path.includes('..')) {
      return false;
    }

    // Check for valid file characters
    if (/[<>:"|?*]/.test(path)) {
      return false;
    }

    return true;
  }
}
