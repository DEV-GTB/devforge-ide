// Context Retriever - Hybrid search combining keyword, semantic, and graph search
import { EmbeddingService, Embedding } from './EmbeddingService';
import { SymbolIndexer, Symbol } from './SymbolIndexer';
import { DependencyIndexer, Dependency } from './DependencyIndexer';
import { FileIndexer, FileIndex } from './FileIndexer';

export interface SearchRequest {
  projectId: string;
  query: string;
  mode: 'keyword' | 'semantic' | 'hybrid';
  limit?: number;
  currentFile?: string;
  openFiles?: string[];
  selectedSymbol?: string;
}

export interface SearchResult {
  fileId: string;
  path: string;
  symbol?: string;
  score: number;
  reason: string;
  matchType: 'exact' | 'symbol' | 'semantic' | 'dependency';
}

export interface ContextRequest {
  projectId: string;
  task: string;
  maxTokens?: number;
  currentFile?: string;
  openFiles?: string[];
  selectedSymbol?: string;
  needTests?: boolean;
  needHistory?: boolean;
}

export interface ContextPack {
  projectSummary: ProjectSummary;
  files: ContextFile[];
  symbols: ContextSymbol[];
  relationships: Dependency[];
  memories: ProjectMemory[];
  decisions: ProjectDecision[];
  tests?: TestContext[];
}

export interface ProjectSummary {
  name: string;
  type: string;
  stack: string[];
  mainDirectories: string[];
  totalFiles: number;
  totalSymbols: number;
  totalDependencies: number;
}

export interface ContextFile {
  path: string;
  language: string;
  relevance: number;
  reason: string;
  content?: string;
}

export interface ContextSymbol {
  name: string;
  type: string;
  file: string;
  line: number;
  relevance: number;
}

export interface ProjectMemory {
  type: string;
  content: string;
  confidence: number;
  source: string;
}

export interface ProjectDecision {
  category: string;
  decision: string;
  reasoning: string;
}

export interface TestContext {
  path: string;
  coveredSymbols: string[];
}

export class ContextRetriever {
  constructor(
    private embeddingService: EmbeddingService,
    private symbolIndexer: SymbolIndexer,
    private dependencyIndexer: DependencyIndexer,
    private fileIndexer: FileIndexer
  ) {}

  async search(request: SearchRequest): Promise<SearchResult[]> {
    const { projectId, query, mode, limit = 10, currentFile, openFiles } = request;
    const results: SearchResult[] = [];

    // Keyword search (exact matches)
    if (mode === 'keyword' || mode === 'hybrid') {
      const keywordResults = await this.keywordSearch(query, currentFile, openFiles);
      results.push(...keywordResults);
    }

    // Symbol search
    if (mode === 'keyword' || mode === 'hybrid') {
      const symbolResults = await this.symbolSearch(query, currentFile);
      results.push(...symbolResults);
    }

    // Semantic search
    if (mode === 'semantic' || mode === 'hybrid') {
      const semanticResults = await this.semanticSearch(query, currentFile);
      results.push(...semanticResults);
    }

    // Dependency graph expansion
    if (mode === 'hybrid') {
      const dependencyResults = await this.dependencySearch(results);
      results.push(...dependencyResults);
    }

    // Rank and deduplicate
    const ranked = this.rankResults(results, currentFile, openFiles);
    return ranked.slice(0, limit);
  }

  async buildContext(request: ContextRequest): Promise<ContextPack> {
    const { projectId, task, maxTokens = 100000, currentFile, openFiles } = request;

    // Build project summary
    const summary = await this.buildProjectSummary(projectId);

    // Search for relevant context
    const searchResults = await this.search({
      projectId,
      query: task,
      mode: 'hybrid',
      limit: 20,
      currentFile,
      openFiles,
    });

    // Convert to context files
    const files = searchResults.map(r => ({
      path: r.path,
      language: this.fileIndexer.getFile(r.path)?.language || 'unknown',
      relevance: r.score,
      reason: r.reason,
    }));

    // Extract symbols
    const symbols = await this.extractRelevantSymbols(searchResults);

    // Get relationships
    const relationships = this.dependencyIndexer.getAllDependencies();

    // Get project memories
    const memories = this.getProjectMemories(projectId);

    // Get decisions
    const decisions = this.getProjectDecisions(projectId);

    // Get tests if requested
    let tests: TestContext[] | undefined;
    if (request.needTests) {
      tests = await this.getTestContext(projectId, searchResults);
    }

    return {
      projectSummary: summary,
      files,
      symbols,
      relationships,
      memories,
      decisions,
      tests,
    };
  }

  private async keywordSearch(
    query: string,
    currentFile?: string,
    openFiles?: string[]
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const files = this.fileIndexer.getAllFiles();

    for (const file of files) {
      if (file.content && file.content.toLowerCase().includes(query.toLowerCase())) {
        const score = this.calculateKeywordScore(file, query, currentFile, openFiles);
        results.push({
          fileId: file.id,
          path: file.path,
          score,
          reason: 'Keyword match in file content',
          matchType: 'exact',
        });
      }
    }

    return results;
  }

  private async symbolSearch(query: string, currentFile?: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const symbols = this.symbolIndexer.findSymbol(query);

    for (const symbol of symbols) {
      const score = this.calculateSymbolScore(symbol, currentFile);
      results.push({
        fileId: symbol.fileId,
        path: symbol.fileId,
        symbol: symbol.name,
        score,
        reason: `Symbol match: ${symbol.name}`,
        matchType: 'symbol',
      });
    }

    return results;
  }

  private async semanticSearch(query: string, currentFile?: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const embeddings = await this.embeddingService.search(query, 10);

    for (const embedding of embeddings) {
      const file = this.fileIndexer.getFile(embedding.fileId);
      if (file) {
        const score = this.calculateSemanticScore(embedding, currentFile);
        results.push({
          fileId: file.id,
          path: file.path,
          score,
          reason: 'Semantic similarity',
          matchType: 'semantic',
        });
      }
    }

    return results;
  }

  private async dependencySearch(initialResults: SearchResult[]): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const fileSet = new Set(initialResults.map(r => r.path));

    for (const result of initialResults) {
      const deps = this.dependencyIndexer.getDependencies(result.path);
      for (const dep of deps) {
        if (!fileSet.has(dep.target)) {
          fileSet.add(dep.target);
          results.push({
            fileId: dep.target,
            path: dep.target,
            score: result.score * 0.7, // Lower score for dependencies
            reason: `Dependency of ${result.path}`,
            matchType: 'dependency',
          });
        }
      }
    }

    return results;
  }

  private rankResults(
    results: SearchResult[],
    currentFile?: string,
    openFiles?: string[]
  ): SearchResult[] {
    // Boost current file
    if (currentFile) {
      results.forEach(r => {
        if (r.path === currentFile) {
          r.score *= 1.5;
        }
      });
    }

    // Boost open files
    if (openFiles) {
      results.forEach(r => {
        if (openFiles.includes(r.path)) {
          r.score *= 1.2;
        }
      });
    }

    // Sort by score
    return results.sort((a, b) => b.score - a.score);
  }

  private calculateKeywordScore(
    file: FileIndex,
    query: string,
    currentFile?: string,
    openFiles?: string[]
  ): number {
    let score = 0.5;
    const queryLower = query.toLowerCase();
    const contentLower = file.content!.toLowerCase();

    // Count occurrences
    const count = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
    score += Math.min(count * 0.1, 0.5);

    // Boost current file
    if (currentFile && file.path === currentFile) {
      score *= 1.5;
    }

    // Boost open files
    if (openFiles && openFiles.includes(file.path)) {
      score *= 1.2;
    }

    return Math.min(score, 1.0);
  }

  private calculateSymbolScore(symbol: Symbol, currentFile?: string): number {
    let score = 0.8;

    if (currentFile && symbol.fileId === currentFile) {
      score *= 1.5;
    }

    return Math.min(score, 1.0);
  }

  private calculateSemanticScore(embedding: Embedding, currentFile?: string): number {
    let score = 0.7;

    if (currentFile && embedding.fileId === currentFile) {
      score *= 1.5;
    }

    return Math.min(score, 1.0);
  }

  private async buildProjectSummary(projectId: string): Promise<ProjectSummary> {
    const files = this.fileIndexer.getAllFiles();
    const symbols = this.symbolIndexer.getAllSymbols();
    const dependencies = this.dependencyIndexer.getAllDependencies();

    // Detect stack
    const stack = this.detectStack(files);

    // Detect main directories
    const directories = this.detectMainDirectories(files);

    return {
      name: projectId,
      type: this.detectProjectType(files),
      stack,
      mainDirectories: directories,
      totalFiles: files.length,
      totalSymbols: symbols.length,
      totalDependencies: dependencies.length,
    };
  }

  private detectStack(files: FileIndex[]): string[] {
    const stack: string[] = [];
    const packageFile = files.find(f => f.path === 'package.json');

    if (packageFile && packageFile.content) {
      const content = JSON.parse(packageFile.content);
      const deps = { ...content.dependencies, ...content.devDependencies };

      if (deps.react) stack.push('React');
      if (deps.vue) stack.push('Vue');
      if (deps.angular) stack.push('Angular');
      if (deps.next) stack.push('Next.js');
      if (deps.vite) stack.push('Vite');
      if (deps.express) stack.push('Express');
      if (deps.fastify) stack.push('Fastify');
      if (deps.mongodb) stack.push('MongoDB');
      if (deps.postgres || deps.pg) stack.push('PostgreSQL');
      if (deps.sqlite || deps.better_sqlite3) stack.push('SQLite');
    }

    return stack;
  }

  private detectProjectType(files: FileIndex[]): string {
    const hasServer = files.some(f => f.path.includes('server'));
    const hasClient = files.some(f => f.path.includes('src') || f.path.includes('client'));
    const hasTests = files.some(f => f.path.includes('test'));

    if (hasServer && hasClient) return 'Full-stack';
    if (hasServer) return 'Backend';
    if (hasClient) return 'Frontend';
    return 'Unknown';
  }

  private detectMainDirectories(files: FileIndex[]): string[] {
    const dirs = new Set<string>();
    files.forEach(f => {
      const parts = f.path.split('/');
      if (parts.length > 1) {
        dirs.add(parts[0]);
      }
    });
    return Array.from(dirs).slice(0, 5);
  }

  private async extractRelevantSymbols(results: SearchResult[]): Promise<ContextSymbol[]> {
    const symbols: ContextSymbol[] = [];
    const fileSet = new Set(results.map(r => r.path));

    for (const path of fileSet) {
      const fileSymbols = this.symbolIndexer.getSymbols(path);
      fileSymbols.forEach(s => {
        symbols.push({
          name: s.name,
          type: s.type,
          file: s.fileId,
          line: s.line,
          relevance: 0.8,
        });
      });
    }

    return symbols;
  }

  private getProjectMemories(projectId: string): ProjectMemory[] {
    // Placeholder - would be implemented with MemoryStore
    return [
      {
        type: 'PROJECT_FACT',
        content: 'Project uses TypeScript',
        confidence: 0.95,
        source: 'package.json',
      },
    ];
  }

  private getProjectDecisions(projectId: string): ProjectDecision[] {
    // Placeholder - would be implemented with DecisionMemory
    return [];
  }

  private async getTestContext(projectId: string, results: SearchResult[]): Promise<TestContext[]> {
    // Placeholder - would find test files
    return [];
  }
}
